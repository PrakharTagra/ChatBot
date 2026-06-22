import { ChromaClient } from "chromadb";

let client = null;

function getClient() {
  if (!client) {
    client = new ChromaClient({
      path: process.env.CHROMA_API_URL,
      auth: {
        provider: "token",
        credentials: process.env.CHROMA_API_KEY,
      },
      tenant: process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE,
    });
  }
  return client;
}

// Chroma collection names: alphanumeric + hyphens, 3–63 chars
function collectionName(websiteId) {
  return `site-${websiteId}`
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .slice(0, 63);
}

export async function getOrCreateCollection(websiteId) {
  return getClient().getOrCreateCollection({
    name: collectionName(websiteId),
    // Store the original websiteId in collection metadata
    // so we can recover it when listing all collections
    metadata: { websiteId },
  });
}

export async function deleteCollection(websiteId) {
  try {
    await getClient().deleteCollection({ name: collectionName(websiteId) });
  } catch {
    // didn't exist — fine
  }
}

// Returns array of { websiteId, url, chunks, lastScraped }
// We read these from the metadata of the first item in each collection
export async function listSites() {
  const collections = await getClient().listCollections();

  const sites = await Promise.all(
    collections.map(async (col) => {
      const websiteId = col.metadata?.websiteId || col.name;
      const collection = await getClient().getCollection({ name: col.name });
      const count = await collection.count();

      // Peek at one item to get url + lastScraped from its metadata
      const peek = await collection.peek({ limit: 1 });
      const url = peek.metadatas?.[0]?.url || "";
      const lastScraped = peek.metadatas?.[0]?.lastScraped || null;

      return { websiteId, url, chunks: count, lastScraped };
    })
  );

  return sites;
}

// Vector search — returns top-K chunks with similarity scores
export async function queryChroma(websiteId, queryEmbedding, topK = 3) {
  const col = await getOrCreateCollection(websiteId);
  const count = await col.count();
  if (count === 0) return [];

  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults: Math.min(topK, count),
    include: ["documents", "metadatas", "distances"],
  });

  // Chroma gives cosine DISTANCE (0 = identical, 2 = opposite)
  // Convert to SIMILARITY (1 = identical) to match your old code's logic
  return results.ids[0].map((id, i) => ({
    id,
    content:  results.documents[0][i],
    url:      results.metadatas[0][i].url,
    title:    results.metadatas[0][i].title,
    score:    1 - results.distances[0][i],
  }));
}