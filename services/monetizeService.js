import {Song} from "../models/Song.js";
import { Album } from "../models/Album.js";
import { Artist } from "../models/Artist.js";
import { convertCurrencies } from "../utils/convertCurrencies.js";
import { createSubscriptionPlans} from "./planService.js";
import { shapeArtistResponse } from "../dto/artist.dto.js";


export const monetizeArtistService = async ({artistId, basePrice, cycle, createdBy }) => {

  // const basePrice = { currency: "USD", amount: 10 }; // default base price
  const subscriptionPrice = basePrice.amount || 0;
  // If subscription exists, create plans
    const artist = await Artist.findById(artistId);
    console.log("Artist found:", artist, artistId);
  if (subscriptionPrice && subscriptionPrice > 0) {
    const intervals = cycle; // cycleToInterval already called in controller
      const convertedPrices = await convertCurrencies( basePrice.currency, basePrice.amount);
    console.log("Converted Prices:", convertedPrices);
    const plans = await createSubscriptionPlans( artist.name, basePrice, cycle, convertedPrices);

    artist.subscriptionPlans.push({
      cycle: intervals.cycleLabel,
      basePrice,
      stripePriceId: plans.stripePriceId,
      razorpayPlanId: plans.razorpayPlanId,
      paypalPlans: plans.paypalPlans,
      convertedPrices
    });
     
    artist. isMonetizationComplete = true;
     // ✅ ENABLE MONETIZATION (single source of truth)
    artist.monetization = {
      enabled: true,
      activatedAt: artist.monetization?.activatedAt || new Date(),
    };
    
  }

  // Save artist once
  await artist.save();

  return shapeArtistResponse(artist.toObject());
};


export const checkArtistMonetization = async (artistId) => {
  const artist = await Artist.findById(artistId)
    .select(
      "monetizationStatus approvalStatus subscriptionPlans"
    )
    .lean();

  if (!artist) {
    return { isMonetized: false, reason: "NOT_FOUND" };
  }

  if (artist.approvalStatus !== "approved") {
    return { isMonetized: false, reason: "NOT_APPROVED" };
  }

  if (artist.monetizationStatus !== "active") {
    return { isMonetized: false, reason: "STATUS_NOT_ACTIVE" };
  }

  const plans = artist.subscriptionPlans || [];
  if (plans.length === 0) {
    return { isMonetized: false, reason: "NO_PLANS" };
  }

  let hasStripe = false;
  let hasRazorpay = false;
  let hasPaypal = false;

  for (const plan of plans) {
    // if (plan.stripePriceId) hasStripe = true;
    if (plan.razorpayPlanId) hasRazorpay = true;
    if (plan.paypalPlans?.length) hasPaypal = true;
  }

  const hasAnyGateway =  hasRazorpay || hasPaypal;

  return {
    isMonetized: hasAnyGateway,
    status: artist.monetizationStatus,
    hasPlans: true,
    gateways: {
      stripe: hasStripe,
      razorpay: hasRazorpay,
      paypal: hasPaypal,
    },
  };
};