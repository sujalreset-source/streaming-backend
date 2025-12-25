// models/WebhookEventLog.js
import mongoose from "mongoose";

const webhookEventLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
    rawData: { type: mongoose.Schema.Types.Mixed }, // full payload if needed for debugging
    status: { type: String, enum: ['processed', 'skipped', 'errored'], default: 'processed' },
    durationMs: Number // how long webhook took to process
  },
  
  { versionKey: false }
);

export const WebhookEventLog =
  mongoose.models.WebhookEventLog ||
  mongoose.model("WebhookEventLog", webhookEventLogSchema);
