// abort.service.js
import { UploadSession } from "../models/UploadSession.model.js";
import { Song } from "../../../models/Song.js";
import { abortMultipartUpload } from "../utils/s3Multipart.util.js";

export const abortUploadService = async ({ sessionUuid, artistId }) => {
  if (!sessionUuid) {
    const err = new Error("sessionUuid is required");
    err.status = 400;
    throw err;
  }

  // 1. Load session
  const session = await UploadSession.findOne({
    sessionUuid,
    artistId,
  });

  if (!session) {
    const err = new Error("Upload session not found");
    err.status = 404;
    throw err;
  }

  // If already aborted or completed → nothing to do
  if (session.status === "aborted") {
    return { status: "already_aborted", sessionUuid };
  }

  if (session.status === "completed") {
    const err = new Error("Cannot abort completed upload");
    err.status = 409;
    throw err;
  }

  // 2. Abort AWS S3 multipart upload
  try {
    await abortMultipartUpload({
      key: session.s3Key,
      uploadId: session.uploadId,
    });
  } catch (e) {
    console.error("Error aborting multipart: ", e);
    // continue, because we still want to mark as aborted
  }

  // 3. Update UploadSession to aborted
  session.status = "aborted";
  session.lastActivityAt = new Date();
  await session.save();

  // 4. Mark Song as failed (or return to draft)
  await Song.findByIdAndUpdate(session.songId, {
    status: "failed",
  });

  return {
    status: "aborted",
    sessionUuid,
    songId: session.songId,
  };
};
