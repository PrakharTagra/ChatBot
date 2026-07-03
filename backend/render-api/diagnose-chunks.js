
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

  const all = await collection.get({
    include: ["documents", "metadatas"],
  });

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
