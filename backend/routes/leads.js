import express from "express";
import mongoose from "mongoose";

const router = express.Router();

const mongoUriStore = new Map();

export function setMongoUri(websiteId, uri) {
  mongoUriStore.set(websiteId, uri);
}

export function getMongoUri(websiteId) {
  return mongoUriStore.get(websiteId);
}

router.post("/:websiteId", async (req, res) => {
  const { websiteId } = req.params;
  const { name, email, mobile } = req.body;

  if (!name || !email || !mobile) {
    return res.status(400).json({ error: "name, email, and mobile are required." });
  }

  const mongoUri = mongoUriStore.get(websiteId);
  if (!mongoUri) {
    return res.status(404).json({ error: "No MongoDB URI configured for this website." });
  }

  let conn;
  try {
    conn = await mongoose.createConnection(mongoUri).asPromise();

    const LeadSchema = new mongoose.Schema({
      name: String,
      email: String,
      mobile: String,
      websiteId: String,
      createdAt: { type: Date, default: Date.now },
    });

    const Lead = conn.models.Lead || conn.model("Lead", LeadSchema);

    const lead = await Lead.create({ name, email, mobile, websiteId });
    return res.json({ success: true, leadId: lead._id });
  } catch (err) {
    console.error("Lead save error:", err);
    return res.status(500).json({ error: "Failed to save lead.", detail: err.message });
  } finally {
    if (conn) {
      await conn.close().catch(() => {});
    }
  }
});

export default router;