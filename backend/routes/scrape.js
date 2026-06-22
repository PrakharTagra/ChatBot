import express from "express";
import { scrapeAndIndex } from "../scraper.js";
import { setMongoUri } from "./leads.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { url, websiteId, mongoUri } = req.body;

  if (!url || !websiteId) {
    return res.status(400).json({ error: "url and websiteId are required." });
  }

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL format." });
  }

  if (mongoUri && mongoUri.trim()) {
    setMongoUri(websiteId, mongoUri.trim());
    console.log(`📦 MongoDB URI registered for websiteId="${websiteId}"`);
  }

  try {
    console.log(`\n🚀 Starting scrape for websiteId="${websiteId}" at ${url}`);
    const result = await scrapeAndIndex(url, websiteId);
    return res.json({
      success: true,
      websiteId,
      hasLeadCapture: !!(mongoUri && mongoUri.trim()),
      ...result,
    });
  } catch (err) {
    console.error("Scrape error:", err);
    return res.status(500).json({ error: "Scraping failed.", detail: err.message });
  }
});

export default router;
