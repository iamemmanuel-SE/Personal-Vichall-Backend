import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import PasswordReset from "../models/PasswordReset.js";
import { requireAuth } from "../middleware/authMiddleware.js";



const router = express.Router();

// Convert "DD / MM / YYYY" to a Date
function parseDob(dobStr) {
  const digits = (dobStr || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  const d = new Date(year, month - 1, day);

  const valid =
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day;

  return valid ? d : null;
}

function gen4DigitCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function genToken() {
  return `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

function signJwt(user) {
  if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET in server/.env");

  return jwt.sign(
    { sub: user._id.toString(), role: user.role }, //include role
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}


/**
 * REGISTER
 * returns token + user
 */
router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dob,
      phone,
      email,
      password,
      confirmPassword,
    } = req.body;

    if (!firstName || !lastName || !dob || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const dobDate = parseDob(dob);
    if (!dobDate) {
      return res.status(400).json({ message: "Invalid date of birth." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      firstName,
      lastName,
      dob: dobDate,
      phone: phone || "",
      email: normalizedEmail,
      passwordHash,
    });

    const token = signJwt(user);

    return res.status(201).json({
      message: "Account created",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        dob: user.dob,
        role: user.role, // role added to signed up user
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * LOGIN
 * returns token + user
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signJwt(user);

    return res.status(200).json({
      message: "Logged in",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        dob: user.dob,
        role: user.role, // role added to logged in user
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * GET CURRENT USER
 * GET /api/auth/me
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("firstName lastName email phone dob role");
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.json({
      ok: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        dob: user.dob,
        role: user.role, // role added
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * FORGOT PASSWORD (generate code)
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No account found for that email." });

    const code = gen4DigitCode();
    const codeHash = await bcrypt.hash(code, 10);

    await PasswordReset.findOneAndUpdate(
      { email },
      {
        email,
        codeHash,
        codeExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attemptsLeft: 5,
        verified: false,
        resetTokenHash: null,
        resetExpiresAt: null,
      },
      { upsert: true, new: true }
    );

    console.log(`[RESET CODE] ${email}: ${code}`);

    const payload = { ok: true };
    if (process.env.NODE_ENV !== "production") payload.devCode = code;
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * RESEND RESET CODE
 */
router.post("/resend-reset-code", async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No account found for that email." });

    const code = gen4DigitCode();
    const codeHash = await bcrypt.hash(code, 10);

    await PasswordReset.findOneAndUpdate(
      { email },
      {
        email,
        codeHash,
        codeExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attemptsLeft: 5,
        verified: false,
        resetTokenHash: null,
        resetExpiresAt: null,
      },
      { upsert: true, new: true }
    );

    console.log(`[RESET CODE - RESEND] ${email}: ${code}`);

    const payload = { ok: true };
    if (process.env.NODE_ENV !== "production") payload.devCode = code;
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * VERIFY RESET CODE
 */
router.post("/verify-reset-code", async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const code = String(req.body?.code || "").trim();

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const reset = await PasswordReset.findOne({ email });
    if (!reset) return res.status(404).json({ message: "No reset request found." });

    if (Date.now() > new Date(reset.codeExpiresAt).getTime()) {
      return res.status(400).json({ message: "Code expired. Please resend a new code." });
    }

    if (reset.attemptsLeft <= 0) {
      return res.status(400).json({ message: "Too many attempts. Please resend a new code." });
    }

    const ok = await bcrypt.compare(code, reset.codeHash);
    if (!ok) {
      reset.attemptsLeft -= 1;
      await reset.save();
      return res.status(400).json({ message: `Incorrect code. Attempts left: ${reset.attemptsLeft}` });
    }

    const resetToken = genToken();
    reset.verified = true;
    reset.resetTokenHash = await bcrypt.hash(resetToken, 10);
    reset.resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await reset.save();

    return res.json({ ok: true, resetToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

/**
 * RESET PASSWORD
 */
router.post("/reset-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const resetToken = String(req.body?.resetToken || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const reset = await PasswordReset.findOne({ email });
    if (!reset) return res.status(400).json({ message: "Missing reset session." });
    if (!reset.verified) return res.status(400).json({ message: "Code not verified." });

    if (!reset.resetExpiresAt || Date.now() > new Date(reset.resetExpiresAt).getTime()) {
      return res.status(400).json({ message: "Reset session expired. Start again." });
    }

    const tokenOk = await bcrypt.compare(resetToken, reset.resetTokenHash || "");
    if (!tokenOk) return res.status(400).json({ message: "Invalid reset token." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    await PasswordReset.deleteOne({ email });

    return res.json({ ok: true, message: "Password reset successful." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;
