export type TaylorSession = 'ASIA' | 'LONDON' | 'US' | 'DAILY';

export type TaylorSignalItem = {
  symbol: string;
  asof: string;
  cycle_phase: 'BUY_DAY' | 'SELL_DAY' | 'SELL_SHORT_DAY';
  cycle_day: number;
  close: number;
  buying_objective: number;
  selling_objective: number;
  buying_pressure: number;
  selling_pressure: number;
  high_resistance?: number;
  low_support?: number;
  action: 'BUY_LONG' | 'SELL_EXIT' | 'SELL_SHORT' | 'WATCH';
  entry_target: number;
  profit_target: number;
  stop_loss: number;
  entry_session?: TaylorSession;
  impulse_session?: TaylorSession | null;
  hourly_divergence?: 'BUY_DIV' | 'SELL_DIV' | null;
  divergence_time_et?: string | null;
  keltner_pierce?: boolean;
  fx_pair_confirmed?: boolean;
  eligible?: boolean;
  notes?: string;
};

export type TaylorSignalsPayload = {
  date: string;
  timestamp: string;
  total_scanned: number;
  summary: {
    buy_day_count: number;
    sell_day_count: number;
    sell_short_day_count: number;
    hourly_div_count?: number;
    overnight_div_count?: number;
  };
  signals: TaylorSignalItem[];
};
