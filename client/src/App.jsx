import React, { useState, useEffect, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import StockChart from "./components/StockChart";
import StockSelector from "./components/StockSelector";
import StockCard from "./components/StockData";
import AlertsPanel from "./components/AlertsPanel";
import AlertToasts from "./components/AlertToasts";
import AuthPage from "./components/AuthPage";
import {
  Moon,
  Sun,
  Activity,
  Wifi,
  WifiOff,
  Zap,
  LogOut,
  UserRound,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;
const THEME_KEY = "stock-dashboard-theme";
const AUTH_TOKEN_KEY = "stock-dashboard-auth-token";

const TIME_RANGE_OPTIONS = [
  { value: "current", label: "Current" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
  { value: "all", label: "All" },
];

const initialTheme = () => {
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

function App() {
  const [authToken, setAuthToken] = useState(
    () => window.localStorage.getItem(AUTH_TOKEN_KEY) || "",
  );
  const [authUser, setAuthUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState("");
  const [stockData, setStockData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedRange, setSelectedRange] = useState("current");
  const [isConnected, setIsConnected] = useState(false);
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  const [alerts, setAlerts] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isDataStale, setIsDataStale] = useState(false);
  const [pollingMeta, setPollingMeta] = useState({
    pollingMode: "idle",
    pollingDelayMs: 0,
    dbMode: "unknown",
  });

  const selectedStockRef = useRef(selectedStock);
  const selectedRangeRef = useRef(selectedRange);
  const lastDataTimestampRef = useRef(Date.now());
  const staleToastSentRef = useRef(false);
  const activeHistoryRequestRef = useRef(0);
  const historyCacheRef = useRef(new Map());

  useEffect(() => {
    selectedStockRef.current = selectedStock;
  }, [selectedStock]);

  useEffect(() => {
    selectedRangeRef.current = selectedRange;
  }, [selectedRange]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const addToast = (title, message, tone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [{ id, title, message, tone }, ...prev].slice(0, 6));

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 6000);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const getAuthHeaders = () =>
    authToken
      ? {
          Authorization: `Bearer ${authToken}`,
        }
      : {};

  const fetchStocks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stocks`);
      const stockList = await response.json();
      setStocks(stockList);
      if (!selectedStockRef.current && stockList.length > 0) {
        setSelectedStock(stockList[0].symbol);
      }
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
      addToast(
        "Stocks unavailable",
        "Unable to load symbols from API",
        "error",
      );
    }
  };

  const fetchAlerts = async () => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please log in again.");
      }

      const data = await response.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      if (error.message.includes("Session expired")) {
        setAuthToken("");
        setAuthUser(null);
      }
    }
  };

  const fetchAlertHistory = async () => {
    if (!authToken) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/alerts/history?limit=50`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.status === 401) {
        throw new Error("Session expired. Please log in again.");
      }

      const data = await response.json();
      setAlertHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch alert history:", error);
      if (error.message.includes("Session expired")) {
        setAuthToken("");
        setAuthUser(null);
      }
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      setPollingMeta({
        pollingMode: data.pollingMode || "idle",
        pollingDelayMs: data.pollingDelayMs || 0,
        dbMode: data.dbMode || "unknown",
      });
    } catch (error) {
      console.error("Health fetch failed:", error);
    }
  };

  const fetchHistoricalData = async (symbol, rangeKey) => {
    if (!symbol) return;

    const requestId = activeHistoryRequestRef.current + 1;
    activeHistoryRequestRef.current = requestId;

    const cacheKey = `${symbol}::${rangeKey}`;
    const cached = historyCacheRef.current.get(cacheKey);
    const CACHE_TTL_MS = 2 * 60 * 1000;

    if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
      setHistoricalData(cached.data);
      setIsRangeLoading(false);
      return;
    }

    setIsRangeLoading(true);

    try {
      const rangeLimit =
        rangeKey === "all" ? 2400 : rangeKey === "5y" ? 1400 : 900;
      const response = await fetch(
        `${API_BASE_URL}/api/stocks/${encodeURIComponent(symbol)}/history?range=${encodeURIComponent(rangeKey)}&limit=${rangeLimit}`,
      );

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Failed to fetch historical range");
      }

      const payload = await response.json();
      const points = Array.isArray(payload) ? payload : payload.data;

      if (activeHistoryRequestRef.current !== requestId) {
        return;
      }

      const normalizedPoints = Array.isArray(points) ? points : [];
      setHistoricalData(normalizedPoints);
      historyCacheRef.current.set(cacheKey, {
        savedAt: Date.now(),
        data: normalizedPoints,
      });
    } catch (error) {
      if (activeHistoryRequestRef.current === requestId) {
        setHistoricalData([]);
        addToast("Range unavailable", error.message, "error");
      }
    } finally {
      if (activeHistoryRequestRef.current === requestId) {
        setIsRangeLoading(false);
      }
    }
  };

  useEffect(() => {
    const verifySession = async () => {
      if (!authToken) {
        setAuthUser(null);
        setIsAuthLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Session invalid");
        }

        const payload = await response.json();
        setAuthUser(payload.user || null);
      } catch (error) {
        setAuthToken("");
        setAuthUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    verifySession();
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      setSocket(null);
      setStocks([]);
      setSelectedStock("");
      setStockData(null);
      setHistoricalData([]);
      setAlerts([]);
      setAlertHistory([]);
      historyCacheRef.current.clear();
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return undefined;

    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1200,
      reconnectionDelayMax: 5000,
      auth: { token: authToken },
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
      setIsDataStale(false);
      staleToastSentRef.current = false;
      addToast("Live connection", "Connected to stock feed", "success");
      fetchHealth();
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      addToast("Connection lost", "Trying to reconnect to server", "warning");
    });

    newSocket.on("stockUpdate", (data) => {
      if (data.symbol !== selectedStockRef.current) return;

      setStockData(data);

      if (selectedRangeRef.current === "current") {
        setHistoricalData((prev) => [...prev.slice(-299), data]);
      }

      lastDataTimestampRef.current = Date.now();
      setIsDataStale(false);
      staleToastSentRef.current = false;
    });

    newSocket.on("historicalData", ({ symbol, data }) => {
      if (
        symbol === selectedStockRef.current &&
        selectedRangeRef.current === "current"
      ) {
        setHistoricalData((prev) => (prev.length ? prev : data));
      }
    });

    newSocket.on("alertTriggered", (payload) => {
      setAlertHistory((prev) => [payload, ...prev].slice(0, 100));
      addToast("Alert triggered", payload.message, "warning");
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error.message);
      if (error.message?.toLowerCase().includes("auth")) {
        setAuthToken("");
        setAuthUser(null);
      }
      addToast("Stream warning", error.message, "error");
    });

    fetchStocks();
    fetchAlerts();
    fetchAlertHistory();
    fetchHealth();

    return () => {
      newSocket.close();
    };
  }, [authToken]);

  useEffect(() => {
    if (selectedStock && socket) {
      socket.emit("subscribe", selectedStock);

      setStockData(null);
      setHistoricalData([]);

      fetchHistoricalData(selectedStock, selectedRangeRef.current);

      fetchAlerts();
    }
  }, [selectedStock, socket]);

  useEffect(() => {
    if (!selectedStockRef.current) return;
    fetchHistoricalData(selectedStockRef.current, selectedRange);
  }, [selectedRange]);

  const handleStockChange = (symbol) => {
    if (socket && selectedStock) {
      socket.emit("unsubscribe", selectedStock);
    }
    setSelectedStock(symbol);
  };

  useEffect(() => {
    const healthInterval = setInterval(fetchHealth, 10000);
    return () => clearInterval(healthInterval);
  }, []);

  useEffect(() => {
    const staleInterval = setInterval(() => {
      if (!isConnected || !selectedStockRef.current) {
        setIsDataStale(false);
        staleToastSentRef.current = false;
        return;
      }

      const stale = Date.now() - lastDataTimestampRef.current > 20000;
      setIsDataStale(stale);

      if (stale && !staleToastSentRef.current) {
        addToast(
          "Data is stale",
          "No fresh tick in the last 20 seconds",
          "warning",
        );
        staleToastSentRef.current = true;
      }
    }, 4000);

    return () => clearInterval(staleInterval);
  }, [isConnected]);

  const createAlert = async (payload) => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Unable to create alert");
      }

      await fetchAlerts();
      addToast("Alert created", `${payload.symbol} ${payload.type}`, "success");
    } catch (error) {
      addToast("Create failed", error.message, "error");
    }
  };

  const toggleAlert = async (alert) => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/${alert._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ isActive: !alert.isActive }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Unable to update alert");
      }

      await fetchAlerts();
    } catch (error) {
      addToast("Update failed", error.message, "error");
    }
  };

  const deleteAlert = async (id) => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Unable to delete alert");
      }

      await fetchAlerts();
      addToast("Alert removed", "The rule has been deleted", "info");
    } catch (error) {
      addToast("Delete failed", error.message, "error");
    }
  };

  const themeButtonLabel = useMemo(
    () =>
      theme === "dark" ? "Switch to creamy light" : "Switch to off-black dark",
    [theme],
  );

  const handleAuthSuccess = ({ token, user }) => {
    setAuthToken(token || "");
    setAuthUser(user || null);
    addToast("Welcome", `Signed in as ${user?.name || "trader"}`, "success");
  };

  const handleLogout = () => {
    if (socket) {
      socket.close();
    }
    setAuthToken("");
    setAuthUser(null);
    addToast("Signed out", "Your session ended successfully", "info");
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="rounded-2xl border px-5 py-3 text-sm"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          Checking session...
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <AuthPage
        apiBaseUrl={API_BASE_URL}
        initialMode="login"
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      <div className="grain-overlay" />
      <AlertToasts toasts={toasts} onDismiss={dismissToast} />

      <div className="container mx-auto px-4 py-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 fade-in-up">
          <div className="flex items-center space-x-3">
            <Activity className="h-8 w-8" style={{ color: "var(--accent)" }} />
            <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
              QuantVista
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex items-center space-x-2 rounded-xl border px-3 py-2"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              {isConnected ? (
                <Wifi size={16} style={{ color: "var(--gain)" }} />
              ) : (
                <WifiOff size={16} style={{ color: "var(--loss)" }} />
              )}
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>

            <div
              className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <UserRound size={14} style={{ color: "var(--accent)" }} />
              <span style={{ color: "var(--text-muted)" }}>
                {authUser.name}
              </span>
            </div>

            <div
              className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <Zap size={14} style={{ color: "var(--accent)" }} />
              <span style={{ color: "var(--text-muted)" }}>
                {pollingMeta.pollingMode} • {pollingMeta.pollingDelayMs}ms •{" "}
                {pollingMeta.dbMode}
              </span>
            </div>

            <button
              type="button"
              className="rounded-xl border p-2"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={16} style={{ color: "var(--text-muted)" }} />
            </button>

            <button
              type="button"
              className="rounded-xl border p-2"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
              onClick={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
              aria-label={themeButtonLabel}
              title={themeButtonLabel}
            >
              {theme === "dark" ? (
                <Sun size={18} style={{ color: "#f4bc42" }} />
              ) : (
                <Moon size={18} style={{ color: "#3e4f66" }} />
              )}
            </button>
          </div>
        </div>

        <div
          className="relative z-30 mb-6 fade-in-up"
          style={{ animationDelay: "80ms" }}
        >
          <StockSelector
            stocks={stocks}
            selectedStock={selectedStock}
            onStockChange={handleStockChange}
          />
        </div>

        <div
          className="grid grid-cols-1 gap-6 lg:grid-cols-3 fade-in-up"
          style={{ animationDelay: "160ms" }}
        >
          <div className="lg:col-span-1">
            <StockCard
              stockData={stockData}
              loading={!stockData && isRangeLoading}
            />
          </div>

          <div className="lg:col-span-2">
            <div
              className="rounded-2xl border p-6"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    Price Chart
                  </h2>

                  <div className="flex flex-wrap items-center gap-2">
                    {TIME_RANGE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedRange(option.value)}
                        className="rounded-full border px-3 py-1 text-xs font-semibold transition-all"
                        disabled={isRangeLoading}
                        style={{
                          background:
                            selectedRange === option.value
                              ? "var(--accent)"
                              : "var(--card-strong)",
                          color:
                            selectedRange === option.value
                              ? "#ffffff"
                              : "var(--text)",
                          borderColor:
                            selectedRange === option.value
                              ? "transparent"
                              : "var(--border)",
                          opacity: isRangeLoading ? 0.6 : 1,
                          cursor: isRangeLoading ? "not-allowed" : "pointer",
                        }}
                        aria-pressed={selectedRange === option.value}
                        aria-busy={isRangeLoading}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {isRangeLoading && (
                    <div className="mt-1 flex w-full flex-wrap items-center gap-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <span
                          key={`range-skeleton-${index}`}
                          className="skeleton-shimmer h-6 rounded-full"
                          style={{
                            width: index % 2 === 0 ? "3rem" : "4.25rem",
                            background: "var(--accent-soft)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {isRangeLoading && (
                  <div
                    className="flex items-center space-x-2"
                    style={{ color: "var(--accent)" }}
                  >
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    <span className="text-sm">
                      Loading {selectedRange.toUpperCase()}...
                    </span>
                  </div>
                )}
              </div>

              <StockChart
                data={historicalData}
                loading={isRangeLoading}
                isDark={theme === "dark"}
                selectedRange={selectedRange}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 fade-in-up" style={{ animationDelay: "220ms" }}>
          <AlertsPanel
            stocks={stocks}
            selectedStock={selectedStock}
            alerts={alerts}
            alertHistory={alertHistory}
            onCreateAlert={createAlert}
            onToggleAlert={toggleAlert}
            onDeleteAlert={deleteAlert}
          />
        </div>

        <div
          className="mt-8 text-center text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          <p>
            Adaptive real-time updates • Data freshness{" "}
            {isDataStale ? "stale" : "live"} • Data provided by Yahoo Finance
            API
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
