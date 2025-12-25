import express from "express";
import { authenticateUser } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorize.js";
import {
  createAlbumController,
  getAllAlbums,
  deleteAlbum,
  getAlbumById,
  updateAlbum,
  getAlbumsByArtist,
  getAllAlbumsWithoutpagination,
} 
from "../controllers/albumController.js";
import { singleImageUpload } from "../middleware/uploadMiddleware.js";
import {
  createAlbumValidator,
  updateAlbumValidator,
  albumIdValidator,
} from "../validators/albumValidators.js";
import validate from "../middleware/validate.js";

const router = express.Router();

// Create a new album
router.post(
  "/",
  authenticateUser,
  authorizeRoles("artist"),
  singleImageUpload,
  createAlbumValidator,
  validate,
  createAlbumController
);

// Update an existing album
router.put(
  "/:id",
  authenticateUser,
  singleImageUpload,
  updateAlbumValidator,
  validate,
  updateAlbum
);

// Delete an album
router.delete(
  "/:id",
  authenticateUser,
  albumIdValidator,
  validate,
  deleteAlbum
);

// Get all albums (paginated)
router.get("/", authenticateUser, getAllAlbums);

// Get all albums (non-paginated)
router.get("/findAlbums", authenticateUser, getAllAlbumsWithoutpagination);

// Get albums by artist
router.get("/artist/:artistId", authenticateUser, getAlbumsByArtist);

// Get album by ID
router.get(
  "/:id",
  authenticateUser,
  albumIdValidator,
  validate,
  getAlbumById
);

export default router

