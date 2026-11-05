import { useState, useCallback } from 'react';
import type { CalendarSpreadTrade } from '../types/trade';
import { fetchMultipleQuotes, formatMarketState, type YahooQuote } from '../lib/yahooFinance';
import { estimateCalendarSpread, type CalendarSpreadEstimate, type CalendarSpreadOptions } from '../lib/optionPricing';
import { fmt$ } from '../lib/formatCurrency';
import { ChevronDownIcon, RefreshIcon } from './Icons';

interface LiveEstimate {
  quote: YahooQuote;
  estimate: CalendarSpreadEstimate;
  trade: CalendarSpreadTrade;
}

interface LivePriceEstimatorProps {
  trades: CalendarSpreadTrade[];
  onUpdate?: (estimates: LiveEstimate[]) => void;
}

const DEFAULT_FRONT_TARGET_IV = 35;
const DEFAULT_BACK_TARGET_IV = 40;

export default function LivePriceEstimator({ trades, onUpdate }: LivePriceEstimatorProps) {
  const [estimates, setEstimates] = useState<LiveEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [estimationMode, setEstimationMode] = useState<'realtime' | 'post-earnings'>('post-earnings');
  const [frontTargetIV, setFrontTargetIV] = useState(DEFAULT_FRONT_TARGET_IV);
  const [backTargetIV, setBackTargetIV] = useState(DEFAULT_BACK_TARGET_IV);

  const fetchLivePrices = useCallback(async () => {
    if (trades.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const symbols = [...new Set(trades.map((t) => t.symbol))];
      const quotes = await fetchMultipleQuotes(symbols);

      if (quotes.size === 0) {
        setError('Could not fetch live quotes (CORS restriction). Use manual price entry below.');
        setLoading(false);
        return;
      }

      const newEstimates: LiveEstimate[] = [];
      const options: CalendarSpreadOptions =
        estimationMode === 'post-earnings'
          ? {
              daysForward: 1,
              frontTargetIV: frontTargetIV / 100,
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
      setError('Failed to fetch live prices. Use manual price entry below.');
    } finally {
      setLoading(false);
    }
  }, [trades, onUpdate, estimationMode, frontTargetIV, backTargetIV]);

  const totalEstimatedPnL = estimates.reduce((sum, e) => sum + e.estimate.estimatedPnL, 0);
  const currentPnL = trades.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0);
  const pnlChange = totalEstimatedPnL;

  return (
    <div className="desk-surface rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-hairline flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-desk-text">
            Post-earnings P&amp;L estimator
          </h2>
          <p className="text-xs text-desk-muted mt-0.5">
            Black-Scholes calendar spread mark simulation
          </p>
        </div>
        <button
          onClick={fetchLivePrices}
          disabled={loading || trades.length === 0}
          className="desk-btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Fetching…' : 'Fetch live AH quotes'}</span>
        </button>
      </div>

      <div className="p-4 bg-desk-deep/50 border-b border-hairline">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-desk-secondary">Mode</span>
            <select
              value={estimationMode}
              onChange={(e) => setEstimationMode(e.target.value as 'realtime' | 'post-earnings')}
              className="desk-input text-xs px-2.5 py-1.5"
            >
              <option value="post-earnings">Tomorrow (T+1 post-earnings)</option>
              <option value="realtime">Real-time (current IV)</option>
            </select>
          </div>

          {estimationMode === 'post-earnings' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-desk-secondary">Front target IV</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={frontTargetIV}
                  onChange={(e) => setFrontTargetIV(parseFloat(e.target.value) || 35)}
                  className="desk-input w-16 text-xs px-2 py-1 font-mono tabular-nums"
                />
                <span className="text-xs text-desk-muted">%</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-desk-secondary">Back target IV</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={backTargetIV}
                  onChange={(e) => setBackTargetIV(parseFloat(e.target.value) || 40)}
                  className="desk-input w-16 text-xs px-2 py-1 font-mono tabular-nums"
                />
                <span className="text-xs text-desk-muted">%</span>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="m-4 rounded-xl bg-desk-amber/10 border border-desk-amber/30 px-4 py-3 text-xs text-desk-amber">
          {error}
        </div>
      )}

      {lastUpdate && estimates.length > 0 && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="desk-well rounded-xl p-3">
              <div className="text-xs text-desk-muted">Current P&amp;L (IB)</div>
              <div className={`mt-1 text-lg font-mono font-semibold tabular-nums ${currentPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                {fmt$(currentPnL)}
              </div>
            </div>
            <div className="desk-well rounded-xl p-3">
              <div className="text-xs text-desk-muted">
                Est. P&amp;L {estimationMode === 'post-earnings' ? 'tomorrow' : 'live'}
              </div>
              <div className={`mt-1 text-lg font-mono font-semibold tabular-nums ${currentPnL + pnlChange >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                {fmt$(currentPnL + pnlChange)}
              </div>
            </div>
            <div className="desk-well rounded-xl p-3">
              <div className="text-xs text-desk-muted">Est. change</div>
              <div className={`mt-1 text-lg font-mono font-semibold tabular-nums ${pnlChange >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                {fmt$(pnlChange, 2, true)}
              </div>
            </div>
            <div className="desk-well rounded-xl p-3">
              <div className="text-xs text-desk-muted">Scenario</div>
              <div className="mt-1 text-xs font-mono text-desk-text">
                {estimationMode === 'post-earnings'
                  ? `T+1 · IV ${frontTargetIV}% / ${backTargetIV}%`
                  : 'Real-time'}
              </div>
            </div>
            <div className="desk-well rounded-xl p-3">
              <div className="text-xs text-desk-muted">Updated</div>
              <div className="mt-1 text-xs font-mono text-desk-text tabular-nums">
                {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-hairline text-desk-muted">
                <tr>
                  <th className="text-left py-2.5 px-3 font-medium">Symbol</th>
                  <th className="text-center py-2.5 px-2 font-medium">Session</th>
                  <th className="text-right py-2.5 px-2 font-medium">IB price</th>
                  <th className="text-right py-2.5 px-2 font-medium">Live price</th>
                  <th className="text-right py-2.5 px-2 font-medium">Delta</th>
                  <th className="text-right py-2.5 px-2 font-medium">Est. front</th>
                  <th className="text-right py-2.5 px-2 font-medium">Est. back</th>
                  <th className="text-right py-2.5 px-2 font-medium">Est. spread</th>
                  <th className="text-right py-2.5 px-2 font-medium">Est. P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {estimates.map(({ quote, estimate, trade }) => {
                  const ibPrice = trade.underlyingCurrentPrice || trade.underlyingEntryPrice;
                  const priceChange = quote.displayPrice - ibPrice;
                  const priceChangePct = (priceChange / ibPrice) * 100;
                  const entrySpread = trade.backEntryPrice - trade.frontEntryPrice;
                  const newSpreadChange = estimate.spreadPrice - entrySpread;
                  const totalEstPnL = newSpreadChange * trade.quantity * 100;

                  return (
                    <tr key={trade.id} className="hover:bg-desk-raised/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-semibold text-desk-text">{trade.symbol}</div>
                        <div className="text-[11px] font-mono text-desk-muted">
                          ${trade.strike} {trade.callOrPut[0]} × {trade.quantity}
                        </div>
                      </td>
                      <td className="text-center py-2.5 px-2">
                        <span className="desk-tag">{formatMarketState(quote.marketState)}</span>
                      </td>
                      <td className="text-right py-2.5 px-2 font-mono tabular-nums text-desk-secondary">
                        {fmt$(ibPrice)}
                      </td>
                      <td className="text-right py-2.5 px-2 font-mono tabular-nums font-medium text-desk-text">
                        {fmt$(quote.displayPrice)}
                      </td>
                      <td className={`text-right py-2.5 px-2 font-mono tabular-nums ${priceChange >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                        <div>{priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}</div>
                        <div className="text-[11px]">({priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(1)}%)</div>
                      </td>
                      <td className="text-right py-2.5 px-2 font-mono tabular-nums text-desk-secondary">
                        <div>{fmt$(estimate.frontPrice)}</div>
                        <div className="text-[11px] text-desk-muted">now {fmt$(trade.frontCurrentPrice)}</div>
                      </td>
                      <td className="text-right py-2.5 px-2 font-mono tabular-nums text-desk-secondary">
                        <div>{fmt$(estimate.backPrice)}</div>
                        <div className="text-[11px] text-desk-muted">now {fmt$(trade.backCurrentPrice)}</div>
                      </td>
                      <td className="text-right py-2.5 px-2 font-mono tabular-nums text-desk-text">
                        <div className="font-medium">{fmt$(estimate.spreadPrice)}</div>
                        <div className="text-[11px] text-desk-muted">entry {fmt$(entrySpread)}</div>
                      </td>
                      <td className={`text-right py-2.5 px-2 font-mono tabular-nums font-semibold ${totalEstPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                        <div>{fmt$(totalEstPnL, 0, true)}</div>
                        <div className="text-[11px] font-normal text-desk-muted">
                          ({fmt$(totalEstPnL / trade.quantity, 0)}/ct × {trade.quantity})
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!lastUpdate && !loading && (
        <div className="p-6 text-center text-xs text-desk-muted">
          Select &ldquo;Fetch live AH quotes&rdquo; to model T+1 post-earnings calendar spread values.
        </div>
      )}

      <ManualPriceEstimator
        trades={trades}
        estimationMode={estimationMode}
        frontTargetIV={frontTargetIV}
        backTargetIV={backTargetIV}
      />
    </div>
  );
}

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
    setManualPrices((prev) => ({ ...prev, [symbol]: price }));
  };

  const calculateEstimates = () => {
    const options: CalendarSpreadOptions =
      estimationMode === 'post-earnings'
        ? {
            daysForward: 1,
            frontTargetIV: frontTargetIV / 100,
            backTargetIV: backTargetIV / 100,
          }
        : {};

    const newEstimates = trades
      .filter((t) => manualPrices[t.symbol] && manualPrices[t.symbol] > 0)
      .map((trade) => {
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

  const uniqueSymbols = [...new Set(trades.map((t) => t.symbol))];

  const totalPnL = estimates.reduce((sum, { trade, estimate }) => {
    const entrySpread = trade.backEntryPrice - trade.frontEntryPrice;
    const newSpreadChange = estimate.spreadPrice - entrySpread;
    return sum + newSpreadChange * trade.quantity * 100;
  }, 0);

  if (trades.length === 0) return null;

  return (
    <div className="border-t border-hairline">
      <button
        onClick={() => setShowManual(!showManual)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-desk-raised/30 transition-colors text-xs font-medium text-desk-secondary"
      >
        <span>Manual price override</span>
        <ChevronDownIcon className={`w-4 h-4 text-desk-muted transition-transform duration-150 ${showManual ? 'rotate-180' : ''}`} />
      </button>

      {showManual && (
        <div className="p-5 bg-desk-deep/40 border-t border-hairline space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {uniqueSymbols.map((symbol) => {
              const trade = trades.find((t) => t.symbol === symbol);
              const currentPrice = trade?.underlyingCurrentPrice || trade?.underlyingEntryPrice || 0;

              return (
                <div key={symbol}>
                  <label className="block text-xs font-mono text-desk-secondary mb-1">
                    {symbol} (IB {fmt$(currentPrice)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={currentPrice.toFixed(2)}
                    value={manualPrices[symbol] || ''}
                    onChange={(e) => updateManualPrice(symbol, parseFloat(e.target.value) || 0)}
                    className="desk-input w-full px-2.5 py-1.5 text-xs font-mono tabular-nums"
                  />
                </div>
              );
            })}
          </div>

          <button
            onClick={calculateEstimates}
            className="desk-btn-primary px-4 py-2 text-xs"
          >
            Calculate {estimationMode === 'post-earnings' ? 'post-earnings' : 'live'} estimate
          </button>

          {estimates.length > 0 && (
            <div className="desk-well rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-desk-muted">
                  Estimated P&amp;L {estimationMode === 'post-earnings' ? '(tomorrow from entry)' : '(at manual price)'}
                </span>
                <span className={`text-lg font-mono font-semibold tabular-nums ${totalPnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                  {fmt$(totalPnL, 2, true)}
                </span>
              </div>

              <div className="divide-y divide-hairline">
                {estimates.map(({ trade, estimate }) => {
                  const entrySpread = trade.backEntryPrice - trade.frontEntryPrice;
                  const newSpreadChange = estimate.spreadPrice - entrySpread;
                  const tradePnL = newSpreadChange * trade.quantity * 100;

                  return (
                    <div key={trade.id} className="py-2.5 text-xs space-y-1">
                      <div className="flex justify-between font-mono tabular-nums">
                        <span className="text-desk-text font-medium">
                          {trade.symbol} ${trade.strike}{trade.callOrPut[0]} @ {fmt$(manualPrices[trade.symbol])}
                        </span>
                        <span className={`font-semibold ${tradePnL >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                          {fmt$(tradePnL, 0, true)} ({fmt$(tradePnL / trade.quantity, 0)}/ct × {trade.quantity})
                        </span>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-desk-muted flex flex-wrap gap-4">
                        <span>Front: {fmt$(trade.frontCurrentPrice)} → {fmt$(estimate.frontPrice)}</span>
                        <span>Back: {fmt$(trade.backCurrentPrice)} → {fmt$(estimate.backPrice)}</span>
                        <span>Spread: {fmt$(entrySpread)} → {fmt$(estimate.spreadPrice)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
