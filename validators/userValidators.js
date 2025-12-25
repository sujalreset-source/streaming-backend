import { body, param } from "express-validator";

export const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6, max:64 }).withMessage("Password must be at least 6 characters"),
  body("dob").optional().isISO8601().toDate().withMessage("DOB must be a valid date"),
];

export const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const updateGenresValidation = [
  body("genres").isArray().withMessage("Genres must be an array"),
  body("genres.*").isString().trim().escape(),
];

export const likeSongValidation = [
  param("id").isMongoId().withMessage("Invalid song ID"),
];

export const resetPasswordValidation = [
  param("token").isHexadecimal().withMessage("Invalid token"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];