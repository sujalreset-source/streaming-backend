import mongoose from "mongoose";

const uploadSessionSchema = new mongoose.Schema(
  {
    /**
     * ====================================================
     *  CORE IDENTIFIERS
     * ====================================================
     */
    sessionUuid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    clientUploadUuid: {
      type: String,
      default: null,
      index: true, // frontend idempotency
    },

    songId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Song",
      required: true,
      index: true,
    },

    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true,
      index: true,
    },

    /**
     * ====================================================
     *  S3 MULTIPART METADATA
     * ====================================================
     */
    uploadId: {
      type: String,
      required: true, // from CreateMultipartUpload
      index: true,
    },

    s3Key: {
      type: String,
      required: true, // uploads/raw/<artist>/<song>/<file>
      trim: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    contentType: {
      type: String,
      default: null,
    },

    size: {
      type: Number,
      default: 0,
    },

    checksum: {
      type: String,
      default: null,
    },

  checksumStatus: {
  type: String,
  enum: ["none","pending","verified","mismatch"],
  default: "none",
  index: true
},

    /**
     * ====================================================
     *  MULTIPART PARAMETERS
     * ====================================================
     */
    partSize: {
      type: Number,
      required: true,
    },

    partsExpected: {
      type: Number,
      required: true,
    },

    partsUploaded: {
      type: Number,
      default: 0,
    },

    // NEW — pragma-metadata; future-proof
    etagList: [
      {
        _id: false,
        partNumber: Number,
        ETag: String,
      },
    ],

    partsMeta: [
      {
        _id: false,
        partNumber: Number,
        ETag: String,
        uploadedAt: Date,
      },
    ],

    /**
     * ====================================================
     *  SESSION LIFECYCLE & STATE MGMT
     * ====================================================
     */
    status: {
      type: String,
      enum: ["initiated", "uploading", "completed", "aborted", "failed"],
      default: "initiated",
      index: true,
    },

    // NEW — exact completion time
    uploadCompleteAt: {
      type: Date,
      default: null,
    },

    // NEW — timestamp when raw → songs copy is finished
    copyToSongsAt: {
      type: Date,
      default: null,
    },

    // NEW — backend tracking
    retryCount: {
      type: Number,
      default: 0,
    },

    // NEW — reason for failure, if any
    failReason: {
      type: String,
      default: null,
    },

    // NEW — whether session reused existing uploadId
    isResumed: {
      type: Boolean,
      default: false,
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    notes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

/** Indexes */
uploadSessionSchema.index({ artistId: 1, status: 1 });
uploadSessionSchema.index({ lastActivityAt: 1 });

export const UploadSession =
  mongoose.models.UploadSession ||
  mongoose.model("UploadSession", uploadSessionSchema);
