import os from "os";
import path from "path";
import fs from "fs";
import { PlaywrightCrawler, CheerioCrawler, RequestQueue, Configuration } from "crawlee";
import { chromium } from "playwright";
import { getEmbedding } from "./utils/embeddings.js";
import { getOrCreateCollection, deleteCollection, setSiteMongoUri, getSiteMongoUri } from "./utils/chroma.js";

const tempStorageDir = path.join(os.tmpdir(), "crawlee_storage");
try {
  if (!fs.existsSync(tempStorageDir)) fs.mkdirSync(tempStorageDir, { recursive: true });
} catch {}
Configuration.getGlobalConfig().set("storageDir", tempStorageDir);
Configuration.getGlobalConfig().set("purgeOnStart", true);

function canUsePlaywright() {
  if (process.env.FORCE_CHEERIO === "true" || process.env.VERCEL) return false;
  try {
    const p = chromium.executablePath();
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

const CHUNK_SIZE = 150;
const CHUNK_OVERLAP = 30;
const MAX_PAGES = 150;

const SKIP_PATH_PATTERNS = [/\/tag\//, /^\/\d{4}\/\d{2}\/?$/, /\/wp-content\/uploads\//];

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
    if (/^\/blogs?\/?$/.test(u.pathname)) return true;
    if (/^\/blogs?\/page\/\d+\/?$/.test(u.pathname)) return true;
    if (u.pathname.startsWith("/blogs/") && u.searchParams.has("paged")) return true;
    return false;
  } catch {
    return false;
  }
}

function extractText($) {
  // 1. Remove non-content elements
  $("script, style, noscript, iframe, svg, canvas").remove();
  $('[aria-hidden="true"], .sr-only, .visually-hidden, .visuallyhidden').remove();

  const title = $("title").text().replace(/\s+/g, " ").trim() || $("h1").first().text().replace(/\s+/g, " ").trim() || "Website Page";
  const metaDesc = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "";

  // 2. Extract explicit contact & profile targets
  const contacts = new Set();
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
    if (email && email.includes("@")) contacts.add(`Contact Email: ${email}`);
  });
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const phone = href.replace(/^tel:/i, "").split("?")[0].trim();
    if (phone) contacts.add(`Contact Phone: ${phone}`);
  });
  $('a[href^="http"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (href.includes("github.com") || href.includes("linkedin.com") || href.includes("twitter.com") || href.includes("x.com") || href.includes("facebook.com") || href.includes("instagram.com")) {
      contacts.add(`Profile: ${text ? `${text} - ` : ""}${href}`);
    }
  });

  $("address").each((_, el) => {
    const addr = $(el).text().replace(/\s+/g, " ").trim();
    if (addr) contacts.add(`Address: ${addr}`);
  });

  // 3. Transform email & phone links into readable labels so text preserves contact targets
  $('a[href^="mailto:"]').each((_, el) => {
    const email = $(el).attr("href").replace(/^mailto:/i, "").split("?")[0].trim();
    if (email) $(el).text(` [Email: ${email}] `);
  });
  $('a[href^="tel:"]').each((_, el) => {
    const phone = $(el).attr("href").replace(/^tel:/i, "").split("?")[0].trim();
    if (phone) $(el).text(` [Phone: ${phone}] `);
  });

  // 4. Separate block elements and prefix list items with bullets so text is structured
  $("li").each((_, el) => {
    $(el).prepend("• ");
  });
  $("h1, h2, h3, h4, h5, h6, p, div, li, tr, blockquote, section, article, header, footer, aside, dl, dt, dd").each((_, el) => {
    $(el).append("\n");
  });
  $("span, a, b, strong, em, i, td, th").each((_, el) => {
    $(el).append(" ");
  });

  const blocks = [];

  // Add overview / contacts block if available
  const contactLines = Array.from(contacts);
  if (metaDesc.trim() || contactLines.length > 0) {
    const overviewParts = [];
    if (metaDesc.trim()) overviewParts.push(`Overview: ${metaDesc.trim()}`);
    if (contactLines.length > 0) overviewParts.push(`Contact Details:\n- ${contactLines.join("\n- ")}`);
    blocks.push({
      text: overviewParts.join("\n\n"),
      headingId: "overview",
    });
  }

  // Extract clean structured content lines
  const rawText = $("body").text();
  const rawLines = rawText
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);

  let currentBlockLines = [];
  let currentHeading = null;
  const seenLines = new Set();

  for (const line of rawLines) {
    if (line.length < 2) continue;

    // Detect section heading boundaries
    const isHeading = line.length < 80 && (/^[A-Z0-9\s#\-–—:★•]+$/.test(line) || /^(About|Services|Products|Experience|Projects|Track Record|Academics|Skills|Education|Contact|Overview|Features|Pricing|FAQ|Team|Blog)/i.test(line));

    if (isHeading && currentBlockLines.length > 0) {
      const blockText = currentBlockLines.join(" ");
      if (blockText.length >= 30) {
        blocks.push({ text: blockText, headingId: currentHeading });
      }
      currentBlockLines = [];
      currentHeading = line.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    }

    if (line.length > 40 && seenLines.has(line)) continue;
    if (line.length > 40) seenLines.add(line);

    currentBlockLines.push(line);

    if (currentBlockLines.join(" ").split(" ").length >= 100) {
      blocks.push({ text: currentBlockLines.join(" "), headingId: currentHeading });
      currentBlockLines = [];
    }
  }

  if (currentBlockLines.length > 0) {
    const blockText = currentBlockLines.join(" ");
    if (blockText.length >= 25) {
      blocks.push({ text: blockText, headingId: currentHeading });
    }
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
    if (text.length > 35) chunks.push({ text, headingId: currentHeadingId });
  };

  for (const block of blocks) {
    const words = block.text.split(" ").filter(Boolean);

    if (words.length > size) {
      flush();
      current = [];
      currentWordCount = 0;
      for (let i = 0; i < words.length; i += size - overlap) {
        const sub = words.slice(i, i + size).join(" ");
        if (sub.length > 35) chunks.push({ text: sub, headingId: block.headingId });
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
    console.log(`Lead-capture MongoDB URI saved on Chroma collection metadata for: ${websiteId}`);
  }

  const scrapedAt = new Date().toISOString();
  const startHostname = new URL(startUrl).hostname;
  const pages = new Map();
  const seenBlockText = new Set();
  const BLOCK_DEDUP_MIN_LENGTH = 50;

  // Create isolated fresh request queue for this crawl to prevent any cache pollution
  const queueId = `queue-${websiteId.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}`;
  const requestQueue = await RequestQueue.open(queueId);
  await requestQueue.addRequest({ url: startUrl });

  const usePlaywright = canUsePlaywright();
  const maxPages = (process.env.VERCEL || !usePlaywright) ? 20 : MAX_PAGES;
  console.log(`Starting crawl using engine: ${usePlaywright ? "PlaywrightCrawler" : "CheerioCrawler"} (maxPages: ${maxPages})`);

  let crawler;
  if (usePlaywright) {
    crawler = new PlaywrightCrawler({
      requestQueue,
      maxRequestsPerCrawl: maxPages,
      maxConcurrency: 1,
      requestHandlerTimeoutSecs: 35,

      preNavigationHooks: [
        async ({ page }) => {
          await page.route("**/*", (route) => {
            const type = route.request().resourceType();
            if (["image", "font", "media"].includes(type)) {
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

        // Allow DOM and client-side hydration (React/Next/Vite) to render content
        await page.waitForLoadState("domcontentloaded").catch(() => {});
        await page.waitForTimeout(1000);

        // ALWAYS enqueue same-domain links first so no deep pages are missed
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
        }).catch((err) => log.warning(`Link enqueueing notice: ${err.message}`));

        if (isBlogListingPage(request.url)) {
          log.info(`Crawled for links only (listing page): ${request.url}`);
          return;
        }

        const $ = await parseWithCheerio();
        const { title, blocks: rawBlocks } = extractText($);

        const rawTotalLength = rawBlocks.reduce((sum, b) => sum + b.text.length, 0);
        if (rawTotalLength < 50) {
          log.info(`Skipping page with insufficient content (${rawTotalLength} chars): ${request.url}`);
          return;
        }

        const blocks = rawBlocks.filter((b) => {
          if (b.text.length < BLOCK_DEDUP_MIN_LENGTH) return true;
          const norm = normalizeText(b.text);
          if (seenBlockText.has(norm)) return false;
          seenBlockText.add(norm);
          return true;
        });

        const chunks = chunkText(blocks);
        log.info(`${chunks.length} chunks extracted from "${title}"`);

        if (chunks.length > 0) {
          pages.set(request.url, { url: request.url, title, chunks });
        }
      },

      failedRequestHandler({ request, log }, error) {
        log.warning(`Failed: ${request.url} — ${error.message}`);
      },
    });
  } else {
    crawler = new CheerioCrawler({
      requestQueue,
      maxRequestsPerCrawl: maxPages,
      maxConcurrency: 2,
      requestHandlerTimeoutSecs: 20,

      async requestHandler({ request, $, enqueueLinks, log }) {
        if (shouldSkipUrl(request.url)) {
          log.info(`Skipping low-value page: ${request.url}`);
          return;
        }

        log.info(`Scraping: ${request.url}`);

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
        }).catch((err) => log.warning(`Link enqueueing notice: ${err.message}`));

        if (isBlogListingPage(request.url)) {
          log.info(`Crawled for links only (listing page): ${request.url}`);
          return;
        }

        const { title, blocks: rawBlocks } = extractText($);

        const rawTotalLength = rawBlocks.reduce((sum, b) => sum + b.text.length, 0);
        if (rawTotalLength < 50) {
          log.info(`Skipping page with insufficient content (${rawTotalLength} chars): ${request.url}`);
          return;
        }

        const blocks = rawBlocks.filter((b) => {
          if (b.text.length < BLOCK_DEDUP_MIN_LENGTH) return true;
          const norm = normalizeText(b.text);
          if (seenBlockText.has(norm)) return false;
          seenBlockText.add(norm);
          return true;
        });

        const chunks = chunkText(blocks);
        log.info(`${chunks.length} chunks extracted from "${title}"`);

        if (chunks.length > 0) {
          pages.set(request.url, { url: request.url, title, chunks });
        }
      },

      failedRequestHandler({ request, log }, error) {
        log.warning(`Failed: ${request.url} — ${error.message}`);
      },
    });
  }

  try {
    await crawler.run();
  } finally {
    await crawler.teardown().catch(() => {});
    await requestQueue.drop().catch(() => {});
  }

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

      try {
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
      } catch (err) {
        console.warn(`Error generating embedding for chunk: ${err.message}`);
      }
    }

    if (ids.length > 0) {
      await collection.upsert({ ids, embeddings, documents, metadatas });
      chunksStored += ids.length;
    }
  }

  console.log(`Done! Pages: ${pagesScraped} | Chunks: ${chunksStored} | Duplicates skipped: ${duplicatesSkipped}`);
  return { pagesScraped, chunksStored };
}