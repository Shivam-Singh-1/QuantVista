import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: ["price_above", "price_below", "volatility", "volume_spike"],
      required: true,
    },
    threshold: {
      type: Number,
      required: true,
      min: 0,
    },
    cooldownSeconds: {
      type: Number,
      default: 90,
      min: 15,
      max: 3600,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

alertSchema.index({ ownerUserId: 1, symbol: 1, isActive: 1 });

export default mongoose.model("Alert", alertSchema);
