"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AuthForm } from "@/components/AuthForm";
import { NavigationHeader } from "@/components/NavigationHeader";
import { OverviewView } from "@/components/views/OverviewView";
import { ChartSkeleton, TableSkeleton } from "@/components/common/Skeletons";
import { useAuth } from "@/hooks/useAuth";
import { useMarketFeed } from "@/hooks/useMarketFeed";
import { useHistoryData } from "@/hooks/useHistoryData";

// Code-Split Heavy Views via next/dynamic with Skeleton Fallbacks
const ChartsView = dynamic(
  () => import("@/components/views/ChartsView").then((mod) => mod.ChartsView),
  { loading: () => <ChartSkeleton /> }
);

const HistoryView = dynamic(
  () => import("@/components/views/HistoryView").then((mod) => mod.HistoryView),
  { loading: () => <TableSkeleton rows={10} /> }
);

const V3ExecutionFeedTable = dynamic(
  () => import("@/components/V3ExecutionFeedTable").then((mod) => mod.V3ExecutionFeedTable),
  { loading: () => <TableSkeleton rows={8} /> }
);

const LegacyExecutionFeedTable = dynamic(
  () => import("@/components/LegacyExecutionFeedTable").then((mod) => mod.LegacyExecutionFeedTable),
  { loading: () => <TableSkeleton rows={8} /> }
);

const TradeDetailsModal = dynamic(
  () => import("@/components/TradeDetailsModal").then((mod) => mod.TradeDetailsModal)
);

const SentimentModal = dynamic(
  () => import("@/components/modals/SentimentModal").then((mod) => mod.SentimentModal)
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "charts" | "v3_engine" | "legacy_engine" | "history">("overview");

  // 1. Authentication State
  const {
    isAuthenticated,
    username,
    setUsername,
    password,
    setPassword,
    authMode,
    setAuthMode,
    token,
    authError,
    handleAuth,
    handleLogout,
  } = useAuth();

  // 2. Real-Time Market Feed & Multi-Engine State
  const {
    trades,
    v3Trades,
    legacyTrades,
    latestTrade,
    isLoading,
    connectionStatus,
    marketOpen,
    countdown,
    handleDeleteTrade,
  } = useMarketFeed(isAuthenticated, token);

  // 3. Historical Date-Lookup State
  const {
    historyDate,
    setHistoryDate,
    historyTrades,
    historyLoading,
    selectedHistoryTrade,
    setSelectedHistoryTrade,
    handleDeleteHistoryTrade,
    getYesterdayString,
  } = useHistoryData(isAuthenticated, token, activeTab);

  // 4. Multi-Engine 4th Column Selection State
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);
  const [selectedSentimentTrade, setSelectedSentimentTrade] = useState<any | null>(null);

  const handleSelectTradeForComparison = (timestamp: string) => {
    setSelectedTimestamp(timestamp);
  };

  // If unauthenticated, display the minimal clean AuthForm
  if (!isAuthenticated) {
    return (
      <AuthForm
        authMode={authMode}
        username={username}
        passwordHash={password}
        authError={authError}
        onChangeUsername={setUsername}
        onChangePassword={setPassword}
        onToggleMode={setAuthMode}
        onSubmit={handleAuth}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation & Status Bar */}
      <NavigationHeader
        connectionStatus={connectionStatus}
        marketOpen={marketOpen}
        countdown={countdown}
        username={username}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="mx-auto max-w-[1600px] px-4 pb-8 sm:px-6">
        <div className="mt-8">
          {/* Tab 1: Multi-Engine Overview Workspace */}
          {activeTab === "overview" && (
            <OverviewView
              isLoading={isLoading}
              marketOpen={marketOpen}
              connectionStatus={connectionStatus}
              latestTrade={latestTrade}
              trades={trades}
              v3Trades={v3Trades}
              legacyTrades={legacyTrades}
              selectedTimestamp={selectedTimestamp}
              onSelectTradeForComparison={handleSelectTradeForComparison}
              onOpenSentimentModal={setSelectedSentimentTrade}
              onDeleteTrade={handleDeleteTrade}
            />
          )}

          {/* Tab 2: Interactive SVG Technical Charts (Lazy Loaded) */}
          {activeTab === "charts" && (
            <ChartsView v3Trades={v3Trades} v2Trades={trades} />
          )}

          {/* Tab 3: Dedicated V3 Engine View (Lazy Loaded) */}
          {activeTab === "v3_engine" && (
            <V3ExecutionFeedTable
              trades={v3Trades}
              onSelectSentiment={setSelectedSentimentTrade}
            />
          )}

          {/* Tab 4: Dedicated Legacy Engine View (Lazy Loaded) */}
          {activeTab === "legacy_engine" && (
            <LegacyExecutionFeedTable
              trades={legacyTrades}
              onSelectSentiment={setSelectedSentimentTrade}
            />
          )}

          {/* Tab 5: Historical Date Lookup (Lazy Loaded) */}
          {activeTab === "history" && (
            <HistoryView
              historyDate={historyDate}
              maxDate={getYesterdayString()}
              historyTrades={historyTrades}
              historyLoading={historyLoading}
              onDateChange={setHistoryDate}
              onSelectTrade={setSelectedHistoryTrade}
              onDeleteTrade={handleDeleteHistoryTrade}
            />
          )}
        </div>
      </main>

      {/* On-Demand Modals */}
      {selectedHistoryTrade && (
        <TradeDetailsModal
          trade={selectedHistoryTrade}
          onClose={() => setSelectedHistoryTrade(null)}
          onDelete={handleDeleteHistoryTrade}
        />
      )}

      {selectedSentimentTrade && (
        <SentimentModal
          trade={selectedSentimentTrade}
          onClose={() => setSelectedSentimentTrade(null)}
        />
      )}
    </div>
  );
}
