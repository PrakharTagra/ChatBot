import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import chatRouter from "./routes/chat.js";
import sitesRouter from "./routes/sites.js";
import statsRouter from "./routes/stats.js";
import leadsRouter from "./routes/leads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

app.use("/widget", express.static(path.join(__dirname, "../widget")));

app.use("/api/chat", chatRouter);
app.use("/api/sites", sitesRouter);
app.use("/api/stats", statsRouter);
app.use("/api/leads", leadsRouter);

app.get("/api/health", (req, res) => res.json({ status: "ok", role: "render-api" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Render API running on http://localhost:${PORT}`));
