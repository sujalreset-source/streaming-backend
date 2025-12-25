// import mongoose from "mongoose";
// import slugify from "slugify";
// import { customAlphabet } from "nanoid";

// // Unique 6-character slug suffix
// const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

// const songSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: [true, "Song title is required"],
//       trim: true,
//     },
//       slug: {
//       type: String,
//       required: true,
//       lowercase: true,
//       trim: true,
//       match: [/^[a-z0-9-]+$/, "Slug must be lowercase and URL-friendly"],
//     },
//     duration: {
//       type: Number,
//       // required: true
//     },
//     artist: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Artist",
//       required: true,
//     },
//     album: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Album",
//       default: null,
//     },
//     genre: [
//       {
//         type: String,
//         required: true,
//         trim: true,
//       },
//     ],
//     coverImage: {
//       type: String,
//       default: "",
//       trim: true,
//     },
//     albumOnly: {
//     type: Boolean,
//     default: false, 
//     },
//     accessType: {
//       type: String,
//       enum: ["free", "subscription", "purchase-only"],
//       default: "subscription",
//      },
//      basePrice: {
//       currency: { type: String },
//       amount: { type: Number },
//     },
//   convertedPrices: [
//     { 
//       _id:false,
//       currency: { type: String },
//       amount: { type: Number },
//     },],
//     audioUrl: {
//       type: String,
//       // required: [true, "Audio URL is required"],
//       trim: true,
//     },
//     // Key used for matching in the HLS completion lambda
//     audioKey: {
//       type: String,
//       trim: true,
//       index: true,
//     },
//     releaseDate: {
//       type: Date,
//       default: Date.now,
//     },
//     hlsUrl: {
//       type: String,
//       default: "",
//       trim: true,
//     },
//     hlsReady: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true, versionKey: false }
// );

// // 🔁 Auto-generate slug from title + nanoid (just like album)
// songSchema.pre("validate", function (next) {
//   if (!this.slug && this.title) {
//     const baseSlug = slugify(this.title, { lower: true, strict: true });
//     this.slug = `${baseSlug}-${nanoid()}`;
//   }
//   next();
// });

// // Indexes for performance
// songSchema.index({ genre: 1 });
// songSchema.index({ title: 1 });
// songSchema.index({ slug: 1 });




// export const Song = mongoose.models.Song || mongoose.model("Song", songSchema);



import mongoose from "mongoose";
import slugify from "slugify";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "Slug must be lowercase and URL-friendly"],
    },

    /** 🔥 Artist who owns the song */
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true,
      index: true,
    },

    /** 🔥 Album (optional) */
    album: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album",
      default: null,
    },

    /** 🔥 Genre(s) */
    genre: {
      type: [String],
      default: [],
    },

    /** 🔥 Cover image (uploaded separately) */
    coverImage: {
      type: String,
      default: "",
    },

    /** 🔥 Business logic fields */
    albumOnly: {
      type: Boolean,
      default: false,
    },

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
        _id: false,
        currency: { type: String },
        amount: { type: Number },
      },
    ],

    isrc: {
    type: String,
    trim: true,
    uppercase: true,
    index: true,
   },

    /**
     * ============================================================
     * 🔥 UPLOAD PIPELINE FIELDS (NEW)
     * ============================================================
     */

    /** 🔥 Upload status */
    status: {
      type: String,
      enum: ["draft", "uploading", "uploaded", "processing", "ready", "failed"],
      default: "draft",
      index: true,
    },

    /** 🔥 Raw S3 Key (first upload) */
    rawS3Key: {
      type: String,
      default: null,
      trim: true,
    },

    /** 🔥 Raw file size (bytes) */
    fileSize: {
      type: Number,
      default: 0,
    },

    /** 🔥 SHA-256 checksum from client (optional) */
    checksum: {
      type: String,
      default: null,
    },

  checksumStatus: { 
  type: String,
  enum: ["none", "pending", "verified", "mismatch"],
  default: "none",
  index: true
},

    /** 🔥 Timestamp when multipart upload was completed */
    uploadCompleteAt: {
      type: Date,
      default: null,
    },

    /**
     * ============================================================
     * 🔥 LEGACY FIELDS (NO LONGER REQUIRED AT UPLOAD TIME)
     * ============================================================
     */

    audioUrl: {
      type: String,
      default: "",
      trim: true,
    },

    audioKey: {
      type: String,
      default: "",
      trim: true,
    },

    /** 🔥 Song duration (added after HLS processing) */
    duration: {
      type: Number,
      default: 0,
    },

    /** 🔥 HLS output */
    hlsUrl: {
      type: String,
      default: "",
      trim: true,
    },

    hlsReady: {
      type: Boolean,
      default: false,
    },

    /** 🔥 Release date */
    releaseDate: {
      type: Date,
      default: Date.now,
    },
  },

  { timestamps: true, versionKey: false }
);

/** 🔁 Auto-generate slug before validation */
songSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    const baseSlug = slugify(this.title, { lower: true, strict: true });
    this.slug = `${baseSlug}-${nanoid()}`;
  }
  next();
});

/** Indexes */
songSchema.index({ genre: 1 });
songSchema.index({ title: 1 });
songSchema.index({ slug: 1 });

export const Song =
  mongoose.models.Song || mongoose.model("Song", songSchema);
