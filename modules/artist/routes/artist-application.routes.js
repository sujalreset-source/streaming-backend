import express from "express";
import { submitArtistApplicationController } from "../controllers/artist-application.controller.js";
import { getMyArtistApplicationController } from "../controllers/artist-application.controller.js";
import { updateMyArtistApplicationController } from "../controllers/artist-application.controller.js";
import { updateArtistApplicationValidator } from "../validators/artist-application.user.validators.js";
import validateRequest from "../../../middleware/validate.js";
// import { isAuthenticated } from "../../../middlewares/auth.middleware.js";
import { authenticateUser } from "../../../middleware/authenticate.js";
// adjust import path based on your project
import { songUpload } from "../../../middleware/uploadMiddleware.js";
export const parseJsonFields = (fields = []) => {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];

      if (value === "" || value === undefined) {
        req.body[field] = null;
        continue;
      }

      try {
        req.body[field] = JSON.parse(value);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: `Invalid JSON in field "${field}". Expected valid JSON string.`,
        });
      }
    }

    next();
  };
};


const router = express.Router();

/**
 * @route POST /api/v2/artist/apply
 * @desc Submit an artist application
 * @access Authenticated users only
 */
router.post("/apply", authenticateUser, songUpload, submitArtistApplicationController);

/**
 * @route GET /api/v2/artist/application/me
 * @desc Fetch logged-in user's application
 * @access Authenticated users only
 */
router.get("/application/me", authenticateUser, getMyArtistApplicationController);


// PUT /api/v2/artist/application/me
router.put(
  "/application/me",
  authenticateUser,
  updateArtistApplicationValidator,
  validateRequest,
  updateMyArtistApplicationController
);

export default router;
