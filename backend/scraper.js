import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import { getEmbedding } from "./utils/embeddings.js";
import Chunk from "./models/Chunk.js";

const CHUNK_SIZE = 400;      // target words per chunk
const CHUNK_OVERLAP = 50;    // words to overlap between chunks
const MAX_PAGES = 50;        // safety cap

/**
 * Extract all internal links from a parsed cheerio page.
 */
function extractLinks($, baseUrl) {
  const base = new URL(baseUrl);
  const links = new Set();

  $("a[href]").each((_, el) => {
    try {
      const href = $(el).attr("href");
      const resolved = new URL(href, baseUrl);
      // Same origin only, strip hash and query
      if (resolved.hostname === base.hostname) {
        resolved.hash = "";
        links.add(resolved.toString());
      }
    } catch {
      // ignore malformed hrefs
    }
  });

  return [...links];
}

/**
 * Extract clean text content from a cheerio-parsed page.
 * Removes nav, footer, scripts, styles, and other noise.
 */
function extractText($) {
  $("script, style, nav, footer, header, noscript, iframe, img").remove();

  const title = $("title").text().trim() || $("h1").first().text().trim();

  const contentSelectors = [
    "main",
    "article",
    ".content",
    ".post",
    "#content",
    "body",
  ];

  let rawText = "";
  for (const sel of contentSelectors) {
    const el = $(sel);
    if (el.length) {
      rawText = el.text();
      break;
    }
  }

  // Collapse whitespace
  const text = rawText.replace(/\s+/g, " ").trim();
  return { title, text };
}

/**
 * Split text into overlapping word chunks.
 */
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const words = text.split(" ").filter(Boolean);
  const chunks = [];

  for (let i = 0; i < words.length; i += size - overlap) {
    const chunk = words.slice(i, i + size).join(" ");
    if (chunk.length > 80) {
      chunks.push(chunk);
    }
    if (i + size >= words.length) break;
  }

  return chunks;
}

/**
 * Main scraper function.
 * Crawls all pages reachable from startUrl, chunks content, generates embeddings,
 * and saves to MongoDB.
 *
 * @param {string} startUrl  - The root URL to start crawling from
 * @param {string} websiteId - Unique identifier for this website (used to namespace chunks)
 * @returns {Promise<{ pagesScraped: number, chunksStored: number }>}
 */
export async function scrapeAndIndex(startUrl, websiteId) {
  // Delete old chunks for this websiteId so re-scraping is idempotent
  await Chunk.deleteMany({ websiteId });
  console.log(`🗑️  Cleared old chunks for websiteId: ${websiteId}`);

  const visited = new Set();
  const queue = [startUrl];
  let chunksStored = 0;

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift();

    if (visited.has(url)) continue;
    visited.add(url);

    console.log(`🔍 Scraping: ${url}`);

    let html;
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ChatBot-Scraper/1.0)",
        },
      });
      html = response.data;
    } catch (err) {
      console.warn(`⚠️  Failed to fetch ${url}: ${err.message}`);
      continue;
    }

    const $ = cheerio.load(html);
    const { title, text } = extractText($);

    if (text.length < 100) {
      console.log(`   ↩ Skipping (too little content)`);
      continue;
    }

    // Discover and enqueue new links
    const links = extractLinks($, url);
    for (const link of links) {
      if (!visited.has(link)) queue.push(link);
    }

    // Chunk and embed
    const chunks = chunkText(text);
    console.log(`   ✂️  ${chunks.length} chunks from "${title}"`);

    for (const chunkText_ of chunks) {
      const embedding = await getEmbedding(chunkText_);

      await Chunk.create({
        websiteId,
        url,
        title,
        content: chunkText_,
        embedding,
      });

      chunksStored++;
    }
  }

  console.log(
    `\n✅ Done! Pages scraped: ${visited.size} | Chunks stored: ${chunksStored}`
  );
  return { pagesScraped: visited.size, chunksStored };
}