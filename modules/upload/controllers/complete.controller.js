// // complete.controller.js
// import { completeUploadService } from "../services/complete.service.js";

// export const completeUploadController = async (req, res, next) => {
//   try {
//     const { sessionUuid, uploadId, parts, checksum } = req.body;
//     const artistId = req.user._id;

//     const response = await completeUploadService({
//       sessionUuid,
//       uploadId,
//       parts,
//       checksum,
//       artistId,
//     });

//     return res.status(200).json(response);
//   } catch (err) {
//     next(err);
//   }
// };


// complete.controller.js
import { completeUploadService } from "../services/complete.service.js";

export const completeUploadController = async (req, res, next) => {
  try {
    const { sessionUuid, uploadId, parts, checksum } = req.body;
    // artistId from verifyUploadToken or requireAuth middleware
    const artistId = req.user && (req.user._id || req.user.artistId);
    if (!artistId) {
      const err = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }

    const result = await completeUploadService({
      sessionUuid,
      uploadId,
      parts,
      checksum,
      artistId,
    });

    return res.status(200).json(result);
  } catch (err) {
    // normalize error
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    return res.status(status).json({ success: false, message, details: err.cause || null });
  }
};




///////IAM policy snippet (to be placed in your infra repo — Terraform/CDK)

// {
//   "Version": "2012-10-17",
//   "Statement": [
//     {
//       "Sid": "UploadCopyDelete",
//       "Effect": "Allow",
//       "Action": [
//         "s3:GetObject",
//         "s3:PutObject",
//         "s3:CopyObject",
//         "s3:DeleteObject"
//       ],
//       "Resource": "arn:aws:s3:::<YOUR_BUCKET_NAME>/*"
//     },
//     {
//       "Sid": "ListBucketIfNeeded",
//       "Effect": "Allow",
//       "Action": ["s3:ListBucket"],
//       "Resource": "arn:aws:s3:::<YOUR_BUCKET_NAME>"
//     }
//   ]
// }
