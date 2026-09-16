"use client";

import { useState, useEffect, useCallback } from "react";
import { Trade } from "../types";
import { api } from "../lib/api";
import { getYesterdayISTDateString } from "../lib/trade-utils";

export function useHistoryData(isAuthenticated: boolean, token: string, activeTab: string) {
  const [historyDate, setHistoryDate] = useState<string>(() => getYesterdayISTDateString());
  const [historyTrades, setHistoryTrades] = useState<Trade[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryTrade, setSelectedHistoryTrade] = useState<Trade | null>(null);

  const fetchHistoryByDate = useCallback(async () => {
    if (!isAuthenticated || !token || activeTab !== "history") return;

    setHistoryLoading(true);
    try {
      const data = await api.trades.getV2All({ date: historyDate });
      setHistoryTrades(data);
    } catch (err) {
      console.error("Failed to fetch history trades for date:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated, token, activeTab, historyDate]);

  useEffect(() => {
    fetchHistoryByDate();
  }, [fetchHistoryByDate]);

  const handleDeleteHistoryTrade = async (id: number) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this historical trade log?")) return;

    try {
      await api.trades.delete(id);
      setHistoryTrades((prev) => prev.filter((t) => t.id !== id));
      if (selectedHistoryTrade && selectedHistoryTrade.id === id) {
        setSelectedHistoryTrade(null);
      }
    } catch (err) {
      console.error("Error deleting historical trade:", err);
      alert("Error deleting trade record.");
    }
  };

  return {
    historyDate,
    setHistoryDate,
    historyTrades,
    historyLoading,
    selectedHistoryTrade,
    setSelectedHistoryTrade,
    handleDeleteHistoryTrade,
    getYesterdayString: getYesterdayISTDateString,
  };
}
