import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  itemType: { type: String, enum: ["song", "album", "artist-subscription"], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
  gateway: { type: String, enum: ["stripe", "razorpay", "paypal"], required: true },
  amount: Number,
  currency: String,
  status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  paymentIntentId: String,         // Stripe
  razorpayOrderId: String,         // Razorpay
  stripeSubscriptionId: String,    // For Stripe recurring subs
  paypalOrderId: String,
  invoiceNumber: String,      // ✅ Store generated invoice number
  metadata: { type: Object, default: {} }, // ✅ Flexible key-value storage
}, { timestamps: true }); // ✅ adds createdAt & updatedAt
export const Transaction =  mongoose.model("Transaction", transactionSchema);
