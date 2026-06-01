import express from "express";
import { scrapeAndIndex } from "../../scraper/scraper.js";

const router = express.Router();

/**
 * POST /api/scrape
 * Body: { url: string, websiteId: string }
 *
 * Triggers a full crawl + index of the given website.
 * Long-running — responds immediately and runs async, or waits (for small sites).
 */
router.post("/", async (req, res) => {
  const { url, websiteId } = req.body;

  if (!url || !websiteId) {
    return res.status(400).json({ error: "url and websiteId are required." });
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL format." });
  }

  // For small sites, await and return results.
  // For large sites you'd fire-and-forget and use a job queue.
  try {
    console.log(`\n🚀 Starting scrape for websiteId="${websiteId}" at ${url}`);
    const result = await scrapeAndIndex(url, websiteId);
    return res.json({
      success: true,
      websiteId,
      ...result,
    });
  } catch (err) {
    console.error("Scrape error:", err);
    return res.status(500).json({ error: "Scraping failed.", detail: err.message });
  }
});

export default router;