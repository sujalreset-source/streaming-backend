import { randomUUID } from "crypto";
import { Queue } from "bullmq";
import { connection } from "../queues/bullmq.connection.js";

const analyticsQueue = new Queue("analytics:events", {
  connection,
  defaultJobOptions: { removeOnComplete: true }
});

function wrapEvent(eventName, payload, meta = {}) {
  return {
    eventName,
    eventId: randomUUID(),
    producer: "backend.monetization.worker",
    timestamp: Date.now(),
    schemaVersion: 1,
    payload,
    meta: {
      traceId: randomUUID().slice(0, 12),
      origin: meta.origin || "worker",
      env: process.env.NODE_ENV || "development",
      ...meta
    }
  };
}

async function publish(eventName, payload, meta = {}) {
  const event = wrapEvent(eventName, payload, meta);

  console.log("[EventProducer] EVENT", JSON.stringify(event));

  await analyticsQueue.add(eventName, event);

  return event.eventId;
}

export default { publish };
