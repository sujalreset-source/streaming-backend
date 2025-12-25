import express from "express";
import { authenticateUser } from "../middleware/authenticate.js";
import { authorizeRoles } from "../middleware/authorize.js";
import { isAdmin } from "../middleware/isAdmin.js";
import { monetizeArtist } from "../controllers/monetize.js";
import { getMyMonetizationStatus } from "../controllers/monetize.js";
import { getMyMonetizationSetupStatus } from "../controllers/monetize.js";

const router = express.Router();

// Create artist (admin only)


router.post(
  "/",
  authenticateUser,
  
  monetizeArtist
);

router.get(
  "/artists/me/monetization-setup-status",
  authenticateUser,
  authorizeRoles("artist"),
  getMyMonetizationSetupStatus
);

router.get(
  "/artists/me/monetization-status",
  authenticateUser,
  authorizeRoles("artist"),
  getMyMonetizationStatus
);

export default router;