// filepath: /Users/resetstudios03/Desktop/streaming/backend/routes/searchRoutes.js

import express from "express";
import { searchSongs, searchArtists, searchAlbums, unifiedSearch } from "../controllers/searchController.js";

const router = express.Router();

router.get("/", unifiedSearch);
router.get("/songs", searchSongs);
router.get("/artists", searchArtists);
router.get("/albums", searchAlbums);

export default router;
