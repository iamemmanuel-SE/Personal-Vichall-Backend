import mongoose from "mongoose";
const { Schema } = mongoose;

const TicketSchema = new Schema(
  {
    section: { type: String, required: true, trim: true }, // e.g. SBALC
    row: { type: String, required: true, trim: true },     // e.g. D
    seat: { type: Number, required: true },                // e.g. 27

    category: {
      type: String,
      enum: ["child", "senior", "adult"],
      required: true,
    },

    // prices per ticket
    fullPrice: { type: Number, required: true },     // before discount
    finalPrice: { type: Number, required: true },    // after best discount
    appliedDiscountRate: { type: Number, default: 0 } // e.g. 0.2
  },
  { _id: false }
);

const BookingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },

    tickets: { type: [TicketSchema], required: true },

    // booking-level discount info (best concession picked)
    discount: {
      type: {
        type: String,
        enum: ["none", "child", "senior", "group", "loyalty"],
        default: "none",
      },
      rate: { type: Number, default: 0 }, // e.g. 0.2
    },

    pricing: {
      subtotal: { type: Number, required: true }, // sum of fullPrice
      discountAmount: { type: Number, required: true }, // subtotal - total
      total: { type: Number, required: true }, // sum of finalPrice
      currency: { type: String, default: "GBP" },
    },

    partySize: { type: Number, required: true }, // number of tickets

    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", BookingSchema);
