import mongoose from "mongoose";
import slugify from "slugify";
import { customAlphabet } from "nanoid";

// Slug generator (6-char alphanumeric)
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

const albumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Album title is required"],
      trim: true,
      minlength: [2, "Album title must be at least 2 characters"],
      maxlength: [100, "Album title must be at most 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "Slug must be lowercase and URL-friendly"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [1000, "Description must be at most 1000 characters"],
      trim: true,
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: [true, "Artist is required"],
    },
    coverImage: {
      type: String,
      default: "",
      trim: true,
    },
    releaseDate: {
      type: Date,
      default: Date.now,
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Song",
        required: true,
      },
    ],
    accessType: {
        type: String,
        enum: ["free", "subscription", "purchase-only"],
        default: "subscription",
    },
    basePrice: {
      currency: { type: String },
      amount: { type: Number },
    },
  convertedPrices: [
    { 
      _id:false,
      currency: { type: String },
      amount: { type: Number },
    },]
  },
  { timestamps: true, versionKey: false }
);

// 🔁 Auto-generate a unique slug before validation
albumSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    const baseSlug = slugify(this.title, { lower: true, strict: true });
    this.slug = `${baseSlug}-${nanoid()}`;
  }
  next();
});

// Indexes for performance
albumSchema.index({ title: 1 });
albumSchema.index({ slug: 1 });

export const Album = mongoose.models.Album || mongoose.model("Album", albumSchema);
