import "dotenv/config";
import express from "express";
import cors from "cors";

import scrapeRouter from "./routes/scrape.js";

const app = express();

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

app.use("/api/scrape", scrapeRouter);

app.get("/api/health", (req, res) => res.json({ status: "ok", role: "local-scraper" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Local scraper running on http://localhost:${PORT}`)
);
