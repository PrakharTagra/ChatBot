import { pipeline } from "@xenova/transformers";

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    console.log("⏳ Loading embedding model...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✅ Embedding model ready.");
  }
  return embedder;
}

export async function getEmbedding(text) {
  const model = await getEmbedder();

  // Keep the LAST 180 words, not the first. Callers (chat.js) build the
  // embedding input as `${recentHistory} ${currentQuestion}` — the current
  // question is always at the end. A prior thorough bot answer in history
  // can easily push the combined text past 180 words, and truncating from
  // the front was silently dropping the actual question being asked,
  // leaving the embedding (and therefore retrieval) built entirely from
  // stale prior turns. Truncating from the end instead guarantees the
  // current question always survives.
  const words = text.split(" ");
  const truncated = words.length > 180 ? words.slice(-180).join(" ") : text;

  const output = await model(truncated, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}