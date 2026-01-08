export function requireAdmin(req, res, next) {
    // requireAuth MUST run before this
    if (!req.userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }
  
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
  
    next();
  }
  