import mongoose from "mongoose";

const watchlistAlertPresetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
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
  },
  {
    timestamps: true,
  },
);

const watchlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
    },
    symbols: {
      type: [String],
      default: [],
    },
    alertPresets: {
      type: [watchlistAlertPresetSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    watchlists: {
      type: [watchlistSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.User || mongoose.model("User", userSchema);
