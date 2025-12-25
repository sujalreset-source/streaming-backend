import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import { Transaction } from "../models/Transaction.js";
import { Song } from "../models/Song.js";
import { Album } from "../models/Album.js";
import { createStripePaymentIntent } from "../utils/stripe.js";
import { createRazorpayOrder as createRazorpayOrderUtil } from "../utils/razorpay.js";
import { log } from "console";
import { Subscription } from "../models/Subscription.js";
import paypal from "@paypal/checkout-server-sdk";
import  {paypalClient}  from "../utils/paypalClient.js";
// ✅ Stripe: Purchase song, album, or artist-subscription
export const createStripePayment = async (req, res) => {
const { itemType, itemId, amount, currency = "INR" } = req.body;
const userId = req.user._id;

if (!["song", "album", "artist-subscription"].includes(itemType)) {
throw new BadRequestError("Invalid item type. Must be 'song', 'album', or 'artist-subscription'.");
}

// ✅ Get artistId depending on item type
let artistId;

if (itemType === "song") {
const song = await Song.findById(itemId).select("artist");
if (!song) throw new NotFoundError("Song not found");
artistId = song.artist;
} else if (itemType === "album") {
const album = await Album.findById(itemId).select("artist");
if (!album) throw new NotFoundError("Album not found");
artistId = album.artist;
} else if (itemType === "artist-subscription") {
artistId = itemId; // already artistId
}

// ✅ Create Transaction
const transaction = await Transaction.create({
userId,
itemType,
itemId,
artistId,
amount,
currency,
gateway: "stripe",
status: "pending",
});

// ✅ Create Stripe PaymentIntent
const stripePayment = await createStripePaymentIntent(amount, userId, {
itemType,
itemId,
transactionId: transaction._id,
});

// ✅ Save PaymentIntent ID
transaction.paymentIntentId = stripePayment.id;
await transaction.save();

return res.status(StatusCodes.CREATED).json({
success: true,
clientSecret: stripePayment.client_secret,
});
};



// ✅ Razorpay One-Time Payment (Song/Album)
export const createRazorpayOrder = async (req, res) => {
  const { itemType, itemId, amount, currency  } = req.body;
  const userId = req.user._id;

  if (!["song", "album"].includes(itemType)) {
    throw new BadRequestError("Invalid item type. Must be 'song' or 'album'.");
  }

  // ✅ Get artistId (optional but useful for records)
  let artistId;
  if (itemType === "song") {
    const song = await Song.findById(itemId).select("artist");
    if (!song) throw new NotFoundError("Song not found");
    artistId = song.artist;
  } else if (itemType === "album") {
    const album = await Album.findById(itemId).select("artist");
    if (!album) throw new NotFoundError("Album not found");
    artistId = album.artist;
  }
    const subscription = await Subscription.findOne({
        userId,
        artistId,
        status: { $in: ["active"] }, 
      });
  
      if (!subscription) 
         return res.status(400).json({ "message" : "No active subscription found for this artist.", artistId });

  // ✅ Create Razorpay Order
const razorpayOrder = await createRazorpayOrderUtil(amount, userId, itemType, itemId, {}, currency);
  
  
  
  // ✅ Save Transaction in DB
  await Transaction.create({
    userId,
    itemType,
    itemId,
    artistId,
    amount,
    currency,
    gateway: "razorpay",
    status: "pending",
    razorpayOrderId: razorpayOrder.id,
  });
  
  return res.status(201).json({ success: true, order: razorpayOrder });
};





// ✅ Create PayPal Order
export const createPaypalOrder = async (req, res) => {
  const { itemType, itemId, amount, currency = "USD" } = req.body;
  const userId = req.user._id;

  if (!["song", "album"].includes(itemType)) {
    throw new BadRequestError("Invalid item type. Must be 'song' or 'album'.");
  }

  let artistId;
  if (itemType === "song") {
    const song = await Song.findById(itemId).select("artist");
    if (!song) throw new NotFoundError("Song not found");
    artistId = song.artist;
  } else {
    const album = await Album.findById(itemId).select("artist");
    if (!album) throw new NotFoundError("Album not found");
    artistId = album.artist;
  }


   const subscription = await Subscription.findOne({
        userId,
        artistId,
        status: { $in: ["active"] }, 
      });
  
      if (!subscription) 
         return res.status(400).json({ "message" : "No active subscription found for this artist.", artistId });


  // ✅ Create PayPal order with metadata in custom_id
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{
      amount: { currency_code: currency, value: amount.toFixed(2) },
      description: `${itemType} purchase`,
      custom_id: JSON.stringify({ type: itemType, itemId, userId }), // 👈 embed metadata
    }],
    application_context: {
      brand_name: "YourApp",
      user_action: "PAY_NOW",
      return_url: `${process.env.FRONTEND_URL}/paypal/success`,
      cancel_url: `${process.env.FRONTEND_URL}/paypal/cancel`,
    },
  });
  console.log("Creating PayPal order with request:", request);

  const order = await paypalClient().execute(request);
  console.log("PayPal order created:", order);
  // ✅ Save Transaction in DB
  await Transaction.create({
    userId,
    itemType,
    itemId,
    artistId,
    amount,
    currency,
    gateway: "paypal",
    status: "pending",
    paypalOrderId: order.result.id,
  });

  return res.status(201).json({
    success: true,
    id: order.result.id,
    links: order.result.links,
  });
};

// ✅ Capture PayPal Order
export const capturePaypalOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) throw new BadRequestError("orderId is required");

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const response = await paypalClient().execute(request);

    // ✅ Mark transaction as paid
    const transaction = await markTransactionPaid({
      gateway: "paypal",
      paymentId: response.result.id, // capture ID
    });

    if (transaction) {
      await updateUserAfterPurchase(transaction, response.result.id);
      console.log("✅ PayPal one-time purchase completed:", transaction.itemType, transaction.itemId);
    } else {
      console.warn("⚠️ No matching transaction found for capture:", response.result.id);
    }

    return res.status(200).json({
      success: true,
      data: response.result,
    });
  } catch (error) {
    console.error("❌ PayPal capture error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
