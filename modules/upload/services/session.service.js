// session.service.js
import { UploadSession } from "../models/UploadSession.model.js";

export const getUploadSessionService = async ({ sessionUuid, artistId }) => {
  if (!sessionUuid) {
    const err = new Error("sessionUuid is required");
    err.status = 400;
    throw err;
  }

  // 1. Load session
  const session = await UploadSession.findOne({
    sessionUuid,
    artistId,
  }).lean();

  if (!session) {
    const err = new Error("Upload session not found");
    err.status = 404;
    throw err;
  }

  // 2. If session completed, return simple response
  if (session.status === "completed") {
    return {
      status: "completed",
      sessionUuid: session.sessionUuid,
      songId: session.songId,
    };
  }

  // 3. Return all required info for client resume
  return {
    sessionUuid: session.sessionUuid,
    songId: session.songId,

    uploadId: session.uploadId,
    s3Key: session.s3Key,

    partSize: session.partSize,
    partsExpected: session.partsExpected,
    partsUploaded: session.partsUploaded,

    status: session.status,
    fileName: session.fileName,
    size: session.size,
    contentType: session.contentType,

    lastActivityAt: session.lastActivityAt,
    checksum: session.checksum || null,
  };
};
