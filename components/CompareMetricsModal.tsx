import React from "react";
import { Trade, OldVersionTrade } from "../types";

interface CompareMetricsModalProps {
  v2Trade: Trade;
  v1Trade?: OldVersionTrade | null;
  onClose: () => void;
}

export function CompareMetricsModal({ v2Trade, v1Trade, onClose }: CompareMetricsModalProps) {
  const isMatch = v1Trade && v2Trade.signal === v1Trade.signal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold tracking-tight text-white">Engine Logic & Output Comparison</h3>
              <span
                className={`rounded px-2.5 py-1 text-xs font-bold font-mono border ${
                  !v1Trade
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : isMatch
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-orange-500/10 border-orange-500/30 text-orange-400"
                }`}
              >
                {!v1Trade ? "⚠️ MISSING V1 DATA" : isMatch ? "🟢 SIGNALS MATCH" : "🟠 SIGNAL DIVERGENCE"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              Timestamp: {new Date(v2Trade.timestamp).toLocaleTimeString()} | Spot: {Number(v2Trade.spotPrice).toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            ✕ Close
          </button>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* V2 Engine Column */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <span className="text-sm font-bold uppercase tracking-wider text-cyan-400">V2 Current Engine</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-semibold">
                Active
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">Signal:</span>
                <span
                  className={`font-bold ${
                    v2Trade.signal.includes("BUY CE")
                      ? "text-green-400"
                      : v2Trade.signal.includes("BUY PE")
                      ? "text-red-400"
                      : "text-zinc-400"
                  }`}
                >
                  {v2Trade.signal}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">Conviction Score:</span>
                <span className="text-white font-bold">{Number(v2Trade.score).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">Sentiment:</span>
                <span className="text-cyan-300">{v2Trade.sentiment || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">PCR:</span>
                <span className="text-orange-400">{Number(v2Trade.pcr).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">Max Pain:</span>
                <span className="text-purple-400">{Number(v2Trade.maxPain).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">Support / Resistance:</span>
                <span className="text-zinc-300">
                  {Number(v2Trade.support).toFixed(0)} / {Number(v2Trade.resistance).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">Spot / EMA Trend:</span>
                <span className="text-zinc-300">
                  {v2Trade.spotTrend || "N/A"} / {v2Trade.emaTrend || "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-500">CE/PE Aggression:</span>
                <span className="text-zinc-300">
                  {Number(v2Trade.avgCeAggr).toFixed(1)} / {Number(v2Trade.avgPeAggr).toFixed(1)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">V2 Actionable Signal</span>
              <p className="text-xs text-cyan-200 bg-zinc-950 p-2.5 rounded border border-zinc-850 font-medium">
                {v2Trade.actionableSignal || "N/A"}
              </p>
            </div>
          </div>

          {/* V1 Legacy Engine Column */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <span className="text-sm font-bold uppercase tracking-wider text-amber-400">V1 Legacy Engine</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-semibold">
                v1_scripts
              </span>
            </div>

            {v1Trade ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Signal:</span>
                  <span
                    className={`font-bold ${
                      v1Trade.signal.includes("BUY CE")
                        ? "text-green-400"
                        : v1Trade.signal.includes("BUY PE")
                        ? "text-red-400"
                        : "text-zinc-400"
                    }`}
                  >
                    {v1Trade.signal}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Raw Score:</span>
                  <span className="text-white font-bold">{Number(v1Trade.score).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Sentiment:</span>
                  <span className="text-amber-300">{v1Trade.sentiment || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">PCR:</span>
                  <span className="text-orange-400">{Number(v1Trade.pcr).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Max Pain:</span>
                  <span className="text-purple-400">{Number(v1Trade.maxPain).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Support / Resistance:</span>
                  <span className="text-zinc-300">
                    {Number(v1Trade.support).toFixed(0)} / {Number(v1Trade.resistance).toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Spot / EMA Trend:</span>
                  <span className="text-zinc-300">
                    {v1Trade.spotTrend || "N/A"} / {v1Trade.emaTrend || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Signal Detail:</span>
                  <span className="text-zinc-300 text-[11px] truncate max-w-[180px]">
                    {v1Trade.actionableSignal || "N/A"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-mono bg-zinc-950/40 rounded-xl border border-dashed border-amber-500/20 p-6">
                <span className="text-xl block mb-2">⚠️</span>
                <span className="font-bold text-amber-400">MISSING V1 DATA</span>
                <p className="text-zinc-500 text-[11px] mt-1">No V1 legacy engine record exists for this timestamp.</p>
              </div>
            )}

            {v1Trade && (
              <div className="pt-2">
                <span className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">V1 Signal Detail</span>
                <p className="text-xs text-amber-200 bg-zinc-950 p-2.5 rounded border border-zinc-850 font-medium">
                  {v1Trade.actionableSignal || "N/A"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Engine Summaries Accordion / Text Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 space-y-2">
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">V2 Detailed Summary</span>
            <pre className="text-[11px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto bg-zinc-900/50 p-3 rounded border border-zinc-900">
              {v2Trade.summary || "No summary analysis available."}
            </pre>
          </div>
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 space-y-2">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">V1 Detailed Summary</span>
            <pre className="text-[11px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto bg-zinc-900/50 p-3 rounded border border-zinc-900">
              {v1Trade?.summary || "No V1 summary analysis available."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
