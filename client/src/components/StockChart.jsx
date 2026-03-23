import React from "react";
import {
  Brush,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

const StockChart = ({ data, loading, isDark, selectedRange = "current" }) => {
  const RANGE_WINDOW_DEFAULTS = {
    current: 120,
    "1d": 140,
    "1w": 160,
    "1m": 120,
    "3m": 160,
    "6m": 180,
    "1y": 220,
    "5y": 260,
    all: 300,
  };

  const [brushRange, setBrushRange] = React.useState({
    startIndex: 0,
    endIndex: 0,
  });

  const defaultWindow = RANGE_WINDOW_DEFAULTS[selectedRange] || 160;
  const showBrush = data.length > defaultWindow + 20;
  const isPositiveTrend =
    data.length > 1 && data[data.length - 1].price > data[0].price;

  React.useEffect(() => {
    if (!data.length) {
      setBrushRange({ startIndex: 0, endIndex: 0 });
      return;
    }

    const endIndex = data.length - 1;
    const windowSize = Math.min(defaultWindow, data.length);
    const startIndex = Math.max(0, endIndex - windowSize + 1);
    setBrushRange({ startIndex, endIndex });
  }, [data.length, selectedRange, defaultWindow]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);

    if (selectedRange === "current" || selectedRange === "1d") {
      return format(date, "HH:mm");
    }

    if (selectedRange === "1w") {
      return format(date, "EEE HH:mm");
    }

    if (["1m", "3m", "6m", "1y"].includes(selectedRange)) {
      return format(date, "dd MMM");
    }

    return format(date, "MMM yyyy");
  };

  const formatTooltipTime = (timestamp) => {
    const date = new Date(timestamp);

    if (selectedRange === "current" || selectedRange === "1d") {
      return format(date, "MMM dd, HH:mm");
    }

    if (selectedRange === "1w") {
      return format(date, "EEE, MMM dd, HH:mm");
    }

    if (["1m", "3m", "6m", "1y"].includes(selectedRange)) {
      return format(date, "MMM dd, yyyy");
    }

    return format(date, "MMM yyyy");
  };

  const handleBrushChange = (nextRange) => {
    if (
      !nextRange ||
      typeof nextRange.startIndex !== "number" ||
      typeof nextRange.endIndex !== "number"
    ) {
      return;
    }

    setBrushRange({
      startIndex: nextRange.startIndex,
      endIndex: nextRange.endIndex,
    });
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div
          className="rounded-lg border p-3 shadow-lg"
          style={{
            background: "var(--card-strong)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          <p className="text-sm font-medium">
            {formatTooltipTime(point.timestamp)}
          </p>
          <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>
            Price: ₹{point.price.toFixed(2)}
          </p>
          <p
            className={`text-sm ${
              point.change >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            Change: {point.change >= 0 ? "+" : ""}₹{point.change.toFixed(2)} (
            {point.changePercent.toFixed(2)}%)
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Volume: {point.volume?.toLocaleString() || "N/A"}
          </p>
        </div>
      );
    }

    return null;
  };

  if (loading || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">
                Loading chart data...
              </p>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No data available
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[26rem]">
      <div className="w-full overflow-x-auto">
        <div className="mx-auto h-[26rem] min-w-[760px] md:min-w-0 md:w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--grid)"
                opacity={0.5}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                domain={["dataMin - 10", "dataMax + 10"]}
                tickFormatter={(value) => `₹${value}`}
                tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={{ stroke: "var(--border)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke={isPositiveTrend ? "#10b981" : "#ef4444"}
                strokeWidth={2.5}
                dot={{ r: 3, fill: isPositiveTrend ? "#10b981" : "#ef4444" }}
                activeDot={{
                  r: 5,
                  stroke: isPositiveTrend ? "#10b981" : "#ef4444",
                  strokeWidth: 2,
                  fill: isDark ? "#10100f" : "#fff9ef",
                }}
                animationDuration={300}
              />

              {showBrush && (
                <Brush
                  dataKey="timestamp"
                  height={28}
                  stroke="var(--accent)"
                  fill="var(--accent-soft)"
                  startIndex={brushRange.startIndex}
                  endIndex={brushRange.endIndex}
                  travellerWidth={10}
                  onChange={handleBrushChange}
                  tickFormatter={formatTime}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StockChart;
