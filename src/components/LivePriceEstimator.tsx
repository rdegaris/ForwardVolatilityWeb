/**
 * Live Price Estimator Component
 * Fetches live/after-hours prices and estimates calendar spread P&L
 */

import { useState, useCallback } from 'react';
import type { CalendarSpreadTrade } from '../types/trade';
import { fetchMultipleQuotes, formatMarketState, type YahooQuote } from '../lib/yahooFinance';
import { estimateCalendarSpread, type CalendarSpreadEstimate } from '../lib/optionPricing';

interface LiveEstimate {
  quote: YahooQuote;
  estimate: CalendarSpreadEstimate;
  trade: CalendarSpreadTrade;
}

interface LivePriceEstimatorProps {
  trades: CalendarSpreadTrade[];
  onUpdate?: (estimates: LiveEstimate[]) => void;
}

export default function LivePriceEstimator({ trades, onUpdate }: LivePriceEstimatorProps) {
  const [estimates, setEstimates] = useState<LiveEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLivePrices = useCallback(async () => {
    if (trades.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get unique symbols
      const symbols = [...new Set(trades.map(t => t.symbol))];
      
      // Fetch quotes
      const quotes = await fetchMultipleQuotes(symbols);
      
      if (quotes.size === 0) {
        setError('Could not fetch live prices. Yahoo Finance may be blocked by CORS. Try using the manual price input below.');
        setLoading(false);
        return;
      }
      
      // Calculate estimates for each trade
      const newEstimates: LiveEstimate[] = [];
      
      for (const trade of trades) {
        const quote = quotes.get(trade.symbol.toUpperCase());
        if (!quote) continue;
        
        const estimate = estimateCalendarSpread(
          trade.underlyingCurrentPrice || trade.underlyingEntryPrice,
          quote.displayPrice,
          trade.strike,
          trade.frontExpiration,
          trade.backExpiration,
          trade.frontCurrentPrice,
          trade.backCurrentPrice,
          trade.quantity,
          trade.callOrPut === 'CALL'
        );
        
        newEstimates.push({ quote, estimate, trade });
      }
      
      setEstimates(newEstimates);
      setLastUpdate(new Date());
      onUpdate?.(newEstimates);
      
    } catch (err) {
      console.error('Error fetching live prices:', err);
      setError('Failed to fetch live prices. Try using the manual price input below.');
    } finally {
      setLoading(false);
    }
  }, [trades, onUpdate]);

  // Get total estimated P&L
  const totalEstimatedPnL = estimates.reduce((sum, e) => sum + e.estimate.estimatedPnL, 0);
  const currentPnL = trades.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0);
  const pnlChange = totalEstimatedPnL;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 border-b border-gray-300 dark:border-gray-600 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📈</span> Live Price Estimator
        </h2>
        <button
          onClick={fetchLivePrices}
          disabled={loading || trades.length === 0}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Fetching...
            </>
          ) : (
            <>
              <span>🔄</span>
              Get Live AH Prices
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Note:</strong> {error}
          </p>
        </div>
      )}

      {lastUpdate && estimates.length > 0 && (
        <div className="p-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current P&L (IB)</div>
              <div className={`text-xl font-bold ${currentPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ${currentPnL.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Est. P&L at Live Price</div>
              <div className={`text-xl font-bold ${currentPnL + pnlChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ${(currentPnL + pnlChange).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Est. Change</div>
              <div className={`text-xl font-bold ${pnlChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {pnlChange >= 0 ? '+' : ''}${pnlChange.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Last Updated</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Individual estimates */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr className="border-b border-gray-300 dark:border-gray-600">
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 dark:text-white">Symbol</th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-900 dark:text-white">Market</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">IB Price</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Live Price</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Change</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Est. Front</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Est. Back</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Est. Spread</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Est. P&L Δ</th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-900 dark:text-white">Greeks</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map(({ quote, estimate, trade }) => {
                  const ibPrice = trade.underlyingCurrentPrice || trade.underlyingEntryPrice;
                  const priceChange = quote.displayPrice - ibPrice;
                  const priceChangePct = (priceChange / ibPrice) * 100;
                  const currentSpread = trade.backCurrentPrice - trade.frontCurrentPrice;
                  
                  return (
                    <tr 
                      key={trade.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-2 px-3">
                        <div className="font-bold text-gray-900 dark:text-white">{trade.symbol}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ${trade.strike} {trade.callOrPut[0]} × {trade.quantity}
                        </div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          quote.marketState === 'REGULAR' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : quote.marketState === 'POST' || quote.marketState === 'POSTPOST'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {formatMarketState(quote.marketState)}
                        </span>
                      </td>
                      <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                        ${ibPrice.toFixed(2)}
                      </td>
                      <td className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">
                        ${quote.displayPrice.toFixed(2)}
                      </td>
                      <td className={`text-right py-2 px-2 font-medium ${priceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        <div>{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}</div>
                        <div className="text-xs">({priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%)</div>
                      </td>
                      <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                        <div>${estimate.frontPrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">was ${trade.frontCurrentPrice.toFixed(2)}</div>
                      </td>
                      <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                        <div>${estimate.backPrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">was ${trade.backCurrentPrice.toFixed(2)}</div>
                      </td>
                      <td className="text-right py-2 px-2 text-gray-900 dark:text-white">
                        <div className="font-semibold">${estimate.spreadPrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">was ${currentSpread.toFixed(2)}</div>
                      </td>
                      <td className={`text-right py-2 px-2 font-bold ${estimate.estimatedPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {estimate.estimatedPnL >= 0 ? '+' : ''}${estimate.estimatedPnL.toFixed(0)}
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                          <div>Δ {estimate.spreadDelta.toFixed(3)}</div>
                          <div>Θ {estimate.spreadTheta.toFixed(2)}/day</div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-800 dark:text-blue-300">
            <p><strong>📊 How it works:</strong> Estimates use Black-Scholes pricing with implied volatility derived from current option prices. 
            The model assumes IV stays constant (in reality, IV may change with price movement). 
            Use these estimates as a rough guide, not exact values.</p>
          </div>
        </div>
      )}

      {!lastUpdate && !loading && (
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">💹</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Click "Get Live AH Prices" to fetch current stock prices and estimate P&L
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Works during after-hours trading to see real-time impact on your calendar spreads
          </p>
        </div>
      )}

      {/* Manual Price Entry */}
      <ManualPriceEstimator trades={trades} />
    </div>
  );
}

/**
 * Manual price entry for when Yahoo Finance is blocked
 */
function ManualPriceEstimator({ trades }: { trades: CalendarSpreadTrade[] }) {
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({});
  const [showManual, setShowManual] = useState(false);
  const [estimates, setEstimates] = useState<{ trade: CalendarSpreadTrade; estimate: CalendarSpreadEstimate }[]>([]);

  const updateManualPrice = (symbol: string, price: number) => {
    setManualPrices(prev => ({ ...prev, [symbol]: price }));
  };

  const calculateEstimates = () => {
    const newEstimates = trades
      .filter(t => manualPrices[t.symbol] && manualPrices[t.symbol] > 0)
      .map(trade => {
        const estimate = estimateCalendarSpread(
          trade.underlyingCurrentPrice || trade.underlyingEntryPrice,
          manualPrices[trade.symbol],
          trade.strike,
          trade.frontExpiration,
          trade.backExpiration,
          trade.frontCurrentPrice,
          trade.backCurrentPrice,
          trade.quantity,
          trade.callOrPut === 'CALL'
        );
        return { trade, estimate };
      });
    
    setEstimates(newEstimates);
  };

  const uniqueSymbols = [...new Set(trades.map(t => t.symbol))];
  const totalPnL = estimates.reduce((sum, e) => sum + e.estimate.estimatedPnL, 0);

  if (trades.length === 0) return null;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setShowManual(!showManual)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          ⌨️ Manual Price Entry (if live fetch fails)
        </span>
        <span className="text-gray-400">{showManual ? '▲' : '▼'}</span>
      </button>

      {showManual && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {uniqueSymbols.map(symbol => {
              const trade = trades.find(t => t.symbol === symbol);
              const currentPrice = trade?.underlyingCurrentPrice || trade?.underlyingEntryPrice || 0;
              
              return (
                <div key={symbol}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {symbol} (IB: ${currentPrice.toFixed(2)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={currentPrice.toFixed(2)}
                    value={manualPrices[symbol] || ''}
                    onChange={(e) => updateManualPrice(symbol, parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              );
            })}
          </div>

          <button
            onClick={calculateEstimates}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Calculate Estimate
          </button>

          {estimates.length > 0 && (
            <div className="mt-4">
              <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated P&L Change:
                </div>
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </div>
                
                <div className="mt-3 space-y-2">
                  {estimates.map(({ trade, estimate }) => (
                    <div key={trade.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {trade.symbol} ${trade.strike}{trade.callOrPut[0]} @ ${manualPrices[trade.symbol].toFixed(2)}
                      </span>
                      <span className={estimate.estimatedPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {estimate.estimatedPnL >= 0 ? '+' : ''}${estimate.estimatedPnL.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
