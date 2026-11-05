import { useEffect, useMemo, useState } from 'react';
import { fetchJsonText } from '../lib/http';
import { fmt$ } from '../lib/formatCurrency';

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
  return fmt$(value, 2, value < 0);
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
    const needsAction = openStraddles.filter((s) => s.action_needed).length;
    return { total, totalPnl, needsAction };
  }, [openStraddles]);

  return (
    <div className="space-y-6 pb-16">
      <section className="desk-surface rounded-2xl p-6 md:p-8">
        <div className="text-xs font-mono text-desk-muted">Local IB bridge feed</div>
        <h1 className="mt-1.5 text-2xl md:text-3xl font-semibold text-desk-text tracking-tight">
          Pre-earnings straddles — open positions
        </h1>
        <p className="mt-1.5 text-sm text-desk-secondary">
          Live marks and unrealized P&amp;L streamed from Interactive Brokers. Exit positions ahead of announcement.
        </p>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Open straddles</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">{summary.total}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Action required</div>
            <div className="mt-1 text-lg font-mono font-semibold text-desk-amber tabular-nums">{summary.needsAction}</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Unrealized P&amp;L</div>
            <div className={`mt-1 text-lg font-mono font-semibold tabular-nums ${summary.totalPnl >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
              {formatMoney(summary.totalPnl)}
            </div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Data source</div>
            <div className="mt-1 text-xs font-mono text-desk-secondary">/api/preearnings/open</div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="desk-surface rounded-2xl p-8 flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-hairline border-t-desk-text animate-spin" />
          <span className="text-sm text-desk-secondary">Loading open straddles from IB…</span>
        </div>
      ) : error ? (
        <div className="desk-surface rounded-2xl p-6 space-y-3">
          <div className="text-sm font-semibold text-desk-down">IB bridge not reachable</div>
          <div className="text-xs text-desk-secondary">{error}</div>
          <div className="text-xs text-desk-muted space-y-2 pt-2">
            <div>Start the local IB bridge from <span className="font-mono">forward-volatility-calculator</span>:</div>
            <div className="desk-well rounded-lg p-3 font-mono text-xs text-desk-text">
              python ib_bridge_server.py
            </div>
          </div>
        </div>
      ) : openStraddles.length === 0 ? (
        <div className="desk-surface rounded-2xl p-8">
          <div className="text-sm font-semibold text-desk-text">No open pre-earnings straddles found</div>
          <div className="text-xs text-desk-muted mt-1">
            Detects paired long call + long put positions with matching strike and expiration in IB.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {openStraddles.map((s, idx) => (
            <div key={`${s.ticker}-${s.expiry}-${s.strike}-${idx}`} className="desk-surface rounded-2xl p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-mono font-semibold text-desk-text">{s.ticker}</span>
                    {s.action_needed ? (
                      <span className="desk-tag text-desk-amber">{s.action_needed}</span>
                    ) : (
                      <span className="desk-tag-up">Active</span>
                    )}
                  </div>
                  <div className="text-xs text-desk-secondary font-mono mt-1 tabular-nums">
                    Long {s.quantity}× ATM straddle · {s.expiry} · ${s.strike.toFixed(0)}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className={`text-xl font-semibold ${(s.unrealized_pnl || 0) >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                    {formatMoney(s.unrealized_pnl || 0)}
                  </div>
                  <div className="text-xs text-desk-muted font-sans">Unrealized P&amp;L</div>
                  {s.unrealized_pnl_pct !== null && s.unrealized_pnl_pct !== undefined && (
                    <div className="text-xs text-desk-secondary">{s.unrealized_pnl_pct.toFixed(2)}%</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-5">
                <div className="desk-well rounded-xl p-3">
                  <div className="text-xs text-desk-muted">Earnings</div>
                  <div className="mt-1 font-mono text-sm text-desk-text tabular-nums">{s.earnings_date || '—'}</div>
                </div>
                <div className="desk-well rounded-xl p-3">
                  <div className="text-xs text-desk-muted">Days to</div>
                  <div className="mt-1 text-base font-mono font-semibold text-desk-text tabular-nums">
                    {s.days_to_earnings ?? '—'}
                  </div>
                </div>
                <div className="desk-well rounded-xl p-3">
                  <div className="text-xs text-desk-muted">Call mid</div>
                  <div className="mt-1 font-mono text-sm text-desk-text tabular-nums">{s.call.mid ?? '—'}</div>
                </div>
                <div className="desk-well rounded-xl p-3">
                  <div className="text-xs text-desk-muted">Put mid</div>
                  <div className="mt-1 font-mono text-sm text-desk-text tabular-nums">{s.put.mid ?? '—'}</div>
                </div>
                <div className="desk-well rounded-xl p-3">
                  <div className="text-xs text-desk-muted">Straddle mid</div>
                  <div className="mt-1 font-mono text-sm text-desk-text tabular-nums">{s.straddle_mid ?? '—'}</div>
                </div>
                <div className="desk-well rounded-xl p-3">
                  <div className="text-xs text-desk-muted">Cost / straddle</div>
                  <div className="mt-1 font-mono text-sm text-desk-text tabular-nums">{s.cost_basis_per_straddle.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
