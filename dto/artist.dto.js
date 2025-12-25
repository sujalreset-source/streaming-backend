import { Song } from "../models/Song.js";
import { Album } from "../models/Album.js";

export const shapeArtistResponse = (artist) => {
  const plans = Array.isArray(artist.subscriptionPlans)
    ? artist.subscriptionPlans.map((p) => ({
        cycle: p.cycle,
        basePrice: p.basePrice,
        price: p.price,
        razorpayPlanId: p.razorpayPlanId,
        stripePriceId: p.stripePriceId,
        paypalPlans: Array.isArray(p.paypalPlans)
          ? p.paypalPlans.map((pp) => ({
              currency: pp.currency,
              paypalPlanId: pp.paypalPlanId,
            }))
          : [],
        convertedPrices: p.convertedPrices || {}
      }))
    : [];

  return {
    _id: artist._id,
    name: artist.name,
    slug: artist.slug,
    image: artist.image,
    location: artist.location,
    bio: artist.bio,
    subscriptionPlans: plans,
    songCount: artist.songCount ?? 0,   // use precomputed counts if available
    albumCount: artist.albumCount ?? 0,
    createdAt: artist.createdAt,
    updatedAt: artist.updatedAt,
    isMonetizationComplete: artist.isMonetizationComplete || false
  };
};