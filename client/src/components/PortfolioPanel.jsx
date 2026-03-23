import React from "react";
import { BriefcaseBusiness, Plus, Trash2 } from "lucide-react";

const numberFormat = (value, digits = 2) =>
  Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "--";

const PortfolioPanel = ({
  stocks,
  selectedStock,
  summary,
  transactions,
  onCreateTransaction,
  onDeleteTransaction,
}) => {
  const [form, setForm] = React.useState({
    symbol: selectedStock || "",
    side: "buy",
    quantity: "1",
    price: "0",
    fee: "0",
    notes: "",
  });

  React.useEffect(() => {
    if (!form.symbol && selectedStock) {
      setForm((prev) => ({ ...prev, symbol: selectedStock }));
    }
  }, [selectedStock, form.symbol]);

  const handleSubmit = () => {
    if (!form.symbol) return;

    onCreateTransaction({
      symbol: form.symbol,
      side: form.side,
      quantity: Number(form.quantity),
      price: Number(form.price),
      fee: Number(form.fee || 0),
      notes: form.notes,
      tradedAt: new Date().toISOString(),
    });
  };

  const positions = Array.isArray(summary?.positions) ? summary.positions : [];
  const totals = summary?.totals || {
    marketValue: 0,
    unrealizedPnl: 0,
    realizedPnl: 0,
    positions: 0,
    transactions: 0,
  };

  return (
    <section
      className="rounded-2xl border p-5"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <BriefcaseBusiness size={18} style={{ color: "var(--accent)" }} />
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
          Portfolio Scaffold
        </h2>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-6">
        <select
          value={form.symbol}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, symbol: event.target.value }))
          }
          className="rounded-lg border px-3 py-2 text-sm"
          style={{
            background: "var(--card-strong)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          <option value="">Symbol</option>
          {stocks.map((stock) => (
            <option key={stock.symbol} value={stock.symbol}>
              {stock.symbol}
            </option>
          ))}
        </select>

        <select
          value={form.side}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, side: event.target.value }))
          }
          className="rounded-lg border px-3 py-2 text-sm"
          style={{
            background: "var(--card-strong)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>

        <input
          type="number"
          min="0"
          step="0.0001"
          value={form.quantity}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, quantity: event.target.value }))
          }
          placeholder="Qty"
          className="rounded-lg border px-3 py-2 text-sm"
          style={{
            background: "var(--card-strong)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        />

        <input
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, price: event.target.value }))
          }
          placeholder="Price"
          className="rounded-lg border px-3 py-2 text-sm"
          style={{
            background: "var(--card-strong)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        />

        <input
          type="number"
          min="0"
          step="0.01"
          value={form.fee}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, fee: event.target.value }))
          }
          placeholder="Fee"
          className="rounded-lg border px-3 py-2 text-sm"
          style={{
            background: "var(--card-strong)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        />

        <button
          type="button"
          onClick={handleSubmit}
          className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"
          style={{
            background: "var(--accent)",
            borderColor: "transparent",
            color: "#fff",
          }}
        >
          <Plus size={14} />
          Add Txn
        </button>
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-3">
        <div
          className="rounded-lg border px-3 py-2"
          style={{
            background: "var(--card-strong)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="text-xs uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Market Value
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            INR {numberFormat(totals.marketValue)}
          </p>
        </div>
        <div
          className="rounded-lg border px-3 py-2"
          style={{
            background: "var(--card-strong)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="text-xs uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Unrealized P&L
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            INR {numberFormat(totals.unrealizedPnl)}
          </p>
        </div>
        <div
          className="rounded-lg border px-3 py-2"
          style={{
            background: "var(--card-strong)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="text-xs uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Realized P&L
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            INR {numberFormat(totals.realizedPnl)}
          </p>
        </div>
      </div>

      <div
        className="mb-3 rounded-xl border p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <p
          className="mb-2 text-xs uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          Positions
        </p>
        <div className="max-h-40 overflow-y-auto">
          {positions.length ? (
            <div className="space-y-2">
              {positions.map((position) => (
                <div
                  key={position.symbol}
                  className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 text-sm"
                  style={{ color: "var(--text)" }}
                >
                  <span>{position.symbol}</span>
                  <span>Qty {numberFormat(position.quantity, 4)}</span>
                  <span>U-PnL {numberFormat(position.unrealizedPnl || 0)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No open positions yet.
            </p>
          )}
        </div>
      </div>

      <div
        className="rounded-xl border p-3"
        style={{ borderColor: "var(--border)" }}
      >
        <p
          className="mb-2 text-xs uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          Recent Transactions
        </p>
        <div className="max-h-44 overflow-y-auto space-y-2">
          {transactions.length ? (
            transactions.map((txn) => (
              <div
                key={txn._id}
                className="flex items-center justify-between rounded-lg border px-2 py-1.5 text-xs"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                <span>
                  {txn.side.toUpperCase()} {txn.symbol} x{" "}
                  {numberFormat(Number(txn.quantity), 4)} @{" "}
                  {numberFormat(Number(txn.price), 2)}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteTransaction(txn._id)}
                  className="rounded-full p-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No transactions yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default PortfolioPanel;
