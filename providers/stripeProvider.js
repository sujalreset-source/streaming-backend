import { createArtistStripeSubscriptionPrice } from "../utils/stripe.js";

export const stripeProvider = {
  async createPlan(artistName, price, interval, interval_count) {
    return await createArtistStripeSubscriptionPrice(artistName, price, interval, interval_count);
  }
};
