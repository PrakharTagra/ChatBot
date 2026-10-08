import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  const scraperBase = process.env.SCRAPER_SERVICE_URL || "http://127.0.0.1:5000";
  const targetUrl = new URL("/api/scrape", scraperBase).toString();

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json().catch(() => null);
    return res.status(response.status).json(data || { error: "Invalid response from scraper service" });
  } catch (err) {
    console.error("Failed to forward request to scraper service:", err);
    return res.status(502).json({
      error: "Scraper service unavailable",
      detail: err.message,
    });
  }
});

export default router;
