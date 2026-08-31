#!/usr/bin/env python3
"""
Standalone Daily Futures Market Scanner for OzCTA
Fetches daily OHLCV from Yahoo Finance REST API for 13 futures contracts.
Calculates signals for:
  1. Trendorama (55-day Donchian Breakout + ATR Sizing)
  2. Bradman Trading Technique (3-Day Cycle & Objective Levels)
  3. YouHaveChosenWisely (20 EMA Pullback + 14 ADX Filter)
  4. Too Hot / Too Cold (Outside Day / Inside Day Breakout Alerts)
  5. The Linda (Trend Day No-EMA-Touch Mean Reversion)

Exports updated JSON feeds directly to public/data/ with zero external pip dependencies.
"""

import json
import math
import sys
import time
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

@dataclass
class Bar:
    dt: str
    open: float
    high: float
    low: float
    close: float
    volume: float

# -------------------------------------------------------------------
# Fetcher (Yahoo Finance REST API - Robust Multi-Endpoint Retry)
# -------------------------------------------------------------------

def fetch_yahoo_bars(symbol: str, ticker: str) -> List[Bar]:
    endpoints = [
        f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?range=2y&interval=1d",
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=2y&interval=1d",
    ]
    headers = {"User-Agent": "Mozilla/5.0"}

    for url in endpoints:
        for attempt in range(2):
            try:
                req = urllib.request.Request(url, headers=headers)
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
                if bars:
                    return bars
            except Exception as e:
                time.sleep(0.5)
                continue
    print(f"  [ERROR] {symbol} ({ticker}): Failed to fetch bars")
    return []

def fetch_yahoo_15m_bars(symbol: str, ticker: str) -> List[dict]:
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?range=5d&interval=15m"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        result = data["chart"]["result"][0]
        timestamps = result.get("timestamp", [])
        quote = result["indicators"]["quote"][0]
        opens, highs, lows, closes = quote.get("open", []), quote.get("high", []), quote.get("low", []), quote.get("close", [])
        
        bars = []
        for i in range(len(timestamps)):
            ts = timestamps[i]
            o, h, l, c = opens[i], highs[i], lows[i], closes[i]
            if None in (ts, o, h, l, c): continue
            dt_obj = datetime.utcfromtimestamp(ts)
            bars.append({
                "ts": ts,
                "dt": dt_obj.strftime("%Y-%m-%d"),
                "time": dt_obj.strftime("%H:%M"),
                "open": float(o), "high": float(h), "low": float(l), "close": float(c)
            })
        return bars
    except Exception as e:
        print(f"  [ERROR] {symbol} ({ticker}): Failed to fetch 15m bars: {e}")
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
# Strategy 1: The Bradman (3-Day Cycle)
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
    adx_strong = last_adx >= 30.0
    near_ema = dist_pct <= 2.5

    side = "none"
    eligible = False
    entry_zone = round(last_ema, 4)
    stop_loss = None
    target = None
    reason = "ADX below 30 threshold (LBR Holy Grail spec)"

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
# Strategy 5: The Linda (Trend Day / No EMA Touch / Mean Reversion)
# -------------------------------------------------------------------
# Linda Raschke concept: on a trend day, if price never pulls back to
# touch the 15-min EMA during the pit session, it will revert to the
# mean the next day. We approximate using daily bars + 20-period EMA.
#
# Trend Day conditions:
#   - Day range >= 1.25x 20-day ATR (unusually large range)
#   - Close in top 25% of range (bullish thrust) or bottom 25% (bearish)
#
# No-EMA-touch condition:
#   - Bullish thrust: day's LOW stayed ABOVE the 20-day EMA
#   - Bearish thrust: day's HIGH stayed BELOW the 20-day EMA
#
# Signal: fade the close, target = EMA20, stop = 1xATR beyond extreme
# -------------------------------------------------------------------

def analyze_linda(daily_bars: List[Bar], intraday_15m: List[dict], symbol: str) -> Optional[dict]:
    if len(daily_bars) < 25 or not intraday_15m:
        return None

    # Calculate 15m 20-period EMA across all 15m bars
    mult = 2.0 / 21.0
    ema = None
    for b in intraday_15m:
        c = b["close"]
        ema = c if ema is None else (c - ema) * mult + ema
        b["ema"] = ema

    # Group 15m bars by UTC date
    by_date = {}
    for b in intraday_15m:
        by_date.setdefault(b["dt"], []).append(b)

    dates = sorted(list(by_date.keys()))
    if len(dates) < 2:
        return None

    # Use yesterday's completed date (second to last date in dates if today is active)
    # E.g. if dates ends in today (2026-07-31), yesterday is dates[-2]
    today_utc = datetime.utcnow().strftime("%Y-%m-%d")
    target_date = dates[-2] if dates[-1] == today_utc else dates[-1]

    rth_bars = [b for b in by_date.get(target_date, []) if "13:30" <= b["time"] <= "20:00"]
    if not rth_bars:
        return None

    # Calculate 20-day ATR from daily bars for stop sizing
    atrs = compute_atr(daily_bars, 20)
    atr = atrs[-2] if len(atrs) >= 2 else atrs[-1]

    day_open = rth_bars[0]["open"]
    day_close = rth_bars[-1]["close"]
    day_high = max(b["high"] for b in rth_bars)
    day_low = min(b["low"] for b in rth_bars)
    day_range = day_high - day_low

    if day_range <= 0 or atr <= 0:
        return None

    range_vs_atr = day_range / atr
    trend_strength = (day_close - day_low) / day_range

    is_bullish_thrust = trend_strength >= 0.75
    is_bearish_thrust = trend_strength <= 0.25
    is_large_range = range_vs_atr >= 0.70  # Pit session range relative to 24h ATR

    is_trend_day = is_large_range and (is_bullish_thrust or is_bearish_thrust)
    last_15m_ema = rth_bars[-1]["ema"]
    gap_pct = abs(day_close - last_15m_ema) / last_15m_ema * 100

    if not is_trend_day:
        return {
            "symbol": symbol,
            "asof": target_date,
            "direction": None,
            "close": round(day_close, 4),
            "ema20": round(last_15m_ema, 4),
            "gap_pct": round(gap_pct, 2),
            "day_range": round(day_range, 4),
            "atr20": round(atr, 4),
            "range_vs_atr": round(range_vs_atr, 2),
            "trend_strength": round(trend_strength, 3),
            "entry": None,
            "target": round(last_15m_ema, 4),
            "stop": None,
            "triggered": False,
            "reason": f"Not a trend day (RTH range {range_vs_atr:.2f}x ATR, close at {trend_strength*100:.0f}% of range)",
        }

    # True Linda Raschke Pit Session 15m EMA No-Touch test
    bull_no_touch = all(b["low"] > b["ema"] for b in rth_bars)
    bear_no_touch = all(b["high"] < b["ema"] for b in rth_bars)

    if is_bullish_thrust:
        if bull_no_touch:
            return {
                "symbol": symbol,
                "asof": target_date,
                "direction": "FADE_UP",
                "close": round(day_close, 4),
                "ema20": round(last_15m_ema, 4),
                "gap_pct": round(gap_pct, 2),
                "day_range": round(day_range, 4),
                "atr20": round(atr, 4),
                "range_vs_atr": round(range_vs_atr, 2),
                "trend_strength": round(trend_strength, 3),
                "entry": round(day_close, 4),
                "target": round(last_15m_ema, 4),
                "stop": round(day_high + atr, 4),
                "triggered": True,
                "reason": f"Bullish trend day (close at {trend_strength*100:.0f}% of range), 15m low NEVER touched 15m EMA during pit session — fade setup targeting 15m EMA ({last_15m_ema:.2f})",
            }
        else:
            return {
                "symbol": symbol,
                "asof": target_date,
                "direction": "FADE_UP",
                "close": round(day_close, 4),
                "ema20": round(last_15m_ema, 4),
                "gap_pct": round(gap_pct, 2),
                "day_range": round(day_range, 4),
                "atr20": round(atr, 4),
                "range_vs_atr": round(range_vs_atr, 2),
                "trend_strength": round(trend_strength, 3),
                "entry": None,
                "target": round(last_15m_ema, 4),
                "stop": None,
                "triggered": False,
                "reason": f"Bullish trend day, but 15m EMA was touched during RTH pit session",
            }
    else:
        if bear_no_touch:
            return {
                "symbol": symbol,
                "asof": target_date,
                "direction": "FADE_DOWN",
                "close": round(day_close, 4),
                "ema20": round(last_15m_ema, 4),
                "gap_pct": round(gap_pct, 2),
                "day_range": round(day_range, 4),
                "atr20": round(atr, 4),
                "range_vs_atr": round(range_vs_atr, 2),
                "trend_strength": round(trend_strength, 3),
                "entry": round(day_close, 4),
                "target": round(last_15m_ema, 4),
                "stop": round(day_low - atr, 4),
                "triggered": True,
                "reason": f"Bearish trend day (close at {trend_strength*100:.0f}% of range), 15m high NEVER touched 15m EMA during pit session — fade setup targeting 15m EMA ({last_15m_ema:.2f})",
            }
        else:
            return {
                "symbol": symbol,
                "asof": target_date,
                "direction": "FADE_DOWN",
                "close": round(day_close, 4),
                "ema20": round(last_15m_ema, 4),
                "gap_pct": round(gap_pct, 2),
                "day_range": round(day_range, 4),
                "atr20": round(atr, 4),
                "range_vs_atr": round(range_vs_atr, 2),
                "trend_strength": round(trend_strength, 3),
                "entry": None,
                "target": round(last_15m_ema, 4),
                "stop": None,
                "triggered": False,
                "reason": f"Bearish trend day, but 15m EMA was touched during RTH pit session",
            }

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
    linda_signals = []
    linda_triggered = []
    bars_by_symbol: Dict[str, List[Bar]] = {}

    latest_date = datetime.utcnow().strftime("%Y-%m-%d")

    for symbol, ticker in FUTURES_MAP.items():
        print(f"Fetching {symbol} ({ticker})...")
        bars = fetch_yahoo_bars(symbol, ticker)
        if not bars:
            continue

        bars_by_symbol[symbol] = bars
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

        # 5. The Linda (Intraday 15m EMA pit session scanner)
        bars_15m = fetch_yahoo_15m_bars(symbol, ticker)
        linda_sig = analyze_linda(bars, bars_15m, symbol)
        if linda_sig:
            linda_signals.append(linda_sig)
            if linda_sig["triggered"]:
                linda_triggered.append(linda_sig)

    if not taylor_signals:
        raise RuntimeError("ERROR: Failed to fetch daily market data for any futures symbols. Aborting signal update.")

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
        "adx_threshold": 30.0,
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
        "signals": trendorama_rows,
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

    # 5. The Linda JSON
    linda_payload = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "date": latest_date,
        "system": "TheLinda",
        "atr_period": 20,
        "ema_period": 20,
        "trend_day_atr_multiple": 1.25,
        "total_scanned": len(linda_signals),
        "total_triggered": len(linda_triggered),
        "signals": linda_signals,
    }
    (web_data_dir / "linda_signals_latest.json").write_text(json.dumps(linda_payload, indent=2))

    # 6. Update Paper Trades & Performance Ledger
    update_standalone_paper_trades(web_data_dir, bars_by_symbol, latest_date)

    print(f"=== SUCCESSFULLY UPDATED ALL FUTURES SIGNAL FEEDS FOR {latest_date} ===")


def update_standalone_paper_trades(data_dir: Path, daily_bars: Dict[str, List[Bar]], latest_date: str):
    point_values = {
        "ES": 50.0, "NQ": 20.0, "RTY": 50.0, "YM": 5.0, "GC": 100.0,
        "SI": 5000.0, "CL": 1000.0, "NG": 10000.0, "6E": 125000.0,
        "6B": 62500.0, "6J": 12500000.0, "ZB": 1000.0, "ZN": 1000.0
    }
    symbol_names = {
        "ES": "E-mini S&P 500", "NQ": "E-mini Nasdaq 100", "RTY": "E-mini Russell 2000",
        "YM": "E-mini Dow Jones", "GC": "Gold Futures", "SI": "Silver Futures",
        "CL": "Crude Oil Futures", "NG": "Natural Gas Futures", "6E": "Euro FX Futures",
        "6B": "British Pound Futures", "6J": "Japanese Yen Futures",
        "ZB": "30-Year T-Bond Futures", "ZN": "10-Year T-Note Futures"
    }

    trades_file = data_dir / "executed_trades.json"
    trades = []
    if trades_file.exists():
        try:
            trades = json.loads(trades_file.read_text(encoding="utf-8"))
        except Exception:
            trades = []

    existing_keys = {
        (t.get("entry_date"), t.get("symbol"), t.get("strategy"), t.get("side"))
        for t in trades
    }

    # Ingest from generated JSON files
    for strat, filename in [
        ("Trendorama", "turtle_signals_latest.json"),
        ("YouHaveChosenWisely", "grail_signals_latest.json"),
        ("The Bradman", "taylor_signals_latest.json"),
        ("TooHot TooCold", "odid_signals_latest.json"),
        ("The Linda", "linda_signals_latest.json")
    ]:
        p = data_dir / filename
        if not p.exists():
            continue
        try:
            payload = json.loads(p.read_text(encoding="utf-8"))
            asof = payload.get("date", latest_date)
            items = payload.get("triggered", []) or payload.get("signals", [])
            for sig in items:
                sym = sig.get("symbol")
                if not sym:
                    continue
                side = sig.get("side") or ("long" if "BUY" in str(sig.get("cycle_phase", "")) else "short" if "SELL" in str(sig.get("cycle_phase", "")) else None)
                if not side or side not in ("long", "short"):
                    continue
                if sig.get("eligible") is False:
                    continue
                key = (asof, sym, strat, side)
                if key not in existing_keys:
                    entry = float(sig.get("entry_stop") or sig.get("entry_zone") or sig.get("last_close") or sig.get("close") or 0.0)
                    stop = float(sig.get("stop_loss") or sig.get("stop") or (entry * 0.985 if side == "long" else entry * 1.015))
                    target = float(sig.get("target") or sig.get("objective_target") or (entry + 2 * abs(entry - stop) if side == "long" else entry - 2 * abs(entry - stop)))
                    pt_val = point_values.get(sym, 1.0)
                    trade_id = f"pt_{sym}_{strat[:4]}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{len(trades)+1}"
                    trades.append({
                        "id": trade_id,
                        "symbol": sym,
                        "symbol_name": symbol_names.get(sym, sym),
                        "strategy": strat,
                        "side": side,
                        "entry_date": asof,
                        "entry_price": round(entry, 4),
                        "qty": 1,
                        "stop_loss": round(stop, 4),
                        "profit_target": round(target, 4),
                        "point_value": pt_val,
                        "status": "OPEN",
                        "current_price": round(entry, 4),
                        "unrealized_pnl": 0.0,
                        "realized_pnl": 0.0,
                        "return_pct": 0.0,
                        "duration_days": 0,
                        "initial_risk": round(abs(entry - stop) * pt_val, 2),
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat()
                    })
                    existing_keys.add(key)
        except Exception as e:
            print(f"  [PAPER TRADES] Error parsing {filename}: {e}")

    # Evaluate daily stops and targets
    now_dt = datetime.utcnow()
    for t in trades:
        sym = t.get("symbol", "")
        pt_val = float(t.get("point_value", 1.0))
        side = t.get("side", "long")
        entry = float(t.get("entry_price", 0.0))
        stop = float(t.get("stop_loss", 0.0))
        target = float(t.get("profit_target", 0.0)) if t.get("profit_target") is not None else None

        try:
            e_dt = datetime.strptime(str(t.get("entry_date", latest_date))[:10], "%Y-%m-%d")
            t["duration_days"] = max(0, (now_dt - e_dt).days)
        except Exception:
            t["duration_days"] = 0

        if t.get("status") == "OPEN" and sym in daily_bars and daily_bars[sym]:
            last_bar = daily_bars[sym][-1]
            high = last_bar.high
            low = last_bar.low
            close = last_bar.close
            t["current_price"] = round(close, 4)

            if side == "long":
                if stop > 0 and low <= stop:
                    t["status"] = "STOPPED_OUT"
                    t["exit_price"] = round(stop, 4)
                    t["exit_date"] = last_bar.dt
                    t["realized_pnl"] = round((stop - entry) * pt_val, 2)
                    t["unrealized_pnl"] = 0.0
                    t["return_pct"] = round(((stop - entry) / entry) * 100, 2) if entry > 0 else 0.0
                elif target and high >= target:
                    t["status"] = "HIT_TARGET"
                    t["exit_price"] = round(target, 4)
                    t["exit_date"] = last_bar.dt
                    t["realized_pnl"] = round((target - entry) * pt_val, 2)
                    t["unrealized_pnl"] = 0.0
                    t["return_pct"] = round(((target - entry) / entry) * 100, 2) if entry > 0 else 0.0
                else:
                    t["unrealized_pnl"] = round((close - entry) * pt_val, 2)
                    t["return_pct"] = round(((close - entry) / entry) * 100, 2) if entry > 0 else 0.0
            elif side == "short":
                if stop > 0 and high >= stop:
                    t["status"] = "STOPPED_OUT"
                    t["exit_price"] = round(stop, 4)
                    t["exit_date"] = last_bar.dt
                    t["realized_pnl"] = round((entry - stop) * pt_val, 2)
                    t["unrealized_pnl"] = 0.0
                    t["return_pct"] = round(((entry - stop) / entry) * 100, 2) if entry > 0 else 0.0
                elif target and low <= target:
                    t["status"] = "HIT_TARGET"
                    t["exit_price"] = round(target, 4)
                    t["exit_date"] = last_bar.dt
                    t["realized_pnl"] = round((entry - target) * pt_val, 2)
                    t["unrealized_pnl"] = 0.0
                    t["return_pct"] = round(((entry - target) / entry) * 100, 2) if entry > 0 else 0.0
                else:
                    t["unrealized_pnl"] = round((entry - close) * pt_val, 2)
                    t["return_pct"] = round(((entry - close) / entry) * 100, 2) if entry > 0 else 0.0

            t["updated_at"] = datetime.utcnow().isoformat()

    # Calculate summary metrics
    closed_trades = [t for t in trades if t.get("status") in ("HIT_TARGET", "STOPPED_OUT", "MANUALLY_CLOSED")]
    open_trades = [t for t in trades if t.get("status") == "OPEN"]
    tot_realized = sum(float(t.get("realized_pnl", 0.0)) for t in closed_trades)
    tot_unrealized = sum(float(t.get("unrealized_pnl", 0.0)) for t in open_trades)
    net_pnl = tot_realized + tot_unrealized
    wins = [t for t in closed_trades if float(t.get("realized_pnl", 0.0)) > 0]
    losses = [t for t in closed_trades if float(t.get("realized_pnl", 0.0)) < 0]
    win_dollars = sum(float(t.get("realized_pnl", 0.0)) for t in wins)
    loss_dollars = abs(sum(float(t.get("realized_pnl", 0.0)) for t in losses))
    win_rate = (len(wins) / len(closed_trades) * 100) if closed_trades else (
        (len([t for t in open_trades if float(t.get("unrealized_pnl", 0.0)) > 0]) / len(open_trades) * 100) if open_trades else 0.0
    )
    profit_factor = (win_dollars / loss_dollars) if loss_dollars > 0 else (99.9 if win_dollars > 0 else 1.0)

    # Strategy breakdown
    strat_breakdown = {}
    for t in trades:
        st = t.get("strategy", "Unknown")
        if st not in strat_breakdown:
            strat_breakdown[st] = {
                "strategy": st, "total_trades": 0, "open_trades": 0, "closed_trades": 0,
                "wins": 0, "losses": 0, "realized_pnl": 0.0, "unrealized_pnl": 0.0,
                "net_pnl": 0.0, "win_rate_pct": 0.0
            }
        sb = strat_breakdown[st]
        sb["total_trades"] += 1
        if t.get("status") == "OPEN":
            sb["open_trades"] += 1
            sb["unrealized_pnl"] += float(t.get("unrealized_pnl", 0.0))
        else:
            sb["closed_trades"] += 1
            rp = float(t.get("realized_pnl", 0.0))
            sb["realized_pnl"] += rp
            if rp > 0: sb["wins"] += 1
            elif rp < 0: sb["losses"] += 1

    for sb in strat_breakdown.values():
        sb["net_pnl"] = round(sb["realized_pnl"] + sb["unrealized_pnl"], 2)
        sb["realized_pnl"] = round(sb["realized_pnl"], 2)
        sb["unrealized_pnl"] = round(sb["unrealized_pnl"], 2)
        cl = sb["closed_trades"]
        sb["win_rate_pct"] = round((sb["wins"] / cl * 100), 1) if cl > 0 else 0.0

    # Equity Curve
    sorted_trades = sorted(trades, key=lambda x: x.get("entry_date", ""))
    dates = sorted(list(set(t.get("entry_date", "") for t in sorted_trades if t.get("entry_date"))))
    eq_curve = []
    running_eq = 100000.0
    cum_pnl = 0.0
    peak_eq = running_eq
    max_dd = 0.0
    for d in dates:
        d_trades = [t for t in trades if t.get("entry_date") == d or t.get("exit_date") == d]
        d_pnl = sum(float(t.get("realized_pnl", 0.0)) if t.get("exit_date") == d else float(t.get("unrealized_pnl", 0.0)) for t in d_trades)
        cum_pnl += d_pnl
        c_eq = running_eq + cum_pnl
        if c_eq > peak_eq: peak_eq = c_eq
        dd = ((peak_eq - c_eq) / peak_eq * 100) if peak_eq > 0 else 0.0
        if dd > max_dd: max_dd = dd
        eq_curve.append({
            "date": d, "cum_pnl": round(cum_pnl, 2), "equity": round(c_eq, 2), "drawdown_pct": round(dd, 2)
        })

    perf_payload = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "date": latest_date,
        "total_trades": len(trades),
        "open_trades_count": len(open_trades),
        "closed_trades_count": len(closed_trades),
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "win_rate_pct": round(win_rate, 1),
        "total_realized_pnl": round(tot_realized, 2),
        "total_unrealized_pnl": round(tot_unrealized, 2),
        "net_pnl": round(net_pnl, 2),
        "profit_factor": round(profit_factor, 2),
        "max_drawdown_pct": round(max_dd, 2),
        "avg_win": round(win_dollars / len(wins), 2) if wins else 0.0,
        "avg_loss": round(loss_dollars / len(losses), 2) if losses else 0.0,
        "strategy_breakdown": strat_breakdown,
        "equity_curve": eq_curve,
        "recent_trades": sorted(trades, key=lambda x: (x.get("updated_at", ""), x.get("entry_date", "")), reverse=True)[:20]
    }

    trades_file.write_text(json.dumps(trades, indent=2), encoding="utf-8")
    (data_dir / "paper_trades_latest.json").write_text(json.dumps({"timestamp": datetime.utcnow().isoformat() + "Z", "date": latest_date, "trades": trades}, indent=2), encoding="utf-8")
    (data_dir / "paper_trade_performance.json").write_text(json.dumps(perf_payload, indent=2), encoding="utf-8")
    print(f"  [PAPER TRADES] Updated {len(trades)} executed trades (Net PnL: ${net_pnl:,.2f})")


if __name__ == "__main__":
    main()

