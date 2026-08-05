# OzCTA — Systematic Futures Desk

A systematic futures trading signal platform for a CTA (Commodity Trading Advisor). Runs 5 quantitative trading strategies across 13 futures contracts, publishing daily EOD signals to a password-protected React web application.

**Live site:** https://www.ozcta.com

## Quick Start

```bash
npm install
npm run dev        # Dev server → http://localhost:5173
npm run build      # Production build → dist/
```

## Run the Scanner Manually

```bash
python scripts/daily_futures_scan.py
```

The scanner runs automatically via GitHub Actions every weekday at 21:30 UTC (5:30 PM ET).

## Documentation

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full system reference covering:
- All 5 trading strategies and their logic
- Scanner script architecture
- GitHub Actions automation
- Frontend stack and key files
- Authentication system
- Known design decisions and gotchas
