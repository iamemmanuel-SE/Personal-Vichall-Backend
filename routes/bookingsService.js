import express from "express";
import Booking from "../models/bookings.js";
import Event from "../models/eventsSchema.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { computeBestDiscount } from "../utils/pricing.js";

const router = express.Router();

// For now: basic prices (replace with your own seat multipliers later)
const BASE_PRICE = 50;

router.post("/", requireAuth, async (req, res) => {
  try {
    const { eventId, tickets, hasLoyalty = false } = req.body;

    if (!eventId) return res.status(400).json({ message: "eventId is required." });
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ message: "tickets array is required." });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    // Validate categories + count
    const categoryCounts = { child: 0, senior: 0, adult: 0 };

    for (const t of tickets) {
      const cat = String(t.category || "").toLowerCase();
      if (!["child", "senior", "adult"].includes(cat)) {
        return res.status(400).json({ message: "Invalid category (child/senior/adult)." });
      }
      categoryCounts[cat] += 1;
    }

    const partySize = tickets.length;

    // best discount for this booking (non-compound)
    const best = computeBestDiscount({ categoryCounts, partySize, hasLoyalty });

    // build ticket pricing
    const pricedTickets = tickets.map((t) => {
      const fullPrice = BASE_PRICE; // later: compute from seat/section multipliers
      const finalPrice = +(fullPrice * (1 - best.rate)).toFixed(2);

      return {
        section: t.section,
        row: t.row,
        seat: Number(t.seat),
        category: t.category.toLowerCase(),
        fullPrice: +fullPrice.toFixed(2),
        finalPrice,
        appliedDiscountRate: best.rate,
      };
    });

    const subtotal = +pricedTickets.reduce((s, x) => s + x.fullPrice, 0).toFixed(2);
    const total = +pricedTickets.reduce((s, x) => s + x.finalPrice, 0).toFixed(2);
    const discountAmount = +(subtotal - total).toFixed(2);

    const booking = await Booking.create({
      user: req.userId,
      event: eventId,
      tickets: pricedTickets,
      partySize,
      discount: best,
      pricing: { subtotal, discountAmount, total, currency: "GBP" },
      status: "pending",
    });

    return res.status(201).json(booking);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create booking.", error: err.message });
  }
});

export default router;
