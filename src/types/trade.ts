export interface CalendarSpreadTrade {
  id: string;
  symbol: string;
  strike: number;
  callOrPut: 'CALL' | 'PUT';
  quantity: number;
  
  // Front month (short)
  frontExpiration: string;
  frontEntryPrice: number;
  frontCurrentPrice: number;
  
  // Back month (long)
  backExpiration: string;
  backEntryPrice: number;
  backCurrentPrice: number;
  
  // Entry details
  underlyingEntryPrice: number;
  underlyingCurrentPrice: number;
  entryDate: string;
  
  // Optional Greeks
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface ScenarioAnalysis {
  priceChange: string;
  underlyingPrice: number;
  pnl: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}
