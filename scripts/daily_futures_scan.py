#!/usr/bin/env python3
"""
Standalone Daily Futures Market Scanner for OzCTA
Fetches daily OHLCV from Yahoo Finance REST API for 13 futures contracts.
Calculates signals for:
  1. Trendorama (55-day Donchian Breakout + ATR Sizing)
  2. Bradman Trading Technique (3-Day Cycle & Objective Levels)
  3. YouHaveChosenWisely (20 EMA Pullback + 14 ADX Filter)
  4. Too Hot / Too Cold (Outside Day / Inside Day Breakout Alerts)

Exports updated JSON feeds directly to public/data/ with zero external pip dependencies.
"""

import json
import math
import sys
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime, date
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# -------------------------------------------------------------------
# Configurations & Ticker Map
# -------------------------------------------------------------------

FUTURES_MAP = {
    "ES": "ES=F",   # E-mini S&P 500
    "NQ": "NQ=F",   # E-mini Nasdaq 100
    "RTY": "RTY=F", # E-mini Russell 2000
    "YM": "YM=F",   # E-mini Dow Jones
    "GC": "GC=F",   # Gold Futures
    "SI": "SI=F",   # Silver Futures
    "CL": "CL=F",   # Crude Oil Futures
    "NG": "NG=F",   # Natural Gas Futures
    "6E": "6E=F",   # Euro FX Futures
    "6J": "6J=F",   # Japanese Yen Futures
    "6B": "6B=F",   # British Pound Futures
    "ZB": "ZB=F",   # 30-Yr T-Bond Futures
    "ZN": "ZN=F",   # 10-Yr T-Note Futures
}

CLUSTERS = {
    "equities": {"ES", "NQ", "RTY", "YM"},
    "metals": {"GC", "SI"},
    "energies": {"CL", "NG"},
    "fx": {"6E", "6J", "6B"},
    "rates": {"ZB", "ZN"},
}

@dataclass
class Bar:
    dt: str
    open: float
    high: float
    low: float
    close: float
    volume: float

# -------------------------------------------------------------------
# Fetcher (Yahoo Finance REST API - Zero Third Party Dependencies)
# -------------------------------------------------------------------

def fetch_yahoo_bars(symbol: str, ticker: str) -> List[Bar]:
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?range=2y&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        
        result = data["chart"]["result"][0]
        timestamps = result.get("timestamp", [])
        quote = result["indicators"]["quote"][0]
        opens = quote.get("open", [])
        highs = quote.get("high", [])
        lows = quote.get("low", [])
        closes = quote.get("close", [])
        volumes = quote.get("volume", [])

        bars: List[Bar] = []
        for i in range(len(timestamps)):
            ts = timestamps[i]
            o, h, l, c, v = opens[i], highs[i], lows[i], closes[i], volumes[i]
            if None in (ts, o, h, l, c):
                continue
            dt_str = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
            bars.append(Bar(dt=dt_str, open=float(o), high=float(h), low=float(l), close=float(c), volume=float(v or 0)))
        return bars
    except Exception as e:
        print(f"  [ERROR] {symbol} ({ticker}): {e}")
        return []

# -------------------------------------------------------------------
# Indicator Utilities
# -------------------------------------------------------------------

def compute_atr(bars: List[Bar], period: int = 20) -> List[float]:
    if len(bars) < 2:
        return [0.0] * len(bars)
    trs = [bars[0].high - bars[0].low]
    for i in range(1, len(bars)):
        h, l, pc = bars[i].high, bars[i].low, bars[i-1].close
        tr = max(h - l, abs(h - pc), abs(l - pc))
        trs.append(tr)
    
    atrs = [0.0] * len(bars)
    if len(bars) < period:
        return atrs
    atrs[period - 1] = sum(trs[:period]) / period
    for i in range(period, len(bars)):
        atrs[i] = (atrs[i - 1] * (period - 1) + trs[i]) / period
    return atrs

def compute_ema(closes: List[float], period: int = 20) -> List[float]:
    emas = [0.0] * len(closes)
    if len(closes) < period:
        return emas
    multiplier = 2.0 / (period + 1)
    emas[period - 1] = sum(closes[:period]) / period
    for i in range(period, len(closes)):
        emas[i] = (closes[i] - emas[i - 1]) * multiplier + emas[i - 1]
    return emas

def compute_adx(bars: List[Bar], period: int = 14) -> Tuple[List[float], List[float], List[float]]:
    n = len(bars)
    if n < period + 1:
        return [0.0]*n, [0.0]*n, [0.0]*n

    plus_dm, minus_dm, trs = [0.0]*n, [0.0]*n, [0.0]*n
    for i in range(1, n):
        up_move = bars[i].high - bars[i-1].high
        down_move = bars[i-1].low - bars[i].low
        plus_dm[i] = up_move if (up_move > down_move and up_move > 0) else 0.0
        minus_dm[i] = down_move if (down_move > up_move and down_move > 0) else 0.0
        h, l, pc = bars[i].high, bars[i].low, bars[i-1].close
        trs[i] = max(h - l, abs(h - pc), abs(l - pc))

    smooth_tr = [0.0]*n
    smooth_pdm = [0.0]*n
    smooth_mdm = [0.0]*n
    smooth_tr[period] = sum(trs[1:period+1])
    smooth_pdm[period] = sum(plus_dm[1:period+1])
    smooth_mdm[period] = sum(minus_dm[1:period+1])

    for i in range(period + 1, n):
        smooth_tr[i] = smooth_tr[i-1] - (smooth_tr[i-1]/period) + trs[i]
        smooth_pdm[i] = smooth_pdm[i-1] - (smooth_pdm[i-1]/period) + plus_dm[i]
        smooth_mdm[i] = smooth_mdm[i-1] - (smooth_mdm[i-1]/period) + minus_dm[i]

    plus_di, minus_di, dx = [0.0]*n, [0.0]*n, [0.0]*n
    for i in range(period, n):
        if smooth_tr[i] > 0:
            plus_di[i] = (smooth_pdm[i] / smooth_tr[i]) * 100
            minus_di[i] = (smooth_mdm[i] / smooth_tr[i]) * 100
            sum_di = plus_di[i] + minus_di[i]
            if sum_di > 0:
                dx[i] = (abs(plus_di[i] - minus_di[i]) / sum_di) * 100

    adx = [0.0]*n
    if n >= period * 2:
        adx[period * 2 - 1] = sum(dx[period:period * 2]) / period
        for i in range(period * 2, n):
            adx[i] = (adx[i-1] * (period - 1) + dx[i]) / period

    return adx, plus_di, minus_di

# -------------------------------------------------------------------
# Strategy 1: Bradman Trading Technique (3-Day Cycle)
# -------------------------------------------------------------------

def analyze_bradman(bars: List[Bar], symbol: str) -> Optional[dict]:
    if len(bars) < 5:
        return None
    b0 = bars[-1] # Today
    b1 = bars[-2] # Yesterday
    b2 = bars[-3] # Day before

    buying_pressure = b1.close - b1.low
    selling_pressure = b1.high - b1.close
    buying_objective = b0.low + buying_pressure
    selling_objective = b0.high - selling_pressure

    high_resistance = b0.high + (b1.high - b1.low)
    low_support = b0.low - (b1.high - b1.low)

    # 3-Day Cycle logic
    is_declining = b1.close < b2.close and b0.close <= b1.close
    is_advancing = b1.close > b2.close and b0.close >= b1.close

    if is_declining or (b0.close < b1.close):
        cycle_phase = "BUY_DAY"
        cycle_day = 1
        action = "BUY_LONG"
        entry_target = round(b0.low + (buying_pressure * 0.5), 4)
        profit_target = round(selling_objective, 4)
        stop_loss = round(low_support, 4)
    elif is_advancing:
        cycle_phase = "SELL_SHORT_DAY"
        cycle_day = 3
        action = "SELL_SHORT"
        entry_target = round(b0.high - (selling_pressure * 0.5), 4)
        profit_target = round(buying_objective, 4)
        stop_loss = round(high_resistance, 4)
    else:
        cycle_phase = "SELL_DAY"
        cycle_day = 2
        action = "SELL_EXIT"
        entry_target = round(b0.high, 4)
        profit_target = round(high_resistance, 4)
        stop_loss = round(b0.low, 4)

    return {
        "symbol": symbol,
        "asof": b0.dt,
        "cycle_phase": cycle_phase,
        "cycle_day": cycle_day,
        "action": action,
        "close": b0.close,
        "buying_pressure": round(buying_pressure, 4),
        "selling_pressure": round(selling_pressure, 4),
        "buying_objective": round(buying_objective, 4),
        "selling_objective": round(selling_objective, 4),
        "high_resistance": round(high_resistance, 4),
        "low_support": round(low_support, 4),
        "entry_target": entry_target,
        "profit_target": profit_target,
        "stop_loss": stop_loss,
    }

# -------------------------------------------------------------------
# Strategy 2: YouHaveChosenWisely (20 EMA Pullback + 14 ADX)
# -------------------------------------------------------------------

def analyze_wisely(bars: List[Bar], symbol: str) -> Optional[dict]:
    if len(bars) < 40:
        return None
    closes = [b.close for b in bars]
    emas = compute_ema(closes, 20)
    adx, plus_di, minus_di = compute_adx(bars, 14)

    b0 = bars[-1]
    last_ema = emas[-1]
    last_adx = adx[-1]
    last_pdi = plus_di[-1]
    last_mdi = minus_di[-1]

    recent_high = max(b.high for b in bars[-20:])
    recent_low = min(b.low for b in bars[-20:])
    dist_pct = abs(b0.close - last_ema) / last_ema * 100

    is_uptrend = last_pdi > last_mdi
    adx_strong = last_adx >= 25.0
    near_ema = dist_pct <= 2.5

    side = "none"
    eligible = False
    entry_zone = round(last_ema, 4)
    stop_loss = None
    target = None
    reason = "ADX below 25 threshold"

    if adx_strong:
        if is_uptrend:
            side = "long"
            target = round(recent_high, 4)
            stop_loss = round(recent_low * 0.995, 4)
            if near_ema:
                eligible = True
                reason = "Uptrend pullback to 20 EMA - enter long"
            else:
                reason = f"Waiting for pullback to 20 EMA ({dist_pct:.1f}% away)"
        else:
            side = "short"
            target = round(recent_low, 4)
            stop_loss = round(recent_high * 1.005, 4)
            if near_ema:
                eligible = True
                reason = "Downtrend rally to 20 EMA - enter short"
            else:
                reason = f"Waiting for rally to 20 EMA ({dist_pct:.1f}% away)"

    return {
        "symbol": symbol,
        "exchange": "CME",
        "currency": "USD",
        "side": side,
        "asof": b0.dt,
        "close": round(b0.close, 4),
        "ema20": round(last_ema, 4),
        "adx": round(last_adx, 2),
        "plus_di": round(last_pdi, 2),
        "minus_di": round(last_mdi, 2),
        "recent_high": round(recent_high, 4),
        "recent_low": round(recent_low, 4),
        "entry_zone": entry_zone,
        "stop_loss": stop_loss,
        "target": target,
        "distance_to_ema_pct": round(dist_pct, 2),
        "eligible": eligible,
        "reason": reason,
    }

# -------------------------------------------------------------------
# Strategy 3: Trendorama (55-day Donchian Channel Breakout)
# -------------------------------------------------------------------

def analyze_trendorama(bars: List[Bar], symbol: str) -> Tuple[dict, Optional[dict]]:
    if len(bars) < 60:
        return {}, None
    b0 = bars[-1]
    hist = bars[-56:-1]
    long_entry = max(b.high for b in hist)
    short_entry = min(b.low for b in hist)

    atrs = compute_atr(bars, 20)
    N = atrs[-1]

    long_trig = b0.high >= long_entry
    short_trig = b0.low <= short_entry

    row = {
        "symbol": symbol,
        "exchange": "CME",
        "currency": "USD",
        "asof": b0.dt,
        "N": round(N, 4),
        "last_close": round(b0.close, 4),
        "long_entry": round(long_entry, 4),
        "short_entry": round(short_entry, 4),
    }

    trig = None
    if long_trig:
        trig = {
            "symbol": symbol,
            "side": "long",
            "asof": b0.dt,
            "last_close": round(b0.close, 4),
            "entry_stop": round(long_entry, 4),
            "stop_loss": round(long_entry - 2 * N, 4),
            "eligible": True,
            "notes": "Donchian upside breakout hit on latest bar",
        }
    elif short_trig:
        trig = {
            "symbol": symbol,
            "side": "short",
            "asof": b0.dt,
            "last_close": round(b0.close, 4),
            "entry_stop": round(short_entry, 4),
            "stop_loss": round(short_entry + 2 * N, 4),
            "eligible": True,
            "notes": "Donchian downside breakout hit on latest bar",
        }

    return row, trig

# -------------------------------------------------------------------
# Strategy 4: Too Hot / Too Cold (OD/ID Breakout)
# -------------------------------------------------------------------

def analyze_toohot_toocold(bars: List[Bar], symbol: str) -> Tuple[Optional[dict], Optional[dict]]:
    if len(bars) < 3:
        return None, None
    b0, b1, b2 = bars[-1], bars[-2], bars[-3]

    is_inside = (b1.high <= b2.high) and (b1.low >= b2.low)
    is_outside = (b1.high > b2.high) and (b1.low < b2.low)

    alert = None
    triggered = None

    if is_inside or is_outside:
        pattern = "TOO_COLD (INSIDE_DAY)" if is_inside else "TOO_HOT (OUTSIDE_DAY)"
        alert = {
            "symbol": symbol,
            "pattern": pattern,
            "asof": b1.dt,
            "high_trigger": round(b1.high, 4),
            "low_trigger": round(b1.low, 4),
            "last_close": round(b0.close, 4),
            "severity": "high" if is_outside else "medium",
        }

        if b0.high > b1.high:
            triggered = {
                "symbol": symbol,
                "side": "long",
                "asof": b0.dt,
                "entry_stop": round(b1.high, 4),
                "stop_loss": round(b1.low, 4),
                "eligible": True,
                "notes": f"Confirmed {pattern} upside breakout",
            }
        elif b0.low < b1.low:
            triggered = {
                "symbol": symbol,
                "side": "short",
                "asof": b0.dt,
                "entry_stop": round(b1.low, 4),
                "stop_loss": round(b1.high, 4),
                "eligible": True,
                "notes": f"Confirmed {pattern} downside breakout",
            }

    return alert, triggered

# -------------------------------------------------------------------
# Main Scan Pipeline
# -------------------------------------------------------------------

def main():
    print("=== STARTING OZCTA STANDALONE DAILY FUTURES SCANNER ===")
    web_data_dir = Path(__file__).resolve().parents[1] / "public" / "data"
    web_data_dir.mkdir(parents=True, exist_ok=True)

    taylor_signals = []
    wisely_signals = []
    wisely_triggered = []
    trendorama_rows = []
    trendorama_trig = []
    toohot_alerts = []
    toohot_trig = []

    latest_date = datetime.utcnow().strftime("%Y-%m-%d")

    for symbol, ticker in FUTURES_MAP.items():
        print(f"Fetching {symbol} ({ticker})...")
        bars = fetch_yahoo_bars(symbol, ticker)
        if not bars:
            continue

        latest_date = bars[-1].dt

        # 1. Bradman Cycle
        brad_sig = analyze_bradman(bars, symbol)
        if brad_sig:
            taylor_signals.append(brad_sig)

        # 2. YouHaveChosenWisely
        wise_sig = analyze_wisely(bars, symbol)
        if wise_sig:
            wisely_signals.append(wise_sig)
            if wise_sig["eligible"] and wise_sig["side"] != "none":
                wisely_triggered.append(wise_sig)

        # 3. Trendorama
        t_row, t_trig = analyze_trendorama(bars, symbol)
        if t_row:
            trendorama_rows.append(t_row)
        if t_trig:
            trendorama_trig.append(t_trig)

        # 4. Too Hot / Too Cold
        th_alert, th_trig = analyze_toohot_toocold(bars, symbol)
        if th_alert:
            toohot_alerts.append(th_alert)
        if th_trig:
            toohot_trig.append(th_trig)

    # -------------------------------------------------------------------
    # Write JSON Artifacts to public/data/
    # -------------------------------------------------------------------

    # 1. Taylor / Bradman JSON
    taylor_payload = {
        "date": latest_date,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "total_scanned": len(taylor_signals),
        "summary": {
            "buy_day_count": sum(1 for s in taylor_signals if s["cycle_phase"] == "BUY_DAY"),
            "sell_day_count": sum(1 for s in taylor_signals if s["cycle_phase"] == "SELL_DAY"),
            "sell_short_day_count": sum(1 for s in taylor_signals if s["cycle_phase"] == "SELL_SHORT_DAY"),
        },
        "signals": taylor_signals,
    }
    (web_data_dir / "taylor_signals_latest.json").write_text(json.dumps(taylor_payload, indent=2))

    # 2. Grail / YouHaveChosenWisely JSON
    wisely_payload = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "date": latest_date,
        "system": "YouHaveChosenWisely",
        "adx_threshold": 25.0,
        "total_scanned": len(wisely_signals),
        "total_triggered": len(wisely_triggered),
        "signals": wisely_signals,
        "triggered": wisely_triggered,
    }
    (web_data_dir / "grail_signals_latest.json").write_text(json.dumps(wisely_payload, indent=2))

    # 3. Trendorama JSON
    trend_payload = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "date": latest_date,
        "system": "S2",
        "total_scanned": len(trendorama_rows),
        "triggered": trendorama_trig,
        "rows": trendorama_rows,
    }
    (web_data_dir / "turtle_signals_latest.json").write_text(json.dumps(trend_payload, indent=2))

    # 4. Too Hot / Too Cold JSON
    odid_sig_payload = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "date": latest_date,
        "total_armed": len(toohot_alerts),
        "triggered": toohot_trig,
    }
    odid_alrt_payload = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "date": latest_date,
        "total_alerts": len(toohot_alerts),
        "alerts": toohot_alerts,
    }
    (web_data_dir / "odid_signals_latest.json").write_text(json.dumps(odid_sig_payload, indent=2))
    (web_data_dir / "odid_alerts_latest.json").write_text(json.dumps(odid_alrt_payload, indent=2))

    print(f"=== SUCCESSFULLY UPDATED ALL FUTURES SIGNAL FEEDS FOR {latest_date} ===")

if __name__ == "__main__":
    main()
