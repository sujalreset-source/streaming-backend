// routes/adminPlaylistRoutes.js
import express from "express";
import {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  getAllPlaylists,
  getPlaylistById
} from "../controllers/adminPlaylistController.js";
import { authenticateUser } from "../middleware/authenticate.js";

const router = express.Router();

// Public or authenticated route (depends on your needs)
router.get("/", getAllPlaylists);

// Protected routes — require authentication
router.post("/", authenticateUser, createPlaylist)

router.route("/:playlistId")
  .patch(authenticateUser, updatePlaylist)
  .delete(authenticateUser, deletePlaylist)
  .get( authenticateUser, getPlaylistById);

 

router.post("/:playlistId/songs", authenticateUser, addSongToPlaylist);
router.delete("/:playlistId/songs/:songId", authenticateUser, removeSongFromPlaylist);

export default router;
