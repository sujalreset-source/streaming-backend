import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const privateKey = fs.readFileSync(
  path.resolve("cloudfront-private.pem"),
  "utf8"
);

const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
const domain = process.env.CLOUDFRONT_DOMAIN;

export const getSignedCloudFrontUrl = (uuid, expiresInSeconds = 3600) => {
  const m3u8Url = `https://${domain}/songs-hls/${uuid}/${uuid}_hls.m3u8`;
  const wildcardResource = `https://${domain}/${uuid}/*`;

  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const policy = JSON.stringify({
    Statement: [
      {
        Resource: wildcardResource,
        Condition: {
          DateLessThan: {
            "AWS:EpochTime": expires,
          },
        },
      },
    ],
  });

  return getSignedUrl({
    url: m3u8Url,
    keyPairId,
    privateKey,
    policy,
  });
};

