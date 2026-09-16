# PulseAI — End-to-End System Workflow

This document provides a comprehensive operational blueprint of the entire PulseAI platform across **Backend (`pulse_ai_backend`)** and **Frontend (`pulse_ai_frontend`)**. It details the exact sequence of events, data pipelines, state transitions, broadcasting mechanisms, buffer synchronization, and client-side ingestion paths.

---

## 1. High-Level Architecture Workflow

PulseAI operates on a **buffered global tick architecture**. Market data is fetched, calculated, and buffered server-side once every 60 seconds during active Indian market hours (9:15 AM – 3:30 PM IST), completely independent of how many users are logged in. Clients consume the live WebSocket broadcast, while database writes are decoupled via micro-batches and End-of-Day (EOD) flushes.

```mermaid
flowchart TD
    subgraph Market_Schedule [Market Calendar & Lock Guard]
        A[Cron Trigger Every Minute] --> B{Market Open? 09:15-15:30 IST & Mon-Fri & No Holiday}
        B -- No --> C[Log: Market Closed. Skip Cycle]
        B -- Yes --> D[Acquire Redis Lock: pulse_ai:overlap_lock EX 55s]
        D -- Lock Failed --> E[Log: Previous Cycle Running. Overlap Prevented]
    end

    subgraph Data_Ingestion [Data Ingestion Pipeline]
        D -- Lock Acquired --> F[Parallel Ingestion]
        F --> G[Upstox API v3: Option Chain Nifty 50]
        F --> H[Upstox API: India VIX]
        F --> I[Upstox API: 1m Nifty Spot Candles]
        G -- Fallback if Upstox fails --> J[NSE Scraper Client]
        I -- < 60 Candles --> K[Preload Historical Warmup Candles]
    end

    subgraph State_Preload [Zero-DB State Preloading]
        D --> L[Fetch Today's History from In-Memory Buffer / Redis]
        D --> M[Fetch Date-Scoped Redis Snapshot: pulse_ai:last_snapshot:YYYY-MM-DD]
        D --> N[Fetch Active Trade States: In-Memory Cache]
    end

    subgraph Engines [Triple-Engine Execution]
        G & H & I & L & M & N --> O1[Engine 1: V2 Analysis Engine]
        G & H & I & L & M & N --> O2[Engine 2: V3 Volatility & Risk Engine]
        G & L & M --> O3[Engine 3: Legacy Rule-Based Engine]
    end

    subgraph Persistence [Multi-Tier Buffer & Batch Persistence]
        O1 & O2 & O3 --> P1[Tier 1: In-Memory Rolling Window < 500 ticks]
        O1 & O2 & O3 --> P2[Tier 2: Append-Only Local File data/signals-YYYY-MM-DD.jsonl]
        O1 & O2 & O3 --> P3[Tier 3: Redis Lists pulse_ai:buffer:queue EX 48h]
        P1 --> P4{Flush Trigger? Every 10 Cycles or EOD 15:31 IST or Manual Sync}
        P4 -- Yes --> P5[Postgres Parallel createMany via withDbRetry]
    end

    subgraph Realtime_Broadcast [WebSocket Real-Time Distribution]
        P1 --> Q1[Redis Pub/Sub: pulse_ai:trades:new]
        P1 --> Q2[Redis Pub/Sub: pulse_ai:trades_v3:new]
        P1 --> Q3[Redis Pub/Sub: pulse_ai:trades_legacy:new]
        Q1 & Q2 & Q3 --> R[Node.js WebSocket Server Listener]
        R --> S[Broadcast to Connected WS Clients with JWT Verification]
        R --> T[1-Second Heartbeat Pulse: countdown:tick]
    end

    subgraph Frontend_App [Frontend Modular Next.js Client]
        S --> U1[useMarketFeed Hook: Live Stream & Gap Backfilling]
        T --> U2[NavigationHeader: 60s Circular Countdown & Buffer Badge]
        U1 --> U3[OverviewView: Hero Card, KPIs, Unified Multi-Engine Table]
        U3 --> U4[TradeComparisonColumn: 4th Column Instant Tick Comparison]
        U1 --> U5[Lazy ChartsView: Interactive SVG Charts via useChartZoomPan]
        U1 --> U6[Lazy HistoryView: Calendar Date Lookup]
    end
```

---

## 2. 60-Second Background Market Ingestion Cycle

Every 60 seconds, `src/cron-worker.ts` executes the following sequential steps:

### Step 1: Calendar Validation & Overlap Mutex
1. Checks whether the current time is within Indian market hours (09:15 to 15:30 IST), weekday (Mon–Fri), and not an official NSE trading holiday.
2. Acquires distributed Redis lock `pulse_ai:overlap_lock` with a 55-second TTL. If previous execution is still running, current cycle is skipped cleanly.

### Step 2: Parallel Market Data Ingestion
1. Queries Upstox API v3 for:
   - Complete NIFTY 50 Option Chain (LTP, OI, Greeks, bid/ask depth).
   - India VIX index level.
   - 1-minute historical spot candles for true OHLC indicator calculations.
2. If Upstox API fails or rate-limits, falls back to the automated NSE scraper client (`src/utils/nse-client.util.ts`).

### Step 3: Zero-DB State Preloading
1. Fetches today's trade history directly from the in-memory `TradesBufferService` (or Redis `pulse_ai:buffer:v3:YYYY-MM-DD`).
2. Zero PostgreSQL queries are issued during active minute cycles.

### Step 4: Triple-Engine Calculations
1. **Engine 1: V2 Analysis (`src/scripts/v2_analyze.ts`)**:
   - Calculates volume PCR, OI PCR, Max Pain, Support/Resistance levels.
   - Updates state machine (`active_state`) with hold cycles and cooldowns.
2. **Engine 2: V3 Volatility & Risk Engine (`src/scripts/v3_analyze.ts`)**:
   - Evaluates India VIX regime, Greeks (Delta, spreads), and depth order flow imbalance.
   - Calculates true RSI(10), ADX(14), and ATR(14) on 1-minute OHLC candles.
   - Manages dynamic ATR stop-losses, take-profits, and trailing stops.
3. **Engine 3: Legacy Rule-Based Engine (`src/scripts/legacy_analyze.ts`)**:
   - Computes classic rule-based PCR heuristics.

### Step 5: Multi-Tier Buffer Storage
Instead of issuing individual `INSERT` queries to PostgreSQL every minute, signals are written to:
- **Tier 1 (In-Memory)**: Rolling array in `TradesBufferService` (< 500 items) serving live reads in `< 1ms`.
- **Tier 2 (Append-Only Disk)**: `data/signals-YYYY-MM-DD.jsonl` ensuring zero data loss across process restarts.
- **Tier 3 (Redis Queue)**: Redis list `pulse_ai:buffer:queue` for cluster persistence.

### Step 6: Micro-Batch & EOD Database Persistence
1. Every 10 cron cycles (~10 minutes), the buffer flushes pending rows in parallel using pooler-safe `createMany`.
2. At **15:31 IST** (market close), an automated EOD cron job (`31 15 * * 1-5`) executes a final sync to PostgreSQL.
3. Process shutdown handlers (`SIGINT`, `SIGTERM`) guarantee that all buffered signals are flushed before exit.

### Step 7: Real-Time Broadcast
1. Emits Redis Pub/Sub messages (`pulse_ai:trades:new`, `pulse_ai:trades_v3:new`, `pulse_ai:trades_legacy:new`).
2. WebSocket server broadcasts events to all authenticated client connections.

---

## 3. Frontend Client Architecture & Data Flow

Built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS**, the client application has been optimized for speed, modularity, and zero layout shift.

```mermaid
sequenceDiagram
    autonumber
    actor Trader as Trader / User
    participant App as Next.js Dashboard (app/page.tsx)
    participant Auth as useAuth Hook
    participant Feed as useMarketFeed Hook
    participant History as useHistoryData Hook
    participant API as Backend REST API
    participant WS as WebSocket Server

    Trader->>App: Open Application
    App->>Auth: Check Auth State (localStorage / cookie)
    alt Not Logged In
        Auth-->>App: isAuthenticated = false
        App-->>Trader: Render AuthForm (Username/Password)
    else Authenticated
        Auth-->>App: isAuthenticated = true, token
        App->>Feed: Initialize Market Stream (token)
        
        par Parallel Cold-Start
            Feed->>API: GET /trades/v3?limit=500&date=today (Fast-Cache < 2ms)
            Feed->>API: GET /trades?limit=500&date=today
            Feed->>API: GET /trades/legacy?limit=500&date=today
            Feed->>WS: Connect WebSocket (token)
        end

        API-->>Feed: Return Today's Buffered History
        Feed-->>App: Update v3Trades, trades, legacyTrades, latestTrade
        App-->>Trader: Transition from Skeletons to Live OverviewView (< 100ms)

        WS-->>Feed: Welcome & Connection Established
        Feed->>API: Gap Backfill: GET /trades/v3?since=lastTradeId

        loop 1-Minute Live Broadcast
            WS-->>Feed: trade_v3:new / trade:new / trade_legacy:new
            Feed-->>App: Prepend new tick, slice to 500 max
            App-->>Trader: LiveEngineCard & UnifiedMultiEngineTable update
            WS-->>Feed: countdown:tick (secondsRemaining)
            Feed-->>App: Update NavigationHeader Countdown
        end

        opt Manual DB Sync
            Trader->>App: Click "Buffer: N Pending [Sync]"
            App->>API: POST /trades/buffer/flush
            API-->>App: 200 OK (N Rows Flushed to Postgres)
            App-->>Trader: Show "✓ DB Synced"
        end

        opt Historical Date Lookup
            Trader->>App: Switch to "History" Tab & Select Date
            App->>History: setHistoryDate("YYYY-MM-DD")
            History->>API: GET /trades?date=YYYY-MM-DD (Queries PostgreSQL)
            API-->>History: Historical Trade Rows
            History-->>App: Render HistoricalTradesTable
        end
    end
```

### 1. State Isolation via Custom Hooks
- **`hooks/useAuth.ts`**: Handles token persistence, login, registration with 6-character validation, and session termination.
- **`hooks/useMarketFeed.ts`**: Manages the live WebSocket connection, auto-reconnection with backoff, gap backfilling, countdown ticks, and multi-engine live state arrays.
- **`hooks/useHistoryData.ts`**: Manages calendar date selection, querying historical sessions from PostgreSQL, and log deletion.
- **`hooks/useChartZoomPan.ts`**: Reusable hook handling mouse wheel zooming, mouse dragging/panning, SVG coordinate projections, zoom range slider, and fullscreen modal toggle.

### 2. Code-Splitting & Skeleton Screens
- `app/page.tsx` is an orchestrator (~180 lines). Heavy views are dynamically imported with `next/dynamic`:
  - `ChartsView`: Lazy-loaded with `<ChartSkeleton />`.
  - `HistoryView`: Lazy-loaded with `<TableSkeleton rows={10} />`.
  - `V3ExecutionFeedTable`: Lazy-loaded with `<TableSkeleton rows={8} />`.
  - `LegacyExecutionFeedTable`: Lazy-loaded with `<TableSkeleton rows={8} />`.
  - `TradeDetailsModal` and `SentimentModal`: Loaded on demand when requested.
- Guarantees **Cumulative Layout Shift (CLS = 0)** and instant initial page load.

### 3. Clean, Zero-Emoji UI Design
- All informal emojis (`⚡`, `🏛️`, `📊`, `📁`, `📦`, `🎉`) have been eliminated.
- Native, featherlight SVG icons (`components/common/Icons.tsx`) provide an institution-grade, distraction-free aesthetic.
- Color theming is centralized in `lib/trade-utils.ts` via `getSignalTheme()`:
  - Bullish: High-contrast emerald accents (`BUY CE`, `HOLD CE`).
  - Bearish: High-contrast rose accents (`BUY PE`, `HOLD PE`).
  - Exit: Purple accents (`EXIT`).
  - Neutral: Zinc tones (`HOLD`, `Sideways`).

### 4. Real-Time Buffer Status & Manual Sync
- `NavigationHeader.tsx` polls `GET /trades/buffer/status` every 20s and on every minute boundary tick.
- Displays buffer state:
  - `Buffer: N Pending [Sync]`: Indicates uncommitted memory ticks. Clicking triggers an immediate batch flush to PostgreSQL.
  - `✓ DB Synced`: Confirms all ticks are persisted to PostgreSQL.

---

## 4. Multi-Platform Distribution Workflow

The frontend code builds into three production distributions:
1. **Web (Next.js)**: Runs on browser via Turbopack build (`npm run build` -> `next start`).
2. **Desktop (Electron)**: Packaged via `main-electron.js` into cross-platform desktop installers (`npm run electron`).
3. **Mobile (Capacitor / Android)**: Configured in `capacitor.config.json` with App ID `com.pulseai.app`, builds native Android APK packages.
