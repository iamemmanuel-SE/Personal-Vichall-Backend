import express from "express";
import Event from "../models/eventsSchema.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

/**
 * LOGGED-IN USERS: Browse all events
 * GET /api/events
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const events = await Event.find({ status: { $ne: "cancelled" } })
      .sort({ startDateTime: 1 });

    return res.json(events);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch events." });
  }
});

/**
 * LOGGED-IN USERS: Get single event
 * GET /api/events/:id
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found." });

    return res.json(event);
  } catch (err) {
    return res.status(400).json({ message: "Invalid event id." });
  }
});

/**
 * ADMIN ONLY: Create event
 * POST /api/events/postevent
 */
router.post("/postevent", requireAuth, requireAdmin, async (req, res) => {
  try {
    const event = await Event.create(req.body);
    return res.status(201).json(event);
  } catch (err) {
    return res.status(400).json({ message: "Failed to create event.", error: err.message });
  }
});

/**
 * ADMIN ONLY: Delete event
 * DELETE /api/events/:id
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Event not found." });

    return res.json({ ok: true, message: "Event deleted.", eventId: req.params.id });
  } catch (err) {
    return res.status(400).json({ message: "Invalid event id." });
  }
});

export default router;
