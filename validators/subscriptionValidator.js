import { body, param } from "express-validator";
import mongoose from "mongoose";

/**
 * @desc Validator for creating a Razorpay artist subscription
 * @route POST /api/subscriptions/razorpay/:artistId
 */
export const createRazorpaySubscriptionValidator = [
  // ✅ artistId param validation
  param("artistId")
    .custom((value) => mongoose.isValidObjectId(value))
    .withMessage("Invalid artist ID"),

  // ✅ cycle validation (required + whitelist)
  body("cycle")
    .exists({ checkFalsy: true })
    .withMessage("Subscription cycle is required")
    .isString()
    .withMessage("Cycle must be a string")
    .isIn(["1m", "3m", "6m", "12m"])
    .withMessage("Invalid cycle. Must be one of: 1m, 3m, 6m, 12m"),

  
];
