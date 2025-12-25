import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true,
      index: true,
    },

    // 🔑 Which subscription cycle was chosen
    cycle: {
      type: String,
      enum: ["1m", "3m", "6m", "12m"],
      required: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    isRecurring: {
      type: Boolean,
      default: true, // set to false if user cancels auto-renew
    },
    gateway: {
      type: String,
      enum: ["stripe", "razorpay", "paypal"],
      required: true,
    },
    externalSubscriptionId: {
      type: String, // Stripe subscription ID or Razorpay subscription 
      required: true,
      index: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ✅ Ensure one active subscription per artist per user
subscriptionSchema.index({ userId: 1, artistId: 1 }, { unique: true });

export const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);
