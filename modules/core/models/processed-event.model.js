// src/modules/core/models/processed-event.model.js
import mongoose from "mongoose";

const processedEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  source: { type: String, default: null }, // "stripe", "razorpay", "monetization.worker"...
  processedAt: { type: Date, default: Date.now },
  meta: { type: Object, default: {} },
}, { timestamps: true, versionKey: false });

export const ProcessedEvent = mongoose.models.ProcessedEvent || mongoose.model("ProcessedEvent", processedEventSchema);
export default ProcessedEvent;
