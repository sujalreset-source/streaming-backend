import { body, param, query } from "express-validator";

// Allowed statuses for filtering
const validStatuses = ["pending", "approved", "rejected", "needs_info"];

// -----------------------------------------
// LIST VALIDATION
// GET /admin/artist-applications
// -----------------------------------------
export const listArtistApplicationsValidator = [
  query("status")
    .optional()
    .isString()
    .trim()
    .isIn(validStatuses)
    .withMessage(`Status must be one of: ${validStatuses.join(", ")}`),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Search query is too long")
    .escape(), // prevents XSS

  query("page")
    .optional()
    .toInt()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .toInt()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

// -----------------------------------------
// ID VALIDATOR
// -----------------------------------------
export const applicationIdValidator = [
  param("id").isMongoId().withMessage("Invalid application ID format"),
];

// -----------------------------------------
// APPROVE VALIDATION
// POST: /approve
// -----------------------------------------
export const approveArtistApplicationValidator = [
  param("id").isMongoId().withMessage("Invalid application ID"),

  body("name")
    .optional()
    .trim()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("bio")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),

  body("slug")
    .optional()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage(
      "Slug must be URL-friendly: lowercase letters, numbers, hyphens only"
    ),

  body("image")
    .optional()
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Image must be a valid URL"),

  body("adminNotes")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 1000 })
    .withMessage("Admin notes cannot exceed 1000 characters"),
];

// -----------------------------------------
// REJECT VALIDATION
// POST: /reject
// -----------------------------------------
export const rejectArtistApplicationValidator = [
  param("id").isMongoId().withMessage("Invalid application ID"),

  body("notes")
    .trim()
    .notEmpty()
    .withMessage("Notes are required to reject an application")
    .isLength({ min: 5, max: 1000 })
    .withMessage("Notes must be between 5 and 1000 characters")
    .escape(),
];

// -----------------------------------------
// REQUEST MORE INFO VALIDATION
// POST: /request-more-info
// -----------------------------------------
export const requestMoreInfoValidator = [
  param("id").isMongoId().withMessage("Invalid application ID"),

  body("notes")
    .trim()
    .notEmpty()
    .withMessage("Notes are required to request more information")
    .isLength({ min: 5, max: 1000 })
    .withMessage("Notes must be between 5 and 1000 characters")
    .escape(),
];
