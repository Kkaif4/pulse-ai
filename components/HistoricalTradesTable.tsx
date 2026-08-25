import React from "react";
import { Trade } from "../types";

interface HistoricalTradesTableProps {
  historyTrades: Trade[];
  setSelectedHistoryTrade: (t: Trade) => void;
  onDeleteTrade: (id: number) => void;
}

export function HistoricalTradesTable({
  historyTrades,
  setSelectedHistoryTrade,
  onDeleteTrade,
}: HistoricalTradesTableProps) {
  return (
    <div className="overflow-x-auto">
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
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {historyTrades.map((t) => (
            <tr
              key={t.id}
              className="hover:bg-zinc-900/30 align-top cursor-pointer transition-colors"
              onClick={() => setSelectedHistoryTrade(t)}
            >
              <td className="py-3 px-4 text-white font-medium whitespace-nowrap">
                {new Date(t.timestamp).toLocaleTimeString()}
              </td>
              <td className="py-3 px-4 font-mono font-semibold text-zinc-300 whitespace-nowrap">
                {Number(t.spotPrice).toFixed(2)}
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
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
              <td className="py-3 px-4 font-mono text-zinc-300">{Number(t.score).toFixed(2)}</td>
              <td className="py-3 px-4 font-mono text-zinc-300">{Number(t.pcr).toFixed(2)}</td>
              <td className="py-3 px-4 font-mono text-zinc-300">
                {Number(t.rsi).toFixed(0)} / {Number(t.adx).toFixed(0)}
              </td>
              <td className="py-3 px-4 font-mono text-xs text-zinc-400">
                {Number(t.avgCeAggr).toFixed(2)} / {Number(t.avgPeAggr).toFixed(2)}
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTrade(t.id);
                  }}
                  className="rounded bg-red-950/40 border border-red-900/60 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-900/30 transition-all duration-200"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
