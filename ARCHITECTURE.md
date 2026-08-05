# OzCTA Systematic Futures Desk — Architecture & Agent Reference

> **Purpose:** This document is the ground truth for any AI agent, developer, or new team member working on this codebase. Read this first before making any changes.

---

## 1. What This System Is

**OzCTA** is a systematic futures trading signal platform for a CTA (Commodity Trading Advisor). It runs 5 quantitative trading strategies across 13 futures contracts, generates daily EOD signals, and publishes them to a password-protected React web application hosted on AWS Amplify.

**Live site:** `https://www.ozcta.com`
**GitHub repo:** `https://github.com/rdegaris/ForwardVolatilityWeb`

---

## 2. High-Level Architecture

```
Yahoo Finance REST API (free, no key required)
        ↓  daily + 15m intraday bars
scripts/daily_futures_scan.py   ← Python scanner (stdlib only, no pip deps)
        ↓  writes JSON to public/data/
GitHub Actions (.github/workflows/daily_futures_scan.yml)
        ↓  commits & pushes updated JSON Mon–Fri at 21:30 UTC (5:30 PM ET)
GitHub repo (main branch)
        ↓  push triggers Amplify webhook
AWS Amplify   ← builds React app (npm run build → vite → dist/)
        ↓  serves static site
ozcta.com     ← password-protected via Lambda@Edge auth
```

---

## 3. The 5 Trading Strategies

### 3.1 Trendorama (route: `/trendorama`)
- **Concept:** Systematic breakout following — Richard Donchian / turtle-style
- **Logic:** 55-day Donchian channel breakout + ATR position sizing
- **Signal:** BUY on 55-day high breakout, SELL SHORT on 55-day low breakout
- **Data file:** `public/data/turtle_signals_latest.json`
- **Scanner fn:** `analyze_bradman()` in `daily_futures_scan.py` (confusingly named — this is the Trendorama scanner)
- **Open trades tracker:** `/trendorama/open-trades`

### 3.2 The Bradman (route: `/taylor`)
- **Concept:** Linda Bradford Raschke's 3-day cycle — momentum and mean reversion
- **Logic:** 3-day buy/sell cycle with pivot objectives. Day 1 = buy day, Day 2 = sell day, Day 3 = short day
- **Signal:** BUY_LONG / SELL_SHORT / TAKE_PROFIT based on cycle day and price vs entry target
- **Data file:** `public/data/taylor_signals_latest.json`
- **Scanner fn:** `analyze_bradman()` — same file but produces Taylor/Bradman cycle signals

### 3.3 YouHaveChosenWisely (route: `/grail`)
- **Concept:** EMA pullback + strong trend filter
- **Logic:** Price pulls back to 20 EMA in a strong trend (ADX > 25). Entry on EMA touch.
- **Signal:** LONG or SHORT with entry zone, stop, and target
- **Data file:** `public/data/grail_signals_latest.json`
- **Scanner fn:** `analyze_wisely()` in `daily_futures_scan.py`

### 3.4 TooHot TooCold (route: `/odid`)
- **Concept:** Outside Day / Inside Day range expansion breakout alert
- **Logic:** Detects when yesterday's bar was an outside day (range > prior range). Arms an alert for breakout in either direction.
- **Signal:** ARMED alert (price broke above/below yesterday's high/low)
- **Data files:** `public/data/odid_signals_latest.json`, `public/data/odid_alerts_latest.json`
- **Scanner fn:** `analyze_toohot_toocold()` in `daily_futures_scan.py`

### 3.5 The Linda (route: `/linda`)
- **Concept:** Linda Bradford Raschke's "Trend Day No EMA Touch" mean reversion
- **Logic:** On a trend day (RTH range ≥ 0.70× 20-day ATR, close in top/bottom 25% of range), if price NEVER pulled back to touch the 15-minute 20 EMA during the pit session (09:30–16:00 ET = 13:30–20:00 UTC), the next day should revert to the mean.
- **Signal:** FADE_UP (sell) or FADE_DOWN (buy), target = 15m EMA at close
- **Data file:** `public/data/linda_signals_latest.json`
- **Scanner fns:** `fetch_yahoo_15m_bars()` + `analyze_linda()` in `daily_futures_scan.py`
- **Key implementation detail:** Uses actual 15-minute intraday bars (Yahoo Finance `interval=15m`) NOT daily bars, to correctly check the pit-session EMA-touch condition. The 15m EMA is a 20-period EMA computed rolling across all available 15m bars (5-day range).

---

## 4. The 13 Futures Contracts Scanned

| Symbol | Description |
|--------|-------------|
| ES | E-mini S&P 500 |
| NQ | E-mini Nasdaq 100 |
| RTY | E-mini Russell 2000 |
| YM | E-mini Dow Jones |
| GC | Gold |
| SI | Silver |
| CL | Crude Oil |
| NG | Natural Gas |
| 6E | Euro FX |
| 6J | Japanese Yen |
| 6B | British Pound |
| ZB | 30-Year T-Bond |
| ZN | 10-Year T-Note |

Yahoo Finance tickers map: `ES=F`, `NQ=F`, `RTY=F`, etc. (all `=F` suffix).

---

## 5. Scanner Script

**File:** `scripts/daily_futures_scan.py`

- **Zero pip dependencies** — uses only Python stdlib (`urllib.request`, `json`, `math`, `dataclasses`, `pathlib`)
- Fetches daily bars via Yahoo Finance REST API (2-year range, 1d interval) — no API key needed
- Fetches 15m intraday bars for Linda strategy (5-day range, 15m interval)
- Writes JSON output to `public/data/` (9 files total)
- Raises `RuntimeError` and exits with code 1 if all fetches fail (prevents silent empty updates)
- Run manually: `python scripts/daily_futures_scan.py` from project root
- Verify Linda output: `python scripts/check_linda.py`

### Key Functions

| Function | Strategy |
|----------|----------|
| `fetch_yahoo_bars(symbol, ticker)` | Fetches daily OHLCV (2y, 1d) |
| `fetch_yahoo_15m_bars(symbol, ticker)` | Fetches intraday 15m bars (5d, 15m) |
| `compute_ema(closes, period)` | Exponential moving average |
| `compute_atr(bars, period)` | Average True Range |
| `analyze_bradman(bars, symbol)` | Trendorama + Bradman cycle |
| `analyze_wisely(bars, symbol)` | YouHaveChosenWisely EMA pullback |
| `analyze_trendorama(bars, symbol)` | Donchian breakout signals |
| `analyze_toohot_toocold(bars, symbol)` | Outside/Inside day alerts |
| `analyze_linda(daily_bars, intraday_15m, symbol)` | Linda mean-reversion setup |

---

## 6. Automation — GitHub Actions

**File:** `.github/workflows/daily_futures_scan.yml`

- **Schedule:** Mon–Fri at `21:30 UTC` = 5:30 PM ET (1 hour after futures pit close)
- **Manual trigger:** GitHub Actions tab → "Daily Futures Strategy Scan" → "Run workflow"
- **Auth:** Uses built-in `secrets.GITHUB_TOKEN` with `contents: write` permission
- **Git push method:** `https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/...` (explicit token in URL — required for push from Actions runner)
- **Amplify trigger:** The push to `main` automatically triggers an Amplify redeploy

**Flow:**
1. Checkout repo
2. Run `python scripts/daily_futures_scan.py`
3. `git add public/data/*.json`
4. If changes exist → commit with `[skip ci]` tag → push to main
5. Amplify detects push → rebuilds → deploys

---

## 7. Frontend Stack

| Item | Detail |
|------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS (utility-first) |
| Routing | React Router v6 |
| Auth | Custom JWT via AWS Lambda + DynamoDB |
| Hosting | AWS Amplify (static, auto-deploy on push) |
| Domain | `ozcta.com` — registered at GoDaddy, DNS in AWS Route 53 |

**Build command:** `tsc -b && vite build`  
**Output:** `dist/` folder (static HTML/JS/CSS)  
**Dev server:** `npm run dev` → `http://localhost:5173`

### TypeScript Config Note
The project uses `"verbatimModuleSyntax": true` — all type-only imports **must** use `import type { ... }` syntax or the build will fail.

---

## 8. Key Source Files

```
src/
├── App.tsx                    ← Route definitions (add new routes here)
├── components/
│   └── Navigation.tsx         ← Top nav + sub-nav for all sections
├── pages/
│   ├── Home.tsx               ← Dashboard: 5-column strategy card grid
│   ├── TurtleSignals.tsx      ← Trendorama signals page
│   ├── GrailTrade.tsx         ← YouHaveChosenWisely page
│   ├── TaylorTrade.tsx        ← The Bradman page
│   ├── OdidBreakout.tsx       ← TooHot TooCold page
│   ├── LindaTrade.tsx         ← The Linda page
│   ├── FundPerformance.tsx    ← Performance page (HIDDEN from nav)
│   ├── Login.tsx              ← Auth login page
│   └── Register.tsx           ← User registration page
├── types/
│   ├── linda.ts               ← Linda signal TypeScript types
│   └── ...                    ← Other type files per strategy
public/
└── data/
    ├── turtle_signals_latest.json
    ├── grail_signals_latest.json
    ├── taylor_signals_latest.json
    ├── odid_signals_latest.json
    ├── odid_alerts_latest.json
    └── linda_signals_latest.json
scripts/
├── daily_futures_scan.py      ← Main scanner (run this daily)
└── check_linda.py             ← Debug helper for Linda signals
.github/
└── workflows/
    └── daily_futures_scan.yml ← Scheduled automation
```

---

## 9. Authentication System

- Users register/login at `/register` and `/login`
- Auth is handled by a Lambda function (`api/`) backed by **AWS DynamoDB**
- JWT tokens stored in `localStorage`
- Protected routes use `<ProtectedRoute>` wrapper in `App.tsx`
- The performance page (`/fund`) exists but is **hidden from navigation** (intentionally)

---

## 10. Navigation Structure

```
Top Bar: [OzCTA Logo] [Futures Strategies ▾] [Dashboard] [Log In/Out]

Futures Strategies dropdown:
  - Trendorama → /trendorama
  - YouHaveChosenWisely → /grail
  - TooHot TooCold → /odid
  - The Bradman → /taylor
  - The Linda → /linda

Quick Access (Home page footer grid):
  - Trendorama Signals
  - The Bradman
  - YouHaveChosenWisely
  - TooHot TooCold
  - The Linda
  - Open Positions Tracker
```

---

## 11. Known Design Decisions & Gotchas

1. **`bars[-2]` not `bars[-1]`** — Scanner always uses second-to-last bar because `bars[-1]` may be today's incomplete bar.

2. **Linda uses 15m intraday, not daily EMA** — A key correction from original design. The 20-day EMA on daily bars is not the same as the 15-minute 20 EMA during the pit session. The scanner fetches real 15m bars.

3. **RTH pit session = 13:30–20:00 UTC** — This maps to 09:30–16:00 ET (Eastern Time). All Linda 15m bar filtering uses this UTC range.

4. **Linda ATR threshold = 0.70×** — The RTH pit session range is compared to the 20-day ATR from daily bars. 0.70× is used (not 1.25×) because the daily ATR includes overnight/globex sessions; the pit session range will naturally be a fraction of that.

5. **`[skip ci]` in commit message** — The auto-commit message includes `[skip ci]` to prevent Amplify from triggering another build when GitHub Actions pushes. Without this, each scanner run would cause 2 Amplify builds.

6. **Max-width = 1720px** — The site container was expanded from `max-w-7xl` to `max-w-[1720px]` to fit all 5 strategy cards on a single row on desktop.

7. **Performance page hidden** — `/fund` route exists in `App.tsx` but the "Performance" nav link was removed from `Navigation.tsx`. The page is still accessible directly.

---

## 12. Deployment

| Environment | Method |
|-------------|--------|
| Local dev | `npm run dev` |
| Production build | `npm run build` |
| Deploy | Push to `main` → Amplify auto-builds |
| Scanner update | GitHub Actions runs automatically at 21:30 UTC Mon-Fri, or trigger manually |

**Amplify build settings** (set in AWS Amplify console):
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20+
