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
  frontUnrealizedPnL?: number;
  
  // Back month (long)
  backExpiration: string;
  backEntryPrice: number;
  backCurrentPrice: number;
  backUnrealizedPnL?: number;
  
  // Entry details
  underlyingEntryPrice: number;
  underlyingCurrentPrice: number;
  entryDate: string;
  dateToClose?: string;
  unrealizedPnL?: number;
  
  // Trade status
  status?: 'open' | 'closed';
  closedDate?: string;
  realizedPnL?: number;
  closeNotes?: string;
  
  // Optional Greeks
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface DirectionalTrade {
  id: string;
  source?: string;
  symbol: string;
  strike: number;
  callOrPut: 'CALL' | 'PUT';
  quantity: number;
  expiration: string;
  entryPrice: number;
  currentPrice: number;
  underlyingEntryPrice: number;
  underlyingCurrentPrice: number;
  entryDate: string;
  unrealizedPnL?: number;
  status?: 'open' | 'closed';
  closedDate?: string;
  realizedPnL?: number;
  notes?: string;
  asOf?: string;
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
