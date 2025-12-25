// controllers/userDashboardController.js

import { Song } from "../models/Song.js";
import { Album } from "../models/Album.js";
import { User } from "../models/User.js";
import { StatusCodes } from "http-status-codes";
import { NotFoundError } from "../errors/index.js";
import { Subscription } from "../models/Subscription.js";
import { Artist } from "../models/Artist.js";

/**
 * @desc Fetch user purchases: songs, albums, and purchase history
 * @route GET /api/dashboard/purchases
 * @access Private
 */
export const getUserPurchases = async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Unauthorized: Missing user ID",
    });
  }

  const user = await User.findById(userId)
    .populate({
      path: "purchasedSongs",
      select: "title audioUrl coverUrl artist duration",
      populate: {
        path: "artist",
        select: "name",
      },
    })
    .populate({
      path: "purchasedAlbums",
      select: "title coverUrl artist slug",
      populate: {
        path: "artist",
        select: "name",
      },
    })
    .lean();

  if (!user) {
    throw new NotFoundError("User not found");
  }

  let updatedHistory = user.purchaseHistory || [];

  // ✅ Extract artist IDs from history
  const artistSubs = updatedHistory.filter(
    (h) => h.itemType === 'artist-subscription'
  );

  const artistIds = artistSubs.map((h) => h.itemId);

  // ✅ Fetch artist names
  const artists = await Artist.find({ _id: { $in: artistIds } })
    .select('name')
    .lean();

  const artistMap = {};
  for (const a of artists) {
    artistMap[a._id.toString()] = a.name;
  }

  // ✅ Inject artist name into matching history entries
  updatedHistory = updatedHistory.map((entry) => {
    if (entry.itemType === 'artist-subscription') {
      return {
        ...entry,
        artistName: artistMap[entry.itemId] || 'Unknown Artist',
      };
    }
    return entry;
  });

  return res.status(StatusCodes.OK).json({
    success: true,
    songs: user.purchasedSongs || [],
    albums: user.purchasedAlbums || [],
    history: updatedHistory,
  });
};





// ✅ GET /api/users/subscriptions
export const getUserSubscriptions = async (req, res) => {
  const userId = req.user._id;

  // 1. Fetch active subscriptions
  const subscriptions = await Subscription.find({
    userId,
    status: "active",
    validUntil: { $gt: new Date() },
  }).lean();

  if (subscriptions.length === 0) {
    return res.status(StatusCodes.OK).json({
      success: true,
      subscriptions: [],
    });
  }

  // 2. Fetch artist info for each subscription
  const artistIds = subscriptions.map((sub) => sub.artistId);
  const artists = await Artist.find({ _id: { $in: artistIds } })
    .select("name image genre slug")
    .lean();

  // 3. Merge artist info with subscription data
  const subscriptionsWithArtistInfo = subscriptions.map((sub) => {
    const artist = artists.find((a) => a._id.toString() === sub.artistId.toString());
    return {
      ...sub,
      artist,
    };
  });

  // 4. Respond
  return res.status(StatusCodes.OK).json({
    success: true,
    subscriptions: subscriptionsWithArtistInfo,
  });
};





// ✅ DELETE /api/users/subscriptions/:artistId
export const cancelArtistSubscription = async (req, res) => {
  const userId = req.user._id;
  const { artistId } = req.params;

  const subscription = await Subscription.findOne({
    userId,
    artistId,
    status: "active",
    validUntil: { $gt: new Date() },
  });

  if (!subscription) {
    throw new NotFoundError("No active subscription found for this artist.");
  }

  // Mark it as cancelled (soft cancel)
  subscription.status = "cancelled";
  subscription.validUntil = new Date(); // expire immediately
  await subscription.save();

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Subscription cancelled successfully.",
  });
};
