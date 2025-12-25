import { StatusCodes } from "http-status-codes";
import { Transaction } from "../models/Transaction.js";
import { Song } from "../models/Song.js";
import { Album } from "../models/Album.js";
import { Subscription } from "../models/Subscription.js";
import { Artist } from "../models/Artist.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";

import { EXCHANGE_RATES } from "../utils/priceInUSD.js";


// ✅ 1. Get all transactions for a specific artist (with optional filters)
export const getAllTransactionsByArtist = async (req, res) => {
  const { artistId } = req.query;
  const { itemType, status, startDate, endDate } = req.query;

  if (!artistId) throw new BadRequestError("artistId is required");

  const query = { artistId };

  if (itemType) query.itemType = itemType;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const transactions = await Transaction.find(query).sort({ createdAt: -1 }).lean();;
    // Add USD amount
  const enriched = transactions.map((txn) => {
    const rate = EXCHANGE_RATES[txn.currency] ?? 1; // default 1 if USD or missing
    const amountInUSD = txn.amount ? Number((txn.amount * rate).toFixed(2)) : 0;

    return {
      ...txn,
      amountInUSD,
    };
  });
  

  res
    .status(StatusCodes.OK)
    .json({ success: true, count: enriched.length, transactions: enriched });
};

// ✅ 2. Get all purchased songs for an artist
export const getPurchasedSongsByArtist = async (req, res) => {
  const { artistId } = req.params;
  if (!artistId) throw new BadRequestError("artistId is required");

  const transactions = await Transaction.find({
    artistId,
    itemType: "song",
    status: "paid",
  }).populate("itemId");

  const purchasedSongs = transactions.map((tx) => tx.itemId);
  res.status(StatusCodes.OK).json({ success: true, count: purchasedSongs.length, songs: purchasedSongs });
};

// ✅ 3. Get all purchased albums for an artist
export const getPurchasedAlbumsByArtist = async (req, res) => {
  const { artistId } = req.params;
  if (!artistId) throw new BadRequestError("artistId is required");

  const transactions = await Transaction.find({
    artistId,
    itemType: "album",
    status: "paid",
  }).populate("itemId");

  const purchasedAlbums = transactions.map((tx) => tx.itemId);
  res.status(StatusCodes.OK).json({ success: true, count: purchasedAlbums.length, albums: purchasedAlbums });
};

// ✅ 4. Get active subscriber count and optional revenue for an artist
export const getSubscriberCount = async (req, res) => {
  const { artistId } = req.params;
  if (!artistId) throw new BadRequestError("artistId is required");

  const activeSubs = await Subscription.find({
    artistId,
    status: "active",
    validUntil: { $gt: new Date() },
  });

  const revenue = await Transaction.aggregate([
    {
      $match: {
        artistId,
        itemType: "artist-subscription",
        status: "paid",
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
      },
    },
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    activeSubscribers: activeSubs.length,
    totalRevenue: revenue[0]?.totalRevenue || 0,
  });
};


export const getArtistRevenueSummary = async (req, res) => {
  const { artistId } = req.params;

  // 1. Get all paid transactions for this artist
  const transactions = await Transaction.find({
    artistId,
    status: "paid",
  });
  

  let songRevenue = 0;
  let albumRevenue = 0;
  let subscriptionRevenue = 0;

  for (const txn of transactions) {
    if (txn.itemType === "song") {
      songRevenue += txn.amount ? EXCHANGE_RATES[txn.currency] * txn.amount : 0;
    } else if (txn.itemType === "album") {
      albumRevenue += txn.amount ?  EXCHANGE_RATES[txn.currency] * txn.amount : 0;
    } else if (txn.itemType === "artist-subscription") {
      subscriptionRevenue += txn.amount?  EXCHANGE_RATES[txn.currency] * txn.amount : 0;
    }
  }

  const totalRevenue = songRevenue + albumRevenue + subscriptionRevenue;
  
 


  return res.status(StatusCodes.OK).json({
    success: true,
    artistId,
    revenue: {
      songRevenue,
      albumRevenue,
      subscriptionRevenue,
      totalRevenue,
    },
  });
};


