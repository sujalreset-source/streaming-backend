import { User } from "../models/User.js";
import { hasAccessToSong } from "../utils/accessControl.js";
import {Song} from "../models/Song.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import mongoose from "mongoose";
import { StatusCodes } from 'http-status-codes';
import { Playlist } from "../models/Playlist.js";
import { shapeUserResponse } from "../dto/user.dto.js";
import { shapeSongResponse } from "../dto/song.dto.js";


// // @desc    Get all playlists for the authenticated user
// // @route   GET /api/playlists
// // @access  Private
// export const getPlaylists = async (req, res) => {
//   const user = await User.findById(req.user._id).select('playlist');
//   if (!user) {
//     throw new NotFoundError('User not found');
//   }

//   const page = Math.max(1, parseInt(req.query.page, 10) || 1);
//   const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
//   const skip = (page - 1) * limit;

//   const totalPlaylists = user.playlist.length;
//   const slicedPlaylists = user.playlist.slice(skip, skip + limit);

//   const playlists = await Promise.all(
//     slicedPlaylists.map(async (playlist) => {
//       const songs = await Song.find({ _id: { $in: playlist.songs } })
//         .populate('artist', 'name')
//         .populate('album', 'title');

//       const filteredSongs = await Promise.all(
//         songs.map(async (song) => {
//           const songObj = song.toObject();
//           const hasAccess = await hasAccessToSong(req.user, song);
//           if (!hasAccess) {
//             songObj.audioUrl = null;
//           }
//           return songObj;
//         })
//       );

//       return {
//         _id: playlist._id,
//         title: playlist.title,
//         description: playlist.description,
//         songs: filteredSongs,
//       };
//     })
//   );

//   res.status(StatusCodes.OK).json({
//     success: true,
//     playlist: playlists,
//     pagination: {
//       total: totalPlaylists,
//       page,
//       limit,
//       totalPages: Math.ceil(totalPlaylists / limit),
//     },
//   });
// };


// // @desc    Create a new playlist for the authenticated user
// // @route   POST /api/playlists
// // @access  Private
// export const createPlaylist = async (req, res) => {
//   const user = await User.findById(req.user._id);
//   if (!user) {
//     throw new NotFoundError('User not found');
//   }

//   // Enforce a limit of 10 playlists per user
//   if (user.playlist.length >= 10) {
//     throw new BadRequestError('You can only create up to 10 playlists');
//   }

//   const { title, description = '' } = req.body;

//   // Basic validation
//   if (!title || typeof title !== 'string' || title.trim().length < 1) {
//     throw new BadRequestError('Playlist title is required');
//   }

//   // Add playlist to user
//   user.playlist.push({
//     title: title.trim(),
//     description: description.trim(),
//     image: '', // Image upload not implemented here
//     songs: [],
//   });

//   await user.save();

//   res.status(StatusCodes.CREATED).json({
//     success: true,
//     message: 'Playlist created successfully',
//     playlist: user.playlist,
//   });
// };



// // ===================================================================
// // @desc    Update a playlist (title/description) for the authenticated user
// // @route   PATCH /api/playlists/:playlistId
// // @access  Private
// // ===================================================================
// export const updatePlaylist = async (req, res) => {
//   const { playlistId } = req.params;
//   const { title, description } = req.body;

//   // Validate user
//   const user = await User.findById(req.user._id);
//   if (!user) {
//     throw new NotFoundError("User not found");
//   }

//   // Find playlist by ID within user's playlists
//   const playlist = user.playlist.id(playlistId);
//   if (!playlist) {
//     throw new NotFoundError("Playlist not found");
//   }

//   // Update fields only if provided
//   if (title && typeof title === "string") {
//     playlist.title = title.trim();
//   }
//   if (description && typeof description === "string") {
//     playlist.description = description.trim();
//   }

//   // Save updated user document
//   await user.save();

//   res.status(StatusCodes.OK).json({
//     success: true,
//     message: "Playlist updated successfully",
//     playlist,
//   });
// };



// // ===================================================================
// // @desc    Delete a playlist by ID for the authenticated user
// // @route   DELETE /api/playlists/:playlistId
// // @access  Private
// // ===================================================================
// export const deletePlaylist = async (req, res) => {
//   const { playlistId } = req.params;

//   // Fetch user
//   const user = await User.findById(req.user._id);
//   if (!user) {
//     throw new NotFoundError("User not found");
//   }

//   // Locate the playlist by ID
//   const playlist = user.playlist.id(playlistId);
//   if (!playlist) {
//     throw new NotFoundError("Playlist not found");
//   }

//   // Remove the playlist from user's subdocument array
//   playlist.deleteOne(); // Mongoose method on subdocument
//   await user.save();

//   // Respond with success
//   res.status(StatusCodes.Ok).json({
//     success: true,
//     message: "Playlist deleted successfully",
//   });
// };



// // ===================================================================
// // @desc    Get a specific playlist by ID for the authenticated user
// // @route   GET /api/playlists/:playlistId
// // @access  Private
// // ===================================================================
// export const getPlaylistById = async (req, res) => {
//   const { playlistId } = req.params;

//   // Fetch user with playlist field only
//   const user = await User.findById(req.user._id).select("playlist");
//   if (!user) {
//     throw new NotFoundError("User not found");
//   }

//   // Locate playlist by ID
//   const playlist = user.playlist.id(playlistId);
//   if (!playlist) {
//     throw new NotFoundError("Playlist not found");
//   }

//   // Populate songs
//   const populatedSongs = await Song.find({ _id: { $in: playlist.songs } })
//     .populate("artist", "name")
//     .populate("album", "title");

//   // Access control: Hide audio URL if user is unauthorized
//   const songsWithAccessControl = await Promise.all(
//     populatedSongs.map(async (song) => {
//       const songData = song.toObject();
//       const hasAccess = await hasAccessToSong(req.user, song);
//       if (!hasAccess) {
//         songData.audioUrl = null;
//       }
//       return songData;
//     })
//   );

//   // Send response
//   res.status(StatusCodes.OK).json({
//     success: true,
//     playlist: {
//       _id: playlist._id,
//       title: playlist.title,
//       description: playlist.description,
//       songs: songsWithAccessControl,
//     },
//   });
// };


// /**
//  * @desc    Add a song to a user's playlist
//  * @route   POST /api/playlists/:playlistId/songs
//  * @access  Private (authenticated users only)
//  */
// export const addSongToPlaylist = async (req, res) => {
//   const user = await User.findById(req.user._id);
//   if (!user) {
//     throw new NotFoundError("User not found");
//   }

//   const { playlistId } = req.params;
//   const { songId } = req.body;

//   if (!songId) {
//     throw new BadRequestError("Song ID is required");
//   }

//   const playlist = user.playlist.id(playlistId);
//   if (!playlist) {
//     throw new NotFoundError("Playlist not found");
//   }

//   if (playlist.songs.includes(songId)) {
//     throw new BadRequestError("Song already exists in playlist");
//   }

//   playlist.songs.push(songId);
//   await user.save();

//   res.status(StatusCodes.OK).json({
//     success: true,
//     message: "Song added to playlist",
//     playlist,
//   });
// };


// /**
//  * @desc    Remove a song from a user's playlist
//  * @route   DELETE /api/playlists/:playlistId/songs/:songId
//  * @access  Private (authenticated users only)
//  */
// export const removeSongFromPlaylist = async (req, res) => {
//   const user = await User.findById(req.user._id);
//   if (!user) {
//     throw new NotFoundError("User not found");
//   }

//   const { playlistId, songId } = req.params;

//   const playlist = user.playlist.id(playlistId);
//   if (!playlist) {
//     throw new NotFoundError("Playlist not found");
//   }

//   const originalLength = playlist.songs.length;
//   playlist.songs = playlist.songs.filter(
//     id => id.toString() !== songId
//   );

//   if (playlist.songs.length === originalLength) {
//     throw new NotFoundError("Song not found in playlist");
//   }

//   await user.save();

//   res.status(StatusCodes.OK).json({
//     success: true,
//     message: "Song removed from playlist",
//     playlist,
//   });
// };

// controllers/playlistController.js
// controllers/playlistController.js
// import { Playlist } from "../models/Playlist.js";
// import mongoose from "mongoose";

export const createPlaylist = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, description, coverImage, isPublic } = req.body;

    // Basic validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Playlist name is required" });
    }

    // Create playlist
    const playlist = await Playlist.create({
      name: name.trim(),
      description: description?.trim() || "",
      coverImage: coverImage || "",
      createdBy: userId,
      isPublic: Boolean(isPublic),
    });

    // Shape the response (DTO)
    const shaped = {
      id: playlist._id,
      name: playlist.name,
      description: playlist.description,
      coverImage: playlist.coverImage,
      isPublic: playlist.isPublic,
      createdBy: userId,
      songs: [],
      songCount: 0,
      createdAt: playlist.createdAt,
    };

    return res.status(201).json({
      message: "Playlist created successfully",
      playlist: shaped,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyPlaylists = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Fetch all playlists by this user
    const playlists = await Playlist.find({ user: userId })
      .select("name description coverImage isPublic songs createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    // Shape DTOs
    const shapedPlaylists = playlists.map((p) => ({
      id: p._id,
      name: p.name,
      description: p.description,
      coverImage: p.coverImage,
      isPublic: p.isPublic,
      songCount: p.songs?.length || 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    res.status(200).json({
      message: "Playlists fetched successfully",
      count: shapedPlaylists.length,
      playlists: shapedPlaylists,
    });
  } catch (err) {
    next(err);
  }
};
export const updatePlaylist = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const {playlistId: id}= req.params;

    console.log(id)
    
   
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid playlist ID---" });
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Ownership check
    if (!playlist.user.equals(userId)) {
      return res.status(403).json({ message: "Not authorized to update this playlist" });
    }

    const { name, description, coverImage, isPublic } = req.body;

    // Apply allowed updates
    if (name !== undefined) playlist.name = name.trim();
    if (description !== undefined) playlist.description = description.trim();
    if (coverImage !== undefined) playlist.coverImage = coverImage;
    if (isPublic !== undefined) playlist.isPublic = Boolean(isPublic);

    await playlist.save();

    // Shape the response DTO
    const shaped = {
      id: playlist._id,
      name: playlist.name,
      description: playlist.description,
      coverImage: playlist.coverImage,
      isPublic: playlist.isPublic,
      songCount: playlist.songs.length,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };

    res.status(200).json({
      message: "Playlist updated successfully",
      playlist: shaped,
    });
  } catch (err) {
    next(err);
  }
};
// DELETE /api/playlists/:playlistId
export const deletePlaylist = async (req, res) => {
  try {
    const { id:playlistId } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role || "user"; // assuming you store roles on user

    console.log(req.user)

    // 1️⃣ Validate ID
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invalid playlist ID" });
    }

    // 2️⃣ Find playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Playlist not found" });
    }

    // 3️⃣ Permission check
    const isOwner = playlist.createdBy.toString() === userId.toString();
    const isAdmin = userRole === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "You do not have permission to delete this playlist" });
    }

    // 4️⃣ Delete playlist
    await Playlist.findByIdAndDelete(playlistId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Playlist deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting playlist:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const addSongToPlaylist = async (req, res, next) => {
  try {
    const { id:playlistId } = req.params;
    const { songId } = req.body;
    const userId = req.user._id;
    console.log(playlistId, songId, userId);

    // 1️⃣ Validate IDs
    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid playlist or song ID" });
    }

    // 2️⃣ Check playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Playlist not found" });
    }

    // 3️⃣ Check user ownership
    if (playlist.createdBy.toString() !== userId.toString()) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "You can only modify your own playlists" });
    }

    // 4️⃣ Check if song exists
    const songExists = await Song.exists({ _id: songId });
    if (!songExists) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Song not found" });
    }

    // 5️⃣ Prevent duplicates
    if (playlist.songs.includes(songId)) {
      return res.status(StatusCodes.CONFLICT).json({ message: "Song already in playlist" });
    }

    // 6️⃣ Add song
    playlist.songs.push(songId);
    await playlist.save();

    return res.status(StatusCodes.OK).json({
      message: "Song added successfully",
      playlist,
    });
  } catch (error) {
    next(error);
  }
};
export const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const { id:playlistId } = req.params;
    const { songIds } = req.body;
    const userId = req.user._id;

    // Validate request body
    if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "songIds array is required and cannot be empty",
      });
    }

    // Find playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Playlist not found" });
    }

    // Check ownership
    if (playlist.createdBy.toString() !== userId.toString()) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "You can only modify your own playlists" });
    }

    // Filter out songs to be removed
    const beforeCount = playlist.songs.length;
    playlist.songs = playlist.songs.filter(
      (id) => !songIds.includes(id.toString())
    );
    const afterCount = playlist.songs.length;

    // If nothing changed
    if (beforeCount === afterCount) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "No matching songs found in the playlist",
      });
    }

    await playlist.save();

    return res.status(StatusCodes.OK).json({
      message: "Songs removed successfully",
      removedCount: beforeCount - afterCount,
      playlist,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/playlists/public
export const getPublicPlaylists = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    // 1️⃣ Build filter
    const filter = {
      visibility: "public",
      ...(search
        ? { name: { $regex: search, $options: "i" } }
        : {}),
    };

    // 2️⃣ Fetch public playlists with creator + songs preview
    const playlists = await Playlist.find(filter)
      .populate({
        path: "createdBy",
        select: "name username",
      })
      .populate({
        path: "songs",
        select: "title artist coverImage duration",
        options: { limit: 3 }, // only show top 3 songs preview
      })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    // 3️⃣ Count total for pagination
    const total = await Playlist.countDocuments(filter);

    // 4️⃣ Shape lightweight response (DTO-style)
    const shaped = playlists.map((p) => ({
      id: p._id,
      name: p.name,
      description: p.description,
      visibility: p.visibility,
      createdAt: p.createdAt,
      createdBy: p.createdBy
        ? {
            id: p.createdBy._id,
            name: p.createdBy.name,
            username: p.createdBy.username,
          }
        : null,
      songCount: p.songs?.length || 0,
      songsPreview:
        p.songs?.map((s) => ({
          id: s._id,
          title: s.title,
          artist: s.artist,
          coverImage: s.coverImage,
          duration: s.duration,
        })) || [],
    }));

    // 5️⃣ Send paginated result
    res.status(StatusCodes.OK).json({
      success: true,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      totalPlaylists: total,
      data: shaped,
    });
  } catch (err) {
    console.error("Error fetching public playlists:", err);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error", error: err.message });
  }
};
// GET /api/playlists/:playlistId
export const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id; // will be undefined for public users

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid playlist ID" });
    }

    // 2️⃣ Fetch playlist with populated songs + creator
    const playlist = await Playlist.findById(id)
      .populate({
        path: "songs",
        select: "title artist album duration coverImage accessType price",
        populate: { path: "artist", select: "name slug" },
      })
      .populate({
        path: "createdBy",
        select: "name username",
      })
      .lean();

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // 3️⃣ Access control for private playlists
    if (
      playlist.visibility === "private" &&
      (!userId || playlist.createdBy._id.toString() !== userId.toString())
    ) {
      return res.status(403).json({ message: "You don't have access to this playlist" });
    }

    // 4️⃣ Shape playlist DTO (clean response)
    const shapedPlaylist = {
      id: playlist._id,
      name: playlist.name,
      description: playlist.description,
      visibility: playlist.visibility,
      createdAt: playlist.createdAt,
      createdBy: shapeUserResponse(playlist.createdBy),
      songs: playlist.songs.map(shapeSongResponse),
    };

    // 5️⃣ Return result
    res.status(200).json({ success: true, data: shapedPlaylist });
  } catch (err) {
    console.error("Error in getPlaylistById:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// POST /api/playlists/:playlistId/like
export const toggleLikePlaylist = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const userId = req.user?._id;

    // 1️⃣ Ensure valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Invalid playlist ID" });
    }

    // 2️⃣ Find playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Playlist not found" });
    }

    // 3️⃣ Check if already liked
    const alreadyLiked = playlist.likes.some(
      (id) => id.toString() === userId.toString()
    );

    // 4️⃣ Toggle logic
    if (alreadyLiked) {
      playlist.likes = playlist.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      playlist.likes.push(userId);
    }

    await playlist.save();

    // 5️⃣ Return new status + count
    res.status(StatusCodes.OK).json({
      success: true,
      liked: !alreadyLiked,
      likeCount: playlist.likes.length,
      message: alreadyLiked
        ? "Playlist unliked successfully"
        : "Playlist liked successfully",
    });
  } catch (err) {
    console.error("Error toggling like:", err);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error", error: err.message });
  }
};