import { PlaywrightCrawler } from "crawlee";
import { getEmbedding } from "./utils/embeddings.js";
import { getOrCreateCollection, deleteCollection, setSiteMongoUri, getSiteMongoUri } from "./utils/chroma.js";

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
// just a name/title, ~1 chunk each), category/tag archive pages (excerpt
// duplicates of posts that get scraped directly anyway, multiplying further
// via their own pagination), and WordPress monthly date archives
// (e.g. /2026/06/) which on this site come back as verbatim duplicates of
// the homepage — no unique content, pure navigation. Skipping these
// outright — rather than just deprioritizing — keeps the page budget
// pointed at substantive content.
const SKIP_PATH_PATTERNS = [/\/teams\//, /\/category\//, /\/tag\//, /^\/\d{4}\/\d{2}\/?$/];

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

// Blog index/pagination pages (/blogs/, /blogs/page/N/, /blogs/?paged=N)
// only ever contain generic teaser excerpts — and worse, this WordPress
// site exposes the *same* paginated content under two different URL
// schemes (query string AND path-based), so both were getting scraped and
// stored as separate duplicate chunks. These pages are still useful for
// link discovery (they're how deeper blog posts get found), so they stay
// crawled — they just shouldn't be indexed into the knowledge base.
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
  // mongoUri lives on the Chroma collection's own metadata (see chroma.js),
  // and deleteCollection() below wipes that metadata entirely. On a
  // re-scrape (content refresh) the caller usually doesn't resend the URI
  // — it was only meant to be set once at registration — so without this,
  // every re-scrape silently disabled lead capture for the site. Grab
  // whatever's already saved BEFORE deleting, and restore it afterward
  // unless an explicit new value was passed in.
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

  // Keyed by URL rather than a plain array — when Crawlee retries a request
  // (e.g. after a timeout) the handler can run again for a URL that already
  // succeeded once, which was silently double-indexing pages (seen as
  // "pages with content" exceeding the actual distinct request count).
  // Last write simply overwrites, so duplicates never reach Chroma.
  const pages = new Map();

  // Sitewide BLOCK-level dedup — must happen before chunking, not after.
  // chunkText() concatenates consecutive blocks up to 150 words regardless
  // of component boundaries, so the same widget block (e.g. one testimonial
  // paragraph) ends up glued to different neighboring content depending on
  // what precedes/follows it on each particular page. That makes the
  // resulting CHUNK text different across pages even though the repeated
  // block itself is byte-identical — which let duplicate widget content
  // slip past a chunk-level dedup. Filtering at the block level, before any
  // bundling happens, means a repeated block can never be glued to
  // different padding on different pages in the first place. Only applied
  // to blocks long enough to be a real sentence/paragraph (short repeated
  // labels like "Email:" aren't worth tracking and chunkText already drops
  // sub-80-char chunks anyway).
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

      // This check must run on RAW content, before dedup — it decides
      // whether the page is substantial enough to be worth crawling links
      // from at all. Checking post-dedup length here would mean a page
      // whose content happens to be mostly shared widgets already seen on
      // earlier pages could wrongly get treated as "too short" and skip
      // enqueueLinks entirely, silently breaking link discovery deeper into
      // the site purely based on crawl order.
      const rawTotalLength = rawBlocks.reduce((sum, b) => sum + b.text.length, 0);

      if (rawTotalLength < 100) {
        log.info("Skipping — too short");
        return;
      }

      // Drop any block whose normalized text has already been seen on an
      // earlier page in this crawl — catches shared widgets (testimonial
      // carousels, FAQ boilerplate, footer CTAs) before they ever get
      // bundled into a chunk alongside page-specific neighbors. Only
      // affects what gets indexed, never link discovery (see above).
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

      // Blog index/pagination pages need to be crawled (for link discovery
      // into deeper posts) but their content is generic teaser boilerplate
      // duplicated across every page number — don't index it.
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
  // Secondary safety net, layered on top of the block-level dedup above —
  // catches any remaining exact-duplicate CHUNKS (e.g. two pages that are
  // wholesale aliases of each other, where every chunk matches start to
  // finish). The block-level dedup is what actually prevents shared widgets
  // from polluting retrieval; this just mops up anything that still slipped
  // through identical end-to-end.
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
        // Real heading id from the page, when there is one — lets us link
        // straight to the section a chunk came from instead of just the
        // page. Empty string (not null) since Chroma metadata values can't
        // be null.
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