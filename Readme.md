# 🤖 AI Website Chat Agent

An AI-powered embeddable chat widget that answers visitor questions using your website's content, and automatically captures leads when it can't answer.

---

## 🗂 Project Structure

```
ChatBot/
├── backend/          — Node.js + Express API server
├── frontend/         — React admin dashboard (Vite)
├── widget/           — Built embeddable widget (chat-widget.js)
├── widget-src/       — Widget source + esbuild config
└── scraper/          — Website crawler
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| AI Chat | Groq API (Llama 3.1) |
| Embeddings | @xenova/transformers (local, free) |
| Database | MongoDB Atlas |
| Frontend | React + Vite |
| Widget | Vanilla JS (esbuild bundled) |

---

## 🚀 Getting Started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI and GROQ_API_KEY
npm run dev
```

Server runs at `http://localhost:5000`

### 2. Frontend (Admin Dashboard)

```bash
cd frontend
npm install
npm run dev
```

Dashboard runs at `http://localhost:5173`

### 3. Widget (rebuild after editing source)

```bash
cd widget-src
npm install
npm run build
```

---

## 🎯 How It Works

1. **Register a website** in the admin dashboard → enter any URL
2. The **scraper** crawls up to 50 pages, chunks the content, generates embeddings, and stores them in MongoDB
3. When a visitor asks a question, the **chat API** embeds the query and finds the most semantically similar content chunks
4. The best chunks are sent as context to **Groq's Llama 3.1** which generates a natural answer
5. If similarity score is below the threshold, `confident: false` is returned → the widget shows a **contact form**
6. Lead data is saved to MongoDB and visible in the **Leads tab** of the admin dashboard

---

## 📋 API Reference

### POST /api/scrape
Crawl and index a website.
```json
{ "url": "https://yoursite.com", "websiteId": "your-site" }
```

### POST /api/chat
Ask a question.
```json
{ "message": "What services do you offer?", "websiteId": "your-site" }
```
Response:
```json
{ "answer": "...", "source": "https://yoursite.com/services", "confident": true }
```

### POST /api/contact
Submit a contact form lead.
```json
{ "name": "John", "email": "j@example.com", "message": "...", "websiteId": "your-site" }
```

### GET /api/sites
List all indexed websites with stats.

### GET /api/leads/:websiteId
Get contact form submissions for a site.

### DELETE /api/sites/:websiteId
Remove a site and all its data.

---

## 🔌 Embed on Any Website

```html
<!-- Add before </body> -->
<script src="https://yourdomain.com/widget/chat-widget.js"></script>
<script>
  ChatWidget.init({
    websiteId: "your-site-id",       // from admin dashboard
    apiUrl: "https://yourdomain.com", // your deployed backend URL
    title: "Website Assistant",       // optional
    welcomeMessage: "Hi! How can I help?", // optional
    primaryColor: "#6c63ff",          // optional
    position: "bottom-right"          // or "bottom-left"
  });
</script>
```

---

## 🛠 Environment Variables

```env
MONGO_URI=mongodb+srv://...
GROQ_API_KEY=gsk_...
PORT=5000
```

---

## 📊 Admin Dashboard Features

| Page | What it does |
|---|---|
| Dashboard | See all sites, total chunks, total leads |
| Add Website | Enter URL, customize widget, run scrape, copy embed code |
| Manage → Embed | Copy the embed snippet |
| Manage → Live Test | Chat with the bot directly in the browser |
| Manage → Leads | View all captured contact form submissions |
| Manage → Re-scrape | Re-index the site after content updates |

---

## 🔒 Security Notes

- Never commit your `.env` file — add it to `.gitignore`
- Regenerate your Groq API key and MongoDB password if they were ever exposed
- Add rate limiting (`express-rate-limit`) before deploying to production

---

## 📦 Deployment (Next Step)

Deploy the backend to **Railway** or **Render**:
1. Push your code to GitHub
2. Connect Railway/Render to the repo
3. Set `MONGO_URI` and `GROQ_API_KEY` as environment variables
4. Update `apiUrl` in your embed snippet to the live URL