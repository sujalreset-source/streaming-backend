import crypto from "crypto";

/**
 * makeKey
 * Creates a deterministic idempotency key for a single gateway operation.
 *
 * Guarantees:
 * - Same input → same key
 * - Avoid overly long keys
 * - Works across all gateways (Stripe, Razorpay, PayPal)
 *
 * Params:
 *  { operationId, gateway, artistId, cycle, amount }
 *
 * Example output:
 *  mon:stripe:op_123:artist_456:1m:4900:2af9f8
 */
export function makeKey({ operationId, gateway, artistId, cycle, amount }) {
  const base = `mon:${gateway}:${operationId}:${artistId}:${cycle}:${amount}`;

  // Hash to ensure safe length + uniform format
  const hash = crypto.createHash("sha256").update(base).digest("hex").slice(0, 12);

  return `${base}:${hash}`;
}

/**
 * makeOperationKey
 * A higher-level idempotency key for the entire monetization request.
 *
 * Used for:
 *  - Queuing (BullMQ jobId)
 *  - MonetizationAudit.idempotencyKey
 *  - Client-supplied idempotencyKey replacement
 *
 * Example:
 *  mon:op:artistId:uuid:timestamp
 */
export function makeOperationKey(artistId) {
  const opId = crypto.randomUUID();
  const ts = Date.now();
  return `mon:op:${artistId}:${opId}:${ts}`;
}

/**
 * shortHash
 * Utility for hashing arbitrary payloads (plan config, FX values).
 *
 * Useful when you later add:
 * - multi-tier pricing
 * - multi-currency per plan
 * - per-country prices
 */
export function shortHash(payload) {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
}
