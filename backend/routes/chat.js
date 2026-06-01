import express from "express";
import Groq from "groq-sdk";
import { getEmbedding, cosineSimilarity } from "../utils/embeddings.js";
import Chunk from "../models/Chunk.js";

const router = express.Router();

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const SIMILARITY_THRESHOLD = 0.45; // raised: only escalate when genuinely no match
const TOP_K = 3;

// Greetings / small-talk patterns that should never trigger contact form escalation
const GREETING_PATTERNS = /^(hi+|hello+|hey+|howdy|greetings|good\s+(morning|afternoon|evening|day)|what'?s\s+up|sup|yo|hiya|namaste|salut|hola)\b/i;
const SMALL_TALK_PATTERNS = /^(how are you|how do you do|nice to meet|thanks|thank you|ok|okay|sure|great|cool|awesome|bye|goodbye|see you|cheers)\b/i;

/**
 * POST /api/chat
 * Body: { message, websiteId, history?, contactUrl? }
 * Response: { answer, source, confident, contactUrl? }
 */
router.post("/", async (req, res) => {
  const { message, websiteId, history = [], contactUrl } = req.body;

  if (!message || !websiteId) {
    return res.status(400).json({ error: "message and websiteId are required." });
  }

  const trimmed = message.trim();

  // Handle greetings and small talk without touching the vector DB
  if (GREETING_PATTERNS.test(trimmed) || SMALL_TALK_PATTERNS.test(trimmed)) {
    return res.json({
      answer: "Hello! I'm here to help you with any questions about this website. What would you like to know?",
      source: null,
      confident: true,
    });
  }

  try {
    const queryEmbedding = await getEmbedding(trimmed);
    const chunks = await Chunk.find({ websiteId }).lean();

    if (chunks.length === 0) {
      return res.json({
        answer: "I don't have any information about this website yet. Please scrape it first via the admin panel.",
        source: null,
        confident: true,
      });
    }

    const ranked = chunks
      .map((c) => ({ ...c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    const topScore = ranked[0].score;
    const confident = topScore >= SIMILARITY_THRESHOLD;

    // Derive the site's base URL from the first chunk's URL (for contact escalation)
    let siteBaseUrl = contactUrl || null;
    if (!siteBaseUrl && chunks[0]?.url) {
      try {
        const u = new URL(chunks[0].url);
        siteBaseUrl = u.origin;
      } catch { /* ignore */ }
    }

    const context = ranked
      .map((c, i) => `[Source ${i + 1}: ${c.url}]\n${c.content}`)
      .join("\n\n---\n\n");

    const recentHistory = history.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = confident
      ? `You are a helpful assistant for this website. Answer using ONLY the context below.
Be concise, friendly, and plain-text only — no markdown formatting, no bullet asterisks, no [text](url) links.
If you mention a page or source, just say the page name naturally.

CONTEXT:
${context}`
      : `You are a helpful assistant. No relevant information was found on this website for the user's question.
Respond with a single short sentence: acknowledge you don't have that info, and suggest they visit the contact page for help.
Plain text only, no markdown, no links.`;

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: trimmed },
      ],
    });

    const rawAnswer = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    // Strip any residual markdown the model still outputs
    const answer = stripMarkdown(rawAnswer);
    const source = confident ? ranked[0].url : null;

    return res.json({
      answer,
      source,
      confident,
      ...((!confident && siteBaseUrl) ? { contactUrl: siteBaseUrl + "/contact" } : {}),
    });

  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: "Chat failed.", detail: err.message });
  }
});

/**
 * Strip common markdown so the widget always renders plain readable text.
 */
function stripMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // [text](url) → text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")  // images
    .replace(/^#{1,6}\s+/gm, "")               // headings
    .replace(/(\*\*|__)(.*?)\1/g, "$2")        // bold
    .replace(/(\*|_)(.*?)\1/g, "$2")           // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) =>     // inline code — keep text
      m.replace(/`/g, ""))
    .replace(/^\s*[-*+]\s+/gm, "• ")           // bullets → •
    .replace(/^\s*\d+\.\s+/gm, "")             // numbered lists
    .replace(/\n{3,}/g, "\n\n")                // excess newlines
    .trim();
}

export default router;
