import React from "react";
import { Trade } from "../types";

interface ExecutionFeedTableProps {
  trades: Trade[];
}

export function ExecutionFeedTable({ trades }: ExecutionFeedTableProps) {
  const todaysTrades = trades.filter((t) => {
    const tradeDate = new Date(t.timestamp);
    const today = new Date();
    return (
      tradeDate.getDate() === today.getDate() &&
      tradeDate.getMonth() === today.getMonth() &&
      tradeDate.getFullYear() === today.getFullYear()
    );
  });

  return (
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
            {todaysTrades.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-600">
                  No data points logged today. Waiting for cron execution...
                </td>
              </tr>
            ) : (
              todaysTrades.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-900/30">
                  <td className="py-3 px-4 text-white">{new Date(t.timestamp).toLocaleTimeString()}</td>
                  <td className="py-3 px-4 font-mono font-semibold">{Number(t.spotPrice).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        t.signal.includes("BUY CE")
                          ? "bg-green-500/10 text-green-400"
                          : t.signal.includes("BUY PE")
                          ? "bg-red-500/10 text-red-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {t.signal}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">{Number(t.score).toFixed(2)}</td>
                  <td className="py-3 px-4 font-mono">{Number(t.pcr).toFixed(2)}</td>
                  <td className="py-3 px-4 font-mono">
                    {Number(t.rsi).toFixed(0)} / {Number(t.adx).toFixed(0)}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    {Number(t.avgCeAggr).toFixed(2)} / {Number(t.avgPeAggr).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="mt-6 space-y-4 md:hidden">
        {todaysTrades.length === 0 ? (
          <p className="py-8 text-center text-zinc-600 text-sm">
            No data points logged today. Waiting for cron execution...
          </p>
        ) : (
          todaysTrades.map((t) => (
            <div key={t.id} className="rounded-lg border border-zinc-900 bg-zinc-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{new Date(t.timestamp).toLocaleTimeString()}</span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    t.signal.includes("BUY CE")
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
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-500">
                <div>
                  RSI/ADX:{" "}
                  <span className="text-zinc-300">
                    {Number(t.rsi).toFixed(0)} / {Number(t.adx).toFixed(0)}
                  </span>
                </div>
                <div className="text-right">
                  CE/PE:{" "}
                  <span className="text-zinc-300 text-[10px]">
                    {Number(t.avgCeAggr).toFixed(1)}/{Number(t.avgPeAggr).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
