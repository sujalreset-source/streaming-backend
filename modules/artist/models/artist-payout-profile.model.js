// src/modules/artist-payout/models/artist-payout-profile.model.js
import mongoose from "mongoose";
// import encryption helper (implement using KMS or library in prod)
import { encryptField, decryptField } from "../../../utils/crypto.util.js";

const artistPayoutSchema = new mongoose.Schema({
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true, index: true, unique: true },
  // Basic bank data (encrypted)
  accountHolderName: { type: String, required: true },
  accountNumberEncrypted: { type: String, required: true }, // encrypted
  ifscCodeEncrypted: { type: String, default: null }, // encrypted (India)
  ibanEncrypted: { type: String, default: null }, // encrypted (EU)
  routingNumberEncrypted: { type: String, default: null }, // US
  swiftCodeEncrypted: { type: String, default: null },
  currency: { type: String, maxlength: 3, uppercase: true, default: "INR" },
  country: { type: String, maxlength: 2, uppercase: true, default: null },

  // Tax and KYC
  taxIdEncrypted: { type: String, default: null }, // PAN / TAX ID etc
  kycStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
  kycDocuments: { type: [{ url: String, type: String, uploadedAt: Date }], default: [] },

  // Operational controls
  isPayoutMethodActive: { type: Boolean, default: true },
  isPayoutBlocked: { type: Boolean, default: false },
  lastVerifiedAt: { type: Date, default: null },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

// Virtual helpers + convenience methods for encryption (implement util securely)
artistPayoutSchema.methods.getDecryptedAccountNumber = function () {
  if (!this.accountNumberEncrypted) return null;
  return decryptField(this.accountNumberEncrypted);
};

artistPayoutSchema.methods.setAccountNumber = function (plain) {
  this.accountNumberEncrypted = encryptField(plain);
};

artistPayoutSchema.methods.setIFSC = function (plain) {
  this.ifscCodeEncrypted = plain ? encryptField(plain) : null;
};

artistPayoutSchema.methods.setIBAN = function (plain) {
  this.ibanEncrypted = plain ? encryptField(plain) : null;
};

export const ArtistPayoutProfile = mongoose.models.ArtistPayoutProfile || mongoose.model("ArtistPayoutProfile", artistPayoutSchema);
export default ArtistPayoutProfile;
