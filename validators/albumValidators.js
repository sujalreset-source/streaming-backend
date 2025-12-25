import { body, param } from "express-validator";

export const createAlbumValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").optional().trim(),
  body("releaseDate").optional().isISO8601().toDate().withMessage("Invalid release date"),
  body("price").optional().isNumeric().withMessage("Price must be a number"),
  body("isPremium").optional().isBoolean().withMessage("isPremium must be boolean"),
  // If you expect genre in the body:
  body("genre").optional().customSanitizer(value => {
    if (typeof value === "string") {
      return value.split(",").map(g => g.trim());
    }
    return value;
  }),
];

export const updateAlbumValidator = [
  param("id").isMongoId().withMessage("Invalid album ID"),
  body("title").optional().trim(),
  body("description").optional().trim().escape(),
  body("artist").optional(),
  body("releaseDate").optional().isISO8601().toDate().withMessage("Invalid release date"),
  body("price").optional().isNumeric().withMessage("Price must be a number"),
  body("isPremium").optional().isBoolean().withMessage("isPremium must be boolean"),
  body("genre").optional().customSanitizer(value => {
    if (typeof value === "string") {
      return value.split(",").map(g => g.trim());
    }
    return value;
  }),
];

export const albumIdValidator = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Album identifier is required")
];