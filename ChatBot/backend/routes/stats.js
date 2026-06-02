import express from "express";
import Chunk from "../models/Chunk.js";
import Lead from "../models/Lead.js";

const router = express.Router();

// GET /api/stats — overall numbers
router.get("/", async (req, res) => {
  try {
    const [totalSites, totalChunks, totalLeads] = await Promise.all([
      Chunk.distinct("websiteId").then((ids) => ids.length),
      Chunk.countDocuments(),
      Lead.countDocuments(),
    ]);
    res.json({ totalSites, totalChunks, totalLeads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;