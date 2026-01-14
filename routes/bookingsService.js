import express from "express";
import Booking from "../models/bookings.js";
import Event from "../models/eventsSchema.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { computeBestDiscount } from "../utils/pricing.js";

// Discount rules (assignment spec)
const DISCOUNT_RATES = { child: 0.20, senior: 0.15, group: 0.10, loyalty: 0.10 };

// Seat/location multipliers (adjust to match your appendix)
const LOCATION_MULTIPLIER = {
  STALLS: 1.0,
  LBAL: 0.8,
  RBAL: 0.8,
  SBALC: 0.7,
};

function getLocationMultiplier(section) {
  return LOCATION_MULTIPLIER[String(section || "").toUpperCase()] ?? 1.0;
}

function bestDiscountRate({ category, partySize, hasLoyalty }) {
  const c = String(category || "adult").toLowerCase();

  const candidates = [{ type: "none", rate: 0 }];

  if (c === "child") candidates.push({ type: "child", rate: DISCOUNT_RATES.child });
  if (c === "senior") candidates.push({ type: "senior", rate: DISCOUNT_RATES.senior });

  if (Number(partySize) > 9) candidates.push({ type: "group", rate: DISCOUNT_RATES.group });

  // loyalty can apply (non-compounded)
  if (hasLoyalty) candidates.push({ type: "loyalty", rate: DISCOUNT_RATES.loyalty });

  // pick highest rate; if tie, prefer loyalty (so it displays correctly)
  return candidates.reduce((best, cur) => {
    if (cur.rate > best.rate) return cur;
    if (cur.rate === best.rate && cur.type === "loyalty") return cur;
    return best;
  }, candidates[0]);
}


function calcTicketPrice({ baseCost, section, category, partySize, hasLoyalty }) {
  const fullPrice = +(Number(baseCost || 0) * getLocationMultiplier(section)).toFixed(2);

  const best = bestDiscountRate({ category, partySize, hasLoyalty }); // { type, rate }
  const finalPrice = +(fullPrice * (1 - (best?.rate || 0))).toFixed(2);

  return {
    fullPrice,
    discountRate: best, // keep your key name, but now it's {type, rate}
    finalPrice,
    discountAmount: +(fullPrice - finalPrice).toFixed(2),
  };
}





const router = express.Router();

// For now: basic prices (replace with your own seat multipliers later)
const BASE_PRICE = 50;


/**
 * GET /api/bookings/paid
 * returns paid bookings for the logged in user
 */
router.get("/paid", requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.userId,
      status: "paid",
    })
      .sort({ createdAt: -1 })
      .populate("event"); // so you get event title/date/image in one go

    return res.json({ ok: true, bookings });
  } catch (err) {
    return res
      .status(500)
      .json({ ok: false, message: "Failed to load bookings", error: err.message });
  }
});


router.post("/", requireAuth, async (req, res) => {
  try {
    const { eventId, tickets } = req.body;


    if (!eventId) return res.status(400).json({ message: "eventId is required." });
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ message: "tickets array is required." });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    //Check for Reserved Seats
    const reserved = (event.reservedSeats || []).map((s) => ({
      section: String(s.section).toUpperCase(),
      row: String(s.row).toUpperCase(),
      seat: Number(s.seat),
    }));
    
    const isReserved = (t) =>
      reserved.some(
        (r) =>
          r.section === String(t.section).toUpperCase() &&
          r.row === String(t.row).toUpperCase() &&
          r.seat === Number(t.seat)
      );
    
    const reservedTickets = tickets.filter(isReserved);
    if (reservedTickets.length > 0) {
      return res.status(409).json({
        message: "One or more selected seats are reserved by admin.",
        reservedTickets,
      });
    }
    


     //Load user from DB to get loyalty (do NOT trust client input)
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        //get loyalt value from User
        const hasLoyalty = Boolean(user?.loyalty?.isMember);


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

      // Per-ticket pricing (best discount per ticket, non-compound)
      // Per-ticket pricing (use the seat's own baseCost, not BASE_PRICE)
    const pricedTickets = tickets.map((t) => {
      const category = String(t.category || "adult").toLowerCase();

        // prefer seat's own baseCost / basePrice / price
        // fallback to BASE_PRICE only if your frontend isn't sending any price yet
        const baseCostRaw = t.baseCost ?? t.basePrice ?? t.price;
        const baseCost = Number(baseCostRaw);

        const safeBaseCost = Number.isFinite(baseCost) && baseCost > 0 ? baseCost : BASE_PRICE;

      const fullPrice = +safeBaseCost.toFixed(2); // seat already has its own price


        const best = bestDiscountRate({
          category,
          partySize,
          hasLoyalty,
        });

        const finalPrice = +(fullPrice * (1 - (best?.rate || 0))).toFixed(2);

        return {
          section: t.section,
          row: t.row,
          seat: Number(t.seat),
          category,

          // recommended: store what base price was used
          baseCost: +safeBaseCost.toFixed(2),

          fullPrice,
          finalPrice,
          appliedDiscountRate: best?.rate || 0,      // ✅ store NUMBER (important)
          appliedDiscountType: best?.type || "none", // ✅ store TYPE (new, but safe)
        };
    });


      const maxRateUsed = Math.max(...pricedTickets.map((t) => t.appliedDiscountRate || 0));

      const discountType =
        maxRateUsed === DISCOUNT_RATES.child ? "child"
        : maxRateUsed === DISCOUNT_RATES.senior ? "senior"
        : maxRateUsed === DISCOUNT_RATES.group ? "group"
        : maxRateUsed === DISCOUNT_RATES.loyalty ? "loyalty"
        : "none";

      // const discountSummary = { type: discountType, rate: maxRateUsed };
      const bestTicket = pricedTickets.reduce((best, cur) => {
        if ((cur.appliedDiscountRate || 0) > (best.appliedDiscountRate || 0)) return cur;
      
        // tie: prefer loyalty so it displays correctly
        if (
          (cur.appliedDiscountRate || 0) === (best.appliedDiscountRate || 0) &&
          cur.appliedDiscountType === "loyalty"
        ) {
          return cur;
        }
        return best;
      }, pricedTickets[0] || { appliedDiscountType: "none", appliedDiscountRate: 0 });
      
      const discountSummary = {
        type: bestTicket.appliedDiscountType || "none",
        rate: bestTicket.appliedDiscountRate || 0,
      };
      


      // Totals derived from per-ticket values

    const subtotal = +pricedTickets.reduce((s, x) => s + x.fullPrice, 0).toFixed(2);
    const total = +pricedTickets.reduce((s, x) => s + x.finalPrice, 0).toFixed(2);
    const discountAmount = +(subtotal - total).toFixed(2);

    const booking = await Booking.create({
      user: req.userId,
      event: eventId,
      tickets: pricedTickets,
      partySize,
      discount: discountSummary,
      pricing: { subtotal, discountAmount, total, currency: "GBP" },
      status: "pending",
    });

    //Loyalty updates ONLY after booking is created successfully
      // user.loyalty = user.loyalty || { bookingCount: 0, isMember: false };

      // user.loyalty.bookingCount = (user.loyalty.bookingCount || 0) + 1;

      // if (user.loyalty.bookingCount >= 3) {
      //   user.loyalty.isMember = true;
      // }

      // await user.save();


    return res.status(201).json({
      booking,
      loyalty: user.loyalty,
    });

    
  } catch (err) {
    return res.status(500).json({ message: "Failed to create booking.", error: err.message });
  }
});

  /**
   * GET /api/bookings/my/paid
   * Returns paid bookings for the logged-in user
   */
  

export default router;