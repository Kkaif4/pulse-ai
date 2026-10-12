export interface Trade {
  id: number;
  timestamp: string;
  spotPrice: number;
  pcr: number;
  maxPain: number;
  support: number;
  resistance: number;
  top3Support: number[];
  top3Resistance: number[];
  avgIvSkew: number;
  atmStrike: number;
  atmStraddleCost: number;
  avgCeAggr: number;
  avgPeAggr: number;
  foScore: number;
  rsi: number;
  adx: number;
  spotTrend: string;
  emaTrend: string;
  longTermTrend: string;
  score: number;
  sentiment: string;
  signal: string;
  actionableSignal: string;
  summary: string;
}

export interface V3VersionTrade {
  id: number;
  timestamp: string;
  spotPrice: number;
  indiaVix?: number;
  pcr: number;
  maxPain: number;
  support: number;
  resistance: number;
  ceDelta?: number;
  peDelta?: number;
  ceSpread?: number;
  peSpread?: number;
  depthImbalance?: number;
  foScore: number;
  rsi: number;
  adx: number;
  spotTrend: string;
  score: number;
  sentiment: string;
  signal: string;
  actionableSignal: string;
  summary: string;
}

export interface LegacyTrade {
  id: number;
  timestamp: string;
  spotPrice: number;
  pcr: number;
  maxPain: number;
  support: number;
  resistance: number;
  spotTrend: string;
  sentiment: string;
  signal: string;
  summary: string;
}

export interface OrderBlockZone {
  direction: "bullish" | "bearish";
  top: number;
  bottom: number;
  formedAt: string;
  touchCount: number;
  status: "untested" | "mitigated";
}

export interface LiquiditySweep {
  type: "high_sweep" | "low_sweep";
  level: number;
  sweptAt: string;
  reversalConfirmed: boolean;
}

export interface V4Trade {
  id: number | string;
  timestamp: string;
  spotPrice: number;
  regime: string;
  signal: string;
  reason?: string;
  stopLoss?: number | null;
  takeProfit?: number | null;
  activeOBs?: OrderBlockZone[] | null;
  recentSweeps?: LiquiditySweep[] | null;
}

export interface MarketSessionStatus {
  isOpen: boolean;
  isCoolDown: boolean;
  inUptimeWindow: boolean;
  manualSessionActive: boolean;
  reason: "active_trading" | "weekend" | "holiday" | "pre_market" | "post_market" | "manual_session";
  holidayName?: string;
  istDate: string;
  istTime: string;
  tradingHours: string;
  uptimeSchedule: string;
  manualSessionExpiresAt?: string | null;
}

export interface MarketStatusResponse {
  status: string;
  timestamp: string;
  response_time_ms: number;
  market_status: MarketSessionStatus;
  services?: Record<string, any>;
}

export interface MarketWakeResponse {
  status: "awake" | "standby";
  message: string;
  session?: {
    expiresAt: string;
    durationMinutes: number;
  };
  market_status: MarketSessionStatus;
}

