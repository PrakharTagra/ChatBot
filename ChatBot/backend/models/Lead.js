import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    websiteId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", LeadSchema);