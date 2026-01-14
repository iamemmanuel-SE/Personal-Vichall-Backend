import express from "express";
import Event from "../models/eventsSchema.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();
router.use(requireAuth, requireAdmin);

function normalizeSection(s) {
  return String(s || "").trim().toUpperCase();
}
function normalizeRow(r) {
  return String(r || "").trim().toUpperCase();
}

router.post("/:eventId/reserve-seat", async (req, res) => {
  try {
    const { eventId } = req.params;
    const section = normalizeSection(req.body.section);
    const row = normalizeRow(req.body.row);
    const seat = Number(req.body.from); // 👈 you’re using fromSeat in modal

    if (!section || !row || !Number.isFinite(seat)) {
      return res.status(400).json({ message: "section, row, and seat are required." });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    event.reservedSeats = event.reservedSeats || [];

    const alreadyReserved = event.reservedSeats.some(
      (s) =>
        String(s.section).toUpperCase() === section &&
        String(s.row).toUpperCase() === row &&
        Number(s.seat) === seat
    );

    if (alreadyReserved) {
      return res.status(409).json({ message: "Seat is already reserved." });
    }

    event.reservedSeats.push({
      section,
      row,
      seat,
      reservedBy: req.userId,
      reason: "Admin reserved",
    });

    await event.save();

    return res.json({ ok: true, reservedSeats: event.reservedSeats });
  } catch (err) {
    console.error("Reserve seat failed:", err);
    return res.status(500).json({ message: "Failed to reserve seat." });
  }
});

export default router;
