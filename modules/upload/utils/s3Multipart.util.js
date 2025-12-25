// // s3Multipart.util.js
// import {
//   S3Client,
//   CreateMultipartUploadCommand,
//   UploadPartCommand,
// } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import {
//   CompleteMultipartUploadCommand,
// } from "@aws-sdk/client-s3";
// import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";

// const s3 = new S3Client({ region: process.env.AWS_REGION });

// export const createMultipartUpload = async ({ key, contentType }) => {
//   const command = new CreateMultipartUploadCommand({
//     Bucket: process.env.AWS_S3_BUCKET,
//     Key: key,
//     ContentType: contentType,
//     ACL: "private",
//   });

//   const response = await s3.send(command);
//   return { uploadId: response.UploadId };
// };

// export const presignPartUrl = async ({ key, uploadId, partNumber }) => {
//   const command = new UploadPartCommand({
//     Bucket: process.env.AWS_S3_BUCKET,
//     Key: key,
//     UploadId: uploadId,
//     PartNumber: partNumber,
//   });

//   return getSignedUrl(s3, command, { expiresIn: 3600 });
// };




// export const completeMultipartUpload = async ({ key, uploadId, parts }) => {
//   const command = new CompleteMultipartUploadCommand({
//     Bucket: process.env.AWS_S3_BUCKET,
//     Key: key,
//     UploadId: uploadId,
//     MultipartUpload: { Parts: parts },
//   });

//   return s3.send(command);
// };


// export const abortMultipartUpload = async ({ key, uploadId }) => {
//   const command = new AbortMultipartUploadCommand({
//     Bucket: process.env.AWS_S3_BUCKET,
//     Key: key,
//     UploadId: uploadId,
//   });

//   return s3.send(command);
// };

// s3Multipart.util.js
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { retryPromise } from "./retry.util.js";

const s3 = new S3Client({ region: process.env.AWS_REGION });

/**
 * Create multipart upload (if needed elsewhere)
 */
export async function createMultipartUpload({
  bucket = process.env.AWS_S3_BUCKET,
  key,
  contentType,
}) {
  const cmd = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const res = await s3.send(cmd);

  return {
    uploadId: res.UploadId,  // FIX
    key: res.Key,
  };
}


/**
 * Generate presigned URL for UploadPart
 */
export async function presignPartUrl({ bucket = process.env.AWS_S3_BUCKET, key, uploadId, partNumber, expires = 3600 }) {
  const cmd = new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: uploadId, PartNumber: partNumber });
  return getSignedUrl(s3, cmd, { expiresIn: expires });
}

/**
 * Complete multipart upload
 * parts = [{ ETag, PartNumber }, ...] (ETag must include quotes)
 */
export async function completeMultipartUpload({ bucket = process.env.AWS_S3_BUCKET, key, uploadId, parts }) {
  const command = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  return s3.send(command);
}

/**
 * Abort multipart upload
 */
export async function abortMultipartUpload({ bucket = process.env.AWS_S3_BUCKET, key, uploadId }) {
  const cmd = new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId });
  return s3.send(cmd);
}

/**
 * Copy object inside same bucket (sourceKey => destKey)
 * sourceKey must be the full key (no leading slash)
 */
// export async function copyObjectToSongs({ bucket = process.env.AWS_S3_BUCKET, sourceKey, destKey }) {
//   const cmd = new CopyObjectCommand({
//     Bucket: bucket,
//     CopySource: `${bucket}/${sourceKey}`,
//     Key: destKey,
//     ACL: "private",
//   });
//   return s3.send(cmd);
// }

/**
 * Delete object by key
 */
export async function deleteObjectByKey({ bucket = process.env.AWS_S3_BUCKET, key }) {
  const cmd = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return s3.send(cmd);
}

export async function copyObjectToSongs({ bucket = process.env.AWS_S3_BUCKET, sourceKey, destKey }) {

  // Define the actual operation
  const doCopy = async () => {
    const cmd = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: destKey,
      ACL: "private",
    });

    return s3.send(cmd);
  };

  // Wrap in retry (3 retries, exponential backoff)
  return retryPromise(doCopy, {
    retries: 3,
    backoff: 200,  // 200 → 400 → 800 ms
    jitter: true,
  });
}

export { s3 };
