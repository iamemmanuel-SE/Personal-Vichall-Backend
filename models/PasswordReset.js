import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },

    codeHash: { type: String, required: true },
    codeExpiresAt: { type: Date, required: true },
    attemptsLeft: { type: Number, default: 5 },

    verified: { type: Boolean, default: false },

    resetTokenHash: { type: String, default: null },
    resetExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("PasswordReset", passwordResetSchema);
