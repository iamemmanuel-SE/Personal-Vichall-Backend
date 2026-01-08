import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    phone: { type: String, trim: true, default: "" },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },

    // models/User.js
    loyalty: {
    isMember: { type: Boolean, default: false },
    bookingCount: { type: Number, default: 0 }
    },


    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
