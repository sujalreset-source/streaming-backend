import { createRazorpayPlan } from "../utils/razorpay.js";



export const razorpayProvider = {
  async createPlan(artistName, price, interval, period) {
   
    return await createRazorpayPlan(artistName, price, interval, period);
  }
};
