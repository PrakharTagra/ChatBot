# AI Website Chat Agent

A production-style RAG (Retrieval-Augmented Generation) chat agent. Point it at any website, it crawls and indexes the content into a vector database, and visitors get an embeddable widget that answers questions grounded strictly in that site's own content — with automatic lead capture when it can't answer.

---

## Project Structure

```
ChatBot/
├── backend/
│   ├── render-api/     — Node.js + Express API (deployed to Render): chat, sites, stats, leads
│   └── local-scraper/  — Playwright + Crawlee crawler (runs locally, writes to Chroma Cloud)
├── frontend/            — React admin dashboard (Vite)
├── widget/               — Built embeddable widget (chat-widget.js)
└── widget-src/           — Widget source + esbuild config
```

The backend is split into two independent services on purpose: `local-scraper` runs a headless browser (Playwright) and is heavy, so it stays off the deployed API and is only run locally/on demand when a site needs (re-)indexing. `render-api` is the lightweight, always-on service that actually serves chat traffic.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js, Express |
| Crawler | Playwright, Crawlee, Cheerio |
| Vector Database | **ChromaDB Cloud** (`CloudClient`, cosine similarity, one collection per site) |
| Embeddings | `@xenova/transformers` — `Xenova/all-MiniLM-L6-v2` (local, free, no external API) |
| LLM | Groq API — Llama 3.1 (8B Instant) |
| Lead Storage | MongoDB (per-site connection URI, used only for captured leads — not for content) |
| Frontend | React + Vite |
| Widget | Vanilla JS (esbuild bundled) |

---

## 🎯 How It Works

1. **Register a website** in the admin dashboard → enter a URL (and optionally a MongoDB URI for lead capture on that site).
2. **`local-scraper`** crawls the site with Playwright (up to 300 pages, single concurrency, images/fonts/stylesheets blocked for speed), skipping listing/tag/asset pages.
   - Content is extracted per semantic HTML block (`h1–h6`, `p`, `li`, `td`, `blockquote`), tagged with the nearest heading anchor for deep-linking.
   - Blocks are deduplicated (exact-match, normalized) before chunking, then merged into ~150-word chunks with 30-word overlap.
   - Each chunk is embedded locally and **upserted into a per-site ChromaDB Cloud collection**, along with URL, title, heading anchor, and last-scraped timestamp.
3. A visitor asks the widget a question. **`render-api`** first checks lightweight regex intents (greeting, small talk, "contact us") before touching the LLM at all.
4. Otherwise, the last user turn + current message are embedded and matched against the site's Chroma collection (top 6, cosine similarity).
5. A **two-threshold confidence gate** decides what happens next:
   - Below the retrieval threshold → skip the LLM, return a fallback + offer to collect the visitor's details.
   - Above it → the relevant chunks (above a second, stricter inclusion threshold) are passed to Llama 3.1 as strictly-scoped context.
6. The LLM is instructed to answer **only** from the provided context, output a `NOT_IN_CONTEXT` sentinel if it can't, and cite which source chunk it used — this is checked server-side, and any low-confidence/`NOT_IN_CONTEXT` result also falls back to the lead-capture prompt.
7. If a lead is offered and the visitor provides name/email/mobile, it's written to **that site's own MongoDB** (each customer can use their own database — the URI is stored as metadata on their Chroma collection, not hardcoded).

---

## API Reference (`render-api`)

### `POST /api/chat`
```json
{ "message": "What services do you offer?", "websiteId": "your-site", "history": [], "websiteName": "Acme" }
```
Response:
```json
{ "answer": "...", "source": "https://yoursite.com/services#pricing", "confident": true }
```

### `GET /api/sites`
List all indexed sites with chunk counts and last-scraped time.

### `DELETE /api/sites/:websiteId`
Remove a site's Chroma collection.

### `GET /api/stats`
Aggregate totals — sites indexed, total chunks stored.

### `POST /api/leads/:websiteId`
Save a captured lead (`name`, `email`, `mobile`) to that site's configured MongoDB.

### `POST /api/scrape` (on `local-scraper`, run locally)
```json
{ "url": "https://yoursite.com", "websiteId": "your-site", "mongoUri": "optional, for lead capture" }
```

---

## Getting Started

### 1. Chat API (deploy-ready service)
```bash
cd backend/render-api
npm install
cp .env.example .env   # fill in GROQ_API_KEY, Chroma Cloud credentials
npm run dev
```

### 2. Scraper (run locally when indexing/re-indexing a site)
```bash
cd backend/local-scraper
npm install
npm run dev
```

### 3. Frontend (Admin Dashboard)
```bash
cd frontend
npm install
npm run dev
```
Dashboard runs at `http://localhost:5173`

### 4. Widget (rebuild after editing source)
```bash
cd widget-src
npm install
npm run build
```

---

## Embed on Any Website

```html
<!-- Add before </body> -->
<script src="https://chatbot-gurp.onrender.com/widget/chat-widget.js"></script>
<script>
  ChatWidget.init({
    websiteId: "your-site-id",
    apiUrl: "https://chatbot-gurp.onrender.com",
    title: "Website Assistant",
    welcomeMessage: "Hi! How can I help?",
    primaryColor: "#6c63ff",
    position: "bottom-right"
  });
</script>
```

---

## Environment Variables

```env
# render-api and local-scraper
GROQ_API_KEY=gsk_...
CHROMA_API_KEY=...        # Chroma Cloud
CHROMA_TENANT=...
CHROMA_DATABASE=...
PORT=5000
```

Lead-capture MongoDB URIs are supplied **per site** at scrape time, not as a global env var.

---

## Admin Dashboard Features

| Page | What it does |
|---|---|
| Dashboard | See all sites and total chunks |
| Add Website | Enter URL, optional lead-capture DB, run scrape, get embed code |
| Manage → Embed | Copy the embed snippet |
| Manage → Live Test | Chat with the bot directly in the browser |
| Manage → Re-scrape | Re-index the site after content updates (preserves lead-capture config) |

---

## Security Notes

- Never commit `.env` — add it to `.gitignore`
- Regenerate Groq/Chroma credentials if ever exposed
- Add rate limiting (`express-rate-limit`) before production traffic
- Each site's lead-capture MongoDB URI is stored as Chroma collection metadata, isolated per site

---

## Possible Next Steps

- Streaming responses instead of single-shot completions
- Multi-turn conversation memory beyond the last 6 messages
- Analytics on which questions go unanswered (candidates for FAQ content)
