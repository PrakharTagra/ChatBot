import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import scrapeRouter from "./routes/scrape.js";
import chatRouter from "./routes/chat.js";
import sitesRouter from "./routes/sites.js";
import statsRouter from "./routes/stats.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// CORS — reflect request origin so the widget works on any host
app.use(cors({
  origin: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// Serve the embeddable widget as a static file
app.use("/widget", express.static(path.join(__dirname, "../widget")));

// API routes
app.use("/api/scrape", scrapeRouter);
app.use("/api/chat", chatRouter);
app.use("/api/sites", sitesRouter);
app.use("/api/stats", statsRouter);

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