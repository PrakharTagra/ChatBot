import { CloudClient } from "chromadb";

let client = null;

function getClient() {
  if (!client) {
    client = new CloudClient();
  }
  return client;
}

function collectionName(websiteId) {
  return `site-${websiteId}`
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .slice(0, 63);
}

export async function getOrCreateCollection(websiteId, extraMetadata = {}) {
  return getClient().getOrCreateCollection({
    name: collectionName(websiteId),
    embeddingFunction: null,
    metadata: {
      websiteId,
      "hnsw:space": "cosine",
      ...extraMetadata,
    },
  });
}

export async function deleteCollection(websiteId) {
  try {
    await getClient().deleteCollection({ name: collectionName(websiteId) });
  } catch {
    // collection didn't exist yet — fine
  }
}

export async function listSites() {
  const collections = await getClient().listCollections();

  const sites = await Promise.all(
    collections.map(async (col) => {
      const websiteId = col.metadata?.websiteId || col.name;
      const collection = await getClient().getCollection({
        name: col.name,
        embeddingFunction: null,
      });
      const count = await collection.count();

      const peek = await collection.peek({ limit: 1 });
      const url = peek.metadatas?.[0]?.url || "";
      const lastScraped = peek.metadatas?.[0]?.lastScraped || null;

      return {
        websiteId,
        url,
        chunks: count,
        lastScraped,
        hasLeadCapture: !!collection.metadata?.mongoUri,
      };
    })
  );

  return sites;
}

export async function queryChroma(websiteId, queryEmbedding, topK = 3) {
  const col = await getOrCreateCollection(websiteId);
  const count = await col.count();
  if (count === 0) return [];

  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults: Math.min(topK, count),
    include: ["documents", "metadatas", "distances"],
  });

  return results.ids[0].map((id, i) => ({
    id,
    content: results.documents[0][i],
    url: results.metadatas[0][i].url,
    title: results.metadatas[0][i].title,
    score: 1 - results.distances[0][i],
  }));
}

/**
 * mongoUri needs to survive across two different processes/machines
 * (scraping runs locally, leads/chat run on Render), so it can't live
 * in an in-memory Map anymore. We piggyback it onto the Chroma
 * collection's own metadata, since Chroma Cloud is the one piece of
 * shared state both sides already talk to.
 */
export async function setSiteMongoUri(websiteId, mongoUri) {
  const collection = await getOrCreateCollection(websiteId);
  const existing = collection.metadata || {};
  await collection.modify({
    metadata: { ...existing, mongoUri },
  });
}

export async function getSiteMongoUri(websiteId) {
  try {
    const collection = await getClient().getCollection({
      name: collectionName(websiteId),
      embeddingFunction: null,
    });
    return collection.metadata?.mongoUri || null;
  } catch {
    return null;
  }
}
