// import express from "express";
// import { stripeWebhook, razorpayWebhook } from "../controllers/webhookController";

// const router = express.Router();

// // ⚠️ Stripe requires raw body for signature verification
// router.post("/stripe", express.raw({ type: "application/json" }), stripeWebhook);


// export default router;

// import { razorpayWebhook } from "../controllers/webhookController.j";

// app.post(
//   "/api/webhooks/razorpay",
//   express.raw({ type: "application/json" }),
//   razorpayWebhook
// );