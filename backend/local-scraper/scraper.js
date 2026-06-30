import { PlaywrightCrawler } from "crawlee";
import { getEmbedding } from "./utils/embeddings.js";
import { getOrCreateCollection, deleteCollection, setSiteMongoUri } from "./utils/chroma.js";

const CHUNK_SIZE = 150;
const CHUNK_OVERLAP = 30;
// Was 100 — the crawl was hitting this limit before reaching most of the
// blog (paginated 23+ deep), while ~20 single-chunk team-bio pages and ~40
// thin category-archive pages (duplicates of content already indexed from
// the actual posts) were eating the budget first. Raised so real content
// pages get scraped; combined with the skip patterns below so budget isn't
// wasted on low-value pages either.
const MAX_PAGES = 300;

// Paths that are low-value for a Q&A knowledge base: team bios (usually
// just a name/title, ~1 chunk each), category archive pages, and tag
// archive pages (WordPress taxonomy pages — both are excerpt duplicates of
// posts that get scraped directly anyway, and tag pages multiply further
// via their own pagination, e.g. /tag/wcag/?paged=2). Skipping these
// outright — rather than just deprioritizing — keeps the page budget
// pointed at substantive content.
const SKIP_PATH_PATTERNS = [/\/teams\//, /\/category\//, /\/tag\//];

// Non-HTML asset URLs (images, documents, etc.) that sometimes end up
// wrapped in <a href> (e.g. lightbox links) and get picked up by
// enqueueLinks even though preNavigationHooks already blocks loading
// images as page *resources*. Those still count as separate page
// navigations and burn budget on what amounts to a 404 "Page Not Found".
const ASSET_EXTENSION_RE = /\.(png|jpe?g|gif|webp|svg|ico|bmp|pdf|docx?|xlsx?|pptx?|zip|rar|mp4|mp3|wav|avi|mov)$/i;

function shouldSkipUrl(url) {
  try {
    const path = new URL(url).pathname;
    return SKIP_PATH_PATTERNS.some((re) => re.test(path)) || ASSET_EXTENSION_RE.test(path);
  } catch {
    return false;
  }
}

function extractText($) {
  $("script, style, nav, footer, header, noscript, iframe, img").remove();
  // Icon labels and visually-hidden utility text (common pattern: a span
  // with "Search Icon"/"Back Button" etc. for screen readers) were leaking
  // into titles and chunk text — e.g. "Speak to an Expert - D2i
  // TechnologyBack ButtonSearch IconFilter Iconman". These elements are
  // either hidden from sighted users (aria-hidden) or visually hidden but
  // present in the DOM (.sr-only / .visually-hidden / .visuallyhidden), so
  // they're noise for a text-based knowledge base either way.
  $('[aria-hidden="true"], .sr-only, .visually-hidden, .visuallyhidden').remove();
  const title = $("title").text().trim() || $("h1").first().text().trim();
  const contentSelectors = ["main", "article", ".content", ".post", "#content", "body"];
  let root = null;
  for (const sel of contentSelectors) {
    const el = $(sel);
    if (el.length) { root = el; break; }
  }
  if (!root) return { title, blocks: [] };

  // Pull text per block-level element instead of flattening the whole page
  // into one string, and track the nearest preceding heading's id (when the
  // page actually has one) so each block can carry a real #anchor back to
  // the specific section it came from — not just the page URL.
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

  // Fallback for pages that don't use semantic block tags — better to have
  // flattened text (with no anchors) than nothing.
  if (blocks.length === 0) {
    const flat = root.text().replace(/\s+/g, " ").trim();
    if (flat) blocks.push({ text: flat, headingId: null });
  }

  return { title, blocks };
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

    // A single block bigger than the chunk size on its own (rare — a huge
    // paragraph with no internal structure) still needs a sliding-window
    // split, but only for that block, not for the whole page.
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

    // Anchor the chunk to whichever heading governed its first block.
    if (current.length === 0) currentHeadingId = block.headingId;
    current.push(block.text);
    currentWordCount += words.length;
  }
  flush();

  return chunks; // [{ text, headingId }]
}

export async function scrapeAndIndex(startUrl, websiteId, mongoUri) {
  await deleteCollection(websiteId);
  const collection = await getOrCreateCollection(websiteId);
  console.log(`Cleared and recreated collection for: ${websiteId}`);

  if (mongoUri && mongoUri.trim()) {
    await setSiteMongoUri(websiteId, mongoUri.trim());
    console.log(`Lead-capture MongoDB URI saved on Chroma collection metadata for: ${websiteId}`);
  }

  const scrapedAt = new Date().toISOString();
  const startHostname = new URL(startUrl).hostname;

  const pages = [];

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
      const { title, blocks } = extractText($);
      const totalLength = blocks.reduce((sum, b) => sum + b.text.length, 0);

      if (totalLength < 100) {
        log.info("Skipping — too short");
        return;
      }

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

      const chunks = chunkText(blocks);
      log.info(`${chunks.length} chunks from "${title}"`);

      if (chunks.length > 0) {
        pages.push({ url: request.url, title, chunks });
      }
    },

    failedRequestHandler({ request, log }, error) {
      log.warning(`Failed: ${request.url} — ${error.message}`);
    },
  });

  await crawler.run([startUrl]);
  await crawler.teardown();

  const pagesScraped = pages.length;
  console.log(`Crawl finished. Pages with content: ${pagesScraped}. Browser closed — starting embeddings.`);

  let chunksStored = 0;

  for (const { url, title, chunks } of pages) {
    const ids = [];
    const embeddings = [];
    const documents = [];
    const metadatas = [];

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await getEmbedding(chunks[i].text);
      ids.push(`${websiteId}-${chunksStored + i}`);
      embeddings.push(embedding);
      documents.push(chunks[i].text);
      metadatas.push({
        url,
        title,
        websiteId,
        lastScraped: scrapedAt,
        // Real heading id from the page, when there is one — lets us link
        // straight to the section a chunk came from instead of just the
        // page. Empty string (not null) since Chroma metadata values can't
        // be null.
        anchor: chunks[i].headingId || "",
      });
    }

    if (ids.length > 0) {
      await collection.upsert({ ids, embeddings, documents, metadatas });
      chunksStored += chunks.length;
    }
  }

  console.log(`Done! Pages: ${pagesScraped} | Chunks: ${chunksStored}`);
  return { pagesScraped, chunksStored };
}