// validators/genreValidators.js

import { body, param } from "express-validator";
import mongoose from "mongoose";

// ✅ Genre Create Validator
export const createGenreValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Genre name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Genre name must be between 2 and 50 characters"),
];

// ✅ Genre Update Validator
export const updateGenreValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Genre name must be between 2 and 50 characters"),
];

// ✅ ID or Slug Validator (for GET /:idOrSlug)
export const genreIdOrSlugValidator = [
  param("idOrSlug")
    .custom((value) => {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
      const isValidSlug = /^[a-z0-9-]+$/.test(value);
      if (!isValidObjectId && !isValidSlug) {
        throw new Error("Invalid genre ID or slug");
      }
      return true;
    }),
];
