import mongoose from "mongoose";
import slugify from "slugify";
import { customAlphabet } from "nanoid";
import { Artist } from "../../artist/models/artist.model.js";
import {User} from "../../../models/User.js";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

const DOCUMENT_TYPES = ["gov_id", "proof_of_address", "tax_id", "portfolio", "other"];
const STATUS = ["pending", "approved", "rejected", "needs_info"];

/**
 * Document sub-schema: stores S3 URL + metadata about verification doc uploaded by applicant
 * We store only URLs (S3/CloudFront) and metadata (type, filename).
 */
const applicationDocumentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    filename: { type: String, trim: true },
    size: { type: Number }, // optional, bytes
    mimeType: { type: String },
    docType: { type: String, enum: DOCUMENT_TYPES, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * Contact sub-schema - for optional public / private contact details
 */
const contactSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
  },
  { _id: false }
);

/**
 * ArtistApplication - temporary onboarding record.
 * - Created when a user requests to become an artist
 * - Admin reviews and approves/rejects; on approval a permanent Artist document will be created
 */
const artistApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Name choices the applicant proposes
    legalName: { type: String, trim: true, maxlength: 150 },
    stageName: { type: String, required: true, trim: true, maxlength: 150 },

    // Slug for admin listing & dedupe check (generated from stageName + nanoid)
    slug: { type: String, required: true, lowercase: true, trim: true, unique: true },

    // Short bio / artist description provided during application
    bio: { type: String, default: "", trim: true, maxlength: 2000 },
     // Geodata
    country: { type: String, maxlength: 2, uppercase: true, default: null, index: true },

    // Contact & social links (applicant-provided)
    contact: { type: contactSchema, default: {} },
    // socials: {
    //   type: [
    //     {
    //       provider: { type: String, required: true }, // eg: "instagram", "youtube"
    //       url: { type: String, required: true },
    //     },
    //   ],
    //   default: [],
    // },

    // Verification documents (S3/URL) user uploaded
    documents: {
      type: [applicationDocumentSchema],
      default: [],
    },

    // Optional sample tracks / portfolio links the artist can provide (S3 keys / urls)
    samples: {
      type: [
        {
          title: { type: String },
          url: { type: String, required: true },
          durationSeconds: { type: Number },
        },
      ],
      default: [],
    },

    socials: {
      type: [
        {
          provider: { type: String, required: true }, // eg: "instagram", "youtube"
          url: { type: String, required: true },
        },
      ],
      default: [],
    },

  
    // Application lifecycle fields
    status: {
      type: String,
      enum: STATUS,
      default: "pending",
      index: true,
    },

    adminReviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: { type: Date },

    // If admin rejected or asked for changes
    adminNotes: { type: String, trim: true },

    // How many times applicant re-submitted after rejection or asked-for-info
    attemptCount: { type: Number, default: 1 },

    // Soft metadata for auditing / analytics
    ipAddress: { type: String },
    userAgent: { type: String },

    // small flags for ops
    isKycPassed: { type: Boolean, default: false, index: true },
    isDocsComplete: { type: Boolean, default: false },

    // Optionally, allow the request to propose a default uploadQuota (admin will confirm/change)
    requestedUploadQuotaBytes: { type: Number, default: null },
  },
  { timestamps: true, versionKey: false }
);

/* ----------------------
   Hooks & helpers
   ---------------------- */

// Auto-generate slug from stageName if not present
artistApplicationSchema.pre("validate", async function (next) {
  if (!this.slug && this.stageName) {
    const baseSlug = slugify(this.stageName, { lower: true, strict: true });
    this.slug = `${baseSlug}-${nanoid()}`;
  }
  // mark docs completeness quickly (simple heuristic)
  if (Array.isArray(this.documents) && this.documents.length > 0) {
    this.isDocsComplete = true;
  } else {
    this.isDocsComplete = false;
  }
  next();
});

/* ----------------------
   Static & instance helpers
   ---------------------- */

/**
 * approveAndCreateArtist
 * - Admin calls this after reviewing application and accepting it.
 * - This method will:
 *   1) create a new Artist document (shape minimal fields from application)
 *   2) update this application.status = 'approved', set adminReviewer/reviewedAt
 *   3) return the created artist doc
 *
 * Note: the actual Artist model import is lazy to avoid circular deps in runtime.
 */
artistApplicationSchema.methods.approveAndCreateArtist = async function (
  adminUserId,
  overrides = {}
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const application = this;

    // 1️⃣ Create Artist
    const artist = await Artist.create(
      [
        {
          name: overrides.name || application.stageName,
          slug: overrides.slug || application.slug,
          bio: overrides.bio || application.bio,
          image: overrides.image || null,
          location: application.contact?.location || "",
          createdBy: application.userId,
          accountType: "self",
          approvalStatus: "approved",
          uploadVersion: 2,
        },
      ],
      { session }
    );

    console .log("Created new Artist from application:", artist);

    // 2️⃣ Update the application to approved
    const updatedApplication = await ArtistApplication.findByIdAndUpdate(
      application._id,
      {
        status: "approved",
        adminReviewer: adminUserId,
        adminNotes: overrides.adminNotes || null,
        reviewedAt: new Date(),
      },
      { new: true, session }
    );
    console.log("Updated application to approved:", application);

    const  user = await User.findByIdAndUpdate(
      application.userId,
      {
        artistId: artist[0]._id,
        role: "artist",
      },
      { new: true, session }
    );

    console.log("Updated user to artist role:", user);

    await session.commitTransaction();
    session.endSession();

    // Return both
    return { artist: artist[0], updatedApplication };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

/**
 * markRejected
 * - Admin rejects application (with notes)
 */
artistApplicationSchema.methods.markRejected = async function (
  adminUserId,
  notes
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const application = this;

    const updatedApplication = await ArtistApplication.findByIdAndUpdate(
      application._id,
      {
        status: "rejected",
        adminReviewer: adminUserId,
        adminNotes: notes || null,
        reviewedAt: new Date(),
      },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    return updatedApplication;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};


/* ----------------------
   Indexes to help admin queries
   ---------------------- */
artistApplicationSchema.index({ status: 1, createdAt: -1 });
artistApplicationSchema.index({ userId: 1, status: 1 });

export const ArtistApplication =
  mongoose.models.ArtistApplication || mongoose.model("ArtistApplication", artistApplicationSchema);

export default ArtistApplication;
