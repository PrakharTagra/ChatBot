import axios from "axios";

export async function getEmbedding(text, retries = 3) {
  const truncated = text.split(" ").slice(0, 180).join(" ");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(
        "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
        { inputs: truncated },
        {
          headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
          timeout: 30000,
        }
      );
      return res.data[0];
    } catch (err) {
      // HF returns 503 while model is loading — wait and retry
      if (attempt < retries && err.response?.status === 503) {
        console.log(`HF model loading, retrying in 10s... (${attempt}/${retries})`);
        await new Promise(r => setTimeout(r, 10000));
      } else {
        throw err;
      }
    }
  }
}