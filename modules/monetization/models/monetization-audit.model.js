// src/modules/monetization/models/monetization-audit.model.js
import mongoose from "mongoose";

const monetizationAuditSchema = new mongoose.Schema({
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  operation: { type: String, required: true }, // setup_pricing, update_pricing, reconcile, delete_remote_plan
  gateway: { type: String, enum: ["stripe", "razorpay", "paypal", "none"], default: "none" },
  idempotencyKey: { type: String, default: null, index: true },
  payload: { type: Object, default: {} },
  response: { type: Object, default: {} },
  status: { type: String, enum: ["started", "success", "failed"], default: "started", index: true },
  errorMessage: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

monetizationAuditSchema.index({ artistId: 1, operation: 1, createdAt: -1 });

export const MonetizationAudit = mongoose.models.MonetizationAudit || mongoose.model("MonetizationAudit", monetizationAuditSchema);
export default MonetizationAudit;
