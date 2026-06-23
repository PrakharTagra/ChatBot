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
  
  const truncated = text.split(" ").slice(0, 180).join(" ");
  
  const output = await model(truncated, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}