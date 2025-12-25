import { body } from "express-validator";

export const updateArtistApplicationValidator = [
  body("stageName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage("stageName must be between 2 and 150 characters"),

  body("legalName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage("legalName must be between 2 and 150 characters"),

  body("bio")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("bio cannot exceed 2000 characters"),

  body("contact")
    .optional()
    .isObject()
    .withMessage("contact must be an object"),

  body("contact.email").optional().isEmail().withMessage("Invalid contact email"),
  body("contact.phone")
    .optional()
    .isString()
    .isLength({ min: 6, max: 30 })
    .withMessage("Invalid phone number"),

  body("socials")
    .optional()
    .isArray()
    .withMessage("socials must be an array"),

  body("documents")
    .optional()
    .isArray()
    .withMessage("documents must be an array"),

  body("samples")
    .optional()
    .isArray()
    .withMessage("samples must be an array"),

  body("requestedUploadQuotaBytes")
    .optional()
    .isInt({ min: 0 })
    .withMessage("requestedUploadQuotaBytes must be a positive integer"),
];
