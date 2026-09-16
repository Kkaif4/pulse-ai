"use client";

import React from "react";
import { Trade, V3VersionTrade, LegacyTrade } from "../../types";
import { LiveEngineCard } from "../LiveEngineCard";
import { KPIStatsCards } from "../KPIStatsCards";
import { UnifiedMultiEngineTable } from "../UnifiedMultiEngineTable";
import { TradeComparisonColumn } from "../TradeComparisonColumn";
import { LiveCardSkeleton, KPIStatsSkeleton, TableSkeleton } from "../common/Skeletons";
import { AlertCircleIcon } from "../common/Icons";

interface OverviewViewProps {
  isLoading: boolean;
  marketOpen: boolean;
  connectionStatus: string;
  latestTrade: V3VersionTrade | null;
  trades: Trade[];
  v3Trades: V3VersionTrade[];
  legacyTrades: LegacyTrade[];
  selectedTimestamp: string | null;
  onSelectTradeForComparison: (timestamp: string) => void;
  onOpenSentimentModal: (trade: any) => void;
  onDeleteTrade: (id: number) => void;
}

export function OverviewView({
  isLoading,
  marketOpen,
  connectionStatus,
  latestTrade,
  trades,
  v3Trades,
  legacyTrades,
  selectedTimestamp,
  onSelectTradeForComparison,
  onOpenSentimentModal,
  onDeleteTrade,
}: OverviewViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        <LiveCardSkeleton />
        <KPIStatsSkeleton />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!marketOpen && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-xs md:text-sm text-red-400 flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              <strong>NSE Market Closed.</strong> Live options calculation engine is idle until next session (09:15 – 15:30 IST).
            </span>
          </div>
        </div>
      )}

      {/* Hero Actionable Live Engine Signal */}
      <LiveEngineCard latestTrade={latestTrade} connectionStatus={connectionStatus} />

      {/* Core Option Chain & Technical KPIs */}
      <KPIStatsCards latestTrade={latestTrade} />

      {/* Synchronized Multi-Engine Grid + 4th Column Comparison */}
      <div className="grid gap-6 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <UnifiedMultiEngineTable
            v3Trades={v3Trades}
            v2Trades={trades}
            legacyTrades={legacyTrades}
            selectedTimestamp={selectedTimestamp}
            onSelectTrade={onSelectTradeForComparison}
            onSelectSentiment={onOpenSentimentModal}
          />
        </div>

        <div className="xl:col-span-1">
          <TradeComparisonColumn
            selectedTimestamp={selectedTimestamp}
            v3Trades={v3Trades}
            v2Trades={trades}
            legacyTrades={legacyTrades}
            onClose={() => onSelectTradeForComparison("")}
          />
        </div>
      </div>
    </div>
  );
}
