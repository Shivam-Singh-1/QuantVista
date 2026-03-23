import mongoose from "mongoose";

const alertHistorySchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: String,
      required: true,
      trim: true,
    },
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alert",
      required: false,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: [
        "price_above",
        "price_below",
        "volatility",
        "volume_spike",
        "data_stale",
        "connection",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: Number,
      default: null,
    },
    threshold: {
      type: Number,
      default: null,
    },
    direction: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

alertHistorySchema.index({ ownerUserId: 1, symbol: 1, timestamp: -1 });

export default mongoose.model("AlertHistory", alertHistorySchema);
