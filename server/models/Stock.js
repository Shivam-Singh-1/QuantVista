import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  price: Number,
  volume: Number,
  timestamp: { type: Date, default: Date.now },
  change: Number,
  changePercent: Number,
  high: Number,
  low: Number,
  open: Number,
  previousClose: Number,
});

const Stock = mongoose.models.Stock || mongoose.model("Stock", stockSchema);

export default Stock;
