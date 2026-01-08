import mongoose from "mongoose";
const { Schema } = mongoose;

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    dateLabel: { type: String, required: true, trim: true }, // e.g. "5 Dec" or "Today"
    timeLabel: { type: String, required: true, trim: true }, // e.g. "19:00"

    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, default: null },

    venue: { type: String, default: "Victoria Hall", trim: true },
    imageUrl: { type: String, default: "", trim: true },

    status: {
      type: String,
      enum: ["draft", "published", "cancelled"],
      default: "published",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Event", EventSchema);

