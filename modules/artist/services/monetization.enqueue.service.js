import { randomUUID } from "crypto";
import MonetizationAudit from "../../../audits/MonetizationAudit.model.js";
import { monetizationQueue } from "../../../queues/monetization.queue.js";
import Artist from "../../artist/models/artist.model.js";

/**
 * Enqueue monetization setup job
 *
 * Phase 1 responsibility:
 *  - Validate artist access (MVP assumes controller does basic auth)
 *  - Create MonetizationAudit (status: started)
 *  - Set artist.monetizationStatus = "setting_up"
 *  - Enqueue job with operationId + idempotencyKey
 */
export async function enqueueMonetizationSetup({
  artistId,
  userId,
  baseCurrency,
  plans,
  clientIdempotencyKey
}) {
  // --- Idempotency Logic (client-provided or auto-generated) ---
  // If client sends idempotencyKey: reuse it.
  // Otherwise, generate a strong one. This prevents duplicates when user retries.
  const operationId = randomUUID();
  const idempotencyKey =
    clientIdempotencyKey ||
    `mon:${artistId}:${operationId}:${Date.now()}`;

  // --- Step 1: Create MonetizationAudit record ---
  const audit = await MonetizationAudit.create({
    operationId,
    idempotencyKey,
    artistId,
    userId,
    action: "create_plans",
    gateways: ["stripe", "razorpay", "paypal"], // future-proof
    payload: { baseCurrency, plans },
    status: "started"
  });

  // --- Step 2: Update artist to setting_up ---
  await Artist.findByIdAndUpdate(artistId, {
    $set: {
      monetizationStatus: "setting_up",
      monetizationSetupAt: new Date()
    }
  });

  // --- Step 3: Enqueue job into BullMQ ---
  await monetizationQueue.add(
    operationId,
    {
      operationId,
      auditId: audit._id,
      artistId,
      userId,
      baseCurrency,
      plans,
      clientIdempotencyKey: idempotencyKey
    },
    {
      jobId: operationId // ensures idempotency at BullMQ level too
    }
  );

  // --- Step 4: Return for API response ---
  return {
    operationId,
    auditId: audit._id
  };
}
