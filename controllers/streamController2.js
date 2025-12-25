import { getSignedCloudFrontCookies } from "../utils/cloudfront2.js";
import { Song } from "../models/Song.js";
import { canStreamSong } from "../helpers/accessControl.js";
import { UnauthorizedError, NotFoundError } from "../errors/index.js";

export const streamSong2 = async (req, res) => {
  const { id: songId } = req.params;
  const userId = req.user._id;

  const allowed = await canStreamSong(userId, songId);
  if (!allowed) throw new UnauthorizedError("You do not have access to stream this song.");

  const song = await Song.findById(songId).lean();
  if (!song || !song.audioKey) throw new NotFoundError("Song not found or missing audioKey");

  // HLS master playlist URL (not signed)
  const streamUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${song.audioKey}/${song.audioKey}_hls.m3u8`;

  // Create signed cookies for CloudFront
  const signedCookies = getSignedCloudFrontCookies(song.audioKey);

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    domain: process.env.COOKIE_DOMAIN,
    path: "/",
  };

  res.cookie("CloudFront-Policy", signedCookies["CloudFront-Policy"], cookieOptions);
  res.cookie("CloudFront-Signature", signedCookies["CloudFront-Signature"], cookieOptions);
  res.cookie("CloudFront-Key-Pair-Id", signedCookies["CloudFront-Key-Pair-Id"], cookieOptions);

  res.json({ url: streamUrl });
};
