import { PlaywrightCrawler } from "crawlee";
import { getEmbedding } from "./utils/embeddings.js";
import { getOrCreateCollection, deleteCollection, setSiteMongoUri, getSiteMongoUri } from "./utils/chroma.js";

const CHUNK_SIZE = 150;
const CHUNK_OVERLAP = 30;
const MAX_PAGES = 300;

const SKIP_PATH_PATTERNS = [/\/teams\//, /\/category\//, /\/tag\//, /^\/\d{4}\/\d{2}\/?$/];

const ASSET_EXTENSION_RE = /\.(png|jpe?g|gif|webp|svg|ico|bmp|pdf|docx?|xlsx?|pptx?|zip|rar|mp4|mp3|wav|avi|mov)$/i;

function shouldSkipUrl(url) {
  try {
    const path = new URL(url).pathname;
    return SKIP_PATH_PATTERNS.some((re) => re.test(path)) || ASSET_EXTENSION_RE.test(path);
  } catch {
    return false;
  }
}

function isBlogListingPage(url) {
  try {
    const u = new URL(url);
    if (/^\/blogs\/?$/.test(u.pathname)) return true;
    if (/^\/blogs\/page\/\d+\/?$/.test(u.pathname)) return true;
    if (u.pathname.startsWith("/blogs/") && u.searchParams.has("paged")) return true;
    return false;
  } catch {
    return false;
  }
}

function extractText($) {
  $("script, style, nav, footer, header, noscript, iframe, img").remove();
  $('[aria-hidden="true"], .sr-only, .visually-hidden, .visuallyhidden').remove();
  const title = $("title").text().trim() || $("h1").first().text().trim();
  const contentSelectors = ["main", "article", ".content", ".post", "#content", "body"];
  let root = null;
  for (const sel of contentSelectors) {
    const el = $(sel);
    if (el.length) { root = el; break; }
  }
  if (!root) return { title, blocks: [] };

  const blocks = [];
  let currentHeadingId = null;

  root.find("h1, h2, h3, h4, h5, h6, p, li, td, blockquote").each((_, node) => {
    const $node = $(node);
    const tag = node.tagName?.toLowerCase();
    const id = $node.attr("id");

    if (/^h[1-6]$/.test(tag || "") && id) {
      currentHeadingId = id;
    }

    const blockText = $node.text().replace(/\s+/g, " ").trim();
    if (blockText) blocks.push({ text: blockText, headingId: currentHeadingId });
  });

  if (blocks.length === 0) {
    const flat = root.text().replace(/\s+/g, " ").trim();
    if (flat) blocks.push({ text: flat, headingId: null });
  }

  return { title, blocks };
}

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function chunkText(blocks, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let current = [];
  let currentWordCount = 0;
  let currentHeadingId = null;

  const flush = () => {
    if (current.length === 0) return;
    const text = current.join(" ");
    if (text.length > 80) chunks.push({ text, headingId: currentHeadingId });
  };

  for (const block of blocks) {
    const words = block.text.split(" ").filter(Boolean);

    if (words.length > size) {
      flush();
      current = [];
      currentWordCount = 0;
      for (let i = 0; i < words.length; i += size - overlap) {
        const sub = words.slice(i, i + size).join(" ");
        if (sub.length > 80) chunks.push({ text: sub, headingId: block.headingId });
        if (i + size >= words.length) break;
      }
      continue;
    }

    if (currentWordCount + words.length > size && current.length > 0) {
      flush();
      current = [];
      currentWordCount = 0;
    }

    if (current.length === 0) currentHeadingId = block.headingId;
    current.push(block.text);
    currentWordCount += words.length;
  }
  flush();

  return chunks; 
}

export async function scrapeAndIndex(startUrl, websiteId, mongoUri) {
  const existingMongoUri = await getSiteMongoUri(websiteId);

  await deleteCollection(websiteId);
  const collection = await getOrCreateCollection(websiteId);
  console.log(`Cleared and recreated collection for: ${websiteId}`);

  const mongoUriToSave = (mongoUri && mongoUri.trim()) ? mongoUri.trim() : existingMongoUri;
  if (mongoUriToSave) {
    await setSiteMongoUri(websiteId, mongoUriToSave);
    console.log(`Lead-capture MongoDB URI ${mongoUriToSave === existingMongoUri ? "restored" : "saved"} on Chroma collection metadata for: ${websiteId}`);
  }

  const scrapedAt = new Date().toISOString();
  const startHostname = new URL(startUrl).hostname;

  const pages = new Map();

  const seenBlockText = new Set();
  const BLOCK_DEDUP_MIN_LENGTH = 50;

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: MAX_PAGES,
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 30,

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
      if (shouldSkipUrl(request.url)) {
        log.info(`Skipping low-value page: ${request.url}`);
        return;
      }

      log.info(`Scraping: ${request.url}`);

      await page
        .waitForSelector("main, article, .content, #content", { timeout: 5000 })
        .catch(() => {});

      const $ = await parseWithCheerio();
      const { title, blocks: rawBlocks } = extractText($);

      const rawTotalLength = rawBlocks.reduce((sum, b) => sum + b.text.length, 0);

      if (rawTotalLength < 100) {
        log.info("Skipping — too short");
        return;
      }

      const blocks = rawBlocks.filter((b) => {
        if (b.text.length < BLOCK_DEDUP_MIN_LENGTH) return true;
        const norm = normalizeText(b.text);
        if (seenBlockText.has(norm)) return false;
        seenBlockText.add(norm);
        return true;
      });

      await enqueueLinks({
        strategy: "same-domain",
        transformRequestFunction: (req) => {
          try {
            const u = new URL(req.url);
            if (u.hostname !== startHostname) return false;
            if (shouldSkipUrl(u.toString())) return false;
            u.hash = "";
            req.url = u.toString();
            return req;
          } catch {
            return false;
          }
        },
      });

      if (isBlogListingPage(request.url)) {
        log.info(`Crawled for links only (listing page, not indexed): ${request.url}`);
        return;
      }

      const chunks = chunkText(blocks);
      log.info(`${chunks.length} chunks from "${title}"`);

      if (chunks.length > 0) {
        pages.set(request.url, { url: request.url, title, chunks });
      }
    },

    failedRequestHandler({ request, log }, error) {
      log.warning(`Failed: ${request.url} — ${error.message}`);
    },
  });

  await crawler.run([startUrl]);
  await crawler.teardown();

  const pagesScraped = pages.size;
  console.log(`Crawl finished. Pages with content: ${pagesScraped}. Browser closed — starting embeddings.`);

  let chunksStored = 0;
  let duplicatesSkipped = 0;
  const seenChunkText = new Set();

  for (const { url, title, chunks } of pages.values()) {
    const ids = [];
    const embeddings = [];
    const documents = [];
    const metadatas = [];

    for (let i = 0; i < chunks.length; i++) {
      const normalized = normalizeText(chunks[i].text);
      if (seenChunkText.has(normalized)) {
        duplicatesSkipped++;
        continue;
      }
      seenChunkText.add(normalized);

      const embedding = await getEmbedding(chunks[i].text);
      ids.push(`${websiteId}-${chunksStored + ids.length}`);
      embeddings.push(embedding);
      documents.push(chunks[i].text);
      metadatas.push({
        url,
        title,
        websiteId,
        lastScraped: scrapedAt,
        anchor: chunks[i].headingId || "",
      });
    }

    if (ids.length > 0) {
      await collection.upsert({ ids, embeddings, documents, metadatas });
      chunksStored += ids.length;
    }
  }

  console.log(`Done! Pages: ${pagesScraped} | Chunks: ${chunksStored} | Duplicates skipped: ${duplicatesSkipped}`);
  return { pagesScraped, chunksStored };
}