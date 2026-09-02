import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { fetchJson } from '../lib/http';
import { fmt$ } from '../lib/formatCurrency';
import type {
  PaperTrade,
  PaperTradePerformancePayload,
  PaperTradesPayload,
} from '../types/paperTrade';

const STRATEGY_THEMES: Record<
  string,
  { badge: string; text: string; bg: string; dot: string }
> = {
  Trendorama: {
    badge: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
    text: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500',
    dot: 'bg-fuchsia-400',
  },
  'The Bradman': {
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    text: 'text-amber-400',
    bg: 'bg-amber-500',
    dot: 'bg-amber-400',
  },
  YouHaveChosenWisely: {
    badge: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    text: 'text-orange-400',
    bg: 'bg-orange-500',
    dot: 'bg-orange-400',
  },
  'TooHot TooCold': {
    badge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500',
    dot: 'bg-cyan-400',
  },
  'The Linda': {
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    text: 'text-rose-400',
    bg: 'bg-rose-500',
    dot: 'bg-rose-400',
  },
};

function formatPrice(val?: number | string | null, digits = 2) {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (Number.isNaN(num)) return '—';
  if (Math.abs(num) >= 1000)
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (Math.abs(num) < 2) return num.toFixed(4);
  return num.toFixed(digits);
}

function StatCard({
  title,
  value,
  sub,
  accent,
  badge,
  onClick,
  active,
  clickableHint,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent: string;
  badge?: string;
  onClick?: () => void;
  active?: boolean;
  clickableHint?: string;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      title={clickableHint || (onClick ? `Click to filter by ${title}` : undefined)}
      className={`group relative rounded-2xl border bg-slate-900/80 p-5 shadow-lg backdrop-blur transition-all duration-200 select-none ${
        onClick
          ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] ' +
            (active
              ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-950/30 shadow-indigo-950/50'
              : 'border-slate-800 hover:border-slate-600 hover:bg-slate-800/60 hover:shadow-xl')
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors">
          {title}
        </span>
        {badge ? (
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-300 border border-slate-700">
            {badge}
          </span>
        ) : onClick ? (
          <span className={`text-[10px] font-semibold transition-opacity ${active ? 'text-indigo-400 opacity-100' : 'text-slate-500 opacity-0 group-hover:opacity-100'}`}>
            {active ? 'Active' : 'View →'}
          </span>
        ) : null}
      </div>
      <div className={`mt-2 text-3xl font-black tracking-tight ${accent}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400 font-medium">{sub}</div>}
    </div>
  );
}

export default function ExecutedTrades() {
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [performance, setPerformance] =
    useState<PaperTradePerformancePayload | null>(null);

  // Filters & Navigation
  const [searchParams, setSearchParams] = useSearchParams();
  const tableRef = useRef<HTMLDivElement>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingTrade, setEditingTrade] = useState<PaperTrade | null>(null);
  const [newTarget, setNewTarget] = useState<string>('');
  const [newStop, setNewStop] = useState<string>('');

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const upper = statusParam.toUpperCase();
      if (['ALL', 'OPEN', 'CLOSED', 'HIT_TARGET', 'STOPPED_OUT'].includes(upper)) {
        setSelectedStatus(upper);
      }
    }
    const stratParam = searchParams.get('strategy');
    if (stratParam) {
      setSelectedStrategy(stratParam);
    }
  }, [searchParams]);

  const scrollToTable = () => {
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [tradesRes, perfRes] = await Promise.allSettled([
          fetchJson<PaperTradesPayload>('/data/paper_trades_latest.json', {
            cache: 'no-store',
          }),
          fetchJson<PaperTradePerformancePayload>(
            '/data/paper_trade_performance.json',
            { cache: 'no-store' }
          ),
        ]);

        if (tradesRes.status === 'fulfilled' && tradesRes.value?.trades) {
          setTrades(tradesRes.value.trades);
        }
        if (perfRes.status === 'fulfilled' && perfRes.value) {
          setPerformance(perfRes.value);
        }
      } catch (err) {
        console.error('Failed loading executed trades data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (selectedStrategy !== 'ALL' && t.strategy !== selectedStrategy)
        return false;
      if (selectedStatus === 'OPEN' && t.status !== 'OPEN') return false;
      if (selectedStatus === 'CLOSED' && t.status === 'OPEN') return false;
      if (
        selectedStatus !== 'ALL' &&
        selectedStatus !== 'OPEN' &&
        selectedStatus !== 'CLOSED' &&
        t.status !== selectedStatus
      )
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const sym = t.symbol.toLowerCase();
        const name = (t.symbol_name || '').toLowerCase();
        const strat = t.strategy.toLowerCase();
        if (!sym.includes(q) && !name.includes(q) && !strat.includes(q))
          return false;
      }
      return true;
    });
  }, [trades, selectedStrategy, selectedStatus, searchQuery]);

  const biggestWinners = useMemo(() => {
    const pool = selectedStrategy === 'ALL' ? trades : trades.filter((t) => t.strategy === selectedStrategy);
    return [...pool]
      .filter((t) => (t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl) > 0)
      .sort((a, b) => {
        const pnlA = a.status === 'OPEN' ? a.unrealized_pnl : a.realized_pnl;
        const pnlB = b.status === 'OPEN' ? b.unrealized_pnl : b.realized_pnl;
        return pnlB - pnlA;
      })
      .slice(0, 5);
  }, [trades, selectedStrategy]);

  const biggestLosers = useMemo(() => {
    const pool = selectedStrategy === 'ALL' ? trades : trades.filter((t) => t.strategy === selectedStrategy);
    return [...pool]
      .filter((t) => (t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl) < 0)
      .sort((a, b) => {
        const pnlA = a.status === 'OPEN' ? a.unrealized_pnl : a.realized_pnl;
        const pnlB = b.status === 'OPEN' ? b.unrealized_pnl : b.realized_pnl;
        return pnlA - pnlB;
      })
      .slice(0, 5);
  }, [trades, selectedStrategy]);

  const activeMetrics = useMemo(() => {
    if (!performance) return null;
    if (selectedStrategy === 'ALL') {
      return {
        netPnl: performance.net_pnl,
        realizedPnl: performance.total_realized_pnl,
        unrealizedPnl: performance.total_unrealized_pnl,
        winRate: performance.win_rate_pct,
        wins: performance.winning_trades,
        losses: performance.losing_trades,
        profitFactor: performance.profit_factor,
        openCount: performance.open_trades_count,
        totalTrades: performance.total_trades,
        closedCount: performance.closed_trades_count,
        avgWin: performance.avg_win,
        maxDrawdown: performance.max_drawdown_pct,
      };
    }
    const stat = performance.strategy_breakdown?.[selectedStrategy];
    const sWins = stat?.wins ?? 0;
    const sLosses = stat?.losses ?? 0;
    return {
      netPnl: stat?.net_pnl ?? 0,
      realizedPnl: stat?.realized_pnl ?? 0,
      unrealizedPnl: stat?.unrealized_pnl ?? 0,
      winRate: stat?.win_rate_pct ?? 0,
      wins: sWins,
      losses: sLosses,
      profitFactor: sLosses > 0 ? (sWins / sLosses) : (sWins > 0 ? 99.9 : 1.0),
      openCount: stat?.open_trades ?? 0,
      totalTrades: stat?.total_trades ?? 0,
      closedCount: stat?.closed_trades ?? 0,
      avgWin: performance.avg_win,
      maxDrawdown: performance.max_drawdown_pct,
    };
  }, [performance, selectedStrategy]);

  const handleEditSave = () => {
    if (!editingTrade) return;
    const updated = trades.map((t) => {
      if (t.id === editingTrade.id) {
        return {
          ...t,
          profit_target: newTarget ? parseFloat(newTarget) : t.profit_target,
          stop_loss: newStop ? parseFloat(newStop) : t.stop_loss,
          updated_at: new Date().toISOString(),
        };
      }
      return t;
    });
    setTrades(updated);
    setEditingTrade(null);
  };

  const handleManualClose = (tradeId: string) => {
    const updated = trades.map((t) => {
      if (t.id === tradeId && t.status === 'OPEN') {
        const exit = t.current_price || t.entry_price;
        const diff =
          t.side === 'long' ? exit - t.entry_price : t.entry_price - exit;
        const pnl = diff * t.point_value * (t.qty || 1);
        return {
          ...t,
          status: 'MANUALLY_CLOSED' as const,
          exit_price: exit,
          exit_date: new Date().toISOString().split('T')[0],
          realized_pnl: Math.round(pnl * 100) / 100,
          unrealized_pnl: 0,
          return_pct:
            Math.round(((exit - t.entry_price) / t.entry_price) * 10000) / 100,
          updated_at: new Date().toISOString(),
        };
      }
      return t;
    });
    setTrades(updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-2 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-2 border-t-emerald-400 border-r-amber-400 animate-spin" />
        </div>
        <p className="text-slate-400 font-medium">Loading Executed Trades & Performance Log…</p>
      </div>
    );
  }

  const netPnl = activeMetrics?.netPnl ?? 0;
  const realizedPnl = activeMetrics?.realizedPnl ?? 0;
  const unrealizedPnl = activeMetrics?.unrealizedPnl ?? 0;
  const winRate = activeMetrics?.winRate ?? 0;
  const profitFactor = activeMetrics?.profitFactor ?? 0;
  const openCount = activeMetrics?.openCount ?? 0;
  const closedCount = activeMetrics?.closedCount ?? 0;

  return (
    <div className="space-y-10 pb-16">
      {/* ──────────────── HEADER BANNER ──────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 p-6 md:p-10 border border-slate-800 shadow-2xl backdrop-blur">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Systematic Strategy Execution
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-black text-slate-100 tracking-tight">
              Executed Trades & Performance Tracker
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
              Real-time systematic execution ledger for all triggered OzCTA futures strategy signals. Tracks contract multiplier points, dynamic risk stops, objective profit targets, and running P&L.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                <span className="text-slate-400 font-semibold">Starting Capital:</span> $1,000,000
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-slate-200">
                <span className="text-slate-400 font-semibold">Risk Budget:</span> 2.0% / Trade ($20,000 Heat)
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-slate-200">
                <span className="text-slate-400 font-semibold">Portfolio Limit:</span> Max 8 Open Positions (16% Heat)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Starting Capital
              </div>
              <div className="mt-1 text-xl font-black text-slate-100 font-mono">
                $1,000,000
              </div>
              <div className="text-[10px] text-emerald-400/80 font-semibold">
                $20,000 (2.0%) Max Heat / Trade
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                System Status
              </div>
              <div className="mt-1 flex items-center justify-end gap-2 text-sm font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Active Monitoring
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">
                Institutional Risk Engine
              </div>
            </div>
          </div>
        </div>

        {/* ── STRATEGY TOGGLE PILLS ── */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Filter by Strategy:</span>
          {[
            { id: 'ALL', label: 'All Strategies', dot: 'bg-emerald-400' },
            { id: 'Trendorama', label: 'Trendorama', dot: 'bg-fuchsia-400' },
            { id: 'The Bradman', label: 'The Bradman', dot: 'bg-amber-400' },
            { id: 'YouHaveChosenWisely', label: 'YouHaveChosenWisely', dot: 'bg-orange-400' },
            { id: 'TooHot TooCold', label: 'TooHot TooCold', dot: 'bg-cyan-400' },
            { id: 'The Linda', label: 'The Linda', dot: 'bg-rose-400' },
          ].map((strat) => {
            const isSelected = selectedStrategy === strat.id;
            return (
              <button
                key={strat.id}
                onClick={() => setSelectedStrategy(strat.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-slate-100 text-slate-900 shadow-md ring-2 ring-emerald-400/50'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${strat.dot}`} />
                {strat.label}
              </button>
            );
          })}
        </div>

        {/* ── KPI STATS ── */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Net Total P&L"
            value={fmt$(netPnl)}
            sub={`Realized: ${fmt$(realizedPnl)}`}
            accent={netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}
            badge="Live Mark"
            active={selectedStatus === 'ALL'}
            clickableHint="Click to view all executed trades"
            onClick={() => {
              setSelectedStatus('ALL');
              setSearchParams(selectedStrategy !== 'ALL' ? { strategy: selectedStrategy } : {});
              scrollToTable();
            }}
          />
          <StatCard
            title="Unrealized P&L"
            value={fmt$(unrealizedPnl)}
            sub={`${openCount} open positions`}
            accent={unrealizedPnl >= 0 ? 'text-teal-300' : 'text-rose-400'}
            active={selectedStatus === 'OPEN'}
            clickableHint="Click to filter by open positions"
            onClick={() => {
              setSelectedStatus('OPEN');
              setSearchParams(selectedStrategy !== 'ALL' ? { status: 'OPEN', strategy: selectedStrategy } : { status: 'OPEN' });
              scrollToTable();
            }}
          />
          <StatCard
            title="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            sub={`${activeMetrics?.wins ?? 0}W / ${activeMetrics?.losses ?? 0}L`}
            accent="text-amber-400"
            active={selectedStatus === 'CLOSED'}
            clickableHint="Click to view closed trades"
            onClick={() => {
              setSelectedStatus('CLOSED');
              setSearchParams(selectedStrategy !== 'ALL' ? { status: 'CLOSED', strategy: selectedStrategy } : { status: 'CLOSED' });
              scrollToTable();
            }}
          />
          <StatCard
            title="Profit Factor"
            value={profitFactor > 50 ? '> 50' : profitFactor.toFixed(2)}
            sub={`Avg Win: ${fmt$(activeMetrics?.avgWin ?? 0)}`}
            accent="text-cyan-300"
            active={selectedStatus === 'CLOSED'}
            clickableHint="Click to view closed trades"
            onClick={() => {
              setSelectedStatus('CLOSED');
              setSearchParams(selectedStrategy !== 'ALL' ? { status: 'CLOSED', strategy: selectedStrategy } : { status: 'CLOSED' });
              scrollToTable();
            }}
          />
          <StatCard
            title="Open Positions"
            value={openCount}
            sub={`${closedCount} closed trades`}
            accent="text-indigo-300"
            badge={selectedStatus === 'OPEN' ? 'Filtered' : undefined}
            active={selectedStatus === 'OPEN'}
            clickableHint="Click to view open positions"
            onClick={() => {
              if (selectedStatus === 'OPEN') {
                setSelectedStatus('ALL');
                setSearchParams(selectedStrategy !== 'ALL' ? { strategy: selectedStrategy } : {});
              } else {
                setSelectedStatus('OPEN');
                setSearchParams(selectedStrategy !== 'ALL' ? { status: 'OPEN', strategy: selectedStrategy } : { status: 'OPEN' });
              }
              scrollToTable();
            }}
          />
          <StatCard
            title="Max Drawdown"
            value={`${(activeMetrics?.maxDrawdown ?? 0).toFixed(1)}%`}
            sub="Peak to trough"
            accent="text-slate-300"
          />
        </div>
      </div>

      {/* ──────────────── EQUITY CURVE & STRATEGY PERFORMANCE ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cumulative P&L Curve */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-100 tracking-tight">
                Cumulative Equity Curve ($)
              </h2>
              <p className="text-xs text-slate-400">
                Running net dollar performance from executed signals {selectedStrategy !== 'ALL' && `(${selectedStrategy})`}
              </p>
            </div>
            <div className="text-sm font-black font-mono text-emerald-400">
              {fmt$(netPnl)}
            </div>
          </div>

          <div className="h-64 w-full">
            {performance?.equity_curve && performance.equity_curve.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={performance.equity_curve}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [fmt$(val), 'Cumulative P&L']}
                    labelFormatter={(l) => `Date: ${l}`}
                  />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
                  <Area
                    type="monotone"
                    dataKey="cum_pnl"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#pnlGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                No curve data yet. As new signals execute, the chart updates automatically.
              </div>
            )}
          </div>
        </div>

        {/* Performance by Strategy Breakdown */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur">
          <h2 className="text-lg font-black text-slate-100 tracking-tight mb-4">
            Strategy Breakdown
          </h2>
          <div className="space-y-3">
            {Object.entries(performance?.strategy_breakdown || {}).map(
              ([strat, stat]) => {
                const theme = STRATEGY_THEMES[strat] || {
                  badge: 'border-slate-700 bg-slate-800 text-slate-300',
                  text: 'text-slate-300',
                  dot: 'bg-slate-400',
                };
                return (
                  <div
                    key={strat}
                    className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5 transition hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                        {strat}
                      </span>
                      <span
                        className={`text-xs font-mono font-black ${
                          stat.net_pnl >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {fmt$(stat.net_pnl)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {stat.total_trades} trades ({stat.open_trades} open)
                      </span>
                      <span>Win Rate: {stat.win_rate_pct}%</span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── BIGGEST WINNERS & LOSERS ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Top Winners */}
        <div className="rounded-3xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/20 via-slate-900/80 to-slate-950/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-900/30 pb-3">
            <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-300">
              <span className="text-base">🏆</span> Top Profit Winners
            </span>
            <span className="text-xs font-bold text-emerald-400">
              Top {biggestWinners.length} Trades
            </span>
          </div>

          {biggestWinners.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">No winning trades recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {biggestWinners.map((t) => {
                const pnl = t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 transition hover:border-emerald-500/40"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-100 text-sm">{t.symbol}</span>
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-300 border border-emerald-500/20">
                            {t.side.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{t.strategy} · {t.entry_date}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-black text-emerald-400 text-sm">+{fmt$(pnl)}</div>
                      <div className="text-[10px] text-emerald-300 font-semibold">
                        {t.return_pct > 0 ? `+${t.return_pct.toFixed(1)}%` : `${t.return_pct.toFixed(1)}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Losers */}
        <div className="rounded-3xl border border-rose-900/40 bg-gradient-to-br from-rose-950/20 via-slate-900/80 to-slate-950/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-rose-900/30 pb-3">
            <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-rose-300">
              <span className="text-base">⚠️</span> Top Drawdown / Losers
            </span>
            <span className="text-xs font-bold text-rose-400">
              Top {biggestLosers.length} Trades
            </span>
          </div>

          {biggestLosers.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">No drawdown trades recorded.</p>
          ) : (
            <div className="space-y-2.5">
              {biggestLosers.map((t) => {
                const pnl = t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 transition hover:border-rose-500/40"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-100 text-sm">{t.symbol}</span>
                          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-rose-300 border border-rose-500/20">
                            {t.side.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{t.strategy} · {t.entry_date}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-black text-rose-400 text-sm">{fmt$(pnl)}</div>
                      <div className="text-[10px] text-rose-300 font-semibold">
                        {t.return_pct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── EXECUTED TRADES TABLE ──────────────── */}
      <div
        ref={tableRef}
        id="executed-trades-table"
        className="scroll-mt-6 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur overflow-hidden"
      >
        {/* Controls Bar */}
        <div className="border-b border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-100 tracking-tight">
                Executed Signals Ledger
              </h2>
              {selectedStatus !== 'ALL' && (
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-[11px] font-bold text-indigo-300">
                  {selectedStatus === 'OPEN' ? '🟢 Open Positions Only' : selectedStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filteredTrades.length} of {trades.length} recorded executed trades
              {selectedStatus === 'OPEN' && ' (currently active in portfolio)'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Reset Filters Button */}
            {(selectedStatus !== 'ALL' || selectedStrategy !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedStatus('ALL');
                  setSelectedStrategy('ALL');
                  setSearchQuery('');
                  setSearchParams({});
                }}
                className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition"
              >
                Reset Filters
              </button>
            )}

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search symbol or strategy…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />

            {/* Strategy Filter */}
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Strategies</option>
              <option value="Trendorama">Trendorama</option>
              <option value="The Bradman">The Bradman</option>
              <option value="YouHaveChosenWisely">YouHaveChosenWisely</option>
              <option value="TooHot TooCold">TooHot TooCold</option>
              <option value="The Linda">The Linda</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="CLOSED">Closed Only</option>
              <option value="HIT_TARGET">Hit Target</option>
              <option value="STOPPED_OUT">Stopped Out</option>
              <option value="DONCHIAN_EXIT">Donchian Exit</option>
              <option value="TIME_EXIT">Time / Cycle Exit</option>
              <option value="EMA_EXIT">EMA Cross Exit</option>
              <option value="EOD_EXIT">EOD Exit (The Linda)</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Entry Date</th>
                <th className="px-5 py-3.5">Symbol</th>
                <th className="px-5 py-3.5">Strategy</th>
                <th className="px-5 py-3.5">Side</th>
                <th className="px-5 py-3.5 text-right">Entry Price</th>
                <th className="px-5 py-3.5 text-right">Current / Exit</th>
                <th className="px-5 py-3.5 text-right">Stop Loss</th>
                <th className="px-5 py-3.5 text-right">Profit Target</th>
                <th className="px-5 py-3.5 text-right">P&L ($)</th>
                <th className="px-5 py-3.5 text-right">Return</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-5 py-12 text-center text-slate-500">
                    No executed trades match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const stratTheme = STRATEGY_THEMES[t.strategy] || {
                    badge: 'border-slate-700 bg-slate-800 text-slate-300',
                  };
                  const isLong = t.side === 'long';
                  const isOpen = t.status === 'OPEN';
                  const displayPnl = isOpen ? t.unrealized_pnl : t.realized_pnl;

                  return (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      {/* Entry Date */}
                      <td className="px-5 py-4 font-mono text-slate-400">
                        {t.entry_date}
                      </td>

                      {/* Symbol & Name */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-100 font-mono">
                          {t.symbol}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {t.symbol_name}
                        </div>
                      </td>

                      {/* Strategy */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-bold ${stratTheme.badge}`}
                        >
                          {t.strategy}
                        </span>
                      </td>

                      {/* Side */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                            isLong
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          }`}
                        >
                          {t.side.toUpperCase()}
                        </span>
                      </td>

                      {/* Entry Price */}
                      <td className="px-5 py-4 text-right font-mono text-slate-200">
                        {formatPrice(t.entry_price)}
                      </td>

                      {/* Current / Exit Price */}
                      <td className="px-5 py-4 text-right font-mono text-slate-100 font-semibold">
                        {formatPrice(isOpen ? t.current_price : t.exit_price)}
                      </td>

                      {/* Stop Loss */}
                      <td className="px-5 py-4 text-right font-mono text-rose-300">
                        {formatPrice(t.stop_loss)}
                      </td>

                      {/* Profit Target */}
                      <td className="px-5 py-4 text-right font-mono text-emerald-300">
                        {formatPrice(t.profit_target)}
                      </td>

                      {/* P&L */}
                      <td
                        className={`px-5 py-4 text-right font-mono font-black ${
                          displayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {fmt$(displayPnl)}
                      </td>

                      {/* Return % */}
                      <td
                        className={`px-5 py-4 text-right font-mono font-bold ${
                          t.return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.return_pct > 0 ? `+${t.return_pct.toFixed(1)}%` : `${t.return_pct.toFixed(1)}%`}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        {t.status === 'OPEN' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                            OPEN
                          </span>
                        )}
                        {t.status === 'HIT_TARGET' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300 border border-emerald-500/30">
                            🎯 TARGET HIT
                          </span>
                        )}
                        {t.status === 'STOPPED_OUT' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-300 border border-rose-500/30">
                            🛑 STOPPED
                          </span>
                        )}
                        {t.status === 'DONCHIAN_EXIT' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-300 border border-indigo-500/30">
                            🌊 DONCHIAN
                          </span>
                        )}
                        {t.status === 'TIME_EXIT' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-500/30">
                            ⏳ TIME EXIT
                          </span>
                        )}
                        {t.status === 'EMA_EXIT' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-teal-300 border border-teal-500/30">
                            📉 EMA EXIT
                          </span>
                        )}
                        {t.status === 'EOD_EXIT' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-cyan-300 border border-cyan-500/30">
                            🌅 EOD EXIT
                          </span>
                        )}
                        {t.status === 'MANUALLY_CLOSED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700">
                            CLOSED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingTrade(t);
                              setNewTarget(t.profit_target ? String(t.profit_target) : '');
                              setNewStop(t.stop_loss ? String(t.stop_loss) : '');
                            }}
                            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[10px] font-semibold text-slate-300 transition"
                            title="Edit Target / Stop"
                          >
                            Edit
                          </button>
                          {isOpen && (
                            <button
                              onClick={() => handleManualClose(t.id)}
                              className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 px-2.5 py-1 text-[10px] font-semibold transition"
                              title="Close trade at current mark"
                            >
                              Close
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ──────────────── EDIT TARGET / STOP MODAL ──────────────── */}
      {editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-100">
                  Adjust Parameters · {editingTrade.symbol}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingTrade.strategy} ({editingTrade.side.toUpperCase()})
                </p>
              </div>
              <button
                onClick={() => setEditingTrade(null)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Profit Target Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="e.g. 5420.50"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Stop Loss Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={newStop}
                  onChange={(e) => setNewStop(e.target.value)}
                  placeholder="e.g. 5350.00"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-rose-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingTrade(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white transition shadow-lg shadow-emerald-600/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
