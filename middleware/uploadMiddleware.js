// uploadMiddleware.js
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Dynamic folder storage for songs & covers (same level)
const dynamicSongStorage = multerS3({
  s3: s3Client,
  bucket: process.env.AWS_S3_BUCKET,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    // Choose folder based on the field name
    let folder;
    if (file.fieldname === "audio") {
      folder = "songs"; // audio goes to /songs
    } else if (file.fieldname === "coverImage") {
      folder = "covers"; // cover image goes to /covers
       } else if (file.fieldname === "documents") {
      folder = "documents"; // cover image goes to /covers
    } else {
      folder = "other";
    }

    const filename = `${folder}/${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// Song upload: audio in /songs, cover in /covers
export const songUpload = multer({
  storage: dynamicSongStorage,
}).fields([
  { name: "audio", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
  { name: "documents", maxCount: 1 },
]);

// Single cover image upload (for albums)
export const singleImageUpload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `covers/${uuidv4()}${ext}`;
      cb(null, filename);
    },
  }),
}).fields([{ name: "coverImage", maxCount: 1 }]);


// uploadMiddleware.js
// import multer from "multer";
// import multerS3 from "multer-s3";
// import { S3Client } from "@aws-sdk/client-s3";
// import path from "path";
// import { v4 as uuidv4 } from "uuid";
// import { BadRequestError } from "../errors/index.js";

// /* -------------------- S3 Client -------------------- */

// const s3Client = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// /* -------------------- Constants -------------------- */

// const AUDIO_MIME_TYPES = [
//   "audio/mpeg",
//   "audio/wav",
//   "audio/flac",
//   "audio/aac",
// ];

// const IMAGE_MIME_TYPES = [
//   "image/jpeg",
//   "image/png",
//   "image/webp",
// ];

// const MAX_AUDIO_SIZE = 1000 * 1024 * 1024; // 1000 MB
// const MAX_IMAGE_SIZE = 100 * 1024 * 1024;  // 100 MB

// /* -------------------- File Filter -------------------- */

// const fileFilter = (req, file, cb) => {
//   if (file.fieldname === "audio") {
//     return AUDIO_MIME_TYPES.includes(file.mimetype)
//       ? cb(null, true)
//       : cb(new BadRequestError("Invalid audio file type"), false);
//   }

//   if (file.fieldname === "coverImage") {
//     return IMAGE_MIME_TYPES.includes(file.mimetype)
//       ? cb(null, true)
//       : cb(new BadRequestError("Invalid image file type"), false);
//   }

//   if (file.fieldname === "documents") {
//     return cb(null, true); // optional docs (you can harden later)
//   }

//   cb(new BadRequestError("Unexpected file field"), false);
// };

// /* -------------------- S3 Storage -------------------- */

// const s3Storage = multerS3({
//   s3: s3Client,
//   bucket: process.env.AWS_S3_BUCKET,
//   contentType: multerS3.AUTO_CONTENT_TYPE,
//   key: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const artistId = req.user?.artistId || "unknown";

//     let folder = "other";
//     if (file.fieldname === "audio") folder = "songs";
//     if (file.fieldname === "coverImage") folder = "covers";
//     if (file.fieldname === "documents") folder = "documents";

//     const key = `${folder}/${artistId}/${uuidv4()}${ext}`;
//     cb(null, key);
//   },
// });

// /* -------------------- Middlewares -------------------- */

// // 🎵 Song upload: audio + optional cover + optional docs
// export const songUpload = multer({
//   storage: s3Storage,
//   fileFilter,
//   limits: {
//     fileSize: MAX_AUDIO_SIZE,
//   },
// }).fields([
//   { name: "audio", maxCount: 1 },
//   { name: "coverImage", maxCount: 1 },
//   { name: "documents", maxCount: 1 },
// ]);

// // 🖼️ Album cover upload only
// export const singleImageUpload = multer({
//   storage: s3Storage,
//   fileFilter,
//   limits: {
//     fileSize: MAX_IMAGE_SIZE,
//   },
// }).fields([{ name: "coverImage", maxCount: 1 }]);
// uploadMiddleware.js
