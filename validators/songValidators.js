import { body, param } from "express-validator";

const ISRC_REGEX = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{2}[0-9]{5}$/;

export const createSongValidator = [
  // Title
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required"),

  // Duration (seconds)
  body("duration")
    .notEmpty()
    .withMessage("Duration is required")
    // .isInt({ gt: 0 })
    .withMessage("Duration must be a positive number"),

  // Access type
  body("accessType")
    .optional()
    .isIn(["free", "subscription", "purchase-only"])
    .withMessage("Invalid access type"),

  // Album only flag (multipart-safe)
  body("albumOnly")
    .optional()
    .customSanitizer(v => v === "true" || v === true)
    .isBoolean()
    .withMessage("albumOnly must be boolean"),

  // Album ID
  body("album")
    .optional()
    .isMongoId()
    .withMessage("Invalid album ID"),

  // Release date
  body("releaseDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid release date")
    .toDate(),

  // Genre (optional, string or array)
  body("genre")
    .optional()
    .custom(v => Array.isArray(v) || typeof v === "string")
    .withMessage("Genre must be a string or array"),

  // Base price (object validation)
  body("basePrice")
    .optional()
    .custom(v => {
      if (typeof v === "string") {
        try {
          v = JSON.parse(v);
        } catch {
          throw new Error("basePrice must be valid JSON");
        }
      }
      if (typeof v !== "object") throw new Error("basePrice must be an object");
      if (typeof v.amount !== "number" || v.amount <= 0) {
        throw new Error("basePrice.amount must be a positive number");
      }
      if (!v.currency || typeof v.currency !== "string") {
        throw new Error("basePrice.currency is required");
      }
      return true;
    }),

  // ISRC
  body("isrc")
    .optional()
    .trim()
    .toUpperCase()
    .matches(ISRC_REGEX)
    .withMessage("Invalid ISRC format"),
];

export const updateSongValidator = [
  param("id").isMongoId().withMessage("Invalid song ID"),
  body("title").optional().trim(),
  body("artist").optional(),
  body("genre").optional(),
  body("duration").optional(),
  body("price").optional().isNumeric().withMessage("Price must be a number"),
  body("isPremium").optional().isBoolean().withMessage("isPremium must be boolean"),
  body("includeInSubscription").optional().isBoolean().withMessage("includeInSubscription must be boolean"),
  body("releaseDate").optional().isISO8601().toDate().withMessage("Invalid release date"),
  body("album").optional().isMongoId().withMessage("Invalid album ID"),
];

export const songIdValidator = [
  param("id").isMongoId().withMessage("Invalid song ID"),
];