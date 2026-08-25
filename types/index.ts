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

export interface OldVersionTrade {
  id: number;
  timestamp: string;
  spotPrice: number;
  pcr: number;
  maxPain: number;
  support: number;
  resistance: number;
  spotTrend: string;
  emaTrend: string;
  score: number;
  sentiment: string;
  signal: string;
  actionableSignal: string;
  summary: string;
}
