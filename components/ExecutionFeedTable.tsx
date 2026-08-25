import React, { useState } from "react";
import { Trade, OldVersionTrade } from "../types";
import { CompareMetricsModal } from "./CompareMetricsModal";

interface ExecutionFeedTableProps {
  trades: Trade[];
  v1Trades?: OldVersionTrade[];
}

export function ExecutionFeedTable({ trades, v1Trades = [] }: ExecutionFeedTableProps) {
  const [selectedCompareTrade, setSelectedCompareTrade] = useState<Trade | null>(null);
  const [selectedV1Trade, setSelectedV1Trade] = useState<OldVersionTrade | null>(null);

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

  // Match V1 trade by closest timestamp (within 2 minute window)
  const findMatchingV1Trade = (v2Trade: Trade): OldVersionTrade | null => {
    if (!v1Trades || v1Trades.length === 0) return null;
    const v2Time = new Date(v2Trade.timestamp).getTime();

    let bestMatch: OldVersionTrade | null = null;
    let minDiff = Infinity;

    for (const v1 of v1Trades) {
      const v1Time = new Date(v1.timestamp).getTime();
      const diff = Math.abs(v2Time - v1Time);
      if (diff < minDiff && diff <= 120000) { // 2 minutes tolerance
        minDiff = diff;
        bestMatch = v1;
      }
    }
    return bestMatch;
  };

  const handleOpenCompare = (t: Trade) => {
    const matchedV1 = findMatchingV1Trade(t);
    setSelectedCompareTrade(t);
    setSelectedV1Trade(matchedV1);
  };

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
              <th className="py-3 px-4">V2 Signal</th>
              <th className="py-3 px-4">V1 vs V2 Comparison</th>
              <th className="py-3 px-4">Conv. Score</th>
              <th className="py-3 px-4">PCR</th>
              <th className="py-3 px-4">CE/PE Aggression</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {displayTrades.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-600">
                  No data points logged. Waiting for cron execution...
                </td>
              </tr>
            ) : (
              displayTrades.map((t) => {
                const matchedV1 = findMatchingV1Trade(t);
                const isMatch = matchedV1 && matchedV1.signal === t.signal;

                return (
                  <tr key={t.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-3 px-4 text-white font-mono">{new Date(t.timestamp).toLocaleTimeString()}</td>
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
                    <td className="py-3 px-4">
                      {matchedV1 ? (
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold font-mono ${
                            isMatch
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                          }`}
                        >
                          {isMatch ? "🟢 MATCH" : `MISMATCH (V1: ${matchedV1.signal})`}
                        </span>
                      ) : (
                        <span className="rounded px-2 py-0.5 text-[11px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          ⚠️ MISSING V1 DATA
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">{Number(t.score).toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono">{Number(t.pcr).toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {Number(t.avgCeAggr).toFixed(2)} / {Number(t.avgPeAggr).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenCompare(t)}
                        className="rounded border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1 text-xs font-semibold text-cyan-400 hover:bg-cyan-900/40 hover:text-cyan-200 transition-all duration-200"
                      >
                        Compare Variables
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="mt-6 space-y-4 md:hidden">
        {displayTrades.length === 0 ? (
          <p className="py-8 text-center text-zinc-600 text-sm">
            No data points logged. Waiting for cron execution...
          </p>
        ) : (
          displayTrades.map((t) => {
            const matchedV1 = findMatchingV1Trade(t);
            const isMatch = matchedV1 && matchedV1.signal === t.signal;

            return (
              <div key={t.id} className="rounded-lg border border-zinc-900 bg-zinc-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{new Date(t.timestamp).toLocaleTimeString()}</span>
                  <div className="flex items-center gap-2">
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
                    {matchedV1 && (
                      <span
                        className={`rounded px-2 py-0.5 text-[9px] font-bold ${
                          isMatch ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"
                        }`}
                      >
                        {isMatch ? "MATCH" : "MISMATCH"}
                      </span>
                    )}
                  </div>
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
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleOpenCompare(t)}
                    className="rounded border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 text-xs font-semibold text-cyan-400 hover:bg-cyan-900/40"
                  >
                    Compare Variables
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compare Metrics Modal */}
      {selectedCompareTrade && (
        <CompareMetricsModal
          v2Trade={selectedCompareTrade}
          v1Trade={selectedV1Trade}
          onClose={() => {
            setSelectedCompareTrade(null);
            setSelectedV1Trade(null);
          }}
        />
      )}
    </div>
  );
}
