import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";

const updateUserAfterPurchase = async (transaction, subscriptionId) => {
  if (subscriptionId) {
    await Subscription.findOneAndUpdate(
      { externalSubscriptionId: subscriptionId },
      { status: "active", userId: transaction.userId },
      { upsert: true }
    );
  } else {
    await User.findByIdAndUpdate(transaction.userId, {
      $push: { purchaseHistory: transaction._id },
    });
  }
};

const cancelSubscription = async (externalSubscriptionId) => {
  await Subscription.findOneAndUpdate(
    { externalSubscriptionId },
    { status: "cancelled" }
  );
};

export const subscriptionRepository = { updateUserAfterPurchase, cancelSubscription };
