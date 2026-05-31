import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import scrapeRouter from "./routes/scrape.js";
import chatRouter from "./routes/chat.js";
import contactRouter from "./routes/contact.js";
import sitesRouter from "./routes/sites.js";
import statsRouter from "./routes/stats.js";
import leadsRouter from "./routes/leads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// CORS — allow both the Vite dev server and same-origin requests
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "*"],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// Serve the embeddable widget as a static file
app.use("/widget", express.static(path.join(__dirname, "../widget")));

// API routes
app.use("/api/scrape", scrapeRouter);
app.use("/api/chat", chatRouter);
app.use("/api/contact", contactRouter);
app.use("/api/sites", sitesRouter);
app.use("/api/stats", statsRouter);
app.use("/api/leads", leadsRouter);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Connect to MongoDB and start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });