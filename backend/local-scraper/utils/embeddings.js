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

  // Kept consistent with backend/render-api/utils/embeddings.js: truncate
  // from the end, not the start. Doesn't change behavior here since
  // scraped chunks are already capped well under 180 words, but avoids
  // the two embedding implementations silently diverging.
  const words = text.split(" ");
  const truncated = words.length > 180 ? words.slice(-180).join(" ") : text;

  const output = await model(truncated, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}