import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { Subscription } from "../models/Subscription.js";

export const finalizeTransaction = async (transactionId, paymentId, gateway) => {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction || transaction.status === "paid") return null;

  transaction.status = "paid";
  await transaction.save();

  const user = await User.findById(transaction.userId);
  if (!user) return null;

  user.purchaseHistory.push({
    itemType: transaction.itemType,
    itemId: transaction.itemId,
    price: transaction.amount,
    paymentId,
  });

  if (transaction.itemType === "song") {
    user.purchasedSongs.push(transaction.itemId);
  } else if (transaction.itemType === "album") {
    user.purchasedAlbums.push(transaction.itemId);
  } else if (transaction.itemType === "artist-subscription") {
    const existing = await Subscription.findOne({
      userId: transaction.userId,
      artistId: transaction.artistId,
      status: "active",
      validUntil: { $gte: new Date() },
    });

    if (!existing) {
      await Subscription.create({
        userId: transaction.userId,
        artistId: transaction.artistId,
        status: "active",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  }

  await user.save();
  return transaction;
};
