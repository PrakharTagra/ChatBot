import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import { getEmbedding } from "./utils/embeddings.js";
import Chunk from "./models/Chunk.js";

const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 50;
const MAX_PAGES = 50;
const SPA_THRESHOLD = 300; // chars of visible text — below this, try Puppeteer

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

// ─── Text extraction ────────────────────────────────────────────────────────
// Strategy: remove only pure noise (scripts/styles/media), keep structural
// elements because React apps put real content inside header/nav/footer too.
function extractText($) {
  // Remove only truly non-content elements
  $("script, style, noscript, iframe, img, svg, canvas, video, audio").remove();

  const title = $("title").text().trim() || $("h1").first().text().trim();

  // Collect all meaningful text-bearing elements in document order
  const textParts = [];
  $(
    "h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, figcaption, label, " +
    "span, div, section, article, main, header, footer, nav, a"
  ).each((_, el) => {
    const $el = $(el);
    // Skip elements whose children are also in our selector (avoid duplicating)
    // Only collect leaf-ish nodes: elements with direct text content
    const ownText = $el.clone().children().remove().end().text().trim();
    if (ownText.length > 15) {
      textParts.push(ownText);
    }
  });

  // Deduplicate (React renders same text in parent + child nodes)
  const seen = new Set();
  const deduped = textParts.filter(t => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  const text = deduped.join(" ").replace(/\s+/g, " ").trim();
  return { title, text };
}

// ─── Chunk text ─────────────────────────────────────────────────────────────
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

// ─── Axios fetch (fast path for static sites) ───────────────────────────────
async function fetchWithAxios(url) {
  const res = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });
  return res.data;
}

// ─── Puppeteer fetch (for React / Next.js / Vue / Angular SPAs) ─────────────
let _browser = null;

async function getBrowser() {
  if (_browser) return _browser;
  const puppeteer = await import("puppeteer").then(m => m.default || m);
  _browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
      "--disable-extensions",
      "--disable-background-networking",
    ],
  });
  return _browser;
}

async function fetchWithPuppeteer(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    // Block media and fonts — but ALLOW stylesheets so React renders properly
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "font", "media"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Use domcontentloaded + extra wait instead of networkidle2
    // networkidle2 often never fires on Next.js / apps with background polling
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for the page to actually render content:
    // 1. Wait for at least one meaningful text element to appear
    try {
      await page.waitForFunction(
        () => {
          const els = document.querySelectorAll("h1, h2, h3, p, li, article, main, section");
          const totalText = Array.from(els).map(e => e.innerText || "").join(" ").trim();
          return totalText.length > 100;
        },
        { timeout: 8000 }
      );
    } catch {
      // If it never gets 100 chars of headings/paragraphs, just wait fixed time
      await new Promise(r => setTimeout(r, 3000));
    }

    // Small buffer for any remaining hydration (lazy-loaded sections etc.)
    await new Promise(r => setTimeout(r, 1000));

    return await page.content();
  } finally {
    await page.close();
  }
}

// ─── Smart fetch: axios first, Puppeteer if it looks like a SPA ─────────────
async function smartFetch(url) {
  let html;
  let usedPuppeteer = false;

  try {
    html = await fetchWithAxios(url);
    const $ = cheerio.load(html);
    const { text } = extractText($);

    if (text.length < SPA_THRESHOLD) {
      console.log(`   ⚡ SPA detected (only ${text.length} chars), switching to Puppeteer…`);
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

// ─── Main scrape + index function ───────────────────────────────────────────
export async function scrapeAndIndex(startUrl, websiteId) {
  await Chunk.deleteMany({ websiteId });
  console.log(`🗑️  Cleared old chunks for: ${websiteId}`);

  const visited = new Set();
  const queue = [startUrl];
  let chunksStored = 0;
  let puppeteerMode = false;

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    console.log(`🔍 Scraping: ${url}`);

    let html;
    try {
      if (puppeteerMode) {
        html = await fetchWithPuppeteer(url);
      } else {
        const result = await smartFetch(url);
        html = result.html;
        if (result.usedPuppeteer) puppeteerMode = true;
      }
    } catch (err) {
      console.warn(`⚠️  Failed to fetch ${url}: ${err.message}`);
      continue;
    }

    const $ = cheerio.load(html);
    const { title, text } = extractText($);

    console.log(`   📄 Extracted ${text.length} chars from "${title}"`);

    if (text.length < 80) {
      console.log(`   ↩ Skipping — too little content even after render`);
      continue;
    }

    // Discover and enqueue internal links
    const links = extractLinks($, url);
    for (const link of links) {
      if (!visited.has(link)) queue.push(link);
    }

    // Chunk → embed → store
    const chunks = chunkText(text);
    console.log(`   ✂️  ${chunks.length} chunks`);

    for (const chunkContent of chunks) {
      const embedding = await getEmbedding(chunkContent);
      await Chunk.create({ websiteId, url, title, content: chunkContent, embedding });
      chunksStored++;
    }
  }

  if (_browser) {
    await _browser.close();
    _browser = null;
  }

  console.log(`\n✅ Done! Pages: ${visited.size} | Chunks: ${chunksStored}`);
  return { pagesScraped: visited.size, chunksStored };
}
