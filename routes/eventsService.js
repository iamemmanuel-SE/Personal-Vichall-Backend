import express from "express";
import path from "path";
import multer from "multer";
import Event from "../models/eventsSchema.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

/** Multer setup */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext.toLowerCase();
    cb(null, `event_${Date.now()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.mimetype);
    if (!ok) return cb(new Error("Only JPG/PNG/WEBP images are allowed."));
    cb(null, true);
  },
});

/** BROWSE ALL EVENTS */
router.get("/", async (req, res) => {
  try {
    const events = await Event.find({ status: { $ne: "cancelled" } }).sort({
      startDateTime: 1,
    });
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
 * ADMIN ONLY: Create event (with optional image upload)
 * POST /api/events/postevent
 *
 * Expects multipart/form-data:
 *  - title, description, dateLabel, timeLabel, startDateTime
 *  - venue (optional)
 *  - status (optional)
 *  - image (optional file)
 */
router.post("/postevent", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      dateLabel,
      timeLabel,
      startDateTime,
      endDateTime,
      venue,
      imageUrl,
      status,
    } = req.body;

    if (!title || !description || !dateLabel || !timeLabel || !startDateTime) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      dateLabel: dateLabel.trim(),
      timeLabel: timeLabel.trim(),
      startDateTime: new Date(startDateTime),
      endDateTime: endDateTime ? new Date(endDateTime) : null,
      venue: venue?.trim() || "Victoria Hall",
      imageUrl: imageUrl?.trim() || "",
      status: status || "published",
    });

    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create event." });
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
