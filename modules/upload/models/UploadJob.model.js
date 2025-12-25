import mongoose from "mongoose";

const uploadJobSchema = new mongoose.Schema({
  artistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Artist",
    required: true,
    index: true,
  },

  songId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Song",
    default: null,
  },

  fileKey: {
    type: String,   // S3 key for raw uploaded file
    required: true,
  },

  status: {
    type: String,
    enum: ["pending", "uploading", "processing", "hls-ready", "error"],
    default: "pending",
    index: true,
  },

  errorMessage: {
    type: String,
  },

  attempts: {
    type: Number,
    default: 0,
  },

  metadata: {
    duration: Number,
    bitrate: Number,
    codec: String,
  },
}, {
  timestamps: true,
  versionKey: false,
});

export const UploadJob =
  mongoose.models.UploadJob ||
  mongoose.model("UploadJob", uploadJobSchema);
