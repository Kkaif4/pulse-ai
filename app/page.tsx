"use client";

import { useEffect, useState, useRef } from "react";

interface Trade {
  id: number;
  timestamp: string;
  spotPrice: number;
  pcr: number;
  maxPain: number;
  support: number;
  resistance: number;
  top3Support: number[];
  top3Resistance: number[];
  avgIvSkew: number;
  atmStrike: number;
  atmStraddleCost: number;
  avgCeAggr: number;
  avgPeAggr: number;
  foScore: number;
  rsi: number;
  adx: number;
  spotTrend: string;
  emaTrend: string;
  longTermTrend: string;
  score: number;
  sentiment: string;
  signal: string;
  actionableSignal: string;
  summary: string;
}

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
  const [latestTrade, setLatestTrade] = useState<Trade | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [activeTab, setActiveTab] = useState<"overview" | "charts" | "terminal">("overview");
  const [marketOpen, setMarketOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);

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

  // Countdown timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset countdown on new trade arrival
  useEffect(() => {
    if (latestTrade) {
      setCountdown(60);
    }
  }, [latestTrade]);

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

  // 2. Fetch History & Open WebSocket Connection
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Fetch initial history
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/trades?limit=50", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTrades(data);
          if (data.length > 0) {
            const latest = data[data.length - 1];
            setLatestTrade(latest);
            lastTradeIdRef.current = latest.id;
          }
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
    const wsUrl = `ws://localhost:3001?token=${token}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = async () => {
      setConnectionStatus("connected");
      console.log("WebSocket connection established");

      // Backfill any trades missed during connection gap
      if (lastTradeIdRef.current) {
        try {
          const res = await fetch(`/api/trades?since=${lastTradeIdRef.current}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const missedTrades: Trade[] = await res.json();
            if (missedTrades.length > 0) {
              setTrades((prev) => {
                const combined = [...prev, ...missedTrades];
                // Remove duplicates based on ID
                const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
                return unique.slice(-100); // Keep last 100
              });
              const last = missedTrades[missedTrades.length - 1];
              setLatestTrade(last);
              lastTradeIdRef.current = last.id;
            }
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
          setTrades((prev) => [...prev, newTrade].slice(-100));
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

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Authentication failed");
        return;
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
    } catch (err) {
      setAuthError("Server communication error");
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 font-sans text-white selection:bg-cyan-500 selection:text-black">
        <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute -top-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-2xl"></div>

          <div className="text-center">
            <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              pulseAI
            </h1>
            <p className="mt-2 text-zinc-400">Advanced NIFTY Live Options Conviction Engine</p>
          </div>

          <form onSubmit={handleAuth} className="mt-8 space-y-6">
            {authError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
                {authError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Username (6 Characters)</label>
              <input
                type="text"
                maxLength={6}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 p-3 font-semibold text-black transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.99]"
            >
              {authMode === "login" ? "Sign In" : "Register Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            {authMode === "login" ? (
              <button onClick={() => setAuthMode("register")} className="text-cyan-400 hover:underline">
                Create new 6-character username account
              </button>
            ) : (
              <button onClick={() => setAuthMode("login")} className="text-cyan-400 hover:underline">
                Back to Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Live UI
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white selection:bg-cyan-500 selection:text-black">
      {/* Navbar */}
      <header className="border-b border-zinc-900 bg-zinc-900/30 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-black tracking-tight text-transparent">
              pulseAI
            </h1>
            <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${connectionStatus === "connected" ? "bg-green-500 animate-pulse" : connectionStatus === "connecting" ? "bg-yellow-500" : "bg-red-500"
                }`}></span>
              <span className="capitalize text-zinc-400">{connectionStatus}</span>
            </div>

            {/* Market Status Badge */}
            <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs border transition-all duration-300 ${marketOpen
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/25 animate-pulse"
              }`}>
              <span className={`h-2 w-2 rounded-full ${marketOpen ? "bg-cyan-500 animate-pulse" : "bg-red-500"
                }`}></span>
              <span className="font-bold">{marketOpen ? "Market Open" : "Market Closed"}</span>
            </div>

            {/* Countdown Badge */}
            <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs border bg-zinc-900/60 ${countdown === 0 ? "border-yellow-500/30 text-yellow-400" : "border-zinc-800 text-zinc-400"
              }`}>
              <span className="font-mono font-semibold">
                {countdown > 0 ? `Next Tick: ${countdown}s` : "waiting..."}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-zinc-400">@{username}</span>
            <button onClick={handleLogout} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-900">
          <button
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm ${activeTab === "overview" ? "border-cyan-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("charts")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm ${activeTab === "charts" ? "border-cyan-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
          >
            Matplotlib Plots
          </button>
          <button
            onClick={() => setActiveTab("terminal")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm ${activeTab === "terminal" ? "border-cyan-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
          >
            Console Output
          </button>
        </div>

        {/* Tab Contents */}
        <div className="mt-8">
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Highlighted Market Closed Warning Banner */}
              {!marketOpen && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs md:text-sm text-red-400 flex items-center gap-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="font-medium">Market is currently closed. Real-time option data ingestion is paused; displaying historical logs.</span>
                </div>
              )}

              {/* Highlighted Live Trade Conviction Card */}
              <div className={`relative overflow-hidden rounded-2xl border p-6 md:p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 ${latestTrade?.signal.includes("BUY CE") ? "border-green-500/50 bg-green-950/20 shadow-green-500/5" :
                latestTrade?.signal.includes("BUY PE") ? "border-red-500/50 bg-red-950/20 shadow-red-500/5" :
                  latestTrade?.signal.includes("EXIT") ? "border-purple-500/50 bg-purple-950/20 shadow-purple-500/5" :
                    "border-zinc-800 bg-zinc-900/60"
                }`}>
                {/* Glowing status badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-zinc-950/80 px-3 py-1.5 text-xs border border-zinc-800">
                  <span className={`h-2 w-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500"
                    }`}></span>
                  <span className="font-mono text-zinc-400">LAST UPDATE: {latestTrade ? new Date(latestTrade.timestamp).toLocaleTimeString() : "N/A"}</span>
                </div>

                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mt-6 lg:mt-0">
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">LIVE ACTIONABLE SIGNAL</span>
                    <h2 className={`text-4xl md:text-5xl font-black tracking-tight ${latestTrade?.signal.includes("BUY CE") ? "text-green-400" :
                      latestTrade?.signal.includes("BUY PE") ? "text-red-400" :
                        latestTrade?.signal.includes("EXIT") ? "text-purple-400" :
                          "text-zinc-300"
                      }`}>
                      {latestTrade ? latestTrade.actionableSignal : "CONNECTING ENGINE..."}
                    </h2>
                    <p className="text-zinc-400 text-sm md:text-base max-w-2xl font-medium leading-relaxed">
                      {latestTrade ? latestTrade.summary : "No trades parsed. Waiting for initial live transmission."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 rounded-xl bg-zinc-950/70 p-4 border border-zinc-800/85 min-w-[280px]">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Spot Price</span>
                      <p className="text-xl font-mono font-extrabold text-white">{latestTrade ? Number(latestTrade.spotPrice).toFixed(2) : "0.00"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Sentiment</span>
                      <p className="text-xl font-extrabold text-cyan-400">{latestTrade ? latestTrade.sentiment : "WARMING UP"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500">PCR Value</span>
                      <p className="text-lg font-mono font-bold text-orange-400">{latestTrade ? latestTrade.pcr : "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Score</span>
                      <p className="text-lg font-mono font-bold text-zinc-300">{latestTrade ? Number(latestTrade.score).toFixed(2) : "0.0"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero KPI Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Spot Price & PCR */}
                <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6 backdrop-blur-xl">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Spot & PCR</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold">{latestTrade ? Number(latestTrade.spotPrice).toFixed(2) : "0.00"}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">PCR: {latestTrade ? latestTrade.pcr : "N/A"}</span>
                    <span className="text-zinc-400">Max Pain: {latestTrade ? latestTrade.maxPain : "N/A"}</span>
                  </div>
                </div>

                {/* Conviction Output */}
                <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6 backdrop-blur-xl">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sentiment Engine</span>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-cyan-400">{latestTrade ? latestTrade.sentiment : "Waiting"}</span>
                  </div>
                  <div className="mt-4 text-xs text-zinc-500">
                    Conviction Score: {latestTrade ? Number(latestTrade.score).toFixed(2) : "0.0"}
                  </div>
                </div>

                {/* Actionable Signal */}
                <div className={`rounded-xl border p-6 backdrop-blur-xl ${latestTrade?.signal.includes("BUY CE") ? "border-green-500/30 bg-green-500/5" :
                  latestTrade?.signal.includes("BUY PE") ? "border-red-500/30 bg-red-500/5" :
                    "border-zinc-900 bg-zinc-900/40"
                  }`}>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live Trade Action</span>
                  <div className="mt-2">
                    <span className={`text-3xl font-black ${latestTrade?.signal.includes("BUY CE") ? "text-green-400" :
                      latestTrade?.signal.includes("BUY PE") ? "text-red-400" :
                        "text-zinc-400"
                      }`}>
                      {latestTrade ? latestTrade.actionableSignal : "Warming Up"}
                    </span>
                  </div>
                  <div className="mt-4 text-xs text-zinc-500">
                    Indicators: {latestTrade ? latestTrade.signal : "N/A"}
                  </div>
                </div>

                {/* Support & Resistance */}
                <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6 backdrop-blur-xl">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">S/R Levels</span>
                  <div className="mt-2 flex justify-between">
                    <div>
                      <span className="text-xs text-zinc-500">Resistance</span>
                      <p className="text-lg font-bold text-red-400">{latestTrade ? latestTrade.resistance : "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Support</span>
                      <p className="text-lg font-bold text-green-400">{latestTrade ? latestTrade.support : "N/A"}</p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-zinc-900 pt-2 text-[10px] text-zinc-500">
                    ADX: {latestTrade ? latestTrade.adx : "N/A"} | RSI: {latestTrade ? latestTrade.rsi : "N/A"}
                  </div>
                </div>
              </div>

              {/* Feed History */}
              <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-4 md:p-6">
                <h3 className="text-lg font-bold tracking-tight">Time-Series Execution Feed</h3>

                {/* Desktop Table View */}
                <div className="mt-6 overflow-x-auto hidden md:block">
                  <table className="w-full border-collapse text-left text-sm text-zinc-400">
                    <thead>
                      <tr className="border-b border-zinc-900 text-xs font-semibold uppercase text-zinc-500">
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Spot</th>
                        <th className="py-3 px-4">Signal</th>
                        <th className="py-3 px-4">Conv. Score</th>
                        <th className="py-3 px-4">PCR</th>
                        <th className="py-3 px-4">RSI/ADX</th>
                        <th className="py-3 px-4">CE/PE Aggression</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {trades.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-zinc-600">No data points logged today. Waiting for cron execution...</td>
                        </tr>
                      ) : (
                        [...trades].reverse().map((t) => (
                          <tr key={t.id} className="hover:bg-zinc-900/30">
                            <td className="py-3 px-4 text-white">{new Date(t.timestamp).toLocaleTimeString()}</td>
                            <td className="py-3 px-4 font-mono font-semibold">{Number(t.spotPrice).toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <span className={`rounded px-2 py-0.5 text-xs font-bold ${t.signal.includes("BUY CE") ? "bg-green-500/10 text-green-400" :
                                t.signal.includes("BUY PE") ? "bg-red-500/10 text-red-400" :
                                  "bg-zinc-800 text-zinc-400"
                                }`}>
                                {t.signal}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono">{Number(t.score).toFixed(2)}</td>
                            <td className="py-3 px-4 font-mono">{Number(t.pcr).toFixed(2)}</td>
                            <td className="py-3 px-4 font-mono">{Number(t.rsi).toFixed(0)} / {Number(t.adx).toFixed(0)}</td>
                            <td className="py-3 px-4 font-mono text-xs">{Number(t.avgCeAggr).toFixed(2)} / {Number(t.avgPeAggr).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="mt-6 space-y-4 md:hidden">
                  {trades.length === 0 ? (
                    <p className="py-8 text-center text-zinc-600 text-sm">No data points logged today. Waiting for cron execution...</p>
                  ) : (
                    [...trades].reverse().map((t) => (
                      <div key={t.id} className="rounded-lg border border-zinc-900 bg-zinc-950/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{new Date(t.timestamp).toLocaleTimeString()}</span>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${t.signal.includes("BUY CE") ? "bg-green-500/10 text-green-400" :
                            t.signal.includes("BUY PE") ? "bg-red-500/10 text-red-400" :
                              "bg-zinc-800 text-zinc-400"
                            }`}>
                            {t.signal}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                          <div className="rounded bg-zinc-900/30 p-2 border border-zinc-900">
                            <span className="block text-[9px] uppercase font-bold text-zinc-500">Spot</span>
                            <span className="text-white font-semibold">{Number(t.spotPrice).toFixed(2)}</span>
                          </div>
                          <div className="rounded bg-zinc-900/30 p-2 border border-zinc-900">
                            <span className="block text-[9px] uppercase font-bold text-zinc-500">Score</span>
                            <span className="text-white">{Number(t.score).toFixed(2)}</span>
                          </div>
                          <div className="rounded bg-zinc-900/30 p-2 border border-zinc-900">
                            <span className="block text-[9px] uppercase font-bold text-zinc-500">PCR</span>
                            <span className="text-white">{Number(t.pcr).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-500">
                          <div>RSI/ADX: <span className="text-zinc-300">{Number(t.rsi).toFixed(0)} / {Number(t.adx).toFixed(0)}</span></div>
                          <div className="text-right">CE/PE: <span className="text-zinc-300 text-[10px]">{Number(t.avgCeAggr).toFixed(1)}/{Number(t.avgPeAggr).toFixed(1)}</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "charts" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6">
                <h4 className="text-md font-semibold text-zinc-400 mb-4">Trading Trend Plot</h4>
                <div className="aspect-[4/3] rounded bg-zinc-950 flex items-center justify-center text-zinc-600 border border-zinc-900 relative">
                  <img
                    src={`/api/charts/trading_plot?v=${latestTrade?.id || Date.now()}`}
                    alt="Live Trading Trend Chart"
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0";
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "1";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
                    <span className="text-xs text-zinc-500">Matplotlib plot loading...</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6">
                <h4 className="text-md font-semibold text-zinc-400 mb-4">Buyer Aggression Trend</h4>
                <div className="aspect-[4/3] rounded bg-zinc-950 flex items-center justify-center text-zinc-600 border border-zinc-900 relative">
                  <img
                    src={`/api/charts/aggression_plot?v=${latestTrade?.id || Date.now()}`}
                    alt="Buyer Aggression Chart"
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0";
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "1";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
                    <span className="text-xs text-zinc-500">Matplotlib plot loading...</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6 md:col-span-2">
                <h4 className="text-md font-semibold text-zinc-400 mb-4">Max Pain Trend</h4>
                <div className="w-full aspect-[21/9] rounded bg-zinc-950 flex items-center justify-center text-zinc-600 border border-zinc-900 relative">
                  <img
                    src={`/api/charts/max_pain_plot?v=${latestTrade?.id || Date.now()}`}
                    alt="Max Pain Trend Chart"
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0";
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "1";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
                    <span className="text-xs text-zinc-500">Matplotlib plot loading...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "terminal" && (
            <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-6 font-mono text-sm text-zinc-300">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3 text-zinc-500">
                <span>pulseAI Engine Terminal Output</span>
                <span className="text-xs">Live update ticks</span>
              </div>
              <pre className="mt-4 max-h-[500px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {latestTrade ? latestTrade.summary : "No cycles executed yet. Terminal warming up..."}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
