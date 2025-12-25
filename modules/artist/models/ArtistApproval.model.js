import mongoose from "mongoose";

const artistApprovalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true,
  },

  documents: [
    {
      type: String, // S3 URLs
    }
  ],

  notes: {
    type: String,
    trim: true,
  },

  adminReviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  reviewedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  versionKey: false,
});

export const ArtistApproval =
  mongoose.models.ArtistApproval ||
  mongoose.model("ArtistApproval", artistApprovalSchema);
