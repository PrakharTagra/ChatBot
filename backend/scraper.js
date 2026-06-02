import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import { getEmbedding } from "../backend/utils/embeddings.js";
import Chunk from "../backend/models/Chunk.js";

const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 50;
const MAX_PAGES = 50;

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
      
    }
  });

  return [...links];
}

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

  const text = rawText.replace(/\s+/g, " ").trim();
  return { title, text };
}

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

export async function scrapeAndIndex(startUrl, websiteId) {
  await Chunk.deleteMany({ websiteId });
  console.log(`Cleared old chunks for websiteId: ${websiteId}`);

  const visited = new Set();
  const queue = [startUrl];
  let chunksStored = 0;

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift();

    if (visited.has(url)) continue;
    visited.add(url);

    console.log(`Scraping: ${url}`);

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
      console.warn(`Failed to fetch ${url}: ${err.message}`);
      continue;
    }

    const $ = cheerio.load(html);
    const { title, text } = extractText($);

    if (text.length < 100) {
      console.log(`Skipping (too little content)`);
      continue;
    }

    const links = extractLinks($, url);
    for (const link of links) {
      if (!visited.has(link)) queue.push(link);
    }

    const chunks = chunkText(text);
    console.log(`${chunks.length} chunks from "${title}"`);

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
    `\nDone! Pages scraped: ${visited.size} | Chunks stored: ${chunksStored}`
  );
  return { pagesScraped: visited.size, chunksStored };
}