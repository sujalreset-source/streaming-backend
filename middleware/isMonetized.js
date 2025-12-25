// middleware/isArtistMonetized.js
import { Artist } from "../modules/artist/models/artist.model.js";

export const isArtistMonetized = async (req, res, next) => {
  try {
    // authenticateUser must run before this
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized. Please login.",
      });
    }

    const { artistId, role } = req.user;

    // Ensure user is an artist
    if (role !== "artist") {
      return res.status(403).json({
        message: "Access denied. Artist account required.",
      });
    }

    if (!artistId) {
      return res.status(403).json({
        message: "Artist profile not found.",
      });
    }

    const artist = await Artist.findById(artistId).select(
      "isApproved monetization"
    );

    if (!artist) {
      return res.status(403).json({
        message: "Artist does not exist.",
      });
    }



    if (!artist.monetization?.enabled) {
      return res.status(403).json({
        message:
          "Monetization is not enabled. Please set up a subscription plan first.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error while checking artist monetization.",
    });
  }
};
