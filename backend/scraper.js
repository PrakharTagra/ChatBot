import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import { getEmbedding } from "./utils/embeddings.js";
import { getOrCreateCollection, deleteCollection } from "./utils/chroma.js";

const CHUNK_SIZE = 200;
const CHUNK_OVERLAP = 50;
const MAX_PAGES = 100;

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
    } catch {}
  });
  return [...links];
}

function extractText($) {
  $("script, style, nav, footer, header, noscript, iframe, img").remove();
  const title = $("title").text().trim() || $("h1").first().text().trim();
  const contentSelectors = ["main", "article", ".content", ".post", "#content", "body"];
  let rawText = "";
  for (const sel of contentSelectors) {
    const el = $(sel);
    if (el.length) { rawText = el.text(); break; }
  }
  return { title, text: rawText.replace(/\s+/g, " ").trim() };
}

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

export async function scrapeAndIndex(startUrl, websiteId) {
  await deleteCollection(websiteId);
  const collection = await getOrCreateCollection(websiteId);
  console.log(`Cleared and recreated collection for: ${websiteId}`);

  const visited = new Set();
  const queue = [startUrl];
  let chunksStored = 0;
  const scrapedAt = new Date().toISOString();

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    console.log(`Scraping: ${url}`);

    let html;
    try {
      const res = await axios.get(url, {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ChatBot-Scraper/1.0)" },
      });
      html = res.data;
    } catch (err) {
      console.warn(`Failed: ${url} — ${err.message}`);
      continue;
    }

    const $ = cheerio.load(html);
    const { title, text } = extractText($);
    if (text.length < 100) { console.log("Skipping — too short"); continue; }

    const links = extractLinks($, url);
    for (const link of links) {
      if (!visited.has(link)) queue.push(link);
    }

    const chunks = chunkText(text);
    console.log(`${chunks.length} chunks from "${title}"`);

    // Build batch arrays for this page
    const ids = [];
    const embeddings = [];
    const documents = [];
    const metadatas = [];

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await getEmbedding(chunks[i]);
      ids.push(`${websiteId}-${chunksStored + i}`);
      embeddings.push(embedding);
      documents.push(chunks[i]);
      // lastScraped stored flat as ISO string — Chroma metadata must be flat
      metadatas.push({ url, title, websiteId, lastScraped: scrapedAt });
    }

    // One network call to Chroma per page, not per chunk
    await collection.upsert({ ids, embeddings, documents, metadatas });
    chunksStored += chunks.length;
  }

  console.log(`Done! Pages: ${visited.size} | Chunks: ${chunksStored}`);
  return { pagesScraped: visited.size, chunksStored };
}