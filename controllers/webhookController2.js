// controllers/webhookController.js
import crypto from "crypto";
import { razorpayQueue } from "../queue/razorpayQueue.js";

export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body; // express.raw()

    // 1️⃣ Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid Razorpay signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const eventData = JSON.parse(rawBody.toString());
    console.log(`📥 Razorpay event received: ${eventData.event}`);

    // 2️⃣ Queue the event for async processing
    await razorpayQueue.add("razorpay-event", { eventData });

    // 3️⃣ Respond immediately
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
