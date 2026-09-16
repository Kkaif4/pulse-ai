# PulseAI — Agent System Context & Knowledge Base

This document serves as the primary **Context Document** for AI agents and engineers operating within the PulseAI repository. It provides full technical context on architecture, database schemas, quantitative models, market domain rules, and development guidelines.

---

## 1. System Overview

PulseAI is a high-conviction, real-time algorithmic market sentiment, conviction, and risk-management engine specifically designed for **NSE NIFTY 50 Options trading**. 

### Core Tenet
- PulseAI does **not** compute indicators per-user on demand.
- PulseAI runs a single **global 60-second cron cycle** on the backend during Indian market hours (09:15–15:30 IST, Mon–Fri).
- Every 60 seconds, the engine queries Upstox API v3 (or fallback NSE scraper), calculates 3 distinct engines (Legacy, V2, V3), buffers signals into a high-speed multi-tier cache (In-Memory rolling window, append-only JSONL, Redis list), and broadcasts live tick events via Redis Pub/Sub & WebSockets.
- Database writes are decoupled: micro-batch flushed every 10 cycles (~10 min) and finalized at End-of-Day (EOD, 15:31 IST), reducing remote PostgreSQL calls by >95%.
- All client platforms (Next.js Web, Electron Desktop, Capacitor Android) consume this identical synchronized live feed.

---

## 2. Directory Structure & Key Files

### Backend (`/home/kaif/storage/MyProjects/pulse_ai_backend`)
```
pulse_ai_backend/
├── .agent/                       # Agent blueprints, problem analyses, workflows
│   ├── workflow.md               # End-to-end operational flow
│   ├── context.md                # System context & knowledge base
│   ├── v3_plan_blueprint.md      # V3 quantitative engine design document
│   ├── v2_engine_problems.md     # V2 mathematical issues & design analysis
│   └── signal-fine-tuning.md     # Verified signal tuning & state machine rules
├── prisma/
│   ├── schema.prisma             # PostgreSQL schema (Trade, V3, Legacy, State, Volumes, Users)
│   └── seed.ts                   # Initial DB seeds
├── src/
│   ├── server.ts                 # Express HTTP server + WebSocket server + Render keep-alive
│   ├── app.ts                    # Express app configuration, security middlewares, health check
│   ├── cron-worker.ts            # The 60-second market engine worker (Zero-DB cron, micro-batch flush, EOD sync)
│   ├── auth/
│   │   └── upstox-auth.controller.ts # Upstox OAuth2 login & callback routes
│   ├── config/
│   │   ├── prisma.ts             # PrismaClient singleton with pg adapter
│   │   └── redis.ts              # Redis client factory & connections (ioredis)
│   ├── market-data/
│   │   ├── market-data.types.ts  # Types for option chains, Greeks, quotes
│   │   ├── market-data.provider.ts # Market data abstraction provider
│   │   ├── trades-buffer.service.ts # Triple-tier buffer (Memory + JSONL + Redis) & batch flusher
│   │   └── upstox/               # Upstox v3 API clients, auth service, WebSocket Protobuf
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT verification middleware (header & cookie support)
│   │   ├── security.middleware.ts# Helmet, force HTTPS, honeypot bot protection, Zod validator
│   │   ├── rate-limiter.middleware.ts # express-rate-limit instances (API & Auth)
│   │   └── file-upload.middleware.ts # Restricts file uploads globally
│   ├── modules/
│   │   ├── auth/                 # User registration, login, logout
│   │   ├── trades/               # Trade retrieval (Fast-cache today's data, historical DB queries, buffer status/flush)
│   │   └── charts/               # Dynamic / cached SVG & PNG chart generators
│   ├── scripts/
│   │   ├── legacy_analyze.ts     # Engine 3: Classic rule-based engine
│   │   ├── v2_analyze.ts         # Engine 1: State machine & F&O scoring engine
│   │   └── v3_analyze.ts         # Engine 2: Volatility, Greeks, ATR risk, True OHLC engine
│   ├── sockets/
│   │   └── websocket.server.ts   # WebSocket server with JWT auth, Redis bridge & countdown
│   └── utils/
│       ├── nse-client.util.ts    # Fallback NSE option chain scraper
│       ├── upstox-client.util.ts # Upstox API v3 client with Greek & quote grouping
│       ├── plotter.util.ts       # Server-side SVG chart generator (Trading, Aggression, MaxPain)
│       ├── serializer.util.ts    # BigInt & Decimal JSON serializer
│       └── response-sanitizer.util.ts # Strips sensitive fields, global error handler
└── tests/                        # Automated test suites for engines, buffer, and calendar
```

### Frontend (`/home/kaif/storage/MyProjects/pulse_ai_frontend`)
```
pulse_ai_frontend/
├── app/
│   ├── globals.css               # Global Tailwind CSS styling & dark theme tokens
│   ├── layout.tsx                # App root layout with fonts and metadata
│   └── page.tsx                  # Slim modular dashboard (~180 lines, dynamic views, modal state)
├── hooks/
│   ├── useAuth.ts                # Authentication lifecycle, credentials, login/register/logout
│   ├── useMarketFeed.ts          # WebSocket stream, auto-reconnect, live state, gap backfilling
│   ├── useHistoryData.ts         # Historical calendar lookup state and trade deletion
│   └── useChartZoomPan.ts        # Reusable wheel zoom, mouse drag pan, fullscreen toggle
├── components/
│   ├── views/
│   │   ├── OverviewView.tsx      # Main workspace (hero card, KPIs, multi-engine table & comparison)
│   │   ├── ChartsView.tsx        # Lazy-loaded SVG technical charts with V3/V2 engine switcher
│   │   └── HistoryView.tsx       # Lazy-loaded date picker & historical session review table
│   ├── modals/
│   │   └── SentimentModal.tsx    # Dedicated sentiment breakdown modal
│   ├── common/
│   │   ├── Icons.tsx             # Clean native SVG icons replacing all emojis across the UI
│   │   └── Skeletons.tsx         # Shimmer pulse loading screens (LiveCard, KPI, Table, Chart)
│   ├── AuthForm.tsx              # Login / Registration form with Next.js Image and bot protection
│   ├── NavigationHeader.tsx      # Top bar (market status, 60s countdown, DB buffer sync badge, logout)
│   ├── LiveEngineCard.tsx        # Hero actionable signal card using centralized getSignalTheme
│   ├── KPIStatsCards.tsx         # Key metric snapshot cards (Spot, PCR, Pain, Support, IV)
│   ├── UnifiedMultiEngineTable.tsx # Synchronized multi-engine minute ticks (memoized grouping)
│   ├── TradeComparisonColumn.tsx # 4th column comparing individual ticks side-by-side
│   ├── V3ExecutionFeedTable.tsx  # Dedicated V3 execution history table
│   ├── LegacyExecutionFeedTable.tsx # Dedicated Legacy execution history table
│   ├── HistoricalTradesTable.tsx # Date-filtered session log review table
│   ├── InteractiveTradingChart.tsx # SVG spot & PCR chart powered by useChartZoomPan
│   ├── InteractiveAggressionChart.tsx # SVG aggression chart powered by useChartZoomPan
│   ├── InteractiveMaxPainChart.tsx # SVG max pain level chart powered by useChartZoomPan
│   └── TradeDetailsModal.tsx     # Full modal view of single trade indicators
├── lib/
│   ├── api.ts                    # Axios client, auth interceptor, buffer status/flush endpoints
│   └── trade-utils.ts            # Centralized signal theming, IST date calculations, summary parsing
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
   - Volume-and-OI-weighted proximity scoring: `0.7 * volume_scaled + 0.3 * oi_scaled` for strikes within 0.5% of spot price.
4. **PCR (Put-Call Ratio)**:
   - Volume PCR = `Total PE Volume / Total CE Volume`.
   - Open Interest PCR = `Total PE OI / Total CE OI`.
5. **India VIX Regimes**:
   - Normal Volatility ($12 \le \text{VIX} < 18$).
   - High Volatility ($\text{VIX} \ge 18$).
   - Low Volatility ($\text{VIX} < 12$).
6. **Order Flow & Greeks**:
   - $\text{Depth Imbalance} = \frac{\sum \text{Bids} - \sum \text{Asks}}{\sum \text{Bids} + \sum \text{Asks}}$. Positive indicates buyer pressure; negative indicates seller pressure.

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
| **Persistence** | Multi-tier buffer -> Batch flush | Multi-tier buffer -> Batch flush | Multi-tier buffer -> Batch flush |
| **Database Table** | `legacy_version_data` | `trades` | `v3_version_data` + `daily_minute_volumes` |

---

## 5. PostgreSQL Database Models (Prisma)

### `Trade` (V2 Engine Table)
- `id`: BigInt primary key.
- `timestamp`: DateTime (descending index).
- `spotPrice`, `pcr`, `maxPain`, `support`, `resistance`: Decimal.
- `top3Support`, `top3Resistance`: Decimal[] array.
- `avgIvSkew`, `atmStrike`, `atmStraddleCost`: Decimal.
- `totalCeChgOi`, `totalPeChgOi`, `totalCeVol`, `totalPeVol`: BigInt.
- `avgCeAggr`, `avgPeAggr`, `foScore`, `rsi`, `adx`, `score`: Decimal.
- `spotTrend`, `emaTrend`, `longTermTrend`, `sentiment`, `signal`, `actionableSignal`: VarChar.
- `summary`: Text summary formatted as pipe-separated key-values.

### `V3VersionData` (V3 Engine Table)
Contains all core fields plus:
- `indiaVix`, `ceDelta`, `peDelta`, `ceSpread`, `peSpread`, `depthImbalance`: Decimal.

### `LegacyVersionData` (Legacy Engine Table)
- Lightweight table: `id`, `timestamp`, `spotPrice`, `pcr`, `maxPain`, `support`, `resistance`, `spotTrend`, `sentiment`, `signal`, `summary`.

### `DailyMinuteVolume` (Volume Profile for R-Vol)
- `date`: VarChar (YYYY-MM-DD), `minuteOfDay`: Int (0 to 375), `volume`: BigInt.

### `TradeState` (Active State Machine Store)
- `key`: VarChar(50) (`active_state` for V2, `active_state_v3` for V3).
- `value`: JsonB storing `{ is_trade_open, open_trade_type, bars_held, cooldown_left, entry_strike, stopLossPrice, takeProfitPrice, ... }`.

### `User` (Authentication)
- `id`: UUID, `username`: VarChar(6) (strictly 6 characters), `passwordHash`: Bcrypt hash.

---

## 6. API Reference & Contract

### Authentication
- `POST /auth/register`: `{ username: string(6), password: string, hp_website?: "" }` -> `201 { message, user }`
- `POST /auth/login`: `{ username: string(6), password: string, hp_website?: "" }` -> `200 { message, token, user }` + sets `pulse_token` cookie
- `POST /auth/logout` -> `200 { message }` + clears cookie

### Trades & Buffer
- `GET /trades?since=&date=&limit=400` -> `Trade[]` (served from memory/Redis for today; PostgreSQL for past dates)
- `GET /trades/v3?since=&date=&limit=400` -> `V3VersionTrade[]` (served from memory/Redis for today; PostgreSQL for past dates)
- `GET /trades/legacy?since=&date=&limit=400` -> `LegacyTrade[]` (served from memory/Redis for today; PostgreSQL for past dates)
- `GET /trades/compare?date=&limit=400` -> Synchronized array across all 3 engines
- `GET /trades/compare/details?timestamp=` -> Triplet `{ timestamp, v2, v3, legacy }`
- `GET /trades/latest` -> Single latest `V3VersionTrade` / `Trade`
- `GET /trades/buffer/status` -> `{ status: "ok", pendingQueueCount: number }`
- `POST /trades/buffer/flush` -> `{ message: "Buffer flushed successfully", result: { flushedV2, flushedV3, flushedLegacy, flushedVolume } }`
- `DELETE /trades/:id` -> `{ message: "Trade log deleted successfully" }` (deletes from both buffer and PostgreSQL)

---

## 7. Frontend Architecture & Design Standards

1. **Zero-Emoji Policy**:
   - Never use emojis (`⚡`, `🏛️`, `📊`, `📁`, `📦`, `🎉`) in UI components or notifications.
   - Use clean, featherlight SVG icons from `components/common/Icons.tsx`.
2. **Modular View Separation**:
   - `app/page.tsx` is an orchestrator (~180 lines) delegating state to `hooks/` and views to `components/views/`.
   - Dynamic lazy-loading via `next/dynamic` with tailored `<Skeletons />` eliminates initial bundle bloat and prevents layout shift (CLS = 0).
3. **Centralized Theming & Formatting**:
   - Use `lib/trade-utils.ts` for `getSignalTheme()` (badges, borders, text colors), `formatTime()`, and `parseSummary()`.
   - Never duplicate color classes or time math across components.
4. **Resilient Charting**:
   - Chart zoom, pan, and fullscreen logic is centralized in `hooks/useChartZoomPan.ts`.
5. **Buffer Synchronization UI**:
   - `NavigationHeader.tsx` provides real-time visibility into the backend's `pendingQueueCount` and allows users to trigger a manual batch sync on demand.
