import { getSignedCookies } from "@aws-sdk/cloudfront-signer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const privateKey = fs.readFileSync(path.resolve("cloudfront-private.pem"), "utf8");
const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
const domain = process.env.CLOUDFRONT_DOMAIN;

/**
 * Generate CloudFront signed cookies for a given HLS directory (uuid)
 */
export const getSignedCloudFrontCookies = (uuid, expiresInSeconds = 1800) => {
  const wildcardResource = `https://${domain}/${uuid}/*`;
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const policy = JSON.stringify({
    Statement: [
      {
        Resource: wildcardResource,
        Condition: {
          DateLessThan: { "AWS:EpochTime": expires },
        },
      },
    ],
  });

  return getSignedCookies({
    keyPairId,
    privateKey,
    policy,
  });
};
