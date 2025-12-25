import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger.js';



/////v1//////
// const errorHandlerMiddleware = (err, req, res, next) => {
//   // Log the full error stack or message using Winston
//   logger.error(err.stack || err.message);

//   let customError = {
//     statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
//     msg: 'Something went wrong, please try again later',
//   };

//   // Handle Mongoose Validation Error
//   if (err.name === 'ValidationError') {
//     customError.msg = Object.values(err.errors)
//       .map((item) => item.message)
//       .join(', ');
//     customError.statusCode = StatusCodes.BAD_REQUEST;
//   }

//   // Handle Mongoose Duplicate Key Error
//   if (err.code === 11000) {
//     customError.msg = `Duplicate value entered for ${Object.keys(err.keyValue).join(', ')}`;
//     customError.statusCode = StatusCodes.BAD_REQUEST;
//   }

//   // Handle Mongoose Cast Error (e.g., invalid ObjectId)
//   if (err.name === 'CastError') {
//     customError.msg = `No item found with id: ${err.value}`;
//     customError.statusCode = StatusCodes.NOT_FOUND;
//   }

//   // Use custom error message if explicitly set
//   if (err.statusCode && err.message) {
//     customError.statusCode = err.statusCode;
//     customError.msg = err.message;
//   }

//   return res.status(customError.statusCode).json({ msg: customError.msg });
// };

// export default errorHandlerMiddleware;




///////v2///////





/**
 * Global Error Handler v2 — Production Ready
 * ------------------------------------------
 * Supports:
 *  - Mongoose errors
 *  - Custom AppError (err.statusCode + err.message)
 *  - Express-validator forwarded errors
 *  - Worker/service errors
 *  - Fallback safe errors
 * 
 * Exposes safe output in production, detailed output in development.
 */

const errorHandlerMiddleware = (err, req, res, next) => {
  // Log full error for monitoring + debugging
  logger.error(err.stack || err.message);

  // ------------------------------------------
  // Default values
  // ------------------------------------------
  let statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  let message =
    err.message || "Something went wrong, please try again later.";

  // ------------------------------------------
  // Mongoose: ValidationError
  // ------------------------------------------
  if (err.name === "ValidationError") {
    statusCode = StatusCodes.BAD_REQUEST;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // ------------------------------------------
  // Mongoose: Duplicate Key (E11000)
  // ------------------------------------------
  if (err.code === 11000) {
    statusCode = StatusCodes.BAD_REQUEST;
    const fields = Object.keys(err.keyValue).join(", ");
    message = `Duplicate value entered for: ${fields}`;
  }

  // ------------------------------------------
  // Mongoose: CastError (Invalid MongoID)
  // ------------------------------------------
  if (err.name === "CastError") {
    statusCode = StatusCodes.NOT_FOUND;
    message = `Resource not found with id: ${err.value}`;
  }

  // ------------------------------------------
  // Express-Validator errors (if forwarded via next(err))
  // ------------------------------------------
  if (Array.isArray(err.errors)) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Validation failed.";

    return res.status(statusCode).json({
      success: false,
      message,
      errors: err.errors.map((e) => ({
        field: e.param,
        message: e.msg,
      })),
    });
  }

  // ------------------------------------------
  // Standardized JSON Response
  // ------------------------------------------
  const response = {
    success: false,
    message,
  };

  // ------------------------------------------
  // Include stack trace and error object in development
  // ------------------------------------------
  if (process.env.NODE_ENV === "development") {
    response.error = err;
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

export default errorHandlerMiddleware;
