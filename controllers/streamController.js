import { Song } from "../models/Song.js";
import { Album } from "../models/Album.js";
import { getSignedCloudFrontUrl as getSignedUrl } from "../utils/cloudfront.js";
import { canStreamSong, canStreamAlbum } from "../helpers/accessControl.js";
import { UnauthorizedError, NotFoundError } from "../errors/index.js";

// ✅ Stream a single song
export const streamSong = async (req, res) => {

  const { id: songId } = req.params;
  const userId = req.user._id;

  const allowed = await canStreamSong(userId, songId);
  if (!allowed) throw new UnauthorizedError("You do not have access to stream this song.");

  const song = await Song.findById(songId).lean();
  if (!song || !song.audioKey) throw new NotFoundError("Song not found or missing audio key.");


  const signedUrl = await getSignedUrl(song.audioKey); // e.g., songs-hls/{key}.m3u8
  res.json({ url: signedUrl });
  console.log("Signed URL generated:", signedUrl);
};

// ✅ Stream all songs in an album
export const streamAlbum = async (req, res) => {
  const { id: albumId } = req.params;
  const userId = req.user._id;

  const allowed = await canStreamAlbum(userId, albumId);
  if (!allowed) throw new UnauthorizedError("You do not have access to stream this album.");

  const album = await Album.findById(albumId).populate("songs").lean();
  if (!album || !album.songs?.length) throw new NotFoundError("Album not found or has no songs.");

  const urls = await Promise.all(
    album.songs.map((song) => getSignedUrl(song.audioKey))
  );

  res.json({ urls });
};
