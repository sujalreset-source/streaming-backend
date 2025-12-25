export const cycleToInterval = (cycle) => {
  switch (cycle) {
    case "1m":
      return {
        stripe: { interval: "month", interval_count: 1 },
        razorpay: { period: "monthly", interval: 1 },
        paypal: { interval_unit: "MONTH", interval_count: 1 },
      };
    case "3m":
      return {
        stripe: { interval: "month", interval_count: 3 },
        razorpay: { period: "monthly", interval: 3 },
        paypal: { interval_unit: "MONTH", interval_count: 3 },
      };
    case "6m":
      return {
        stripe: { interval: "month", interval_count: 6 },
        razorpay: { period: "monthly", interval: 6 },
        paypal: { interval_unit: "MONTH", interval_count: 6 },
      };
    case "12m":
      return {
        stripe: { interval: "year", interval_count: 1 },
        razorpay: { period: "yearly", interval: 1 },
        paypal: { interval_unit: "YEAR", interval_count: 1 },
      };
    default:
      throw new BadRequestError("Invalid subscription cycle. Use 1m, 3m, 6m, or 12m.");
  }
};