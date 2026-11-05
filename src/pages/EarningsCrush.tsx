import { useState, useEffect } from 'react';
import { fetchJson } from '../lib/http';
import { fmt$ } from '../lib/formatCurrency';

interface EarningsCrushTrade {
  ticker: string;
  price: number;
  earnings_date: string;
  days_to_earnings: number;
  iv: number;
  expected_move: number;
  expected_move_pct: number;
  recommendation: string;
  reason?: string;
  criteria: {
    avg_volume: boolean;
    iv30_rv30: boolean;
    ts_slope_positive: boolean;
    iv_slope_pct?: number;
  };
  suggested_trade?: {
    strike: number;
    sell_expiration: string;
    buy_expiration: string;
    sell_dte: number;
    buy_dte: number;
  };
}

interface EarningsCrushResults {
  timestamp: string;
  date: string;
  total_scanned: number;
  opportunities: EarningsCrushTrade[];
  summary?: {
    avg_iv: number;
    avg_expected_move: number;
    total_opportunities: number;
  };
}

export default function EarningsCrush() {
  const [results, setResults] = useState<EarningsCrushResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchJson<EarningsCrushResults>('/data/earnings_crush_latest.json', { cache: 'no-store' });
        setResults(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load earnings crush data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-hairline border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading earnings crush setups…</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="desk-surface rounded-2xl p-8 text-center">
        <p className="text-sm text-desk-down mb-2">{error || 'No data available'}</p>
        <p className="text-xs text-desk-muted">Run the earnings crush scanner to generate data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <section className="desk-surface rounded-2xl p-6 md:p-8">
        <div className="text-xs font-mono text-desk-muted">Options volatility scanner</div>
        <h1 className="mt-1.5 text-2xl md:text-3xl font-semibold text-desk-text tracking-tight">
          Earnings crush scanner
        </h1>
        <p className="mt-1.5 text-sm text-desk-secondary">
          Calendar spread candidates targeting post-announcement implied volatility compression.
        </p>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Scan date</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">{results.date}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Universe scanned</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">{results.total_scanned}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Opportunities</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-up tabular-nums">{results.opportunities.length}</div>
          </div>
          {results.summary && (
            <div className="desk-well rounded-xl p-4">
              <div className="text-xs text-desk-muted">Average IV</div>
              <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">{results.summary.avg_iv.toFixed(1)}%</div>
            </div>
          )}
        </div>
      </section>

      {results.opportunities.length > 0 ? (
        <div className="space-y-4">
          {results.opportunities.map((trade, idx) => {
            const isRecommended = trade.recommendation === 'RECOMMENDED';
            const isConsider = trade.recommendation === 'CONSIDER';

            return (
              <div key={idx} className="desk-surface rounded-2xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-2xl font-mono font-semibold text-desk-text">{trade.ticker}</span>
                      <span
                        className={
                          isRecommended
                            ? 'desk-tag-up'
                            : isConsider
                            ? 'desk-tag text-desk-amber'
                            : 'desk-tag-down'
                        }
                      >
                        {trade.recommendation}
                      </span>
                      {trade.reason && (
                        <span className="text-xs text-desk-muted">{trade.reason}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-mono font-semibold text-desk-text tabular-nums">{fmt$(trade.price)}</div>
                      <div className="text-xs text-desk-muted">Underlying</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="desk-well rounded-xl p-3">
                      <div className="text-xs text-desk-muted">Earnings date</div>
                      <div className="mt-1 font-mono text-sm text-desk-text tabular-nums">
                        {new Date(trade.earnings_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="desk-well rounded-xl p-3">
                      <div className="text-xs text-desk-muted">Days until</div>
                      <div className="mt-1 text-base font-mono font-semibold text-desk-text tabular-nums">
                        {trade.days_to_earnings}
                      </div>
                    </div>
                    <div className="desk-well rounded-xl p-3">
                      <div className="text-xs text-desk-muted">Implied vol</div>
                      <div className="mt-1 text-base font-mono font-semibold text-desk-text tabular-nums">
                        {trade.iv.toFixed(1)}%
                      </div>
                    </div>
                    <div className="desk-well rounded-xl p-3">
                      <div className="text-xs text-desk-muted">Expected move</div>
                      <div className="mt-1 text-base font-mono font-semibold text-desk-up tabular-nums">
                        ±{trade.expected_move_pct.toFixed(1)}%
                      </div>
                    </div>
                    <div className="desk-well rounded-xl p-3">
                      <div className="text-xs text-desk-muted">Expected move ($)</div>
                      <div className="mt-1 font-mono text-sm text-desk-text tabular-nums">
                        {fmt$(trade.expected_move)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={trade.criteria.avg_volume ? 'desk-tag-up' : 'desk-tag-down'}>
                      Volume &gt; 1.5M: {trade.criteria.avg_volume ? 'Pass' : 'Fail'}
                    </span>
                    <span className={trade.criteria.iv30_rv30 ? 'desk-tag-up' : 'desk-tag-down'}>
                      IV/RV &gt; 1.25: {trade.criteria.iv30_rv30 ? 'Pass' : 'Fail'}
                    </span>
                    <span className={trade.criteria.ts_slope_positive ? 'desk-tag-up' : 'desk-tag-down'}>
                      Term slope{trade.criteria.iv_slope_pct ? ` (+${trade.criteria.iv_slope_pct.toFixed(0)}%)` : ''}: {trade.criteria.ts_slope_positive ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                </div>

                {isRecommended && trade.suggested_trade && (
                  <div className="border-t border-hairline bg-desk-deep/50 p-6">
                    <div className="text-xs font-semibold text-desk-text mb-3">
                      Suggested calendar spread structure
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="desk-well rounded-xl p-4">
                        <div className="text-xs font-semibold text-desk-down mb-2.5">
                          Short front leg
                        </div>
                        <div className="space-y-1.5 text-xs font-mono tabular-nums">
                          <div className="flex justify-between">
                            <span className="text-desk-muted font-sans">Strike</span>
                            <span className="text-desk-text font-semibold">{fmt$(trade.suggested_trade.strike, 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-desk-muted font-sans">Expiration</span>
                            <span className="text-desk-text">{new Date(trade.suggested_trade.sell_expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-desk-muted font-sans">DTE</span>
                            <span className="text-desk-text">{trade.suggested_trade.sell_dte}d</span>
                          </div>
                        </div>
                      </div>

                      <div className="desk-well rounded-xl p-4">
                        <div className="text-xs font-semibold text-desk-up mb-2.5">
                          Long back leg
                        </div>
                        <div className="space-y-1.5 text-xs font-mono tabular-nums">
                          <div className="flex justify-between">
                            <span className="text-desk-muted font-sans">Strike</span>
                            <span className="text-desk-text font-semibold">{fmt$(trade.suggested_trade.strike, 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-desk-muted font-sans">Expiration</span>
                            <span className="text-desk-text">{new Date(trade.suggested_trade.buy_expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-desk-muted font-sans">DTE</span>
                            <span className="text-desk-text">{trade.suggested_trade.buy_dte}d</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="desk-surface rounded-2xl p-12 text-center text-sm text-desk-muted">
          No earnings crush opportunities found in the latest scan.
        </div>
      )}

      <div className="desk-surface rounded-2xl p-6 space-y-2">
        <h3 className="text-sm font-semibold text-desk-text">Methodology</h3>
        <p className="text-xs text-desk-secondary leading-relaxed">
          Screens upcoming corporate earnings where front-week implied volatility trades at a steep backwardation premium to 30-day realized and back-month implied volatility, structuring horizontal ATM calendar spreads ahead of the announcement.
        </p>
      </div>
    </div>
  );
}
