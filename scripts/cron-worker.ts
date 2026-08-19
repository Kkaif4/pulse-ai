import cron from "node-cron";
import Redis from "ioredis";
import { prisma } from "../lib/prisma";
import axios from "axios"
import dotenv from "dotenv";

dotenv.config();

// Configuration
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000/analyze";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "pulse_secret_key_change_me";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(REDIS_URL);

// Standard NSE Holidays for 2026 (Format: YYYY-MM-DD)
const NSE_HOLIDAYS_2026 = [
  "2026-01-26", // Republic Day
  "2026-03-06", // Holi
  "2026-03-27", // Good Friday
  "2026-04-02", // Mahavir Jayanti
  "2026-04-14", // Dr. Ambedkar Jayanti
  "2026-05-01", // Maharashtra Day
  "2026-05-25", // Eid-ul-Fitr
  "2026-08-15", // Independence Day
  "2026-10-02", // Gandhi Jayanti
  "2026-10-22", // Dussehra
  "2026-11-09", // Diwali-Balipratipada
  "2026-12-25", // Christmas
];

function isMarketOpen(): boolean {
  // Convert current time to IST (Asia/Kolkata)
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = nowIST.getDay(); // 0 = Sunday, 6 = Saturday

  // Weekends
  if (day === 0 || day === 6) return false;

  // Format current date as YYYY-MM-DD
  const dateStr = nowIST.toISOString().split("T")[0];
  if (NSE_HOLIDAYS_2026.includes(dateStr)) return false;

  const hours = nowIST.getHours();
  const minutes = nowIST.getMinutes();
  const timeNum = hours * 100 + minutes;

  // Market hours: 9:15 AM to 3:30 PM (915 to 1530)
  return timeNum >= 915 && timeNum <= 1530;
}

// Convert Prisma Decimals and BigInts to JSON-compatible types
function serializeData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return Number(obj);
  if (typeof obj === "object" && obj.d && obj.s && obj.e) {
    // Looks like a Decimal object from decimal.js/prisma
    return Number(obj.toString());
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeData);
  }
  if (typeof obj === "object") {
    const serialized: any = {};
    for (const key of Object.keys(obj)) {
      serialized[key] = serializeData(obj[key]);
    }
    return serialized;
  }
  return obj;
}

async function runBotCycle() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 Starting market analysis cycle...`);

  if (!isMarketOpen()) {
    console.log(`[${timestamp}] 💤 Market is closed. Skipping...`);
    return;
  }

  // 1. Acquire Overlap Lock in Redis
  const lockKey = "pulse_ai:overlap_lock";
  const acquired = await redis.set(lockKey, "locked", "EX", 55, "NX"); // 55 seconds TTL

  if (!acquired) {
    console.warn(`[${timestamp}] ⚠️ Previous analysis cycle is still running. Overlap prevented.`);
    return;
  }

  try {
    // 2. Fetch history and previous trade state from DB
    const historyRaw = await prisma.trade.findMany({
      take: 40,
      orderBy: { timestamp: "desc" },
    });

    // Sort chronological for technical indicators (RSI/ADX)
    const history = serializeData(historyRaw).reverse();

    // Get previous option chain snapshot from Redis
    const prevSnapshotRaw = await redis.get("pulse_ai:last_snapshot");
    const prevSnapshot = prevSnapshotRaw ? JSON.parse(prevSnapshotRaw) : null;

    // Get trade state from PostgreSQL
    const tradeStateRecord = await prisma.tradeState.findUnique({
      where: { key: "active_state" },
    });
    const tradeState = tradeStateRecord ? (tradeStateRecord.value as any) : { is_trade_open: false, open_trade_type: null };

    // 3. Post to FastAPI Python worker
    console.log(`[${timestamp}] Calling FastAPI worker...`);
    const response = await axios.post(
      FASTAPI_URL,
      {
        prev_snapshot: prevSnapshot,
        history: history,
        trade_state: tradeState,
      },
      {
        headers: {
          "x-api-secret": INTERNAL_API_SECRET,
        },
        timeout: 15000, // 15 seconds timeout
      }
    );

    const { analysis, current_snapshot, charts } = response.data;
    if (!analysis || analysis.signal === "ERROR") {
      throw new Error(analysis?.summary || "FastAPI returned error or empty analysis");
    }

    // 4. Save new trade snapshot to PostgreSQL
    const createdTrade = await prisma.trade.create({
      data: {
        spotPrice: analysis.spot_price,
        pcr: analysis.pcr,
        maxPain: analysis.max_pain,
        support: analysis.support,
        resistance: analysis.resistance,
        top3Support: analysis.top_3_support || [],
        top3Resistance: analysis.top_3_resistance || [],
        avgIvSkew: analysis.avg_iv_skew,
        atmStrike: analysis.atm_strike,
        atmStraddleCost: analysis.atm_straddle_cost,
        totalCeChgOi: BigInt(analysis.total_ce_chg_oi || 0),
        totalPeChgOi: BigInt(analysis.total_pe_chg_oi || 0),
        totalCeVol: BigInt(analysis.total_ce_vol || 0),
        totalPeVol: BigInt(analysis.total_pe_vol || 0),
        avgCeAggr: analysis.avg_ce_aggr,
        avgPeAggr: analysis.avg_pe_aggr,
        foScore: analysis.fo_score,
        rsi: analysis.rsi,
        adx: analysis.adx,
        spotTrend: analysis.spot_trend,
        emaTrend: analysis.ema_trend,
        longTermTrend: analysis.long_term_trend,
        score: analysis.score,
        sentiment: analysis.sentiment,
        signal: analysis.signal,
        actionableSignal: analysis.actionable_signal,
        summary: analysis.summary,
      },
    });

    // 5. Update state tables
    // Save last option chain snapshot to Redis
    await redis.set("pulse_ai:last_snapshot", JSON.stringify(current_snapshot), "EX", 86400); // 1 day expiry

    // Save in-memory chart buffers to Redis
    if (charts) {
      if (charts.trading_plot) await redis.set("pulse_ai:chart:trading_plot", charts.trading_plot, "EX", 86400);
      if (charts.aggression_plot) await redis.set("pulse_ai:chart:aggression_plot", charts.aggression_plot, "EX", 86400);
      if (charts.max_pain_plot) await redis.set("pulse_ai:chart:max_pain_plot", charts.max_pain_plot, "EX", 86400);
    }

    // Save updated trade state to PostgreSQL
    const nextTradeState = {
      is_trade_open: analysis.signal.includes("BUY") || analysis.signal.includes("HOLD"),
      open_trade_type: analysis.signal.includes("BUY")
        ? analysis.signal.split(" ").pop()
        : analysis.signal.includes("HOLD")
          ? tradeState.open_trade_type
          : null
    };

    await prisma.tradeState.upsert({
      where: { key: "active_state" },
      update: { value: nextTradeState },
      create: { key: "active_state", value: nextTradeState },
    });

    console.log(`[${timestamp}] ✅ Cycle complete. New trade record ID: ${createdTrade.id}`);

    // Broadcast via Redis Pub/Sub to WebSocket servers
    await redis.publish("pulse_ai:trades:new", JSON.stringify(serializeData(createdTrade)));

  } catch (error: any) {
    console.error(`[${timestamp}] ❌ Error in analysis cycle:`, error.message || error);
  } finally {
    // 6. Release lock
    await redis.del(lockKey);
  }
}

// Cron: Schedule to run every 1 minute
console.log("⏰ Scheduling analysis worker...");
cron.schedule("* * * * *", runBotCycle);

// Trigger immediately on startup to verify
runBotCycle();
