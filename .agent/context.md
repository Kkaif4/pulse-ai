# PulseAI — Agent System Context & Knowledge Base

This document serves as the primary **Context Document** for AI agents and engineers operating within the PulseAI repository. It provides full technical context on architecture, database schemas, quantitative models, market domain rules, and development guidelines.

---

## 1. System Overview

PulseAI is a high-conviction, real-time algorithmic market sentiment, conviction, and risk-management engine specifically designed for **NSE NIFTY 50 Options trading**. 

### Core Tenet
- PulseAI does **not** compute indicators per-user on demand.
- PulseAI runs a single **global 60-second cron cycle** on the backend during Indian market hours (09:15–15:30 IST, Mon–Fri).
- Every 60 seconds, the engine queries Upstox API v3 (or fallback NSE scraper), calculates 3 distinct engines (Legacy, V2, V3), persists rows to PostgreSQL, stores charts/snapshots in Redis, and broadcasts live tick events via Redis Pub/Sub & WebSockets.
- All client platforms (Next.js Web, Electron Desktop, Capacitor Android) tune into this identical synchronized feed.

---

## 2. Directory Structure & Key Files

### Backend (`/home/kaif/storage/MyProjects/pulse_ai_backend`)
```
pulse_ai_backend/
├── .agent/                       # Agent blueprints, problem analyses, workflows
│   ├── workflow.md               # End-to-end operational flow
│   ├── context.md                # System context & knowledge base (this file)
│   ├── v3_plan_blueprint.md      # V3 quantitative engine design document
│   ├── v2_engine_problems.md     # V2 mathematical issues & design analysis
│   └── signal-fine-tuning.md     # Verified signal tuning & state machine rules
├── prisma/
│   ├── schema.prisma             # PostgreSQL schema (Trade, V3, Legacy, State, Volumes, Users)
│   └── seed.ts                   # Initial DB seeds
├── src/
│   ├── server.ts                 # Express HTTP server + WebSocket server + Render keep-alive
│   ├── app.ts                    # Express app configuration, security middlewares, health check
│   ├── cron-worker.ts            # The 60-second background market engine worker
│   ├── auth/
│   │   └── upstox-auth.controller.ts # Upstox OAuth2 login & callback routes
│   ├── config/
│   │   ├── prisma.ts             # PrismaClient singleton with pg adapter
│   │   └── redis.ts              # Redis client factory & connections (ioredis)
│   ├── market-data/
│   │   ├── market-data.types.ts  # Types for option chains, Greeks, quotes
│   │   ├── market-data.provider.ts # Market data abstraction provider
│   │   └── upstox/               # Upstox v3 API clients, auth service, WebSocket Protobuf
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT verification middleware (header & cookie support)
│   │   ├── security.middleware.ts# Helmet, force HTTPS, honeypot bot protection, Zod validator
│   │   ├── rate-limiter.middleware.ts # express-rate-limit instances (API & Auth)
│   │   └── file-upload.middleware.ts # Restricts file uploads globally
│   ├── modules/
│   │   ├── auth/                 # User registration, login, logout
│   │   ├── trades/               # Trade retrieval (V2, V3, Legacy, Compare, Latest, Delete)
│   │   └── charts/               # Dynamic / cached SVG & PNG chart generators
│   ├── scripts/
│   │   ├── legacy_analyze.ts     # Engine 3: Classic rule-based engine
│   │   ├── v2_analyze.ts         # Engine 1: State machine & F&O scoring engine
│   │   └── v3_analyze.ts         # Engine 2: Volatility, Greeks, ATR risk, True OHLC engine
│   ├── sockets/
│   │   └── websocket.server.ts   # WebSocket server with JWT auth, Redis bridge & countdown
│   ├── utils/
│   │   ├── nse-client.util.ts    # Fallback NSE option chain scraper
│   │   ├── upstox-client.util.ts # Upstox API v3 client with Greek & quote grouping
│   │   ├── plotter.util.ts       # Server-side SVG chart generator (Trading, Aggression, MaxPain)
│   │   ├── serializer.util.ts    # BigInt & Decimal JSON serializer
│   │   └── response-sanitizer.util.ts # Strips sensitive fields, global error handler
│   └── workers/
│       └── market-calendar.helper.ts # IST time calculation, market open check, 2026 NSE holidays
├── tests/                        # Automated test suites for engines & market calendar
├── Dockerfile                    # Containerization definition
└── package.json                  # Dependencies & execution scripts
```

### Frontend (`/home/kaif/storage/MyProjects/pulse_ai_frontend`)
```
pulse_ai_frontend/
├── app/
│   ├── globals.css               # Global Tailwind CSS v4 styling & dark theme tokens
│   ├── layout.tsx                # App root layout with fonts and metadata
│   └── page.tsx                  # Main interactive dashboard (State, WS, Modals, Tabs)
├── components/
│   ├── AuthForm.tsx              # Login / Registration modal with 6-char username check
│   ├── NavigationHeader.tsx      # Top bar with market status, 60s countdown, logout
│   ├── LiveEngineCard.tsx        # Hero actionable signal card with parsed summary
│   ├── KPIStatsCards.tsx         # Key metric snapshot cards (Spot, PCR, Pain, Support, IV)
│   ├── UnifiedMultiEngineTable.tsx# Synchronized minute ticks across V3, V2, and Legacy
│   ├── TradeComparisonColumn.tsx # 4th column comparing individual ticks side-by-side
│   ├── CompareMetricsModal.tsx   # Detailed divergence analysis modal
│   ├── ExecutionFeedTable.tsx    # V2 Execution history table
│   ├── V3ExecutionFeedTable.tsx  # V3 Execution history table with Greeks
│   ├── LegacyExecutionFeedTable.tsx # Legacy Execution history table
│   ├── HistoricalTradesTable.tsx # Date-filtered session log review table
│   ├── InteractiveTradingChart.tsx # SVG price & PCR chart with zoom, drag, fullscreen
│   ├── InteractiveAggressionChart.tsx # SVG aggression chart
│   ├── InteractiveMaxPainChart.tsx # SVG max pain distribution chart
│   ├── TradeDetailsModal.tsx     # Full modal view of single trade indicators
│   └── parseSummary.ts           # Summary text parser & XSS sanitization helper
├── lib/
│   └── api.ts                    # Axios client instance, auth interceptor, API routes
├── types/
│   └── index.ts                  # TypeScript definitions for Trade, V3, Legacy models
├── main-electron.js              # Electron main process for Desktop packaging
└── capacitor.config.json         # Capacitor configuration for Android app packaging
```

---

## 3. Financial & Derivatives Domain Rules

Understanding these Indian derivative market principles is vital when modifying engine logic:

1. **Underlying Asset**: NIFTY 50 Index (`NSE_INDEX|Nifty 50`). Strike intervals are 50 points (e.g. 24800, 24850, 24900).
2. **Options Contract Types**:
   - `CE` (Call Option): Gives buyer right to buy index. Bullish bet.
   - `PE` (Put Option): Gives buyer right to sell index. Bearish bet.
3. **ATM (At-The-Money) Strike Selection**:
   - Strike closest to current Nifty spot price.
   - PulseAI uses volume-and-OI-weighted proximity scoring: `0.7 * volume_scaled + 0.3 * oi_scaled` for strikes within 0.5% of spot price.
4. **PCR (Put-Call Ratio)**:
   - Volume PCR = `Total PE Volume / Total CE Volume`.
   - OI PCR = `Total PE OI / Total CE OI`.
   - High PCR (> 1.2) indicates Put buying/writing dominance. Low PCR (< 0.8) indicates Call writing/buying dominance.
5. **Max Pain Theory**:
   - The strike price where option buyers as a collective lose the maximum amount of money upon expiry (and option writers profit most). Market price tends to gravitate toward Max Pain on expiry.
6. **IV Skew**:
   - Calculated as `Average PE IV - CE IV` around ATM. A positive skew indicates market participants are willing to pay a premium for downside protection (Puts).
7. **F&O Buildup Classifications**:
   - **Long Buildup**: Price $\uparrow$, OI $\uparrow$ (Aggressive fresh buying).
   - **Short Buildup**: Price $\downarrow$, OI $\uparrow$ (Aggressive short selling / writing).
   - **Short Covering**: Price $\uparrow$, OI $\downarrow$ (Sellers closing positions, fueling rally).
   - **Long Unwinding**: Price $\downarrow$, OI $\downarrow$ (Buyers dumping positions, accelerating drop).
8. **Option Greeks**:
   - **Delta ($\Delta$)**: Rate of change of option price per 1-point move in underlying.
   - **Gamma ($\Gamma$)**: Rate of change of Delta.
   - **Theta ($\Theta$)**: Time decay per day.
   - **Vega ($\nu$)**: Sensitivity to 1% change in implied volatility.
9. **Order Book Depth Imbalance**:
   - Total Bid Quantity vs Total Ask Quantity across the option chain:
     $$\text{Depth Imbalance} = \frac{\sum \text{Bids} - \sum \text{Asks}}{\sum \text{Bids} + \sum \text{Asks}}$$
   - Positive indicates buyer queue pressure; negative indicates seller queue pressure.

---

## 4. Engine Comparison Matrix (Legacy vs V2 vs V3)

| Feature / Dimension | Legacy Engine (`legacy_analyze.ts`) | V2 Engine (`v2_analyze.ts`) | V3 Engine (`v3_analyze.ts`) |
|---|---|---|---|
| **Primary Data Source** | Scraped option chain (LTP, OI, Chg OI) | Upstox option chain + Spot History | Upstox API v3 (LTP, OI, Greeks, Bid/Ask, Depth) + 1m OHLC + VIX |
| **Greeks & Order Depth** | ❌ None | ❌ None | ✅ ATM Delta, Spread, Depth Imbalance, Delta-Weighted OI Flow |
| **Technical Indicators** | ❌ None | Spot RSI(10), ADX(14) on synthetic spot moves | True RSI(10), True ADX(14) on 1m OHLC candles, ATR(14) |
| **State Machine** | ❌ None (Stateless rule-based) | ✅ `TradeState` (Hold tracking, 3-cycle cooldown, flip logic) | ✅ `TradeState` with ATR Risk (Stop-loss, Take-profit, Trailing stop) |
| **Entry Conviction** | Fixed sentiment score | Score $\ge 0.60$ (or $\le -0.60$) with ADX $> 20$ | Adaptive entry based on India VIX regime + Opening Session velocity |
| **Exit Mechanism** | Sentiment flip | Score $< 0.25$ or Reversal ($\pm 0.60$) or ADX $< 18$ | Dynamic Hysteresis ($0.15$), ATR Stop-loss, Trailing stop, Whipsaw filter |
| **PCR Interpretation** | Inverted / counter-intuitive | Normalized into composite score | Normalized with Delta-weighting |
| **Database Table** | `legacy_version_data` | `trades` | `v3_version_data` + `daily_minute_volumes` |

---

## 5. PostgreSQL Database Models (Prisma)

### `Trade` (V2 Engine Table)
- `id`: BigInt primary key.
- `timestamp`: DateTime (descending index).
- `spotPrice`: Decimal(10, 2).
- `pcr`: Decimal(4, 2).
- `maxPain`, `support`, `resistance`: Decimal(10, 2).
- `top3Support`, `top3Resistance`: Decimal[] array.
- `avgIvSkew`: Decimal(6, 4).
- `atmStrike`, `atmStraddleCost`: Decimal(10, 2).
- `totalCeChgOi`, `totalPeChgOi`, `totalCeVol`, `totalPeVol`: BigInt.
- `avgCeAggr`, `avgPeAggr`: Decimal(10, 2).
- `foScore`: Decimal(15, 2).
- `rsi`, `adx`: Decimal(5, 2).
- `spotTrend`, `emaTrend`, `longTermTrend`: VarChar(15).
- `score`: Decimal(5, 2).
- `sentiment`: VarChar(30).
- `signal`: VarChar(50) (e.g. `BUY CE`, `HOLD CE`, `EXIT CE (Reversal)`).
- `actionableSignal`: VarChar(100).
- `summary`: Text summary formatted as pipe-separated key-values.

### `V3VersionData` (V3 Engine Table)
Contains all core fields plus:
- `indiaVix`: Decimal(4, 2).
- `ceDelta`, `peDelta`: Decimal(4, 2).
- `ceSpread`, `peSpread`: Decimal(6, 4).
- `depthImbalance`: Decimal(4, 2).

### `LegacyVersionData` (Legacy Engine Table)
- Lightweight table: `id`, `timestamp`, `spotPrice`, `pcr`, `maxPain`, `support`, `resistance`, `spotTrend`, `sentiment`, `signal`, `summary`.

### `DailyMinuteVolume` (Volume Profile for R-Vol)
- `date`: VarChar (YYYY-MM-DD).
- `minuteOfDay`: Int (0 to 375, where 0 = 09:15 IST, 375 = 15:30 IST).
- `volume`: BigInt.
- Unique constraint on `[date, minuteOfDay]`.

### `TradeState` (Active State Machine Store)
- `key`: VarChar(50) (`active_state` for V2, `active_state_v3` for V3).
- `value`: JsonB storing `{ is_trade_open, open_trade_type, bars_held, cooldown_left, entry_strike, stopLossPrice, takeProfitPrice, ... }`.

### `User` (Authentication)
- `id`: UUID.
- `username`: VarChar(6) (strictly 6 characters).
- `passwordHash`: Bcrypt hash.

---

## 6. API Reference & Contract

### Authentication
- `POST /auth/register`: `{ username: string(6), password: string, hp_website?: "" }` -> `201 { message, user }`
- `POST /auth/login`: `{ username: string(6), password: string, hp_website?: "" }` -> `200 { message, token, user }` + sets `pulse_token` cookie
- `POST /auth/logout` -> `200 { message }` + clears cookie

### Trades
- `GET /trades?since=&date=&limit=400` -> `Trade[]`
- `GET /trades/v3?since=&date=&limit=400` -> `V3VersionTrade[]`
- `GET /trades/legacy?since=&date=&limit=400` -> `LegacyTrade[]`
- `GET /trades/compare?date=&limit=400` -> Synchronized array across all 3 engines
- `GET /trades/compare/details?timestamp=` -> Triplet `{ timestamp, v2, v3, legacy }`
- `GET /trades/latest` -> Single latest `Trade`
- `DELETE /trades/:id` -> `{ message: "Trade log deleted successfully" }`

### Charts
- `GET /charts/trading_plot?disable_spot=&disable_pcr=` -> PNG image
- `GET /charts/aggression_plot` -> PNG image
- `GET /charts/max_pain_plot` -> PNG image

### Health
- `GET /health` or `/api/market/status`:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-09-07T10:30:00.000Z",
    "market_status": { "is_open": true },
    "services": {
      "express_api": { "status": "ok", "uptime_seconds": 12450 },
      "database": { "status": "ok", "latency_ms": 3 },
      "redis": { "status": "ok", "latency_ms": 1 },
      "analysis_engine": { "status": "ok", "mode": "in_memory_typescript" }
    }
  }
  ```

---

## 7. Environment Variables Reference

### Backend (`pulse_ai_backend/.env`)
| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URI | `postgresql://user:pass@host:5432/pulse_ai` |
| `REDIS_URL` | Redis instance connection URI | `redis://localhost:6379` |
| `AUTH_SECRET` | Secret key for JWT signing & WebSocket auth | Strong alphanumeric key |
| `PORT_API` | Express REST HTTP port | `4000` |
| `PORT_WS` | WebSocket & API unified port | `3001` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `UPSTOX_CLIENT_ID` | Upstox developer app API key | Alphanumeric API Key |
| `UPSTOX_CLIENT_SECRET`| Upstox developer app secret | Alphanumeric Secret |
| `UPSTOX_ACCESS_TOKEN` | Current authorized Upstox access token | Bearer Token |
| `RENDER_EXTERNAL_URL` | Public deployment URL for keep-alive self-ping | `https://pulse-ai-backend.onrender.com` |
| `PULSE_ENTRY_SCORE` | Conviction score required to trigger a Buy | `0.60` |
| `PULSE_EXIT_SCORE` | Conviction score drop that triggers an Exit | `0.25` |
| `PULSE_COOLDOWN_CYCLES` | Wait period in minutes after exit before new entry | `3` |
| `PULSE_MIN_HOLD_CYCLES` | Minimum minutes to hold position against noise | `3` |
| `PULSE_ADX_THRESHOLD` | Minimum trend strength required for entry | `20.0` |
| `PULSE_ADX_EXIT_THRESHOLD` | Trend strength below which position exits | `18.0` |

### Frontend (`pulse_ai_frontend/.env`)
| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend Express REST Base URL | `http://localhost:4000` |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket Server URL | `ws://localhost:3001` |

---

## 8. Critical Rules of Engagement for Agents

1. **Serialization Integrity**:
   - PostgreSQL `trades` table uses `BigInt` (for option volume/OI) and `Decimal` (for prices and scores).
   - Standard `JSON.stringify` throws a `TypeError: Do not know how to serialize a BigInt`.
   - **Always** wrap data returned from Prisma with `serializeData(data)` from `src/utils/serializer.util.ts`.
2. **Timezone Awareness**:
   - NSE operates strictly on India Standard Time (`Asia/Kolkata`, UTC+5:30).
   - Never use `new Date().toISOString().split("T")[0]` for market date checks because after 18:30 UTC / 00:00 IST the UTC date lags or leads.
   - Always use `getISTDateStr()` from `src/workers/market-calendar.helper.ts`.
3. **Redis Key Date-Scoping**:
   - Never read from or write to un-scoped snapshot keys. Snapshots are stored as `pulse_ai:last_snapshot:${istDateStr}` to prevent cross-day contamination.
4. **Cron Concurrency Lock**:
   - The cron worker relies on `pulse_ai:overlap_lock` with a 55-second TTL. Do not remove this lock without ensuring another distributed mutex is active.
5. **Next.js 16 & React 19 Caveats**:
   - All interactive components using hooks (`useState`, `useEffect`, `useRef`) must start with `"use client";`.
   - React 19 handles refs and hydration strictly; avoid accessing `localStorage` outside of client-side `useEffect` hooks.
