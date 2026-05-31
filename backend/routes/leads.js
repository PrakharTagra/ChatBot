import express from "express";
import Lead from "../models/Lead.js";

const router = express.Router();

// GET /api/leads/:websiteId — fetch leads for a site
router.get("/:websiteId", async (req, res) => {
  try {
    const leads = await Lead.find({ websiteId: req.params.websiteId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;