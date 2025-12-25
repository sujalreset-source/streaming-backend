import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * 🔁 Create a recurring Stripe price for an artist subscription
 * @param {string} artistName - The name of the artist
 * @param {number} priceInRupees - e.g., 149
 * @returns {string} stripePriceId
 */
export const createArtistStripeSubscriptionPrice = async (artistName, priceInRupees) => {
  // 1. Create Stripe Product
  const product = await stripe.products.create({
    name: `Subscription for ${artistName}`,
  });

  // 2. Create recurring monthly Price
  const price = await stripe.prices.create({
    unit_amount: priceInRupees * 100, // Amount in paisa
    currency: "inr",
    recurring: { interval: "month" },
    product: product.id,
  });

  return price.id; // ✅ Save this to artist.stripePriceId
};

/**
 * 💰 Creates a Stripe PaymentIntent with optional metadata.
 * @param {number} amount - in INR (e.g., 199)
 * @param {string} userId - MongoDB ObjectId
 * @param {object} metadata - Optional: { itemType, itemId, transactionId }
 * @returns Stripe PaymentIntent
 */
export const createStripePaymentIntent = async (amount, userId, metadata = {}) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency: "inr",
    description: "Artist Subscription Payment",
    statement_descriptor: "Streamify Music",
    shipping: {
      name: "Test User",
      address: {
        line1: "123 Test Street",
        postal_code: "123456",
        city: "Mumbai",
        state: "MH",
        country: "IN",
      },
    },
    metadata: {
      userId: String(userId),
      ...Object.fromEntries(
        Object.entries(metadata).map(([k, v]) => [k, String(v)])
      ),
    },
  });

  return paymentIntent;
};

export const getOrCreateStripeCustomer = async (user) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user._id.toString() },
  });

  user.stripeCustomerId = customer.id;
  await user.save();

  return customer.id;
};
