import mongoose from "mongoose";

const AttemptSchema = new mongoose.Schema({
  gateway: { type: String, required: true }, // 'stripe' | 'razorpay' | 'paypal'
  attemptNumber: { type: Number, required: true, default: 1 },
  status: { type: String, enum: ["started","success","failed"], required: true },
  rawResponse: { type: Object, default: {} },
  error: { type: Object, default: null },
  ts: { type: Date, default: Date.now }
}, { _id: false });

const MonetizationAuditSchema = new mongoose.Schema({
  operationId: { type: String, required: true, index: true }, // uuid per client request
  idempotencyKey: { type: String, required: true, index: true }, // client-provided or generated
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, // e.g. "create_plans"
  gateways: { type: [String], default: [] }, // ['stripe','razorpay','paypal']
  payload: { type: Object, default: {} }, // original request (plans, baseCurrency, meta)
  responses: { type: Object, default: {} }, // keyed by gateway: { stripe: {...}, razorpay: {...} }
  attempts: { type: [AttemptSchema], default: [] }, // chronological attempts per gateway
  status: { type: String, enum: ["started","in_progress","success","failed"], default: "started", index: true },
  error: { type: Object, default: null }, // aggregated error info if any
  dlq: { type: Boolean, default: false }, // moved to DLQ after retries exhausted
  meta: { type: Object, default: {} }, // free-form metadata (e.g., rates used, workerId)
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, {
  versionKey: false,
  optimisticConcurrency: true
});

// keep updatedAt fresh
MonetizationAuditSchema.pre("save", function () {
  this.updatedAt = new Date();
});

/**
 * Convenience static: find existing successful audit by idempotencyKey
 * Useful to implement idempotency: if client re-sends same idempotencyKey, return existing audit result.
 */
MonetizationAuditSchema.statics.findByIdempotencyKey = function (key) {
  return this.findOne({ idempotencyKey: key }).lean();
};

MonetizationAuditSchema.index({ artistId: 1, status: 1 });
MonetizationAuditSchema.index({ "attempts.gateway": 1 });
MonetizationAuditSchema.index({ idempotencyKey: 1, status: 1 });

export default mongoose.models.MonetizationAudit || mongoose.model("MonetizationAudit", MonetizationAuditSchema);
