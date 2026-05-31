import express from "express";
import Lead from "../models/Lead.js";

const router = express.Router();

// POST /api/contact
router.post("/", async (req, res) => {
  const { name, email, phone, message, websiteId } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email, and message are required." });
  }

  try {
    const lead = await Lead.create({
      websiteId: websiteId || "unknown",
      name,
      email,
      phone: phone || "",
      message,
    });

    res.json({ success: true, leadId: lead._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;