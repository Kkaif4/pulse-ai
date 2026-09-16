"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { api } from "../lib/api";
import { CheckCircleIcon, CheckIcon } from "./common/Icons";

interface NavigationHeaderProps {
  connectionStatus: string;
  marketOpen: boolean;
  countdown: number;
  username: string;
  onLogout: () => void;
  activeTab: "overview" | "charts" | "v3_engine" | "legacy_engine" | "history";
  setActiveTab: (tab: "overview" | "charts" | "v3_engine" | "legacy_engine" | "history") => void;
}

export function NavigationHeader({
  connectionStatus,
  marketOpen,
  countdown,
  username,
  onLogout,
  activeTab,
  setActiveTab,
}: NavigationHeaderProps) {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchBufferStatus = useCallback(async () => {
    try {
      const data = await api.trades.getBufferStatus();
      if (typeof data.pendingQueueCount === "number") {
        setPendingCount(data.pendingQueueCount);
      }
    } catch {
      // Ignore background status polling errors
    }
  }, []);

  useEffect(() => {
    fetchBufferStatus();
    const interval = setInterval(fetchBufferStatus, 20000);
    return () => clearInterval(interval);
  }, [fetchBufferStatus]);

  useEffect(() => {
    if (countdown === 59 || countdown === 0) {
      fetchBufferStatus();
    }
  }, [countdown, fetchBufferStatus]);

  const handleManualFlush = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback("syncing");

    try {
      await api.trades.flushBuffer();
      setPendingCount(0);
      setSyncFeedback("synced");
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch {
      setSyncFeedback("failed");
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <header className="border-b border-zinc-900 bg-zinc-900/30 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Image
                src="/favicon-32x32.png"
                alt="pulseAI logo"
                width={32}
                height={32}
                className="rounded-lg shadow-md border border-zinc-800"
                priority
              />
              <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-black tracking-tight text-transparent">
                pulseAI
              </h1>
            </div>

            {/* Connection Status Badge */}
            <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-xs">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : connectionStatus === "connecting"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
              />
              <span className="capitalize text-zinc-400">{connectionStatus}</span>
            </div>

            {/* Market Status Badge */}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs border transition-all duration-300 ${
                marketOpen
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${marketOpen ? "bg-cyan-500 animate-pulse" : "bg-rose-500"}`} />
              <span className="font-bold">{marketOpen ? "Market Open" : "Market Closed"}</span>
            </div>

            {/* Countdown Badge - Only displayed when market is open */}
            {marketOpen && (
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs border bg-zinc-900/60 ${
                  countdown === 0 ? "border-amber-500/30 text-amber-400" : "border-zinc-800 text-zinc-400"
                }`}
              >
                <span className="font-mono font-semibold">
                  {countdown > 0 ? `Next Tick: ${countdown}s` : "waiting..."}
                </span>
              </div>
            )}

            {/* High-Performance Buffer & Sync Indicator */}
            {connectionStatus === "connected" && (
              <button
                onClick={handleManualFlush}
                disabled={isSyncing}
                title="Database Buffer Status: PulseAI buffers minute ticks to reduce DB calls by 95%. Click to force an immediate batch sync to PostgreSQL."
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-mono border transition-all ${
                  isSyncing
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 animate-pulse cursor-wait"
                    : syncFeedback === "synced"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : pendingCount && pendingCount > 0
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 cursor-pointer"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 cursor-pointer"
                }`}
              >
                {isSyncing ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Syncing...</span>
                  </>
                ) : syncFeedback === "synced" ? (
                  <>
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Database Synced</span>
                  </>
                ) : pendingCount && pendingCount > 0 ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Buffer: {pendingCount} Pending</span>
                    <span className="text-[10px] bg-amber-400/20 px-1.5 py-0.5 rounded font-bold text-amber-300">
                      Sync
                    </span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-3 h-3 text-emerald-400" />
                    <span>DB Synced</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-zinc-400">@{username}</span>
            <button
              onClick={onLogout}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6">
        <div className="flex border-b border-zinc-900 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
              activeTab === "overview" ? "border-cyan-500 text-white font-bold" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Multi-Engine Workspace
          </button>
          <button
            onClick={() => setActiveTab("charts")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
              activeTab === "charts" ? "border-cyan-500 text-white font-bold" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Interactive Charts
          </button>
          <button
            onClick={() => setActiveTab("v3_engine")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === "v3_engine" ? "border-emerald-500 text-emerald-400 font-bold" : "border-transparent text-zinc-500 hover:text-emerald-300"
            }`}
          >
            <span>V3 Engine</span>
          </button>
          <button
            onClick={() => setActiveTab("legacy_engine")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === "legacy_engine" ? "border-purple-500 text-purple-400 font-bold" : "border-transparent text-zinc-500 hover:text-purple-300"
            }`}
          >
            <span>Legacy Engine</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
              activeTab === "history" ? "border-cyan-500 text-white font-bold" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            History
          </button>
        </div>
      </div>
    </>
  );
}
