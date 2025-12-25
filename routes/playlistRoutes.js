import express from "express";
import {

  createPlaylist,
  deletePlaylist,
 
  removeSongFromPlaylist,
  getPlaylistById,
  updatePlaylist,
  addSongToPlaylist
} from "../controllers/playlistController.js";
import { authenticateUser } from "../middleware/authenticate.js";
import {
  createPlaylistValidator,
  updatePlaylistValidator,
  playlistIdValidator,
  addSongToPlaylistValidator,
  removeSongFromPlaylistValidator,
} from "../validators/playlistValidators.js";
import validate from "../middleware/validate.js";

const router = express.Router();


// Get all playlists for 

// Create new playlist
router.post("/", authenticateUser, createPlaylistValidator, validate, createPlaylist);

// // Get a single playlist by ID
// router.get("/:playlistId", authenticateUser, playlistIdValidator, validate, getPlaylistById);

// Update a playlist
router.put(
  "/:playlistId",
  authenticateUser,
  updatePlaylistValidator,
  validate,
  updatePlaylist
);

// // Delete a playlist
// router.delete(
//   "/:playlistId",
//   authenticateUser,
//   playlistIdValidator,
//   validate,
//   deletePlaylist
// );

// // Add a song to a playlist
// router.post(
//   "/:playlistId/song",
//   authenticateUser,
//   addSongToPlaylistValidator,
//   validate,
//   addSongToPlaylist
// );

// // Remove a song from a playlist
// router.delete(
//   "/:playlistId/song/:songId",
//   authenticateUser,
//   removeSongFromPlaylistValidator,
//   validate,
//   removeSongFromPlaylist
// );

// routes/playlistRoutes.js

import {
  
  getMyPlaylists,
 

  getPublicPlaylists,
 
  toggleLikePlaylist,
} from "../controllers/playlistController.js";
// import { protect } from "../middleware/authMiddleware.js"; // your JWT middleware



// CRUD
// router.post("/", createPlaylist);
router.get("/mine", authenticateUser, getMyPlaylists);
router.put("/:id", authenticateUser, playlistIdValidator,updatePlaylist);
router.delete("/:id", authenticateUser, playlistIdValidator, deletePlaylist);

// Song management
router.post("/:id/songs", authenticateUser,addSongToPlaylist);
router.delete("/:id/songs/:songId", authenticateUser,removeSongFromPlaylist);

// Public discovery
router.get("/public", getPublicPlaylists);
router.get("/:id", authenticateUser, playlistIdValidator, validate, getPlaylistById);

// Likes (optional)
router.post("/:id/like",  toggleLikePlaylist);

export default router;



