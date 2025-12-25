// import mongoose from "mongoose";
// import slugify from "slugify";
// import { customAlphabet } from "nanoid";

// const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

// /* --------------------------------------------------------
//    Price Schema
// --------------------------------------------------------- */
// const priceSchema = new mongoose.Schema(
//   {
//     currency: {
//       type: String,
//       required: true,
//       uppercase: true,
//       minlength: 3,
//       maxlength: 3, // ISO (INR, USD, EUR)
//     },
//     amount: {
//       type: Number,
//       required: true,
//       min: [0, "Price cannot be negative"],
//     },
//   },
//   { _id: false }
// );

// /* --------------------------------------------------------
//    Subscription Plan Schema
// --------------------------------------------------------- */
// const subscriptionPlanSchema = new mongoose.Schema(
//   {
//     cycle: {
//       type: String,
//       enum: ["1m", "3m", "6m", "12m"],
//       required: true,
//     },

//     basePrice: {
//       type: priceSchema,
//       required: true,
//     },

//     convertedPrices: {
//       type: [priceSchema],
//       default: [],
//       validate: {
//         validator: function (prices) {
//           const currencies = prices.map((p) => p.currency.toUpperCase());
//           return new Set(currencies).size === currencies.length;
//         },
//         message: "Duplicate converted currencies are not allowed",
//       },
//     },

//     razorpayPlanId: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     stripePriceId: {
//       type: String,
//       default: null,
//       trim: true,
//     },

//     paypalPlans: [
//       {
//         currency: { type: String, required: true, uppercase: true },
//         paypalPlanId: { type: String, required: true },
//       },
//     ],
//   },
//   { _id: false }
// );

// /* --------------------------------------------------------
//    Artist Schema (V2)
// --------------------------------------------------------- */
// const artistSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       minlength: 2,
//       maxlength: 100,
//     },

//     slug: {
//       type: String,
//       required: true,
//       lowercase: true,
//       unique: true,
//       trim: true,
//       match: [/^[a-z0-9-]+$/, "Slug must be lowercase and URL-friendly"],
//     },

//     location: {
//       type: String,
//       maxlength: 100,
//       default: "",
//       trim: true,
//     },

//     bio: {
//       type: String,
//       maxlength: 2000,
//       default: "",
//       trim: true,
//     },

//     image: {
//       type: String,
//       default: "",
//       trim: true,
//     },

//     subscriptionPlans: {
//       type: [subscriptionPlanSchema],
//       validate: {
//         validator: function (plans) {
//           const cycles = plans.map((p) => p.cycle);
//           return new Set(cycles).size === cycles.length;
//         },
//         message: "Duplicate subscription cycles are not allowed",
//       },
//       default: [],
//     },

//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },

//     // NEW V2 fields
//     accountType: {
//       type: String,
//       enum: ["admin", "self"],
//       default: "admin",
//       index: true,
//     },

//     approvalStatus: {
//       type: String,
//       enum: ["pending", "approved", "rejected"],
//       default: "approved", // backward-compatible
//       index: true,
//     },

//     uploadVersion: {
//       type: Number,
//       default: 1,
//     },
//   },
//   { timestamps: true, versionKey: false }
// );

// // Auto-generate slug
// artistSchema.pre("validate", function (next) {
//   if (!this.slug && this.name) {
//     const baseSlug = slugify(this.name, { lower: true, strict: true });
//     this.slug = `${baseSlug}-${nanoid()}`;
//   }
//   next();
// });

// // Indexes
// artistSchema.index({ name: 1 });
// artistSchema.index({ slug: 1 }, { unique: true });
// artistSchema.index({ approvalStatus: 1 });
// artistSchema.index({ accountType: 1 });

// export const Artist =
//   mongoose.models.Artist || mongoose.model("Artist", artistSchema);


// src/modules/artist/models/artist.model.js
import mongoose from "mongoose";
import slugify from "slugify";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

const priceSchema = new mongoose.Schema(
  {
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    amount: { type: Number, required: true, min: [0, "Price cannot be negative"] },
  },
  { _id: false }
);

const subscriptionPlanSchema = new mongoose.Schema(
  {
    cycle: { type: String, enum: ["1m", "3m", "6m", "12m"], required: true },
    basePrice: { type: priceSchema, required: true },
    convertedPrices: { type: [priceSchema], default: [], validate: {
      validator(prices) {
        const currencies = prices.map(p => p.currency.toUpperCase());
        return new Set(currencies).size === currencies.length;
      },
      message: "Duplicate converted currencies are not allowed"
    }},
    razorpayPlanId: { type: String, default: null, trim: true },
    stripePriceId: { type: String, default: null, trim: true },
    paypalPlans: [{ currency: { type: String, uppercase: true }, paypalPlanId: { type: String } }],
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const socialSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true }, // instagram, youtube, twitter, etc
    url: { type: String, required: true },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const artistSchema = new mongoose.Schema(
  {
    // Basic
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    slug: { type: String, required: true, lowercase: true, unique: true, trim: true, match: [/^[a-z0-9-]+$/, "Slug must be lowercase and URL-friendly"] },
    bio: { type: String, maxlength: 2000, default: "", trim: true },

    // Branding
    profileImage: { type: String, default: "", trim: true },
    coverImage: { type: String, default: "", trim: true },

    // Geodata
    country: { type: String, maxlength: 2, uppercase: true, default: null, index: true },
    location: { type: String, maxlength: 100, default: "", trim: true },

    // Socials
    socials: { type: [socialSchema], default: [] },

    // Monetization + subscriptions
    subscriptionPlans: { type: [subscriptionPlanSchema], default: [] },
    monetizationStatus: { type: String, enum: ["not_set", "active", "disabled"], default: "not_set", index: true },
    isMonetizationComplete: { type: Boolean, default: false },
    monetizationSetupAt: { type: Date, default: null },
    monetizationSetupBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    monetizationLastSyncAt: { type: Date, default: null },
    monetizationMetadata: { type: Object, default: {} },

    // Ownership / lifecycle
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    accountType: { type: String, enum: ["admin", "self"], default: "self", index: true },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "approved", index: true },

    // Upload & quota
    uploadVersion: { type: Number, default: 1 },
    uploadQuotaBytes: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB

    // Roles (for multi-user artist accounts)
    roles: { type: [String], default: ["artist"], index: true },

    // Optional payout reference (link to ArtistPayoutProfile)
    payoutProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "ArtistPayoutProfile", default: null, index: true },
  },
  { timestamps: true, versionKey: false }
);

// generate slug
artistSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    const base = slugify(this.name, { lower: true, strict: true });
    this.slug = `${base}-${nanoid()}`;
  }
  next();
});

// Indexes
artistSchema.index({ name: 1 });
artistSchema.index({ slug: 1 }, { unique: true });
artistSchema.index({ accountType: 1 });
artistSchema.index({ approvalStatus: 1 });
artistSchema.index({ monetizationStatus: 1 });

export const Artist = mongoose.models.Artist || mongoose.model("Artist", artistSchema);
export default Artist;

