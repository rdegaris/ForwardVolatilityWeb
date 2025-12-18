export type TurtleSide = 'long' | 'short';

export interface TurtleSuggestedTrade {
  symbol: string;
  exchange?: string;
  currency?: string;
  side: TurtleSide;

  asof: string; // YYYY-MM-DD (signal computed as of)
  last_close?: number | null;

  entry_stop: number;
  stop_loss: number;
  unit_qty: number;
  max_units?: number;

  N?: number | null;
  distance_to_entry?: number | null; // price units
  distance_to_entry_N?: number | null; // in N
  pct_to_entry?: number | null; // percent

  notes?: string | null;
}

export interface TurtleSuggestedTradesPayload {
  timestamp: string;
  date: string;
  system: 'S2' | string;
  universe?: string[];
  suggested: TurtleSuggestedTrade[];
}

export interface TurtleOpenTrade {
  symbol: string;
  exchange?: string;
  currency?: string;

  contract_local_symbol?: string | null;
  contract_month?: string | null;

  side: TurtleSide;
  qty: number;
  avg_price: number;
  stop_price: number;

  units?: number | null;
  last_add_price?: number | null;
  next_add_trigger?: number | null;

  unrealized_pnl?: number | null;
  asof?: string | null;
}

export interface TurtleOpenTradesPayload {
  timestamp: string;
  date: string;
  system: 'S2' | string;
  open_trades: TurtleOpenTrade[];
}

export interface TurtleTriggerSoon {
  symbol: string;
  exchange?: string;
  side: TurtleSide;

  asof: string; // YYYY-MM-DD
  last_close: number;
  trigger_price: number;

  distance?: number;
  distance_N?: number;
  pct_away?: number;

  notes?: string | null;
}

export interface TurtleTriggersPayload {
  timestamp: string;
  date: string;
  system: 'S2' | string;
  threshold_note?: string;
  triggers: TurtleTriggerSoon[];
}
