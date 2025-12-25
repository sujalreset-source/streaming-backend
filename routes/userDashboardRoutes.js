import express from "express";
import {
  getUserPurchases,
  getUserSubscriptions,
  cancelArtistSubscription,
} from "../controllers/userDashboardController.js";
import { authenticateUser } from "../middleware/authenticate.js";
import { artistIdValidator } from "../validators/artistValidators.js";
import validate from "../middleware/validate.js";

const router = express.Router();

// 🧾 User Purchase History
router.get("/purchases", authenticateUser, getUserPurchases);

// 📅 Active Subscriptions
router.get("/subscriptions", authenticateUser, getUserSubscriptions);

// ❌ Cancel Subscription to Artist
router.delete(
  "/subscriptions/:artistId",
  authenticateUser,
  artistIdValidator,
  validate,
  cancelArtistSubscription
);

export default router;
