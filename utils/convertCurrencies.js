import fetch from "node-fetch";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR"];
const ZERO_DECIMAL_CURRENCIES = ["JPY", "KRW", "HUF", "VND"];

const HARDCODED_RATES = {
  USD: { EUR: 0.86, GBP: 0.75, JPY: 151.8, INR: 88.16},
  EUR: { USD: 1.16, GBP: 0.87, JPY: 176.19, INR: 102.57 },
  GBP: { USD: 1.34, EUR: 1.15, JPY: 202.20, INR: 117.70 },
  JPY: { USD: 0.0066, EUR: 0.0057, GBP: 0.0049, INR: 0.58 },
  INR: { USD: 0.011, EUR: 0.0097, GBP: 0.0085, JPY: 1.72 },
};

export const EXCHANGE_RATES = {
  USD: 1,          // base
  INR: 0.011,      // 1 INR ≈ 0.012 USD
  GBP: 1.34,       // 1 GBP ≈ 1.24 USD
  EUR: 1.16,       // 1 EUR ≈ 1.07 USD
  JPY: 0.0066      // 1 JPY ≈ 0.0067 USD
};
// import { getCached, setCached } from "../utils/cache.js";
// // import { SUPPORTED_CURRENCIES } from "../constants/currencies.js";

// function formatAmount(amount, currency) {
//   if (ZERO_DECIMAL_CURRENCIES.includes(currency)) {
//     return Math.round(amount); // no decimals allowed
//   }
//   return Math.round(amount * 100) / 100; // 2 decimals max
// }

// export async function convertCurrencies(baseCurrency, amount) {
//   const cacheKey = `currencyRates:${baseCurrency}`;

//   try {
//     // 1. Try fresh API call
//     const res = await fetch(
//       `https://api.freecurrencyapi.com/v1/latest?apikey=${process.env.FREECURRENCY_KEY}&base_currency=${baseCurrency}`
//     );

//     if (!res.ok) {
//       throw new Error(`Currency API failed: ${res.status}`);
//     }

//     const data = await res.json();
//     const rates = data.data;

//     // 2. Save rates to cache (1h TTL)
//     await setCached(cacheKey, rates, 3600);

//     // 3. Return computed conversions with proper formatting
//     return SUPPORTED_CURRENCIES.filter((c) => c !== baseCurrency).map((currency) => ({
//       currency,
//       amount: formatAmount(amount * rates[currency], currency),
//     }));
//   } catch (err) {
//     console.error("❌ Currency API failed, falling back to cache:", err.message);

//     // 4. Fallback → old cached rates (even if expired)
//     const cachedRates = await getCached(cacheKey);
//     if (cachedRates) {
//       return SUPPORTED_CURRENCIES.filter((c) => c !== baseCurrency).map((currency) => ({
//         currency,
//         amount: formatAmount(amount * cachedRates[currency], currency),
//       }));
//     }

//     // 5. If no cache → fail gracefully
//     return SUPPORTED_CURRENCIES.filter((c) => c !== baseCurrency).map((currency) => ({
//       currency,
//       amount: null,
//     }));
//   }
// }
// utils/currencyConverter.js

// Hardcoded conversion rates (relative to USD)
// const RATES = {
//   EUR: 0.9,    // 1 USD = 0.9 EUR
//   INR: 88.3,   // 1 USD = 88.3 INR
//   GBP: 0.78,   // 1 USD = 0.78 GBP
//   JPY: 146.5,  // 1 USD = 146.5 JPY
//   USD: 1,      // base
// };

// /**
//  * Convert an amount in USD to multiple currencies
//  * @param {number} amountUSD - amount in USD
//  * @param {string[]} targetCurrencies - array of target currency codes
//  * @returns {Array<{ currency: string, amount: number }>}
//  */
// Format according to currency rules
function formatAmount(amount, currency) {
  if (ZERO_DECIMAL_CURRENCIES.includes(currency)) {
    return Math.round(amount); // no decimals allowed
  }
  return Math.round(amount * 100) / 100; // 2 decimals max
}

/**
 * Convert amount from baseCurrency to supported currencies
 */
export async function convertCurrencies(baseCurrency, amount) {
  console.log("Converting", amount, baseCurrency);
  if (!HARDCODED_RATES[baseCurrency]) {
    throw new Error(`Unsupported base currency: ${baseCurrency}`);
  }

  return SUPPORTED_CURRENCIES.filter((c) => c !== baseCurrency).map((currency) => {
    const rate = HARDCODED_RATES[baseCurrency][currency];
    if (!rate) {
      return { currency, amount: null };
    }
    return {
      currency,
      amount: formatAmount(amount * rate, currency),
    };
  });
}
