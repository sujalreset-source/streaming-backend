// // complete.service.js
// import { UploadSession } from "../models/UploadSession.model.js";
// import { Song } from "../../../models/Song.js";
// import { validatePartsList } from "./etagValidation.service.js";
// import { completeMultipartUpload } from "../utils/s3Multipart.util.js";

// export const completeUploadService = async ({
//   sessionUuid,
//   uploadId,
//   parts,
//   checksum,
//   artistId,
// }) => {
//   if (!sessionUuid || !uploadId || !parts) {
//     const err = new Error("Missing required fields");
//     err.status = 400;
//     throw err;
//   }

//   // 1. Load session
//   const session = await UploadSession.findOne({
//     sessionUuid,
//     artistId,
//   });

//   if (!session) {
//     const err = new Error("Upload session not found");
//     err.status = 404;
//     throw err;
//   }

//   // 2. Validate uploadId matches
//   if (session.uploadId !== uploadId) {
//     const err = new Error("uploadId mismatch");
//     err.status = 409;
//     throw err;
//   }

//   // 3. Validate session state
//   if (session.status === "completed") {
//     return {
//       status: "already_completed",
//       songId: session.songId,
//       sessionUuid: session.sessionUuid,
//     };
//   }

//   if (session.status === "aborted") {
//     const err = new Error("Cannot complete an aborted upload");
//     err.status = 409;
//     throw err;
//   }

//   // 4. Validate parts list (order, gaps, count, ETags, etc.)
//   validatePartsList(parts, session.partsExpected);

//   // 5. Complete multipart upload with AWS S3
//   const completeResult = await completeMultipartUpload({
//     key: session.s3Key,
//     uploadId,
//     parts,
//   });

//   if (!completeResult.Location) {
//     const err = new Error("Failed to complete multipart upload");
//     err.status = 500;
//     throw err;
//   }

//   // 6. Update Song
//   await Song.findByIdAndUpdate(session.songId, {
//     status: "uploaded",
//     rawS3Key: session.s3Key,
//     checksum: checksum || null,
//   });

//   // 7. Update UploadSession
//   session.status = "completed";
//   session.partsUploaded = session.partsExpected;
//   session.lastActivityAt = new Date();
//   if (checksum) session.checksum = checksum;
//   await session.save();

//   // 8. Response
//   return {
//     status: "completed",
//     songId: session.songId,
//     sessionUuid: session.sessionUuid,
//   };
// };


// complete.service.js
// import { UploadSession } from "../models/UploadSession.model.js";
// import { Song } from "../../../models/Song.js";
// import { validatePartsList } from "./etagValidation.service.js";
// import { completeMultipartUpload, copyObjectToSongs, deleteObjectByKey } from "../utils/s3Multipart.util.js";

// /**
//  * completeUploadService
//  * - completes multipart upload
//  * - copies completed object -> songs/<songId>/<filename>
//  * - deletes raw object (best-effort)
//  * - updates Song and UploadSession
//  *
//  * Notes:
//  * - In prod we enforce parts count. For manual testing set ALLOW_INCOMPLETE_UPLOADS=true in env.
//  */
// export const completeUploadService = async ({ sessionUuid, uploadId, parts, checksum, artistId }) => {
//   if (!sessionUuid || !uploadId || !Array.isArray(parts) || parts.length === 0) {
//     const err = new Error("Missing required fields: sessionUuid, uploadId, parts (non-empty)");
//     err.status = 400;
//     throw err;
//   }

//   const session = await UploadSession.findOne({ sessionUuid, artistId });
//   if (!session) {
//     const err = new Error("Upload session not found");
//     err.status = 404;
//     throw err;
//   }

//   if (session.uploadId !== uploadId) {
//     const err = new Error("uploadId mismatch");
//     err.status = 409;
//     throw err;
//   }

//   if (session.status === "completed") {
//     return { status: "already_completed", songId: session.songId, sessionUuid: session.sessionUuid };
//   }

//   if (session.status === "aborted") {
//     const err = new Error("Cannot complete an aborted upload");
//     err.status = 409;
//     throw err;
//   }

//   // Validate parts list: ordering, ETag presence
//   validatePartsList(parts, session.partsExpected);

//   // Enforce exact parts count in production unless override env set
//   const allowIncomplete = process.env.ALLOW_INCOMPLETE_UPLOADS === "true";
//   if (!allowIncomplete && parts.length !== session.partsExpected) {
//     const err = new Error(`Expected ${session.partsExpected} parts, received ${parts.length}`);
//     err.status = 400;
//     throw err;
//   }

//   // Complete multipart on S3
//   const completeResult = await completeMultipartUpload({
//     key: session.s3Key,
//     uploadId,
//     parts,
//   });

//   if (!completeResult) {
//     const err = new Error("Failed to complete multipart upload");
//     err.status = 500;
//     throw err;
//   }

//   // destination key so existing pipeline picks it up
//   const filename = session.fileName || session.s3Key.split("/").pop();
//   const destKey = `songs/${session.songId}/${filename}`;

//   // copy object to songs/ prefix
//   try {
//     await copyObjectToSongs({ sourceKey: session.s3Key, destKey });
//   } catch (copyErr) {
//     // safe behavior: do not delete raw; throw so caller can retry
//     console.error("Copy to songs/ failed:", copyErr);
//     const err = new Error("Failed to copy uploaded object to songs/ prefix");
//     err.cause = copyErr;
//     err.status = 500;
//     throw err;
//   }

//   // best-effort delete raw object
//   try {
//     await deleteObjectByKey({ key: session.s3Key });
//   } catch (delErr) {
//     console.warn("Failed to delete raw object after copy; will be cleaned by cleanup job", delErr);
//   }

//   // Update Song metadata
//   const update = {
//     status: "uploaded",
//     rawS3Key: session.s3Key,
//     uploadCompleteAt: new Date(),
//     fileSize: session.size || 0,
//   };
//   if (checksum) update.checksum = checksum;

//   await Song.findByIdAndUpdate(session.songId, update, { new: true }).lean();

//   // Update UploadSession
//   session.status = "completed";
//   session.partsUploaded = parts.length;
//   session.lastActivityAt = new Date();
//   if (checksum) session.checksum = checksum;
//   await session.save();

//   return {
//     status: "completed",
//     songId: session.songId,
//     sessionUuid: session.sessionUuid,
//     songsKey: destKey,
//     s3CompleteResult: completeResult,
//   };
// };




// complete.service.js
import { UploadSession } from "../models/UploadSession.model.js";
import { Song } from "../../../models/Song.js";
import { validatePartsList } from "./etagValidation.service.js";
import {
  completeMultipartUpload,
  copyObjectToSongs,
  deleteObjectByKey,
  s3,
} from "../utils/s3Multipart.util.js"; // s3 exported for headObject
import { HeadObjectCommand } from "@aws-sdk/client-s3";


export const completeUploadService = async ({ sessionUuid, uploadId, parts, checksum, artistId }) => {
  if (!sessionUuid || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    const err = new Error("Missing required fields: sessionUuid, uploadId, parts (non-empty)");
    err.status = 400;
    throw err;
  }

  const session = await UploadSession.findOne({ sessionUuid, artistId });
  if (!session) {
    const err = new Error("Upload session not found");
    err.status = 404;
    throw err;
  }

  if (session.uploadId !== uploadId) {
    const err = new Error("uploadId mismatch");
    err.status = 409;
    throw err;
  }

  if (session.status === "completed") {
    return { status: "already_completed", songId: session.songId, sessionUuid: session.sessionUuid };
  }

  if (session.status === "aborted") {
    const err = new Error("Cannot complete an aborted upload");
    err.status = 409;
    throw err;
  }

  // Validate parts list (your existing function)
  validatePartsList(parts, session.partsExpected);

  // enforce exact parts count in prod unless ALLOW_INCOMPLETE_UPLOADS=true
  const allowIncomplete = process.env.ALLOW_INCOMPLETE_UPLOADS === "true";
  if (!allowIncomplete && parts.length !== session.partsExpected) {
    const err = new Error(`Expected ${session.partsExpected} parts, received ${parts.length}`);
    err.status = 400;
    throw err;
  }

  // If checksum provided now but not in session, persist it
  if (checksum && !session.checksum) {
    session.checksum = checksum;
    session.checksumStatus = "pending";
    await session.save();
    // update song checksum too (if exists)
    await Song.findByIdAndUpdate(session.songId, { checksum, checksumStatus: "pending" });
  }

  // Complete multipart upload in S3
  const completeResult = await completeMultipartUpload({
    key: session.s3Key,
    uploadId,
    parts,
  });

  if (!completeResult) {
    const err = new Error("Failed to complete multipart upload");
    err.status = 500;
    throw err;
  }

  // HEAD the object to verify size
  try {
    const head = await s3.send(
  new HeadObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: session.s3Key,
  })
);

    const s3Size = head.ContentLength || head.ContentLength === 0 ? head.ContentLength : null;

    // If client provided size and mismatch -> mark mismatch and fail
    if (session.size && s3Size !== null && session.size !== 0 && session.size !== s3Size) {
      session.checksumStatus = "mismatch";
      session.status = "failed";
      session.lastActivityAt = new Date();
      await session.save();

      await Song.findByIdAndUpdate(session.songId, { checksumStatus: "mismatch", status: "failed" });
      const err = new Error("Uploaded file size mismatch between client and S3");
      err.status = 400;
      throw err;
    }
  } catch (headErr) {
    // treat head error as retryable/fail
    console.error("HeadObject failed:", headErr);
    throw headErr;
  }

  // At this point:
  // - sizes match or size not provided
  // - session.checksum may be present and status pending
  // - we'll set checksumStatus accordingly (we do not compute SHA256 here)
  const checksumState = session.checksum ? "pending" : "none";
  session.checksumStatus = checksumState;
  await session.save();
  await Song.findByIdAndUpdate(session.songId, { checksum: session.checksum || null, checksumStatus: checksumState });

  // Copy to songs/ prefix (with retry wrapper inside)
  const filename = session.fileName || session.s3Key.split("/").pop();
  const destKey = `songs/${session.songId}/${filename}`;

  try {
    await copyObjectToSongs({ sourceKey: session.s3Key, destKey });
    session.copyToSongsAt = new Date();
  } catch (copyErr) {
    console.error("Copy to songs/ failed:", copyErr);
    // keep session.status as uploading/completed? We throw so caller can retry
    const err = new Error("Failed to copy uploaded object to songs/ prefix");
    err.cause = copyErr;
    err.status = 500;
    throw err;
  }

  // Best-effort delete raw object
  try {
    await deleteObjectByKey({ key: session.s3Key });
  } catch (delErr) {
    console.warn("Failed to delete raw object after copy; will be cleaned by cleanup job", delErr);
  }

  // Update Song metadata and mark uploaded
  const update = {
    status: "uploaded",
    rawS3Key: session.s3Key,
    uploadCompleteAt: new Date(),
    fileSize: session.size || 0,
    checksum: session.checksum || null,
    checksumStatus: session.checksum ? "pending" : "none",
  };
  await Song.findByIdAndUpdate(session.songId, update);

  // Update UploadSession final state
  session.status = "completed";
  session.partsUploaded = parts.length;
  session.lastActivityAt = new Date();
  await session.save();

  return {
    status: "completed",
    songId: session.songId,
    sessionUuid: session.sessionUuid,
    songsKey: destKey,
    s3CompleteResult: completeResult,
  };
};
