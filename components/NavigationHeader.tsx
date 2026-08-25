import React from "react";
import { Trade } from "../types";

interface NavigationHeaderProps {
  connectionStatus: string;
  marketOpen: boolean;
  countdown: number;
  username: string;
  onLogout: () => void;
  activeTab: "overview" | "charts" | "v1_engine" | "history";
  setActiveTab: (tab: "overview" | "charts" | "v1_engine" | "history") => void;
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
  return (
    <>
      <header className="border-b border-zinc-900 bg-zinc-900/30 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-black tracking-tight text-transparent">
              pulseAI
            </h1>
            <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-xs">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-500 animate-pulse"
                    : connectionStatus === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              />
              <span className="capitalize text-zinc-400">{connectionStatus}</span>
            </div>

            {/* Market Status Badge */}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs border transition-all duration-300 ${
                marketOpen
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/25 animate-pulse"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${marketOpen ? "bg-cyan-500 animate-pulse" : "bg-red-500"}`} />
              <span className="font-bold">{marketOpen ? "Market Open" : "Market Closed"}</span>
            </div>

            {/* Countdown Badge */}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs border bg-zinc-900/60 ${
                countdown === 0 ? "border-yellow-500/30 text-yellow-400" : "border-zinc-800 text-zinc-400"
              }`}
            >
              <span className="font-mono font-semibold">
                {countdown > 0 ? `Next Tick: ${countdown}s` : "waiting..."}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-zinc-400">@{username}</span>
            <button
              onClick={onLogout}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex border-b border-zinc-900">
          <button
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm ${
              activeTab === "overview" ? "border-cyan-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("charts")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm ${
              activeTab === "charts" ? "border-cyan-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Interactive Charts
          </button>
          <button
            onClick={() => setActiveTab("v1_engine")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm flex items-center gap-2 ${
              activeTab === "v1_engine" ? "border-amber-500 text-amber-400 font-bold" : "border-transparent text-zinc-500 hover:text-amber-300"
            }`}
          >
            <span>V1 Engine (Legacy)</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`border-b-2 px-6 py-3 font-semibold text-sm ${
              activeTab === "history" ? "border-cyan-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            History
          </button>
        </div>
      </main>
    </>
  );
}
