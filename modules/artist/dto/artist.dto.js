/**
 * Artist Public DTO
 * ------------------
 * Returns a safe, public-facing representation of an Artist document.
 * Excludes internal fields like createdBy, uploadVersion, and any sensitive gateway IDs.
 *
 * If you need additional metrics (subscriberCount, totalStreams), compute them
 * separately (aggregation service) and merge into this DTO before sending to client.
 */

export const artistDTO = (artistDoc) => {
  if (!artistDoc) return null;

  // If Mongoose doc passed, prefer plain object fields; support both lean docs and full docs
  const a = artistDoc.toObject ? artistDoc.toObject() : artistDoc;

  return {
    id: a._id,
    name: a.name,
    slug: a.slug,
    bio: a.bio || "",
    image: a.image || null,
    location: a.location || null,

    // Subscription plans: expose only minimal info for public listing.
    // Do NOT expose gateway IDs or internal converted prices here.
    subscriptionPlans:
      Array.isArray(a.subscriptionPlans) && a.subscriptionPlans.length > 0
        ? a.subscriptionPlans.map((p) => ({
            cycle: p.cycle,
            basePrice: p.basePrice || null, // { currency, amount }
            // don't expose razorpayPlanId / stripePriceId / paypalPlans publicly
          }))
        : [],

    // Optional computed/aggregated metrics (fill from service)
    subscriberCount: typeof a.subscriberCount !== "undefined" ? a.subscriberCount : null,
    totalStreams: typeof a.totalStreams !== "undefined" ? a.totalStreams : null,

    // Public-facing timestamps
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
};
