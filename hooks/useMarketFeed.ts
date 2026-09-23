"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Trade, V3VersionTrade, LegacyTrade, MarketSessionStatus } from "../types";
import { api } from "../lib/api";
import { getISTNow, getTodayISTDateString } from "../lib/trade-utils";

export function useMarketFeed(isAuthenticated: boolean, token: string) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [v3Trades, setV3Trades] = useState<V3VersionTrade[]>([]);
  const [legacyTrades, setLegacyTrades] = useState<LegacyTrade[]>([]);
  const [latestTrade, setLatestTrade] = useState<V3VersionTrade | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [marketOpen, setMarketOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Render Uptime & On-Demand Wake State
  const [isWaking, setIsWaking] = useState(false);
  const [wakeProgress, setWakeProgress] = useState(0);
  const [isManualSession, setIsManualSession] = useState(false);
  const [marketStatus, setMarketStatus] = useState<MarketSessionStatus | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const lastTradeIdRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Market status calculation (Mon-Fri 09:15 - 15:30 IST) + Server Sync
  const checkMarketStatus = useCallback(async () => {
    const ist = getISTNow();
    const day = ist.getDay(); // 0 = Sun, 6 = Sat
    const timeNum = ist.getHours() * 100 + ist.getMinutes();
    const isLiveMarketTime = day >= 1 && day <= 5 && timeNum >= 915 && timeNum <= 1530;

    // Check with backend for authoritative status if connected or in manual session
    try {
      const data = await api.market.getStatus();
      if (data?.market_status) {
        setMarketStatus(data.market_status);
        setMarketOpen(data.market_status.isOpen);
        if (data.market_status.manualSessionActive) {
          setIsManualSession(true);
        }
        return;
      }
    } catch {
      // Fallback to client-side IST calculation if backend is asleep
    }

    setMarketOpen(isLiveMarketTime);
  }, []);

  useEffect(() => {
    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 20000);
    return () => clearInterval(interval);
  }, [checkMarketStatus]);

  // Fetch Multi-Engine Trade Data
  const fetchHistory = useCallback(async () => {
    try {
      const todayStr = getTodayISTDateString();

      let [data, v3Data, legacyData] = await Promise.all([
        api.trades.getV2All({ limit: 500, date: todayStr }),
        api.trades.getV3All({ limit: 500, date: todayStr }),
        api.trades.getLegacyAll({ limit: 500, date: todayStr }),
      ]);

      if (data.length === 0) data = await api.trades.getV2All({ limit: 500 });
      if (v3Data.length === 0) v3Data = await api.trades.getV3All({ limit: 500 });
      if (legacyData.length === 0) legacyData = await api.trades.getLegacyAll({ limit: 500 });

      setTrades(data);
      setV3Trades(v3Data);
      setLegacyTrades(legacyData);

      if (v3Data.length > 0) {
        setLatestTrade(v3Data[0]);
        lastTradeIdRef.current = v3Data[0].id;
      } else if (data.length > 0) {
        lastTradeIdRef.current = data[0].id;
      }
    } catch (err) {
      console.error("Failed to fetch multi-engine trade history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // WebSocket Connection
  const connectWebSocket = useCallback(() => {
    if (!token) return;
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionStatus("connecting");
    let baseUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!baseUrl) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      baseUrl = apiUrl.replace(/^http/, "ws");
    }
    const wsUrl = `${baseUrl}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = async () => {
      setConnectionStatus("connected");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Gap backfill
      if (lastTradeIdRef.current) {
        try {
          const missedTrades: V3VersionTrade[] = await api.trades.getV3All({ since: lastTradeIdRef.current });
          if (missedTrades && missedTrades.length > 0) {
            setV3Trades((prev) => {
              const combined = [...missedTrades, ...prev];
              const unique = Array.from(new Map(combined.map((t) => [t.id, t])).values());
              return unique.slice(0, 500);
            });
            setLatestTrade(missedTrades[0]);
            lastTradeIdRef.current = missedTrades[0].id;
          }
        } catch (err) {
          console.error("Failed to run gap backfill:", err);
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "trade:new") {
          const newTrade: Trade = payload.data;
          setTrades((prev) => [newTrade, ...prev].slice(0, 500));
        } else if (payload.type === "trade_v3:new") {
          const newV3Trade: V3VersionTrade = payload.data;
          setLatestTrade(newV3Trade);
          lastTradeIdRef.current = newV3Trade.id;
          setV3Trades((prev) => [newV3Trade, ...prev].slice(0, 500));
        } else if (payload.type === "trade_legacy:new") {
          const newLegacyTrade: LegacyTrade = payload.data;
          setLegacyTrades((prev) => [newLegacyTrade, ...prev].slice(0, 500));
        } else if (payload.type === "countdown:tick") {
          setCountdown(payload.data.secondsRemaining);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      // Only auto-reconnect continuously if live market is open or manual session is active
      const ist = getISTNow();
      const day = ist.getDay();
      const timeNum = ist.getHours() * 100 + ist.getMinutes();
      const isLiveTime = day >= 1 && day <= 5 && timeNum >= 915 && timeNum <= 1530;

      if (isLiveTime || isManualSession) {
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 5000);
        }
      }
    };

    ws.onerror = () => {
      // ws error logged
    };
  }, [token, isManualSession]);

  // Initial load
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    fetchHistory();
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [isAuthenticated, token, fetchHistory, connectWebSocket]);

  // Client-Side Tab Heartbeat during Manual Session to keep Render awake
  useEffect(() => {
    if (!isManualSession) {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    // Ping /api/market/wake every 4 minutes while tab is open
    heartbeatIntervalRef.current = setInterval(async () => {
      if (typeof document !== "undefined" && !document.hidden) {
        try {
          await api.market.wake(30);
        } catch {
          // Ignore heartbeat error
        }
      }
    }, 4 * 60 * 1000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [isManualSession]);

  // Wake Backend Action
  const wakeBackend = useCallback(async () => {
    if (isWaking) return;
    setIsWaking(true);
    setWakeProgress(0);

    const progressTimer = setInterval(() => {
      setWakeProgress((prev) => prev + 1);
    }, 1000);

    try {
      const res = await api.market.wake(30);
      setIsManualSession(true);
      if (res?.market_status) {
        setMarketStatus(res.market_status);
      }
      // Load latest data and reconnect WebSocket
      await fetchHistory();
      connectWebSocket();
    } catch (err: any) {
      console.error("Failed to wake backend:", err);
      alert("Failed to wake server. Render may still be spinning up, please retry in a few seconds.");
    } finally {
      clearInterval(progressTimer);
      setIsWaking(false);
    }
  }, [isWaking, fetchHistory, connectWebSocket]);

  // Disconnect Backend / Put Server in Standby
  const disconnectBackend = useCallback(async () => {
    try {
      await api.market.sleep();
    } catch {}
    setIsManualSession(false);
    if (socketRef.current) {
      socketRef.current.close();
    }
    setConnectionStatus("disconnected");
    checkMarketStatus();
  }, [checkMarketStatus]);

  const handleDeleteTrade = async (id: number) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this trade log?")) return;

    try {
      await api.trades.delete(id);
      setTrades((prev) => prev.filter((t) => t.id !== id));
      setV3Trades((prev) => prev.filter((t) => t.id !== id));
      setLegacyTrades((prev) => prev.filter((t) => t.id !== id));
      if (latestTrade && latestTrade.id === id) {
        setV3Trades((prev) => {
          const remaining = prev.filter((t) => t.id !== id);
          setLatestTrade(remaining.length > 0 ? remaining[0] : null);
          return remaining;
        });
      }
    } catch (err) {
      console.error("Error deleting trade:", err);
      alert("Error deleting trade log.");
    }
  };

  return {
    trades,
    v3Trades,
    legacyTrades,
    latestTrade,
    isLoading,
    connectionStatus,
    marketOpen,
    countdown,
    handleDeleteTrade,
    isWaking,
    wakeProgress,
    isManualSession,
    marketStatus,
    wakeBackend,
    disconnectBackend,
  };
}
