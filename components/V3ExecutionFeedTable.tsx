"use client";

import React, { useMemo } from "react";
import { ActivityIcon } from "./common/Icons";
import { V3VersionTrade } from "../types";
import { getSignalTheme, formatTime } from "../lib/trade-utils";

interface V3ExecutionFeedTableProps {
  trades: V3VersionTrade[];
  onSelectTrade?: (timestamp: string) => void;
  onSelectSentiment?: (trade: V3VersionTrade) => void;
}

export function V3ExecutionFeedTable({ trades, onSelectTrade, onSelectSentiment }: V3ExecutionFeedTableProps) {
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
          <h3 className="text-base font-bold tracking-tight text-emerald-400 flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 text-emerald-400" />
            <span>V3 Engine (Primary)</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">V3 adaptive risk, VIX regime gating, Greeks &amp; trailing stops</p>
        </div>
        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
          v3_engine
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-zinc-400">
          <thead>
            <tr className="border-b border-zinc-800 text-[11px] font-semibold uppercase text-zinc-500">
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Spot</th>
              <th className="py-2 px-3">VIX</th>
              <th className="py-2 px-3">Signal</th>
              <th className="py-2 px-3">Score</th>
              <th className="py-2 px-3">PCR</th>
              <th className="py-2 px-3">Sentiment</th>
              <th className="py-2 px-3">Greeks (CE/PE Δ)</th>
              <th className="py-2 px-3">Depth Imbalance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/50">
            {displayTrades.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-zinc-600">
                  No V3 engine points logged yet.
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
                    <td className="py-2.5 px-3 font-mono text-amber-300">
                      {t.indiaVix ? Number(t.indiaVix).toFixed(2) : "N/A"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`rounded px-2 py-0.5 font-bold text-xs ${theme.badge}`}>
                        {t.signal || "Sideways"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-200">
                      {t.score ? Number(t.score).toFixed(2) : "0"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-200">{Number(t.pcr).toFixed(2)}</td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSentiment?.(t);
                        }}
                        className="rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 transition-colors"
                      >
                        {t.sentiment || "Sideways"}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-purple-300">
                      {t.ceDelta !== undefined && t.peDelta !== undefined
                        ? `${t.ceDelta.toFixed(2)} / ${t.peDelta.toFixed(2)}`
                        : "N/A"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">
                      {t.depthImbalance !== undefined
                        ? `${(t.depthImbalance * 100).toFixed(1)}%`
                        : "N/A"}
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
