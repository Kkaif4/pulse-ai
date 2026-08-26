import React from "react";
import { Trade } from "../types";

interface KPIStatsCardsProps {
  latestTrade: Trade | null;
}

export function KPIStatsCards({ latestTrade }: KPIStatsCardsProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Spot Price & PCR */}
      <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6 backdrop-blur-xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Spot & PCR</span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold">{latestTrade ? Number(latestTrade.spotPrice).toFixed(2) : "0.00"}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1 text-[13px] text-zinc-400 border-t border-zinc-900 pt-3">
          <div><span className="text-zinc-500 font-semibold">PCR:</span> <span className="font-mono text-white font-bold">{latestTrade ? latestTrade.pcr : "N/A"}</span></div>
          <div><span className="text-zinc-500 font-semibold">Pain:</span> <span className="font-mono text-white font-bold">{latestTrade ? latestTrade.maxPain : "N/A"}</span></div>
          <div><span className="text-zinc-500 font-semibold">Score:</span> <span className="font-mono text-white font-bold">{latestTrade ? Number(latestTrade.score).toFixed(2) : "0.0"}</span></div>
        </div>
      </div>

      {/* Conviction Output */}
      <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6 backdrop-blur-xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sentiment Engine</span>
        <div className="mt-2">
          <span className="text-3xl font-extrabold text-cyan-400">{latestTrade ? latestTrade.sentiment : "Waiting"}</span>
        </div>
        <div className="mt-4 text-[13px] text-zinc-400 border-t border-zinc-900 pt-3">
          <span className="text-zinc-500 font-semibold">Conviction Score:</span> <span className="font-mono text-white font-bold">{latestTrade ? Number(latestTrade.score).toFixed(2) : "0.0"}</span>
        </div>
      </div>

      {/* Actionable Signal */}
      <div
        className={`rounded-xl border p-6 backdrop-blur-xl ${
          latestTrade?.signal.includes("BUY CE")
            ? "border-green-500/30 bg-green-500/5"
            : latestTrade?.signal.includes("BUY PE")
            ? "border-red-500/30 bg-red-500/5"
            : "border-zinc-900 bg-zinc-900/40"
        }`}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live Trade Action</span>
        <div className="mt-2">
          <span
            className={`text-3xl font-black ${
              latestTrade?.signal.includes("BUY CE")
                ? "text-green-400"
                : latestTrade?.signal.includes("BUY PE")
                ? "text-red-400"
                : "text-zinc-400"
            }`}
          >
            {latestTrade ? latestTrade.actionableSignal : "Warming Up"}
          </span>
        </div>
        <div className="mt-4 text-[13px] text-zinc-450 border-t border-zinc-900 pt-3 truncate" title={latestTrade ? latestTrade.signal : "N/A"}>
          <span className="text-zinc-500 font-semibold">Indicators:</span> <span className="text-zinc-300 font-medium">{latestTrade ? latestTrade.signal : "N/A"}</span>
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
        <div className="mt-3 border-t border-zinc-900 pt-3 text-[12px] text-zinc-400">
          <span className="text-zinc-500 font-semibold">ADX:</span> <span className="font-mono text-zinc-300 font-bold mr-3">{latestTrade ? latestTrade.adx : "N/A"}</span>
          <span className="text-zinc-500 font-semibold">RSI:</span> <span className="font-mono text-zinc-300 font-bold">{latestTrade ? latestTrade.rsi : "N/A"}</span>
        </div>
      </div>
    </div>
  );
}
