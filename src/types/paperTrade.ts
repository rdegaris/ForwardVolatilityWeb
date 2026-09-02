export interface PaperTrade {
  id: string;
  symbol: string;
  symbol_name: string;
  strategy: string; // 'Trendorama' | 'The Bradman' | 'YouHaveChosenWisely' | 'TooHot TooCold' | 'The Linda'
  side: 'long' | 'short';
  entry_date: string;
  entry_price: number;
  qty: number;
  stop_loss: number;
  profit_target?: number | null;
  point_value: number;
  status: 'OPEN' | 'HIT_TARGET' | 'STOPPED_OUT' | 'MANUALLY_CLOSED' | 'DONCHIAN_EXIT' | 'TIME_EXIT' | 'EMA_EXIT';
  exit_date?: string | null;
  exit_price?: number | string | null;
  current_price?: number | null;
  unrealized_pnl: number;
  realized_pnl: number;
  return_pct: number;
  duration_days: number;
  notes?: string | null;
  initial_risk: number;
  created_at: string;
  updated_at: string;
}

export interface StrategyPerformance {
  strategy: string;
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  wins: number;
  losses: number;
  realized_pnl: number;
  unrealized_pnl: number;
  net_pnl: number;
  win_rate_pct: number;
}

export interface EquityCurvePoint {
  date: string;
  cum_pnl: number;
  equity: number;
  drawdown_pct: number;
}

export interface PaperTradePerformancePayload {
  timestamp: string;
  date: string;
  total_trades: number;
  open_trades_count: number;
  closed_trades_count: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  total_realized_pnl: number;
  total_unrealized_pnl: number;
  net_pnl: number;
  profit_factor: number;
  max_drawdown_pct: number;
  avg_win: number;
  avg_loss: number;
  strategy_breakdown: Record<string, StrategyPerformance>;
  equity_curve: EquityCurvePoint[];
  recent_trades: PaperTrade[];
}

export interface PaperTradesPayload {
  timestamp: string;
  date: string;
  trades: PaperTrade[];
}
