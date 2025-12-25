import { Transaction } from "../models/Transaction.js";

const markTransactionPaid = async (data) => {
  return await Transaction.findOneAndUpdate(
    { paymentId: data.paymentId },
    { status: "paid", ...data },
    { new: true }
  );
};

export const transactionRepository = { markTransactionPaid };
