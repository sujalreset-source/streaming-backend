import { Worker } from "bullmq";
import { connection } from "../../libs/queue/bullmq-connection.js";
import { sendApplicationApprovedEmail } from "../../utils/emails/application-approved.js";
import { sendApplicationRejectedEmail } from "../../utils/emails/application-rejected.js";
import { sendApplicationNeedsInfoEmail } from "../../utils/emails/application-needs-info.js";

export const notificationWorker = new Worker(
  "notificationQueue",
  async (job) => {
    const { type, userId, applicationId, notes } = job.data;

    switch (type) {
      case "application_approved":
        await sendApplicationApprovedEmail({ userId, applicationId });
        break;

      case "application_rejected":
        await sendApplicationRejectedEmail({ userId, applicationId, notes });
        break;

      case "application_needs_info":
        await sendApplicationNeedsInfoEmail({ userId, applicationId, notes });
        break;

      default:
        console.warn("Unknown notification type:", type);
        break;
    }

    return { delivered: true };
  },
  {
    connection,
  }
);

// Logging events (production useful)
notificationWorker.on("completed", (job) => {
  console.log(`Notification Job Completed: ${job.id}`);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`Notification Job Failed: ${job?.id}`, err);
});
