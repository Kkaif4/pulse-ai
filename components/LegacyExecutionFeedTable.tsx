"use client";

import React, { useMemo } from "react";
import { LayersIcon } from "./common/Icons";
import { LegacyTrade } from "../types";
import { getSignalTheme, formatTime } from "../lib/trade-utils";

interface LegacyExecutionFeedTableProps {
  trades: LegacyTrade[];
  onSelectTrade?: (timestamp: string) => void;
  onSelectSentiment?: (trade: LegacyTrade) => void;
}

export function LegacyExecutionFeedTable({
  trades,
  onSelectTrade,
  onSelectSentiment,
}: LegacyExecutionFeedTableProps) {
  const displayTrades = useMemo(() => {
    const today = new Date();
    const todaysTrades = trades.filter((t) => {
      const tradeDate = new Date(t.timestamp);
      return (
        tradeDate.getDate() === today.getDate() &&
        tradeDate.getMonth() === today.getMonth() &&
        tradeDate.getFullYear() === today.getFullYear()
      );
    });
    return todaysTrades.length > 0 ? todaysTrades : trades;
  }, [trades]);

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold tracking-tight text-purple-400 flex items-center gap-2">
            <LayersIcon className="w-4 h-4 text-purple-400" />
            <span>Legacy Engine</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">Classic rule-based PCR &amp; OI heuristic engine</p>
        </div>
        <span className="rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-mono font-bold text-purple-400">
          legacy_code
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-zinc-400">
          <thead>
            <tr className="border-b border-zinc-800 text-[11px] font-semibold uppercase text-zinc-500">
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Spot</th>
              <th className="py-2 px-3">Signal</th>
              <th className="py-2 px-3">PCR</th>
              <th className="py-2 px-3">Sentiment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/50">
            {displayTrades.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-zinc-600">
                  No Legacy engine points logged yet.
                </td>
              </tr>
            ) : (
              displayTrades.map((t) => {
                const theme = getSignalTheme(t.signal);

                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTrade?.(t.timestamp)}
                    className="hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono text-zinc-300 whitespace-nowrap">
                      {formatTime(t.timestamp, true)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-white font-bold whitespace-nowrap">
                      ₹{Number(t.spotPrice).toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`rounded px-2 py-0.5 font-bold text-xs ${theme.badge}`}>
                        {t.signal || "Sideways"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-200">{Number(t.pcr).toFixed(2)}</td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSentiment?.(t);
                        }}
                        className="rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-300 transition-colors"
                      >
                        {t.sentiment || "Sideways"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
