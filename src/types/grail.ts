/**
 * Types for Holy Grail Trade scanner data (Street Smarts)
 * ADX > 30 with pullback to 20-period EMA
 */

export interface GrailSignalRow {
  symbol: string;
  exchange?: string;
  currency?: string;
  side: 'long' | 'short' | 'none';
  asof: string; // YYYY-MM-DD

  close: number;
  ema20: number;
  adx: number;
  plus_di: number;
  minus_di: number;

  recent_high: number;
  recent_low: number;

  entry_zone: number;
  stop_loss?: number | null;
  target?: number | null;

  distance_to_ema_pct: number;
  eligible: boolean;
  reason: string;
  cluster?: string;
}

export interface GrailSignalsPayload {
  timestamp: string;
  date: string;
  system: 'grail' | string;
  adx_threshold: number;
  ema_touch_pct: number;
  total_scanned: number;
  total_triggered: number;
  signals: GrailSignalRow[];
  triggered: GrailSignalRow[];
}
