import React from "react";
import { ChevronDown, Search } from "lucide-react";

const StockSelector = ({ stocks, selectedStock, onStockChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedStockData = stocks.find(
    (stock) => stock.symbol === selectedStock,
  );

  const handleStockSelect = (symbol) => {
    onStockChange(symbol);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={`relative ${isOpen ? "z-[90]" : "z-10"}`}>
      <label
        className="mb-2 block text-sm font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        Select Stock Symbol
      </label>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full max-w-md items-center justify-between rounded-xl border px-4 py-3 transition-colors hover:brightness-95 focus:outline-none"
        style={{
          background: "var(--card)",
          color: "var(--text)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {selectedStockData?.symbol.charAt(0) || "S"}
            </span>
          </div>
          <div className="text-left">
            <div className="font-medium">
              {selectedStockData?.name || "Select a stock"}
            </div>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
              {selectedStockData?.symbol || ""}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute z-[95] mt-2 w-full max-w-md rounded-xl border"
          style={{
            background: "var(--card-strong)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow)",
            opacity: 1,
          }}
        >
          <div
            className="border-b p-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search stocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border py-2 pl-10 pr-4 text-sm transition-colors focus:outline-none"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredStocks.length > 0 ? (
              filteredStocks.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleStockSelect(stock.symbol)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-3 ${
                    selectedStock === stock.symbol
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-gray-900 dark:text-white"
                  }`}
                  style={{
                    background:
                      selectedStock === stock.symbol
                        ? "var(--accent-soft)"
                        : "transparent",
                  }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedStock === stock.symbol
                        ? "bg-blue-600"
                        : "bg-gray-200 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`text-sm font-bold ${
                        selectedStock === stock.symbol
                          ? "text-white"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {stock.symbol.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{stock.name}</div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {stock.symbol}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div
                className="px-4 py-6 text-center"
                style={{ color: "var(--text-muted)" }}
              >
                No stocks found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[85]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default StockSelector;
