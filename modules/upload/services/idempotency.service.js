// idempotency.service.js
import { UploadSession } from "../models/UploadSession.model.js";

export const findOrCreateSession = async ({ artistId, clientUploadUuid }) => {
  if (!clientUploadUuid) return null;

  const session = await UploadSession.findOne({
    clientUploadUuid,
    artistId,
    status: { $in: ["initiated", "uploading"] },
  }).lean();

  if (!session) return null;

  return {
    sessionUuid: session.sessionUuid,
    songId: session.songId,
    uploadId: session.uploadId,
    s3Key: session.s3Key,
    partSize: session.partSize,
    partsExpected: session.partsExpected,
    expiresIn: 3600,
    uploadToken: null, // new token generated in main service
    reused: true,
  };
};
