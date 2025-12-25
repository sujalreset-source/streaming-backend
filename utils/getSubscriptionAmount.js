
export const getSubscriptionAmount = (subscriptionPlan, currency) => {
  if (!subscriptionPlan) throw new Error("Subscription plan not provided");
  if (!currency) throw new Error("Currency not provided");

 

  const normalizedCurrency = currency.toUpperCase();

  // 1️⃣ If basePrice matches currency
  if (subscriptionPlan.basePrice?.currency?.toUpperCase() === normalizedCurrency) {
    return subscriptionPlan.basePrice.amount;
  }

  // 2️⃣ Check in convertedPrices array
  const converted = subscriptionPlan.convertedPrices.find(
    (p) => p.currency.toUpperCase() === normalizedCurrency
  );
  if (converted) return converted.amount;

  // 3️⃣ (Optional) Check in paypalPlans if needed
  const paypalPlan = subscriptionPlan.paypalPlans.find(
    (p) => p.currency.toUpperCase() === normalizedCurrency
  );
  if (paypalPlan) {
    // Note: PayPal stores IDs, not amounts – so you’d fetch amount from base/converted
    // or maintain a mapping separately.
    return converted?.amount || subscriptionPlan.basePrice.amount;
  }

  throw new Error(`Price not available for currency: ${currency}`);
};