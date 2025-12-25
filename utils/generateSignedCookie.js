// utils/generateSignedCookies.js
import { getSignedCookies } from "@aws-sdk/cloudfront-signer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const privateKey = fs.readFileSync(
  path.resolve("cloudfront-private.pem"), // your private key file
  "utf8"
);

const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
const cloudfrontDomain = "d1iyo8q9rtx7ct.cloudfront.net";
const folderUUID = "49ca9ec7-b7c5-4af6-9bf7-ec7cb945ef72";

// Sign wildcard path
const resource = `https://${cloudfrontDomain}/${folderUUID}/*`;

// Expiry (1 hour)
const expiresIn = Math.floor(Date.now() / 1000) + 60 * 60;

const cookies = getSignedCookies({
  keyPairId,
  privateKey,
  policy: JSON.stringify({
    Statement: [
      {
        Resource: resource,
        Condition: {
          DateLessThan: { "AWS:EpochTime": expiresIn },
        },
      },
    ],
  }),
});

console.log("Copy and paste these cookies into your browser:");
Object.entries(cookies).forEach(([k, v]) => {
  console.log(`${k}=${v}; Domain=.${cloudfrontDomain}; Path=/; HttpOnly`);
});
