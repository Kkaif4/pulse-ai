import React from "react";
import { OldVersionTrade } from "../types";

interface V1ExecutionFeedTableProps {
  trades: OldVersionTrade[];
  onSelectTrade?: (timestamp: string) => void;
  onSelectSentiment?: (trade: OldVersionTrade) => void;
}

export function V1ExecutionFeedTable({ trades, onSelectTrade, onSelectSentiment }: V1ExecutionFeedTableProps) {
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

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold tracking-tight text-amber-400 flex items-center gap-2">
            <span>⚡ V1 Engine</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">Original v1 sentiment weights &amp; signal cooldown</p>
        </div>
        <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-400">
          v1_scripts
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
                  No V1 engine points logged yet.
                </td>
              </tr>
            ) : (
              displayTrades.map((t) => {
                const signalUpper = (t.signal || "").toUpperCase();
                const isBuyCE = signalUpper.includes("BUY CE");
                const isBuyPE = signalUpper.includes("BUY PE");

                let signalBadge = (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 font-medium text-zinc-400">
                    {t.signal || "Sideways"}
                  </span>
                );

                if (isBuyCE) {
                  signalBadge = (
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/30">
                      {t.signal}
                    </span>
                  );
                } else if (isBuyPE) {
                  signalBadge = (
                    <span className="rounded bg-rose-500/20 px-2 py-0.5 font-bold text-rose-400 border border-rose-500/30">
                      {t.signal}
                    </span>
                  );
                }

                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTrade?.(t.timestamp)}
                    className="hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono text-zinc-300">
                      {new Date(t.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-white font-medium">
                      ₹{Number(t.spotPrice).toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3">{signalBadge}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">
                      {Number(t.pcr).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSentiment?.(t);
                        }}
                        className="rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 transition-colors"
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
