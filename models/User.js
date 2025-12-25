import mongoose from "mongoose";
import validator from "validator";

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters long"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: "Please enter a valid email",
    },
  },
  password: {
    type: String,
    minlength: [8, "Password must be at least 8 characters long"],
    select: false,
    required: function () {
      return !this.googleId; // agar Google login hai to password required nahi
    },
  },
  googleId: {
    type: String, // store Google profile id if you want
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpire: {
    type: Date,
  },
  dob: {
    type: Date,
  },
  role: {
    type: String,
    enum: ["user", "artist", "artist-pending", "admin"],
    default: "user",
  },
  profileImage: {
    type: String,
    default: "",
  },
  
  preferredGenres: [
    {
      type: String,
      trim: true,
    },
  ],
 artistId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Artist",
  default: null,
},


  
}, { timestamps: true });



export const User = mongoose.model("User", schema);
