import { StatusCodes } from "http-status-codes";
import { Subscription } from "../models/Subscription.js";
import { Artist } from "../models/Artist.js";
import { Transaction } from "../models/Transaction.js";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { createRazorpayOrder } from "../utils/razorpay.js";
import { getOrCreateStripeCustomer } from "../utils/stripe.js";
import Stripe from "stripe";
import {User} from "../models/User.js";
import Razorpay from "razorpay";
import { createRazorpayPlan } from "../utils/razorpay.js";
import { razorpay } from "../utils/razorpay.js";
import {getPayPalAccessToken} from "../utils/getPaypalAccessToken.js";
import paypal from "@paypal/checkout-server-sdk";
import  {paypalClient}  from "../utils/paypalClient.js";
import { PAYPAL_API} from "../utils/getPaypalAccessToken.js";
import { getSubscriptionAmount } from "../utils/getSubscriptionAmount.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
export const initiateArtistSubscription = async (req, res) => {
  const userId = req.user._id;
  const { paymentMethodId, gateway } = req.body;
  const { artistId } = req.params;
  const {line1, city, state, postal_code, country} = req.body
  const address = {
    line1,
    city,
    state,
    postal_code,
    country,
  };

  if (gateway !== 'stripe') {
    return res.status(400).json({ message: 'Invalid gateway' });
  }

  // ✅ Check if subscription is already in process or active
const existingActiveSub = await Subscription.findOne({
  userId,
  artistId,
  status: "active",
  validUntil: { $gt: new Date() }, // still valid
});

if (existingActiveSub) {
  return res.status(400).json({ message: 'Subscription already active.' });
}

  // const user = await User.findById(userId);
  // const artist = await Artist.findById(artistId);

  const [user, artist] = await Promise.all([
    User.findById(userId),
    Artist.findById(artistId)
  ]);

  if (!user || !artist) {
    return res.status(404).json({ message: 'User or artist not found' });
  }
let customerId = user.stripeCustomerId;
  // Ensure customer exists or create
 if (!customerId) {
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    address: address,
  });
  customerId = customer.id;
  user.stripeCustomerId = customerId;
  await user.save();
} else {
  // 👇 Ensure address is present even for existing customers
  await stripe.customers.update(customerId, {
    name: user.name,
    address: address,
  });
}

  await stripe.paymentMethods.attach(paymentMethodId, {
  customer: customerId,
});

// 2. Set as default for invoices
await stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId,
  },
});

  // Create Stripe subscription using saved payment method
 const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: artist.stripePriceId }],
  payment_behavior: 'default_incomplete', // 👈 ensures first payment must be confirmed
  expand: ['latest_invoice.payment_intent'],
  default_payment_method: paymentMethodId, // ✅ set default method for subscription
  payment_settings: {
    payment_method_types: ['card'],
    save_default_payment_method: 'on_subscription', // ✅ important for recurring payments
  },
  metadata: {
    userId: userId.toString(),
    artistId: artistId.toString(),
  },
});



  // Create transaction in DB
  const transaction = await Transaction.create({
    userId,
    artistId,
    itemId: artistId,
    itemType: 'artist-subscription',
    amount: artist.subscriptionPrice || 500,
    currency: 'inr',
    status: 'pending',
    gateway: 'stripe',
    stripeSubscriptionId: subscription.id,
  });


let clientSecret = null;
if (subscription.latest_invoice && !subscription.latest_invoice.payment_intent) {
  // Set payment method on the invoice if missing
  if (!subscription.latest_invoice.default_payment_method) {
    await stripe.invoices.update(subscription.latest_invoice.id, {
      default_payment_method: paymentMethodId,
    });
  }
  // Attempt payment
  await stripe.invoices.pay(subscription.latest_invoice.id);
  // Fetch the invoice again with expanded payment_intent
  const invoice = await stripe.invoices.retrieve(subscription.latest_invoice.id, {
    expand: ['payment_intent'],
  });
  clientSecret = invoice.payment_intent?.client_secret || null;
} else {
  clientSecret = subscription.latest_invoice?.payment_intent?.client_secret || null;
}

  // Safely get clientSecret if available (needed for SCA)
  //const clientSecret = subscription?.latest_invoice?.payment_intent?.client_secret || null;
   console.log("🧾 Returning clientSecret for first invoice:", clientSecret);
   console.log("DEBUG subscription.latest_invoice:", subscription.latest_invoice);
   console.log("DEBUG subscription.latest_invoice.payment_intent:", subscription.latest_invoice?.payment_intent);



  res.status(200).json({
    message: 'Subscription initiated',
    subscriptionId: subscription.id,
    clientSecret, // will be null if not required
  });
};

export const cancelArtistStripeSubscription = async (req, res) => {
  try {
    const { artistId } = req.params;
    const userId = req.user._id;

    const sub = await Subscription.findOne({
      userId,
      artistId,
      status: "active",
      validUntil: { $gt: new Date() },
    });

    if (!sub) {
      return res.status(404).json({ message: "No active subscription found." });
    }

    // Step 1: Mark as cancelled in DB
    sub.status = "cancelled";
    await sub.save();

    // Step 2: Cancel at Stripe if needed
    if (sub.gateway === "stripe" && sub.externalSubscriptionId) {
      try {
        await stripe.subscriptions.update(sub.externalSubscriptionId, {
          cancel_at_period_end: true,
        });
        console.log("⛔ Stripe subscription set to cancel at period end");
      } catch (err) {
        console.warn("⚠️ Stripe cancel failed:", err.message);
      }
    }

    // Step 3: Cancel at Razorpay if needed
    else if (sub.gateway === "razorpay" && sub.externalSubscriptionId) {
      try {
        await razorpay.subscriptions.cancel(sub.externalSubscriptionId);
        console.log("⛔ Razorpay subscription cancelled immediately");
      } catch (err) {
        console.warn("⚠️ Razorpay cancel failed:", err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Subscription cancelled. If paid, access will remain until expiry.",
    });
  } catch (error) {
    console.error("❌ Error in cancelArtistSubscription:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// controllers/paymentController.js
export const createSetupIntent = async (req, res) => {
  const user = await User.findById(req.user._id);
  const customerId = await getOrCreateStripeCustomer(user);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    usage: "off_session", // for subscriptions
  });

  res.status(200).json({ clientSecret: setupIntent.client_secret });
};

const PLAN_DURATION_MAP = {
  3: 3,
  6: 6,
  12: 12,
};


export const createRazorpaySubscription = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { cycle } = req.body; // "1m", "3m", "6m", "12m"
    const user = req.user;
  

    // Validate cycle
    const validCycles = [ "1m", "3m", "6m", "12m"];
    if (!validCycles.includes(cycle)) {
      throw new BadRequestError("Invalid subscription cycle. Use 1m, 3m, 6m, or 12m.");
    }

    // ✅ Fetch artist and the correct plan
    const artist = await Artist.findById(artistId).select("subscriptionPlans name");
    if (!artist) {
      throw new NotFoundError("Artist not found");
    }

    const plan = artist.subscriptionPlans.find((p) => p.cycle === cycle);
    if (!plan || !plan.razorpayPlanId) {
      throw new NotFoundError(`No Razorpay plan found for cycle ${cycle}`);
    }

      const amount = getSubscriptionAmount(artist.subscriptionPlans[0], "INR");

    // ✅ Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.razorpayPlanId,
      total_count: cycle === "1m" ? 12 : cycle === "3m" ? 4 : cycle === "6m" ? 2 : 12, // number of billing cycles
      customer_notify: 1,
      notes: {
        userId: user._id.toString(),
        artistId: artistId.toString(),
        cycle,
      },
    });

    // ✅ Save transaction as pending
    await Transaction.create({
      userId: user._id,
      itemType: "artist-subscription",
      itemId: artistId,
      artistId,
      amount, // per-cycle price (not multiplied, because Razorpay charges per cycle)
      currency: "INR",
      gateway: "razorpay",
      status: "pending",
      metadata: {
        razorpaySubscriptionId: subscription.id,
        cycle,
      },
    });

    res.status(201).json({
      success: true,
      subscriptionId: subscription.id,
      cycle,
    });
  } catch (error) {
    console.log("❌ Error creating Razorpay subscription:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const createPaypalSubscription = async (req, res) => {
  const { artistId } = req.params;
  const { cycle, currency = "USD" } = req.body;
  const user = req.user;

  const artist = await Artist.findById(artistId).select("subscriptionPlans name");
  if (!artist) throw new NotFoundError("Artist not found");

  const plan = artist.subscriptionPlans.find((p) => p.cycle === cycle);
  if (!plan) throw new NotFoundError(`No plan for cycle ${cycle}`);

  const amount = getSubscriptionAmount(artist.subscriptionPlans[0], currency);

  // ✅ pick correct PayPal plan for currency
  const paypalPlan = plan.paypalPlans?.find((pp) => pp.currency === currency);
  if (!paypalPlan) throw new BadRequestError(`No PayPal plan for ${currency}`);

  // ✅ Use REST API instead of SDK
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: paypalPlan.paypalPlanId,
      application_context: {
        brand_name: artist.name,
        user_action: "SUBSCRIBE_NOW",
        return_url: `${process.env.FRONTEND_URL}/paypal/sub-success`,
        cancel_url: `${process.env.FRONTEND_URL}/paypal/sub-cancel`,
      },
    }),
  });

  const subscription = await response.json();
  if (!response.ok) {
    throw new Error(`PayPal subscription creation failed: ${JSON.stringify(subscription)}`);
  }

  const approveLink = subscription.links.find((l) => l.rel === "approve")?.href;

  // ✅ Save transaction in DB
  const transaction = await Transaction.create({
    userId: user._id,
    itemType: "artist-subscription",
    itemId: artistId,
    artistId,
    amount,
    currency,
    gateway: "paypal",
    status: "pending",
    metadata: {
      paypalSubscriptionId: subscription.id,
      cycle,
      paypalPlanId: paypalPlan.paypalPlanId,
    },
  });
  console.log("transaction", transaction)

  res.json({
    success: true,
    subscriptionId: subscription.id,
    approveUrl: approveLink,
  });
};

export const cancelPaypalSubscription = async (req, res) => {
  const { subscriptionId } = req.params;
  const user = req.user;

  // ✅ Find the transaction
  const transaction = await Transaction.findOne({
    userId: user._id,
    "metadata.paypalSubscriptionId": subscriptionId,
    gateway: "paypal",
  });

  if (!transaction) throw new NotFoundError("Subscription transaction not found");

  // ✅ Call PayPal API to cancel subscription
  const token = await getPayPalAccessToken();
  const response = await fetch(`${process.env.PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: "User requested cancellation",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`PayPal subscription cancellation failed: ${JSON.stringify(errorData)}`);
  }

  // ✅ Update transaction status
  transaction.status = "cancelled";
  transaction.cancelledAt = new Date();
  await transaction.save();

  res.json({
    success: true,
    message: "Subscription cancelled successfully",
    subscriptionId,
  });
};



export const cancelArtistSubscription = async (req, res) => {
  try {
    const { artistId } = req.params;
    const user = req.user;

    // ✅ Find active subscription
    const subscription = await Subscription.findOne({
      userId: user._id,
      artistId,
      status: "active",
    });

    if (!subscription) {
      throw new NotFoundError("No active subscription found for this artist");
    }

    let gatewayResponse;
    if (subscription.gateway === "razorpay") {
      // ✅ Cancel Razorpay subscription
      gatewayResponse = await razorpay.subscriptions.cancel(
        subscription.externalSubscriptionId,
        { cancel_at_cycle_end: 1 } // cancel but let current cycle run
      );

    } else if (subscription.gateway === "paypal") {
      // ✅ Cancel PayPal subscription
      const token = await getPayPalAccessToken();
      const response = await fetch(
        `${process.env.PAYPAL_API}/v1/billing/subscriptions/${subscription.externalSubscriptionId}/cancel`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "User requested cancellation",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `PayPal subscription cancellation failed: ${JSON.stringify(errorData)}`
        );
      }
      gatewayResponse = await response.text();

    } else {
      throw new BadRequestError(`Unsupported gateway: ${subscription.gateway}`);
    }

    // ✅ Update subscription status
    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    subscription.isRecurring = false;
    if (!subscription.cycle) {
  const txn = await Transaction.findOne({
    userId: user._id,
    artistId,
    gateway: subscription.gateway,
    "metadata.cycle": { $exists: true },
  }).lean();

  if (txn?.metadata?.cycle) {
    subscription.cycle = txn.metadata.cycle;
  }
}
    await subscription.save();

    // ✅ Update transaction status too
    await Transaction.updateMany(
      {
        userId: user._id,
        artistId,
        "metadata.*SubscriptionId": subscription.externalSubscriptionId,
        gateway: subscription.gateway,
        status: { $in: ["pending", "active"] },
      },
      {
        $set: { status: "cancelled", cancelledAt: new Date() },
      }
    );

    res.json({
      success: true,
      message: "Subscription cancelled successfully",
      gateway: subscription.gateway,
      gatewayResponse,
    });
  } catch (error) {
    console.error("❌ Cancel subscription error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
