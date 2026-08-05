/**
 * TradingView symbol mapping for OzCTA futures contracts.
 * Uses continuous front-month contracts (1!) for all symbols.
 */
export const TV_SYMBOLS: Record<string, string> = {
  ES:  'SPY',
  NQ:  'QQQ',
  RTY: 'IWM',
  YM:  'DIA',
  GC:  'GLD',
  SI:  'SLV',
  CL:  'USO',
  NG:  'UNG',
  '6E': 'FX:EURUSD',
  '6J': 'FX:USDJPY',
  '6B': 'FX:GBPUSD',
  ZB:  'TLT',
  ZN:  'IEF',
};

/**
 * CME futures continuous symbols for direct TradingView.com external links.
 */
export const CME_FUTURES_SYMBOLS: Record<string, string> = {
  ES:  'CME:ES1!',
  NQ:  'CME:NQ1!',
  RTY: 'CME:RTY1!',
  YM:  'CBOT:YM1!',
  GC:  'COMEX:GC1!',
  SI:  'COMEX:SI1!',
  CL:  'NYMEX:CL1!',
  NG:  'NYMEX:NG1!',
  '6E': 'CME:6E1!',
  '6J': 'CME:6J1!',
  '6B': 'CME:6B1!',
  ZB:  'CBOT:ZB1!',
  ZN:  'CBOT:ZN1!',
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
