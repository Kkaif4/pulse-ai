"use client";

import React, { useState, useMemo } from "react";
import { Trade, V3VersionTrade } from "../../types";
import { InteractiveTradingChart } from "../InteractiveTradingChart";
import { InteractiveAggressionChart } from "../InteractiveAggressionChart";
import { InteractiveMaxPainChart } from "../InteractiveMaxPainChart";
import { BarChartIcon } from "../common/Icons";

interface ChartsViewProps {
  v3Trades: V3VersionTrade[];
  v2Trades: Trade[];
}

export function ChartsView({ v3Trades, v2Trades }: ChartsViewProps) {
  const [chartEngine, setChartEngine] = useState<"v3" | "v2">("v3");

  const v3ChartTrades = useMemo(() => [...v3Trades].reverse(), [v3Trades]);
  const v2ChartTrades = useMemo(() => [...v2Trades].reverse(), [v2Trades]);

  const activeTrades = chartEngine === "v3" ? v3ChartTrades : v2ChartTrades;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-2.5">
          <BarChartIcon className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white">Interactive Option Charts</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pan, zoom, and inspect spot price trends, PCR divergence, and buyer aggression
            </p>
          </div>
        </div>

        {/* Engine Switcher */}
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-900 bg-zinc-950 p-1">
          <button
            type="button"
            onClick={() => setChartEngine("v3")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              chartEngine === "v3"
                ? "bg-emerald-500 text-black shadow font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            V3 Engine (Primary)
          </button>
          <button
            type="button"
            onClick={() => setChartEngine("v2")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              chartEngine === "v2"
                ? "bg-cyan-500 text-black shadow font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            V2 Engine
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart 1: Trading Trend (Spot vs PCR) */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6">
          <h4 className="text-md font-semibold text-zinc-400 mb-4 flex items-center justify-between">
            <span>{chartEngine === "v3" ? "Trading Trend (Spot vs PCR)" : "V2 Trading Trend (Spot vs PCR)"}</span>
            <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800">
              Interactive
            </span>
          </h4>
          <div className="h-[380px] md:h-[420px] w-full rounded bg-zinc-950 p-4 border border-zinc-900 flex items-center justify-center">
            <InteractiveTradingChart trades={activeTrades} />
          </div>
        </div>

        {/* Chart 2: Buyer Aggression Trend */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6">
          <h4 className="text-md font-semibold text-zinc-400 mb-4 flex items-center justify-between">
            <span>{chartEngine === "v3" ? "Buyer Aggression Trend (CE vs PE)" : "V2 Buyer Aggression Trend (CE vs PE)"}</span>
            <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800">
              Interactive
            </span>
          </h4>
          <div className="h-[380px] md:h-[420px] w-full rounded bg-zinc-950 p-4 border border-zinc-900 flex items-center justify-center">
            <InteractiveAggressionChart trades={activeTrades} />
          </div>
        </div>

        {/* Chart 3: Max Pain Level */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-6 md:col-span-2">
          <h4 className="text-md font-semibold text-zinc-400 mb-4 flex items-center justify-between">
            <span>{chartEngine === "v3" ? "Max Pain vs Spot Price Level" : "V2 Max Pain vs Spot Price Level"}</span>
            <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800">
              Interactive
            </span>
          </h4>
          <div className="h-[380px] md:h-[420px] w-full rounded bg-zinc-950 p-4 border border-zinc-900 flex items-center justify-center">
            <InteractiveMaxPainChart trades={activeTrades} />
          </div>
        </div>
      </div>
    </div>
  );
}
