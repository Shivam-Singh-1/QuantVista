import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import axios from "axios";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";
import Stock from "./models/Stock.js";
import StockLatest from "./models/StockLatest.js";
import Alert from "./models/Alert.js";
import AlertHistory from "./models/AlertHistory.js";
import User from "./models/User.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://stock-trading-dashboard-blush.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-change-me";
if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️ JWT_SECRET is not set. Using an insecure development fallback secret.",
  );
}

function buildUserResponse(user) {
  return {
    id: String(user._id || user.id),
    name: user.name,
    email: user.email,
  };
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: String(user._id || user.id),
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function parseBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return authHeader.slice(7).trim() || null;
}

function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function requireAuth(req, res, next) {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: "Missing or invalid auth token" });
  }

  try {
    const decoded = verifyAuthToken(token);
    req.user = {
      id: String(decoded.sub),
      email: decoded.email,
      name: decoded.name,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired auth token" });
  }
}

let isDbAvailable = false;
connectDB().then((connected) => {
  isDbAvailable = connected;
});

const STOCK_SYMBOLS = {
  "ADANIENT.NS": "Adani Enterprises",
  "ADANIPORTS.NS": "Adani Ports",
  "APOLLOHOSP.NS": "Apollo Hospitals",
  "ASIANPAINT.NS": "Asian Paints",
  "AXISBANK.NS": "Axis Bank",
  "BAJAJ-AUTO.NS": "Bajaj Auto",
  "BAJAJFINSV.NS": "Bajaj Finserv",
  "BAJFINANCE.NS": "Bajaj Finance",
  "BEL.NS": "Bharat Electronics",
  "HDFCBANK.NS": "HDFC Bank",
  "BHARTIARTL.NS": "Bharti Airtel",
  "BPCL.NS": "Bharat Petroleum",
  "BRITANNIA.NS": "Britannia Industries",
  "CIPLA.NS": "Cipla",
  "COALINDIA.NS": "Coal India",
  "DIVISLAB.NS": "Divi's Laboratories",
  "DRREDDY.NS": "Dr Reddy's Laboratories",
  "EICHERMOT.NS": "Eicher Motors",
  "GRASIM.NS": "Grasim Industries",
  "HCLTECH.NS": "HCL Technologies",
  "HINDALCO.NS": "Hindalco Industries",
  "HINDUNILVR.NS": "Hindustan Unilever",
  "ICICIBANK.NS": "ICICI Bank",
  "INDUSINDBK.NS": "IndusInd Bank",
  "INFY.NS": "Infosys",
  "ITC.NS": "ITC Limited",
  "JSWSTEEL.NS": "JSW Steel",
  "KOTAKBANK.NS": "Kotak Mahindra Bank",
  "LT.NS": "Larsen & Toubro",
  "M&M.NS": "Mahindra & Mahindra",
  "MARUTI.NS": "Maruti Suzuki",
  "NESTLEIND.NS": "Nestle India",
  "NTPC.NS": "NTPC",
  "ONGC.NS": "ONGC",
  "PFC.NS": "Power Finance Corporation",
  "PNB.NS": "Punjab National Bank",
  "POWERGRID.NS": "Power Grid Corporation",
  "RELIANCE.NS": "Reliance Industries",
  "SBILIFE.NS": "SBI Life Insurance",
  "SBIN.NS": "State Bank of India",
  "SHRIRAMFIN.NS": "Shriram Finance",
  "SUNPHARMA.NS": "Sun Pharmaceutical",
  "TATACONSUM.NS": "Tata Consumer Products",
  "TATAMOTORS.NS": "Tata Motors",
  "TATASTEEL.NS": "Tata Steel",
  "TCS.NS": "Tata Consultancy Services",
  "TECHM.NS": "Tech Mahindra",
  "TITAN.NS": "Titan Company",
  "TRENT.NS": "Trent",
  "ULTRACEMCO.NS": "UltraTech Cement",
  "UPL.NS": "UPL",
  "WIPRO.NS": "Wipro",
  "ZOMATO.NS": "Zomato",
};

function stripWikiMarkup(value) {
  return value
    .replace(/<ref[^>]*>.*?<\/ref>/gi, "")
    .replace(/<ref[^\/]*\/>/gi, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/''+/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNifty500RawTable(rawText) {
  const sectionStart = rawText.indexOf("== Constituents ==");
  const sectionEnd = rawText.indexOf("== Other Notable Indices ==");

  if (sectionStart === -1 || sectionEnd === -1 || sectionEnd <= sectionStart) {
    return [];
  }

  const tableText = rawText.slice(sectionStart, sectionEnd);
  const rowBlocks = tableText.split("|-\n");
  const parsedRows = [];

  for (const block of rowBlocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("|"))
      .map((line) => line.replace(/^\|\s?/, "").trim());

    if (lines.length < 5) {
      continue;
    }

    const serialNumber = Number.parseInt(lines[0], 10);
    if (!Number.isFinite(serialNumber)) {
      continue;
    }

    const companyName = stripWikiMarkup(lines[1]);
    const symbol = stripWikiMarkup(lines[3]).toUpperCase();

    if (!companyName || !symbol) {
      continue;
    }

    if (!/^[A-Z0-9&-]+$/.test(symbol)) {
      continue;
    }

    parsedRows.push({ symbol, companyName });
  }

  return parsedRows;
}

async function enrichStockSymbolsFromNifty500() {
  const sourceUrl =
    "https://en.wikipedia.org/w/index.php?title=NIFTY_500&action=raw";

  try {
    const response = await axios.get(sourceUrl, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const rows = parseNifty500RawTable(String(response.data || ""));
    if (!rows.length) {
      console.warn(
        "⚠️ Unable to parse Nifty 500 rows; keeping existing stock list.",
      );
      return;
    }

    let addedCount = 0;

    for (const row of rows) {
      const symbolWithExchange = `${row.symbol}.NS`;
      if (!STOCK_SYMBOLS[symbolWithExchange]) {
        STOCK_SYMBOLS[symbolWithExchange] = row.companyName;
        addedCount += 1;
      }
    }

    console.log(
      `📈 Nifty 500 merge complete: parsed ${rows.length}, added ${addedCount}, total ${Object.keys(STOCK_SYMBOLS).length}`,
    );
  } catch (error) {
    console.warn(
      `⚠️ Could not enrich stock list from Nifty 500 source (${error.message}). Using built-in list of ${Object.keys(STOCK_SYMBOLS).length}.`,
    );
  }
}

await enrichStockSymbolsFromNifty500();

const HISTORY_RANGE_CONFIG = {
  current: { range: "1d", interval: "1m" },
  "1d": { range: "1d", interval: "5m" },
  "1w": { range: "5d", interval: "30m" },
  "1m": { range: "1mo", interval: "1d" },
  "3m": { range: "3mo", interval: "1d" },
  "6m": { range: "6mo", interval: "1d" },
  "1y": { range: "1y", interval: "1d" },
  "5y": { range: "5y", interval: "1wk" },
  all: { range: "max", interval: "1mo" },
};

const HISTORY_RANGE_LOOKBACK_MS = {
  current: 24 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  "1m": 31 * 24 * 60 * 60 * 1000,
  "3m": 93 * 24 * 60 * 60 * 1000,
  "6m": 186 * 24 * 60 * 60 * 1000,
  "1y": 366 * 24 * 60 * 60 * 1000,
  "5y": 5 * 366 * 24 * 60 * 60 * 1000,
  all: null,
};

const activeConnections = new Map();
let hasLoggedNoSubscriptions = false;
let lastSubscriptionActivityAt = Date.now();

let memoryAlertCounter = 1;
const inMemoryAlerts = [];
const inMemoryAlertHistory = [];

let memoryUserCounter = 1;
const inMemoryUsers = [];
const socketUsers = new Map();

let pollingMode = "idle";
let pollingDelayMs = 12000;
let dataFetchTimer = null;

function getSubscribedSymbols() {
  const subscribedSymbols = new Set();
  for (const symbols of activeConnections.values()) {
    symbols.forEach((symbol) => subscribedSymbols.add(symbol));
  }
  return subscribedSymbols;
}

function computePollingDelay() {
  const subscribedCount = getSubscribedSymbols().size;
  const recentlyActive = Date.now() - lastSubscriptionActivityAt < 90 * 1000;

  if (subscribedCount > 0 && recentlyActive) {
    pollingMode = "active";
    pollingDelayMs = 2500;
    return pollingDelayMs;
  }

  if (subscribedCount > 0) {
    pollingMode = "monitoring";
    pollingDelayMs = 7000;
    return pollingDelayMs;
  }

  pollingMode = "idle";
  pollingDelayMs = 15000;
  return pollingDelayMs;
}

function scheduleNextFetch(customDelayMs) {
  if (dataFetchTimer) {
    clearTimeout(dataFetchTimer);
  }

  const delay = customDelayMs ?? computePollingDelay();
  dataFetchTimer = setTimeout(async () => {
    await fetchRealTimeData();
    scheduleNextFetch();
  }, delay);
}

function isValidStockSymbol(symbol) {
  return Object.prototype.hasOwnProperty.call(STOCK_SYMBOLS, symbol);
}

function isValidHistoryRange(rangeKey) {
  return Object.prototype.hasOwnProperty.call(HISTORY_RANGE_CONFIG, rangeKey);
}

function normalizeHistoryPoint(
  symbol,
  closePrice,
  prevClosePrice,
  timestamp,
  quote,
) {
  const base = prevClosePrice || closePrice;
  const change = closePrice - base;
  const changePercent = base ? (change / base) * 100 : 0;

  const open = quote.open ?? closePrice;
  const high = quote.high ?? closePrice;
  const low = quote.low ?? closePrice;

  return {
    symbol,
    name: STOCK_SYMBOLS[symbol] || symbol,
    price: parseFloat(closePrice.toFixed(2)),
    volume: Number.isFinite(quote.volume) ? quote.volume : 0,
    timestamp,
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    high: parseFloat(high.toFixed(2)),
    low: parseFloat(low.toFixed(2)),
    open: parseFloat(open.toFixed(2)),
    previousClose: parseFloat(base.toFixed(2)),
  };
}

async function fetchYahooHistoricalData(symbol, rangeKey) {
  const config = HISTORY_RANGE_CONFIG[rangeKey] || HISTORY_RANGE_CONFIG.current;

  const response = await axios.get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
    {
      timeout: 10000,
      params: {
        range: config.range,
        interval: config.interval,
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    },
  );

  const result = response.data?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp || [];

  if (!result || !quote || !timestamps.length) {
    throw new Error(`No historical data available for range ${rangeKey}`);
  }

  const points = [];
  let previousValidClose =
    Number.isFinite(result.meta?.previousClose) && result.meta.previousClose > 0
      ? result.meta.previousClose
      : null;

  for (let index = 0; index < timestamps.length; index += 1) {
    const closePrice = quote.close?.[index];
    if (!Number.isFinite(closePrice)) {
      continue;
    }

    const pointTimestamp = new Date(timestamps[index] * 1000);
    const historyPoint = normalizeHistoryPoint(
      symbol,
      closePrice,
      previousValidClose,
      pointTimestamp,
      {
        open: quote.open?.[index],
        high: quote.high?.[index],
        low: quote.low?.[index],
        volume: quote.volume?.[index],
      },
    );

    points.push(historyPoint);
    previousValidClose = closePrice;
  }

  if (!points.length) {
    throw new Error(`Unable to normalize historical data for ${symbol}`);
  }

  return points;
}

async function fetchDbHistoricalData(symbol, rangeKey, limit) {
  const lookbackMs = HISTORY_RANGE_LOOKBACK_MS[rangeKey];
  const query = { symbol };

  if (lookbackMs) {
    query.timestamp = { $gte: new Date(Date.now() - lookbackMs) };
  }

  const rows = await Stock.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  if (!rows.length) {
    return [];
  }

  const chronologicalRows = rows.reverse();
  const points = [];

  for (let index = 0; index < chronologicalRows.length; index += 1) {
    const row = chronologicalRows[index];
    const prevRow = chronologicalRows[index - 1];

    const closePrice = Number(row.price);
    if (!Number.isFinite(closePrice)) {
      continue;
    }

    const previousClose = Number(prevRow?.price);
    const base = Number.isFinite(previousClose) ? previousClose : closePrice;
    points.push(
      normalizeHistoryPoint(symbol, closePrice, base, new Date(row.timestamp), {
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        volume: Number(row.volume),
      }),
    );
  }

  return points;
}

function isAlertTriggered(alert, stockData) {
  switch (alert.type) {
    case "price_above":
      return stockData.price >= alert.threshold;
    case "price_below":
      return stockData.price <= alert.threshold;
    case "volatility":
      return Math.abs(stockData.changePercent) >= alert.threshold;
    case "volume_spike":
      return stockData.volume >= alert.threshold;
    default:
      return false;
  }
}

function buildAlertMessage(alert, stockData) {
  if (alert.type === "price_above") {
    return `${stockData.symbol} crossed above INR ${alert.threshold.toFixed(2)} (now INR ${stockData.price.toFixed(2)})`;
  }
  if (alert.type === "price_below") {
    return `${stockData.symbol} dropped below INR ${alert.threshold.toFixed(2)} (now INR ${stockData.price.toFixed(2)})`;
  }
  if (alert.type === "volatility") {
    return `${stockData.symbol} moved ${stockData.changePercent.toFixed(2)}% (threshold ${alert.threshold.toFixed(2)}%)`;
  }
  return `${stockData.symbol} volume spike detected: ${stockData.volume?.toLocaleString() || 0} (threshold ${Math.round(alert.threshold).toLocaleString()})`;
}

async function getAlertsForSymbol(symbol, ownerUserIds) {
  if (!ownerUserIds?.length) {
    return [];
  }

  if (isDbAvailable) {
    return Alert.find({
      symbol,
      isActive: true,
      ownerUserId: { $in: ownerUserIds },
    });
  }

  return inMemoryAlerts.filter(
    (alert) =>
      alert.symbol === symbol &&
      alert.isActive &&
      ownerUserIds.includes(alert.ownerUserId),
  );
}

async function updateAlertLastTriggered(alertId, timestamp) {
  if (isDbAvailable) {
    await Alert.findByIdAndUpdate(alertId, {
      $set: { lastTriggeredAt: timestamp },
    });
    return;
  }

  const target = inMemoryAlerts.find((alert) => alert._id === alertId);
  if (target) {
    target.lastTriggeredAt = timestamp;
  }
}

async function saveAlertHistory(event) {
  if (isDbAvailable) {
    await new AlertHistory(event).save();
    return;
  }

  inMemoryAlertHistory.push({
    _id: `mem-h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...event,
  });

  if (inMemoryAlertHistory.length > 500) {
    inMemoryAlertHistory.shift();
  }
}

async function evaluateAndEmitAlerts(stockData) {
  const interestedSockets = Array.from(activeConnections.entries()).filter(
    ([, symbols]) => symbols.has(stockData.symbol),
  );

  const ownerUserIds = Array.from(
    new Set(
      interestedSockets
        .map(([socketId]) => socketUsers.get(socketId))
        .filter(Boolean),
    ),
  );

  const alerts = await getAlertsForSymbol(stockData.symbol, ownerUserIds);
  if (!alerts.length) return;

  const now = new Date();

  for (const alert of alerts) {
    const cooldownSeconds = alert.cooldownSeconds || 90;
    const lastTriggeredAt = alert.lastTriggeredAt
      ? new Date(alert.lastTriggeredAt)
      : null;
    const inCooldown =
      lastTriggeredAt && now - lastTriggeredAt < cooldownSeconds * 1000;

    if (inCooldown || !isAlertTriggered(alert, stockData)) {
      continue;
    }

    const payload = {
      alertId: alert._id,
      symbol: stockData.symbol,
      type: alert.type,
      threshold: alert.threshold,
      cooldownSeconds,
      value:
        alert.type === "volume_spike"
          ? stockData.volume
          : alert.type === "volatility"
            ? stockData.changePercent
            : stockData.price,
      message: buildAlertMessage(alert, stockData),
      timestamp: now.toISOString(),
    };

    for (const [socketId, symbols] of interestedSockets) {
      const socketUserId = socketUsers.get(socketId);
      if (symbols.has(stockData.symbol) && socketUserId === alert.ownerUserId) {
        io.to(socketId).emit("alertTriggered", payload);
      }
    }

    await saveAlertHistory({
      ownerUserId: alert.ownerUserId,
      alertId: alert._id,
      symbol: stockData.symbol,
      type: alert.type,
      message: payload.message,
      value: payload.value,
      threshold: alert.threshold,
      timestamp: now,
    });
    await updateAlertLastTriggered(alert._id, now);
  }
}

async function fetchRealTimeStockData(symbol) {
  try {
    console.log(`Fetching real-time data for ${symbol}...`);

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );

    const result = response.data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    const timestamps = result.timestamp;

    if (!timestamps || timestamps.length === 0) {
      throw new Error("No data available");
    }

    const latestIndex = timestamps.length - 1;
    const currentPrice = quote.close[latestIndex] || meta.regularMarketPrice;
    const volume = quote.volume[latestIndex] || meta.regularMarketVolume || 0;
    const high = quote.high[latestIndex] || meta.regularMarketDayHigh;
    const low = quote.low[latestIndex] || meta.regularMarketDayLow;
    const open = quote.open[latestIndex] || meta.regularMarketOpen;

    const stockData = {
      symbol,
      name: STOCK_SYMBOLS[symbol] || symbol,
      price: parseFloat(currentPrice.toFixed(2)),
      volume: volume,
      timestamp: new Date(timestamps[latestIndex] * 1000),
      change: parseFloat((currentPrice - meta.previousClose).toFixed(2)),
      changePercent: parseFloat(
        (
          ((currentPrice - meta.previousClose) / meta.previousClose) *
          100
        ).toFixed(2),
      ),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      open: parseFloat(open.toFixed(2)),
      previousClose: parseFloat(meta.previousClose.toFixed(2)),
    };

    if (isDbAvailable) {
      const lastLatest = await StockLatest.findOne({ symbol });
      if (
        !lastLatest ||
        lastLatest.price !== stockData.price ||
        lastLatest.volume !== stockData.volume
      ) {
        await StockLatest.findOneAndUpdate(
          { symbol },
          { $set: stockData },
          { upsert: true, new: true },
        );
        console.log(`✅ Updated latest for ${symbol}`);
      } else {
        console.log(`⚡ No change for ${symbol}, skipped latest update`);
      }

      const lastHistory = await Stock.findOne({ symbol }).sort({
        timestamp: -1,
      });
      const now = new Date();
      const THRESHOLD_MINUTES = 1;
      const PRICE_DELTA_PERCENT = 0.2;

      if (
        !lastHistory ||
        now - lastHistory.timestamp > THRESHOLD_MINUTES * 60 * 1000 ||
        Math.abs(
          ((stockData.price - lastHistory.price) / lastHistory.price) * 100,
        ) > PRICE_DELTA_PERCENT
      ) {
        const newHistory = await new Stock(stockData).save();
        console.log(`📊 Added history for ${symbol}`);

        for (const [socketId, symbols] of activeConnections.entries()) {
          if (symbols.has(symbol)) {
            io.to(socketId).emit("historicalData", {
              symbol,
              data: [newHistory],
            });
          }
        }
      } else {
        console.log(`⏭️ Skipped history for ${symbol}`);
      }
    } else {
      console.log(`ℹ️ DB unavailable, serving live-only data for ${symbol}`);
    }

    console.log(
      `✅ Fetched data for ${symbol}: ₹${stockData.price} (${
        stockData.changePercent > 0 ? "+" : ""
      }${stockData.changePercent}%)`,
    );

    return stockData;
  } catch (error) {
    console.error(`❌ Error fetching data for ${symbol}:`, error.message);
    throw error;
  }
}

async function fetchRealTimeData() {
  const subscribedSymbols = getSubscribedSymbols();

  if (subscribedSymbols.size === 0) {
    if (!hasLoggedNoSubscriptions) {
      console.log("No active subscriptions, skipping data fetch...");
      hasLoggedNoSubscriptions = true;
    }
    return;
  }

  if (hasLoggedNoSubscriptions) {
    console.log("📡 Subscriptions detected, resuming data fetch...");
    hasLoggedNoSubscriptions = false;
  }

  console.log(
    `🔄 Fetching real-time data for ${
      subscribedSymbols.size
    } symbols: ${Array.from(subscribedSymbols).join(", ")}`,
  );

  const fetchPromises = Array.from(subscribedSymbols).map(async (symbol) => {
    try {
      const stockData = await fetchRealTimeStockData(symbol);
      await evaluateAndEmitAlerts(stockData);

      for (const [socketId, symbols] of activeConnections.entries()) {
        if (symbols.has(symbol)) {
          io.to(socketId).emit("stockUpdate", stockData);
        }
      }

      return { symbol, success: true, data: stockData };
    } catch (error) {
      console.error(`Failed to fetch data for ${symbol}:`, error.message);

      for (const [socketId, symbols] of activeConnections.entries()) {
        if (symbols.has(symbol)) {
          io.to(socketId).emit("error", {
            message: `Failed to fetch data for ${symbol}: ${error.message}`,
            symbol,
          });
        }
      }

      return { symbol, success: false, error: error.message };
    }
  });

  const results = await Promise.allSettled(fetchPromises);
  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value.success,
  ).length;
  const failed = results.length - successful;

  console.log(
    `📊 Data fetch complete: ${successful} successful, ${failed} failed`,
  );
}

console.log("🚀 Starting real-time data fetching service...");
scheduleNextFetch(1000);

io.on("connection", (socket) => {
  const socketToken =
    socket.handshake.auth?.token ||
    parseBearerToken(socket.handshake.headers?.authorization);

  if (!socketToken) {
    socket.emit("error", { message: "Authentication required" });
    socket.disconnect(true);
    return;
  }

  let socketUser;
  try {
    const decoded = verifyAuthToken(socketToken);
    socketUser = {
      id: String(decoded.sub),
      email: decoded.email,
      name: decoded.name,
    };
  } catch (error) {
    socket.emit("error", { message: "Invalid or expired auth token" });
    socket.disconnect(true);
    return;
  }

  console.log("👤 Client connected:", socket.id);
  socketUsers.set(socket.id, socketUser.id);
  activeConnections.set(socket.id, new Set());
  lastSubscriptionActivityAt = Date.now();
  scheduleNextFetch(500);

  socket.on("subscribe", async (symbol) => {
    if (!isValidStockSymbol(symbol)) {
      socket.emit("error", {
        message: `Unsupported stock symbol: ${symbol}`,
        symbol,
      });
      return;
    }

    console.log(`📈 Client ${socket.id} subscribed to ${symbol}`);
    activeConnections.get(socket.id).add(symbol);
    lastSubscriptionActivityAt = Date.now();
    scheduleNextFetch(500);

    try {
      console.log(`🔄 Fetching immediate data for new subscription: ${symbol}`);
      const currentData = await fetchRealTimeStockData(symbol);

      socket.emit("stockUpdate", currentData);

      if (isDbAvailable) {
        const history = await Stock.find({ symbol })
          .sort({ timestamp: -1 })
          .limit(50);
        socket.emit("historicalData", { symbol, data: history.reverse() });
      } else {
        socket.emit("historicalData", { symbol, data: [] });
      }
    } catch (error) {
      console.error(
        `Error handling subscription for ${symbol}:`,
        error.message,
      );
      socket.emit("error", {
        message: `Failed to fetch data for ${symbol}: ${error.message}`,
      });
    }
  });

  socket.on("unsubscribe", (symbol) => {
    console.log(`📉 Client ${socket.id} unsubscribed from ${symbol}`);
    activeConnections.get(socket.id).delete(symbol);
    lastSubscriptionActivityAt = Date.now();
    scheduleNextFetch(500);
  });

  socket.on("disconnect", () => {
    console.log("👋 Client disconnected:", socket.id);
    socketUsers.delete(socket.id);
    activeConnections.delete(socket.id);
    lastSubscriptionActivityAt = Date.now();
    scheduleNextFetch(500);
  });
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (name.length < 2) {
      return res
        .status(400)
        .json({ error: "Name must be at least 2 characters" });
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) {
      return res.status(400).json({ error: "Please enter a valid email" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    if (isDbAvailable) {
      const existing = await User.findOne({ email }).lean();
      if (existing) {
        return res
          .status(409)
          .json({ error: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const createdUser = await new User({ name, email, passwordHash }).save();
      const token = signAuthToken(createdUser);

      return res.status(201).json({
        token,
        user: buildUserResponse(createdUser),
      });
    }

    const existing = inMemoryUsers.find((user) => user.email === email);
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const createdUser = {
      id: `mem-u-${memoryUserCounter++}`,
      name,
      email,
      passwordHash,
      createdAt: new Date(),
    };
    inMemoryUsers.push(createdUser);

    const token = signAuthToken(createdUser);
    return res.status(201).json({
      token,
      user: buildUserResponse(createdUser),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (isDbAvailable) {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const passwordOk = await bcrypt.compare(password, user.passwordHash);
      if (!passwordOk) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = signAuthToken(user);
      return res.json({ token, user: buildUserResponse(user) });
    }

    const user = inMemoryUsers.find((entry) => entry.email === email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signAuthToken(user);
    return res.json({ token, user: buildUserResponse(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    if (isDbAvailable) {
      const user = await User.findById(req.user.id).lean();
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json({ user: buildUserResponse(user) });
    }

    const user = inMemoryUsers.find((entry) => entry.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: buildUserResponse(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/stocks", (req, res) => {
  res.json(
    Object.entries(STOCK_SYMBOLS).map(([symbol, name]) => ({ symbol, name })),
  );
});

app.get("/api/stocks/:symbol/latest", async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!isValidStockSymbol(symbol)) {
      return res.status(400).json({ error: "Unsupported stock symbol" });
    }

    const latest = await StockLatest.findOne({ symbol });
    if (!latest) return res.status(404).json({ error: "No latest data found" });
    res.json(latest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/stocks/:symbol/history", async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!isValidStockSymbol(symbol)) {
      return res.status(400).json({ error: "Unsupported stock symbol" });
    }

    const rangeKey = String(req.query.range || "current").toLowerCase();
    if (!isValidHistoryRange(rangeKey)) {
      return res.status(400).json({
        error:
          "Unsupported range. Use one of: current, 1d, 1w, 1m, 3m, 6m, 1y, 5y, all",
      });
    }

    const rawLimit = Number(req.query.limit || 1200);
    const historyLimit = Number.isFinite(rawLimit)
      ? Math.max(50, Math.min(5000, Math.floor(rawLimit)))
      : 1200;

    let source = "yahoo";
    let history = [];

    try {
      history = await fetchYahooHistoricalData(symbol, rangeKey);
    } catch (yahooError) {
      if (!isDbAvailable) {
        throw yahooError;
      }

      source = "database-fallback";
      history = await fetchDbHistoricalData(symbol, rangeKey, historyLimit);

      if (!history.length) {
        throw yahooError;
      }
    }

    const cappedHistory = history.slice(-historyLimit);

    res.json({
      symbol,
      name: STOCK_SYMBOLS[symbol] || symbol,
      range: rangeKey,
      source,
      points: cappedHistory.length,
      data: cappedHistory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/alerts", requireAuth, async (req, res) => {
  try {
    const { symbol } = req.query;

    if (symbol && !isValidStockSymbol(symbol)) {
      return res.status(400).json({ error: "Unsupported stock symbol" });
    }

    if (isDbAvailable) {
      const query = {
        ownerUserId: req.user.id,
        ...(symbol ? { symbol } : {}),
      };
      const alerts = await Alert.find(query).sort({ createdAt: -1 });
      return res.json(alerts);
    }

    const alerts = symbol
      ? inMemoryAlerts.filter(
          (alert) =>
            alert.symbol === symbol && alert.ownerUserId === req.user.id,
        )
      : inMemoryAlerts.filter((alert) => alert.ownerUserId === req.user.id);
    return res.json(alerts);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/alerts", requireAuth, async (req, res) => {
  try {
    const {
      symbol,
      type,
      threshold,
      cooldownSeconds = 90,
      isActive = true,
    } = req.body;

    if (!isValidStockSymbol(symbol)) {
      return res.status(400).json({ error: "Unsupported stock symbol" });
    }

    const normalizedThreshold = Number(threshold);
    if (!Number.isFinite(normalizedThreshold) || normalizedThreshold < 0) {
      return res
        .status(400)
        .json({ error: "Threshold must be a valid non-negative number" });
    }

    const payload = {
      ownerUserId: req.user.id,
      symbol,
      name: STOCK_SYMBOLS[symbol],
      type,
      threshold: normalizedThreshold,
      cooldownSeconds: Number(cooldownSeconds),
      isActive: Boolean(isActive),
      lastTriggeredAt: null,
    };

    if (isDbAvailable) {
      const alert = await new Alert(payload).save();
      return res.status(201).json(alert);
    }

    const alert = {
      _id: `mem-a-${memoryAlertCounter++}`,
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryAlerts.unshift(alert);
    return res.status(201).json(alert);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put("/api/alerts/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowedKeys = ["isActive", "threshold", "cooldownSeconds", "type"];

    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.threshold !== undefined) {
      const normalizedThreshold = Number(updates.threshold);
      if (!Number.isFinite(normalizedThreshold) || normalizedThreshold < 0) {
        return res
          .status(400)
          .json({ error: "Threshold must be a valid non-negative number" });
      }
      updates.threshold = normalizedThreshold;
    }

    if (updates.cooldownSeconds !== undefined) {
      updates.cooldownSeconds = Math.max(
        15,
        Math.min(3600, Number(updates.cooldownSeconds)),
      );
    }

    if (isDbAvailable) {
      const alert = await Alert.findOneAndUpdate(
        { _id: id, ownerUserId: req.user.id },
        { $set: updates },
        { new: true },
      );
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      return res.json(alert);
    }

    const target = inMemoryAlerts.find(
      (alert) => alert._id === id && alert.ownerUserId === req.user.id,
    );
    if (!target) {
      return res.status(404).json({ error: "Alert not found" });
    }

    Object.assign(target, updates, { updatedAt: new Date() });
    return res.json(target);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/api/alerts/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (isDbAvailable) {
      const deleted = await Alert.findOneAndDelete({
        _id: id,
        ownerUserId: req.user.id,
      });
      if (!deleted) {
        return res.status(404).json({ error: "Alert not found" });
      }
      return res.json({ success: true });
    }

    const index = inMemoryAlerts.findIndex(
      (alert) => alert._id === id && alert.ownerUserId === req.user.id,
    );
    if (index === -1) {
      return res.status(404).json({ error: "Alert not found" });
    }

    inMemoryAlerts.splice(index, 1);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/alerts/history", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(500, Number(req.query.limit || 100));

    if (isDbAvailable) {
      const history = await AlertHistory.find({ ownerUserId: req.user.id })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      return res.json(history);
    }

    return res.json(
      inMemoryAlertHistory
        .filter((entry) => entry.ownerUserId === req.user.id)
        .slice(-limit)
        .reverse(),
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/health", (req, res) => {
  const activeSubscriptions = Array.from(activeConnections.values()).reduce(
    (total, symbols) => total + symbols.size,
    0,
  );

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    dbMode: isDbAvailable ? "connected" : "live-only",
    pollingMode,
    pollingDelayMs,
    activeConnections: activeConnections.size,
    activeSubscriptions,
    subscribedSymbols: Array.from(
      new Set(
        Array.from(activeConnections.values()).flatMap((symbols) =>
          Array.from(symbols),
        ),
      ),
    ),
  });
});

process.on("SIGINT", () => {
  console.log("🛑 Shutting down server...");
  if (dataFetchTimer) {
    clearTimeout(dataFetchTimer);
  }
  server.close(() => {
    console.log("✅ Server shut down gracefully");
    process.exit(0);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🌟 Server running on port ${PORT}`);
  console.log(`📊 Real-time stock data service active`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🌐 API endpoint: http://localhost:${PORT}/api`);
});
