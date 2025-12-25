import paypal from "@paypal/checkout-server-sdk";

let client;

export const paypalClient = () => {
  if (!client) {
    const env = process.env.NODE_ENV === "production"
      ? new paypal.core.LiveEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        )
      : new paypal.core.SandboxEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        );

    client = new paypal.core.PayPalHttpClient(env);
  }
  return client;
};
