import { Counter } from "../models/Counter.js";

export const getNextInvoiceNumber = async () => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { name: "invoice" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const year = new Date().getFullYear();
    const paddedSeq = String(counter.seq).padStart(6, "0"); // pad to 6 digits

    return `INV-${year}-${paddedSeq}`; // INV-2025-001001
  } catch (err) {
    console.error("Failed to generate invoice number:", err);
    throw new Error("Could not generate invoice number");
  }
};
