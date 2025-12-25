import { createPayPalProduct, createPayPalPlan } from "../utils/getPaypalAccessToken.js";

// const SUPPORTED_CURRENCIES = process.env.PAYPAL_SUPPORTED_CURRENCIES?.split(",") || ["USD", "EUR"];

export const paypalProvider = {
  async createPlans(artistName, basePrice, convertedPrices, interval_unit, interval_count) {
    const productId = await createPayPalProduct(artistName);

    const allCurrencies = [basePrice, ...convertedPrices];
    const plans = await Promise.all(
      allCurrencies
      .filter(({ currency }) => currency.toUpperCase() !== "INR")
      .map(async ({ currency, amount }) => {
        
        const planId = await createPayPalPlan({
          productId,
          price: amount,
          intervalUnit: interval_unit,
          intervalCount: interval_count,
          currency,
        });
        return { currency, paypalPlanId: planId };
      })
    );
    return plans;
  },
};
