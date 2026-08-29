import React, { useEffect, useState } from "react";
import { Trade, V3VersionTrade, LegacyTrade } from "../types";
import { api } from "../lib/api";

interface TradeComparisonColumnProps {
  selectedTimestamp: string | null;
  v3Trades?: V3VersionTrade[];
  v2Trades?: Trade[];
  legacyTrades?: LegacyTrade[];
  onClose?: () => void;
}

export function TradeComparisonColumn({
  selectedTimestamp,
  v3Trades = [],
  v2Trades = [],
  legacyTrades = [],
  onClose,
}: TradeComparisonColumnProps) {
  const [loading, setLoading] = useState(false);
  const [apiDetails, setApiDetails] = useState<{
    v3: V3VersionTrade | null;
    v2: Trade | null;
    legacy: LegacyTrade | null;
  } | null>(null);

  useEffect(() => {
    if (!selectedTimestamp) {
      setApiDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const data = await api.trades.getCompareDetails(selectedTimestamp);
        setApiDetails(data);
      } catch (err) {
        // Fallback gracefully without raising unhandled console errors
        console.warn("API comparison details lookup failed; using local memory fallbacks.");
        setApiDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [selectedTimestamp]);

  if (!selectedTimestamp) {
    return (
      <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-6 text-center text-zinc-500">
        <div className="text-3xl mb-2">📊</div>
        <h4 className="text-sm font-semibold text-zinc-400">Multi-Engine Trade Comparison</h4>
        <p className="text-xs text-zinc-600 mt-1">
          Click any trade row from the unified feed to fetch and compare multi-engine conviction metrics.
        </p>
      </div>
    );
  }

  // Local memory fallback helper (30 minute window)
  const findLocalClosest = (list: any[], targetTs: string) => {
    if (!list || list.length === 0) return null;
    const targetTime = new Date(targetTs).getTime();
    let best = null;
    let minDiff = 1800000; // 30 mins
    for (const item of list) {
      const itemTime = new Date(item.timestamp).getTime();
      const diff = Math.abs(itemTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        best = item;
      }
    }
    return best;
  };

  const v3 = apiDetails?.v3 ?? findLocalClosest(v3Trades, selectedTimestamp);
  const v2 = apiDetails?.v2 ?? findLocalClosest(v2Trades, selectedTimestamp);
  const legacy = apiDetails?.legacy ?? findLocalClosest(legacyTrades, selectedTimestamp);

  const availableEngineCount = [v3, v2, legacy].filter(Boolean).length;
  const spotPrice = v3?.spotPrice ?? v2?.spotPrice ?? legacy?.spotPrice ?? 0;
  const displayTime = new Date(selectedTimestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="rounded-xl border border-sky-900/40 bg-zinc-900/40 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
            <span>Multi-Engine Trade Comparison</span>
          </h3>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            Time: {displayTime} | Spot: {spotPrice ? `₹${Number(spotPrice).toFixed(1)}` : "N/A"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${availableEngineCount >= 2
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
              }`}
          >
            {availableEngineCount >= 2
              ? `Comparing ${availableEngineCount}/3 Engines`
              : "1 Engine Data Active"}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-zinc-400 flex flex-col items-center justify-center space-y-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <span className="text-xs font-mono text-zinc-500">Loading metrics...</span>
        </div>
      ) : availableEngineCount === 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center space-y-2">
          <span className="text-2xl block">⚠️</span>
          <h4 className="text-xs font-bold text-amber-400">No Engine Records Found</h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            No analytical records found at this timestamp. Try selecting another row.
          </p>
        </div>
      ) : (
        /* Side-by-side Engine Cards */
        <div className="space-y-3">
          {/* V3 Engine Card (Primary) */}
          <div className={`rounded-lg border p-3 ${v3 ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/30 opacity-60"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400">V3 Engine (Primary)</span>
              {v3 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {v3.signal || "Sideways"}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">
                  N/A / Missing Data
                </span>
              )}
            </div>
            {v3 ? (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-300">
                <div>Sentiment: <span className="text-white font-semibold">{v3.sentiment}</span></div>
                <div>Score: <span className="text-emerald-300 font-bold">{v3.score ? Number(v3.score).toFixed(2) : "0"}</span></div>
                <div>VIX: <span>{v3.indiaVix ? Number(v3.indiaVix).toFixed(2) : "N/A"}</span></div>
                <div>PCR: <span>{v3.pcr ? Number(v3.pcr).toFixed(2) : "N/A"}</span></div>
                <div>RSI: <span>{v3.rsi ? Number(v3.rsi).toFixed(1) : "N/A"}</span></div>
                <div>ADX: <span>{v3.adx ? Number(v3.adx).toFixed(1) : "N/A"}</span></div>
                <div>CE Δ / PE Δ: <span className="text-purple-300">{v3.ceDelta !== undefined && v3.peDelta !== undefined ? `${v3.ceDelta.toFixed(2)} / ${v3.peDelta.toFixed(2)}` : "N/A"}</span></div>
                <div>Imbalance: <span>{v3.depthImbalance !== undefined ? `${(v3.depthImbalance * 100).toFixed(1)}%` : "N/A"}</span></div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">No V3 analysis record at this tick</p>
            )}
          </div>

          {/* Active V2 Card */}
          <div className={`rounded-lg border p-3 ${v2 ? "border-cyan-500/20 bg-cyan-500/5" : "border-zinc-800 bg-zinc-950/30 opacity-60"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-400">Active V2 Engine</span>
              {v2 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  {v2.signal || "Sideways"}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">
                  N/A / Missing Data
                </span>
              )}
            </div>
            {v2 ? (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-300">
                <div>Sentiment: <span className="text-white font-semibold">{v2.sentiment}</span></div>
                <div>Score: <span className="text-cyan-300 font-bold">{v2.score ? Number(v2.score).toFixed(2) : "0"}</span></div>
                <div>PCR: <span>{v2.pcr ? Number(v2.pcr).toFixed(2) : "N/A"}</span></div>
                <div>Max Pain: <span>{v2.maxPain ? Number(v2.maxPain).toFixed(0) : "N/A"}</span></div>
                <div>RSI: <span>{v2.rsi ? Number(v2.rsi).toFixed(1) : "N/A"}</span></div>
                <div>ADX: <span>{v2.adx ? Number(v2.adx).toFixed(1) : "N/A"}</span></div>
                <div>Support: <span>{v2.support ? Number(v2.support).toFixed(0) : "N/A"}</span></div>
                <div>Resistance: <span>{v2.resistance ? Number(v2.resistance).toFixed(0) : "N/A"}</span></div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">No V2 analysis record at this tick</p>
            )}
          </div>

          {/* Legacy Card */}
          <div className={`rounded-lg border p-3 ${legacy ? "border-purple-500/20 bg-purple-500/5" : "border-zinc-800 bg-zinc-950/30 opacity-60"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-400">Legacy Engine</span>
              {legacy ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  {legacy.signal || "Sideways"}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">
                  N/A / Missing Data
                </span>
              )}
            </div>
            {legacy ? (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-300">
                <div>Sentiment: <span className="text-white font-semibold">{legacy.sentiment}</span></div>
                <div>PCR: <span>{legacy.pcr ? Number(legacy.pcr).toFixed(2) : "N/A"}</span></div>
                <div>Max Pain: <span>{legacy.maxPain ? Number(legacy.maxPain).toFixed(0) : "N/A"}</span></div>
                <div>Support: <span>{legacy.support ? Number(legacy.support).toFixed(0) : "N/A"}</span></div>
                <div>Resistance: <span>{legacy.resistance ? Number(legacy.resistance).toFixed(0) : "N/A"}</span></div>
                <div>Trend: <span>{legacy.spotTrend || "N/A"}</span></div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">No Legacy analysis record at this tick</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
