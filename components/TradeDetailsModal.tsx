import React from "react";
import { Trade } from "../types";
import { parseSummary } from "./parseSummary";

interface TradeDetailsModalProps {
  trade: Trade;
  onClose: () => void;
  onDelete: (id: number) => void;
}

export function TradeDetailsModal({ trade, onClose, onDelete }: TradeDetailsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 md:p-8 shadow-2xl backdrop-blur-xl relative transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <button
            onClick={() => onDelete(trade.id)}
            className="rounded-lg bg-red-950/40 border border-red-900/60 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/30 transition-all duration-200"
          >
            Delete Log
          </button>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Historical Trade Detail</span>
            <h3 className="text-xl font-extrabold text-white mt-1">
              Tick Time: {new Date(trade.timestamp).toLocaleString()}
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-zinc-950/60 p-3 border border-zinc-800/80">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Spot Price</span>
              <p className="text-lg font-mono font-extrabold text-sky-400 mt-0.5">{Number(trade.spotPrice).toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-zinc-950/60 p-3 border border-zinc-800/80">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Sentiment</span>
              <p className="text-lg font-extrabold text-cyan-400 mt-0.5">{trade.sentiment}</p>
            </div>
            <div className="rounded-xl bg-zinc-950/60 p-3 border border-zinc-800/80">
              <span className="text-[10px] uppercase font-bold text-zinc-500">PCR Value</span>
              <p className="text-lg font-mono font-extrabold text-orange-400 mt-0.5">{trade.pcr}</p>
            </div>
            <div className="rounded-xl bg-zinc-950/60 p-3 border border-zinc-800/80">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Score</span>
              <p className="text-lg font-mono font-extrabold text-zinc-300 mt-0.5">{Number(trade.score).toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-zinc-950/40 p-3 border border-zinc-900">
              <span className="text-[9px] uppercase font-bold text-zinc-600">RSI / ADX</span>
              <p className="text-sm font-mono font-semibold text-zinc-300 mt-0.5">
                {Number(trade.rsi).toFixed(0)} / {Number(trade.adx).toFixed(0)}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-950/40 p-3 border border-zinc-900">
              <span className="text-[9px] uppercase font-bold text-zinc-600">CE / PE Aggr</span>
              <p className="text-sm font-mono font-semibold text-zinc-300 mt-0.5">
                {Number(trade.avgCeAggr).toFixed(2)} / {Number(trade.avgPeAggr).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-950/40 p-3 border border-zinc-900">
              <span className="text-[9px] uppercase font-bold text-zinc-600">Max Pain</span>
              <p className="text-sm font-mono font-semibold text-zinc-300 mt-0.5">{Number(trade.maxPain).toFixed(0)}</p>
            </div>
            <div className="rounded-xl bg-zinc-950/40 p-3 border border-zinc-900">
              <span className="text-[9px] uppercase font-bold text-zinc-600">S / R Levels</span>
              <p className="text-sm font-mono font-semibold text-zinc-300 mt-0.5">
                {trade.support} / {trade.resistance}
              </p>
            </div>
          </div>

          <div
            className={`rounded-xl border p-5 backdrop-blur-md transition-all duration-300 ${
              trade.signal.includes("BUY CE")
                ? "border-green-500/20 bg-green-950/10 text-green-200"
                : trade.signal.includes("BUY PE")
                ? "border-red-500/20 bg-red-950/10 text-red-200"
                : trade.signal.includes("EXIT")
                ? "border-purple-500/20 bg-purple-950/10 text-purple-200"
                : "border-zinc-800 bg-zinc-950/50 text-zinc-300"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider opacity-60">Engine Summary Analysis</span>
                <span
                  className={`rounded px-2.5 py-0.5 text-xs font-bold ${
                    trade.signal.includes("BUY CE")
                      ? "bg-green-500/10 text-green-400"
                      : trade.signal.includes("BUY PE")
                      ? "bg-red-500/10 text-red-400"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {trade.signal}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs font-medium">
                {parseSummary(trade.summary).map((item, idx) => (
                  <div key={idx} className="flex justify-between border-b border-zinc-850/40 pb-1.5">
                    <span className="text-zinc-400 font-semibold">{item.key}</span>
                    <span className="text-white font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
