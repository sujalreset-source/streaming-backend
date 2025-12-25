export const createStripeIntent = jest.fn(() => ({
  clientSecret: "mock-secret",
  transactionId: "mock-tx"
}));

export const createRazorpayOrder = jest.fn(() => ({
  orderId: "mock-razorpay-order",
  transactionId: "mock-tx"
}));
