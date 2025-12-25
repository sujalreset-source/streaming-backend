import {Artist} from "../models/Artist.js";
import {Song} from "../models/Song.js";
import {Album} from "../models/Album.js";
import { StatusCodes } from "http-status-codes";
import { shapeSongResponse } from "../dto/song.dto.js";
import { shapeArtistResponse } from "../dto/artist.dto.js";
import { shapeAlbumResponse} from "../dto/album.dto.js";
import  { hasAccessToSong } from "../utils/accessControl.js";

/**
 * Unified search across artists, songs, and albums.
 * Supports pagination and input validation.
 * Example: GET /api/search?q=love&page=1&limit=10
 */
export const unifiedSearch = async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) throw new BadRequestError("Query parameter 'q' is required.");

  // Escape special regex characters
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escapeRegex(q), "i");

  const artistLimit = 3;
  const songLimit = 5;
  const albumLimit = 3;

  const [artists, songs, albums] = await Promise.all([
    Artist.find({ name: regex }).limit(artistLimit).lean(),
    Song.find({ title: regex })
      .limit(songLimit)
      .populate("artist", "name slug")
      .populate({
        path: "album",
        select: "title slug",
        populate: { path: "artist", select: "name slug" },
      })
      .lean(),
    Album.find({ title: regex })
      .limit(albumLimit)
      .populate("artist", "name slug")
      .lean(),
  ]);

  
const [shapedArtists, shapedSongs, shapedAlbums] = await Promise.all([
  Promise.all(artists.map(shapeArtistResponse)),
  Promise.all(songs.map(shapeSongResponse)),
  Promise.all(albums.map(shapeAlbumResponse)),
]);

  
 
  

  res.status(StatusCodes.OK).json({
    success: true,
    query: q,
    results: {
      artists: shapedArtists,
      songs: shapedSongs,
      albums: shapedAlbums,
    },
  });
};


// @desc Search songs by title with pagination
// @route GET /api/search/songs?q=term&page=1&limit=10
// @access Public
export const searchSongs = async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) throw new BadRequestError("Query 'q' is required.");

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [songs, total] = await Promise.all([
    Song.find({ title: regex })
      .skip(skip)
      .limit(limit)
      .populate("artist", "name slug")
      .populate("album", "title slug")
      .lean(),
    Song.countDocuments({ title: regex }),
  ]);

  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(req.user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  res.status(StatusCodes.OK).json({
    success: true,
    query: q,
    results: shapedSongs,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};



// @desc Search artists by name with pagination
// @route GET /api/search/artists?q=term&page=1&limit=10
// @access Public
export const searchArtists = async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) throw new BadRequestError("Query parameter 'q' is required.");

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [artists, total] = await Promise.all([
    Artist.find({ name: regex }).skip(skip).limit(limit).lean(),
    Artist.countDocuments({ name: regex }),
  ]);

  const shapedArtists = await Promise.all(
    artists.map(async (artist) => await shapeArtistResponse(artist))
  );

  res.status(StatusCodes.OK).json({
    success: true,
    query: q,
    results: shapedArtists,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}



// @desc Search albums by title with pagination
// @route GET /api/search/albums?q=term&page=1&limit=10
// @access Public
export const searchAlbums = async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) throw new BadRequestError("Query parameter 'q' is required.");

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [albums, total] = await Promise.all([
    Album.find({ title: regex })
      .populate("artist", "name slug")
      .populate("songs", "title duration coverImage")
      .skip(skip)
      .limit(limit)
      .lean(),
    Album.countDocuments({ title: regex }),
  ]);

  const shapedAlbums = albums.map((album) => shapeAlbumCard(album));

  res.status(StatusCodes.OK).json({
    success: true,
    query: q,
    results: shapedAlbums,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};

