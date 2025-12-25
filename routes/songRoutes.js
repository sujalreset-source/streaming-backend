import express from "express";
import { authenticateUser } from "../middleware/authenticate.js";
import {createSongController, updateSong} from "../controllers/songController2.js";
import {
  deleteSong,
  getAllSongs,
  getAllSingles,
  getSongById,
  getSongsMatchingUserGenres,
  getSongsByGenre,
  getSongsByAlbum,
  getSongsByArtist,
  getLikedSongs,
  getSinglesByArtist
} from "../controllers/songController.js";
import { songUpload } from "../middleware/uploadMiddleware.js";
import {
  createSongValidator,
  updateSongValidator,
  songIdValidator,
} from "../validators/songValidators.js";
import validate from "../middleware/validate.js";
import { authorizeRoles } from "../middleware/authorize.js";
import { isArtistMonetized } from "../middleware/isMonetized.js";

const router = express.Router();

// Like-related
router.get("/liked", authenticateUser, getLikedSongs);

// Genre-matching for user
router.get("/matching-genre", authenticateUser, getSongsMatchingUserGenres);

// CRUD + browse
router.get("/", authenticateUser, authorizeRoles("admin"), getAllSongs);
router.get("/singles", authenticateUser, getAllSingles);
router.get("/:id", authenticateUser, songIdValidator, validate, getSongById);
router.post("/", authenticateUser, authorizeRoles("artist"), isArtistMonetized, songUpload, createSongValidator, validate, createSongController);
router.put("/:id", authenticateUser, songUpload, updateSongValidator, validate, updateSong);
router.delete("/:id", authenticateUser, songIdValidator, validate, deleteSong);

// Filtering routes
router.get("/genre/:genre", authenticateUser, getSongsByGenre);
router.get("/album/:albumId", authenticateUser, getSongsByAlbum);
router.get("/artist/:artistId", authenticateUser, getSongsByArtist);
router.get("/singles/artist/:artistId", authenticateUser, getSinglesByArtist);

export default router;
