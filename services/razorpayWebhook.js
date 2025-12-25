
import { transactionRepository } from "../repositories/transaction.js";
import { subscriptionRepository } from "../repositories/subscription.js";
import { userRepository } from "../repositories/user.js";
import { sendInvoiceEmail } from "../utils/email.js";
import Razorpay from "razorpay";


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const handlePaymentCaptured = async (paymentEntity, eventData) => {
  const paymentId = paymentEntity.id;
  const razorpayOrderId = paymentEntity.order_id;
  let subscriptionId = null;

  if (paymentEntity.invoice_id) {
    const invoice = await razorpay.invoices.fetch(paymentEntity.invoice_id);
    subscriptionId = invoice.subscription_id;
  }

  // 🔁 Subscription flow
  if (subscriptionId) {
    const transaction = await transactionRepository.markTransactionPaid({
      gateway: "razorpay",
      paymentId,
      subscriptionId,
      razorpayOrderId,
    });

    if (transaction) {
      await subscriptionRepository.updateUserAfterPurchase(
        transaction,
        subscriptionId
      );

      console.log("✅ Subscription activated/renewed");

      if (paymentEntity.invoice_id) {
        const invoice = await razorpay.invoices.fetch(paymentEntity.invoice_id);
        const user = await userRepository.findById(transaction.userId);
        if (user?.email) {
          await sendInvoiceEmail(user.email, invoice);
          console.log("📧 Invoice email sent");
        }
      }
    }
    return { status: "subscription processed" };
  }

  // 💳 One-time payment flow
  const { itemType: type, itemId, userId } = paymentEntity.notes || {};
  if (!type || !itemId || !userId) {
    console.warn("⚠️ Missing metadata for one-time payment.");
    return { status: "ok" };
  }

  const transaction = await transactionRepository.markTransactionPaid({
    gateway: "razorpay",
    paymentId,
    userId,
    itemId,
    type,
    razorpayOrderId,
  });

  if (transaction) {
    await subscriptionRepository.updateUserAfterPurchase(transaction, paymentId);
    console.log("✅ One-time purchase completed:", type, itemId);
  }

  return { status: "purchase processed" };
};

const handleEvent = async (eventData) => {
  const event = eventData.event;
  console.log(`📥 Razorpay event received: ${event}`);

  switch (event) {
    case "payment.captured":
      return await handlePaymentCaptured(eventData.payload.payment.entity, eventData);

    case "subscription.charged":
      console.log("🔄 Subscription charged:", eventData.payload.subscription.entity.id);
      return { status: "ok" };

    case "subscription.halted":
    case "subscription.completed":
      await subscriptionRepository.cancelSubscription(
        eventData.payload.subscription.entity.id
      );
      console.log("❌ Subscription cancelled or completed.");
      return { status: "ok" };

    default:
      return { status: "ignored" };
  }
};

export const razorpayWebhookService = { handleEvent };
