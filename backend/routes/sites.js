import express from "express";
import Chunk from "../models/Chunk.js";

const router = express.Router();

// GET /api/sites — list all unique websiteIds with their stats
router.get("/", async (req, res) => {
  try {
    const websiteIds = await Chunk.distinct("websiteId");

    const sites = await Promise.all(
      websiteIds.map(async (id) => {
        const sample = await Chunk.findOne({ websiteId: id }).sort({ createdAt: -1 });
        const chunkCount = await Chunk.countDocuments({ websiteId: id });
        return {
          websiteId: id,
          url: sample?.url || "",
          chunks: chunkCount,
          lastScraped: sample?.createdAt || null,
        };
      })
    );

    res.json({ sites });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:websiteId", async (req, res) => {
  const { websiteId } = req.params;
  try {
    await Promise.all([
      Chunk.deleteMany({ websiteId }),
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;