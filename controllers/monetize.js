import { Artist } from "../models/Artist.js";
import { isAdmin } from "../utils/authHelper.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, UnauthorizedError } from "../errors/index.js";
import { monetizeArtistService, checkArtistMonetization} from "../services/monetizeService.js";
import { cycleToInterval } from "../utils/cycleToInterval.js";
import { fetchArtistsWithCounts, fetchArtistById } from '../services/artistService.js';
import { shapeArtistResponse } from "../dto/artist.dto.js";


import mongoose from "mongoose";


export const monetizeArtist = async (req, res) => {
//   if (!isAdmin(req.user)) throw new UnauthorizedError("Access denied. Admins only.");

  const { subscriptionPrice, cycle } = req.body;
  if (!cycle) throw new BadRequestError("Subscription cycle is required (1m, 3m, 6m, 12m).");

  const intervals = cycleToInterval(cycle);
  intervals.cycleLabel = cycle; // add label for DB

 
  const basePrice = { currency: "USD", amount: subscriptionPrice }; // default base price
  const artist = await monetizeArtistService({
    artistId: req.user.artistId,
    basePrice,
    cycle: intervals,
    createdBy: req.user._id
  });

  res.status(StatusCodes.CREATED).json({ success: true, artist });
};




export const getMyMonetizationStatus = async (req, res) => {
  const artistId = req.user.artistId;

  if (!artistId) {
    return res.status(StatusCodes.OK).json({
      isMonetized: false,
      reason: "NO_ARTIST_PROFILE",
    });
  }

  const result = await checkArtistMonetization(artistId);

  res.status(StatusCodes.OK).json(result);
};


export const getMyMonetizationSetupStatus = async (req, res) => {
  const artistId = req.user.artistId;

  if (!artistId) {
    return res.json({
      isMonetizationComplete: false,
      reason: "NO_ARTIST_PROFILE"
    });
  }

  const artist = await Artist.findById(artistId)
    .select("isMonetizationComplete monetizationSetupAt")
    .lean();

  if (!artist) {
    return res.json({
      isMonetizationComplete: false,
      reason: "NOT_FOUND"
    });
  }

  res.json({
    isMonetizationComplete: artist.isMonetizationComplete,
    setupAt: artist.monetizationSetupAt
  });
};

