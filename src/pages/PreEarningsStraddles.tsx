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
    return [...results.opportunities].sort((a, b) => {
      const as = a.score ?? -1e9;
      const bs = b.score ?? -1e9;
      return bs - as;
    });
  }, [results]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading pre-earnings straddles...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center max-w-lg">
          <p className="text-red-400 mb-4">⚠️ {error || 'No data available'}</p>
          <p className="text-gray-400 text-sm">
            Run the daily scanner (or the Pre-Earnings Straddles scan) to generate{' '}
            <span className="font-mono">pre_earnings_straddle_latest.json</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-indigo-500">
            Pre-Earnings Long Straddles
          </h1>
          <p className="text-gray-300 mb-6">
            Candidates ~{results.entry_target_days} days before earnings (buy ATM straddle expiring after earnings; exit before earnings).
          </p>

          <div className="bg-white/10 rounded-xl p-4 border border-slate-700/60 backdrop-blur-sm">
            <div className="text-sm text-gray-200 font-semibold mb-1">How to read WATCH</div>
            <div className="text-sm text-gray-300">
              <span className="font-semibold text-emerald-200">CANDIDATE</span>: implied move is "cheap" vs historical realized (scanner requires both ratios).
              {' '}
              <span className="font-semibold text-amber-200">WATCH</span>: inside the entry window, but either (a) no historical realized move data yet (ratios show —), or (b) implied move isn’t cheap enough yet.
              {' '}
              <span className="font-semibold text-rose-200">PASS</span>: implied move is expensive vs history.
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Scan Date</div>
              <div className="text-xl font-bold">{results.date}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">Candidates Scanned</div>
              <div className="text-xl font-bold text-indigo-300">{results.candidates_scanned}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">CANDIDATE</div>
              <div className="text-xl font-bold text-emerald-300">{results.summary.total_candidate}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-gray-400">WATCH / PASS</div>
              <div className="text-xl font-bold text-gray-200">
                {results.summary.total_watch} / {results.summary.total_pass}
              </div>
            </div>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-white/10 rounded-lg p-6 border border-slate-700/60">
            <div className="text-gray-300">No opportunities found in the entry window.</div>
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
                <div
                  key={`${o.ticker}-${idx}`}
                  className={`rounded-xl overflow-hidden backdrop-blur-sm border ${
                    isCandidate
                      ? 'bg-emerald-900/15 border-emerald-500/25'
                      : isWatch
                        ? 'bg-white/10 border-slate-700/60'
                        : 'bg-rose-900/10 border-rose-500/20'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-bold font-mono">{o.ticker}</span>
                        <span
                          className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                            isCandidate
                              ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/35'
                              : isWatch
                                ? 'bg-amber-500/10 text-amber-200 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-200 border-rose-500/30'
                          }`}
                        >
                          {o.recommendation}
                        </span>

                        {isWatch ? (
                          <span className="text-xs text-gray-300">
                            {missingHistory
                              ? 'Waiting: historical realized move data'
                              : ratioAvg !== null && ratioLast !== null
                                ? `Waiting: implied cheaper (ratios ${ratioAvg.toFixed(2)} / ${ratioLast.toFixed(2)})`
                                : 'Waiting: implied cheaper'}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold font-mono">${o.price.toFixed(2)}</div>
                        <div className="text-sm text-gray-400">Underlying</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Earnings</div>
                        <div className="font-mono text-sm">
                          {new Date(o.earnings_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Days Until</div>
                        <div className="text-lg font-bold text-gray-200">{o.days_to_earnings}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Expiry</div>
                        <div className="font-mono text-sm">{new Date(o.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div className="text-xs text-gray-400">{o.expiry_is_monthly ? 'Monthly' : 'Weekly'} • {o.expiry_dte} DTE</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Strike</div>
                        <div className="font-mono text-sm">${o.strike.toFixed(0)}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Implied Move</div>
                        <div className="text-lg font-bold text-indigo-200">±{formatPct(o.implied_move_pct)}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Realized (avg / last)</div>
                        <div className="text-sm text-gray-200">
                          {formatPct(o.realized_move_avg_pct)} / {formatPct(o.realized_move_last_pct)}
                        </div>
                        <div className="text-xs text-gray-400">
                          ratio (imp/avg): {o.ratio_implied_to_avg_realized ?? '—'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 bg-black/20 rounded-lg p-4 border border-slate-700/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Straddle Mid</div>
                          <div className="font-mono text-gray-100">${o.straddle_mid.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Call / Put</div>
                          <div className="font-mono text-gray-100">${o.call_mid.toFixed(2)} / ${o.put_mid.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Score</div>
                          <div className="font-mono text-gray-100">{o.score ?? '—'}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Note</div>
                          <div className="text-gray-300">Exit before earnings (no gap hold)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
