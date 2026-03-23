import mongoose from "mongoose";

const portfolioTransactionSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    side: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.0001,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 280,
      default: "",
    },
    tradedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

portfolioTransactionSchema.index({ ownerUserId: 1, tradedAt: -1 });

export default mongoose.models.PortfolioTransaction ||
  mongoose.model("PortfolioTransaction", portfolioTransactionSchema);
