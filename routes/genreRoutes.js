import express from "express";
import { authenticateUser } from "../middleware/authenticate.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  createGenre,
  updateGenre,
  deleteGenre,
  getGenres,
  getGenreByIdOrSlug,
} from "../controllers/genreController.js";
import {
  createGenreValidator,
  updateGenreValidator,
  genreIdOrSlugValidator,
} from "../validators/genreValidators.js";
import validate from "../middleware/validate.js";

const router = express.Router();

// Create genre (admin only)
router.post(
  "/",
  authenticateUser,
  isAdmin,
  createGenreValidator,
  validate,
  createGenre
);

// Update genre (admin only)
router.put(
  "/:id",
  authenticateUser,
  isAdmin,
  updateGenreValidator,
  validate,
  updateGenre
);

// Delete genre (admin only)
router.delete(
  "/:id",
  authenticateUser,
  isAdmin,
  deleteGenre
);

// Get all genres (public)
router.get("/", getGenres);

// Get genre by ID or slug (public)
router.get("/:idOrSlug", genreIdOrSlugValidator, validate, getGenreByIdOrSlug);

export default router;
