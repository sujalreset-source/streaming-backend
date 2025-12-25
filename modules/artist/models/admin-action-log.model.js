import mongoose from "mongoose";

const adminActionLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",         // Admin user
      required: true,
      index: true,
    },

    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArtistApplication",
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        "application_approved",
        "application_rejected",
        "application_needs_info",
      ],
    },

    oldStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "needs_info"],
    },

    newStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "needs_info"],
      required: true,
    },

    notes: {
      type: String,
      maxlength: 1000,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for frequent admin queries
adminActionLogSchema.index({ action: 1, createdAt: -1 });

export const AdminActionLog =
  mongoose.models.AdminActionLog ||
  mongoose.model("AdminActionLog", adminActionLogSchema);
