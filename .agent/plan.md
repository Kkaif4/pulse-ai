# pulseAI — MVP FRD & Architecture

**Core model:** one global trade feed, computed server-side every minute during market hours, independent of who's online. Users just tune in.

---

## 1. Functional Requirements

| # | Requirement |
|---|---|
| 1 | System fetches NIFTY data from NSE API every 60s, **only** during 9:15–15:30 IST, Mon–Fri |
| 2 | Fetch/analyze/store runs regardless of any user being online |
| 3 | Each cycle produces one **trade record**, stored permanently in Postgres |
| 4 | All users see the same trade data — no per-user computation |
| 5 | On login/app open, user instantly gets the latest trade record (no waiting for next cycle) |
| 6 | After initial load, client opens a WebSocket and receives new trades pushed live, no polling |
| 7 | Client keeps a local (in-memory, session-only) list of trades received since it joined |
| 8 | User can query any specific past trade / trade history via a normal REST call (not socket) |
| 9 | Basic auth only — identify the user, nothing elaborate |
| 10 | Same backend serves Web (Next.js), Desktop (Electron), Android (Capacitor/WebView) |

---

## 2. Architecture

```
                    ┌────────────────────────────────────┐
                    │   Node-cron (in Node backend)       │
                    │   fires every 60s, 9:15–15:30 IST,  │
                    │   Mon–Fri, skips NSE holidays        │
                    └───────────────┬──────────────────────┘
                                    │ POST /analyze (internal secret header)
                                    ▼
                    ┌────────────────────────────────────┐
                    │        FastAPI (Python worker)      │
                    │  fetch_option_chain → analyze →     │
                    │  score → return JSON                 │
                    └───────────────┬──────────────────────┘
                                    │ JSON trade record
                                    ▼
                    ┌────────────────────────────────────┐
                    │     Node/NestJS Backend             │
                    │  1. INSERT into Postgres `trades`   │
                    │  2. Broadcast `trade:new` via WS     │
                    └───────┬─────────────────┬────────────┘
                            │                 │
                REST (login,│                 │ WebSocket
                latest, hist)│                (live push)
                            ▼                 ▼
              ┌───────────────────────────────────────┐
              │   Web (Next.js) / Electron (desktop) / │
              │   Android (Capacitor/WebView)          │
              │   — same client code, 3 shells         │
              └─────────────────────────────────────────┘
```

**Key principle:** the cron is the only thing that writes trades. Clients only ever *read*.

---

## 3. Request/Data Flow

**Every minute (market hours only):**
```
cron tick → check overlap lock (Redis SETNX) → POST FastAPI /analyze
→ NSE fetch → compute indicators + signal → return JSON
→ Node inserts row into `trades` → release lock → broadcast WS `trade:new`
```

**User opens app:**
```
GET /trades/latest  → instant render, no wait
   ↓
open WebSocket connection
   ↓
receive `trade:new` events as they happen, append to local in-memory list
```

**User wants a specific/past trade:**
```
GET /trades/:id
GET /trades?from=...&to=...
```
Plain REST — never over the socket. Socket is push-only for *new* trades.

---

## 4. Database Schema (Postgres)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE trades (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT now(),
  spot_price NUMERIC(10,2) NOT NULL,
  pcr NUMERIC(4,2),
  max_pain NUMERIC(10,2),
  support NUMERIC(10,2),
  resistance NUMERIC(10,2),
  rsi NUMERIC(5,2),
  adx NUMERIC(5,2),
  score NUMERIC(5,2),
  sentiment VARCHAR(30),
  signal VARCHAR(50),
  actionable_signal VARCHAR(100),
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);
```

No per-user trade data, no session table needed — auth is basic (see below).

---

## 5. Auth (kept intentionally minimal)

- Email + password → bcrypt/argon2id hash. **Never skip hashing**, even for a "basic" auth — it costs nothing extra to do right.
- On login: issue a JWT (7-day expiry is fine for MVP). No session revocation, no device tracking, no "single login" logic — you said this isn't important, so it's cut entirely from doc 1's original plan.
- Client stores token: `httpOnly` cookie for Web, secure storage (Keychain/EncryptedSharedPreferences via Capacitor plugin) for Android, similarly for Electron. Avoid `localStorage` for the token if you can — XSS-exposed.
- WebSocket connect: pass JWT as a query param or first message; verify it, then accept. Doesn't need to be elaborate — just don't leave the socket wide open to anonymous connections.

---

## 6. Security (right-sized for MVP, not enterprise)

**Must-do (cheap, prevents real damage):**
1. Hash passwords properly (bcrypt/argon2id) — table stakes regardless of auth "importance"
2. FastAPI worker **never exposed publicly** — only reachable from Node, on internal network/localhost/VPC, gated by a shared secret header
3. HTTPS everywhere (Node, FastAPI if ever exposed, WS as `wss://`)
4. Basic rate limit on `/auth/login` (e.g. 5 attempts/15min per IP) — prevents brute force with near-zero effort
5. Validate all query params (`from`, `to`, `id`) with a schema (Zod/class-validator) before hitting Postgres — parameterized queries via your ORM already stop SQL injection, just don't string-concat raw SQL anywhere
6. Overlap lock on the cron (Redis `SETNX` with TTL) — without this, a slow NSE response causes duplicate/overlapping runs and duplicate trade rows

**Should-do (still cheap, do before real users touch it):**
7. Disclaimer text shown before signals ("educational purposes, not investment advice") — signals like BUY/SELL shown publicly in India can brush up against SEBI Research Analyst regulations; a disclaimer + not accepting payment for signals keeps you out of that territory at MVP stage
8. Log NSE fetch failures (don't crash silently) — even a simple `console.error` + skip-this-minute is enough for now
9. Env vars / `.env` (gitignored) for NSE API key, DB creds, JWT secret, internal FastAPI secret — never commit these

**Explicitly deferred (correctly, for MVP):**
- Session/device management, "logout all devices"
- Broker integration security (encryption at rest for broker tokens) — irrelevant until you actually connect a broker
- Horizontal WS scaling (Redis pub/sub across instances) — irrelevant at 1 Node instance

---

## 7. Holes Still Worth Deciding Now (cheap to decide, expensive to retrofit)

1. **NSE holiday calendar** — your cron checks day-of-week + time window, but NSE has ~15 holidays/year. Without a holiday list, the cron will try (and fail) to fetch on those days. Hardcode a static list for MVP, refresh yearly.
2. **What happens on a failed fetch mid-cycle?** Decision: log it, skip that minute, don't insert a partial/broken row. Confirm this is what you want.
3. **Duplicate WS delivery on reconnect** — if a client's socket drops for 30s and reconnects, they missed those trades. Fix: on WS connect, always call `GET /trades/latest` (or `?since=<last_seen_id>`) first to backfill the gap, *then* start listening live. This is already implied by your flow (point 5) but make sure the client actually implements the backfill call on every reconnect, not just first load.
4. **Signal terminology** — decide now whether the exposed signal is literally `BUY`/`SELL`/`STRONG BUY` or a softer `bullish`/`bearish`/`score: 72`. Softer wording reduces the SEBI-adjacent risk in point 7 above and costs nothing to change now vs. later.

---

## 8. Build Order (nothing more, in this order)

1. Postgres `users` + `trades` tables
2. FastAPI `/analyze` behind internal secret, callable manually first (curl it, confirm output shape)
3. Node cron + overlap lock + insert into `trades` — verify it runs unattended for a full market day
4. `POST /auth/register`, `POST /auth/login`, `GET /trades/latest`, `GET /trades/:id`
5. WebSocket server + broadcast on new trade + reconnect-backfill
6. Next.js client (web) wired to the above
7. Wrap the same Next.js build with Capacitor for Android
8. Electron shell for desktop (separate window, same API calls)

Steps 6–8 are all thin clients over the same 5 backend endpoints — that's the payoff of getting steps 1–5 right first.