import express from "express";
import Groq from "groq-sdk";
import { getEmbedding, cosineSimilarity } from "../utils/embeddings.js";
import Chunk from "../models/Chunk.js";

const router = express.Router();

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Lower threshold so real questions match; greetings are excluded separately
const SIMILARITY_THRESHOLD = 0.32;
const TOP_K = 3;

// These patterns bypass vector search entirely — always answer confidently
const GREETING_RE = /^(hi+|hello+|hey+|howdy|greetings|good\s+(morning|afternoon|evening|day)|what'?s\s+up|sup|yo|hiya|namaste|salut|hola)\b/i;
const SMALL_TALK_RE = /^(how are you|how do you do|nice to meet|thanks|thank you|ok|okay|sure|great|cool|awesome|bye|goodbye|see you|cheers)\b/i;

router.post("/", async (req, res) => {
  const { message, websiteId, history = [] } = req.body;

  if (!message || !websiteId) {
    return res.status(400).json({ error: "message and websiteId are required." });
  }

  const trimmed = message.trim();

  // Greetings / small-talk: never escalate, never touch DB
  if (GREETING_RE.test(trimmed) || SMALL_TALK_RE.test(trimmed)) {
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

    // Always derive siteBaseUrl from stored chunks — no need for client to send it
    let siteBaseUrl = null;
    try {
      const u = new URL(chunks[0].url);
      siteBaseUrl = u.origin;
    } catch { /* ignore */ }

    const context = ranked
      .map((c, i) => `[Source ${i + 1}: ${c.url}]\n${c.content}`)
      .join("\n\n---\n\n");

    const recentHistory = history.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = confident
      ? `You are a helpful assistant for this website. Answer using ONLY the context below.
Be concise and friendly. Plain text only — no markdown, no asterisks, no [text](url) links, no bullet points.
Write in short paragraphs. If you reference a page, mention its name naturally in the sentence.

CONTEXT:
${context}`
      : `You are a helpful assistant. No relevant content was found for this question.
Write ONE short plain sentence only: say you couldn't find that information and suggest they get in touch.
No markdown, no links, no contact URL — just the plain sentence.`;

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
    const answer = stripMarkdown(rawAnswer);
    const source = confident ? ranked[0].url : null;

    return res.json({
      answer,
      source,
      confident,
      // Widget uses this to show the Contact Us button — model never sees this URL
      ...(!confident && siteBaseUrl ? { contactUrl: siteBaseUrl + "/contact" } : {}),
    });

  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: "Chat failed.", detail: err.message });
  }
});

function stripMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // [text](url) → text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // images
    .replace(/^#{1,6}\s+/gm, "")              // headings
    .replace(/(\*\*|__)(.*?)\1/g, "$2")       // bold
    .replace(/(\*|_)(.*?)\1/g, "$2")          // italic
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")   // code
    .replace(/^\s*[-*+]\s+/gm, "• ")          // bullets → •
    .replace(/^\s*\d+\.\s+/gm, "")            // numbered lists
    .replace(/\n{3,}/g, "\n\n")               // excess newlines
    .trim();
}

export default router;
