"use client";

import { useEffect, useState, useRef } from "react";
import { Trade, OldVersionTrade } from "@/types";
import { AuthForm } from "@/components/AuthForm";
import { NavigationHeader } from "@/components/NavigationHeader";
import { LiveEngineCard } from "@/components/LiveEngineCard";
import { KPIStatsCards } from "@/components/KPIStatsCards";
import { ExecutionFeedTable } from "@/components/ExecutionFeedTable";
import { V1ExecutionFeedTable } from "@/components/V1ExecutionFeedTable";
import { HistoricalTradesTable } from "@/components/HistoricalTradesTable";
import { TradeDetailsModal } from "@/components/TradeDetailsModal";
import { InteractiveTradingChart } from "@/components/InteractiveTradingChart";
import { InteractiveAggressionChart } from "@/components/InteractiveAggressionChart";
import { InteractiveMaxPainChart } from "@/components/InteractiveMaxPainChart";
import { api } from "@/lib/api";

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [token, setToken] = useState("");
  const [authError, setAuthError] = useState("");

  // Live Data & Connection State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [v1Trades, setV1Trades] = useState<OldVersionTrade[]>([]);
  const [latestTrade, setLatestTrade] = useState<Trade | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [activeTab, setActiveTab] = useState<"overview" | "charts" | "v1_engine" | "history">("overview");
  const [chartEngine, setChartEngine] = useState<"v2" | "v1">("v2");
  const [marketOpen, setMarketOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Date-Filtered History States
  const [historyDate, setHistoryDate] = useState<string>(() => getYesterdayString());
  const [historyTrades, setHistoryTrades] = useState<Trade[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryTrade, setSelectedHistoryTrade] = useState<Trade | null>(null);

  // Fetch History Trades by Date
  useEffect(() => {
    if (!isAuthenticated || !token || activeTab !== "history") return;

    const fetchHistoryByDate = async () => {
      setHistoryLoading(true);
      try {
        const data = await api.trades.getAll({ date: historyDate });
        setHistoryTrades(data);
      } catch (err) {
        console.error("Failed to fetch history trades for date:", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistoryByDate();
  }, [isAuthenticated, token, activeTab, historyDate]);

  // Check market status (9:15 - 15:30 IST Mon-Fri)
  const checkMarketStatus = () => {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const istOffset = 5.5; // IST is UTC+5:30
    const nowIST = new Date(utc + 3600000 * istOffset);

    const day = nowIST.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) {
      setMarketOpen(false);
      return;
    }

    const hours = nowIST.getHours();
    const minutes = nowIST.getMinutes();
    const timeNum = hours * 100 + minutes;

    setMarketOpen(timeNum >= 915 && timeNum <= 1530);
  };

  useEffect(() => {
    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  const socketRef = useRef<WebSocket | null>(null);
  const lastTradeIdRef = useRef<number | null>(null);

  // 1. Initial Authentication Check
  useEffect(() => {
    const savedToken = localStorage.getItem("pulse_token");
    const savedUser = localStorage.getItem("pulse_username");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUsername(savedUser);
      setIsAuthenticated(true);
    }
  }, []);

  const handleDeleteTrade = async (id: number) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this trade log?")) return;

    try {
      await api.trades.delete(id);
      setTrades((prev) => prev.filter((t) => t.id !== id));
      setHistoryTrades((prev) => prev.filter((t) => t.id !== id));
      if (latestTrade && latestTrade.id === id) {
        const remaining = trades.filter((t) => t.id !== id);
        setLatestTrade(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
      if (selectedHistoryTrade && selectedHistoryTrade.id === id) {
        setSelectedHistoryTrade(null);
      }
    } catch (err) {
      console.error("Error deleting trade:", err);
      alert("Error deleting trade.");
    }
  };

  // 2. Fetch History & Open WebSocket Connection
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Fetch initial history for today (or fallback to latest session trades)
    const fetchHistory = async () => {
      try {
        const d = new Date();
        const utc = d.getTime() + d.getTimezoneOffset() * 60000;
        const ist = new Date(utc + 3600000 * 5.5);
        const todayStr = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}-${String(ist.getDate()).padStart(2, "0")}`;

        let [data, v1Data] = await Promise.all([
          api.trades.getAll({ limit: 500, date: todayStr }),
          api.trades.getV1All({ limit: 500, date: todayStr }),
        ]);

        if (data.length === 0) {
          data = await api.trades.getAll({ limit: 500 });
        }
        if (v1Data.length === 0) {
          v1Data = await api.trades.getV1All({ limit: 500 });
        }

        setTrades(data);
        setV1Trades(v1Data);
        if (data.length > 0) {
          const latest = data[0];
          setLatestTrade(latest);
          lastTradeIdRef.current = latest.id;
        }
      } catch (err) {
        console.error("Failed to fetch trade history:", err);
      }
    };

    fetchHistory();
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [isAuthenticated, token]);

  // WebSocket Connection & Gap Recovery Logic
  const connectWebSocket = () => {
    setConnectionStatus("connecting");
    let baseUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!baseUrl) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      baseUrl = apiUrl.replace(/^http/, "ws");
    }
    const wsUrl = `${baseUrl}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = async () => {
      setConnectionStatus("connected");
      console.log("WebSocket connection established");

      // Backfill any trades missed during connection gap
      if (lastTradeIdRef.current) {
        try {
          const missedTrades: Trade[] = await api.trades.getAll({ since: lastTradeIdRef.current });
          if (missedTrades.length > 0) {
            setTrades((prev) => {
              const combined = [...missedTrades, ...prev];
              // Remove duplicates based on ID
              const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
              return unique.slice(0, 500); // Keep whole day trades (newest on top)
            });
            const last = missedTrades[0];
            setLatestTrade(last);
            lastTradeIdRef.current = last.id;
          }
        } catch (err) {
          console.error("Failed to run gap backfill:", err);
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "trade:new") {
          const newTrade: Trade = payload.data;
          setLatestTrade(newTrade);
          lastTradeIdRef.current = newTrade.id;
          setTrades((prev) => [newTrade, ...prev].slice(0, 500));
        } else if (payload.type === "trade_v1:new") {
          const newV1Trade: OldVersionTrade = payload.data;
          setV1Trades((prev) => [newV1Trade, ...prev].slice(0, 500));
        } else if (payload.type === "countdown:tick") {
          setCountdown(payload.data.secondsRemaining);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      console.log("WebSocket connection closed, retrying in 5 seconds...");
      setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      ws.close();
    };
  };

  // Auth Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (username.length !== 6) {
      setAuthError("Username must be exactly 6 characters");
      return;
    }

    try {
      let data;
      if (authMode === "login") {
        data = await api.auth.login(username, password);
      } else {
        data = await api.auth.register(username, password);
      }

      if (authMode === "register") {
        setAuthMode("login");
        setAuthError("Registration successful! Please log in.");
        return;
      }

      // Successful Login
      localStorage.setItem("pulse_token", data.token);
      localStorage.setItem("pulse_username", username);
      setToken(data.token);
      setIsAuthenticated(true);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Authentication failed";
      setAuthError(errMsg);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("pulse_token");
    localStorage.removeItem("pulse_username");
    setIsAuthenticated(false);
    setToken("");
    setTrades([]);
    setLatestTrade(null);
  };

  // Authentication UI Overlay
  if (!isAuthenticated) {
    return (
      <AuthForm
        authMode={authMode}
        username={username}
        passwordHash={password}
        authError={authError}
        onChangeUsername={setUsername}
        onChangePassword={setPassword}
        onSubmit={handleAuth}
        onToggleMode={setAuthMode}
      />
    );
  }

  // Filter today's trades for the charts view (sorted ascending by time so charts render left-to-right)
  const todaysTrades = trades
    .filter((t) => {
      const tradeDate = new Date(t.timestamp);
      const today = new Date();
      return (
        tradeDate.getDate() === today.getDate() &&
        tradeDate.getMonth() === today.getMonth() &&
        tradeDate.getFullYear() === today.getFullYear()
      );
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const v1TodaysTrades = v1Trades
    .filter((t) => {
      const tradeDate = new Date(t.timestamp);
      const today = new Date();
      return (
        tradeDate.getDate() === today.getDate() &&
        tradeDate.getMonth() === today.getMonth() &&
        tradeDate.getFullYear() === today.getFullYear()
      );
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Dashboard Live UI
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white selection:bg-cyan-500 selection:text-black">
      {/* Navbar & Navigation Tabs */}
      <NavigationHeader
        connectionStatus={connectionStatus}
        marketOpen={marketOpen}
        countdown={countdown}
        username={username}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main container */}
      <main className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        {/* Tab Contents */}
        <div className="mt-8">
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Market Closed Warning Banner */}
              {!marketOpen && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs md:text-sm text-red-400 flex items-center gap-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-medium">
                    Market is currently closed. Real-time option data ingestion is paused; displaying historical logs.
                  </span>
                </div>
              )}

              {/* Highlighted Live Trade Conviction Card */}
              <LiveEngineCard latestTrade={latestTrade} connectionStatus={connectionStatus} />

              {/* Hero KPI Grid */}
              <KPIStatsCards latestTrade={latestTrade} />

              {/* Feed History Table with Signal Comparison */}
              <ExecutionFeedTable trades={trades} v1Trades={v1Trades} />
            </div>
          )}

          {activeTab === "v1_engine" && (
            <V1ExecutionFeedTable trades={v1Trades} />
          )}

          {activeTab === "charts" && (
            <div className="space-y-6">
              {/* Engine Switcher Controls */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-900/30 p-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Select Interactive Chart Engine Source</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Switch chart visualization between V2 Active Engine and V1 Legacy Engine data
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-850">
                  <button
                    onClick={() => setChartEngine("v2")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      chartEngine === "v2"
                        ? "bg-cyan-500 text-black shadow font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    V2 Active Engine
                  </button>
                  <button
                    onClick={() => setChartEngine("v1")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      chartEngine === "v1"
                        ? "bg-amber-500 text-black shadow font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    V1 Legacy Engine
                  </button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6">
                  <h4 className="text-md font-semibold text-zinc-400 mb-4 flex items-center justify-between">
                    <span>
                      {chartEngine === "v2" ? "Trading Trend (Spot vs PCR)" : "V1 Legacy Trading Trend (Spot vs PCR)"}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-900/60 px-2 py-0.5 rounded">
                      Interactive
                    </span>
                  </h4>
                  <div className="aspect-[4/3] rounded bg-zinc-950 p-4 border border-zinc-900 flex items-center justify-center">
                    <InteractiveTradingChart trades={chartEngine === "v2" ? todaysTrades : v1TodaysTrades} />
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6">
                  <h4 className="text-md font-semibold text-zinc-400 mb-4 flex items-center justify-between">
                    <span>
                      {chartEngine === "v2" ? "Buyer Aggression Trend (CE vs PE)" : "V2 Buyer Aggression Trend (CE vs PE)"}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-900/60 px-2 py-0.5 rounded">
                      Interactive
                    </span>
                  </h4>
                  <div className="aspect-[4/3] rounded bg-zinc-950 p-4 border border-zinc-900 flex items-center justify-center">
                    <InteractiveAggressionChart trades={todaysTrades} />
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6 md:col-span-2">
                  <h4 className="text-md font-semibold text-zinc-400 mb-4 flex items-center justify-between">
                    <span>
                      {chartEngine === "v2" ? "Max Pain vs Spot Price Level" : "V1 Legacy Max Pain vs Spot Price Level"}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-900/60 px-2 py-0.5 rounded">
                      Interactive
                    </span>
                  </h4>
                  <div className="w-full aspect-[16/9] rounded bg-zinc-950 p-4 border border-zinc-900 flex items-center justify-center">
                    <InteractiveMaxPainChart trades={chartEngine === "v2" ? todaysTrades : v1TodaysTrades} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-5">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white">Historical Trade Lookup</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Review market cycle ticks generated by the pulseAI Engine on any specific calendar date
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-400">Select Date:</span>
                  <input
                    type="date"
                    value={historyDate}
                    max={getYesterdayString()}
                    onChange={(e) => setHistoryDate(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                  />
                </div>
              </div>

              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                  <span className="text-xs text-zinc-500">Querying historical database records...</span>
                </div>
              ) : historyTrades.length === 0 ? (
                <div className="text-center py-20 rounded-xl border border-dashed border-zinc-900 bg-zinc-950/20">
                  <span className="text-3xl block mb-2">📁</span>
                  <span className="text-sm font-semibold text-zinc-500">
                    No trading logs found for {new Date(historyDate).toLocaleDateString()}
                  </span>
                  <p className="text-xs text-zinc-600 mt-1">The market may have been closed, or the engine was not running.</p>
                </div>
              ) : (
                <HistoricalTradesTable
                  historyTrades={historyTrades}
                  setSelectedHistoryTrade={setSelectedHistoryTrade}
                  onDeleteTrade={handleDeleteTrade}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* History Detail Modal */}
      {selectedHistoryTrade && (
        <TradeDetailsModal
          trade={selectedHistoryTrade}
          onClose={() => setSelectedHistoryTrade(null)}
          onDelete={handleDeleteTrade}
        />
      )}
    </div>
  );
}
