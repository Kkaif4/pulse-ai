"use client";

import React from "react";
import { Trade, V3VersionTrade } from "../types";
import { parseSummary, getSignalTheme, formatTime } from "../lib/trade-utils";

interface LiveEngineCardProps {
  latestTrade: Trade | V3VersionTrade | null;
  connectionStatus: string;
}

export function LiveEngineCard({ latestTrade, connectionStatus }: LiveEngineCardProps) {
  const theme = getSignalTheme(latestTrade?.signal);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 md:p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 ${theme.border} ${theme.bg} ${theme.shadow}`}
    >
      {/* Status badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-zinc-950/80 px-3 py-1.5 text-xs border border-zinc-800">
        <span className={`h-2.5 w-2.5 rounded-full ${connectionStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
        <span className="font-mono text-zinc-400">
          LAST UPDATE: {latestTrade ? formatTime(latestTrade.timestamp, true) : "N/A"}
        </span>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mt-6 lg:mt-0">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">LIVE ACTIONABLE SIGNAL</span>
          <h2 className={`text-4xl md:text-5xl font-black tracking-tight ${theme.text}`}>
            {latestTrade ? latestTrade.actionableSignal : "CONNECTING ENGINE..."}
          </h2>
          <div className={`mt-3 max-w-4xl rounded-xl border p-5 backdrop-blur-md transition-all duration-300 ${theme.subBorder} ${theme.subBg} ${theme.subText}`}>
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Engine Summary Analysis</span>
              {latestTrade ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-xs font-medium">
                  {parseSummary(latestTrade.summary).map((item, idx) => (
                    <div key={idx} className="flex justify-between border-b border-zinc-800/40 pb-1">
                      <span className="text-zinc-400 font-semibold">{item.key}</span>
                      <span className="text-white font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed font-medium">
                  No trades parsed. Waiting for initial live transmission.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
