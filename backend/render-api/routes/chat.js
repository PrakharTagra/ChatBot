import express from "express";
import Groq from "groq-sdk";
import { getEmbedding } from "../utils/embeddings.js";
import { queryChroma } from "../utils/chroma.js";

const router = express.Router();

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const CANDIDATE_MODELS = [
  process.env.GROQ_MODEL,
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
].filter(Boolean);

async function createChatCompletionWithFallback(groqClient, messages, maxTokens = 800) {
  let lastError = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const completion = await groqClient.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages,
      });
      return completion;
    } catch (err) {
      lastError = err;
      console.warn(`Groq model "${model}" failed (${err.message}), trying next...`);
    }
  }
  throw lastError;
}

const SIMILARITY_THRESHOLD = 0.22;
const CONTEXT_INCLUSION_THRESHOLD = 0.20;
const TOP_K = 6;
const NOT_FOUND_TOKEN = "NOT_IN_CONTEXT";

const GREETING_RE = /^(hi+|hello+|hey+|howdy|greetings|good\s+(morning|afternoon|evening|day)|what'?s\s+up|sup|yo|hiya|namaste|salut|hola)\b/i;
const SMALL_TALK_RE = /^(how are you|how do you do|nice to meet|thanks|thank you|ok|okay|sure|great|cool|awesome|bye|goodbye|see you|cheers)\b/i;

const HUMAN_HANDOFF_RE = /\b(talk to (a human|a person|a representative|someone from the team|sales)|speak (to|with) (a human|a person|a representative)|call me back|request a call|book a call|schedule a consultation|schedule a call)\b/i;

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

  if (HUMAN_HANDOFF_RE.test(trimmed)) {
    return res.json({
      answer: `I'd be happy to connect you with someone from the ${siteName} team. Let me grab a few quick details.`,
      source: null,
      confident: true,
      action: "collect_lead",
    });
  }

  let ranked = [];
  let relevantChunks = [];

  try {
    const recentUserContext = history
      .filter((m) => m.role === "user")
      .slice(-1)
      .map((m) => m.content.split(" ").slice(-40).join(" "))
      .join(" ");
    const contextualQuery = recentUserContext ? `${recentUserContext} ${trimmed}` : trimmed;
    const queryEmbedding = await getEmbedding(contextualQuery);
    ranked = await queryChroma(websiteId, queryEmbedding, TOP_K);
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

    relevantChunks = ranked.filter((c) => c.score >= CONTEXT_INCLUSION_THRESHOLD);

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
- ALWAYS format your response in clean bullets / pointers:
  1. Start with a single direct sentence answering the question.
  2. Follow with clean bullet points (each starting with "• ").
  3. Bold or clearly name the feature/service/model at the start of each bullet (e.g., "• **Service Name**: Description").
  4. Separate items with a blank line for readability.
- Never say "the website" — always say "${siteName}" by name.
- On the very last line, output exactly: CITED_SOURCE: <n> — where <n> is the number of the single Source you drew the answer from.

CONTEXT:
${context}`
      : `You are the assistant for ${siteName}.
No relevant content was found for this question.
Write ONE short plain sentence only: say ${siteName} couldn't find that information but can connect them with someone from the team if they leave their details.
No markdown, no links — just the plain sentence. Refer to the organisation as "${siteName}", never as "the website".`;

    const completion = await createChatCompletionWithFallback(
      getGroq(),
      [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: trimmed },
      ],
      800
    );

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

    // If vector search returned knowledge base content but LLM generation encountered an issue, provide formatted pointers directly
    if (relevantChunks.length > 0 || ranked.length > 0) {
      const best = relevantChunks[0] || ranked[0];
      return res.json({
        answer: formatIntoPointers(best.content, trimmed, siteName),
        source: best.url,
        confident: true,
      });
    }

    return res.json({
      answer: `I could not retrieve an answer at this time. Please leave your contact details so our team can follow up directly.`,
      source: null,
      confident: false,
      action: "collect_lead",
    });
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

function formatIntoPointers(rawContent, userQuestion, siteName) {
  if (!rawContent) return `No specific details found for ${siteName}.`;

  const q = (userQuestion || "").toLowerCase();

  // 1. Contextual opening sentence directly addressing the user question
  let intro = `Here are the key details for ${siteName}:`;
  if (/service|product|offering|solution|what (do you|they) (do|provide|offer)/i.test(q)) {
    intro = `Here are the core services and solutions offered by ${siteName}:`;
  } else if (/price|pricing|cost|rate|fee|retainer|package|hourly|model/i.test(q)) {
    intro = `Here are the pricing and engagement models supported by ${siteName}:`;
  } else if (/contact|email|phone|reach|touch|call|support|talk/i.test(q)) {
    intro = `Here are the contact and support details for ${siteName}:`;
  } else if (/who|about|company|background|mission/i.test(q)) {
    intro = `Here is an overview of ${siteName}:`;
  } else if (/tech|technology|stack|framework|language|tool/i.test(q)) {
    intro = `Here are the technologies utilized by ${siteName}:`;
  }

  // 2. Remove website boilerplate noise, dangling navigation tags, button labels
  let cleaned = rawContent
    .replace(/\b(Talk to Our Experts|Book a call|Contact Us|Read More|Get in touch|AWS Vue\.js|View All|Home > [^.\n]+)\b/gi, '')
    .replace(/Source:\s*\[[^\]]+\]\([^)]+\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const pointers = [];

  // 3. Check for Q&A FAQ pattern: questions followed by answers
  const qMatches = cleaned.split('?');
  if (qMatches.length >= 2) {
    for (let i = 0; i < qMatches.length - 1; i++) {
      const prevSentences = qMatches[i].split('. ');
      const qSentence = prevSentences[prevSentences.length - 1].trim();

      const nextRaw = qMatches[i + 1].trim();
      const nextSentences = nextRaw.split('. ');
      const answerSentences = nextSentences.filter(s => !s.endsWith('?') && s.length > 10);
      const answerText = answerSentences.slice(0, 2).join('. ') + (answerSentences.length > 0 ? '.' : '');

      if (qSentence.length >= 10 && answerText.length >= 15) {
        const cleanQ = qSentence.replace(/^(what|how|where|when|can|do|does|is|are)\s+/i, '').trim();
        const topic = cleanQ.charAt(0).toUpperCase() + cleanQ.slice(1);
        pointers.push(`• **${topic}**: ${answerText}`);
      }
    }
  }

  // 4. Check for distinct feature/offering labels
  if (pointers.length === 0) {
    const knownLabels = [
      'SaaS Applications', 'Enterprise Web Apps', 'CRM / ERP Systems', 'Marketplace Development',
      'Web Application Development', 'Cloud Migration', 'AI / ML', 'Mobile Development',
      'Time-and-materials', 'Fixed-price', 'Fixed-bid', 'Dedicated team', 'Retainer', 'Full-Stack'
    ];

    let foundLabels = [];
    for (const label of knownLabels) {
      const idx = cleaned.indexOf(label);
      if (idx !== -1) {
        foundLabels.push({ label, idx });
      }
    }
    foundLabels.sort((a, b) => a.idx - b.idx);

    if (foundLabels.length >= 2) {
      for (let i = 0; i < foundLabels.length; i++) {
        const cur = foundLabels[i];
        const nextIdx = (i + 1 < foundLabels.length) ? foundLabels[i + 1].idx : Math.min(cleaned.length, cur.idx + 300);
        const segment = cleaned.slice(cur.idx + cur.label.length, nextIdx).trim();
        const desc = segment.replace(/^[:\-–—\s]+/, '').trim();
        if (desc.length > 15) {
          pointers.push(`• **${cur.label}**: ${desc}`);
        }
      }
    }
  }

  // 5. Fallback sentence parser: convert key sentences into distinct bullet points
  if (pointers.length === 0) {
    const sentences = cleaned.split(/(?<=[.?!])\s+/).filter(s => s.trim().length >= 20);
    for (const s of sentences.slice(0, 5)) {
      const colonIdx = s.indexOf(':');
      if (colonIdx > 3 && colonIdx < 35) {
        const title = s.slice(0, colonIdx).trim();
        const body = s.slice(colonIdx + 1).trim();
        pointers.push(`• **${title}**: ${body}`);
      } else {
        pointers.push(`• ${s.trim()}`);
      }
    }
  }

  return `${intro}\n\n${pointers.join('\n\n')}`;
}

export default router;