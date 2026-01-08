import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Missing auth token." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.sub;
    req.userRole = decoded.role;

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}
