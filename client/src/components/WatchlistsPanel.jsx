import React from "react";
import { Bookmark, Play, Plus, Save, Trash2, X } from "lucide-react";

const WatchlistsPanel = ({
  watchlists,
  selectedWatchlistId,
  selectedStock,
  stocksBySymbol,
  onSelectWatchlist,
  onCreateWatchlist,
  onRenameWatchlist,
  onDeleteWatchlist,
  onAddSymbol,
  onRemoveSymbol,
  onSelectSymbol,
  onCreatePreset,
  onDeletePreset,
  onApplyPreset,
}) => {
  const [newName, setNewName] = React.useState("");
  const [renameName, setRenameName] = React.useState("");
  const [presetName, setPresetName] = React.useState("Breakout Rule");
  const [presetType, setPresetType] = React.useState("price_above");
  const [presetThreshold, setPresetThreshold] = React.useState("0");
  const [presetCooldown, setPresetCooldown] = React.useState("90");

  const selectedWatchlist = React.useMemo(
    () => watchlists.find((item) => item.id === selectedWatchlistId) || null,
    [watchlists, selectedWatchlistId],
  );

  React.useEffect(() => {
    setRenameName(selectedWatchlist?.name || "");
  }, [selectedWatchlist?.id, selectedWatchlist?.name]);

  const handleCreate = () => {
    const normalizedName = newName.trim();
    if (!normalizedName) return;
    onCreateWatchlist(normalizedName);
    setNewName("");
  };

  const handleRename = () => {
    if (!selectedWatchlist) return;
    const normalizedName = renameName.trim();
    if (!normalizedName || normalizedName === selectedWatchlist.name) return;
    onRenameWatchlist(selectedWatchlist.id, normalizedName);
  };

  const handleCreatePreset = () => {
    if (!selectedWatchlist) return;

    const threshold = Number(presetThreshold);
    const cooldownSeconds = Number(presetCooldown);
    if (!Number.isFinite(threshold) || threshold < 0) return;

    onCreatePreset(selectedWatchlist.id, {
      name: presetName,
      type: presetType,
      threshold,
      cooldownSeconds,
      isActive: true,
    });
  };

  const typeLabels = {
    price_above: "Price Above",
    price_below: "Price Below",
    volatility: "Volatility %",
    volume_spike: "Volume Spike",
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bookmark size={18} style={{ color: "var(--accent)" }} />
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text)" }}
          >
            Watchlists
          </h2>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleCreate();
              }
            }}
            placeholder="Create watchlist"
            className="w-full rounded-lg border px-3 py-2 text-sm sm:w-52"
            style={{
              background: "var(--card-strong)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"
            style={{
              background: "var(--accent)",
              borderColor: "transparent",
              color: "#fff",
            }}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {watchlists.map((watchlist) => {
          const active = selectedWatchlistId === watchlist.id;
          return (
            <div key={watchlist.id} className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectWatchlist(watchlist.id)}
                className="rounded-full border px-3 py-1 text-sm font-semibold"
                style={{
                  background: active
                    ? "var(--accent-soft)"
                    : "var(--card-strong)",
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  color: "var(--text)",
                }}
              >
                {watchlist.name}
                <span
                  className="ml-2 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {watchlist.symbols.length}
                </span>
              </button>
              {watchlists.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteWatchlist(watchlist.id)}
                  className="rounded-full border p-1"
                  aria-label={`Delete ${watchlist.name}`}
                  title={`Delete ${watchlist.name}`}
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mb-4 grid gap-2 md:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleRename();
                }
              }}
              disabled={!selectedWatchlist}
              className="w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
              style={{
                background: "var(--card-strong)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
              placeholder="Rename selected watchlist"
            />
            <button
              type="button"
              onClick={handleRename}
              disabled={!selectedWatchlist}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
              style={{
                background: "var(--card-strong)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              <Save size={12} />
              Rename
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              selectedWatchlist && selectedStock
                ? onAddSymbol(selectedWatchlist.id, selectedStock)
                : null
            }
            disabled={!selectedWatchlist || !selectedStock}
            className="rounded-lg border px-3 py-1 text-xs font-semibold disabled:opacity-50"
            style={{
              background: "var(--card-strong)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            Add current stock
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {selectedWatchlist?.symbols?.length ? (
            selectedWatchlist.symbols.map((symbol) => (
              <div
                key={symbol}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-1"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--card-strong)",
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectSymbol(symbol)}
                  className="text-xs font-semibold"
                  style={{ color: "var(--text)" }}
                  title={stocksBySymbol[symbol] || symbol}
                >
                  {symbol}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveSymbol(selectedWatchlist.id, symbol)}
                  className="rounded-full p-0.5"
                  aria-label={`Remove ${symbol}`}
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={12} />
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No symbols yet. Pick a stock above and click "Add current stock".
            </p>
          )}
        </div>

        <div
          className="rounded-xl border p-3"
          style={{
            borderColor: "var(--border)",
            background: "var(--card-strong)",
          }}
        >
          <p
            className="mb-2 text-xs uppercase tracking-[0.12em]"
            style={{ color: "var(--text-muted)" }}
          >
            Alert Presets
          </p>

          <div className="mb-2 grid gap-2 md:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
              placeholder="Preset name"
            />

            <select
              value={presetType}
              onChange={(event) => setPresetType(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            >
              <option value="price_above">Price Above</option>
              <option value="price_below">Price Below</option>
              <option value="volatility">Volatility %</option>
              <option value="volume_spike">Volume Spike</option>
            </select>

            <input
              type="number"
              value={presetThreshold}
              onChange={(event) => setPresetThreshold(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
              min="0"
              step="0.01"
              placeholder="Threshold"
            />

            <input
              type="number"
              value={presetCooldown}
              onChange={(event) => setPresetCooldown(event.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
              min="15"
              max="3600"
              step="1"
              placeholder="Cooldown sec"
            />

            <button
              type="button"
              onClick={handleCreatePreset}
              disabled={!selectedWatchlist}
              className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--accent)",
                borderColor: "transparent",
                color: "#fff",
              }}
            >
              <Plus size={14} />
              Add Preset
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedWatchlist?.alertPresets?.length ? (
              selectedWatchlist.alertPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-1"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--card)",
                  }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    {preset.name}: {typeLabels[preset.type] || preset.type}{" "}
                    {preset.threshold}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onApplyPreset(selectedWatchlist.id, preset.id)
                    }
                    className="rounded-full p-0.5"
                    title="Apply preset to all symbols in watchlist"
                    style={{ color: "var(--accent)" }}
                  >
                    <Play size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onDeletePreset(selectedWatchlist.id, preset.id)
                    }
                    className="rounded-full p-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No presets yet. Create one and apply it to generate alerts for
                all symbols.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WatchlistsPanel;
