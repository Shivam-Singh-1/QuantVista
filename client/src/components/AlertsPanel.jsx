import React, { useMemo, useState } from "react";
import { BellRing, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ALERT_TYPES = [
  { value: "price_above", label: "Price above", unit: "INR" },
  { value: "price_below", label: "Price below", unit: "INR" },
  { value: "volatility", label: "Volatility (%)", unit: "%" },
  { value: "volume_spike", label: "Volume spike", unit: "qty" },
];

function AlertsPanel({
  stocks,
  selectedStock,
  alerts,
  alertHistory,
  onCreateAlert,
  onToggleAlert,
  onDeleteAlert,
}) {
  const [symbol, setSymbol] = useState(selectedStock || "");
  const [type, setType] = useState("price_above");
  const [threshold, setThreshold] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(90);

  const activeType = useMemo(
    () => ALERT_TYPES.find((item) => item.value === type) || ALERT_TYPES[0],
    [type],
  );

  const handleCreate = (event) => {
    event.preventDefault();
    if (!symbol) return;

    onCreateAlert({
      symbol,
      type,
      threshold: Number(threshold),
      cooldownSeconds: Number(cooldownSeconds),
      isActive: true,
    });
  };

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <BellRing size={18} style={{ color: "var(--accent)" }} />
        <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          Alerts Center
        </h3>
      </div>

      <form className="grid gap-3 md:grid-cols-4" onSubmit={handleCreate}>
        <label className="text-xs" style={{ color: "var(--text-muted)" }}>
          Symbol
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--card-strong)",
              color: "var(--text)",
              borderColor: "var(--border)",
            }}
          >
            <option value="">Select</option>
            {stocks.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs" style={{ color: "var(--text-muted)" }}>
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--card-strong)",
              color: "var(--text)",
              borderColor: "var(--border)",
            }}
          >
            {ALERT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs" style={{ color: "var(--text-muted)" }}>
          Threshold ({activeType.unit})
          <input
            type="number"
            step="0.01"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: "var(--card-strong)",
              color: "var(--text)",
              borderColor: "var(--border)",
            }}
          />
        </label>

        <label className="text-xs" style={{ color: "var(--text-muted)" }}>
          Cooldown (s)
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min="15"
              max="3600"
              value={cooldownSeconds}
              onChange={(e) => setCooldownSeconds(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--card-strong)",
                color: "var(--text)",
                borderColor: "var(--border)",
              }}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </label>
      </form>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h4
            className="mb-2 text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            Active Rules
          </h4>
          <div className="space-y-2">
            {alerts.length === 0 && (
              <p
                className="rounded-lg border px-3 py-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                No alerts configured.
              </p>
            )}
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
                style={{
                  background: "var(--card-strong)",
                  borderColor: "var(--border)",
                }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    {alert.symbol} • {alert.type.replace("_", " ")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Threshold {alert.threshold} • Cooldown{" "}
                    {alert.cooldownSeconds}s
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleAlert(alert)}
                    className="rounded-md px-2 py-1 text-xs"
                    style={{
                      background: alert.isActive
                        ? "var(--accent-soft)"
                        : "#b0a79633",
                      color: "var(--text)",
                    }}
                  >
                    {alert.isActive ? "On" : "Off"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAlert(alert._id)}
                    className="rounded-md p-1"
                    aria-label="Delete alert"
                  >
                    <Trash2 size={14} style={{ color: "var(--loss)" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4
            className="mb-2 text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            Alert History
          </h4>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {alertHistory.length === 0 && (
              <p
                className="rounded-lg border px-3 py-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Triggered alerts will appear here.
              </p>
            )}
            {alertHistory.map((item) => (
              <div
                key={`${item._id || item.alertId || item.timestamp}-${item.symbol}`}
                className="rounded-lg border px-3 py-2"
                style={{
                  background: "var(--card-strong)",
                  borderColor: "var(--border)",
                }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {item.message || `${item.symbol} ${item.type}`}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {item.timestamp
                    ? formatDistanceToNow(new Date(item.timestamp), {
                        addSuffix: true,
                      })
                    : "just now"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertsPanel;
