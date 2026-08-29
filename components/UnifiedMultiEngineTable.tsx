import React from "react";
import { Trade, V3VersionTrade, LegacyTrade } from "../types";

export interface SyncedTick {
  timestamp: string;
  spotPrice: number;
  v3: V3VersionTrade | null;
  v2: Trade | null;
  legacy: LegacyTrade | null;
}

interface UnifiedMultiEngineTableProps {
  v3Trades: V3VersionTrade[];
  v2Trades: Trade[];
  legacyTrades: LegacyTrade[];
  selectedTimestamp: string | null;
  onSelectTrade: (timestamp: string) => void;
  onSelectSentiment?: (trade: any) => void;
}

export function UnifiedMultiEngineTable({
  v3Trades,
  v2Trades,
  legacyTrades,
  selectedTimestamp,
  onSelectTrade,
  onSelectSentiment,
}: UnifiedMultiEngineTableProps) {
  // Combine all timestamps into synchronized ticks
  const timeMap = new Map<string, SyncedTick>();

  const getOrInitTick = (tsStr: string, spot: number): SyncedTick => {
    // Round timestamp to minute boundary key (YYYY-MM-DDTHH:mm:00) to align engines
    const date = new Date(tsStr);
    date.setSeconds(0, 0);
    const minuteKey = date.toISOString();

    if (!timeMap.has(minuteKey)) {
      timeMap.set(minuteKey, {
        timestamp: tsStr,
        spotPrice: spot,
        v3: null,
        v2: null,
        legacy: null,
      });
    }
    return timeMap.get(minuteKey)!;
  };

  v3Trades.forEach((t) => {
    const tick = getOrInitTick(t.timestamp, Number(t.spotPrice));
    if (!tick.v3) tick.v3 = t;
  });

  v2Trades.forEach((t) => {
    const tick = getOrInitTick(t.timestamp, Number(t.spotPrice));
    if (!tick.v2) tick.v2 = t;
  });

  legacyTrades.forEach((t) => {
    const tick = getOrInitTick(t.timestamp, Number(t.spotPrice));
    if (!tick.legacy) tick.legacy = t;
  });

  const syncedTicks = Array.from(timeMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const todaysTicks = syncedTicks.filter((t) => {
    const tradeDate = new Date(t.timestamp);
    const today = new Date();
    return (
      tradeDate.getDate() === today.getDate() &&
      tradeDate.getMonth() === today.getMonth() &&
      tradeDate.getFullYear() === today.getFullYear()
    );
  });

  const displayTicks = todaysTicks.length > 0 ? todaysTicks : syncedTicks;

  const renderSignalBadge = (signal?: string | null) => {
    if (!signal) return <span className="text-zinc-600 font-mono text-[11px]">-</span>;
    const sUpper = signal.toUpperCase();
    if (sUpper.includes("BUY CE")) {
      return (
        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-bold text-emerald-400 border border-emerald-500/30 text-[11px]">
          {signal}
        </span>
      );
    }
    if (sUpper.includes("BUY PE")) {
      return (
        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-bold text-rose-400 border border-rose-500/30 text-[11px]">
          {signal}
        </span>
      );
    }
    return (
      <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-medium text-zinc-400 text-[11px]">
        {signal}
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-4">
      <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>⚡ Unified Multi-Engine Ticks Feed</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Common Time &amp; Spot Price on left, aligned engine logic signals on right
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
          {displayTicks.length} Ticks
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            {/* Header Row 1: Engine Groups */}
            <tr className="border-b border-zinc-800 text-[11px] font-bold uppercase text-zinc-400 bg-zinc-900/60">
              <th colSpan={2} className="py-2 px-3 border-r border-zinc-800 text-zinc-300">
                Common Market Data
              </th>
              <th colSpan={3} className="py-2 px-3 border-r border-zinc-800 text-emerald-400">
                V3 Engine (Primary)
              </th>
              <th colSpan={3} className="py-2 px-3 border-r border-zinc-800 text-cyan-400">
                Active V2 Engine
              </th>
              <th colSpan={3} className="py-2 px-3 text-purple-400">
                Legacy Engine
              </th>
            </tr>

            {/* Header Row 2: Columns */}
            <tr className="border-b border-zinc-800 text-[10px] font-semibold uppercase text-zinc-500 bg-zinc-950/40">
              {/* Common Columns */}
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3 border-r border-zinc-800">Spot Price</th>

              {/* V3 Engine */}
              <th className="py-2 px-3">Signal</th>
              <th className="py-2 px-3">Score</th>
              <th className="py-2 px-3 border-r border-zinc-800">Sentiment</th>

              {/* V2 Engine */}
              <th className="py-2 px-3">Signal</th>
              <th className="py-2 px-3">PCR</th>
              <th className="py-2 px-3 border-r border-zinc-800">Sentiment</th>

              {/* Legacy Engine */}
              <th className="py-2 px-3">Signal</th>
              <th className="py-2 px-3">PCR</th>
              <th className="py-2 px-3">Sentiment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/50">
            {displayTicks.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-zinc-600">
                  No market ticks logged yet. Waiting for cron cycle...
                </td>
              </tr>
            ) : (
              displayTicks.map((tick) => {
                const isSelected = selectedTimestamp === tick.timestamp;
                const timeStr = new Date(tick.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });

                return (
                  <tr
                    key={tick.timestamp}
                    onClick={() => onSelectTrade(tick.timestamp)}
                    className={`hover:bg-zinc-800/40 transition-colors cursor-pointer ${isSelected ? "bg-sky-500/10 border-l-2 border-sky-400" : ""
                      }`}
                  >
                    {/* Common Columns */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-200">
                      {timeStr}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-white font-bold border-r border-zinc-900">
                      ₹{tick.spotPrice ? tick.spotPrice.toFixed(1) : "N/A"}
                    </td>

                    {/* V3 Engine Columns */}
                    <td className="py-2.5 px-3">{renderSignalBadge(tick.v3?.signal)}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">
                      {tick.v3?.score ? Number(tick.v3.score).toFixed(2) : "-"}
                    </td>
                    <td className="py-2.5 px-3 border-r border-zinc-900">
                      {tick.v3?.sentiment ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSentiment?.(tick.v3);
                          }}
                          className="rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300 transition-colors"
                        >
                          {tick.v3.sentiment}
                        </button>
                      ) : (
                        <span className="text-zinc-600 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    {/* V2 Engine Columns */}
                    <td className="py-2.5 px-3">{renderSignalBadge(tick.v2?.signal)}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">
                      {tick.v2?.pcr ? Number(tick.v2.pcr).toFixed(2) : "-"}
                    </td>
                    <td className="py-2.5 px-3 border-r border-zinc-900">
                      {tick.v2?.sentiment ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSentiment?.(tick.v2);
                          }}
                          className="rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-cyan-300 transition-colors"
                        >
                          {tick.v2.sentiment}
                        </button>
                      ) : (
                        <span className="text-zinc-600 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    {/* Legacy Engine Columns */}
                    <td className="py-2.5 px-3">{renderSignalBadge(tick.legacy?.signal)}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">
                      {tick.legacy?.pcr ? Number(tick.legacy.pcr).toFixed(2) : "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      {tick.legacy?.sentiment ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSentiment?.(tick.legacy);
                          }}
                          className="rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-purple-300 transition-colors"
                        >
                          {tick.legacy.sentiment}
                        </button>
                      ) : (
                        <span className="text-zinc-600 font-mono text-[11px]">-</span>
                      )}
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
