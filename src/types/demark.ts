export type DeMarkPhase =
  | 'COUNTDOWN_13'
  | 'COUNTDOWN_NEAR'
  | 'COUNTDOWN_ACTIVE'
  | 'SETUP_ACTIVE'
  | 'NEUTRAL';

export interface DeMarkSignalRow {
  symbol: string;
  exchange: string;
  currency: string;
  cluster?: string;
  asof: string;
  last_close: number;
  last_open: number;
  last_high: number;
  last_low: number;
  atr20: number;
  sma50: number;
  sma200: number;
  setup_count: number;
  setup_completed: boolean;
  tdst_support: number | null;
  tdst_resistance: number | null;
  countdown_count: number;
  countdown_active: boolean;
  countdown_progress_pct: number;
  bar_13_qualified: boolean;
  triggered: boolean;
  direction: 'SHORT';
  entry_price: number;
  stop_loss: number;
  profit_target: number;
  unit_qty: number;
  phase: DeMarkPhase;
  notes: string;
}

export interface DeMarkTrigger {
  symbol: string;
  exchange: string;
  currency: string;
  cluster?: string;
  side: 'short';
  asof: string;
  last_close: number;
  entry_price: number;
  stop_loss: number;
  profit_target: number;
  tdst_support: number | null;
  unit_qty: number;
  atr: number;
  countdown_count: number;
  notes: string;
}

export interface DeMarkSignalsPayload {
  timestamp: string;
  date: string;
  system: string;
  strategy: string;
  total_scanned: number;
  total_countdown_active: number;
  total_approaching_13: number;
  total_triggered: number;
  signals: DeMarkSignalRow[];
  triggered: DeMarkTrigger[];
}
