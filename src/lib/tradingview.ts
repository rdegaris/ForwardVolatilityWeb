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
 * LBR Baseline Indicators for TradingView widget.
 * Exact LBR specs: Keltner Channels (20, 2.5), EMA (20), LBR 3/10 MACD (3, 10, 16).
 * Loaded in ALL instances across ALL strategies as the baseline chart setup.
 */
export const LBR_STUDIES = [
  'MAExp@tv-basicstudies',
  'Keltner Channels@tv-basicstudies',
  'MACD@tv-basicstudies',
];

export const LBR_STUDIES_OVERRIDES = {
  // 20 EMA
  "moving average exponential.length": 20,
  "moving average exponential.plot.color": "#60a5fa",
  "moving average exponential.plot.linewidth": 2,

  // Keltner Channels (20 EMA, 2.5 ATR)
  "keltner channels.length": 20,
  "keltner channels.mult": 2.5,
  "keltner channels.use exp": true,
  "keltner channels.bands style": "ATR",
  "keltner channels.upper.color": "#818cf8",
  "keltner channels.lower.color": "#818cf8",
  "keltner channels.middle.color": "#60a5fa",

  // LBR 3/10 MACD (3, 10, 16)
  "macd.fast length": 3,
  "macd.slow length": 10,
  "macd.signal length": 16,
  "macd.signalLength": 16,
  "macd.signal_length": 16,
  "macd.signal_smoothing": 16,
};
