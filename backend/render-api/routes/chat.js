import express from "express";
import Groq from "groq-sdk";
import { getEmbedding } from "../utils/embeddings.js";
import { queryChroma } from "../utils/chroma.js";

const router = express.Router();

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const SIMILARITY_THRESHOLD = 0.32;
const CONTEXT_INCLUSION_THRESHOLD = 0.35;
const TOP_K = 6;
const NOT_FOUND_TOKEN = "NOT_IN_CONTEXT";

const GREETING_RE = /^(hi+|hello+|hey+|howdy|greetings|good\s+(morning|afternoon|evening|day)|what'?s\s+up|sup|yo|hiya|namaste|salut|hola)\b/i;
const SMALL_TALK_RE = /^(how are you|how do you do|nice to meet|thanks|thank you|ok|okay|sure|great|cool|awesome|bye|goodbye|see you|cheers)\b/i;

const CONTACT_INTENT_RE = /\b(contact( (you|us|someone|me))?|get in touch|reach (you|out)|talk to (someone|a human|a person|a representative|your team)|speak (to|with) (someone|a human|a person)|connect (me |us )?(with |to )?(you|your team|someone|the team)|call (me|back)|phone number|email address|customer support|sales team|book a call|schedule a call)\b/i;

const LINK_REQUEST_RE = /\b(link|url|web ?page|source|page (link|url)|where can i (read|see|find)|send (me )?the link|share the link|give me the link)\b/i;

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

  if (CONTACT_INTENT_RE.test(trimmed)) {
    return res.json({
      answer: `I'd be happy to connect you with someone from the ${siteName} team. Let me grab a few quick details.`,
      source: null,
      confident: true,
      action: "collect_lead",
    });
  }

  try {
    const recentUserContext = history
      .filter((m) => m.role === "user")
      .slice(-1)
      .map((m) => m.content.split(" ").slice(-40).join(" "))
      .join(" ");
    const contextualQuery = recentUserContext ? `${recentUserContext} ${trimmed}` : trimmed;
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
- Otherwise: be thorough and well-organized, not just brief. Use the CONTEXT fully — if it describes several distinct things (e.g. multiple services, features, or steps), cover each one rather than picking just one or vaguely summarizing.
- Structure the answer for readability: start with a one-sentence direct answer, then use a plain-text bullet list (each line starting with "- ") when covering multiple items, with a blank line between the intro and the list. Use a blank line between separate paragraphs/sections too. Plain text only — no markdown headers, no asterisks/bold, no [text](url) links.
- Never say "the website" — always say "${siteName}" by name.
- On the very last line, output exactly: CITED_SOURCE: <n> — where <n> is the number of the single Source you drew the answer from. If you used more than one, give the one that contains the most specific/direct answer.

CONTEXT:
${context}`
      : `You are the assistant for ${siteName}.
No relevant content was found for this question.
Write ONE short plain sentence only: say ${siteName} couldn't find that information but can connect them with someone from the team if they leave their details.
No markdown, no links — just the plain sentence. Refer to the organisation as "${siteName}", never as "the website".`;

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: trimmed },
      ],
    });

    const rawCompletion = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

    const citedMatch = rawCompletion.match(/CITED_SOURCE:\s*(\d+)\s*$/i);
    const citedIndex = citedMatch ? parseInt(citedMatch[1], 10) - 1 : -1;
    const rawAnswer = rawCompletion.replace(/CITED_SOURCE:\s*\d+\s*$/i, "").trim();

    const modelSaysNotFound = retrievalConfident && rawAnswer.includes(NOT_FOUND_TOKEN);

    const confident = retrievalConfident && !modelSaysNotFound;

    const answer = confident
      ? stripMarkdown(rawAnswer)
      : `I couldn't find specific information about that for ${siteName}, but I can connect you with someone from the team if you leave your details.`;

    const citedChunk = (citedIndex >= 0 && relevantChunks[citedIndex]) ? relevantChunks[citedIndex] : ranked[0];

    const linkRequested = LINK_REQUEST_RE.test(trimmed);
    const source = confident && linkRequested
      ? (citedChunk.anchor ? `${citedChunk.url}#${citedChunk.anchor}` : citedChunk.url)
      : null;

    console.log("CONFIDENCE:", { topScore: topScore.toFixed(3), retrievalConfident, modelSaysNotFound, confident, citedIndex, linkRequested, source });

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