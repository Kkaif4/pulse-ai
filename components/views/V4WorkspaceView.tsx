"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { V4Trade, OrderBlockZone, LiquiditySweep } from "@/types";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  ClockIcon,
  CalendarIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  ShieldIcon,
  TargetIcon,
} from "../common/Icons";

export function V4WorkspaceView() {
  const [trades, setTrades] = useState<V4Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("2026-10-12");
  const [signalFilter, setSignalFilter] = useState<"ALL" | "ACTIONABLE" | "BUY_CE" | "BUY_PE">("ALL");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<V4Trade | null>(null);

  const fetchV4Data = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      setError(null);
      const data = await api.trades.getV4All({
        date: selectedDate,
        limit: 150,
      });
      const list = Array.isArray(data) ? data : [];
      setTrades(list);
      if (list.length > 0 && !selectedTrade) {
        setSelectedTrade(list[0]);
      }
    } catch (err: any) {
      console.error("Failed to fetch V4 data:", err);
      const isAuthError = err?.response?.status === 401 || err?.response?.status === 403;
      setError(
        isAuthError
          ? "Session expired or unauthorized (403). Please sign in again."
          : err?.response?.data?.message || err?.response?.data?.error || err.message || "Failed to load V4 data"
      );
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchV4Data();
  }, [fetchV4Data]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchV4Data();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchV4Data]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const sig = (t.signal || "").toUpperCase();
      if (signalFilter === "ACTIONABLE") {
        return sig === "BUY CE" || sig === "BUY PE";
      }
      if (signalFilter === "BUY_CE") return sig === "BUY CE";
      if (signalFilter === "BUY_PE") return sig === "BUY PE";
      return true;
    });
  }, [trades, signalFilter]);

  const latestTrade = trades[0] || null;

  // Active Order Blocks from latest trade or accumulated
  const activeOrderBlocks: OrderBlockZone[] = useMemo(() => {
    if (latestTrade?.activeOBs && Array.isArray(latestTrade.activeOBs)) {
      return latestTrade.activeOBs;
    }
    // Fallback scan recent trades
    for (const t of trades) {
      if (t.activeOBs && Array.isArray(t.activeOBs) && t.activeOBs.length > 0) {
        return t.activeOBs;
      }
    }
    return [];
  }, [latestTrade, trades]);

  // Recent Sweeps from latest trade or accumulated
  const recentSweeps: LiquiditySweep[] = useMemo(() => {
    if (latestTrade?.recentSweeps && Array.isArray(latestTrade.recentSweeps)) {
      return latestTrade.recentSweeps;
    }
    for (const t of trades) {
      if (t.recentSweeps && Array.isArray(t.recentSweeps) && t.recentSweeps.length > 0) {
        return t.recentSweeps;
      }
    }
    return [];
  }, [latestTrade, trades]);

  const getSignalBadgeStyle = (sig: string) => {
    const s = (sig || "").toUpperCase();
    if (s.includes("BUY CE")) {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
    if (s.includes("BUY PE")) {
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    }
    if (s.includes("EXIT")) {
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    }
    return "bg-zinc-800 text-zinc-400 border-zinc-700/60";
  };

  const getRegimeBadgeStyle = (regime: string) => {
    const r = (regime || "").toUpperCase();
    if (r.includes("BULL")) return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    if (r.includes("BEAR")) return "bg-rose-500/10 text-rose-300 border-rose-500/20";
    if (r.includes("CHOPPY") || r.includes("RANGE")) return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    if (r.includes("VOLATILE") || r.includes("EXPANSION")) return "bg-purple-500/10 text-purple-300 border-purple-500/20";
    return "bg-zinc-800 text-zinc-300 border-zinc-700";
  };

  const formatIST = (isoString?: string) => {
    if (!isoString) return "--:--:--";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <span className="text-xl font-black">⚡</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                V4 Market Intelligence Engine
              </h2>
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Active Zone
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              OrderBlock boundaries, liquidity sweeps, market regimes & strict 1:2 R:R options signals.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none cursor-pointer text-xs"
            />
          </div>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
            title="Auto-refresh every 10 seconds"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autoRefresh ? "bg-amber-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            Auto
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchV4Data(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition disabled:opacity-50"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 2. KPI / Live Signal Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Spot Price */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Current Spot</span>
            <ActivityIcon className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            ₹{latestTrade ? Number(latestTrade.spotPrice).toFixed(2) : "--"}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            <span>{formatIST(latestTrade?.timestamp)} IST</span>
          </div>
        </div>

        {/* Latest Signal */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Latest V4 Signal</span>
            <TargetIcon className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-bold border tracking-wider ${
                latestTrade ? getSignalBadgeStyle(latestTrade.signal) : "text-zinc-500"
              }`}
            >
              {latestTrade?.signal || "NO SIGNAL"}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 truncate" title={latestTrade?.reason || ""}>
            {latestTrade?.reason || "Waiting for cycle"}
          </div>
        </div>

        {/* Current Regime */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Market Regime</span>
            <ShieldIcon className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                latestTrade ? getRegimeBadgeStyle(latestTrade.regime) : "text-zinc-500"
              }`}
            >
              {latestTrade?.regime || "UNKNOWN"}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Multi-timeframe structure</div>
        </div>

        {/* Active Order Blocks */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Active Order Blocks</span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              OB Zones
            </span>
          </div>
          <div className="text-xl font-bold text-amber-400">
            {activeOrderBlocks.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {activeOrderBlocks.filter((ob) => ob.status === "untested").length} untested zones
          </div>
        </div>

        {/* Liquidity Sweeps */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Liquidity Sweeps</span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
              Sweeps
            </span>
          </div>
          <div className="text-xl font-bold text-purple-400">
            {recentSweeps.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {recentSweeps.filter((s) => s.reversalConfirmed).length} confirmed reversals
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          {(error.includes("expired") || error.includes("unauthorized") || error.includes("403")) && (
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("pulse_token");
                  localStorage.removeItem("pulse_username");
                  window.dispatchEvent(
                    new CustomEvent("pulse_auth_expired", {
                      detail: { message: "Please log in again." },
                    })
                  );
                }
              }}
              className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 font-medium transition cursor-pointer"
            >
              Log In Again
            </button>
          )}
        </div>
      )}

      {/* 3. Main Split View: Signals Table + Order Block & Sweeps Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): V4 Signals Chronological Table */}
        <div className="lg:col-span-2 rounded-xl bg-zinc-900/70 border border-zinc-800/80 shadow-md overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/90">
            <div>
              <h3 className="font-semibold text-white text-sm">V4 Signal Stream</h3>
              <p className="text-xs text-zinc-400">
                Chronological order of market intelligence cycles ({filteredTrades.length} records)
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setSignalFilter("ALL")}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  signalFilter === "ALL"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSignalFilter("ACTIONABLE")}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  signalFilter === "ACTIONABLE"
                    ? "bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Actionable
              </button>
              <button
                onClick={() => setSignalFilter("BUY_CE")}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  signalFilter === "BUY_CE"
                    ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                BUY CE
              </button>
              <button
                onClick={() => setSignalFilter("BUY_PE")}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  signalFilter === "BUY_PE"
                    ? "bg-rose-500/20 text-rose-300 shadow-sm border border-rose-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                BUY PE
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto divide-y divide-zinc-800/60">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                <RefreshCwIcon className="w-6 h-6 animate-spin mb-2 text-amber-500" />
                <span className="text-xs">Loading V4 records...</span>
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 text-xs">
                No V4 records found for {selectedDate}. Try selecting another date (e.g. 2026-10-12, 2026-10-11, etc.).
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-950/70 text-zinc-400 sticky top-0 z-10 text-[11px] uppercase tracking-wider backdrop-blur">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Time (IST)</th>
                    <th className="py-3 px-4 font-semibold">Spot Price</th>
                    <th className="py-3 px-4 font-semibold">Signal</th>
                    <th className="py-3 px-4 font-semibold">Regime</th>
                    <th className="py-3 px-4 font-semibold">SL / TP</th>
                    <th className="py-3 px-4 font-semibold">Reasoning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {filteredTrades.map((trade) => {
                    const isSelected = selectedTrade?.id === trade.id;
                    const hasAction =
                      trade.signal === "BUY CE" || trade.signal === "BUY PE";

                    return (
                      <tr
                        key={String(trade.id)}
                        onClick={() => setSelectedTrade(trade)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-amber-500/10 hover:bg-amber-500/15"
                            : "hover:bg-zinc-800/50"
                        } ${hasAction ? "font-medium" : ""}`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap text-zinc-300 font-mono">
                          {formatIST(trade.timestamp)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-white">
                          ₹{Number(trade.spotPrice).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border tracking-wider ${getSignalBadgeStyle(
                              trade.signal
                            )}`}
                          >
                            {trade.signal}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getRegimeBadgeStyle(
                              trade.regime
                            )}`}
                          >
                            {trade.regime}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-[11px] font-mono">
                          {trade.stopLoss && trade.takeProfit ? (
                            <div className="flex flex-col text-[10px]">
                              <span className="text-rose-400">
                                SL: ₹{Number(trade.stopLoss).toFixed(1)}
                              </span>
                              <span className="text-emerald-400">
                                TP: ₹{Number(trade.takeProfit).toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-500">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-zinc-400 text-[11px]" title={trade.reason || ""}>
                          {trade.reason || "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Active Order Blocks & Sweeps Details */}
        <div className="space-y-6">
          {/* Active Order Blocks Panel */}
          <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 shadow-md p-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">⚡</span>
                <h4 className="font-semibold text-white text-sm">Active Order Blocks</h4>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                {activeOrderBlocks.length} Zones
              </span>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {activeOrderBlocks.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No active Order Block zones detected.
                </div>
              ) : (
                activeOrderBlocks.map((ob, idx) => {
                  const isBullish = ob.direction === "bullish";
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs transition ${
                        isBullish
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                          : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1 uppercase tracking-wider text-[11px]">
                          {isBullish ? (
                            <TrendingUpIcon className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <TrendingDownIcon className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          {ob.direction} OB
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                            ob.status === "untested"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {ob.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-zinc-300 font-mono text-[11px]">
                        <span>
                          Zone: ₹{ob.bottom.toFixed(1)} – ₹{ob.top.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Touches: {ob.touchCount}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-400 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3 text-zinc-500" />
                        <span>Formed: {formatIST(ob.formedAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Liquidity Sweeps Panel */}
          <div className="rounded-xl bg-zinc-900/70 border border-zinc-800/80 shadow-md p-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-purple-400 font-bold">🌊</span>
                <h4 className="font-semibold text-white text-sm">Liquidity Sweeps</h4>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                {recentSweeps.length} Swept
              </span>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {recentSweeps.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No liquidity sweeps recorded in current cycle.
                </div>
              ) : (
                recentSweeps.map((sweep, idx) => {
                  const isHighSweep = sweep.type === "high_sweep";
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-purple-500/25 bg-purple-950/15 text-xs text-purple-200"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="uppercase text-[11px] tracking-wide text-purple-300">
                          {isHighSweep ? "High Sweep" : "Low Sweep"}
                        </span>
                        {sweep.reversalConfirmed ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Reversal Confirmed
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-zinc-300 font-mono text-[11px]">
                        <span>Level: ₹{Number(sweep.level).toFixed(2)}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-400 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3 text-zinc-500" />
                        <span>Swept: {formatIST(sweep.sweptAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
