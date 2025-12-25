import express from "express";
import { getRandomArtistWithSongs, getExploreFeed } from "../controllers/discoverController.js";

const router = express.Router();

router.get("/random-artist", getRandomArtistWithSongs);
router.get("/exlore-feed", getExploreFeed);

export default router;
