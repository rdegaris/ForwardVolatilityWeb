#!/usr/bin/env python3
"""
IRA Portfolio Tracker — Prime Aggressive Model
==============================================
Runs as part of the daily signal workflow. Fetches the latest NAV/close for
each fund in the model from Yahoo Finance and writes
public/data/ira_portfolio_latest.json, which powers the private IRA widget on
the Home page (only shown to rdegaris@gmail.com).

Model assumptions:
  * $45,000 starting balance on INCEPTION_DATE.
  * Shares for each fund = STARTING_BALANCE * weight / basis price, computed
    once at inception and then held (buy-and-hold, no rebalancing).
  * Any residual weight (100% - sum of fund weights) sits in the Vanguard
    Treasury Money Market (VUSXX) at a stable $1.00 NAV.
"""

import json
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional, Tuple
from zoneinfo import ZoneInfo

STARTING_BALANCE = 45_000.00
INCEPTION_DATE = "2026-10-28"
MODEL_NAME = "Prime Aggressive Model"

# ticker, name, weight (%), basis price (price at inception from statement)
HOLDINGS = [
    ("ANODX", "American Century Small Cap Growth R6", 3.5, 25.25),
    ("BTMKX", "iShares MSCI EAFE Intl Idx K", 10.0, 21.31),
    ("DFEMX", "DFA Emerging Markets I", 8.5, 43.10),
    ("DFIVX", "DFA International Value I", 9.0, 32.22),
    ("FSPTX", "Fidelity Select Technology", 2.0, 56.35),
    ("FXAIX", "Fidelity 500 Index", 23.0, 268.43),
    ("GSIYX", "GS GQG Partners Intl Opportunities", 6.5, 22.91),
    ("PTRQX", "PGIM Total Return Bond R6", 4.0, 11.60),
    ("VEIRX", "Vanguard Equity-Income Adm", 11.0, 103.94),
    ("VGSLX", "Vanguard Real Estate Index Admiral", 3.0, 130.91),
    ("VIGAX", "Vanguard Morningstar Growth Index Admiral", 7.5, 273.14),
    ("VIMAX", "Vanguard Morningstar Mid-Cap Index Admiral", 4.5, 403.42),
    ("VMIAX", "Vanguard Materials Index Admiral", 3.0, 115.73),
    ("VSIAX", "Vanguard Morningstar Small-Cap Value Admiral", 3.5, 103.79),
]
CASH_TICKER = "VUSXX"
CASH_NAME = "Vanguard Treasury Money Market Investor"

ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = ROOT / "public" / "data" / "ira_portfolio_latest.json"
MAX_HISTORY = 1500


def fetch_quote(ticker: str) -> Optional[Tuple[float, Optional[float], str]]:
    """Return (last_close, previous_close, price_date) or None on failure."""
    endpoints = [
        f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?range=10d&interval=1d",
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=10d&interval=1d",
    ]
    headers = {"User-Agent": "Mozilla/5.0"}
    for url in endpoints:
        for _ in range(2):
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                result = data["chart"]["result"][0]
                timestamps = result.get("timestamp", []) or []
                closes = result["indicators"]["quote"][0].get("close", []) or []
                points = [
                    (ts, float(c)) for ts, c in zip(timestamps, closes) if ts is not None and c is not None
                ]
                if not points:
                    meta_price = result.get("meta", {}).get("regularMarketPrice")
                    if meta_price:
                        return float(meta_price), None, datetime.now(timezone.utc).strftime("%Y-%m-%d")
                    raise ValueError("no closes")
                last_ts, last_close = points[-1]
                prev_close = points[-2][1] if len(points) > 1 else None
                price_date = datetime.fromtimestamp(last_ts, tz=ZoneInfo("America/New_York")).strftime("%Y-%m-%d")
                return last_close, prev_close, price_date
            except Exception:
                time.sleep(0.5)
    print(f"  [IRA] WARN: failed to fetch {ticker}")
    return None


def load_previous() -> Dict:
    if OUT_FILE.exists():
        try:
            return json.loads(OUT_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def main() -> None:
    print("=" * 60)
    print(f"IRA PORTFOLIO UPDATE — {MODEL_NAME}")
    print("=" * 60)

    previous = load_previous()
    prev_positions = {p["ticker"]: p for p in previous.get("positions", [])}

    cash_weight = round(100.0 - sum(w for _, _, w, _ in HOLDINGS), 4)
    universe = list(HOLDINGS)
    if cash_weight > 0:
        universe.append((CASH_TICKER, CASH_NAME, cash_weight, 1.00))

    positions = []
    latest_price_date = None
    for ticker, name, weight, basis_price in universe:
        shares = round(STARTING_BALANCE * weight / 100.0 / basis_price, 6)
        cost_basis = round(STARTING_BALANCE * weight / 100.0, 2)

        if ticker == CASH_TICKER:
            quote = (1.00, 1.00, None)
        else:
            quote = fetch_quote(ticker)

        stale = False
        if quote is None:
            # Fall back to last known price so one bad fetch doesn't zero the widget
            prior = prev_positions.get(ticker)
            price = float(prior["price"]) if prior else basis_price
            prev_close = float(prior.get("prev_close") or price) if prior else None
            price_date = prior.get("price_date") if prior else None
            stale = True
        else:
            price, prev_close, price_date = quote

        if price_date and (latest_price_date is None or price_date > latest_price_date):
            latest_price_date = price_date

        value = shares * price
        day_change = shares * (price - prev_close) if prev_close else 0.0
        positions.append({
            "ticker": ticker,
            "name": name,
            "target_pct": weight,
            "shares": round(shares, 4),
            "basis_price": basis_price,
            "cost_basis": cost_basis,
            "price": round(price, 4),
            "prev_close": round(prev_close, 4) if prev_close else None,
            "price_date": price_date,
            "value": round(value, 2),
            "day_change": round(day_change, 2),
            "day_change_pct": round((price / prev_close - 1) * 100, 3) if prev_close else 0.0,
            "gain": round(value - cost_basis, 2),
            "gain_pct": round((value / cost_basis - 1) * 100, 3) if cost_basis else 0.0,
            "stale": stale,
        })
        flag = " (stale)" if stale else ""
        print(f"  {ticker:6s} {shares:>10.3f} sh @ ${price:>9.2f} = ${value:>11,.2f}{flag}")

    total_value = sum(p["value"] for p in positions)
    for p in positions:
        p["current_pct"] = round(p["value"] / total_value * 100, 2) if total_value else 0.0

    total_day_change = sum(p["day_change"] for p in positions)
    prior_total = total_value - total_day_change
    total_gain = total_value - STARTING_BALANCE

    # Daily value history (one point per price date)
    history = [h for h in previous.get("history", []) if isinstance(h, dict)]
    hist_date = latest_price_date or datetime.now(ZoneInfo("America/New_York")).strftime("%Y-%m-%d")
    history = [h for h in history if h.get("date") != hist_date]
    history.append({"date": hist_date, "value": round(total_value, 2)})
    history.sort(key=lambda h: h["date"])
    history = history[-MAX_HISTORY:]

    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": MODEL_NAME,
        "inception_date": INCEPTION_DATE,
        "starting_balance": STARTING_BALANCE,
        "price_date": latest_price_date,
        "total_value": round(total_value, 2),
        "day_change": round(total_day_change, 2),
        "day_change_pct": round(total_day_change / prior_total * 100, 3) if prior_total else 0.0,
        "total_gain": round(total_gain, 2),
        "total_gain_pct": round(total_gain / STARTING_BALANCE * 100, 3),
        "positions": positions,
        "history": history,
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"  TOTAL: ${total_value:,.2f}  (day {total_day_change:+,.2f}, since inception {total_gain:+,.2f})")
    print(f"  Wrote {OUT_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
