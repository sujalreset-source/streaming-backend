import { User } from "../models/User.js";

const findById = async (id) => {
  return await User.findById(id).lean();
};

export const userRepository = { findById };
