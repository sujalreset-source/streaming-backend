import { uploadToS3 } from "../utils/s3Uploader.js";
import { Album } from "../models/Album.js";

export const uploadAudioFile = async (audioFile) => {
  if (!audioFile) throw new Error("Audio file required");
  return audioFile.location; // Already uploaded via Multer+S3 middleware
};

export const getCoverImage = async (coverFile, albumId) => {
  if (coverFile) return coverFile.location;
  if (albumId) {
    const album = await Album.findById(albumId).select("coverImage").lean();
    return album?.coverImage || "";
  }
  return "";
};
export const uploadCoverImage = async (file) => {
  if (!file) return null;
  return file.location;
};

