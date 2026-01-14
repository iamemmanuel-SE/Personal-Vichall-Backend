import express from "express";
import Booking from "../models/bookings.js";
import Event from "../models/eventsSchema.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { sendBookingConfirmation } from "../Services/brevoService.js";
import { applyLoyaltyAfterSuccessfulPayment } from "../utils/loyalty.js";

const router = express.Router();

router.post("/mock", requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: "bookingId is required" });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (String(booking.user) !== String(req.userId)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (booking.status === "paid") {
      return res.json({ ok: true, booking, message: "Already paid" });
    }

    booking.status = "paid";
    await booking.save();

    const user = await User.findById(booking.user);

    const changed = applyLoyaltyAfterSuccessfulPayment({ booking, user });
    if (changed) await user.save();

    // applyLoyaltyAfterSuccessfulPayment({ booking, user });
    // await user.save();

    //  Send confirmation email
    try {
      const user = await User.findById(req.userId);
      const event = await Event.findById(booking.event);

      const toEmail = user?.email;
      const toName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Customer";

      if (toEmail) {
        await sendBookingConfirmation({ toEmail, toName, booking, event });
      } else {
        console.log("Brevo email skipped: user has no email");
      }
    } catch (e) {
      console.log("❌ Brevo email failed:", e?.message || e);
      // do not fail payment if email fails
    }

    return res.json({ ok: true, booking, message: "Payment successful (mock)" });
  } catch (err) {
    return res.status(500).json({ message: "Mock payment failed", error: err.message });
  }
});

export default router;
