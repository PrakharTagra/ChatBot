import express from "express";
import Chunk from "../models/Chunk.js";

const router = express.Router();

// GET /api/stats — overall numbers
router.get("/", async (req, res) => {
  try {
    const [totalSites, totalChunks] = await Promise.all([
      Chunk.distinct("websiteId").then((ids) => ids.length),
      Chunk.countDocuments(),
    ]);
    res.json({ totalSites, totalChunks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;