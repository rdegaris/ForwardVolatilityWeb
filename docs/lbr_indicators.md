# Linda Raschke — Indicator Reference
# Committed to repo from session research Aug 5 2026
# Source: Street Smarts (LBR/Bandy 1995), Trading Sardines, @LindaRaschke X feed

## Platform
CQG (her primary trading platform since the 1980s)

## 1. LBR 3/10 Oscillator (bottom panel: "LBR310^")

| Component     | Type | Period | Formula                          |
|---------------|------|--------|----------------------------------|
| Fast line     | SMA  | 3, 10  | 3-SMA(close) − 10-SMA(close)    |
| Slow/Signal   | SMA  | 16     | 16-SMA of fast line              |
| Histogram     | —    | —      | Fast − Slow                      |

ALL SMAs (not EMAs). The "°" in CQG is just formula naming convention.

### Signals
- First Cross: fast crosses zero → early momentum shift (best entry)
- Second Cross: slow crosses zero → trend confirmation
- Divergence: price new high, oscillator not → weakening trend
- Hook: slow line changes direction without crossing → Anti setup / pullback

## 2. Keltner Channels (main panel, blue curved bands)

| Component    | Setting               |
|--------------|-----------------------|
| Middle band  | 20-period EMA         |
| Upper/Lower  | ±2.5 × ATR(20)        |

Used on ALL timeframes with the same settings (confirmed 5-min and 120-min charts).

### Reading:
- Price inside bands → "negative feedback" / mean-reverting mode (85% of time)
- Price riding upper band → "positive feedback" / trend mode — do NOT fade
- Price CLOSES outside band → extreme thrust — TAKE PROFITS, look for exhaustion
  - She specifically said today: "look outside above upper Keltner...good spot to take things off the table. Can always get back in if no down in next 2-3 days"

## 3. Moving Averages

| MA  | Type | Period | Use                                      |
|-----|------|--------|------------------------------------------|
| EMA | EMA  | 20     | Core trend line; Holy Grail target; pit session reference |
| SMA | SMA  | 5      | Trend persistence filter (price riding 5 SMA = extreme momentum) |

Rule: EMAs for trend tracking, SMAs for oscillator math.

## 4. Colored Dots on Price Chart

Plotted directly on price bars from 3/10 oscillator alignment:

| Color              | Condition                                              |
|--------------------|--------------------------------------------------------|
| Yellow/Pink (Buy)  | slope(slow16) > 0 AND slope(fast3/10) > 0 AND ROC(2) > 0 |
| Blue/Cyan (Sell)   | slope(slow16) < 0 AND slope(fast3/10) < 0 AND ROC(2) < 0 |

NOT standalone signals — confirm momentum alignment direction only.

## 5. ADX

| Setting   | Value |
|-----------|-------|
| Period    | 14    |
| Threshold | > 30  |

Used for Holy Grail (YouHaveChosenWisely) only. Must be > 30 to qualify.
NOTE: Our scanner was updated from 25 → 30 on Aug 5 2026 to match this spec.

## 6. Stochastic — "Anti" Setup

| Setting    | Value     |
|------------|-----------|
| %K (Fast)  | 7 periods |
| %D (Slow)  | 10 periods|
| Smoothing  | 3 or 4    |

Used to identify "lazy" pullbacks in established trends:
1. Trend established (3/10 slow line pointing firmly)
2. %K pulls back AGAINST trend
3. %K hooks back in direction of %D
4. Enter on the hook — low-risk re-entry

## 7. Session Boundaries

| Session          | Time (ET)        | UTC           | Use                    |
|------------------|------------------|---------------|------------------------|
| US Chart Start   | 8:00 AM          | 12:00 UTC     | She starts all US charts here |
| Pit Open (RTH)   | 9:30 AM          | 13:30 UTC     | Linda EMA pit session start |
| Pit Close        | 4:00 PM          | 20:00 UTC     | Pit session end        |

Explicitly confirmed via tweet: "US session SP (I start all my US session charts at 8 AM EST.)"
Pit session EMA is strictly 9:30–4:00 PM ET (confirmed: "Pit session EMA in SP")

## 8. Turtle Soup (not yet coded in OzCTA)

20-day lookback. Fades 20-day channel breakouts that immediately fail back into range.
Opposite of Trendorama (which follows 55-day breakouts).

## TradingView Equivalent Settings

For replicating her setup in TradingView:
- Keltner Channel: Length=20, Multiplier=2.5, ATR-based
- EMA: Period=20
- MACD (closest to 3/10): Fast=3, Slow=10, Signal=16, all SMA mode
- ADX: Period=14
- Stochastic: K=7, D=10, Smooth=3

## TradingView Symbol Mapping (Continuous Contracts)

| OzCTA Symbol | TradingView Symbol  |
|--------------|---------------------|
| ES           | CME_MINI:ES1!       |
| NQ           | CME_MINI:NQ1!       |
| RTY          | CME_MINI:RTY1!      |
| YM           | CBOT_MINI:YM1!      |
| GC           | COMEX:GC1!          |
| SI           | COMEX:SI1!          |
| CL           | NYMEX:CL1!          |
| NG           | NYMEX:NG1!          |
| 6E           | CME:6E1!            |
| 6J           | CME:6J1!            |
| 6B           | CME:6B1!            |
| ZB           | CBOT:ZB1!           |
| ZN           | CBOT:ZN1!           |
