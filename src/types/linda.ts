export type LindaDirection = 'FADE_UP' | 'FADE_DOWN';

export interface LindaSignalRow {
  symbol: string;
  asof: string;
  direction: LindaDirection;
  close: number;
  ema20: number;
  gap_pct: number;
  day_range: number;
  atr20: number;
  range_vs_atr: number;
  trend_strength: number; // 0–1: how extreme the close is in the range
  entry: number;
  target: number;       // EMA20 — the mean reversion target
  stop: number;         // 1×ATR beyond the day's extreme
  triggered: boolean;   // true = active setup for today
  reason: string;
}

export interface LindaSignalsPayload {
  timestamp: string;
  date: string;
  total_scanned: number;
  total_triggered: number;
  signals: LindaSignalRow[];
}
