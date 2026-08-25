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
        <div className="mt-4 text-xs text-zinc-500">Indicators: {latestTrade ? latestTrade.signal : "N/A"}</div>
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
  );
}
