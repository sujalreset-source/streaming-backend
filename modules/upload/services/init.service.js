// init.service.js
import { UploadSession } from "../models/UploadSession.model.js";
import { Song } from "../../../models/Song.js";
import { findOrCreateSession } from "./idempotency.service.js";
import { createUploadToken } from "./securityToken.service.js";
import { calculateParts } from "./partsCalculation.service.js";
import { createMultipartUpload, presignPartUrl } from "../utils/s3Multipart.util.js";

export const initUploadService = async ({
  artistId,
  filename,
  contentType,
  size,
  clientUploadUuid,
}) => {
  // 1) Validate input
  if (!filename || !contentType || !size) {
    throw new Error("Missing required fields (filename, contentType, size)");
  }

  // 2) Check idempotency logic (reuse existing session)
  let existingSession = null;

  if (clientUploadUuid) {
    existingSession = await findOrCreateSession({
      artistId,
      clientUploadUuid,
    });

    if (existingSession) {
      return {
        ...existingSession,
        reused: true,
      };
    }
  }

  // 3) Create initial Song record
  const song = await Song.create({
    title: filename.split(".")[0],
    artist: artistId,
    status: "draft",
    fileSize: size,
  });

  // 4) Generate S3 key
  const s3Key = `uploads/raw/${artistId}/${song._id}/${filename}`;

  // 5) Create S3 multipart upload
  const { uploadId } = await createMultipartUpload({
    key: s3Key,
    contentType,
  });
  console.log("Created multipart upload with ID:", uploadId);

  // 6) Calculate parts & partSize
  const { partSize, partsExpected } = calculateParts(size);

  // 7) Create UploadSession record
  const session = await UploadSession.create({
    sessionUuid: crypto.randomUUID(),
    clientUploadUuid: clientUploadUuid || null,
    songId: song._id,
    artistId,
    uploadId,
    s3Key,
    fileName: filename,
    contentType,
    size,
    partSize,
    partsExpected,
  });

  // 8) Generate upload token
  const uploadToken = createUploadToken({
    sessionUuid: session.sessionUuid,
    artistId,
    songId: song._id,
  });

  // 9) Presign first 4 parts (for concurrency)
  const presignFirstParts = [];
  const PRESIGN_FIRST = 4;

  for (let i = 1; i <= Math.min(PRESIGN_FIRST, partsExpected); i++) {
    const url = await presignPartUrl({
      key: s3Key,
      uploadId,
      partNumber: i,
    });
    presignFirstParts.push({ partNumber: i, url });
  }

  return {
    sessionUuid: session.sessionUuid,
    songId: song._id,
    uploadId,
    s3Key,
    partSize,
    partsExpected,
    presignFirstParts,
    uploadToken,
    expiresIn: 3600,
  };
};
