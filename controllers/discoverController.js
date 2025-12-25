import { Artist } from "../models/Artist.js";
import { Song } from "../models/Song.js";
import { StatusCodes } from "http-status-codes";
import { Album } from "../models/Album.js";
import { shapeAlbumResponse } from "../dto/album.dto.js";
import { shapeSongResponse } from "../dto/song.dto.js";

export const getRandomArtistWithSongs = async (req, res) => {
  const totalArtists = await Artist.countDocuments();
  if (totalArtists === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: "No artists found"
    });
  }

  // Pick a random artist
  const randomIndex = Math.floor(Math.random() * totalArtists);
  const artist = await Artist.findOne().skip(randomIndex).lean();

  if (!artist) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: "Random artist not found"
    });
  }

  // Pagination params
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  // Get total songs by the artist
  const totalSongs = await Song.countDocuments({ artist: artist._id });

  // Get paginated songs
  const songs = await Song.find({ artist: artist._id })
    .select("_id title coverImage duration")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(StatusCodes.OK).json({
    success: true,
    artist: {
      _id: artist._id,
      name: artist.name,
      slug: artist.slug,
      image: artist.image,
    },
    songs,
    pagination: {
      total: totalSongs,
      page,
      limit,
      totalPages: Math.ceil(totalSongs / limit)
    }
  });
};


export const getExploreFeed = async (req, res) => {
  try {
    // 🎲 Randomly fetch 10 albums and 10 songs
    const [albums, songs] = await Promise.all([
      Album.aggregate([{ $sample: { size: 10 } }]),
      Song.aggregate([{ $sample: { size: 10 } }]),
    ]);

    // 🧩 Shape + merge + shuffle the combined feed
    const feed = [
      ...albums.map(a => ({ type: "album", data: shapeAlbumResponse(a) })),
      ...songs.map(s => ({ type: "song", data: shapeSongResponse(s) })),
    ].sort(() => Math.random() - 0.5);

    res.status(StatusCodes.OK).json({ success: true, feed });
  } catch (err) {
    console.error("Error generating explore feed:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to load explore feed ",
    });
  }
};