import mongoose from "mongoose";

const ChunkSchema = new mongoose.Schema(
  {
    websiteId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    title: { type: String, default: "" },
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Chunk", ChunkSchema);