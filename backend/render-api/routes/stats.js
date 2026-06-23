import express from "express";
import { listSites } from "../utils/chroma.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const sites = await listSites();
    const totalSites = sites.length;
    const totalChunks = sites.reduce((sum, s) => sum + s.chunks, 0);
    res.json({ totalSites, totalChunks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;