/**
 * TradingView symbol mapping for OzCTA futures contracts.
 * Uses continuous front-month contracts (1!) for all symbols.
 */
export const TV_SYMBOLS: Record<string, string> = {
  ES:  'TVC:SPX',
  NQ:  'TVC:NDX',
  RTY: 'TVC:RUT',
  YM:  'TVC:DJI',
  GC:  'TVC:GOLD',
  SI:  'TVC:SILVER',
  CL:  'TVC:USOIL',
  NG:  'TVC:NATGAS',
  '6E': 'FX:EURUSD',
  '6J': 'FX:USDJPY',
  '6B': 'FX:GBPUSD',
  ZB:  'TVC:US30Y',
  ZN:  'TVC:US10Y',
};

/**
 * Default chart interval per strategy.
 * Linda uses 15m for pit session EMA; Trendorama uses Daily.
 */
export const STRATEGY_INTERVALS: Record<string, string> = {
  linda:     '15',   // 15-minute — pit session EMA is the key indicator
  grail:     'D',    // Daily — ADX and 20 EMA pullback on daily bars
  taylor:    'D',    // Daily — 3-day cycle uses daily bars
  trendorama:'D',    // Daily — 55-day Donchian breakout
  odid:      'D',    // Daily — outside/inside day patterns
};

/**
 * LBR indicator studies for TradingView widget.
 * Matches her documented setup: Keltner(20, 2.5), EMA(20), MACD(3,10,16).
 */
export const LBR_STUDIES = [
  {
    id: 'MAExp@tv-basicstudies',
    inputs: { length: 20 },
    overrides: { 'plot.color': '#60a5fa', 'plot.linewidth': 2 }, // blue-400
  },
  {
    id: 'KeltnerChannels@tv-basicstudies',
    inputs: { length: 20, mult: 2.5 },
    overrides: {
      'upper.color': '#818cf8',   // indigo-400
      'lower.color': '#818cf8',
      'middle.color': '#60a5fa', // blue-400
    },
  },
  {
    id: 'MACD@tv-basicstudies',
    inputs: { fast_length: 3, slow_length: 10, signal_smoothing: 16 },
    overrides: {},
  },
];
