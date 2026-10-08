import "./env-init.js";
import "dotenv/config";
import express from "express";
import cors from "cors";

import scrapeRouter from "./routes/scrape.js";

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

// Chrome/Edge Private Network Access (PNA) preflight support
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.headers["access-control-request-private-network"]) {
    res.header("Access-Control-Allow-Private-Network", "true");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

app.use("/api/scrape", scrapeRouter);

app.get("/api/health", (req, res) => res.json({ status: "ok", role: "local-scraper" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Local scraper running on http://localhost:${PORT}`)
);

export default app;
