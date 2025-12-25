import express from "express";
import { authenticateUser } from "../middleware/authenticate.js";
import { initiateArtistSubscription, cancelArtistSubscription } from "../controllers/subscriptionController.js";
import { artistIdValidator } from "../validators/artistValidators.js";
import validate from "../middleware/validate.js";
import { createSetupIntent } from "../controllers/subscriptionController.js";
import { createRazorpaySubscription } from "../controllers/subscriptionController.js";
import {createPaypalSubscription} from "../controllers/subscriptionController.js";

const router = express.Router();

// Initiate subscription for an artist
router.post(
  "/artist/:artistId",
  authenticateUser,
  createRazorpaySubscription,
);
router.post("/setup-intent", authenticateUser, createSetupIntent);

// routes/userRoutes.js
router.delete("/artist/:artistId", authenticateUser, cancelArtistSubscription);

router.post("/paypal/artist/:artistId", authenticateUser, createPaypalSubscription);


export default router;
