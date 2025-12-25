import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

export const hasPaidAccess = async (userId, itemType, itemId) => {
  if (!userId) return false;

  const paid = await Transaction.exists({
    userId,
    itemType,
    itemId,
    status: "paid",
  });

  return !!paid;
};
export const hasAccessToSong = async (user, song) => {
  if (song.accessType === "free") return true;

  if (!user) return false;

  if (user.role === "admin") return true;

  // Check purchase for song
  if (song.accessType === "purchase-only") {
    const purchased = await hasPaidAccess(user._id, "song", song._id);
    if (purchased) return true;

    // Also check if the album is purchased
    if (song.album) {
      const albumPurchased = await hasPaidAccess(user._id, "album", song.album);
      if (albumPurchased) return true;
    }
  }

  // Check subscription for artist
  if (song.accessType === "subscription") {
    const dbUser = await User.findById(user._id).lean();
    return dbUser?.artistSubscriptions?.includes(song.artist.toString());
  }

  return false;
};
