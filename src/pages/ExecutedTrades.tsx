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
import { ChevronDownIcon, XIcon } from '../components/Icons';
import type {
  PaperTrade,
  PaperTradePerformancePayload,
  PaperTradesPayload,
} from '../types/paperTrade';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  HIT_TARGET: 'Target hit',
  STOPPED_OUT: 'Stopped out',
  DONCHIAN_EXIT: 'Donchian exit',
  TIME_EXIT: 'Time exit',
  EMA_EXIT: 'EMA exit',
  EOD_EXIT: 'EOD exit',
  MANUALLY_CLOSED: 'Closed',
};

function matchesStrategy(tradeStrategy: string, filterStrategy: string): boolean {
  if (filterStrategy === 'ALL') return true;
  if (filterStrategy === 'LeMark Sequential' || filterStrategy === 'DeMark Sequential') {
    return tradeStrategy === 'LeMark Sequential' || tradeStrategy === 'DeMark Sequential';
  }
  return tradeStrategy === filterStrategy;
}

function displayStrategyName(strat: string): string {
  if (strat === 'DeMark Sequential') return 'LeMark Sequential';
  return strat;
}

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
  tone = 'neutral',
  badge,
  onClick,
  active,
  clickableHint,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'up' | 'down' | 'neutral';
  badge?: string;
  onClick?: () => void;
  active?: boolean;
  clickableHint?: string;
}) {
  const valueColor =
    tone === 'up'
      ? 'text-desk-up'
      : tone === 'down'
      ? 'text-desk-down'
      : 'text-desk-text';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      title={clickableHint || (onClick ? `Filter by ${title}` : undefined)}
      className={`desk-well rounded-xl p-4 transition-colors duration-150 select-none ${
        onClick
          ? 'cursor-pointer ' +
            (active
              ? 'border-hairline-strong bg-desk-raised/80'
              : 'hover:border-hairline-strong hover:bg-desk-raised/40')
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-desk-muted truncate">{title}</span>
        {badge ? (
          <span className="desk-tag shrink-0">{badge}</span>
        ) : onClick && active ? (
          <span className="text-[11px] font-mono text-desk-text shrink-0">Active</span>
        ) : null}
      </div>
      <div className={`mt-2 text-2xl font-mono font-semibold tabular-nums tracking-tight ${valueColor}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-desk-muted tabular-nums">{sub}</div>}
    </div>
  );
}

export default function ExecutedTrades() {
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [performance, setPerformance] =
    useState<PaperTradePerformancePayload | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const tableRef = useRef<HTMLDivElement>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'QTD' | 'YTD' | 'INCEPTION'>('INCEPTION');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingTrade, setEditingTrade] = useState<PaperTrade | null>(null);
  const [newTarget, setNewTarget] = useState<string>('');
  const [newStop, setNewStop] = useState<string>('');
  const [winnersOpen, setWinnersOpen] = useState<boolean>(false);
  const [losersOpen, setLosersOpen] = useState<boolean>(false);

  const OVERRIDES_STORAGE_KEY = 'ozcta_trade_overrides_v1';

  const getTimeframeStartDateStr = (tf: 'QTD' | 'YTD' | 'INCEPTION'): string | null => {
    if (tf === 'INCEPTION') return null;
    const now = new Date();
    const currentYear = now.getFullYear();
    if (tf === 'YTD') {
      return `${currentYear}-01-01`;
    }
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3 + 1;
    return `${currentYear}-${String(quarterStartMonth).padStart(2, '0')}-01`;
  };

  const isTradeInTimeframe = (t: PaperTrade, tf: 'QTD' | 'YTD' | 'INCEPTION' = 'INCEPTION'): boolean => {
    const startStr = getTimeframeStartDateStr(tf);
    if (!startStr) return true;
    const refDateStr = (t.status === 'OPEN' ? t.entry_date : (t.exit_date || t.entry_date))?.slice(0, 10);
    if (!refDateStr) return true;
    return refDateStr >= startStr;
  };

  const saveTradeOverride = (tradeId: string, patch: Partial<PaperTrade>) => {
    try {
      const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
      const map: Record<string, Partial<PaperTrade>> = raw ? JSON.parse(raw) : {};
      map[tradeId] = { ...(map[tradeId] || {}), ...patch };
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  };

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const upper = statusParam.toUpperCase();
      if (['ALL', 'OPEN', 'CLOSED', 'HIT_TARGET', 'STOPPED_OUT', 'DONCHIAN_EXIT', 'TIME_EXIT', 'EMA_EXIT', 'EOD_EXIT'].includes(upper)) {
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
          let loadedTrades = tradesRes.value.trades;
          try {
            const rawOverrides = localStorage.getItem(OVERRIDES_STORAGE_KEY);
            if (rawOverrides) {
              const overrides: Record<string, Partial<PaperTrade>> = JSON.parse(rawOverrides);
              loadedTrades = loadedTrades.map((t) =>
                overrides[t.id] ? { ...t, ...overrides[t.id] } : t
              );
            }
          } catch {
            // Ignore malformed localStorage
          }
          setTrades(loadedTrades);
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
    return trades
      .filter((t) => {
        if (!matchesStrategy(t.strategy, selectedStrategy))
          return false;
        if (!isTradeInTimeframe(t, selectedTimeframe))
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
      })
      .sort((a, b) => {
        const aOpen = a.status === 'OPEN' ? 0 : 1;
        const bOpen = b.status === 'OPEN' ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return (b.entry_date || '').localeCompare(a.entry_date || '');
      });
  }, [trades, selectedStrategy, selectedStatus, searchQuery, selectedTimeframe]);

  const biggestWinners = useMemo(() => {
    const pool = trades.filter((t) => {
      const matchStrat = matchesStrategy(t.strategy, selectedStrategy);
      const matchTf = isTradeInTimeframe(t, selectedTimeframe);
      return matchStrat && matchTf;
    });
    return [...pool]
      .filter((t) => (t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl) > 0)
      .sort((a, b) => {
        const pnlA = a.status === 'OPEN' ? a.unrealized_pnl : a.realized_pnl;
        const pnlB = b.status === 'OPEN' ? b.unrealized_pnl : b.realized_pnl;
        return pnlB - pnlA;
      })
      .slice(0, 5);
  }, [trades, selectedStrategy, selectedTimeframe]);

  const biggestLosers = useMemo(() => {
    const pool = trades.filter((t) => {
      const matchStrat = matchesStrategy(t.strategy, selectedStrategy);
      const matchTf = isTradeInTimeframe(t, selectedTimeframe);
      return matchStrat && matchTf;
    });
    return [...pool]
      .filter((t) => (t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl) < 0)
      .sort((a, b) => {
        const pnlA = a.status === 'OPEN' ? a.unrealized_pnl : a.realized_pnl;
        const pnlB = b.status === 'OPEN' ? b.unrealized_pnl : b.realized_pnl;
        return pnlA - pnlB;
      })
      .slice(0, 5);
  }, [trades, selectedStrategy, selectedTimeframe]);

  const inceptionMetrics = useMemo(() => {
    const pool = trades.filter(
      (t) => matchesStrategy(t.strategy, selectedStrategy)
    );
    const closed = pool.filter((t) => t.status !== 'OPEN');
    const open = pool.filter((t) => t.status === 'OPEN');

    const realizedPnl = closed.reduce((acc, t) => acc + (t.realized_pnl || 0), 0);
    const unrealizedPnl = open.reduce((acc, t) => acc + (t.unrealized_pnl || 0), 0);
    const totalCommissions = pool.reduce((acc, t) => acc + (t.commission || 0), 0);
    const totalSlippage = pool.reduce((acc, t) => acc + (t.slippage || 0), 0);

    return {
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      totalCosts: Math.round((totalCommissions + totalSlippage) * 100) / 100,
      closedCount: closed.length,
      openCount: open.length,
    };
  }, [trades, selectedStrategy]);

  const equityCurveData = useMemo(() => {
    if (selectedStrategy === 'ALL' && selectedTimeframe === 'INCEPTION' && performance?.equity_curve?.length) {
      return performance.equity_curve;
    }
    const pool = trades.filter((t) => {
      const matchStrat = matchesStrategy(t.strategy, selectedStrategy);
      const matchTf = isTradeInTimeframe(t, selectedTimeframe);
      return matchStrat && matchTf;
    });
    if (pool.length === 0) return [];

    const dateSet = new Set<string>();
    for (const t of pool) {
      if (t.entry_date) dateSet.add(t.entry_date.slice(0, 10));
      if (t.exit_date) dateSet.add(t.exit_date.slice(0, 10));
    }
    if (performance?.date) dateSet.add(performance.date.slice(0, 10));

    const startStr = getTimeframeStartDateStr(selectedTimeframe);
    const sortedDates = Array.from(dateSet)
      .filter((d) => !startStr || d >= startStr)
      .sort();

    let peakEq = 100000;
    const latestDateStr = sortedDates[sortedDates.length - 1];
    return sortedDates.map((d) => {
      const realizedUpToD = pool
        .filter((t) => t.status !== 'OPEN' && (t.exit_date || t.entry_date)?.slice(0, 10) <= d)
        .reduce((acc, t) => acc + (t.realized_pnl || 0), 0);
      const unrealizedOnD =
        d === latestDateStr
          ? pool
              .filter((t) => t.status === 'OPEN' && (t.entry_date || '').slice(0, 10) <= d)
              .reduce((acc, t) => acc + (t.unrealized_pnl || 0), 0)
          : 0;
      const cumPnl = Math.round((realizedUpToD + unrealizedOnD) * 100) / 100;
      const equity = Math.round((100000 + cumPnl) * 100) / 100;
      if (equity > peakEq) peakEq = equity;
      const ddPct = peakEq > 0 ? Math.round(((peakEq - equity) / peakEq) * 10000) / 100 : 0;
      return {
        date: d,
        cum_pnl: cumPnl,
        equity,
        drawdown_pct: ddPct,
      };
    });
  }, [trades, selectedStrategy, selectedTimeframe, performance]);

  const activeMetrics = useMemo(() => {
    const pool = trades.filter((t) => {
      const matchStrat = matchesStrategy(t.strategy, selectedStrategy);
      const matchTf = isTradeInTimeframe(t, selectedTimeframe);
      return matchStrat && matchTf;
    });

    const closed = pool.filter((t) => t.status !== 'OPEN');
    const open = pool.filter((t) => t.status === 'OPEN');

    const realizedPnl = closed.reduce((acc, t) => acc + (t.realized_pnl || 0), 0);
    const unrealizedPnl = open.reduce((acc, t) => acc + (t.unrealized_pnl || 0), 0);
    const grossRealizedPnl = closed.reduce((acc, t) => acc + (t.gross_pnl ?? t.realized_pnl ?? 0), 0);
    const grossUnrealizedPnl = open.reduce((acc, t) => acc + (t.gross_pnl ?? t.unrealized_pnl ?? 0), 0);
    const grossPnl = grossRealizedPnl + grossUnrealizedPnl;
    const totalCommissions = pool.reduce((acc, t) => acc + (t.commission || 0), 0);
    const totalSlippage = pool.reduce((acc, t) => acc + (t.slippage || 0), 0);
    const totalCosts = totalCommissions + totalSlippage;

    const netPnl = realizedPnl + unrealizedPnl;
    const returnPct = (netPnl / 100000) * 100;

    const wins = closed.filter((t) => (t.realized_pnl || 0) > 0);
    const losses = closed.filter((t) => (t.realized_pnl || 0) < 0);
    const winDollars = wins.reduce((acc, t) => acc + (t.realized_pnl || 0), 0);
    const lossDollars = Math.abs(losses.reduce((acc, t) => acc + (t.realized_pnl || 0), 0));

    const winRate = closed.length > 0
      ? (wins.length / closed.length) * 100
      : (open.length > 0 ? (open.filter((t) => (t.unrealized_pnl || 0) > 0).length / open.length) * 100 : 0);

    const profitFactor = lossDollars > 0
      ? winDollars / lossDollars
      : (winDollars > 0 ? 99.9 : 1.0);

    const avgWin = wins.length > 0 ? winDollars / wins.length : 0;
    const maxCurveDd = equityCurveData.reduce((max, pt) => Math.max(max, pt.drawdown_pct || 0), 0);

    return {
      netPnl: Math.round(netPnl * 100) / 100,
      returnPct: Math.round(returnPct * 100) / 100,
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      grossPnl: Math.round(grossPnl * 100) / 100,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      totalSlippage: Math.round(totalSlippage * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
      winRate: Math.round(winRate * 10) / 10,
      wins: wins.length,
      losses: losses.length,
      profitFactor: Math.round(profitFactor * 100) / 100,
      openCount: open.length,
      totalTrades: pool.length,
      closedCount: closed.length,
      avgWin: Math.round(avgWin * 100) / 100,
      maxDrawdown: selectedStrategy === 'ALL' && selectedTimeframe === 'INCEPTION'
        ? (performance?.max_drawdown_pct || maxCurveDd)
        : maxCurveDd,
    };
  }, [trades, selectedStrategy, selectedTimeframe, performance, equityCurveData]);

  const handleEditSave = () => {
    if (!editingTrade) return;
    const patch: Partial<PaperTrade> = {
      profit_target: newTarget ? parseFloat(newTarget) : editingTrade.profit_target,
      stop_loss: newStop ? parseFloat(newStop) : editingTrade.stop_loss,
      updated_at: new Date().toISOString(),
    };
    saveTradeOverride(editingTrade.id, patch);
    const updated = trades.map((t) => (t.id === editingTrade.id ? { ...t, ...patch } : t));
    setTrades(updated);
    setEditingTrade(null);
  };

  const handleManualClose = (tradeId: string) => {
    const updated = trades.map((t) => {
      if (t.id === tradeId && t.status === 'OPEN') {
        const exit = t.current_price || t.entry_price;
        const diff =
          t.side === 'long' ? exit - t.entry_price : t.entry_price - exit;
        const grossPnl = diff * t.point_value * (t.qty || 1);
        const fullComm = (t.commission || 0) * 2;
        const fullSlip = (t.slippage || 0) * 2;
        const netPnlCalc = grossPnl - fullComm - fullSlip;
        const patch: Partial<PaperTrade> = {
          status: 'MANUALLY_CLOSED' as const,
          exit_price: exit,
          exit_date: new Date().toISOString().split('T')[0],
          gross_pnl: Math.round(grossPnl * 100) / 100,
          commission: Math.round(fullComm * 100) / 100,
          slippage: Math.round(fullSlip * 100) / 100,
          fees_and_slippage: Math.round((fullComm + fullSlip) * 100) / 100,
          realized_pnl: Math.round(netPnlCalc * 100) / 100,
          unrealized_pnl: 0,
          return_pct:
            t.entry_price > 0
              ? Math.round((diff / t.entry_price) * 10000) / 100
              : 0,
          updated_at: new Date().toISOString(),
        };
        saveTradeOverride(tradeId, patch);
        return {
          ...t,
          ...patch,
        };
      }
      return t;
    });
    setTrades(updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-hairline border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading executed trades ledger…</p>
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
    <div className="space-y-8 pb-16">
      {/* Header & Controls */}
      <section className="desk-surface rounded-2xl p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-desk-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              <span>Systematic execution ledger</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-desk-text tracking-tight">
              Executed trades &amp; performance
            </h1>
            <p className="mt-2 text-sm text-desk-secondary max-w-3xl leading-relaxed">
              Contract-level execution record across all OzCTA futures models, tracking point multipliers, stop levels, profit targets, and net P&amp;L after round-turn commissions and tick slippage.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="desk-tag">$100,000 model capital</span>
              <span className="desk-tag">2.0% ($2,000) risk per trade</span>
              <span className="desk-tag">Max 8 open positions (16% heat)</span>
              <span className="desk-tag">Net of commissions &amp; slippage</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="desk-well rounded-xl px-4 py-3 text-right">
              <div className="text-xs text-desk-muted">Model capital</div>
              <div className="mt-1 text-lg font-mono font-semibold text-desk-text tabular-nums">
                $100,000
              </div>
              <div className="text-[11px] text-desk-muted tabular-nums">
                $2,000 max heat
              </div>
            </div>

            <div className="desk-well rounded-xl px-4 py-3 text-right">
              <div className="text-xs text-desk-muted">Closed P&amp;L</div>
              <div
                className={`mt-1 text-lg font-mono font-semibold tabular-nums ${
                  (inceptionMetrics?.realizedPnl ?? 0) >= 0 ? 'text-desk-up' : 'text-desk-down'
                }`}
              >
                {(inceptionMetrics?.realizedPnl ?? 0) >= 0 ? '+' : ''}
                {fmt$(inceptionMetrics?.realizedPnl ?? 0)}
              </div>
              <div className="text-[11px] text-desk-muted tabular-nums">
                {inceptionMetrics?.closedCount ?? 0} closed trades
              </div>
            </div>

            <div className="desk-well rounded-xl px-4 py-3 text-right">
              <div className="text-xs text-desk-muted">Open P&amp;L</div>
              <div
                className={`mt-1 text-lg font-mono font-semibold tabular-nums ${
                  (inceptionMetrics?.unrealizedPnl ?? 0) >= 0 ? 'text-desk-up' : 'text-desk-down'
                }`}
              >
                {(inceptionMetrics?.unrealizedPnl ?? 0) >= 0 ? '+' : ''}
                {fmt$(inceptionMetrics?.unrealizedPnl ?? 0)}
              </div>
              <div className="text-[11px] text-desk-muted tabular-nums">
                {inceptionMetrics?.openCount ?? 0} active positions
              </div>
            </div>
          </div>
        </div>

        {/* Strategy & Timeframe Controls */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-hairline pt-5 overflow-x-auto no-scrollbar whitespace-nowrap flex-nowrap">
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            <span className="text-xs text-desk-muted mr-1 shrink-0">Strategy</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'Trendorama', label: 'Trendorama' },
              { id: 'The Bradman', label: 'The Bradman' },
              { id: 'YouHaveChosenWisely', label: 'YouHaveChosenWisely' },
              { id: 'TooHot TooCold', label: 'TooHot TooCold' },
              { id: 'The Linda', label: 'The Linda' },
              { id: 'LeMark Sequential', label: 'LeMark Sequential' },
            ].map((strat) => {
              const isSelected = selectedStrategy === strat.id;
              return (
                <button
                  key={strat.id}
                  onClick={() => setSelectedStrategy(strat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 shrink-0 ${
                    isSelected
                      ? 'bg-desk-text text-desk-deep'
                      : 'desk-well text-desk-secondary hover:text-desk-text hover:border-hairline-strong'
                  }`}
                >
                  {strat.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 desk-well p-1 rounded-lg shrink-0 flex-nowrap">
            {[
              { id: 'QTD' as const, label: `QTD (Q${Math.floor(new Date().getMonth() / 3) + 1})` },
              { id: 'YTD' as const, label: `YTD (${new Date().getFullYear()})` },
              { id: 'INCEPTION' as const, label: 'Inception' },
            ].map((tf) => {
              const isSelected = selectedTimeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  onClick={() => setSelectedTimeframe(tf.id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors duration-150 shrink-0 ${
                    isSelected
                      ? 'bg-desk-raised text-desk-text border border-hairline-strong'
                      : 'text-desk-muted hover:text-desk-text'
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI Stats */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            title={`Closed P&L (${selectedTimeframe === 'INCEPTION' ? 'inception' : selectedTimeframe})`}
            value={`${realizedPnl >= 0 ? '+' : ''}${fmt$(realizedPnl)}`}
            sub={`${closedCount} closed · net`}
            tone={realizedPnl >= 0 ? 'up' : 'down'}
            badge="Realized"
            active={selectedStatus === 'CLOSED'}
            clickableHint="View closed trades"
            onClick={() => {
              setSelectedStatus('CLOSED');
              setSearchParams(selectedStrategy !== 'ALL' ? { status: 'CLOSED', strategy: selectedStrategy } : { status: 'CLOSED' });
              scrollToTable();
            }}
          />
          <StatCard
            title="Open P&L"
            value={`${unrealizedPnl >= 0 ? '+' : ''}${fmt$(unrealizedPnl)}`}
            sub={`${openCount} open positions`}
            tone={unrealizedPnl >= 0 ? 'up' : 'down'}
            badge="Unrealized"
            active={selectedStatus === 'OPEN'}
            clickableHint="Filter by open positions"
            onClick={() => {
              setSelectedStatus('OPEN');
              setSearchParams(selectedStrategy !== 'ALL' ? { status: 'OPEN', strategy: selectedStrategy } : { status: 'OPEN' });
              scrollToTable();
            }}
          />
          <StatCard
            title="Total net P&L"
            value={`${netPnl >= 0 ? '+' : ''}${fmt$(netPnl)}`}
            sub={`Return ${activeMetrics?.returnPct !== undefined ? (activeMetrics.returnPct >= 0 ? `+${activeMetrics.returnPct.toFixed(1)}%` : `${activeMetrics.returnPct.toFixed(1)}%`) : '0.0%'} · Gross ${fmt$(activeMetrics?.grossPnl ?? 0)}`}
            tone={netPnl >= 0 ? 'up' : 'down'}
            badge={selectedTimeframe === 'INCEPTION' ? 'Inception' : selectedTimeframe}
            active={selectedStatus === 'ALL'}
            clickableHint="View all executed trades"
            onClick={() => {
              setSelectedStatus('ALL');
              setSearchParams(selectedStrategy !== 'ALL' ? { strategy: selectedStrategy } : {});
              scrollToTable();
            }}
          />
          <StatCard
            title="Comm. & slippage"
            value={`-${fmt$(activeMetrics?.totalCosts ?? 0)}`}
            sub={`Comm ${fmt$(activeMetrics?.totalCommissions ?? 0)} · Slip ${fmt$(activeMetrics?.totalSlippage ?? 0)}`}
            tone="down"
            badge="Included"
          />
          <StatCard
            title="Win rate (net)"
            value={`${winRate.toFixed(1)}%`}
            sub={`${activeMetrics?.wins ?? 0}W / ${activeMetrics?.losses ?? 0}L (${activeMetrics?.totalTrades ?? 0})`}
            tone="neutral"
            active={selectedStatus === 'CLOSED'}
            clickableHint="View closed trades"
            onClick={() => {
              setSelectedStatus('CLOSED');
              setSearchParams(selectedStrategy !== 'ALL' ? { status: 'CLOSED', strategy: selectedStrategy } : { status: 'CLOSED' });
              scrollToTable();
            }}
          />
          <StatCard
            title="Profit factor"
            value={profitFactor > 50 ? '> 50' : profitFactor.toFixed(2)}
            sub={`Avg win ${fmt$(activeMetrics?.avgWin ?? 0)} · DD ${(activeMetrics?.maxDrawdown ?? 0).toFixed(1)}%`}
            tone="neutral"
            active={selectedStatus === 'CLOSED'}
            clickableHint="View closed trades"
            onClick={() => {
              setSelectedStatus('CLOSED');
              setSearchParams(selectedStrategy !== 'ALL' ? { status: 'CLOSED', strategy: selectedStrategy } : { status: 'CLOSED' });
              scrollToTable();
            }}
          />
        </div>
      </section>

      {/* Equity Curve & Strategy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 desk-surface rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-desk-text tracking-tight">
                Cumulative net P&amp;L
              </h2>
              <p className="text-xs text-desk-muted mt-0.5">
                Running dollar performance from executed signals{selectedStrategy !== 'ALL' ? ` · ${selectedStrategy}` : ''}
              </p>
            </div>
            <div className={`text-sm font-mono font-semibold tabular-nums ${netPnl >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
              {netPnl >= 0 ? '+' : ''}{fmt$(netPnl)}
            </div>
          </div>

          <div className="h-64 w-full">
            {equityCurveData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={equityCurveData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4cc38a" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#4cc38a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232325" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#85858b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(237,237,237,0.08)' }}
                  />
                  <YAxis
                    stroke="#85858b"
                    fontSize={11}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(237,237,237,0.08)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#19191b',
                      borderColor: 'rgba(237,237,237,0.14)',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                      color: '#ededed',
                    }}
                    formatter={(val: any) => [fmt$(val), 'Cumulative P&L']}
                    labelFormatter={(l) => `Date: ${l}`}
                  />
                  <ReferenceLine y={0} stroke="rgba(237,237,237,0.14)" strokeDasharray="2 2" />
                  <Area
                    type="monotone"
                    dataKey="cum_pnl"
                    stroke="#4cc38a"
                    strokeWidth={1.75}
                    fillOpacity={1}
                    fill="url(#pnlGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-desk-muted text-sm">
                No equity curve points recorded for this selection.
              </div>
            )}
          </div>
        </div>

        <div className="desk-surface rounded-2xl p-6">
          <h2 className="text-base font-semibold text-desk-text tracking-tight mb-4">
            Strategy breakdown
          </h2>
          <div className="space-y-2.5">
            {Object.entries(performance?.strategy_breakdown || {}).map(
              ([strat, stat]) => (
                <div
                  key={strat}
                  className="desk-well rounded-xl p-3.5 transition-colors hover:border-hairline-strong"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-medium text-desk-text">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          stat.open_trades > 0 ? 'bg-desk-up' : 'bg-desk-muted'
                        }`}
                      />
                      {strat}
                    </span>
                    <span
                      className={`text-xs font-mono font-semibold tabular-nums ${
                        stat.net_pnl >= 0 ? 'text-desk-up' : 'text-desk-down'
                      }`}
                    >
                      {stat.net_pnl >= 0 ? '+' : ''}
                      {fmt$(stat.net_pnl)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-desk-muted tabular-nums">
                    <span>
                      {stat.total_trades} trades ({stat.open_trades} open)
                    </span>
                    <span>{stat.win_rate_pct}% win</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Largest Gains & Drawdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="desk-surface rounded-2xl p-5">
          <button
            type="button"
            onClick={() => setWinnersOpen((o) => !o)}
            aria-expanded={winnersOpen}
            className={`flex w-full items-center justify-between text-left ${
              winnersOpen ? 'border-b border-hairline pb-3 mb-3' : ''
            }`}
          >
            <span className="text-sm font-semibold text-desk-text">
              Largest gains
            </span>
            <span className="flex items-center gap-2 text-xs font-mono text-desk-muted">
              Top {biggestWinners.length}
              <ChevronDownIcon
                className={`w-4 h-4 transition-transform duration-150 ${
                  winnersOpen ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>

          {!winnersOpen ? null : biggestWinners.length === 0 ? (
            <p className="text-xs text-desk-muted py-4 text-center">No winning trades recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {biggestWinners.map((t) => {
                const pnl = t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl;
                return (
                  <div
                    key={t.id}
                    className="desk-well flex items-center justify-between rounded-xl px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-desk-text text-sm">{t.symbol}</span>
                        <span className={t.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                          {t.side === 'long' ? 'Long' : 'Short'}
                        </span>
                        <span className="text-xs text-desk-secondary truncate">{displayStrategyName(t.strategy)}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-desk-muted font-mono tabular-nums flex items-center gap-1.5">
                        <span>Open {t.entry_date?.slice(0, 10)}</span>
                        <span>·</span>
                        <span>
                          {t.status === 'OPEN'
                            ? 'Active'
                            : `Close ${t.exit_date?.slice(0, 10) || 'Closed'}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0 pl-3">
                      <div className="font-semibold text-desk-up text-sm">+{fmt$(pnl)}</div>
                      <div className="text-[11px] text-desk-muted">
                        {t.return_pct > 0 ? `+${t.return_pct.toFixed(1)}%` : `${t.return_pct.toFixed(1)}%`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="desk-surface rounded-2xl p-5">
          <button
            type="button"
            onClick={() => setLosersOpen((o) => !o)}
            aria-expanded={losersOpen}
            className={`flex w-full items-center justify-between text-left ${
              losersOpen ? 'border-b border-hairline pb-3 mb-3' : ''
            }`}
          >
            <span className="text-sm font-semibold text-desk-text">
              Largest drawdowns
            </span>
            <span className="flex items-center gap-2 text-xs font-mono text-desk-muted">
              Top {biggestLosers.length}
              <ChevronDownIcon
                className={`w-4 h-4 transition-transform duration-150 ${
                  losersOpen ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>

          {!losersOpen ? null : biggestLosers.length === 0 ? (
            <p className="text-xs text-desk-muted py-4 text-center">No drawdown trades recorded.</p>
          ) : (
            <div className="space-y-2">
              {biggestLosers.map((t) => {
                const pnl = t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl;
                return (
                  <div
                    key={t.id}
                    className="desk-well flex items-center justify-between rounded-xl px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-desk-text text-sm">{t.symbol}</span>
                        <span className={t.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                          {t.side === 'long' ? 'Long' : 'Short'}
                        </span>
                        <span className="text-xs text-desk-secondary truncate">{displayStrategyName(t.strategy)}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-desk-muted font-mono tabular-nums flex items-center gap-1.5">
                        <span>Open {t.entry_date?.slice(0, 10)}</span>
                        <span>·</span>
                        <span>
                          {t.status === 'OPEN'
                            ? 'Active'
                            : `Close ${t.exit_date?.slice(0, 10) || 'Closed'}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0 pl-3">
                      <div className="font-semibold text-desk-down text-sm">{fmt$(pnl)}</div>
                      <div className="text-[11px] text-desk-muted">
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

      {/* Executed Trades Table */}
      <div
        ref={tableRef}
        id="executed-trades-table"
        className="scroll-mt-6 desk-surface rounded-2xl overflow-hidden"
      >
        <div className="border-b border-hairline p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-desk-text tracking-tight">
                Executed signals ledger
              </h2>
              {selectedStatus !== 'ALL' && (
                <span className="desk-tag">
                  {selectedStatus === 'OPEN'
                    ? 'Open positions'
                    : STATUS_LABELS[selectedStatus] || selectedStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-desk-muted mt-1 tabular-nums">
              Showing {filteredTrades.length} of {trades.length} recorded trades
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {(selectedStatus !== 'ALL' || selectedStrategy !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedStatus('ALL');
                  setSelectedStrategy('ALL');
                  setSearchQuery('');
                  setSearchParams({});
                }}
                className="desk-btn-secondary px-3 py-1.5 text-xs"
              >
                Reset filters
              </button>
            )}

            <input
              type="text"
              placeholder="Filter symbol or strategy…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="desk-input px-3 py-1.5 text-xs w-48"
            />

            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="desk-input px-3 py-1.5 text-xs"
            >
              <option value="ALL">All strategies</option>
              <option value="Trendorama">Trendorama</option>
              <option value="The Bradman">The Bradman</option>
              <option value="YouHaveChosenWisely">YouHaveChosenWisely</option>
              <option value="TooHot TooCold">TooHot TooCold</option>
              <option value="The Linda">The Linda</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="desk-input px-3 py-1.5 text-xs"
            >
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open only</option>
              <option value="CLOSED">Closed only</option>
              <option value="HIT_TARGET">Target hit</option>
              <option value="STOPPED_OUT">Stopped out</option>
              <option value="DONCHIAN_EXIT">Donchian exit</option>
              <option value="TIME_EXIT">Time / cycle exit</option>
              <option value="EMA_EXIT">EMA cross exit</option>
              <option value="EOD_EXIT">EOD exit (The Linda)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-hairline bg-desk-deep/60 text-desk-muted font-medium">
              <tr>
                <th className="px-5 py-3 font-medium">Dates</th>
                <th className="px-5 py-3 font-medium">Contract</th>
                <th className="px-5 py-3 font-medium">Strategy</th>
                <th className="px-5 py-3 font-medium">Side</th>
                <th className="px-5 py-3 text-right font-medium">Entry</th>
                <th className="px-5 py-3 text-right font-medium">Current / exit</th>
                <th className="px-5 py-3 text-right font-medium">Stop</th>
                <th className="px-5 py-3 text-right font-medium">Target</th>
                <th className="px-5 py-3 text-right font-medium">Net P&amp;L</th>
                <th className="px-5 py-3 text-right font-medium">Return</th>
                <th className="px-5 py-3 text-center font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-5 py-12 text-center text-desk-muted">
                    No executed trades match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isLong = t.side === 'long';
                  const isOpen = t.status === 'OPEN';
                  const displayPnl = isOpen ? t.unrealized_pnl : t.realized_pnl;
                  const tradeCost = t.fees_and_slippage ?? ((t.commission || 0) + (t.slippage || 0));

                  return (
                    <tr
                      key={t.id}
                      className={`transition-colors ${
                        isOpen
                          ? 'bg-desk-raised/40 hover:bg-desk-raised/70'
                          : 'hover:bg-desk-raised/30'
                      }`}
                    >
                      <td className="px-5 py-3.5 font-mono tabular-nums">
                        <div className="text-desk-text">{t.entry_date?.slice(0, 10)}</div>
                        <div className="text-[11px] text-desk-muted mt-0.5">
                          {isOpen ? (
                            <span className="text-desk-up">Open · {t.duration_days}d</span>
                          ) : (
                            <span>Exit {t.exit_date?.slice(0, 10) || 'Closed'} · {t.duration_days}d</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-desk-text font-mono">
                          {t.symbol}
                        </div>
                        <div className="text-[11px] text-desk-muted">
                          {t.symbol_name}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="desk-tag">{displayStrategyName(t.strategy)}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={isLong ? 'desk-tag-up' : 'desk-tag-down'}>
                          {isLong ? 'Long' : 'Short'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-desk-secondary">
                        {formatPrice(t.entry_price)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-desk-text font-medium">
                        {formatPrice(isOpen ? t.current_price : t.exit_price)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-desk-down">
                        {formatPrice(t.stop_loss)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono tabular-nums text-desk-up">
                        {formatPrice(t.profit_target)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono tabular-nums">
                        <div
                          className={`font-semibold ${
                            displayPnl >= 0 ? 'text-desk-up' : 'text-desk-down'
                          }`}
                        >
                          {displayPnl >= 0 ? '+' : ''}
                          {fmt$(displayPnl)}
                        </div>
                        {tradeCost > 0 && (
                          <div
                            className="text-[11px] text-desk-muted"
                            title={`Gross: ${fmt$(t.gross_pnl ?? displayPnl)} | Comm: -$${(t.commission || 0).toFixed(2)} | Slip: -$${(t.slippage || 0).toFixed(2)}`}
                          >
                            incl. -{fmt$(tradeCost)} cost
                          </div>
                        )}
                      </td>

                      <td
                        className={`px-5 py-3.5 text-right font-mono tabular-nums font-medium ${
                          t.return_pct >= 0 ? 'text-desk-up' : 'text-desk-down'
                        }`}
                      >
                        {t.return_pct > 0 ? `+${t.return_pct.toFixed(1)}%` : `${t.return_pct.toFixed(1)}%`}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {t.status === 'OPEN' ? (
                          <span className="desk-tag-up inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
                            Open
                          </span>
                        ) : t.status === 'HIT_TARGET' ? (
                          <span className="desk-tag-up">Target hit</span>
                        ) : t.status === 'STOPPED_OUT' ? (
                          <span className="desk-tag-down">Stopped</span>
                        ) : (
                          <span className="desk-tag">
                            {STATUS_LABELS[t.status] || t.status}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingTrade(t);
                              setNewTarget(t.profit_target ? String(t.profit_target) : '');
                              setNewStop(t.stop_loss ? String(t.stop_loss) : '');
                            }}
                            className="desk-btn-secondary px-2.5 py-1 text-[11px]"
                            title="Edit target or stop"
                          >
                            Edit
                          </button>
                          {isOpen && (
                            <button
                              onClick={() => handleManualClose(t.id)}
                              className="rounded-lg border border-desk-down/30 bg-desk-down/10 hover:bg-desk-down/20 text-desk-down px-2.5 py-1 text-[11px] font-medium transition-colors"
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

      {/* Edit Target / Stop Modal */}
      {editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md desk-surface rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <h3 className="text-base font-semibold text-desk-text">
                  Adjust parameters · <span className="font-mono">{editingTrade.symbol}</span>
                </h3>
                <p className="text-xs text-desk-muted mt-0.5">
                  {displayStrategyName(editingTrade.strategy)} ({editingTrade.side === 'long' ? 'Long' : 'Short'})
                </p>
              </div>
              <button
                onClick={() => setEditingTrade(null)}
                className="text-desk-muted hover:text-desk-text p-1"
                aria-label="Close modal"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-desk-secondary mb-1.5">
                  Profit target price
                </label>
                <input
                  type="number"
                  step="any"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="e.g. 5420.50"
                  className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-desk-secondary mb-1.5">
                  Stop loss price
                </label>
                <input
                  type="number"
                  step="any"
                  value={newStop}
                  onChange={(e) => setNewStop(e.target.value)}
                  placeholder="e.g. 5350.00"
                  className="desk-input w-full px-3.5 py-2 text-sm font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setEditingTrade(null)}
                className="desk-btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="desk-btn-primary px-4 py-2 text-xs"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
