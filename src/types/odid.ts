export interface OdidSignalRow {
  symbol: string;
  exchange?: string;
  currency?: string;
  cluster?: string;

  asof: string;
  last_open: number;
  last_high: number;
  last_low: number;
  last_close: number;

  odid_setup_armed: boolean;
  armed_od_date?: string | null;
  armed_id_date?: string | null;
  armed_breakout_up?: number | null;
  armed_breakout_down?: number | null;
  distance_to_up_pct?: number | null;
  distance_to_down_pct?: number | null;

  breakout_window: boolean;
  breakout_confirmed: boolean;
  breakout_side?: 'long' | 'short' | null;
  breakout_entry?: number | null;
  breakout_stop?: number | null;
  breakout_od_date?: string | null;
  breakout_id_date?: string | null;

  has_open_position?: boolean;
  open_position_qty?: number;
}

export interface OdidTriggeredSignal {
  symbol: string;
  exchange?: string;
  currency?: string;
  cluster?: string;
  side: 'long' | 'short';
  asof: string;
  od_date?: string | null;
  id_date?: string | null;
  last_close: number;
  entry_stop: number;
  stop_loss: number;
  eligible?: boolean;
  blocked_reason?: string | null;
  notes?: string | null;
}

export interface OdidSignalsPayload {
  timestamp: string;
  date: string;
  system: 'odid' | string;
  pattern?: string;
  arm_alert_pct?: number;
  total_scanned: number;
  total_armed: number;
  total_triggered: number;
  signals: OdidSignalRow[];
  triggered: OdidTriggeredSignal[];
}

export interface OdidAlert {
  symbol: string;
  severity: 'high' | 'medium' | 'low' | string;
  type: string;
  side?: 'long' | 'short' | string;
  asof: string;
  message: string;
  entry_stop?: number | null;
  stop_loss?: number | null;
  eligible?: boolean;
  blocked_reason?: string | null;
}

export interface OdidAlertsPayload {
  timestamp: string;
  date: string;
  system: 'odid' | string;
  total_alerts: number;
  alerts: OdidAlert[];
}

export interface OdidOpenTrade {
  symbol: string;
  exchange?: string;
  currency?: string;
  contract_local_symbol?: string | null;
  contract_month?: string | null;
  side: 'long' | 'short';
  qty: number;
  net_qty: number;
  avg_price: number;
}

export interface OdidOpenTradesPayload {
  timestamp: string;
  date: string;
  system: 'odid' | string;
  open_trades: OdidOpenTrade[];
}
