import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// protect everything below
router.use(requireAuth, requireAdmin);

// POST SINGLE Event
router.post("/:id", (req, res) => {
  res.json({ message: "Post a single event (admin only)" });
});

export default router;
