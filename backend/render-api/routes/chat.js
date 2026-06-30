import express from "express";
import Groq from "groq-sdk";
import { getEmbedding } from "../utils/embeddings.js";
import { queryChroma } from "../utils/chroma.js";

const router = express.Router();

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// all-MiniLM-L6-v2 cosine similarity: ~0.0-0.3 = unrelated, ~0.3-0.45 = loosely
// related/same-topic noise, 0.45+ = actually relevant. 0.30 was letting noise
// through as "confident", which is why generic answers were happening instead
// of escalation. Tune this against your own scraped content if needed.
const SIMILARITY_THRESHOLD = 0.45;
// Chunks below this (but still returned in top-K) are noise relative to the
// question — don't feed them into the LLM's context, they just invite
// vague/blended answers.
const CONTEXT_INCLUSION_THRESHOLD = 0.35;
const TOP_K = 3;
const NOT_FOUND_TOKEN = "NOT_IN_CONTEXT";

const GREETING_RE = /^(hi+|hello+|hey+|howdy|greetings|good\s+(morning|afternoon|evening|day)|what'?s\s+up|sup|yo|hiya|namaste|salut|hola)\b/i;
const SMALL_TALK_RE = /^(how are you|how do you do|nice to meet|thanks|thank you|ok|okay|sure|great|cool|awesome|bye|goodbye|see you|cheers)\b/i;

router.post("/", async (req, res) => {
  const { message, websiteId, history = [], websiteName } = req.body;

  if (!message || !websiteId) {
    return res.status(400).json({ error: "message and websiteId are required." });
  }

  const trimmed = message.trim();
  const siteName = websiteName || websiteId;

  if (GREETING_RE.test(trimmed) || SMALL_TALK_RE.test(trimmed)) {
    return res.json({
      answer: `Hello! I'm ${siteName}'s assistant. How can I help you today?`,
      source: null,
      confident: true,
    });
  }

  try {
    const recentContext = history.slice(-2).map(m => m.content).join(" ");
    const contextualQuery = recentContext ? `${recentContext} ${trimmed}` : trimmed;
    const queryEmbedding = await getEmbedding(contextualQuery);
    const ranked = await queryChroma(websiteId, queryEmbedding, TOP_K);
    console.log("TOP RESULTS:", ranked.map(r => ({
      score: r.score.toFixed(3),
      snippet: r.content.slice(0, 80)
    })));

    if (ranked.length === 0) {
      return res.json({
        answer: `I don't have any information about ${siteName} yet. Please scrape it first via the admin panel.`,
        source: null,
        confident: true,
      });
    }

    const topScore = ranked[0].score;
    const retrievalConfident = topScore >= SIMILARITY_THRESHOLD;

    // Only feed chunks that clear the inclusion bar into the LLM's context.
    // Including weak/unrelated top-K filler chunks is what was causing the
    // model to blend in tangential info and produce vague-but-plausible answers.
    const relevantChunks = ranked.filter((c) => c.score >= CONTEXT_INCLUSION_THRESHOLD);

    const context = relevantChunks
      .map((c, i) => `[Source ${i + 1}: ${c.url}]\n${c.content}`)
      .join("\n\n---\n\n");

    const recentHistory = history.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = retrievalConfident
      ? `You are the official AI assistant speaking on behalf of ${siteName}.
Speak in first person as ${siteName} — say "we", "our", "us" when referring to the organisation.

STRICT RULES — follow these exactly:
- Answer using ONLY facts explicitly stated in the CONTEXT below.
- Never use outside knowledge, training data, assumptions, or general industry/topic knowledge to fill gaps.
- If the CONTEXT does not contain the specific information needed to answer the question, you MUST respond with exactly this and nothing else: ${NOT_FOUND_TOKEN}
- Do not guess, infer, hedge, or generalize beyond what is explicitly written in the CONTEXT. A partial or related fact is not an answer — if it doesn't actually answer what was asked, output ${NOT_FOUND_TOKEN}.
- Otherwise: be concise and friendly. Plain text only — no markdown, no asterisks, no [text](url) links, no bullet points.
- Write in short paragraphs. Never say "the website" — always say "${siteName}" by name.
- On the very last line, output exactly: CITED_SOURCE: <n> — where <n> is the number of the single Source you drew the answer from. If you used more than one, give the one that contains the most specific/direct answer.

CONTEXT:
${context}`
      : `You are the assistant for ${siteName}.
No relevant content was found for this question.
Write ONE short plain sentence only: say ${siteName} couldn't find that information but can connect them with someone from the team if they leave their details.
No markdown, no links — just the plain sentence. Refer to the organisation as "${siteName}", never as "the website".`;

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: trimmed },
      ],
    });

    const rawCompletion = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

    // Pull the model's self-reported source number off the last line, then
    // strip that line out before showing the answer to the user.
    const citedMatch = rawCompletion.match(/CITED_SOURCE:\s*(\d+)\s*$/i);
    const citedIndex = citedMatch ? parseInt(citedMatch[1], 10) - 1 : -1;
    const rawAnswer = rawCompletion.replace(/CITED_SOURCE:\s*\d+\s*$/i, "").trim();

    const modelSaysNotFound = retrievalConfident && rawAnswer.includes(NOT_FOUND_TOKEN);

    // Final confidence requires BOTH a strong retrieval match AND the model
    // actually finding the answer in that context.
    const confident = retrievalConfident && !modelSaysNotFound;

    const answer = confident
      ? stripMarkdown(rawAnswer)
      : `I couldn't find specific information about that for ${siteName}, but I can connect you with someone from the team if you leave your details.`;

    // Use whichever chunk the model actually says it answered from — falling
    // back to the top-ranked chunk only if it didn't cite cleanly. This
    // keeps the link tied to the page (and section, if a heading id was
    // captured during scraping) that the answer's content actually came from,
    // instead of always pointing at the highest-scoring retrieval result.
    const citedChunk = (citedIndex >= 0 && relevantChunks[citedIndex]) ? relevantChunks[citedIndex] : ranked[0];
    const source = confident
      ? (citedChunk.anchor ? `${citedChunk.url}#${citedChunk.anchor}` : citedChunk.url)
      : null;

    console.log("CONFIDENCE:", { topScore: topScore.toFixed(3), retrievalConfident, modelSaysNotFound, confident, citedIndex, source });

    return res.json({
      answer,
      source,
      confident,
      ...(!confident ? { action: "collect_lead" } : {}),
    });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: "Chat failed.", detail: err.message });
  }
});

function stripMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default router;