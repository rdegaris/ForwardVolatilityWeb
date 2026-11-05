import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../lib/http';

interface HistoricalMove {
  earnings_date: string;
  hour?: string | null;
  realized_move_pct: number;
}

interface PreEarningsStraddleOpportunity {
  ticker: string;
  price: number;
  earnings_date: string;
  days_to_earnings: number;
  expiry: string;
  expiry_dte: number;
  expiry_is_monthly: boolean;
  strike: number;
  call_mid: number;
  put_mid: number;
  straddle_mid: number;
  implied_move_pct: number;
  historical_realized_moves: HistoricalMove[];
  realized_move_avg_pct: number | null;
  realized_move_last_pct: number | null;
  ratio_implied_to_avg_realized: number | null;
  ratio_implied_to_last_realized: number | null;
  score: number | null;
  recommendation: 'CANDIDATE' | 'WATCH' | 'PASS' | string;
}

interface PreEarningsStraddlesResults {
  timestamp: string;
  date: string;
  entry_target_days: number;
  entry_window_days: number;
  universe_size: number;
  earnings_found: number;
  candidates_scanned: number;
  opportunities: PreEarningsStraddleOpportunity[];
  summary: {
    total_opportunities: number;
    total_candidate: number;
    total_watch: number;
    total_pass: number;
  };
}

function formatPct(value?: number | null) {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(2)}%`;
}

export default function PreEarningsStraddles() {
  const [results, setResults] = useState<PreEarningsStraddlesResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchJson<PreEarningsStraddlesResults>('/data/pre_earnings_straddle_latest.json', {
          cache: 'no-store',
        });
        setResults(data);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Failed to load pre-earnings straddle data');
        setLoading(false);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    if (!results) return [];
    const recommendationOrder: Record<string, number> = {
      CANDIDATE: 0,
      WATCH: 1,
      PASS: 2,
    };
    return [...results.opportunities].sort((a, b) => {
      const orderA = recommendationOrder[a.recommendation] ?? 1;
      const orderB = recommendationOrder[b.recommendation] ?? 1;
      if (orderA !== orderB) return orderA - orderB;
      return a.days_to_earnings - b.days_to_earnings;
    });
  }, [results]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-hairline border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading pre-earnings straddles…</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="desk-surface rounded-2xl p-8 text-center">
        <p className="text-sm text-desk-down mb-2">{error || 'No data available'}</p>
        <p className="text-xs text-desk-muted">
          Run the pre-earnings straddle scanner to generate <span className="font-mono">pre_earnings_straddle_latest.json</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <section className="desk-surface rounded-2xl p-6 md:p-8 space-y-5">
        <div>
          <div className="text-xs font-mono text-desk-muted">Earnings volatility ramp</div>
          <h1 className="mt-1.5 text-2xl md:text-3xl font-semibold text-desk-text tracking-tight">
            Pre-earnings long straddles
          </h1>
          <p className="mt-1.5 text-sm text-desk-secondary">
            Candidates ~{results.entry_target_days} days prior to earnings (long ATM straddle expiring post-announcement; exited prior to release).
          </p>
        </div>

        <div className="desk-well rounded-xl p-4 text-xs text-desk-secondary leading-relaxed">
          <strong className="text-desk-up">Candidate:</strong> implied move prices below historical realized move averages.{' '}
          <strong className="text-desk-amber">Watch:</strong> inside entry window awaiting historical data or cheaper implied pricing.{' '}
          <strong className="text-desk-down">Pass:</strong> implied move already expensive relative to realized history.
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Scan date</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">{results.date}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Candidates scanned</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">{results.candidates_scanned}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Candidate</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-up tabular-nums">{results.summary.total_candidate}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Watch / pass</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">
              {results.summary.total_watch} / {results.summary.total_pass}
            </div>
          </div>
        </div>
      </section>

      {sorted.length === 0 ? (
        <div className="desk-surface rounded-2xl p-10 text-center text-sm text-desk-muted">
          No opportunities found in the current entry window.
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((o, idx) => {
            const isCandidate = o.recommendation === 'CANDIDATE';
            const isWatch = o.recommendation === 'WATCH';
            const missingHistory = o.realized_move_avg_pct === null || o.realized_move_last_pct === null;
            const ratioAvg = typeof o.ratio_implied_to_avg_realized === 'number' ? o.ratio_implied_to_avg_realized : null;
            const ratioLast = typeof o.ratio_implied_to_last_realized === 'number' ? o.ratio_implied_to_last_realized : null;

            return (
              <div key={`${o.ticker}-${idx}`} className="desk-surface rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-2xl font-mono font-semibold text-desk-text">{o.ticker}</span>
                    <span
                      className={
                        isCandidate
                          ? 'desk-tag-up'
                          : isWatch
                          ? 'desk-tag text-desk-amber'
                          : 'desk-tag-down'
                      }
                    >
                      {o.recommendation}
                    </span>

                    {isWatch && (
                      <span className="text-xs text-desk-muted">
                        {missingHistory
                          ? 'Awaiting historical realized move series'
                          : ratioAvg !== null && ratioLast !== null
                          ? `Ratios ${ratioAvg.toFixed(2)} / ${ratioLast.toFixed(2)}`
                          : 'Awaiting cheaper implied pricing'}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-mono font-semibold text-desk-text tabular-nums">${o.price.toFixed(2)}</div>
                    <div className="text-xs text-desk-muted">Underlying</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="desk-well rounded-xl p-3">
                    <div className="text-xs text-desk-muted">Earnings</div>
                    <div className="mt-1 font-mono text-sm text-desk-text tabular-nums">
                      {new Date(o.earnings_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="desk-well rounded-xl p-3">
                    <div className="text-xs text-desk-muted">Days until</div>
                    <div className="mt-1 text-base font-mono font-semibold text-desk-text tabular-nums">{o.days_to_earnings}</div>
                  </div>
                  <div className="desk-well rounded-xl p-3">
                    <div className="text-xs text-desk-muted">Expiry</div>
                    <div className="mt-1 font-mono text-sm text-desk-text tabular-nums">
                      {new Date(o.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-[11px] text-desk-muted font-mono tabular-nums">
                      {o.expiry_is_monthly ? 'Monthly' : 'Weekly'} · {o.expiry_dte} DTE
                    </div>
                  </div>
                  <div className="desk-well rounded-xl p-3">
                    <div className="text-xs text-desk-muted">Strike</div>
                    <div className="mt-1 font-mono text-sm text-desk-text tabular-nums">${o.strike.toFixed(0)}</div>
                  </div>
                  <div className="desk-well rounded-xl p-3">
                    <div className="text-xs text-desk-muted">Implied move</div>
                    <div className="mt-1 text-base font-mono font-semibold text-desk-text tabular-nums">±{formatPct(o.implied_move_pct)}</div>
                  </div>
                  <div className="desk-well rounded-xl p-3">
                    <div className="text-xs text-desk-muted">Realized (avg / last)</div>
                    <div className="mt-1 font-mono text-xs text-desk-text tabular-nums">
                      {formatPct(o.realized_move_avg_pct)} / {formatPct(o.realized_move_last_pct)}
                    </div>
                    <div className="text-[11px] text-desk-muted font-mono tabular-nums">
                      imp/avg: {o.ratio_implied_to_avg_realized ?? '—'}
                    </div>
                  </div>
                </div>

                <div className="desk-well rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-desk-muted">Straddle mid</div>
                    <div className="mt-0.5 font-mono font-medium text-desk-text tabular-nums">${o.straddle_mid.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-desk-muted">Call / put</div>
                    <div className="mt-0.5 font-mono font-medium text-desk-text tabular-nums">${o.call_mid.toFixed(2)} / ${o.put_mid.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-desk-muted">Score</div>
                    <div className="mt-0.5 font-mono font-medium text-desk-text tabular-nums">{o.score ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-desk-muted">Exit rule</div>
                    <div className="mt-0.5 text-desk-secondary">Close prior to announcement</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
