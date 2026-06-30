// Diagnostic: inspect what's actually stored in ChromaDB for a given site.
//
// Usage:
//   node diagnose-chunks.js <websiteId> "search term"
//
// Example:
//   node diagnose-chunks.js d2i-technology "services"
//
// Requires CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE in your environment
// (same values used by render-api / local-scraper).

import "dotenv/config";
import { CloudClient } from "chromadb";

const [, , websiteId, ...termParts] = process.argv;
const term = termParts.join(" ").toLowerCase();

if (!websiteId || !term) {
  console.error('Usage: node diagnose-chunks.js <websiteId> "search term"');
  process.exit(1);
}

function collectionName(id) {
  return `site-${id}`.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 63);
}

async function main() {
  const client = new CloudClient();
  const name = collectionName(websiteId);

  let collection;
  try {
    collection = await client.getCollection({ name, embeddingFunction: null });
  } catch (err) {
    console.error(`Could not find collection "${name}" for websiteId "${websiteId}".`);
    console.error(err.message);
    process.exit(1);
  }

  const count = await collection.count();
  console.log(`Collection: ${name}`);
  console.log(`Total chunks stored: ${count}\n`);

  if (count === 0) {
    console.log("Nothing is stored for this site at all — re-run the scraper.");
    return;
  }

  // Pull everything (fine for typical site sizes; for very large sites you'd
  // want to paginate with limit/offset instead).
  const all = await collection.get({
    include: ["documents", "metadatas"],
  });

  // 1. Plain substring search across every stored chunk — tells us
  //    definitively whether the content exists in Chroma at all,
  //    independent of embedding similarity.
  const matches = [];
  for (let i = 0; i < all.ids.length; i++) {
    const text = (all.documents[i] || "").toLowerCase();
    if (text.includes(term)) {
      matches.push({
        id: all.ids[i],
        url: all.metadatas[i]?.url,
        title: all.metadatas[i]?.title,
        snippet: all.documents[i].slice(0, 160),
      });
    }
  }

  console.log(`Chunks containing "${term}" (plain text match): ${matches.length}`);
  matches.forEach((m, i) => {
    console.log(`\n  [${i + 1}] ${m.title}  (${m.url})`);
    console.log(`      ${m.snippet}...`);
  });

  if (matches.length === 0) {
    console.log(
      `\n=> "${term}" does not appear in ANY stored chunk for this site.\n` +
      `   This means the page was never scraped/ingested — not a ranking issue.\n` +
      `   Check the scraper console output for this URL, and confirm it's\n` +
      `   reachable via a real <a href> link from a page that does get crawled.`
    );
  }

  // 2. List every distinct page (url + title) that WAS scraped, so you can
  //    eyeball whether the services page shows up under any URL at all.
  const pages = new Map();
  for (let i = 0; i < all.ids.length; i++) {
    const url = all.metadatas[i]?.url;
    const title = all.metadatas[i]?.title;
    if (url && !pages.has(url)) pages.set(url, title);
  }

  console.log(`\n\nAll ${pages.size} distinct pages currently in this collection:`);
  for (const [url, title] of pages) {
    console.log(`  - ${title}  ->  ${url}`);
  }
}

main().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
