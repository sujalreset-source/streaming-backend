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
  const { itemType, itemId, amount, currency = "INR" } = req.body;
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
        status: { $in: ["active", "cancelled"] }, 
      });
  
      if (!subscription) 
         return res.status(400).json({ "message" : "No active subscription found for this artist.", artistId });

  // ✅ Create Razorpay Order
const razorpayOrder = await createRazorpayOrderUtil(amount, userId, itemType, itemId);
  
  
  
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



export const createPaypalOrder = async (req, res) => {
  const { itemType, itemId, price } = req.body;
  const userId = req.user._id;
  const amount  = price.amount;
  const currency = price.currency || "USD";

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

  // ✅ Create PayPal order
  const request = new paypal.orders.OrdersCreateRequest();
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{
      amount: { currency_code: currency, value: amount.toFixed(2) },
      description: `${itemType} purchase`,
    }],
    application_context: {
      return_url: `${process.env.FRONTEND_URL}/paypal/success`,
      cancel_url: `${process.env.FRONTEND_URL}/paypal/cancel`,
    },
  });

  const order = await paypalClient().execute(request);

  // ✅ Save Transaction
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

  return res.status(201).json({ success: true, id: order.result.id, links: order.result.links });
};
export const capturePaypalOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const response = await paypalClient().execute(request);

    return res.status(200).json({
      success: true,
      data: response.result,
    });
  } catch (error) {
    console.error("❌ PayPal capture error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};