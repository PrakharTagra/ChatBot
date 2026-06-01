import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import { getEmbedding } from "./utils/embeddings.js";
import Chunk from "./models/Chunk.js";

const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 50;
const MAX_PAGES = 50;
// If axios fetch yields fewer than this many content chars, it's likely a JS-rendered SPA
const SPA_THRESHOLD = 200;

// ─── Link extraction ────────────────────────────────────────────────────────
function extractLinks($, baseUrl) {
  const base = new URL(baseUrl);
  const links = new Set();
  $("a[href]").each((_, el) => {
    try {
      const href = $(el).attr("href");
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === base.hostname) {
        resolved.hash = "";
        links.add(resolved.toString());
      }
    } catch { /* ignore */ }
  });
  return [...links];
}

// ─── Text extraction from parsed HTML ──────────────────────────────────────
function extractText($) {
  $("script, style, nav, footer, header, noscript, iframe, img, svg").remove();
  const title = $("title").text().trim() || $("h1").first().text().trim();
  const selectors = ["main", "article", ".content", ".post", "#content", "#root", "body"];
  let rawText = "";
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 50) {
      rawText = el.text();
      break;
    }
  }
  const text = rawText.replace(/\s+/g, " ").trim();
  return { title, text };
}

// ─── Chunk text into overlapping word windows ──────────────────────────────
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const words = text.split(" ").filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    const chunk = words.slice(i, i + size).join(" ");
    if (chunk.length > 80) chunks.push(chunk);
    if (i + size >= words.length) break;
  }
  return chunks;
}

// ─── Fetch with axios (fast path) ──────────────────────────────────────────
async function fetchWithAxios(url) {
  const response = await axios.get(url, {
    timeout: 10000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ChatBot-Scraper/1.0)" },
  });
  return response.data;
}

// ─── Fetch with Puppeteer (JS-rendered SPA fallback) ──────────────────────
let _browser = null;

async function getBrowser() {
  if (_browser) return _browser;
  // Dynamic import so the module loads even if puppeteer isn't installed
  const puppeteer = await import("puppeteer").then(m => m.default || m);
  _browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",        // required for Render free tier
    ],
  });
  return _browser;
}

async function fetchWithPuppeteer(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent("Mozilla/5.0 (compatible; ChatBot-Scraper/1.0)");
    // Block images/fonts/media to speed up scraping
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    // Extra wait for React/Vue hydration
    await new Promise(r => setTimeout(r, 1500));
    return await page.content();
  } finally {
    await page.close();
  }
}

// ─── Smart fetch: try axios first, fall back to Puppeteer for SPAs ────────
async function smartFetch(url) {
  let html;
  let usedPuppeteer = false;

  try {
    html = await fetchWithAxios(url);
    const $ = cheerio.load(html);
    const { text } = extractText($);

    if (text.length < SPA_THRESHOLD) {
      console.log(`   ⚡ SPA detected (${text.length} chars), switching to Puppeteer…`);
      html = await fetchWithPuppeteer(url);
      usedPuppeteer = true;
    }
  } catch (axiosErr) {
    console.log(`   ⚠️  axios failed (${axiosErr.message}), trying Puppeteer…`);
    html = await fetchWithPuppeteer(url);
    usedPuppeteer = true;
  }

  return { html, usedPuppeteer };
}

// ─── Main export ───────────────────────────────────────────────────────────
export async function scrapeAndIndex(startUrl, websiteId) {
  await Chunk.deleteMany({ websiteId });
  console.log(`🗑️  Cleared old chunks for: ${websiteId}`);

  const visited = new Set();
  const queue = [startUrl];
  let chunksStored = 0;
  let puppeteerMode = false; // once we know it's a SPA, stay in puppeteer mode

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    console.log(`🔍 Scraping: ${url}`);

    let html;
    try {
      if (puppeteerMode) {
        // Already confirmed SPA — go straight to Puppeteer for remaining pages
        html = await fetchWithPuppeteer(url);
      } else {
        const result = await smartFetch(url);
        html = result.html;
        if (result.usedPuppeteer) puppeteerMode = true; // stay in puppeteer for rest of site
      }
    } catch (err) {
      console.warn(`⚠️  Failed to fetch ${url}: ${err.message}`);
      continue;
    }

    const $ = cheerio.load(html);
    const { title, text } = extractText($);

    if (text.length < 100) {
      console.log(`   ↩ Skipping (too little content after render)`);
      continue;
    }

    // Enqueue new internal links
    const links = extractLinks($, url);
    for (const link of links) {
      if (!visited.has(link)) queue.push(link);
    }

    // Chunk → embed → store
    const chunks = chunkText(text);
    console.log(`   ✂️  ${chunks.length} chunks from "${title}"`);

    for (const chunkContent of chunks) {
      const embedding = await getEmbedding(chunkContent);
      await Chunk.create({ websiteId, url, title, content: chunkContent, embedding });
      chunksStored++;
    }
  }

  // Clean up Puppeteer browser to free memory
  if (_browser) {
    await _browser.close();
    _browser = null;
  }

  console.log(`\n✅ Done! Pages: ${visited.size} | Chunks: ${chunksStored}`);
  return { pagesScraped: visited.size, chunksStored };
}
