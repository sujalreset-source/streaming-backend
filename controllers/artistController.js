import { Artist } from "../models/Artist.js";
import { Song } from "../models/Song.js";
import { Album } from "../models/Album.js";
import { uploadToS3 } from "../utils/s3Uploader.js";
import mongoose from "mongoose";
import { NotFoundError, BadRequestError, UnauthorizedError } from '../errors/index.js';
import { isAdmin } from "../utils/authHelper.js";
import { StatusCodes } from 'http-status-codes';
// import { UnauthorizedError } from "../errors/unauthorized.js";
import { shapeArtistResponse } from "../dto/artist.dto.js";
import { log } from "console";
import { createArtistStripeSubscriptionPrice } from "../utils/stripe.js";
import { createRazorpayPlan } from "../utils/razorpay.js";
import { createPayPalProduct, createPayPalPlan } from "../utils/getPaypalAccessToken.js";

const cycleToInterval = (cycle) => {
  switch (cycle) {
    case "1m":
      return {
        stripe: { interval: "month", interval_count: 1 },
        razorpay: { period: "monthly", interval: 1 },
        paypal: { interval_unit: "MONTH", interval_count: 1 },
      };
    case "3m":
      return {
        stripe: { interval: "month", interval_count: 3 },
        razorpay: { period: "monthly", interval: 3 },
        paypal: { interval_unit: "MONTH", interval_count: 3 },
      };
    case "6m":
      return {
        stripe: { interval: "month", interval_count: 6 },
        razorpay: { period: "monthly", interval: 6 },
        paypal: { interval_unit: "MONTH", interval_count: 6 },
      };
    case "12m":
      return {
        stripe: { interval: "year", interval_count: 1 },
        razorpay: { period: "yearly", interval: 1 },
        paypal: { interval_unit: "YEAR", interval_count: 1 },
      };
    default:
      throw new BadRequestError("Invalid subscription cycle. Use 1m, 3m, 6m, or 12m.");
  }
};


// ===================================================================
// @desc    Create a new artist (Admin only)
// @route   POST /api/artists
// @access  Admin
// ===================================================================
export const createArtist = async (req, res) => {
  if (!isAdmin(req.user)) {
    throw new UnauthorizedError("Access denied. Admins only.");
  }

  const { name, bio, location, subscriptionPrice, cycle } = req.body;
  baseprice = { currency: "USD", amount: subscriptionPrice }; // default base price

  if (!name) throw new BadRequestError("Artist name is required.");
  if (!cycle) throw new BadRequestError("Subscription cycle is required (1m, 3m, 6m, 12m).");

  const { stripe, razorpay, paypal } = cycleToInterval(cycle);

  const imageFile = req.files?.coverImage?.[0];
  const imageUrl = imageFile?.location || "";

  const artist = await Artist.create({
    name,
    bio,
    location,
    image: imageUrl,
    createdBy: req.user._id,
  });

  if (subscriptionPrice && subscriptionPrice > 0) {
    // ✅ Stripe subscription price
    const stripePriceId = await createArtistStripeSubscriptionPrice(
      artist.name,
      subscriptionPrice,
      stripe.interval,
      stripe.interval_count
    );

    // ✅ Razorpay plan
    const razorpayPlanId = await createRazorpayPlan(
      artist.name,
      subscriptionPrice,
      razorpay.interval,
      razorpay.period
    );
    // ✅ Create PayPal product once per artist
const paypalProductId = await createPayPalProduct(artist.name);
    // ✅ PayPal multi-currency plans
    const supportedCurrencies = ["USD",  "EUR"];
    const paypalPlans = [];

   for (const currency of supportedCurrencies) {
  const paypalPlanId = await createPayPalPlan({
    productId: paypalProductId,                     // <-- FIXED
    price: subscriptionPrice,
    intervalUnit: paypal.interval_unit,             // <-- FIXED
    intervalCount: paypal.interval_count,           // <-- FIXED
    currency,
  });
  paypalPlans.push({ currency, paypalPlanId });
}
console.log("Created PayPal plans:", paypalPlans);
    artist.subscriptionPlans = [
      {
        cycle,
        price: subscriptionPrice,
        stripePriceId,
        razorpayPlanId,
        paypalPlans:paypalPlans, // ✅ array of { currency, paypalPlanId }
      },
    ];
    console.log("Created subscription plans:", artist.subscriptionPlans);

    await artist.save();
  }

  const shaped = await shapeArtistResponse(artist.toObject());
  res.status(StatusCodes.CREATED).json({ success: true, artist: shaped });
};
// ===================================================================
// @desc    Update an existing artist by ID (Admin only)
// @route   PATCH /api/artists/:id
// @access  Admin
// ===================================================================

export const updateArtist = async (req, res) => {
  if (!isAdmin(req.user)) {
    throw new UnauthorizedError("Access denied. Admins only.");
  }

  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError("Invalid artist ID.");
  }

  const artist = await Artist.findById(id);
  if (!artist) {
    throw new NotFoundError("Artist not found.");
  }

  const { name, bio, location, subscriptionPrice } = req.body;

  // Update only if fields are provided
  if (name) artist.name = name;
  if (bio) artist.bio = bio;
  if (location) artist.location = location;
  if (subscriptionPrice !== undefined) {
    artist.subscriptionPrice = subscriptionPrice;
  }

  // Optional image replacement
  const imageFile = req.files?.image?.[0];
  if (imageFile) {
    artist.image = await uploadToS3(imageFile, "artists");
  }

  await artist.save();

  const shaped = await shapeArtistResponse(artist.toObject());

  res.status(StatusCodes.OK).json({ success: true, artist: shaped });
};


// ===================================================================
// @desc    Delete an artist by ID (Admin only)
// @route   DELETE /api/artists/:id
// @access  Admin
// ===================================================================
export const deleteArtist = async (req, res) => {
  if (!isAdmin(req.user)) {
    throw new UnauthorizedError("Access denied. Admins only.");
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError("Invalid artist ID.");
  }

  // Hard delete (if you want cascade cleanup)
  const artist = await Artist.findByIdAndDelete(id);
  if (!artist) {
    throw new NotFoundError("Artist not found.");
  }

  // TODO: Optional cascade cleanup
  // await Song.deleteMany({ artist: id });
  // await Album.deleteMany({ artist: id });
  // await Subscription.deleteMany({ artist: id });
  // await Transaction.updateMany({ artist: id }, { status: "cancelled" });

  // TODO: Audit log (recommended for destructive ops)
  // await AuditLog.create({
  //   action: "delete_artist",
  //   actor: req.user._id,
  //   artistId: id,
  //   timestamp: new Date(),
  // });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Artist deleted successfully",
    artistId: id,
  });
};



// ===================================================================
// @desc    Get all artists with optional pagination
// @route   GET /api/artists
// @access  Public
// ===================================================================

export const getAllArtists = async (req, res) => {
  const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
  const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
  const skip = (page - 1) * limit;

  const [artists, total] = await Promise.all([
    Artist.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(), // ✅ use lean for performance
    Artist.countDocuments({}),
  ]);

  const enrichedArtists = await Promise.all(
    artists.map(async (artist) => {
      const [songCount, albumCount] = await Promise.all([
        Song.countDocuments({ artist: artist._id }),
        Album.countDocuments({ artist: artist._id }),
      ]);

      return shapeArtistResponse({
        ...artist,
        songCount,
        albumCount,
      });
    })
  );

  res.status(StatusCodes.OK).json({
    success: true,
    artists: enrichedArtists,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

// ===================================================================
// @desc    Get all artists without pagination (Admin/Utility use)
// @route   GET /api/artists/all
// @access  Public or Admin (based on need)
// ===================================================================
export const getAllArtistsWithoutPagination = async (req, res) => {
  const artists = await Artist.find().sort({ createdAt: -1 }).lean();

  const enrichedArtists = await Promise.all(
    artists.map(async (artist) => {
      const [songCount, albumCount] = await Promise.all([
        Song.countDocuments({ artist: artist._id }),
        Album.countDocuments({ artist: artist._id }),
      ]);

      return shapeArtistResponse({
        ...artist,
        songCount,
        albumCount,
      });
    })
  );

  res.status(StatusCodes.OK).json({
    success: true,
    artists: enrichedArtists,
  });
};



// ===================================================================
// @desc    Get artist by ID or slug
// @route   GET /api/artists/:id
// @access  Public
// ===================================================================
export const getArtistById = async (req, res) => {
  const identifier = req.params.id;

  // Determine whether identifier is a Mongo ObjectId or a slug
  const query = mongoose.Types.ObjectId.isValid(identifier)
    ? { _id: identifier }
    : { slug: identifier };

  const artist = await Artist.findOne(query).lean();
  if (!artist) {
    throw new NotFoundError("Artist not found");
  }

  // Optional: Enrich with counts
  const [songCount, albumCount] = await Promise.all([
    Song.countDocuments({ artist: artist._id }),
    Album.countDocuments({ artist: artist._id }),
  ]);

  const shaped = await shapeArtistResponse({
    ...artist,
    songCount,
    albumCount,
  });

  res.status(StatusCodes.OK).json({ success: true, artist: shaped });
};