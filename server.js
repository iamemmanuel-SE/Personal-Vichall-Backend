import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import Events from "./routes/eventsService.js";
import adminEvents from "./routes/adminEventsService.js"
import path from "path";
import bookingsRoutes from "./routes/bookingsService.js";



dotenv.config();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/bookings", bookingsRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/events/', Events);
app.use('/api/admin/', adminEvents);
app.use("/uploads", express.static("uploads"));
app.use('/images', express.static(path.join(path.resolve(), 'src/server/images')));
const PORT = process.env.PORT || 5001;

async function start() {
  try {
    if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in server/.env");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected:", mongoose.connection.name);

    app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("Server failed:", err.message);
    process.exit(1);
  }
}

start();
