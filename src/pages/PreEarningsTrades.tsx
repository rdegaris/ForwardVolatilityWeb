import { useEffect, useMemo, useState } from 'react';
import { fetchJsonText } from '../lib/http';

type OpenStraddle = {
  ticker: string;
  expiry: string;
  strike: number;
  quantity: number;
  earnings_date?: string | null;
  days_to_earnings?: number | null;
  action_needed?: string | null;
  call: {
    avgCost: number;
    bid?: number | null;
    ask?: number | null;
    mid?: number | null;
  };
  put: {
    avgCost: number;
    bid?: number | null;
    ask?: number | null;
    mid?: number | null;
  };
  straddle_mid?: number | null;
  cost_basis_per_straddle: number;
  unrealized_pnl?: number | null;
  unrealized_pnl_pct?: number | null;
};

type OpenStraddlesResponse =
  | {
      ok: true;
      ib_port?: number;
      asof: string;
      open_straddles: OpenStraddle[];
    }
  | {
      ok: false;
      error: string;
    };

const API_BASE = '';

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}$${abs.toFixed(2)}`;
}

export default function PreEarningsTrades() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpenStraddlesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { res, text } = await fetchJsonText(`${API_BASE}/api/preearnings/open`, { cache: 'no-store' });
        let json: OpenStraddlesResponse;
        try {
          json = JSON.parse(text) as OpenStraddlesResponse;
        } catch {
          throw new Error('IB bridge returned invalid JSON');
        }

        if (!cancelled) {
          if (!res.ok || !json.ok) {
            setError((json as { ok: false; error: string }).error || 'IB bridge unavailable');
          }
          setData(json);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load IB data');
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const openStraddles = useMemo(() => {
    if (!data || !data.ok) return [] as OpenStraddle[];
    return data.open_straddles || [];
  }, [data]);

  const summary = useMemo(() => {
    const total = openStraddles.length;
    const totalPnl = openStraddles.reduce((acc, s) => acc + (s.unrealized_pnl || 0), 0);
    const needsAction = openStraddles.filter(s => s.action_needed).length;
    return { total, totalPnl, needsAction };
  }, [openStraddles]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-indigo-500">
            Pre-Earnings Straddles — Open Trades
          </h1>
          <p className="text-gray-300">
            Live marks and P&L pulled from IB (no manual inputs). Exit before earnings to avoid gap risk.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Requires local IB bridge + local web dev server
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-gray-400">Open Straddles</div>
            <div className="text-xl font-bold text-indigo-300">{summary.total}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-gray-400">Need Action</div>
            <div className="text-xl font-bold text-amber-300">{summary.needsAction}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-gray-400">Unrealized P&amp;L</div>
            <div className={`text-xl font-bold ${summary.totalPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {formatMoney(summary.totalPnl)}
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-gray-400">Data Source</div>
            <div className="text-xs text-gray-300">/api (proxied to local IB bridge)</div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white/10 rounded-xl p-6 border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400"></div>
              <div className="text-gray-300">Loading open straddles from IB…</div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white/10 rounded-xl p-6 border border-red-500/30 backdrop-blur-sm">
            <div className="text-red-300 font-semibold mb-2">IB bridge not reachable</div>
            <div className="text-gray-300 text-sm mb-4">{error}</div>
            <div className="text-gray-400 text-sm">
              Run the bridge locally from <span className="font-mono">forward-volatility-calculator</span>:
              <div className="mt-2 p-3 rounded-lg bg-black/30 border border-slate-700/50 font-mono text-xs whitespace-pre-wrap">
                /c/Ryan/CTA Business/Forward Volatility/forward-volatility-calculator/.venv/Scripts/python.exe ib_bridge_server.py
              </div>
              Then run the web locally (so /api can proxy):
              <div className="mt-2 p-3 rounded-lg bg-black/30 border border-slate-700/50 font-mono text-xs whitespace-pre-wrap">
                cd /c/Ryan/CTA Business/Forward Volatility/forward-volatility-web
                npm run dev
              </div>
              Then refresh this page.
            </div>
          </div>
        ) : openStraddles.length === 0 ? (
          <div className="bg-white/10 rounded-xl p-6 border border-slate-700/60 backdrop-blur-sm">
            <div className="text-gray-200 font-semibold mb-1">No open pre-earnings straddles found</div>
            <div className="text-gray-400 text-sm">
              This page detects long straddles from IB positions (paired long call + long put, same strike/expiry).
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {openStraddles.map((s, idx) => {
              const urgent = !!s.action_needed;
              return (
                <div
                  key={`${s.ticker}-${s.expiry}-${s.strike}-${idx}`}
                  className={`rounded-xl overflow-hidden backdrop-blur-sm border ${
                    urgent ? 'bg-amber-900/20 border-amber-500/30' : 'bg-white/10 border-slate-700/60'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl font-bold font-mono">{s.ticker}</span>
                          {s.action_needed ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/40">
                              {s.action_needed}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                              OK
                            </span>
                          )}
                        </div>
                        <div className="text-gray-300 text-sm mt-1">
                          Long {s.quantity}× ATM Straddle · {s.expiry} · ${s.strike.toFixed(0)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold font-mono ${(s.unrealized_pnl || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {formatMoney(s.unrealized_pnl || 0)}
                        </div>
                        <div className="text-xs text-gray-400">Unrealized P&amp;L</div>
                        {s.unrealized_pnl_pct !== null && s.unrealized_pnl_pct !== undefined && (
                          <div className="text-xs text-gray-300">{s.unrealized_pnl_pct.toFixed(2)}%</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-5">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Earnings</div>
                        <div className="font-mono text-sm">{s.earnings_date || '—'}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Days To</div>
                        <div className={`text-lg font-bold ${
                          (s.days_to_earnings ?? 999) <= 1 ? 'text-rose-300' : (s.days_to_earnings ?? 999) <= 3 ? 'text-amber-300' : 'text-emerald-300'
                        }`}>
                          {s.days_to_earnings ?? '—'}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Call Mid</div>
                        <div className="font-mono text-sm">{s.call.mid ?? '—'}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Put Mid</div>
                        <div className="font-mono text-sm">{s.put.mid ?? '—'}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Straddle Mid</div>
                        <div className="font-mono text-sm">{s.straddle_mid ?? '—'}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-xs text-gray-400 mb-1">Cost / Straddle</div>
                        <div className="font-mono text-sm">{s.cost_basis_per_straddle.toFixed(4)}</div>
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
