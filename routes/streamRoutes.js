// routes/streamRoutes.js
import express from "express";
import { streamSong, streamAlbum } from "../controllers/streamController.js";
import { authenticateUser } from "../middleware/authenticate.js";
import { streamSong2 } from "../controllers/streamController2.js";

const router = express.Router();

// Stream a specific song by ID
router.get("/song/:id", authenticateUser, streamSong);

router.get("/song2/:id", authenticateUser, streamSong2);


// Stream a specific album by ID
router.get("/album/:id", authenticateUser, streamAlbum);

export default router;
