import mongoose from "mongoose";

const stockLatestSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, unique: true },
    name: String,
    price: Number,
    volume: Number,
    high: Number,
    low: Number,
    open: Number,
    previousClose: Number,
    change: Number,
    changePercent: Number,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const StockLatest = mongoose.model("StockLatest", stockLatestSchema);

export default StockLatest;
