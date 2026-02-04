/**
 * Yahoo Finance price fetcher
 * Fetches live and after-hours prices using:
 * 1. Local IB Bridge server (preferred - avoids CORS issues)
 * 2. Direct Yahoo Finance API (fallback - may be blocked by CORS)
 */

// Local bridge server URL (ib_bridge_server.py)
const LOCAL_BRIDGE_URL = 'http://127.0.0.1:8787';

export interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: number;
  preMarketPrice?: number;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
  postMarketTime?: number;
  marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED' | 'PREPRE' | 'POSTPOST';
  displayPrice: number; // The most current price (post-market if available)
}

/**
 * Try fetching quotes from local IB Bridge server first
 * Falls back to direct Yahoo Finance if bridge is unavailable
 */
export async function fetchMultipleQuotes(symbols: string[]): Promise<Map<string, YahooQuote>> {
  const results = new Map<string, YahooQuote>();
  
  if (symbols.length === 0) return results;
  
  // Try local bridge first (avoids CORS)
  try {
    const bridgeUrl = `${LOCAL_BRIDGE_URL}/api/quotes?symbols=${symbols.join(',')}`;
    const response = await fetch(bridgeUrl, { 
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.quotes) {
        for (const [symbol, quote] of Object.entries(data.quotes)) {
          const q = quote as any;
          results.set(symbol.toUpperCase(), {
            symbol: symbol.toUpperCase(),
            regularMarketPrice: q.regularMarketPrice || q.displayPrice || 0,
            regularMarketChange: q.change || 0,
            regularMarketChangePercent: q.changePercent || 0,
            regularMarketTime: Date.now() / 1000,
            displayPrice: q.displayPrice || q.regularMarketPrice || 0,
            marketState: q.marketState || 'CLOSED',
          });
        }
        console.log('[YahooFinance] Used local bridge server');
        return results;
      }
    }
  } catch (e) {
    console.log('[YahooFinance] Bridge server not available, trying direct...', e);
  }
  
  // Fallback: fetch directly from Yahoo (may be blocked by CORS)
  const promises = symbols.map(async (symbol) => {
    const quote = await fetchYahooQuote(symbol);
    if (quote) {
      results.set(symbol.toUpperCase(), quote);
    }
  });
  
  await Promise.all(promises);
  return results;
}

/**
 * Fetch live quote from Yahoo Finance directly
 * Uses the v8 chart API which doesn't require authentication
 * Note: This may be blocked by CORS in browsers
 */
export async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    // Use a CORS proxy for client-side requests
    // In production, you'd want to proxy this through your own backend
    const corsProxies = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`,
    ];

    let data: any = null;
    
    for (const url of corsProxies) {
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          data = await response.json();
          break;
        }
      } catch {
        continue;
      }
    }

    if (!data?.chart?.result?.[0]) {
      console.error('No data returned from Yahoo Finance for', symbol);
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    
    const regularMarketPrice = meta.regularMarketPrice || 0;
    const previousClose = meta.previousClose || meta.chartPreviousClose || regularMarketPrice;
    const regularMarketChange = regularMarketPrice - previousClose;
    const regularMarketChangePercent = previousClose ? (regularMarketChange / previousClose) * 100 : 0;
    
    // Determine market state and get the most current price
    const marketState = meta.marketState || 'CLOSED';
    
    // Post-market data
    const postMarketPrice = meta.postMarketPrice;
    const postMarketChange = postMarketPrice ? postMarketPrice - regularMarketPrice : undefined;
    const postMarketChangePercent = regularMarketPrice && postMarketChange 
      ? (postMarketChange / regularMarketPrice) * 100 
      : undefined;
    const postMarketTime = meta.postMarketTime;
    
    // Pre-market data
    const preMarketPrice = meta.preMarketPrice;
    
    // Determine the display price (most current)
    let displayPrice = regularMarketPrice;
    if (marketState === 'POST' || marketState === 'POSTPOST' || marketState === 'CLOSED') {
      if (postMarketPrice) {
        displayPrice = postMarketPrice;
      }
    } else if (marketState === 'PRE' || marketState === 'PREPRE') {
      if (preMarketPrice) {
        displayPrice = preMarketPrice;
      }
    }

    return {
      symbol: symbol.toUpperCase(),
      regularMarketPrice,
      regularMarketChange,
      regularMarketChangePercent,
      regularMarketTime: meta.regularMarketTime || Date.now() / 1000,
      preMarketPrice,
      postMarketPrice,
      postMarketChange,
      postMarketChangePercent,
      postMarketTime,
      marketState,
      displayPrice,
    };
  } catch (error) {
    console.error('Error fetching Yahoo quote for', symbol, error);
    return null;
  }
}

/**
 * Format market state for display
 */
export function formatMarketState(state: YahooQuote['marketState'] | string): string {
  switch (state) {
    case 'PRE':
    case 'PREPRE':
      return 'Pre-Market';
    case 'REGULAR':
      return 'Market Open';
    case 'POST':
    case 'POSTPOST':
      return 'After Hours';
    case 'CLOSED':
      return 'Market Closed';
    case 'FINNHUB':
      return 'Finnhub';
    case 'UNKNOWN':
      return 'Live';
    default:
      return state;
  }
}
