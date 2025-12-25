// session.model.js
import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true }, // JWT or refresh token
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  userAgent: String, // optional (device info)
  ip: String,        // optional
});

export default mongoose.model("Session", sessionSchema);
