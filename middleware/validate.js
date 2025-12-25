import { validationResult } from "express-validator";
import logger from "../utils/logger.js";
import { StatusCodes } from "http-status-codes";

export default function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
    }));

    logger.warn("❗ Validation failed:", extractedErrors);

    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Validation failed. Please check your input.",
      errors: extractedErrors,
    });
  }

  next();
}
