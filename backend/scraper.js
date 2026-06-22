import { PlaywrightCrawler } from "crawlee";
import { getEmbedding } from "./utils/embeddings.js";
import { getOrCreateCollection, deleteCollection } from "./utils/chroma.js";

const CHUNK_SIZE = 150;
const CHUNK_OVERLAP = 30;
const MAX_PAGES = 100;

// --- unchanged from your original file ---
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
// --- end unchanged ---

export async function scrapeAndIndex(startUrl, websiteId) {
  await deleteCollection(websiteId);
  const collection = await getOrCreateCollection(websiteId);
  console.log(`Cleared and recreated collection for: ${websiteId}`);

  let chunksStored = 0;
  let pagesScraped = 0;
  const scrapedAt = new Date().toISOString();
  const startHostname = new URL(startUrl).hostname;

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: MAX_PAGES,
    maxConcurrency: 5, // tune based on target site tolerance / your rate limits
    requestHandlerTimeoutSecs: 30,

    // Block heavy resources — we only need text, this is the Puppeteer
    // interception trick but expressed through Crawlee's hook system.
    preNavigationHooks: [
      async ({ page }) => {
        await page.route("**/*", (route) => {
          const type = route.request().resourceType();
          if (["image", "font", "media", "stylesheet"].includes(type)) {
            route.abort();
          } else {
            route.continue();
          }
        });
      },
    ],

    async requestHandler({ request, page, enqueueLinks, parseWithCheerio, log }) {
      log.info(`Scraping: ${request.url}`);

      // Wait for likely content containers before extracting; falls through
      // harmlessly if none exist (e.g. plain static pages).
      await page
        .waitForSelector("main, article, .content, #content", { timeout: 5000 })
        .catch(() => {});

      const $ = await parseWithCheerio();
      const { title, text } = extractText($);

      if (text.length < 100) {
        log.info("Skipping — too short");
        return;
      }

      pagesScraped++;

      // Same-domain link discovery, replacing your manual extractLinks/queue.
      await enqueueLinks({
        strategy: "same-domain",
        transformRequestFunction: (req) => {
          try {
            const u = new URL(req.url);
            if (u.hostname !== startHostname) return false;
            u.hash = "";
            req.url = u.toString();
            return req;
          } catch {
            return false;
          }
        },
      });

      const chunks = chunkText(text);
      log.info(`${chunks.length} chunks from "${title}"`);

      const ids = [];
      const embeddings = [];
      const documents = [];
      const metadatas = [];

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await getEmbedding(chunks[i]);
        ids.push(`${websiteId}-${chunksStored + i}`);
        embeddings.push(embedding);
        documents.push(chunks[i]);
        metadatas.push({ url: request.url, title, websiteId, lastScraped: scrapedAt });
      }

      if (ids.length > 0) {
        await collection.upsert({ ids, embeddings, documents, metadatas });
        chunksStored += chunks.length;
      }
    },

    failedRequestHandler({ request, log }, error) {
      log.warning(`Failed: ${request.url} — ${error.message}`);
    },
  });

  await crawler.run([startUrl]);

  console.log(`Done! Pages: ${pagesScraped} | Chunks: ${chunksStored}`);
  return { pagesScraped, chunksStored };
}