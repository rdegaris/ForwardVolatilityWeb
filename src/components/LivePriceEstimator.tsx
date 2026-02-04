/**
 * Live Price Estimator Component
 * Fetches live/after-hours prices and estimates calendar spread P&L
 * Supports post-earnings IV modeling with target IVs
 */

import { useState, useCallback } from 'react';
import type { CalendarSpreadTrade } from '../types/trade';
import { fetchMultipleQuotes, formatMarketState, type YahooQuote } from '../lib/yahooFinance';
import { estimateCalendarSpread, type CalendarSpreadEstimate, type CalendarSpreadOptions } from '../lib/optionPricing';

interface LiveEstimate {
  quote: YahooQuote;
  estimate: CalendarSpreadEstimate;
  trade: CalendarSpreadTrade;
}

interface LivePriceEstimatorProps {
  trades: CalendarSpreadTrade[];
  onUpdate?: (estimates: LiveEstimate[]) => void;
}

// Default post-earnings IV targets (typical normalized levels)
const DEFAULT_FRONT_TARGET_IV = 35; // Front month normalizes to ~35% IV
const DEFAULT_BACK_TARGET_IV = 40;  // Back month ~40% IV (slightly higher due to more time)

export default function LivePriceEstimator({ trades, onUpdate }: LivePriceEstimatorProps) {
  const [estimates, setEstimates] = useState<LiveEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estimation mode
  const [estimationMode, setEstimationMode] = useState<'realtime' | 'post-earnings'>('post-earnings');
  // Target IVs for post-earnings (as percentages, e.g., 35 = 35%)
  const [frontTargetIV, setFrontTargetIV] = useState(DEFAULT_FRONT_TARGET_IV);
  const [backTargetIV, setBackTargetIV] = useState(DEFAULT_BACK_TARGET_IV);

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
      
      // Build options based on estimation mode
      const options: CalendarSpreadOptions = estimationMode === 'post-earnings' 
        ? {
            daysForward: 1,
            frontTargetIV: frontTargetIV / 100, // Convert percentage to decimal
            backTargetIV: backTargetIV / 100,
          }
        : {};
      
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
          trade.callOrPut === 'CALL',
          options
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
  }, [trades, onUpdate, estimationMode, frontTargetIV, backTargetIV]);

  // Get total estimated P&L
  const totalEstimatedPnL = estimates.reduce((sum, e) => sum + e.estimate.estimatedPnL, 0);
  const currentPnL = trades.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0);
  const pnlChange = totalEstimatedPnL;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 border-b border-gray-300 dark:border-gray-600 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📈</span> Post-Earnings P&L Estimator
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

      {/* Estimation Mode Settings */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode:</span>
            <select
              value={estimationMode}
              onChange={(e) => setEstimationMode(e.target.value as 'realtime' | 'post-earnings')}
              className="text-sm px-2 py-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="post-earnings">📅 Tomorrow (Post-Earnings)</option>
              <option value="realtime">⚡ Real-time (Current IV)</option>
            </select>
          </div>
          
          {estimationMode === 'post-earnings' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Front Target IV:</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={frontTargetIV}
                  onChange={(e) => setFrontTargetIV(parseFloat(e.target.value) || 35)}
                  className="w-16 text-sm px-2 py-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Back Target IV:</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={backTargetIV}
                  onChange={(e) => setBackTargetIV(parseFloat(e.target.value) || 40)}
                  className="w-16 text-sm px-2 py-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </>
          )}
        </div>
        
        {estimationMode === 'post-earnings' && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            💡 <strong>Post-earnings mode:</strong> Simulates tomorrow (T+1) with normalized IV levels. 
            Enter target IV after earnings (typically 30-50% for most stocks). Front month usually has slightly lower IV than back.
          </p>
        )}
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current P&L (IB)</div>
              <div className={`text-xl font-bold ${currentPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ${currentPnL.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Est. P&L {estimationMode === 'post-earnings' ? 'Tomorrow' : 'at Live Price'}
              </div>
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
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Scenario</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {estimationMode === 'post-earnings' 
                  ? `T+1, IV: ${frontTargetIV}%/${backTargetIV}%`
                  : 'Real-time'
                }
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
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Stock Δ</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Est. Front</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Est. Back</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Est. Spread</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-white">Est. P&L</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map(({ quote, estimate, trade }) => {
                  const ibPrice = trade.underlyingCurrentPrice || trade.underlyingEntryPrice;
                  const priceChange = quote.displayPrice - ibPrice;
                  const priceChangePct = (priceChange / ibPrice) * 100;
                  const currentSpread = trade.backCurrentPrice - trade.frontCurrentPrice;
                  const entrySpread = trade.backEntryPrice - trade.frontEntryPrice;
                  
                  // Calculate the total estimated P&L from entry (not just change)
                  const newSpreadChange = estimate.spreadPrice - entrySpread;
                  const totalEstPnL = newSpreadChange * trade.quantity * 100;
                  
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
                        <div className="text-xs">({priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(1)}%)</div>
                      </td>
                      <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                        <div>${estimate.frontPrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">now ${trade.frontCurrentPrice.toFixed(2)}</div>
                      </td>
                      <td className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">
                        <div>${estimate.backPrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">now ${trade.backCurrentPrice.toFixed(2)}</div>
                      </td>
                      <td className="text-right py-2 px-2 text-gray-900 dark:text-white">
                        <div className="font-semibold">${estimate.spreadPrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">entry ${entrySpread.toFixed(2)}</div>
                      </td>
                      <td className={`text-right py-2 px-2 font-bold ${totalEstPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        <div>{totalEstPnL >= 0 ? '+' : ''}${totalEstPnL.toFixed(0)}</div>
                        <div className="text-xs font-normal text-gray-500">
                          (${(totalEstPnL / trade.quantity).toFixed(0)}/contract × {trade.quantity})
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs text-green-800 dark:text-green-300">
            <p><strong>🎯 Calendar Spread Strategy:</strong> We profit when front month IV crushes more than back month. 
            {estimationMode === 'post-earnings' && (
              <> At target IVs of {frontTargetIV}% front / {backTargetIV}% back, the front option loses more time value, widening our spread.</>
            )}
            </p>
          </div>
        </div>
      )}

      {!lastUpdate && !loading && (
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">💹</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Click "Get Live AH Prices" to estimate tomorrow's P&L after earnings
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Uses Black-Scholes with configurable target IV to model post-earnings scenarios
          </p>
        </div>
      )}

      {/* Manual Price Entry */}
      <ManualPriceEstimator 
        trades={trades} 
        estimationMode={estimationMode}
        frontTargetIV={frontTargetIV}
        backTargetIV={backTargetIV}
      />
    </div>
  );
}

/**
 * Manual price entry for when Yahoo Finance is blocked
 */
function ManualPriceEstimator({ 
  trades, 
  estimationMode,
  frontTargetIV,
  backTargetIV,
}: { 
  trades: CalendarSpreadTrade[];
  estimationMode: 'realtime' | 'post-earnings';
  frontTargetIV: number;
  backTargetIV: number;
}) {
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({});
  const [showManual, setShowManual] = useState(false);
  const [estimates, setEstimates] = useState<{ trade: CalendarSpreadTrade; estimate: CalendarSpreadEstimate }[]>([]);

  const updateManualPrice = (symbol: string, price: number) => {
    setManualPrices(prev => ({ ...prev, [symbol]: price }));
  };

  const calculateEstimates = () => {
    const options: CalendarSpreadOptions = estimationMode === 'post-earnings' 
      ? {
          daysForward: 1,
          frontTargetIV: frontTargetIV / 100,
          backTargetIV: backTargetIV / 100,
        }
      : {};

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
          trade.callOrPut === 'CALL',
          options
        );
        return { trade, estimate };
      });
    
    setEstimates(newEstimates);
  };

  const uniqueSymbols = [...new Set(trades.map(t => t.symbol))];
  
  // Calculate total P&L from entry
  const totalPnL = estimates.reduce((sum, { trade, estimate }) => {
    const entrySpread = trade.backEntryPrice - trade.frontEntryPrice;
    const newSpreadChange = estimate.spreadPrice - entrySpread;
    return sum + newSpreadChange * trade.quantity * 100;
  }, 0);

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
            Calculate {estimationMode === 'post-earnings' ? 'Post-Earnings' : ''} Estimate
          </button>

          {estimates.length > 0 && (
            <div className="mt-4">
              <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated P&L {estimationMode === 'post-earnings' ? 'Tomorrow (from entry)' : 'at Price'}:
                </div>
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </div>
                
                <div className="mt-3 space-y-2">
                  {estimates.map(({ trade, estimate }) => {
                    const entrySpread = trade.backEntryPrice - trade.frontEntryPrice;
                    const newSpreadChange = estimate.spreadPrice - entrySpread;
                    const tradePnL = newSpreadChange * trade.quantity * 100;
                    
                    return (
                      <div key={trade.id} className="text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {trade.symbol} ${trade.strike}{trade.callOrPut[0]} @ ${manualPrices[trade.symbol].toFixed(2)}
                          </span>
                          <span className={`font-bold ${tradePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tradePnL >= 0 ? '+' : ''}${tradePnL.toFixed(0)}
                            <span className="text-xs text-gray-500 ml-1 font-normal">
                              (${(tradePnL / trade.quantity).toFixed(0)}/ct × {trade.quantity})
                            </span>
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 pl-2 space-y-0.5">
                          <div>Front: ${trade.frontCurrentPrice.toFixed(2)} → <span className="text-gray-700 dark:text-gray-300">${estimate.frontPrice.toFixed(2)}</span></div>
                          <div>Back: ${trade.backCurrentPrice.toFixed(2)} → <span className="text-gray-700 dark:text-gray-300">${estimate.backPrice.toFixed(2)}</span></div>
                          <div>Spread: ${entrySpread.toFixed(2)} → <span className="font-medium text-gray-700 dark:text-gray-300">${estimate.spreadPrice.toFixed(2)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
