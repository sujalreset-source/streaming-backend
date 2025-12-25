import { Types } from "mongoose";
import { Playlist } from "../models/Playlist.js";
import { Song } from "../models/Song.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { StatusCodes } from "http-status-codes";

// Utils
const isValidObjectId = (id) => Types.ObjectId.isValid(id);

/**
 * @desc    Create a new playlist (admin only)
 * @route   POST /api/admin/playlists
 * @access  Admin
 */
export const createPlaylist = async (req, res) => {
  const { title, description = "", image = "" } = req.body;

  if (!title || typeof title !== "string" || title.trim().length < 1) {
    throw new BadRequestError("Title is required and must be a non-empty string.");
  }

  const playlist = await Playlist.create({
    title: title.trim(),
    description: description.trim(),
    image: image.trim(),
    createdBy: req.user._id,
    songs: [],
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Playlist created successfully.",
    playlist,
  });
};

/**
 * @desc    Update an existing playlist
 * @route   PATCH /api/admin/playlists/:playlistId
 * @access  Admin
 */
export const updatePlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { title, description, image } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new BadRequestError("Invalid playlist ID.");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new NotFoundError("Playlist not found.");

  if (title && typeof title === "string") playlist.title = title.trim();
  if (description && typeof description === "string") playlist.description = description.trim();
  if (image && typeof image === "string") playlist.image = image.trim();

  await playlist.save();

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Playlist updated successfully.",
    playlist,
  });
};

/**
 * @desc    Delete a playlist
 * @route   DELETE /api/admin/playlists/:playlistId
 * @access  Admin
 */
export const deletePlaylist = async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new BadRequestError("Invalid playlist ID.");
  }

  const deleted = await Playlist.findByIdAndDelete(playlistId);
  if (!deleted) throw new NotFoundError("Playlist not found.");

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Playlist deleted successfully.",
  });
};

/**
 * @desc    Add a song to a playlist
 * @route   POST /api/admin/playlists/:playlistId/songs
 * @access  Admin
 */
export const addSongToPlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { songId } = req.body;

  if (!isValidObjectId(playlistId) || !isValidObjectId(songId)) {
    throw new BadRequestError("Invalid playlist or song ID.");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new NotFoundError("Playlist not found.");

  if (playlist.songs.includes(songId)) {
    throw new BadRequestError("Song already exists in the playlist.");
  }

  const songExists = await Song.exists({ _id: songId });
  if (!songExists) throw new NotFoundError("Song not found.");

  playlist.songs.push(songId);
  await playlist.save();

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Song added to playlist.",
    playlist,
  });
};

/**
 * @desc    Remove a song from a playlist
 * @route   DELETE /api/admin/playlists/:playlistId/songs/:songId
 * @access  Admin
 */
export const removeSongFromPlaylist = async (req, res) => {
  const { playlistId, songId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(songId)) {
    throw new BadRequestError("Invalid playlist or song ID.");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new NotFoundError("Playlist not found.");

  const initialLength = playlist.songs.length;
  playlist.songs = playlist.songs.filter(
    (id) => id.toString() !== songId
  );

  if (playlist.songs.length === initialLength) {
    throw new NotFoundError("Song not found in playlist.");
  }

  await playlist.save();

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Song removed from playlist.",
    playlist,
  });
};

/**
 * @desc    Get all playlists with pagination
 * @route   GET /api/admin/playlists
 * @access  Admin
 */
export const getAllPlaylists = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [playlists, total] = await Promise.all([
    Playlist.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("songs", "title duration")
      .populate("createdBy", "name email"),
    Playlist.countDocuments(),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    playlists,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};


/**
 * @desc    Get a playlist by its ID
 * @route   GET /api/admin/playlists/:playlistId
 * @access  Admin
 */
export const getPlaylistById = async (req, res) => {
  const { playlistId } = req.params;

  if (!Types.ObjectId.isValid(playlistId)) {
    throw new BadRequestError("Invalid playlist ID.");
  }

  const playlist = await Playlist.findById(playlistId)
    .populate("songs", "title duration artist album") // adjust fields as needed
    .populate("createdBy", "name email");

  if (!playlist) {
    throw new NotFoundError("Playlist not found.");
  }

  res.status(StatusCodes.OK).json({
    success: true,
    playlist,
  });
};

