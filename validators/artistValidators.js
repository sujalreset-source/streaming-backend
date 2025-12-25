import { body, param } from "express-validator";

export const createArtistValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("bio").optional().trim().escape(),
  body("location").optional().trim().escape(),
  body("subscriptionPrice")
    .optional()
    .isNumeric().withMessage("Subscription price must be a number"),
];

export const updateArtistValidator = [
  param("id").isMongoId().withMessage("Invalid artist ID"),
  body("name").optional().trim(),
  body("bio").optional().trim().escape(),
  body("location").optional().trim().escape(),
  body("subscriptionPrice")
    .optional()
    .isNumeric().withMessage("Subscription price must be a number"),
];

export const artistIdValidator = [
  param("id").isMongoId().withMessage("Invalid artist ID"),
];