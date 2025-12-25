import { Song } from "../models/Song.js";
import { uploadToS3 } from "../utils/s3Uploader.js";
import { Album } from "../models/Album.js";
import { Artist } from "../models/Artist.js";
import { Transaction } from "../models/Transaction.js"
import { User } from "../models/User.js";
import { hasAccessToSong } from "../utils/accessControl.js";
import mongoose from "mongoose";
import { BadRequestError, UnauthorizedError, NotFoundError } from "../errors/index.js";
import { StatusCodes } from 'http-status-codes';
import { isAdmin } from "../utils/authHelper.js";
import { log } from "console";
import { shapeSongResponse } from "../dto/song.dto.js";
import { streamSong } from "./streamController.js";




// ===================================================================
// @desc    Create a new song (Admin only)
// @route   POST /api/songs
// @access  Admin
// ===================================================================
export const createSong = async (req, res) => {
  if (!isAdmin(req.user)) {
    throw new UnauthorizedError("Access denied. Admins only.");
  }

  let {
    title,
    artist,
    genre,
    duration,
    price,
    accessType,
    releaseDate,
    albumOnly,
    album,
  } = req.body;

  if (!title || !artist || !duration) {
    throw new BadRequestError("Title, artist, and duration are required fields.");
  }

  if (typeof genre === "string") {
    genre = genre.split(",").map((g) => g.trim());
  }

  if (typeof albumOnly === "string") {
    albumOnly = albumOnly === "true";
  }

  if (typeof price === "string") {
    price = parseFloat(price);
  }

  if (accessType === "purchase-only" && !albumOnly && (!price || price <= 0)) {
    throw new BadRequestError("Purchase-only songs must have a valid price.");
  }

  let finalPrice = 0;
  if (accessType === "purchase-only") {
    finalPrice = albumOnly ? 0 : price;
  }

  // ✅ File checks
  if (!req.files?.audio?.[0]) {
    throw new BadRequestError("Audio file is required.");
  }

  const albumImage  = await Album.findById(album).select("coverImage").lean();

  const audioUrl = req.files.audio[0].location;
  const coverImageUrl = req.files?.coverImage?.[0]?.location || albumImage?.coverImage || "";
 

  const audioKey = audioUrl.split("/").pop().replace(/\.[^/.]+$/, "");

  
  const newSong = await Song.create({
    title,
    artist,
    album: album || null,
    genre,
    duration,
    accessType: accessType || "subscription",
    price: finalPrice,
    releaseDate,
    coverImage: coverImageUrl,
    albumOnly: albumOnly || false,
    audioUrl,
    audioKey,
  });

  if (album) {
    await Album.findByIdAndUpdate(album, {
      $push: { songs: newSong._id },
    });
  }

  const populated = await Song.findById(newSong._id)
    .populate("artist", "name image slug")
    .populate("album", "title coverImage")
    .lean();

  const response = shapeSongResponse(populated, false);

  res.status(StatusCodes.CREATED).json({
    success: true,
    song: response,
  });
};






// ===================================================================
// @desc    Update an existing song (Admin only)
// @route   PUT /api/songs/:id
// @access  Admin
// ===================================================================
export const updateSong = async (req, res) => {
  if (!isAdmin(req.user)) {
    throw new UnauthorizedError("Access denied. Admins only.");
  }

  const song = await Song.findById(req.params.id);
  if (!song) {
    throw new NotFoundError("Song not found");
  }

  let {
    title,
    artist,
    genre,
    duration,
    price,
    accessType,
    releaseDate,
    album,
  } = req.body;

  if (typeof genre === "string") {
    genre = genre.split(",").map((g) => g.trim());
  }

  // 🔼 Optional: Upload new cover/audio if provided
  if (req.files?.coverImage?.[0]) {
    song.coverImage = await uploadToS3(req.files.coverImage[0], "covers");
  }

  if (req.files?.audio?.[0]) {
    song.audioUrl = await uploadToS3(req.files.audio[0], "songs");

    // Optional: update audioKey as well
    song.audioKey = song.audioUrl.split("/").pop().replace(/\.[^/.]+$/, "");
  }

  const oldAlbumId = song.album?.toString();
  const newAlbumId = album || null;

  Object.assign(song, {
    title,
    artist,
    genre,
    duration,
    price,
    accessType,
    releaseDate,
    album: newAlbumId,
  });

  await song.save();

  // 🔁 Update album references if changed
  if (oldAlbumId && oldAlbumId !== newAlbumId) {
    await Album.findByIdAndUpdate(oldAlbumId, {
      $pull: { songs: song._id },
    });
  }

  if (newAlbumId && oldAlbumId !== newAlbumId) {
    await Album.findByIdAndUpdate(newAlbumId, {
      $addToSet: { songs: song._id },
    });
  }

  // 📦 Re-fetch the updated song with populated artist/album
  const updatedSong = await Song.findById(song._id)
    .populate("artist", "name image slug")
    .populate("album", "title coverImage")
    .lean();

  const shaped = shapeSongResponse(updatedSong, false); // no access yet

  res.status(StatusCodes.OK).json({ success: true, song: shaped });
};



// ===================================================================
// @desc    Delete a song by ID (Admin only)
// @route   DELETE /api/songs/:id
// @access  Admin
// ===================================================================
export const deleteSong = async (req, res) => {
  // 🔐 Authorization check
  if (!isAdmin(req.user)) {
    throw new UnauthorizedError("Access denied. Admins only.");
  }

  const { id } = req.params;

  // ✅ Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError("Invalid song ID");
  }

  // 🔍 Find the song
  const song = await Song.findById(id);
  if (!song) {
    throw new NotFoundError("Song not found");
  }

  // 🧹 Remove song reference from album if present
  if (song.album) {
    await Album.findByIdAndUpdate(song.album, {
      $pull: { songs: song._id },
    });
  }

  // ☁️ Optionally: delete files from S3
  // await deleteFromS3(song.audioUrl);
  // if (song.coverImage) await deleteFromS3(song.coverImage);

  // 🗑️ Delete the song
  await song.deleteOne();

  // ✅ Response
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Song deleted successfully",
  });
};



// ===================================================================
// @desc    Get all songs with filtering, sorting, and pagination
// @route   GET /api/songs
// @access  Authenticated users
// ===================================================================
export const getAllSongs = async (req, res) => {
  const user = req.user;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;
  const type = req.query.type || "all";
  const artistId = req.query.artistId || null;

  // Base query - only songs with null album (single songs)
  let query = {};
  let sortOption = { createdAt: -1 };

  switch (type) {
    case "recent":
      sortOption = { createdAt: -1 };
      break;
    case "top":
      sortOption = { playCount: -1 }; // Optional if `playCount` exists
      break;
    case "similar":
      if (!artistId) throw new BadRequestError("artistId is required for similar songs");
      query.artist = artistId;
      // album: null condition already included in base query
      break;
  }

  const totalSongs = await Song.countDocuments(query);

  const songs = await Song.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .populate("artist", "name image slug")
    .populate("album", "title coverImage") // This won't populate anything since album is null
    .lean();

  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  res.status(StatusCodes.OK).json({
    success: true,
    type,
    currentPage: page,
    totalPages: Math.ceil(totalSongs / limit),
    totalSongs,
    songs: shapedSongs,
  });
};

export const getAllSingles = async (req, res) => {
  const user = req.user;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;
  const type = req.query.type || "all";
  const artistId = req.query.artistId || null;

  // Base query - only songs with null album (single songs)
  let query = { album: null };
  let sortOption = { createdAt: -1 };

  switch (type) {
    case "recent":
      sortOption = { createdAt: -1 };
      break;
    case "top":
      sortOption = { playCount: -1 }; // Optional if `playCount` exists
      break;
    case "similar":
      if (!artistId) throw new BadRequestError("artistId is required for similar songs");
      query.artist = artistId;
      // album: null condition already included in base query
      break;
  }

  const totalSongs = await Song.countDocuments(query);

  const songs = await Song.find(query)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .populate("artist", "name image slug")
    .populate("album", "title coverImage") // This won't populate anything since album is null
    .lean();

  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  res.status(StatusCodes.OK).json({
    success: true,
    type,
    currentPage: page,
    totalPages: Math.ceil(totalSongs / limit),
    totalSongs,
    songs: shapedSongs,
  });
};




// ===================================================================
// @desc    Get a single song by ID or slug
// @route   GET /api/songs/:id
// @access  Authenticated users
// ===================================================================
export const getSongById = async (req, res) => {
  const { id } = req.params;
  
  

  // Validate ID type
  const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

  const song = await Song.findOne(isValidObjectId ? { _id: id } : { slug: id })
    .populate("artist", "name image slug")
    .populate("album", "title coverImage")
    .lean();

  if (!song) {
    throw new NotFoundError("Song not found");
  }

  // Check user access to song
  const hasAccess = await hasAccessToSong(req.user, song);

  const shaped = shapeSongResponse(song, hasAccess);

  
   
  res.status(StatusCodes.OK).json({ success: true, song: shaped });
};




// ===================================================================
// @desc    Get songs matching user’s preferred and purchased genres (paginated)
// @route   GET /api/songs/matching-genres?page=1&limit=20
// @access  Authenticated users
// ===================================================================
export const getSongsMatchingUserGenres = async (req, res) => {
  // 1. Get user and their purchased songs
  const user = await User.findById(req.user._id)
  .populate({
    path: "purchasedSongs",
    select: "genre",
  });

  if (!user) throw new NotFoundError("User not found");

  // 2. Collect unique genres
  const genreSet = new Set();

  // for (const song of user.purchasedSongs) {
  //   const genres = Array.isArray(song.genre) ? song.genre : [song.genre];
  //   genres.forEach((g) => g && genreSet.add(g.trim().toLowerCase()));
  // }

  if (Array.isArray(user.preferredGenres)) {
    user.preferredGenres.forEach((g) => g && genreSet.add(g.trim().toLowerCase()));
  }

  const genreArray = [...genreSet];
  if (genreArray.length === 0) {
    return res.status(StatusCodes.OK).json({
      success: true,
      matchingGenres: [],
      songs: [],
      total: 0,
      page: 1,
      pages: 0,
    });
  }

  // 3. Pagination
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;

  // 4. Fetch matching songs
  const [songs, total] = await Promise.all([
    Song.find({ genre: { $in: genreArray } })
      .populate("artist", "name image slug")
      .populate("album", "title coverImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Song.countDocuments({ genre: { $in: genreArray } }),
  ]);

  // 5. Shape response + hide audio if no access
  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  // 6. Final response
  res.status(StatusCodes.OK).json({
    success: true,
    matchingGenres: genreArray,
    songs: shapedSongs,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};

// ===================================================================
// @desc    Get songs by genre with pagination
// @route   GET /api/songs?genre=pop&page=1&limit=20
// @access  Public
// ===================================================================
export const getSongsByGenre = async (req, res) => {
  const user = req.user;
  const { genre } = req.params;


  // 1. Extract and validate query parameters
  const {  page = 1, limit = 20 } = req.query;


  const currentPage = Math.max(1, parseInt(page, 10));
  const pageLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (currentPage - 1) * pageLimit;

  // 2. Build genre query (case-insensitive match)
  const query = genre
    ? { genre: { $regex: new RegExp(genre, "i") } }
    : {};
    

  // 3. Fetch paginated songs and count
  const [songs, total] = await Promise.all([
    Song.find(query)
      .sort({ releaseDate: -1 })
      .skip(skip)
      .limit(pageLimit)
      .populate("artist", "name image slug")
      .populate("album", "title coverImage")
      .lean(),
    Song.countDocuments(query),
  ]);

  // 4. Shape and secure each song
  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  // 5. Return structured response
  res.status(StatusCodes.OK).json({
    success: true,
    genre: genre || null,
    total,
    page: currentPage,
    pages: Math.ceil(total / pageLimit),
    songs: shapedSongs,
  });
};


// ===================================================================
// @desc    Get songs by artist ID or slug, with pagination
// @route   GET /api/songs/by-artist/:artistId?page=1&limit=20
// @access  Public
// ===================================================================
export const getSongsByArtist = async (req, res) => {
  const { artistId } = req.params;

  // 1. Sanitize pagination
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // 2. Resolve artist (ObjectId or slug)
  const artistQuery = mongoose.Types.ObjectId.isValid(artistId)
    ? { _id: artistId }
    : { slug: artistId };

  const artist = await Artist.findOne(artistQuery).lean();
  if (!artist) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Artist not found" });
  }

  // 3. Query songs by artist
  const query = { artist: artist._id };
  const [songs, total] = await Promise.all([
    Song.find(query)
      .sort({ releaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("artist", "name image slug")
      .populate("album", "title coverImage")
      .lean(),
    Song.countDocuments(query),
  ]);
 

  // 4. Access control + shaping
  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(req.user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  // 5. Final response
  res.status(StatusCodes.OK).json({
    success: true,
    artist: {
      id: artist._id,
      name: artist.name,
      slug: artist.slug,
      image: artist.image || null,
    },
    songs: shapedSongs,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};


export const getSinglesByArtist = async (req, res) => {
  const { artistId } = req.params;

  // 1️⃣ Sanitize pagination
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // 2️⃣ Resolve artist (ObjectId or slug)
  const artistQuery = mongoose.Types.ObjectId.isValid(artistId)
    ? { _id: artistId }
    : { slug: artistId };

  const artist = await Artist.findOne(artistQuery).lean();
  if (!artist) {
    return res.status(404).json({ message: "Artist not found" });
  }

  // 3️⃣ Query songs that are NOT part of an album
  const query = { artist: artist._id, album: null };
  const [songs, total] = await Promise.all([
    Song.find(query)
      .sort({ releaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("artist", "name image slug")
      .lean(),
    Song.countDocuments(query),
  ]);

  // 4️⃣ Access control + DTO shaping
  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(req.user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  // 5️⃣ Final response
  res.status(200).json({
    success: true,
    artist: {
      id: artist._id,
      name: artist.name,
      slug: artist.slug,
      image: artist.image || null,
    },
    songs: shapedSongs,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};


// ===================================================================
// @desc    Get songs by album ID or slug with pagination
// @route   GET /api/songs/by-album/:albumId?page=1&limit=20
// @access  Public
// ===================================================================
export const getSongsByAlbum = async (req, res) => {
  const { albumId } = req.params;

  // 1. Parse pagination safely
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // 2. Find album by ID or slug
  const albumQuery = mongoose.Types.ObjectId.isValid(albumId)
    ? { _id: albumId }
    : { slug: albumId };

  const album = await Album.findOne(albumQuery).lean();
  if (!album) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Album not found" });
  }

  // 3. Query songs in the album
  const query = { album: album._id };

  const [songs, total] = await Promise.all([
    Song.find(query)
      .sort({ releaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("artist", "name image slug")
      .populate("album", "title coverImage")
      .lean(),
    Song.countDocuments(query),
  ]);

  // 4. Apply access rules + shape
  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(req.user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  // 5. Respond
  res.status(StatusCodes.OK).json({
    success: true,
    album: {
      id: album._id,
      title: album.title,
      slug: album.slug,
      coverImage: album.coverImage || "",
    },
    songs: shapedSongs,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};


// ===================================================================
// @desc    Get all purchased songs for the authenticated user
// @route   GET /api/songs/purchased?page=1&limit=20
// @access  Private
// ===================================================================
export const getPurchasedSongs = async (req, res) => {
  // 1. Pagination
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // 2. Fetch user's purchased song IDs only
  const user = await User.findById(req.user._id).select("purchasedSongs").lean();
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  // 3. Paginated query on songs
  const [songs, total] = await Promise.all([
    Song.find({ _id: { $in: user.purchasedSongs } })
      .sort({ releaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("artist", "name image slug")
      .populate("album", "title coverImage")
      .lean(),
    Song.countDocuments({ _id: { $in: user.purchasedSongs } }),
  ]);

  // 4. Shape and apply access control
  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(req.user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  // 5. Response
  res.status(StatusCodes.OK).json({
    success: true,
    songs: shapedSongs,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};


// ===================================================================
// @desc    Get all premium songs with access control and pagination
// @route   GET /api/songs/premium?page=1&limit=20
// @access  Private (user must be logged in)
// ===================================================================
export const getPremiumSongs = async (req, res) => {
  const user = req.user;

  // 1. Pagination
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // 2. Get count and data in parallel
  const [total, songs] = await Promise.all([
    Song.countDocuments({ accessType: "purchase-only" }),
    Song.find({ accessType: "purchase-only" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("artist", "name image slug")
      .populate("album", "title coverImage")
      .lean()
  ]);

  // 3. Shape response with access control
  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  // 4. Send response
  res.status(StatusCodes.OK).json({
    success: true,
    songs: shapedSongs,
    total,
    page,
    pages: Math.ceil(total / limit)
  });
};




// ===================================================================
// @desc    Get paginated liked songs by song IDs
// @route   POST /api/songs/liked
// @access  Private
// ===================================================================
export const getLikedSongs = async (req, res) => {
  const userId = req.user._id;

  // 1. Pagination setup
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  // 2. Get liked song IDs only
  const user = await User.findById(userId).select("likedsong").lean();
  if (!user) throw new NotFoundError("User not found");

  const total = user.likedsong.length;
  const paginatedIds = user.likedsong.slice(skip, skip + limit);

  // 3. Get song details from Song model
  const songs = await Song.find({ _id: { $in: paginatedIds } })
    .populate("artist", "name image slug")
    .populate("album", "title coverImage")
    .lean();

  // 4. Shape and filter songs based on access
  const shapedSongs = await Promise.all(
    songs.map(async (song) => {
      const hasAccess = await hasAccessToSong(req.user, song);
      return shapeSongResponse(song, hasAccess);
    })
  );

  // 5. Response
  res.status(StatusCodes.OK).json({
    success: true,
    songs: shapedSongs,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};





