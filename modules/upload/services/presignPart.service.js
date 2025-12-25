// presignPart.service.js
import { UploadSession } from "../models/UploadSession.model.js";
import { presignPartUrl } from "../utils/s3Multipart.util.js";

export const presignPartService = async ({ artistId, sessionUuid, partNumber }) => {
  if (!sessionUuid || !partNumber) {
    throw new Error("sessionUuid and partNumber are required");
  }

  // 1) Load session
  const session = await UploadSession.findOne({
    sessionUuid,
    artistId, // ensures this session belongs to the user
  });

  if (!session) {
    const err = new Error("Upload session not found");
    err.status = 404;
    throw err;
  }

  // 2) Validate session status
  if (session.status === "completed") {
    const err = new Error("Upload already completed");
    err.status = 409;
    throw err;
  }

  if (session.status === "aborted") {
    const err = new Error("Upload aborted");
    err.status = 409;
    throw err;
  }

  // 3) Validate part number boundaries
  if (partNumber < 1 || partNumber > session.partsExpected) {
    const err = new Error(`Invalid partNumber. Expected between 1 and ${session.partsExpected}`);
    err.status = 400;
    throw err;
  }

  // 4) Generate presigned URL
  const url = await presignPartUrl({
    key: session.s3Key,
    uploadId: session.uploadId,
    partNumber,
  });

  // 5) Update session activity
  session.lastActivityAt = new Date();
  session.status = "uploading";
  await session.save();

  return {
    sessionUuid: session.sessionUuid,
    songId: session.songId,
    partNumber,
    url,
    expiresIn: 3600,
  };
};
