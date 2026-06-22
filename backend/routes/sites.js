import express from "express";
import { listSites, deleteCollection } from "../utils/chroma.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const sites = await listSites();
    res.json({ sites });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:websiteId", async (req, res) => {
  try {
    await deleteCollection(req.params.websiteId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;