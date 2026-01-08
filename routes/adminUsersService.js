import express from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// Protect everything below
router.use(requireAuth, requireAdmin);

/**
 * ADMIN ONLY: Get all NON-ADMIN users
 * GET /api/admin/users
 */
router.get("/", async (req, res) => {
  try {
    // Exclude admins regardless of which field your schema uses
    // - role: "admin"
    // - isAdmin: true
    const users = await User.find({
      $nor: [{ role: "admin" }, { isAdmin: true }],
    })
      .select("_id email phone lastName firstName role isAdmin createdAt")
      .sort({ createdAt: -1 });

    return res.json(users);
  } catch (err) {
    console.error("Fetch users failed:", err);
    return res.status(500).json({ message: "Failed to fetch users." });
  }
});

/**
 * ADMIN ONLY: Delete user
 * DELETE /api/admin/users/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    // Safety: never delete admins (even if endpoint called with an admin id)
    const user = await User.findById(req.params.id).select("_id role isAdmin");
    if (!user) return res.status(404).json({ message: "User not found." });

    const isAdminUser = user?.role === "admin" || user?.isAdmin === true;
    if (isAdminUser) {
      return res.status(403).json({ message: "Cannot delete admin users." });
    }

    await User.findByIdAndDelete(req.params.id);
    return res.json({ ok: true, message: "User deleted.", userId: req.params.id });
  } catch (err) {
    console.error("Delete user failed:", err);
    return res.status(400).json({ message: "Invalid user id." });
  }
});

export default router;
