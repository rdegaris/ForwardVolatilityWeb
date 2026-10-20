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
from datetime import datetime, date, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

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
    "6B": "6B=F",   # British Pound Futures
    "ZB": "ZB=F",   # 30-Yr T-Bond Futures
    "ZN": "ZN=F",   # 10-Yr T-Note Futures
}

POINT_VALUES = {
    "ES": 5.0,        # Micro E-mini S&P 500 (MES)
    "NQ": 2.0,        # Micro E-mini Nasdaq 100 (MNQ)
    "RTY": 5.0,       # Micro E-mini Russell 2000 (M2K)
    "YM": 0.5,        # Micro E-mini Dow Jones (MYM)
    "GC": 10.0,       # Micro Gold (MGC, 10 oz)
    "SI": 1000.0,     # Micro Silver (SIL, 1000 oz)
    "CL": 100.0,      # Micro WTI Crude Oil (MCL, 100 bbl)
    "NG": 2500.0,     # E-mini Natural Gas (QG)
    "6E": 12500.0,    # Micro Euro FX (M6E)
    "6B": 6250.0,     # Micro British Pound (M6B)
    "ZB": 1000.0,     # 30-Year T-Bond Futures
    "ZN": 1000.0,     # 10-Year T-Note Futures
}

SYMBOL_NAMES = {
    "ES": "Micro E-mini S&P 500 (MES)",
    "NQ": "Micro E-mini Nasdaq 100 (MNQ)",
    "RTY": "Micro E-mini Russell 2000 (M2K)",
    "YM": "Micro E-mini Dow Jones (MYM)",
    "GC": "Micro Gold Futures (MGC)",
    "SI": "Micro Silver Futures (SIL)",
    "CL": "Micro WTI Crude Oil (MCL)",
    "NG": "E-mini Natural Gas (QG)",
    "6E": "Micro Euro FX (M6E)",
    "6B": "Micro British Pound (M6B)",
    "ZB": "30-Year T-Bond Futures",
    "ZN": "10-Year T-Note Futures",
}

CLUSTERS = {
    "equities": {"ES", "NQ", "RTY", "YM"},
    "rates": {"ZB", "ZN", "ZF", "ZT"},
    "energies": {"CL", "NG", "HO", "RB"},
    "metals": {"GC", "SI", "HG"},
    "fx": {"6E", "6B", "6A", "6C", "EUR", "GBP", "CAD", "AUD"},
    "grains": {"ZC", "ZW", "ZS", "ZL"},
    "softs": {"KC", "SB", "CT"},
    "livestock": {"HE", "LE"},
}

CLUSTER_CAPS = {
    "equities": 2,
    "rates": 2,
    "energies": 2,
    "metals": 1,
    "fx": 2,
    "grains": 2,
    "softs": 2,
    "livestock": 1,
    "other": 2,
}

STARTING_PORTFOLIO_CAPITAL = 100000.0
RISK_PER_TRADE_DOLLARS = STARTING_PORTFOLIO_CAPITAL * 0.02

def get_sym_cluster(symbol: str) -> str:
    s = symbol.upper().strip()
    for cl, syms in CLUSTERS.items():
        if s in syms:
            return cl
    return "other"

def calc_capped_qty(symbol: str, risk_per_contract: float) -> int:
    if risk_per_contract <= 0:
        return 1
    raw_qty = max(1, int(RISK_PER_TRADE_DOLLARS // risk_per_contract))
    max_cap = 8 if symbol in ("6E", "6B") else 10
    return min(raw_qty, max_cap)

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
                    dt_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
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
    ny_tz = ZoneInfo("America/New_York")
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
            dt_ny = datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(ny_tz)
            bars.append({
                "ts": ts,
                "dt": dt_ny.strftime("%Y-%m-%d"),
                "time_et": dt_ny.strftime("%H:%M"),
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

def compute_sma(closes: List[float], period: int = 200) -> List[float]:
    smas = [0.0] * len(closes)
    if len(closes) < period:
        period = min(len(closes), 50)
    for i in range(period - 1, len(closes)):
        smas[i] = sum(closes[i - period + 1 : i + 1]) / period
    return smas

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
    if len(bars) < 25:
        return None
    b0 = bars[-1] # Today
    b1 = bars[-2] # Yesterday
    b2 = bars[-3] # Day before

    atrs = compute_atr(bars, 20)
    atr = atrs[-1] if atrs[-1] > 0 else (b0.high - b0.low)
    adx_list, _, _ = compute_adx(bars, 14)
    cur_adx = adx_list[-1] if len(adx_list) >= 14 else 20.0

    buying_pressure = b1.close - b1.low
    selling_pressure = b1.high - b1.close
    buying_objective = b0.low + buying_pressure
    selling_objective = b0.high - selling_pressure

    high_resistance = b0.high + (b1.high - b1.low)
    low_support = b0.low - (b1.high - b1.low)

    # 3-Day Cycle logic aligned with execution engine (0.80x ATR stop, 1.50x ATR target)
    is_declining = b1.close < b2.close and b0.close <= b1.close
    is_advancing = b1.close > b2.close and b0.close >= b1.close

    if is_declining:
        cycle_phase = "BUY_DAY"
        cycle_day = 1
        action = "BUY_LONG" if cur_adx < 35.0 else "WATCH"
        entry_val = b0.low + (buying_pressure * 0.5)
        entry_target = round(entry_val, 4)
        profit_target = round(entry_val + 1.50 * atr, 4)
        stop_loss = round(entry_val - 0.80 * atr, 4)
        notes = "2-day decline into Day 1 Buy zone (0.8x ATR stop / 1.5x ATR target)" if cur_adx < 35.0 else f"ADX {cur_adx:.1f} >= 35 trend filter — watching only"
    elif is_advancing:
        cycle_phase = "SELL_SHORT_DAY"
        cycle_day = 3
        action = "SELL_SHORT" if cur_adx < 35.0 else "WATCH"
        entry_val = b0.high - (selling_pressure * 0.5)
        entry_target = round(entry_val, 4)
        profit_target = round(entry_val - 1.50 * atr, 4)
        stop_loss = round(entry_val + 0.80 * atr, 4)
        notes = "2-day advance into Day 3 Sell Short zone (0.8x ATR stop / 1.5x ATR target)" if cur_adx < 35.0 else f"ADX {cur_adx:.1f} >= 35 trend filter — watching only"
    else:
        cycle_phase = "SELL_DAY"
        cycle_day = 2
        action = "SELL_EXIT"
        entry_target = round(b0.high, 4)
        profit_target = round(high_resistance, 4)
        stop_loss = round(b0.low, 4)
        notes = "Mid-cycle Day 2 rotation — manage existing positions or trail stops"

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
        "notes": notes,
    }

# -------------------------------------------------------------------
# Strategy 2: YouHaveChosenWisely (20 EMA Pullback + 14 ADX)
# -------------------------------------------------------------------

def analyze_wisely(bars: List[Bar], symbol: str) -> Optional[dict]:
    if len(bars) < 40:
        return None
    closes = [b.close for b in bars]
    emas = compute_ema(closes, 20)
    atrs = compute_atr(bars, 20)
    adx, plus_di, minus_di = compute_adx(bars, 14)

    b0 = bars[-1]
    last_ema = emas[-1]
    last_atr = atrs[-1]
    last_adx = adx[-1]
    last_pdi = plus_di[-1]
    last_mdi = minus_di[-1]
    cluster = get_sym_cluster(symbol)

    recent_high = max(b.high for b in bars[-20:])
    recent_low = min(b.low for b in bars[-20:])
    dist_pct = abs(b0.close - last_ema) / last_ema * 100

    is_uptrend = last_pdi > last_mdi
    adx_strong = last_adx >= 25.0
    near_ema = dist_pct <= 2.5

    side = "none"
    eligible = False
    entry_zone = round(b0.close if near_ema else last_ema, 4)
    stop_loss = None
    target = None
    reason = "ADX below 25 threshold (trend strength filter)"

    if adx_strong:
        if is_uptrend:
            side = "long"
            ref_entry = b0.close if near_ema else last_ema
            target = round(ref_entry + 2.5 * last_atr, 4)
            stop_loss = round(ref_entry - 1.25 * last_atr, 4)
            if near_ema:
                eligible = True
                reason = "Uptrend pullback to 20 EMA (ADX >= 25) - enter long"
            else:
                reason = f"Strong uptrend, waiting for pullback to 20 EMA ({dist_pct:.1f}% away)"
        else:
            side = "short"
            ref_entry = b0.close if near_ema else last_ema
            target = round(ref_entry - 2.5 * last_atr, 4)
            stop_loss = round(ref_entry + 1.25 * last_atr, 4)
            if near_ema:
                eligible = True
                reason = "Downtrend rally to 20 EMA (ADX >= 25) - enter short"
            else:
                reason = f"Strong downtrend, waiting for rally to 20 EMA ({dist_pct:.1f}% away)"

    return {
        "symbol": symbol,
        "exchange": "CME",
        "currency": "USD",
        "cluster": cluster,
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
    adx_list, _, _ = compute_adx(bars, 14)
    cur_adx = adx_list[-1] if len(adx_list) >= 14 else 20.0
    smas200 = compute_sma([b.close for b in bars], 200)
    sma200 = smas200[-1] if smas200 else b0.close

    pt_val = POINT_VALUES.get(symbol, 1.0)
    cluster = get_sym_cluster(symbol)
    stop_dist = 1.5 * N
    unit_qty = calc_capped_qty(symbol, stop_dist * pt_val)

    long_stop_loss = round(long_entry - stop_dist, 4)
    short_stop_loss = round(short_entry + stop_dist, 4)

    long_trig = b0.high >= long_entry
    short_trig = b0.low <= short_entry

    row = {
        "symbol": symbol,
        "exchange": "CME",
        "currency": "USD",
        "cluster": cluster,
        "asof": b0.dt,
        "N": round(N, 4),
        "last_open": round(b0.open, 4),
        "last_high": round(b0.high, 4),
        "last_low": round(b0.low, 4),
        "last_close": round(b0.close, 4),
        "long_entry": round(long_entry, 4),
        "short_entry": round(short_entry, 4),
        "long_stop_loss": long_stop_loss,
        "short_stop_loss": short_stop_loss,
        "unit_qty": unit_qty,
        "long_triggered": long_trig,
        "short_triggered": short_trig,
    }

    trig = None
    if long_trig:
        eligible = (b0.close >= sma200) and (cur_adx >= 20.0)
        blocked_reason = None if eligible else ("Below 200 SMA" if b0.close < sma200 else f"ADX {cur_adx:.1f} < 20")
        trig = {
            "symbol": symbol,
            "exchange": "CME",
            "currency": "USD",
            "cluster": cluster,
            "side": "long",
            "asof": b0.dt,
            "last_close": round(b0.close, 4),
            "entry_stop": round(long_entry, 4),
            "stop_loss": long_stop_loss,
            "unit_qty": unit_qty,
            "N": round(N, 4),
            "eligible": eligible,
            "blocked_reason": blocked_reason,
            "notes": "55-day Donchian upside breakout",
        }
    elif short_trig:
        eligible = (b0.close <= sma200) and (cur_adx >= 20.0)
        blocked_reason = None if eligible else ("Above 200 SMA" if b0.close > sma200 else f"ADX {cur_adx:.1f} < 20")
        trig = {
            "symbol": symbol,
            "exchange": "CME",
            "currency": "USD",
            "cluster": cluster,
            "side": "short",
            "asof": b0.dt,
            "last_close": round(b0.close, 4),
            "entry_stop": round(short_entry, 4),
            "stop_loss": short_stop_loss,
            "unit_qty": unit_qty,
            "N": round(N, 4),
            "eligible": eligible,
            "blocked_reason": blocked_reason,
            "notes": "55-day Donchian downside breakout",
        }

    return row, trig

# -------------------------------------------------------------------
# Strategy 4: Too Hot / Too Cold (OD/ID Breakout)
# -------------------------------------------------------------------

def analyze_toohot_toocold(bars: List[Bar], symbol: str) -> Tuple[Optional[dict], Optional[dict], Optional[dict]]:
    if len(bars) < 25:
        return None, None, None
    b0, b1, b2 = bars[-1], bars[-2], bars[-3]
    atrs = compute_atr(bars, 20)
    atr = atrs[-1] if atrs[-1] > 0 else (b1.high - b1.low)
    adx_list, _, _ = compute_adx(bars, 14)
    cur_adx = adx_list[-1] if len(adx_list) >= 14 else 20.0
    cluster = get_sym_cluster(symbol)

    # Check if yesterday (b1) or today (b0) formed an Inside/Outside Day
    b1_inside = (b1.high <= b2.high) and (b1.low >= b2.low)
    b1_outside = (b1.high > b2.high) and (b1.low < b2.low)
    b0_inside = (b0.high <= b1.high) and (b0.low >= b1.low)
    b0_outside = (b0.high > b1.high) and (b0.low < b1.low)

    is_armed_b1 = b1_inside or b1_outside
    is_armed_b0 = b0_inside or b0_outside

    breakout_up_lvl = round(b0.high if is_armed_b0 else b1.high, 4)
    breakout_dn_lvl = round(b0.low if is_armed_b0 else b1.low, 4)
    dist_up_pct = round(max(0.0, (breakout_up_lvl - b0.close) / b0.close * 100), 2) if b0.close > 0 else 0.0
    dist_dn_pct = round(max(0.0, (b0.close - breakout_dn_lvl) / b0.close * 100), 2) if b0.close > 0 else 0.0

    alert = None
    triggered = None
    breakout_confirmed = False
    breakout_side = None
    breakout_entry = None
    breakout_stop = None

    if is_armed_b1:
        pattern = "TOO_COLD (INSIDE_DAY)" if b1_inside else "TOO_HOT (OUTSIDE_DAY)"
        eligible = cur_adx < 35.0
        blocked_reason = None if eligible else f"ADX {cur_adx:.1f} >= 35"

        if b0.high > b1.high:
            breakout_confirmed = True
            breakout_side = "long"
            breakout_entry = round(b1.high, 4)
            breakout_stop = round(b1.high - 1.0 * atr, 4)
            triggered = {
                "symbol": symbol,
                "exchange": "CME",
                "currency": "USD",
                "cluster": cluster,
                "side": "long",
                "asof": b0.dt,
                "od_date": b1.dt if b1_outside else None,
                "id_date": b1.dt if b1_inside else None,
                "last_close": round(b0.close, 4),
                "entry_stop": breakout_entry,
                "stop_loss": breakout_stop,
                "eligible": eligible,
                "blocked_reason": blocked_reason,
                "notes": f"Confirmed {pattern} upside breakout",
            }
        elif b0.low < b1.low:
            breakout_confirmed = True
            breakout_side = "short"
            breakout_entry = round(b1.low, 4)
            breakout_stop = round(b1.low + 1.0 * atr, 4)
            triggered = {
                "symbol": symbol,
                "exchange": "CME",
                "currency": "USD",
                "cluster": cluster,
                "side": "short",
                "asof": b0.dt,
                "od_date": b1.dt if b1_outside else None,
                "id_date": b1.dt if b1_inside else None,
                "last_close": round(b0.close, 4),
                "entry_stop": breakout_entry,
                "stop_loss": breakout_stop,
                "eligible": eligible,
                "blocked_reason": blocked_reason,
                "notes": f"Confirmed {pattern} downside breakout",
            }

        alert_side = breakout_side or ("long" if b0.close >= (b1.high + b1.low) / 2 else "short")
        alert_entry = breakout_entry if breakout_entry is not None else round(b1.high if alert_side == "long" else b1.low, 4)
        alert_stop = breakout_stop if breakout_stop is not None else round((alert_entry - 1.0 * atr) if alert_side == "long" else (alert_entry + 1.0 * atr), 4)
        alert = {
            "symbol": symbol,
            "pattern": pattern,
            "type": pattern,
            "side": alert_side,
            "asof": b0.dt if breakout_confirmed else b1.dt,
            "high_trigger": round(b1.high, 4),
            "low_trigger": round(b1.low, 4),
            "entry_stop": alert_entry,
            "stop_loss": alert_stop,
            "last_close": round(b0.close, 4),
            "severity": "high" if b1_outside else "medium",
            "eligible": eligible,
            "blocked_reason": blocked_reason,
            "message": f"{pattern} on {b1.dt} — {'Breakout triggered ' + breakout_side.upper() if breakout_confirmed and breakout_side else f'Watching range {b1.low:.2f}–{b1.high:.2f}'}",
        }
    elif is_armed_b0:
        pattern = "TOO_COLD (INSIDE_DAY)" if b0_inside else "TOO_HOT (OUTSIDE_DAY)"
        eligible = cur_adx < 35.0
        blocked_reason = None if eligible else f"ADX {cur_adx:.1f} >= 35"
        alert_side = "long" if b0.close >= (b0.high + b0.low) / 2 else "short"
        alert_entry = round(b0.high if alert_side == "long" else b0.low, 4)
        alert_stop = round((alert_entry - 1.0 * atr) if alert_side == "long" else (alert_entry + 1.0 * atr), 4)
        alert = {
            "symbol": symbol,
            "pattern": pattern,
            "type": pattern,
            "side": alert_side,
            "asof": b0.dt,
            "high_trigger": round(b0.high, 4),
            "low_trigger": round(b0.low, 4),
            "entry_stop": alert_entry,
            "stop_loss": alert_stop,
            "last_close": round(b0.close, 4),
            "severity": "high" if b0_outside else "medium",
            "eligible": eligible,
            "blocked_reason": blocked_reason,
            "message": f"Armed {pattern} on {b0.dt} — Breakout levels: Up {b0.high:.2f} / Down {b0.low:.2f}",
        }

    sig_row = {
        "symbol": symbol,
        "exchange": "CME",
        "currency": "USD",
        "cluster": cluster,
        "asof": b0.dt,
        "last_open": round(b0.open, 4),
        "last_high": round(b0.high, 4),
        "last_low": round(b0.low, 4),
        "last_close": round(b0.close, 4),
        "odid_setup_armed": bool(is_armed_b0 or is_armed_b1),
        "armed_od_date": b0.dt if b0_outside else (b1.dt if b1_outside else None),
        "armed_id_date": b0.dt if b0_inside else (b1.dt if b1_inside else None),
        "armed_breakout_up": breakout_up_lvl if (is_armed_b0 or is_armed_b1) else None,
        "armed_breakout_down": breakout_dn_lvl if (is_armed_b0 or is_armed_b1) else None,
        "distance_to_up_pct": dist_up_pct if (is_armed_b0 or is_armed_b1) else None,
        "distance_to_down_pct": dist_dn_pct if (is_armed_b0 or is_armed_b1) else None,
        "breakout_window": bool(is_armed_b1),
        "breakout_confirmed": breakout_confirmed,
        "breakout_side": breakout_side,
        "breakout_entry": breakout_entry,
        "breakout_stop": breakout_stop,
        "breakout_od_date": b1.dt if (breakout_confirmed and b1_outside) else None,
        "breakout_id_date": b1.dt if (breakout_confirmed and b1_inside) else None,
        "has_open_position": False,
        "open_position_qty": 0,
    }

    return sig_row, alert, triggered

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

    # Group 15m bars by New York date
    by_date: Dict[str, List[dict]] = {}
    for b in intraday_15m:
        by_date.setdefault(b["dt"], []).append(b)

    dates = sorted(list(by_date.keys()))
    if len(dates) < 2:
        return None

    # Use most recent completed RTH session (if today's RTH is still in progress before 16:00 ET, use prior date)
    now_ny = datetime.now(ZoneInfo("America/New_York"))
    today_ny = now_ny.strftime("%Y-%m-%d")
    current_time_et = now_ny.strftime("%H:%M")
    if dates[-1] == today_ny and current_time_et < "16:00":
        target_date = dates[-2]
    else:
        target_date = dates[-1]

    rth_bars = [b for b in by_date.get(target_date, []) if "09:30" <= b["time_et"] <= "16:00"]
    if not rth_bars and len(dates) >= 2:
        target_date = dates[-2]
        rth_bars = [b for b in by_date.get(target_date, []) if "09:30" <= b["time_et"] <= "16:00"]
    if not rth_bars:
        return None

    # Calculate 20-day ATR from daily bars for stop sizing
    atrs = compute_atr(daily_bars, 20)
    atr = atrs[-2] if len(atrs) >= 2 else atrs[-1]

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
                "side": "short",
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
                "side": "short",
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
                "reason": "Bullish trend day, but 15m EMA was touched during RTH pit session",
            }
    else:
        if bear_no_touch:
            return {
                "symbol": symbol,
                "asof": target_date,
                "direction": "FADE_DOWN",
                "side": "long",
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
                "side": "long",
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
                "reason": "Bearish trend day, but 15m EMA was touched during RTH pit session",
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
    toohot_rows = []
    toohot_alerts = []
    toohot_trig = []
    linda_signals = []
    linda_triggered = []
    bars_by_symbol: Dict[str, List[Bar]] = {}

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    latest_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

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
        th_row, th_alert, th_trig = analyze_toohot_toocold(bars, symbol)
        if th_row:
            toohot_rows.append(th_row)
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

    # 6. Update Paper Trades & Performance Ledger first so open positions can be reflected in signal feeds
    open_trades = update_standalone_paper_trades(web_data_dir, bars_by_symbol, latest_date)
    open_by_sym = {t["symbol"]: t for t in open_trades}

    for r in toohot_rows:
        sym = r["symbol"]
        if sym in open_by_sym and open_by_sym[sym].get("strategy") == "TooHot TooCold":
            r["has_open_position"] = True
            r["open_position_qty"] = open_by_sym[sym].get("qty", 1)

    # -------------------------------------------------------------------
    # Write JSON Artifacts to public/data/
    # -------------------------------------------------------------------

    # 1. Taylor / Bradman JSON
    taylor_payload = {
        "date": latest_date,
        "timestamp": now_iso,
        "total_scanned": len(taylor_signals),
        "summary": {
            "buy_day_count": sum(1 for s in taylor_signals if s["cycle_phase"] == "BUY_DAY"),
            "sell_day_count": sum(1 for s in taylor_signals if s["cycle_phase"] == "SELL_DAY"),
            "sell_short_day_count": sum(1 for s in taylor_signals if s["cycle_phase"] == "SELL_SHORT_DAY"),
        },
        "signals": taylor_signals,
    }
    (web_data_dir / "taylor_signals_latest.json").write_text(json.dumps(taylor_payload, indent=2), encoding="utf-8")

    # 2. Grail / YouHaveChosenWisely JSON
    wisely_payload = {
        "timestamp": now_iso,
        "date": latest_date,
        "system": "YouHaveChosenWisely",
        "adx_threshold": 25.0,
        "total_scanned": len(wisely_signals),
        "total_triggered": len(wisely_triggered),
        "signals": wisely_signals,
        "triggered": wisely_triggered,
    }
    (web_data_dir / "grail_signals_latest.json").write_text(json.dumps(wisely_payload, indent=2), encoding="utf-8")

    # 3. Trendorama JSON
    trend_payload = {
        "timestamp": now_iso,
        "date": latest_date,
        "system": "S2",
        "total_scanned": len(trendorama_rows),
        "triggered": trendorama_trig,
        "signals": trendorama_rows,
        "rows": trendorama_rows,
    }
    (web_data_dir / "turtle_signals_latest.json").write_text(json.dumps(trend_payload, indent=2), encoding="utf-8")

    # 4. Too Hot / Too Cold JSON
    odid_sig_payload = {
        "timestamp": now_iso,
        "date": latest_date,
        "system": "odid",
        "total_scanned": len(toohot_rows),
        "total_armed": sum(1 for r in toohot_rows if r.get("odid_setup_armed")),
        "total_triggered": len(toohot_trig),
        "signals": toohot_rows,
        "triggered": toohot_trig,
    }
    odid_alrt_payload = {
        "timestamp": now_iso,
        "date": latest_date,
        "system": "odid",
        "total_alerts": len(toohot_alerts),
        "alerts": toohot_alerts,
    }
    (web_data_dir / "odid_signals_latest.json").write_text(json.dumps(odid_sig_payload, indent=2), encoding="utf-8")
    (web_data_dir / "odid_alerts_latest.json").write_text(json.dumps(odid_alrt_payload, indent=2), encoding="utf-8")

    # 5. The Linda JSON
    linda_payload = {
        "timestamp": now_iso,
        "date": latest_date,
        "system": "TheLinda",
        "atr_period": 20,
        "ema_period": 20,
        "trend_day_atr_multiple": 0.70,
        "total_scanned": len(linda_signals),
        "total_triggered": len(linda_triggered),
        "signals": linda_signals,
    }
    (web_data_dir / "linda_signals_latest.json").write_text(json.dumps(linda_payload, indent=2), encoding="utf-8")

    print(f"=== SUCCESSFULLY UPDATED ALL FUTURES SIGNAL FEEDS FOR {latest_date} ===")


def update_standalone_paper_trades(
    data_dir: Path,
    daily_bars: Dict[str, List[Bar]],
    latest_date: str,
    start_date: str = "2026-06-01",
) -> List[Dict[str, Any]]:
    trades_file = data_dir / "executed_trades.json"
    MAX_PORTFOLIO_OPEN_TRADES = 8

    # Institutional round-turn commission and slippage per contract ($)
    commission_rt_per_contract = {
        "ES": 1.20, "NQ": 1.20, "RTY": 1.20, "YM": 1.20,
        "GC": 1.50, "SI": 1.50, "CL": 1.50, "NG": 2.50,
        "6E": 0.50, "6B": 0.50, "ZB": 2.50, "ZN": 2.50,
    }
    slippage_rt_per_contract = {
        "ES": 1.25, "NQ": 0.50, "RTY": 0.50, "YM": 0.50,
        "GC": 1.00, "SI": 2.50, "CL": 1.00, "NG": 2.50,
        "6E": 0.62, "6B": 0.62, "ZB": 3.12, "ZN": 1.56,
    }

    def apply_trade_accounting(t: Dict[str, Any], is_open: bool, gross_pnl: float, ref_price: float) -> None:
        sym = t.get("symbol", "")
        qty = max(1, int(t.get("qty", 1)))
        entry = float(t.get("entry_price", 0.0))
        side = t.get("side", "long")
        c_rt = commission_rt_per_contract.get(sym, 1.50)
        s_rt = slippage_rt_per_contract.get(sym, 1.25)

        eff_qty = min(qty, 8) if sym in ("6E", "6B") else min(qty, 10)
        factor = 0.5 if is_open else 1.0
        comm = round(c_rt * eff_qty * factor, 2)
        slip = round(s_rt * eff_qty * factor, 2)
        gross = round(gross_pnl, 2)
        net = round(gross - comm - slip, 2)

        t["gross_pnl"] = gross
        t["commission"] = comm
        t["slippage"] = slip
        t["fees_and_slippage"] = round(comm + slip, 2)
        if is_open:
            t["unrealized_pnl"] = net
            t["realized_pnl"] = 0.0
        else:
            t["realized_pnl"] = net
            t["unrealized_pnl"] = 0.0

        price_diff = (ref_price - entry) if side == "long" else (entry - ref_price)
        t["return_pct"] = round((price_diff / entry) * 100, 2) if entry > 0 else 0.0

    # Collect all sorted dates for simulation
    all_dates_set = set()
    for bars in daily_bars.values():
        for b in bars:
            all_dates_set.add(b.dt)
    sim_dates = [d for d in sorted(list(all_dates_set)) if d >= start_date]
    if not sim_dates:
        sim_dates = [latest_date]

    trades: List[Dict[str, Any]] = []
    trade_id_seq = 1
    eq_curve: List[Dict[str, Any]] = []
    peak_eq = STARTING_PORTFOLIO_CAPITAL
    max_dd = 0.0

    def can_open_trade(sym: str) -> bool:
        s = sym.upper().strip()
        open_trades = [t for t in trades if t.get("status") == "OPEN"]
        if len(open_trades) >= MAX_PORTFOLIO_OPEN_TRADES:
            return False
        if any(t.get("symbol", "").upper() == s for t in open_trades):
            return False
        cl = get_sym_cluster(s)
        cl_cap = CLUSTER_CAPS.get(cl, 2)
        cl_open = sum(1 for t in open_trades if get_sym_cluster(t.get("symbol", "")) == cl)
        if cl_open >= cl_cap:
            return False
        return True

    # Day-by-day sequential replay
    for cur_date in sim_dates:
        # 1. EVALUATE EXISTING OPEN POSITIONS ON THIS DAY'S BAR
        for t in trades:
            if t.get("status") != "OPEN":
                continue
            sym = t.get("symbol", "")
            if sym not in daily_bars:
                continue
            bars = [b for b in daily_bars[sym] if b.dt <= cur_date]
            if not bars or bars[-1].dt != cur_date:
                continue
            last_bar = bars[-1]
            high, low, close = last_bar.high, last_bar.low, last_bar.close
            side = t.get("side", "long")
            entry = float(t.get("entry_price", 0.0))
            stop = float(t.get("stop_loss", 0.0))
            target = float(t.get("profit_target", 0.0)) if t.get("profit_target") is not None else None
            pt_val = float(t.get("point_value", 1.0))
            qty = int(t.get("qty", 1))
            strat = t.get("strategy", "")
            t["current_price"] = round(close, 4)

            try:
                e_dt = datetime.strptime(str(t.get("entry_date", cur_date))[:10], "%Y-%m-%d")
                c_dt = datetime.strptime(cur_date, "%Y-%m-%d")
                duration = max(0, (c_dt - e_dt).days)
            except Exception:
                duration = 0
            t["duration_days"] = duration

            atrs_cur = compute_atr(bars, 20)
            atr_cur = atrs_cur[-1] if atrs_cur else 1.0

            # Dynamic Breakeven & Trailing Stop Ratchet after +1.0x ATR favorable excursion
            if strat == "Trendorama":
                if side == "long" and high >= entry + 1.0 * atr_cur:
                    stop = max(stop, entry, high - 2.0 * atr_cur)
                    t["stop_loss"] = round(stop, 4)
                elif side == "short" and low <= entry - 1.0 * atr_cur:
                    stop = min(stop, entry, low + 2.0 * atr_cur)
                    t["stop_loss"] = round(stop, 4)
            elif strat == "TooHot TooCold":
                if side == "long" and high >= entry + 1.0 * atr_cur:
                    stop = max(stop, entry)
                    t["stop_loss"] = round(stop, 4)
                elif side == "short" and low <= entry - 1.0 * atr_cur:
                    stop = min(stop, entry)
                    t["stop_loss"] = round(stop, 4)

            donchian_low_20 = min(b.low for b in bars[-21:-1]) if len(bars) >= 21 else min(b.low for b in bars)
            donchian_high_20 = max(b.high for b in bars[-21:-1]) if len(bars) >= 21 else max(b.high for b in bars)

            ema20_vals = compute_ema([b.close for b in bars], 20)
            ema20 = ema20_vals[-1] if ema20_vals else close

            is_stopped = (side == "long" and stop > 0 and low <= stop) or (side == "short" and stop > 0 and high >= stop)
            hit_target = (side == "long" and target and target > 0 and high >= target) or (side == "short" and target and target > 0 and low <= target)

            # The Linda Same-Day EOD Exit
            if strat == "The Linda":
                if is_stopped:
                    t["status"] = "STOPPED_OUT"
                    exit_p = stop
                elif hit_target:
                    t["status"] = "HIT_TARGET"
                    exit_p = target
                else:
                    t["status"] = "EOD_EXIT"
                    exit_p = close
                t["exit_price"] = round(exit_p, 4)
                t["exit_date"] = cur_date
                gross_pnl = (exit_p - entry if side == "long" else entry - exit_p) * pt_val * qty
                apply_trade_accounting(t, is_open=False, gross_pnl=gross_pnl, ref_price=exit_p)
                t["updated_at"] = cur_date + "T20:00:00Z"
                continue

            donchian_exit = False
            if strat == "Trendorama":
                if side == "long" and low <= donchian_low_20: donchian_exit = True
                elif side == "short" and high >= donchian_high_20: donchian_exit = True

            time_exit = False
            if strat == "The Bradman" and duration >= 3: time_exit = True
            elif strat == "TooHot TooCold" and duration >= 4: time_exit = True
            elif strat == "YouHaveChosenWisely" and duration >= 5: time_exit = True

            # YouHaveChosenWisely: 2 consecutive closes across EMA20
            ema_exit = False
            if strat == "YouHaveChosenWisely" and len(bars) >= 2:
                b_prev = bars[-2]
                if side == "long" and close < ema20 and b_prev.close < ema20: ema_exit = True
                elif side == "short" and close > ema20 and b_prev.close > ema20: ema_exit = True

            if is_stopped:
                t["status"] = "STOPPED_OUT"
                exit_p = stop
                t["exit_price"] = round(exit_p, 4)
                t["exit_date"] = cur_date
                gross_pnl = (exit_p - entry if side == "long" else entry - exit_p) * pt_val * qty
                apply_trade_accounting(t, is_open=False, gross_pnl=gross_pnl, ref_price=exit_p)
            elif hit_target:
                t["status"] = "HIT_TARGET"
                exit_p = target
                t["exit_price"] = round(exit_p, 4)
                t["exit_date"] = cur_date
                gross_pnl = (exit_p - entry if side == "long" else entry - exit_p) * pt_val * qty
                apply_trade_accounting(t, is_open=False, gross_pnl=gross_pnl, ref_price=exit_p)
            elif donchian_exit:
                t["status"] = "DONCHIAN_EXIT"
                exit_p = donchian_low_20 if side == "long" else donchian_high_20
                t["exit_price"] = round(exit_p, 4)
                t["exit_date"] = cur_date
                gross_pnl = (exit_p - entry if side == "long" else entry - exit_p) * pt_val * qty
                apply_trade_accounting(t, is_open=False, gross_pnl=gross_pnl, ref_price=exit_p)
            elif ema_exit:
                t["status"] = "EMA_EXIT"
                exit_p = close
                t["exit_price"] = round(exit_p, 4)
                t["exit_date"] = cur_date
                gross_pnl = (exit_p - entry if side == "long" else entry - exit_p) * pt_val * qty
                apply_trade_accounting(t, is_open=False, gross_pnl=gross_pnl, ref_price=exit_p)
            elif time_exit:
                t["status"] = "TIME_EXIT"
                exit_p = close
                t["exit_price"] = round(exit_p, 4)
                t["exit_date"] = cur_date
                gross_pnl = (exit_p - entry if side == "long" else entry - exit_p) * pt_val * qty
                apply_trade_accounting(t, is_open=False, gross_pnl=gross_pnl, ref_price=exit_p)
            else:
                gross_pnl = (close - entry if side == "long" else entry - close) * pt_val * qty
                apply_trade_accounting(t, is_open=True, gross_pnl=gross_pnl, ref_price=close)

            t["updated_at"] = cur_date + "T20:00:00Z"

        # 2. GENERATE AND INGEST NEW STRATEGY SIGNALS FOR THIS DATE
        for sym, bars_list in daily_bars.items():
            bars = [b for b in bars_list if b.dt <= cur_date]
            if len(bars) < 60 or bars[-1].dt != cur_date:
                continue
            b0 = bars[-1]
            b1, b2 = bars[-2], bars[-3]
            pt_val = POINT_VALUES.get(sym, 1.0)
            sym_name = SYMBOL_NAMES.get(sym, sym)
            atrs = compute_atr(bars, 20)
            atr = atrs[-1]
            atr_prev = atrs[-2] if len(atrs) >= 2 else atr
            adx_list, pdi_list, mdi_list = compute_adx(bars, 14)
            cur_adx = adx_list[-1] if len(adx_list) >= 14 else 20.0
            smas200 = compute_sma([b.close for b in bars], 200)
            sma200 = smas200[-1] if smas200 else b0.close

            # Strategy 1: Trendorama (55-day Donchian Breakout with 200 SMA Trend Filter)
            hist_55 = bars[-56:-1]
            donchian_high_55 = max(b.high for b in hist_55)
            donchian_low_55 = min(b.low for b in hist_55)
            if b0.high >= donchian_high_55 and b0.close >= sma200 and cur_adx >= 20.0 and can_open_trade(sym):
                entry_p = donchian_high_55
                stop_p = entry_p - 1.5 * atr
                risk_d = abs(entry_p - stop_p) * pt_val
                qty = max(1, int(RISK_PER_TRADE_DOLLARS // risk_d)) if risk_d > 0 else 1
                new_t = {
                    "id": f"pt_{sym}_Tren_{cur_date.replace('-','')}_{trade_id_seq}",
                    "symbol": sym, "symbol_name": sym_name, "strategy": "Trendorama", "side": "long",
                    "entry_date": cur_date, "entry_price": round(entry_p, 4), "qty": qty,
                    "stop_loss": round(stop_p, 4), "profit_target": round(entry_p + 3 * (entry_p - stop_p), 4),
                    "point_value": pt_val, "status": "OPEN", "current_price": round(b0.close, 4),
                    "duration_days": 0, "initial_risk": round(risk_d * qty, 2),
                    "created_at": cur_date + "T13:30:00Z", "updated_at": cur_date + "T20:00:00Z"
                }
                apply_trade_accounting(new_t, is_open=True, gross_pnl=(b0.close - entry_p) * pt_val * qty, ref_price=b0.close)
                trades.append(new_t)
                trade_id_seq += 1
            elif b0.low <= donchian_low_55 and b0.close <= sma200 and cur_adx >= 20.0 and can_open_trade(sym):
                entry_p = donchian_low_55
                stop_p = entry_p + 1.5 * atr
                risk_d = abs(entry_p - stop_p) * pt_val
                qty = max(1, int(RISK_PER_TRADE_DOLLARS // risk_d)) if risk_d > 0 else 1
                new_t = {
                    "id": f"pt_{sym}_Tren_{cur_date.replace('-','')}_{trade_id_seq}",
                    "symbol": sym, "symbol_name": sym_name, "strategy": "Trendorama", "side": "short",
                    "entry_date": cur_date, "entry_price": round(entry_p, 4), "qty": qty,
                    "stop_loss": round(stop_p, 4), "profit_target": round(entry_p - 3 * (stop_p - entry_p), 4),
                    "point_value": pt_val, "status": "OPEN", "current_price": round(b0.close, 4),
                    "duration_days": 0, "initial_risk": round(risk_d * qty, 2),
                    "created_at": cur_date + "T13:30:00Z", "updated_at": cur_date + "T20:00:00Z"
                }
                apply_trade_accounting(new_t, is_open=True, gross_pnl=(entry_p - b0.close) * pt_val * qty, ref_price=b0.close)
                trades.append(new_t)
                trade_id_seq += 1

            # Strategy 2: The Bradman (Taylor 3-day cycle with ADX < 35 filter & 0.8x ATR Stop)
            is_declining = b1.close < b2.close and b0.close <= b1.close
            is_advancing = b1.close > b2.close and b0.close >= b1.close
            buy_press = b1.close - b1.low
            sell_press = b1.high - b1.close
            if is_declining and cur_adx < 35.0 and can_open_trade(sym):
                entry_p = b0.low + (buy_press * 0.5)
                stop_p = entry_p - 0.80 * atr
                target_p = entry_p + 1.50 * atr
                risk_d = abs(entry_p - stop_p) * pt_val
                qty = max(1, int(RISK_PER_TRADE_DOLLARS // risk_d)) if risk_d > 0 else 1
                new_t = {
                    "id": f"pt_{sym}_Brad_{cur_date.replace('-','')}_{trade_id_seq}",
                    "symbol": sym, "symbol_name": sym_name, "strategy": "The Bradman", "side": "long",
                    "entry_date": cur_date, "entry_price": round(entry_p, 4), "qty": qty,
                    "stop_loss": round(stop_p, 4), "profit_target": round(target_p, 4),
                    "point_value": pt_val, "status": "OPEN", "current_price": round(b0.close, 4),
                    "duration_days": 0, "initial_risk": round(risk_d * qty, 2),
                    "created_at": cur_date + "T13:30:00Z", "updated_at": cur_date + "T20:00:00Z"
                }
                apply_trade_accounting(new_t, is_open=True, gross_pnl=(b0.close - entry_p) * pt_val * qty, ref_price=b0.close)
                trades.append(new_t)
                trade_id_seq += 1
            elif is_advancing and cur_adx < 35.0 and can_open_trade(sym):
                entry_p = b0.high - (sell_press * 0.5)
                stop_p = entry_p + 0.80 * atr
                target_p = entry_p - 1.50 * atr
                risk_d = abs(entry_p - stop_p) * pt_val
                qty = max(1, int(RISK_PER_TRADE_DOLLARS // risk_d)) if risk_d > 0 else 1
                new_t = {
                    "id": f"pt_{sym}_Brad_{cur_date.replace('-','')}_{trade_id_seq}",
                    "symbol": sym, "symbol_name": sym_name, "strategy": "The Bradman", "side": "short",
                    "entry_date": cur_date, "entry_price": round(entry_p, 4), "qty": qty,
                    "stop_loss": round(stop_p, 4), "profit_target": round(target_p, 4),
                    "point_value": pt_val, "status": "OPEN", "current_price": round(b0.close, 4),
                    "duration_days": 0, "initial_risk": round(risk_d * qty, 2),
                    "created_at": cur_date + "T13:30:00Z", "updated_at": cur_date + "T20:00:00Z"
                }
                apply_trade_accounting(new_t, is_open=True, gross_pnl=(entry_p - b0.close) * pt_val * qty, ref_price=b0.close)
                trades.append(new_t)
                trade_id_seq += 1

            # Strategy 3: YouHaveChosenWisely (Holy Grail 20 EMA Pullback)
            emas = compute_ema([b.close for b in bars], 20)
            if len(emas) >= 20 and len(adx_list) >= 28:
                last_ema = emas[-1]
                last_adx = adx_list[-1]
                last_pdi = pdi_list[-1]
                last_mdi = mdi_list[-1]
                dist_pct = abs(b0.close - last_ema) / last_ema * 100
                is_uptrend = last_pdi > last_mdi
                if last_adx >= 25.0 and dist_pct <= 2.5 and can_open_trade(sym):
                    side = "long" if is_uptrend else "short"
                    entry_p = b0.close
                    stop_p = entry_p - 1.25 * atr if side == "long" else entry_p + 1.25 * atr
                    target_p = entry_p + 2.5 * atr if side == "long" else entry_p - 2.5 * atr
                    risk_d = abs(entry_p - stop_p) * pt_val
                    qty = max(1, int(RISK_PER_TRADE_DOLLARS // risk_d)) if risk_d > 0 else 1
                    new_t = {
                        "id": f"pt_{sym}_Wisely_{cur_date.replace('-','')}_{trade_id_seq}",
                        "symbol": sym, "symbol_name": sym_name, "strategy": "YouHaveChosenWisely", "side": side,
                        "entry_date": cur_date, "entry_price": round(entry_p, 4), "qty": qty,
                        "stop_loss": round(stop_p, 4), "profit_target": round(target_p, 4),
                        "point_value": pt_val, "status": "OPEN", "current_price": round(b0.close, 4),
                        "duration_days": 0, "initial_risk": round(risk_d * qty, 2),
                        "created_at": cur_date + "T13:30:00Z", "updated_at": cur_date + "T20:00:00Z"
                    }
                    apply_trade_accounting(new_t, is_open=True, gross_pnl=0.0, ref_price=b0.close)
                    trades.append(new_t)
                    trade_id_seq += 1

            # Strategy 4: TooHot TooCold (OD/ID Breakout with 1.0x ATR Stop & Dynamic BE)
            is_inside = (b1.high <= b2.high) and (b1.low >= b2.low)
            is_outside = (b1.high > b2.high) and (b1.low < b2.low)
            if (is_inside or is_outside) and cur_adx < 35.0 and can_open_trade(sym):
                if b0.high > b1.high:
                    entry_p = b1.high
                    stop_p = entry_p - 1.0 * atr
                    target_p = entry_p + 2.0 * atr
                    risk_d = abs(entry_p - stop_p) * pt_val
                    qty = max(1, int(RISK_PER_TRADE_DOLLARS // risk_d)) if risk_d > 0 else 1
                    new_t = {
                        "id": f"pt_{sym}_THTC_{cur_date.replace('-','')}_{trade_id_seq}",
                        "symbol": sym, "symbol_name": sym_name, "strategy": "TooHot TooCold", "side": "long",
                        "entry_date": cur_date, "entry_price": round(entry_p, 4), "qty": qty,
                        "stop_loss": round(stop_p, 4), "profit_target": round(target_p, 4),
                        "point_value": pt_val, "status": "OPEN", "current_price": round(b0.close, 4),
                        "duration_days": 0, "initial_risk": round(risk_d * qty, 2),
                        "created_at": cur_date + "T13:30:00Z", "updated_at": cur_date + "T20:00:00Z"
                    }
                    apply_trade_accounting(new_t, is_open=True, gross_pnl=(b0.close - entry_p) * pt_val * qty, ref_price=b0.close)
                    trades.append(new_t)
                    trade_id_seq += 1
                elif b0.low < b1.low:
                    entry_p = b1.low
                    stop_p = entry_p + 1.0 * atr
                    target_p = entry_p - 2.0 * atr
                    risk_d = abs(entry_p - stop_p) * pt_val
                    qty = max(1, int(RISK_PER_TRADE_DOLLARS // risk_d)) if risk_d > 0 else 1
                    new_t = {
                        "id": f"pt_{sym}_THTC_{cur_date.replace('-','')}_{trade_id_seq}",
                        "symbol": sym, "symbol_name": sym_name, "strategy": "TooHot TooCold", "side": "short",
                        "entry_date": cur_date, "entry_price": round(entry_p, 4), "qty": qty,
                        "stop_loss": round(stop_p, 4), "profit_target": round(target_p, 4),
                        "point_value": pt_val, "status": "OPEN", "current_price": round(b0.close, 4),
                        "duration_days": 0, "initial_risk": round(risk_d * qty, 2),
                        "created_at": cur_date + "T13:30:00Z", "updated_at": cur_date + "T20:00:00Z"
                    }
                    apply_trade_accounting(new_t, is_open=True, gross_pnl=(entry_p - b0.close) * pt_val * qty, ref_price=b0.close)
                    trades.append(new_t)
                    trade_id_seq += 1

            # Strategy 5: The Linda (Trend Day No-Touch Fade at Opening Bell)
            emas20 = compute_ema([b.close for b in bars[:-1]], 20)
            if len(emas20) >= 20:
                ema20_prev = emas20[-1]
                b1_range = b1.high - b1.low
                if b1_range > 0 and atr_prev > 0 and (b1_range / atr_prev) >= 0.55:
                    trend_strength = (b1.close - b1.low) / b1_range
                    is_bull_thrust = trend_strength >= 0.70 and b1.low > ema20_prev
                    is_bear_thrust = trend_strength <= 0.30 and b1.high < ema20_prev
                    
                    if (is_bull_thrust or is_bear_thrust) and can_open_trade(sym):
                        side = "short" if is_bull_thrust else "long"
                        entry_p = b0.open  # Opening bell entry
                        target_p = ema20_prev  # Mean reversion to EMA20
                        stop_p = (b1.high + atr_prev) if is_bull_thrust else (b1.low - atr_prev)
                        risk_d = abs(entry_p - stop_p) * pt_val
                        qty = max(1, int(RISK_PER_TRADE_DOLLARS // risk_d)) if risk_d > 0 else 1
                        
                        # Evaluate same-day exit on b0
                        is_stopped = (side == "long" and b0.low <= stop_p) or (side == "short" and b0.high >= stop_p)
                        hit_target = (side == "long" and b0.high >= target_p) or (side == "short" and b0.low <= target_p)
                        
                        if is_stopped:
                            stat = "STOPPED_OUT"
                            exit_p = stop_p
                        elif hit_target:
                            stat = "HIT_TARGET"
                            exit_p = target_p
                        else:
                            stat = "EOD_EXIT"
                            exit_p = b0.close
                            
                        gross_pnl = (exit_p - entry_p if side == "long" else entry_p - exit_p) * pt_val * qty
                        new_t = {
                            "id": f"pt_{sym}_Linda_{cur_date.replace('-','')}_{trade_id_seq}",
                            "symbol": sym, "symbol_name": sym_name, "strategy": "The Linda", "side": side,
                            "entry_date": cur_date, "entry_price": round(entry_p, 4), "qty": qty,
                            "stop_loss": round(stop_p, 4), "profit_target": round(target_p, 4),
                            "point_value": pt_val, "status": stat, "exit_date": cur_date, "exit_price": round(exit_p, 4),
                            "current_price": round(b0.close, 4), "duration_days": 0, "initial_risk": round(risk_d * qty, 2),
                            "created_at": cur_date + "T13:30:00Z", "updated_at": cur_date + "T20:00:00Z"
                        }
                        apply_trade_accounting(new_t, is_open=False, gross_pnl=gross_pnl, ref_price=exit_p)
                        trades.append(new_t)
                        trade_id_seq += 1

        # 3. RECORD DAILY MARK-TO-MARKET PORTFOLIO EQUITY SNAPSHOT
        if trades:
            realized_to_date = sum(float(t.get("realized_pnl", 0.0)) for t in trades if t.get("status") != "OPEN")
            unrealized_today = sum(float(t.get("unrealized_pnl", 0.0)) for t in trades if t.get("status") == "OPEN")
            cum_pnl_day = round(realized_to_date + unrealized_today, 2)
            cur_eq = round(STARTING_PORTFOLIO_CAPITAL + cum_pnl_day, 2)
            if cur_eq > peak_eq:
                peak_eq = cur_eq
            dd_pct = round(((peak_eq - cur_eq) / peak_eq) * 100, 2) if peak_eq > 0 else 0.0
            if dd_pct > max_dd:
                max_dd = dd_pct
            eq_curve.append({
                "date": cur_date,
                "cum_pnl": cum_pnl_day,
                "equity": cur_eq,
                "drawdown_pct": dd_pct,
            })

    if not eq_curve:
        eq_curve.append({
            "date": latest_date,
            "cum_pnl": 0.0,
            "equity": STARTING_PORTFOLIO_CAPITAL,
            "drawdown_pct": 0.0,
        })

    # Calculate summary metrics (Net of Commissions & Slippage)
    closed_trades = [t for t in trades if t.get("status") in ("HIT_TARGET", "STOPPED_OUT", "MANUALLY_CLOSED", "DONCHIAN_EXIT", "TIME_EXIT", "EMA_EXIT", "EOD_EXIT")]
    open_trades = [t for t in trades if t.get("status") == "OPEN"]
    tot_realized = sum(float(t.get("realized_pnl", 0.0)) for t in closed_trades)
    tot_unrealized = sum(float(t.get("unrealized_pnl", 0.0)) for t in open_trades)
    tot_gross_realized = sum(float(t.get("gross_pnl", 0.0)) for t in closed_trades)
    tot_gross_unrealized = sum(float(t.get("gross_pnl", 0.0)) for t in open_trades)
    tot_commissions = sum(float(t.get("commission", 0.0)) for t in trades)
    tot_slippage = sum(float(t.get("slippage", 0.0)) for t in trades)
    tot_fees_and_slippage = tot_commissions + tot_slippage
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
                "gross_pnl": 0.0, "commissions": 0.0, "slippage": 0.0,
                "net_pnl": 0.0, "win_rate_pct": 0.0
            }
        sb = strat_breakdown[st]
        sb["total_trades"] += 1
        sb["gross_pnl"] += float(t.get("gross_pnl", 0.0))
        sb["commissions"] += float(t.get("commission", 0.0))
        sb["slippage"] += float(t.get("slippage", 0.0))
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
        sb["gross_pnl"] = round(sb["gross_pnl"], 2)
        sb["commissions"] = round(sb["commissions"], 2)
        sb["slippage"] = round(sb["slippage"], 2)
        cl = sb["closed_trades"]
        sb["win_rate_pct"] = round((sb["wins"] / cl * 100), 1) if cl > 0 else 0.0

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    perf_payload = {
        "timestamp": now_iso,
        "date": latest_date,
        "total_trades": len(trades),
        "open_trades_count": len(open_trades),
        "closed_trades_count": len(closed_trades),
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "win_rate_pct": round(win_rate, 1),
        "total_gross_realized_pnl": round(tot_gross_realized, 2),
        "total_gross_unrealized_pnl": round(tot_gross_unrealized, 2),
        "total_gross_pnl": round(tot_gross_realized + tot_gross_unrealized, 2),
        "total_commissions": round(tot_commissions, 2),
        "total_slippage": round(tot_slippage, 2),
        "total_fees_and_slippage": round(tot_fees_and_slippage, 2),
        "total_realized_pnl": round(tot_realized, 2),
        "total_unrealized_pnl": round(tot_unrealized, 2),
        "net_pnl": round(net_pnl, 2),
        "profit_factor": round(profit_factor, 2),
        "max_drawdown_pct": round(max_dd, 2),
        "avg_win": round(win_dollars / len(wins), 2) if wins else 0.0,
        "avg_loss": round(loss_dollars / len(losses), 2) if losses else 0.0,
        "strategy_breakdown": strat_breakdown,
        "equity_curve": eq_curve,
        "recent_trades": sorted(trades, key=lambda x: (x.get("status") == "OPEN", x.get("entry_date", ""), x.get("updated_at", "")), reverse=True)[:50]
    }

    # Sync strategy-specific open trade feeds for /odid and /trendorama/open-trades
    odid_open_payload = {
        "timestamp": now_iso,
        "date": latest_date,
        "system": "odid",
        "open_trades": [
            {
                "symbol": t["symbol"],
                "exchange": "CME",
                "currency": "USD",
                "contract_local_symbol": t.get("symbol_name", t["symbol"]),
                "side": t["side"],
                "qty": t["qty"],
                "net_qty": t["qty"] if t["side"] == "long" else -t["qty"],
                "avg_price": t["entry_price"],
            }
            for t in open_trades
            if t.get("strategy") == "TooHot TooCold"
        ],
    }
    turtle_open_payload = {
        "timestamp": now_iso,
        "date": latest_date,
        "system": "S2",
        "open_trades": [
            {
                "symbol": t["symbol"],
                "exchange": "CME",
                "currency": "USD",
                "contract_local_symbol": t.get("symbol_name", t["symbol"]),
                "side": t["side"],
                "qty": t["qty"],
                "avg_price": t["entry_price"],
                "stop_price": t["stop_loss"],
                "units": 1,
                "unrealized_pnl": t["unrealized_pnl"],
                "asof": latest_date,
            }
            for t in open_trades
            if t.get("strategy") == "Trendorama"
        ],
    }

    trades_file.write_text(json.dumps(trades, indent=2), encoding="utf-8")
    (data_dir / "paper_trades_latest.json").write_text(json.dumps({"timestamp": now_iso, "date": latest_date, "trades": trades}, indent=2), encoding="utf-8")
    (data_dir / "paper_trade_performance.json").write_text(json.dumps(perf_payload, indent=2), encoding="utf-8")
    (data_dir / "odid_open_trades_latest.json").write_text(json.dumps(odid_open_payload, indent=2), encoding="utf-8")
    (data_dir / "turtle_open_trades_latest.json").write_text(json.dumps(turtle_open_payload, indent=2), encoding="utf-8")
    print(f"  [PAPER TRADES] Updated {len(trades)} executed trades ({len(closed_trades)} closed, {len(open_trades)} open, Gross PnL: ${tot_gross_realized+tot_gross_unrealized:,.2f}, Comm+Slip: -${tot_fees_and_slippage:,.2f}, Net PnL: ${net_pnl:,.2f})")
    return open_trades


if __name__ == "__main__":
    main()

