import express from "express";
import { authenticateUser } from "../middleware/authenticate.js";
import {
  createStripePayment,
  createRazorpayOrder,
  createPaypalOrder,
  capturePaypalOrder
} from "../controllers/paymentController.js";

const router = express.Router();

// Create Stripe PaymentIntent
router.post("/stripe/create-payment", authenticateUser, createStripePayment);

// Create Razorpay Order
router.post("/razorpay/create-order", authenticateUser, createRazorpayOrder);

router.post("/paypal/create-order", authenticateUser, createPaypalOrder);

router.post("/paypal/capture-order", capturePaypalOrder);

export default router;
