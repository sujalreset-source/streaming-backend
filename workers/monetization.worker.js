import mongoose from "mongoose";
import { Worker, QueueEvents } from "bullmq";
import { connection } from "../queues/bullmq.connection.js";
import { MONETIZATION_QUEUE } from "../queues/monetization.queue.js";

import MonetizationAudit from "../audits/MonetizationAudit.model.js";
import Artist from "../modules/artist/models/artist.model.js";

import * as stripeAdapter from "../integrations/payments/stripe.adapter.js";
import { convertPlansForGateways } from "../services/currency.service.js";
import * as idempotencyUtil from "../services/idempotency.util.js";
import EventProducer from "../services/event.producer.js";

const CONCURRENCY = 2;

/**
 * Worker processes monetization.createPlans jobs.
 * Each job is idempotent because:
 * - MonetizationAudit stores operationId + idempotencyKey
 * - Gateway calls use per-plan idempotency keys
 * - BullMQ jobId = operationId avoids duplicate enqueue
 */
const monetizationWorker = new Worker(
  MONETIZATION_QUEUE,
  async job => {
    const { operationId, auditId, artistId, userId, baseCurrency, plans, clientIdempotencyKey } = job.data;

    // --- Load audit ---
    const audit = await MonetizationAudit.findById(auditId);
    if (!audit) {
      throw new Error(`Audit not found for auditId ${auditId}`);
    }

    // --- Compute converted prices (multi-gateway FX logic) ---
    const converted = await convertPlansForGateways({ baseCurrency, plans });

    /**
     * Example shape:
     * converted = {
     *   stripePlans: [ { cycle, amount, currency } ],
     *   razorpayPlans: [...],
     *   paypalPlans: [...]
     * }
     */

    const createdPlans = []; // final plans to store in Artist.subscriptionPlans

    try {
      // --- STRIPE (PHASE 1 MVP) ---
      for (const plan of converted.stripePlans) {
        const perPlanKey = idempotencyUtil.makeKey({
          operationId,
          gateway: "stripe",
          artistId,
          cycle: plan.cycle,
          amount: plan.amount
        });

        const res = await stripeAdapter.createPriceAndProduct({
          artistId,
          cycle: plan.cycle,
          amount: plan.amount,
          currency: plan.currency,
          metadata: { operationId, auditId },
          idempotencyKey: perPlanKey
        });

        createdPlans.push({
          cycle: plan.cycle,
          baseCurrency,
          baseAmount: plans.find(p => p.cycle === plan.cycle).amount,
          convertedPrices: [
            {
              gateway: "stripe",
              currency: plan.currency,
              amount: plan.amount,
              priceId: res.priceId,
              productId: res.productId,
              status: "active"
            }
          ],
          raw: res.raw,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // audit attempt
        await MonetizationAudit.findByIdAndUpdate(auditId, {
          $push: {
            attempts: {
              gateway: "stripe",
              status: "success",
              rawResponse: res.raw,
              ts: new Date()
            }
          }
        });
      }

      // --- DB Transaction: Save plans + update artist ---
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const now = new Date();

        await Artist.findByIdAndUpdate(
          artistId,
          {
            $set: {
              monetizationStatus: "active",
              isMonetizationComplete: true,
              monetizationLastSyncAt: now
            },
            $push: { subscriptionPlans: { $each: createdPlans } }
          },
          { new: true, session }
        );

        await MonetizationAudit.findByIdAndUpdate(
          auditId,
          {
            $set: {
              status: "success",
              responses: { createdPlans }
            }
          },
          { session }
        );

        await session.commitTransaction();
        session.endSession();

        // Emit event (to Kafka later)
        EventProducer.publish("artist.monetization.activated", {
          artistId,
          operationId,
          baseCurrency
        });

        return Promise.resolve();
      } catch (dbErr) {
        await session.abortTransaction();
        session.endSession();

        await MonetizationAudit.findByIdAndUpdate(auditId, {
          $set: {
            status: "failed",
            error: {
              message: "DB transaction failed",
              cause: dbErr.message
            }
          }
        });

        throw dbErr;
      }
    } catch (err) {
      // record gateway failure and let BullMQ retry
      await MonetizationAudit.findByIdAndUpdate(auditId, {
        $push: {
          attempts: {
            gateway: "stripe",
            status: "failed",
            error: err.message,
            ts: new Date()
          }
        },
        $set: { status: "in_progress" }
      });

      throw err; // BullMQ will retry automatically
    }
  },
  {
    connection,
    concurrency: CONCURRENCY
  }
);

// Queue-level events (failures)
const queueEvents = new QueueEvents(MONETIZATION_QUEUE, { connection });

queueEvents.on("failed", async ({ jobId, failedReason }) => {
  console.error(`[MonetizationWorker] Job failed`, { jobId, failedReason });

  // Optionally mark in audit:
  await MonetizationAudit.findOneAndUpdate(
    { operationId: jobId },
    { $set: { dlq: true } }
  );
});

export default monetizationWorker;
