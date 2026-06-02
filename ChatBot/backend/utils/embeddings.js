import { pipeline } from "@xenova/transformers";

let embedder = null;

/**
 * Lazy-load the embedding model once, reuse on subsequent calls.
 * Model: all-MiniLM-L6-v2 — 384 dimensions, ~25MB download on first use.
 */
async function getEmbedder() {
  if (!embedder) {
    console.log("⏳ Loading embedding model (first run downloads ~25MB)...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✅ Embedding model ready.");
  }
  return embedder;
}

/**
 * Generate a 384-dim embedding vector for a given text string.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function getEmbedding(text) {
  const model = await getEmbedder();
  const output = await model(text.slice(0, 512), {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}

/**
 * Cosine similarity between two vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} similarity score between -1 and 1
 */
export function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}