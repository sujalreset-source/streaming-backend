// utils/s3.js
import {
  S3Client,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

export const getSignedUrl = async (key) => {
  const bucket = process.env.AWS_S3_BUCKET;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const signedUrl = await awsGetSignedUrl(s3, command, {
    expiresIn: 60 * 60, // 1 hour
  });

  return signedUrl;
};
