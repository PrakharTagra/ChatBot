import express from "express";
import Groq from "groq-sdk";
import { getEmbedding, cosineSimilarity } from "../utils/embeddings.js";
import Chunk from "../models/Chunk.js";

const router = express.Router();

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const SIMILARITY_THRESHOLD = 0.25; // below this = no confident answer
const TOP_K = 3;                   // number of chunks to use as context

/**
 * POST /api/chat
 * Body: {
 *   message: string,
 *   websiteId: string,
 *   history: [{ role: "user"|"assistant", content: string }]  // optional
 * }
 *
 * Response: {
 *   answer: string,
 *   source: string | null,
 *   confident: boolean
 * }
 */
router.post("/", async (req, res) => {
  const { message, websiteId, history = [] } = req.body;

  if (!message || !websiteId) {
    return res.status(400).json({ error: "message and websiteId are required." });
  }

  try {
    // Step 1: Embed the user's query
    const queryEmbedding = await getEmbedding(message);

    // Step 2: Fetch all chunks for this website and rank by similarity
    const chunks = await Chunk.find({ websiteId }).lean();

    if (chunks.length === 0) {
      return res.json({
        answer: "I don't have any information about this website yet. Please scrape it first.",
        source: null,
        confident: false,
      });
    }

    const ranked = chunks
      .map((chunk) => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    const topScore = ranked[0].score;
    const confident = topScore >= SIMILARITY_THRESHOLD;

    // Step 3: Build context from top chunks
    const context = ranked
      .map((c, i) => `[Source ${i + 1}: ${c.url}]\n${c.content}`)
      .join("\n\n---\n\n");

    // Step 4: Build conversation history (last 6 messages max)
    const recentHistory = history.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Step 5: Call Groq
    const systemPrompt = confident
      ? `You are a helpful website assistant. Answer the user's question using ONLY the context below. 
If the context doesn't fully answer the question, say so honestly.
Be concise and friendly. Always mention which page the info came from if relevant.

CONTEXT:
${context}`
      : `You are a helpful website assistant. The user asked a question but no relevant information was found on this website.
Politely let them know you couldn't find an answer and suggest they use the contact form for further help.
Do NOT make up information.`;

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: message },
      ],
    });

    const answer = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    const source = confident ? ranked[0].url : null;

    return res.json({ answer, source, confident });

  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: "Chat failed.", detail: err.message });
  }
});

export default router;