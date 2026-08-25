import React, { useState } from "react";
import { OldVersionTrade } from "../types";
import { InteractiveTradingChart } from "./InteractiveTradingChart";
import { InteractiveMaxPainChart } from "./InteractiveMaxPainChart";

interface V1ExecutionFeedTableProps {
  trades: OldVersionTrade[];
}

export function V1ExecutionFeedTable({ trades }: V1ExecutionFeedTableProps) {
  const [showCharts, setShowCharts] = useState(true);

  const todaysTrades = trades.filter((t) => {
    const tradeDate = new Date(t.timestamp);
    const today = new Date();
    return (
      tradeDate.getDate() === today.getDate() &&
      tradeDate.getMonth() === today.getMonth() &&
      tradeDate.getFullYear() === today.getFullYear()
    );
  });

  const displayTrades = todaysTrades.length > 0 ? todaysTrades : trades;

  // Ascending order for charts (time left-to-right)
  const v1ChartTrades = [...displayTrades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="space-y-6">
      {/* V1 Execution Feed Table */}
      <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-amber-400 flex items-center gap-2">
              <span>⚡ V1 Legacy Engine Execution Feed</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Original v1 algorithm signal generation using raw sentiment weights
            </p>
          </div>
          <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
            v1_scripts
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="mt-6 overflow-x-auto hidden md:block">
          <table className="w-full border-collapse text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-zinc-900 text-xs font-semibold uppercase text-zinc-500">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Spot</th>
                <th className="py-3 px-4">Signal</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">PCR</th>
                <th className="py-3 px-4">Sentiment</th>
                <th className="py-3 px-4">Trend (Spot/EMA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {displayTrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-600">
                    No V1 data points logged. Waiting for cron execution...
                  </td>
                </tr>
              ) : (
                displayTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-900/30">
                    <td className="py-3 px-4 text-white font-mono">{new Date(t.timestamp).toLocaleTimeString()}</td>
                    <td className="py-3 px-4 font-mono font-semibold">{Number(t.spotPrice).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${t.signal.includes("BUY CE")
                            ? "bg-green-500/10 text-green-400"
                            : t.signal.includes("BUY PE")
                              ? "bg-red-500/10 text-red-400"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                      >
                        {t.signal}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{Number(t.score).toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{Number(t.pcr).toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-300">{t.sentiment || "N/A"}</td>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-400">
                      {t.spotTrend || "N/A"} / {t.emaTrend || "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="mt-6 space-y-4 md:hidden">
          {displayTrades.length === 0 ? (
            <p className="py-8 text-center text-zinc-600 text-sm">
              No V1 data points logged. Waiting for cron execution...
            </p>
          ) : (
            displayTrades.map((t) => (
              <div key={t.id} className="rounded-lg border border-zinc-900 bg-zinc-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{new Date(t.timestamp).toLocaleTimeString()}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${t.signal.includes("BUY CE")
                        ? "bg-green-500/10 text-green-400"
                        : t.signal.includes("BUY PE")
                          ? "bg-red-500/10 text-red-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                  >
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
