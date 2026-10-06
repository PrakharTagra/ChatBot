import "dotenv/config";
import { scrapeAndIndex } from "./scraper.js";

const args = process.argv.slice(2);
const url = args[0];
const websiteId = args[1];
const mongoUri = args[2] || undefined;

if (!url || !websiteId) {
  console.log("\nUsage: npm run crawl <url> <websiteId> [mongoUri]");
  console.log("Example: npm run crawl https://example.com example-site\n");
  process.exit(1);
}

try {
  new URL(url);
} catch {
  console.error(`Invalid URL: "${url}". Please provide a full URL including https://`);
  process.exit(1);
}

console.log(`\nStarting crawl & vectorization for:`);
console.log(`- Target URL: ${url}`);
console.log(`- Website ID: ${websiteId}`);
if (mongoUri) console.log(`- Mongo URI: configured`);
console.log("");

try {
  const result = await scrapeAndIndex(url, websiteId, mongoUri);
  console.log("\n Crawling & Indexing successfully completed!");
  console.log(`- Pages crawled: ${result.pagesScraped}`);
  console.log(`- Chunks stored in Chroma Cloud: ${result.chunksStored}`);
  console.log(`- Collection name: site-${websiteId}`);
  console.log(`\nYou can now test your chatbot on the Playground with websiteId: "${websiteId}"\n`);
  process.exit(0);
} catch (err) {
  console.error("\nIndexing failed:", err.message);
  process.exit(1);
}
