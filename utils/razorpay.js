import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Creates a Razorpay order with optional metadata.
 * @param {number} amount - in INR (e.g., 199).
 * @param {string} userId - MongoDB ObjectId.
 * @param {object} metadata - Optional: { itemType, itemId }.
 * @returns Razorpay Order
 */
export const createRazorpayOrder = async (amount, userId, itemType, itemId, metadata = {}, currency) => {
  const order = await razorpay.orders.create({
    amount: amount * 100, // Razorpay expects amount in paise
    currency,
    receipt: `receipt_${Date.now()}`,
    notes: {
      userId,
      itemType,
      itemId,
      ...metadata,
    },
  });

  return order;
};



export const createRazorpayPlan = async (artistName, amountInRupees, durationInMonths = 1) => {
  // Validate duration
  if (![1, 3, 6].includes(durationInMonths)) {
    throw new Error("Invalid subscription duration. Allowed: 1, 3, or 6 months.");
  }

  // Create plan
  const plan = await razorpay.plans.create({
    period: "monthly", // Always monthly (we scale using interval)
    interval: durationInMonths, // 1 = monthly, 3 = every 3 months, 6 = every 6 months
    item: {
      name: `Subscription for ${artistName} (${durationInMonths} month${durationInMonths > 1 ? "s" : ""})`,
      amount: amountInRupees * 100, // Razorpay expects paise
      currency: "INR",
    },
    notes: {
      artistName,
      durationInMonths,
    },
  });

  console.log(`✅ Razorpay Plan created: ${plan.id} for ${artistName} (${durationInMonths} months)`);

  return plan.id;
};