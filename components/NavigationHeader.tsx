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
  activeTab:
    | "overview"
    | "charts"
    | "v3_engine"
    | "legacy_engine"
    | "history"
    | "v4_intelligence";
  setActiveTab: (
    tab:
      | "overview"
      | "charts"
      | "v3_engine"
      | "legacy_engine"
      | "history"
      | "v4_intelligence",
  ) => void;
  isWaking?: boolean;
  wakeProgress?: number;
  isManualSession?: boolean;
  onWakeBackend?: () => void;
  onDisconnectBackend?: () => void;
}

export function NavigationHeader({
  connectionStatus,
  marketOpen,
  countdown,
  username,
  onLogout,
  activeTab,
  setActiveTab,
  isWaking = false,
  wakeProgress = 0,
  isManualSession = false,
  onWakeBackend,
  onDisconnectBackend,
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
      <header className="border-b border-zinc-900 bg-zinc-900/30 px-4 py-4 sm:px-6 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
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
                    : connectionStatus === "connecting" || isWaking
                      ? "bg-amber-500 animate-ping"
                      : "bg-rose-500"
                }`}
              />
              <span className="capitalize text-zinc-400">
                {connectionStatus === "connected" && isManualSession
                  ? "Connected (Manual Session)"
                  : connectionStatus}
              </span>
            </div>

            {/* Market Status Badge */}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs border transition-all duration-300 ${
                marketOpen
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  : isManualSession
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/25"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  marketOpen
                    ? "bg-cyan-500 animate-pulse"
                    : isManualSession
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-rose-500"
                }`}
              />
              <span className="font-bold">
                {marketOpen
                  ? "Market Open"
                  : isManualSession
                    ? "Off-Hours Active"
                    : "Market Closed"}
              </span>
            </div>

            {/* Render 8 AM - 4 PM Uptime Schedule Indicator */}
            {!marketOpen && (
              <div
                title="Render Server Schedule: Server runs automatically during trading hours (8:00 AM - 4:00 PM IST, Mon-Fri). Outside this window, server sleeps to conserve Render hours."
                className="hidden md:flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-400 font-mono"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/70" />
                <span>Uptime: 8 AM - 4 PM IST</span>
              </div>
            )}

            {/* On-Demand Connect / Wake Backend Button (when disconnected or waking) */}
            {connectionStatus !== "connected" && onWakeBackend && (
              <button
                onClick={onWakeBackend}
                disabled={isWaking}
                title="Activate Render Server: Sends an HTTP wake probe to boot the container from sleep (~25-35s cold start) and creates a 30-minute active session."
                className={`flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border transition-all shadow-sm ${
                  isWaking
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300 animate-pulse cursor-wait"
                    : "border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 hover:from-cyan-500/30 hover:to-blue-500/30 hover:border-cyan-400 cursor-pointer"
                }`}
              >
                {isWaking ? (
                  <>
                    <svg
                      className="h-3 w-3 animate-spin text-amber-300"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Waking Server ({wakeProgress}s)...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm leading-none">⚡</span>
                    <span>Connect Backend</span>
                  </>
                )}
              </button>
            )}

            {/* Sleep Server Button (when in manual active session during off-hours) */}
            {connectionStatus === "connected" &&
              isManualSession &&
              !marketOpen &&
              onDisconnectBackend && (
                <button
                  onClick={onDisconnectBackend}
                  title="Disconnect & Allow Sleep: Ends the manual session so Render can spin down to conserve compute hours."
                  className="flex items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-300 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 transition-all cursor-pointer"
                >
                  <span>🌙</span>
                  <span>Sleep Server</span>
                </button>
              )}

            {/* Countdown Badge - Only displayed when market is open */}
            {marketOpen && (
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs border bg-zinc-900/60 ${
                  countdown === 0
                    ? "border-amber-500/30 text-amber-400"
                    : "border-zinc-800 text-zinc-400"
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
            <span className="text-sm font-semibold text-zinc-400">
              @{username}
            </span>
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
        <div className="flex border-b border-zinc-900 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
              activeTab === "overview"
                ? "border-cyan-500 text-white font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Multi-Engine Workspace
          </button>
          <button
            onClick={() => setActiveTab("charts")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
              activeTab === "charts"
                ? "border-cyan-500 text-white font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Interactive Charts
          </button>
          <button
            onClick={() => setActiveTab("v3_engine")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === "v3_engine"
                ? "border-emerald-500 text-emerald-400 font-bold"
                : "border-transparent text-zinc-500 hover:text-emerald-300"
            }`}
          >
            <span>V3 Engine</span>
          </button>
          <button
            onClick={() => setActiveTab("legacy_engine")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === "legacy_engine"
                ? "border-purple-500 text-purple-400 font-bold"
                : "border-transparent text-zinc-500 hover:text-purple-300"
            }`}
          >
            <span>Legacy Engine</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
              activeTab === "history"
                ? "border-cyan-500 text-white font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab("v4_intelligence")}
            className={`md:ml-auto border-b-2 px-6 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
              activeTab === "v4_intelligence"
                ? "border-amber-500 text-amber-400 font-bold"
                : "border-transparent text-zinc-500 hover:text-amber-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border border-amber-500/30">
                V4
              </span>
              Market Intelligence
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
