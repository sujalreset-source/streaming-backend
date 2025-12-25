export const PAYPAL_API = process.env.PAYPAL_API || "https://api-m.sandbox.paypal.com"
const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// export default async function getPayPalAccessToken() {
//   const res = await axios({
//     url: `${PAYPAL_API}/v1/oauth2/token`,
//     method: "post",
//     data: "grant_type=client_credentials",
//     auth: {
//       username: PAYPAL_CLIENT,
//       password: PAYPAL_SECRET,
//     },
//   });
//   return res.data.access_token;
// }

import fetch from "node-fetch";



// get access token
export const getPayPalAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
};

// create product for artist
export const createPayPalProduct = async (artistName) => {
  const token = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Subscription for ${artistName}`,
      type: "SERVICE",
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`PayPal product creation failed: ${JSON.stringify(data)}`);
  return data.id;
};

// create plan for recurring billing
export const createPayPalPlan = async ({ productId, price, intervalUnit, intervalCount, currency = "USD" }) => {
  const token = await getPayPalAccessToken();
  console.log("Creating PayPal plan with:", { productId, price, intervalUnit, intervalCount, currency });

  const response = await fetch(`${PAYPAL_API}/v1/billing/plans`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      name: `Plan ${intervalCount} ${intervalUnit} @ ${price} ${currency}`,
      billing_cycles: [
        {
          frequency: { interval_unit: intervalUnit, interval_count: intervalCount },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: price.toString(), currency_code: currency },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`PayPal plan creation failed: ${JSON.stringify(data)}`);
  return data.id;
};
