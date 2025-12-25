import { Artist } from "../models/Artist.js";
import { shapeArtistResponse } from "../dto/artist.dto.js";
import { createSubscriptionPlans, updateSubscriptionPlans} from "./planService.js";
import mongoose from "mongoose";
import {Song} from "../models/Song.js";
import { Album } from "../models/Album.js";
import { convertCurrencies } from "../utils/convertCurrencies.js";

export const createArtistService = async ({ name, bio, location, imageUrl, basePrice, cycle, createdBy }) => {
  // Initialize artist object but do not save yet
  const artist = new Artist({ name, bio, location, image: imageUrl, subscriptionPlans: [], createdBy });
  // const basePrice = { currency: "USD", amount: 10 }; // default base price
  const subscriptionPrice = basePrice.amount || 0;
  // If subscription exists, create plans
  if (subscriptionPrice && subscriptionPrice > 0) {
    const intervals = cycle; // cycleToInterval already called in controller
      const convertedPrices = await convertCurrencies(basePrice.currency, basePrice.amount);
    console.log("Converted Prices:", convertedPrices);
    const plans = await createSubscriptionPlans(name, basePrice, cycle, convertedPrices);

    artist.subscriptionPlans.push({
      cycle: intervals.cycleLabel,
      basePrice,
      stripePriceId: plans.stripePriceId,
      razorpayPlanId: plans.razorpayPlanId,
      paypalPlans: plans.paypalPlans,
      convertedPrices
    });
  }

  // Save artist once
  await artist.save();

  return shapeArtistResponse(artist.toObject());
};

export const updateArtistService = async ({
  artistId,
  name,
  bio,
  location,
  subscriptionPrice,
  intervals,
  imageFile,
  updatedBy,
  cycle
}) => {
  const artist = await Artist.findById(artistId);
  if (!artist) throw new Error("Artist not found");

  // Update fields if provided
  if (name) artist.name = name;
  if (bio) artist.bio = bio;
  if (location) artist.location = location;
  if (subscriptionPrice !== undefined) artist.subscriptionPrice = subscriptionPrice;

  // Upload image if provided
  if (imageFile) {
    artist.image = await uploadToS3(imageFile, process.env.S3_ARTIST_FOLDER || "artists");
  }

  // Update subscription plans if subscriptionPrice or cycle changed
  if ((subscriptionPrice !== undefined || intervals) && artist.subscriptionPlans.length > 0) {
  const newCycleLabel = intervals?.cycleLabel || artist.subscriptionPlans[0].cycle;
  await updateSubscriptionPlans(artist, subscriptionPrice, intervals, newCycleLabel);
}

  // Optional: store audit info (updatedBy)
  artist.updatedBy = updatedBy;
  artist.updatedAt = new Date();

  await artist.save();
  return shapeArtistResponse(artist.toObject());
};

export const fetchArtistsWithCounts = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  const artists = await Artist.aggregate([
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "songs",
        localField: "_id",
        foreignField: "artist",
        as: "songs",
      },
    },
    {
      $lookup: {
        from: "albums",
        localField: "_id",
        foreignField: "artist",
        as: "albums",
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        image: 1,
        location: 1,
        bio: 1,
        subscriptionPlans: 1,
        createdAt: 1,
        updatedAt: 1,
        songCount: { $size: "$songs" },
        albumCount: { $size: "$albums" },
      },
    },
  ]);


  const total = await Artist.countDocuments();

  return { artists, total };
};

/**
 * Fetch artist by _id or slug with song/album counts
 */
export const fetchArtistById = async (identifier) => {
  const query = mongoose.Types.ObjectId.isValid(identifier)
    ? { _id: identifier }
    : { slug: identifier };

  // Fetch artist with only necessary fields
  const artist = await Artist.findOne(query)
    .select("name slug image location bio subscriptionPlans createdAt updatedAt")
    .lean();

  if (!artist) {
    throw new NotFoundError("Artist not found");
  }

  // Fetch counts in parallel
  const [songCount, albumCount] = await Promise.all([
    Song.countDocuments({ artist: artist._id }),
    Album.countDocuments({ artist: artist._id }),
  ]);

  return { ...artist, songCount, albumCount };
};
