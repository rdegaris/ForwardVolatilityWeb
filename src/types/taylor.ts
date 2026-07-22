export type TaylorSignalItem = {
  symbol: string;
  asof: string;
  cycle_phase: 'BUY_DAY' | 'SELL_DAY' | 'SELL_SHORT_DAY';
  cycle_day: number;
  last_close: number;
  buying_objective: number;
  selling_objective: number;
  buying_pressure: number;
  selling_pressure: number;
  action: 'BUY_LONG' | 'SELL_EXIT' | 'SELL_SHORT' | 'WATCH';
  entry_target: number;
  profit_target: number;
  stop_loss: number;
  eligible: boolean;
  notes: string;
};

export type TaylorSignalsPayload = {
  date: string;
  timestamp: string;
  total_scanned: number;
  summary: {
    buy_day_count: number;
    sell_day_count: number;
    sell_short_day_count: number;
  };
  signals: TaylorSignalItem[];
};
