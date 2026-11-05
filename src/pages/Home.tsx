import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import { getTodayDatePacific } from '../lib/dateUtils';
import { fetchJson } from '../lib/http';
import type {
  TurtleOpenTradesPayload,
  TurtleSignalsPayload,
  TurtleSuggestedTradesPayload,
} from '../types/turtle';
import type { OdidAlertsPayload, OdidOpenTradesPayload, OdidSignalsPayload } from '../types/odid';
import type { TaylorSignalsPayload } from '../types/taylor';
import type { GrailSignalsPayload } from '../types/grail';
import type { LindaSignalsPayload } from '../types/linda';
import type { PaperTrade, PaperTradesPayload, PaperTradePerformancePayload } from '../types/paperTrade';
import { fmt$ } from '../lib/formatCurrency';
import SignalChartModal from '../components/SignalChartModal';
import IraPortfolioWidget from '../components/IraPortfolioWidget';
import {
  ArrowRightIcon,
  ChartLineIcon,
  ChevronDownIcon,
  ClockIcon,
} from '../components/Icons';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatSignalPrice(value?: number | string | null, digits = 2) {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  if (Math.abs(num) >= 1000) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (Math.abs(num) < 2) return num.toFixed(4);
  return num.toFixed(digits);
}

function fmtSignedPct(v?: number) {
  if (v === undefined || Number.isNaN(v)) return '0.0%';
  return v > 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`;
}

function pctTone(v?: number) {
  if (!v) return 'text-desk-muted';
  return v > 0 ? 'text-desk-up' : 'text-desk-down';
}

function formatSessionLabel(session?: string | null, isHourly?: boolean) {
  if (session === 'ASIA') return 'Asia 1h';
  if (session === 'LONDON') return 'London 1h';
  if (session === 'US') return isHourly ? 'US 1h' : 'US RTH';
  return isHourly ? 'Globex 1h' : 'Daily';
}

const STATUS_LABELS: Record<string, { label: string; dot: string; text: string }> = {
  OPEN: { label: 'Open', dot: 'bg-desk-up', text: 'text-desk-text' },
  HIT_TARGET: { label: 'Target hit', dot: 'bg-desk-up', text: 'text-desk-up' },
  STOPPED_OUT: { label: 'Stopped out', dot: 'bg-desk-down', text: 'text-desk-down' },
  DONCHIAN_EXIT: { label: 'Donchian exit', dot: 'bg-desk-muted', text: 'text-desk-secondary' },
  TIME_EXIT: { label: 'Time exit', dot: 'bg-desk-muted', text: 'text-desk-secondary' },
  EMA_EXIT: { label: 'EMA exit', dot: 'bg-desk-muted', text: 'text-desk-secondary' },
  EOD_EXIT: { label: 'EOD exit', dot: 'bg-desk-muted', text: 'text-desk-secondary' },
  MANUALLY_CLOSED: { label: 'Closed', dot: 'bg-desk-muted', text: 'text-desk-muted' },
};

/* ------------------------------------------------------------------ */
/*  Strategy Summary Stat Card                                        */
/* ------------------------------------------------------------------ */

function StrategySummaryCard({
  label,
  to,
  method,
  value,
  sub,
  mtdPct,
  allTimePct,
}: {
  label: string;
  to: string;
  method: string;
  value: number;
  sub: string;
  mtdPct?: number;
  allTimePct?: number;
}) {
  return (
    <Link
      to={to}
      className="group desk-surface rounded-xl p-5 flex flex-col justify-between hover:border-hairline-strong transition-colors duration-150 ease-desk"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-desk-text group-hover:text-white transition-colors duration-150 ease-desk truncate">
            {label}
          </span>
          <span className="text-xs font-mono text-desk-muted shrink-0">{method}</span>
        </div>

        <div className="mt-4 flex items-baseline gap-2.5">
          <span className="text-[28px] leading-none font-medium font-mono text-desk-text">
            {value}
          </span>
          <span className="text-xs text-desk-muted truncate">{sub}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-desk-muted mr-1.5">MTD</span>
          <span className={pctTone(mtdPct)}>{fmtSignedPct(mtdPct)}</span>
        </div>
        <div>
          <span className="text-desk-muted mr-1.5">All</span>
          <span className={pctTone(allTimePct)}>{fmtSignedPct(allTimePct)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Homepage Dashboard                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [winnersOpen, setWinnersOpen] = useState(false);
  const [losersOpen, setLosersOpen] = useState(false);
  const [turtleSignals, setTurtleSignals] = useState<TurtleSignalsPayload | null>(null);
  const [, setTurtleOpen] = useState<TurtleOpenTradesPayload | null>(null);
  const [, setTurtleSuggested] = useState<TurtleSuggestedTradesPayload | null>(null);
  const [odidSignals, setOdidSignals] = useState<OdidSignalsPayload | null>(null);
  const [odidAlerts, setOdidAlerts] = useState<OdidAlertsPayload | null>(null);
  const [odidOpen, setOdidOpen] = useState<OdidOpenTradesPayload | null>(null);
  const [taylorSignals, setTaylorSignals] = useState<TaylorSignalsPayload | null>(null);
  const [grailSignals, setGrailSignals] = useState<GrailSignalsPayload | null>(null);
  const [lindaSignals, setLindaSignals] = useState<LindaSignalsPayload | null>(null);
  const [paperPerformance, setPaperPerformance] = useState<PaperTradePerformancePayload | null>(null);
  const [allTrades, setAllTrades] = useState<PaperTrade[]>([]);
  const [chartItem, setChartItem] = useState<{
    symbol: string;
    strategy: string;
    interval?: string;
    signalLabel?: string;
    direction?: 'long' | 'short' | 'fade_up' | 'fade_down' | null;
    entryPrice?: number | null;
    stopPrice?: number | null;
    targetPrice?: number | null;
  } | null>(null);

  const closeChart = useCallback(() => setChartItem(null), []);

  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.allSettled([
          fetchJson<TurtleSignalsPayload>('/data/turtle_signals_latest.json', { cache: 'no-store' }),
          fetchJson<TurtleOpenTradesPayload>('/data/turtle_open_trades_latest.json', { cache: 'no-store' }),
          fetchJson<TurtleSuggestedTradesPayload>('/data/turtle_suggested_latest.json', { cache: 'no-store' }),
          fetchJson<OdidSignalsPayload>('/data/odid_signals_latest.json', { cache: 'no-store' }),
          fetchJson<OdidAlertsPayload>('/data/odid_alerts_latest.json', { cache: 'no-store' }),
          fetchJson<OdidOpenTradesPayload>('/data/odid_open_trades_latest.json', { cache: 'no-store' }),
          fetchJson<TaylorSignalsPayload>('/data/taylor_signals_latest.json', { cache: 'no-store' }),
          fetchJson<GrailSignalsPayload>('/data/grail_signals_latest.json', { cache: 'no-store' }),
          fetchJson<LindaSignalsPayload>('/data/linda_signals_latest.json', { cache: 'no-store' }),
          fetchJson<PaperTradePerformancePayload>('/data/paper_trade_performance.json', { cache: 'no-store' }),
          fetchJson<PaperTradesPayload>('/data/paper_trades_latest.json', { cache: 'no-store' }),
        ]);

        const [ts, to2, tSug, odSig, odAlrt, odOpen, tay, gr, lin, pp, pt] = results;
        if (ts.status === 'fulfilled') setTurtleSignals(ts.value);
        if (to2.status === 'fulfilled') setTurtleOpen(to2.value);
        if (tSug.status === 'fulfilled') setTurtleSuggested(tSug.value);
        if (odSig.status === 'fulfilled') setOdidSignals(odSig.value);
        if (odAlrt.status === 'fulfilled') setOdidAlerts(odAlrt.value);
        if (odOpen.status === 'fulfilled') setOdidOpen(odOpen.value);
        if (tay.status === 'fulfilled') setTaylorSignals(tay.value);
        if (gr.status === 'fulfilled') setGrailSignals(gr.value);
        if (lin.status === 'fulfilled') setLindaSignals(lin.value);
        if (pp.status === 'fulfilled') setPaperPerformance(pp.value);
        if (pt.status === 'fulfilled' && pt.value?.trades) setAllTrades(pt.value.trades);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const turtleTriggered = turtleSignals?.triggered || [];
  const turtleTriggeredEligible = turtleTriggered.filter((t) => t.eligible !== false);
  const odidTriggered = odidSignals?.triggered || [];
  const odidAlertsCount = odidAlerts?.total_alerts ?? 0;
  const odidOpenCount = odidOpen?.open_trades?.length ?? 0;

  const bradmanActionable = useMemo(() => {
    if (!taylorSignals?.signals) return [];
    return [...taylorSignals.signals]
      .filter((s) => s.action !== 'WATCH' && s.action !== 'SELL_EXIT')
      .sort((a, b) => {
        const score = (x: typeof a) =>
          (x.fx_pair_confirmed ? 8 : 0) +
          (x.entry_session === 'ASIA' || x.entry_session === 'LONDON' ? 4 : 0) +
          (x.hourly_divergence ? 2 : 0);
        return score(b) - score(a);
      });
  }, [taylorSignals]);

  const grailTriggered = useMemo(() => {
    if (!grailSignals?.signals) return [];
    return grailSignals.signals.filter((s) => s.eligible !== false && s.side !== 'none');
  }, [grailSignals]);

  const lindaTriggered = useMemo(() => {
    if (!lindaSignals?.signals) return [];
    return lindaSignals.signals.filter((s) => s.triggered);
  }, [lindaSignals]);

  const [selectedPerfStrategy, setSelectedPerfStrategy] = useState<string>('ALL');
  const [selectedPerfTimeframe, setSelectedPerfTimeframe] = useState<'QTD' | 'YTD' | 'INCEPTION'>('INCEPTION');

  const isTradeInTimeframe = (t: PaperTrade, tf: 'QTD' | 'YTD' | 'INCEPTION' = 'INCEPTION'): boolean => {
    if (tf === 'INCEPTION') return true;
    const refDateStr = (t.status === 'OPEN' ? t.entry_date : (t.exit_date || t.entry_date))?.slice(0, 10);
    if (!refDateStr) return true;
    const nowPac = getTodayDatePacific();
    const currentYear = nowPac.getFullYear();
    if (tf === 'YTD') {
      return refDateStr >= `${currentYear}-01-01`;
    }
    if (tf === 'QTD') {
      const quarterStartMonth = Math.floor(nowPac.getMonth() / 3) * 3 + 1;
      const qStartStr = `${currentYear}-${String(quarterStartMonth).padStart(2, '0')}-01`;
      return refDateStr >= qStartStr;
    }
    return true;
  };

  const perfTrades = useMemo(() => {
    const sourceTrades = allTrades.length > 0 ? allTrades : (paperPerformance?.recent_trades || []);
    if (sourceTrades.length === 0) return [];
    return sourceTrades
      .filter((t) => {
        const matchStrat = selectedPerfStrategy === 'ALL' || t.strategy === selectedPerfStrategy;
        const matchTf = isTradeInTimeframe(t, selectedPerfTimeframe);
        return matchStrat && matchTf;
      })
      .sort((a, b) => {
        const aOpen = a.status === 'OPEN' ? 0 : 1;
        const bOpen = b.status === 'OPEN' ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return (b.entry_date || '').localeCompare(a.entry_date || '');
      });
  }, [allTrades, paperPerformance, selectedPerfStrategy, selectedPerfTimeframe]);

  const deskHeroTotals = useMemo(() => {
    const sourceTrades = allTrades.length > 0 ? allTrades : (paperPerformance?.recent_trades || []);
    const closed = sourceTrades.filter((t) => t.status !== 'OPEN');
    const open = sourceTrades.filter((t) => t.status === 'OPEN');
    const realizedPnl = closed.reduce((acc, t) => acc + (t.realized_pnl || 0), 0);
    const unrealizedPnl = open.reduce((acc, t) => acc + (t.unrealized_pnl || 0), 0);
    const netPnl = realizedPnl + unrealizedPnl;
    return {
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      netPnl: Math.round(netPnl * 100) / 100,
      returnPct: Math.round((netPnl / 100000) * 1000) / 10,
      closedCount: closed.length,
      openCount: open.length,
    };
  }, [allTrades, paperPerformance]);

  const heroEquityCurve = useMemo(() => {
    if (paperPerformance?.equity_curve?.length) {
      return paperPerformance.equity_curve;
    }
    if (allTrades.length === 0) return [];
    const dateSet = new Set<string>();
    for (const t of allTrades) {
      if (t.entry_date) dateSet.add(t.entry_date.slice(0, 10));
      if (t.exit_date) dateSet.add(t.exit_date.slice(0, 10));
    }
    const sortedDates = Array.from(dateSet).sort();
    const latest = sortedDates[sortedDates.length - 1];
    return sortedDates.map((d) => {
      const realized = allTrades
        .filter((t) => t.status !== 'OPEN' && (t.exit_date || t.entry_date)?.slice(0, 10) <= d)
        .reduce((acc, t) => acc + (t.realized_pnl || 0), 0);
      const unrealized =
        d === latest
          ? allTrades
              .filter((t) => t.status === 'OPEN' && (t.entry_date || '').slice(0, 10) <= d)
              .reduce((acc, t) => acc + (t.unrealized_pnl || 0), 0)
          : 0;
      const cum_pnl = Math.round((realized + unrealized) * 100) / 100;
      return { date: d, cum_pnl };
    });
  }, [paperPerformance, allTrades]);

  const inceptionMetrics = useMemo(() => {
    const sourceTrades = allTrades.length > 0 ? allTrades : (paperPerformance?.recent_trades || []);
    const pool = sourceTrades.filter(
      (t) => selectedPerfStrategy === 'ALL' || t.strategy === selectedPerfStrategy
    );
    const closed = pool.filter((t) => t.status !== 'OPEN');
    const open = pool.filter((t) => t.status === 'OPEN');

    const realizedPnl = closed.reduce((acc, t) => acc + (t.realized_pnl || 0), 0);
    const unrealizedPnl = open.reduce((acc, t) => acc + (t.unrealized_pnl || 0), 0);

    return {
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      closedCount: closed.length,
      openCount: open.length,
    };
  }, [allTrades, paperPerformance, selectedPerfStrategy]);

  const strategyPerfSummary = useMemo(() => {
    const strategies = ['Trendorama', 'The Bradman', 'YouHaveChosenWisely', 'TooHot TooCold', 'The Linda'];
    const sourceTrades = allTrades.length > 0 ? allTrades : (paperPerformance?.recent_trades || []);
    const nowPac = getTodayDatePacific();
    const fallbackMonth = `${nowPac.getFullYear()}-${String(nowPac.getMonth() + 1).padStart(2, '0')}`;
    const currentMonth = paperPerformance?.date ? paperPerformance.date.slice(0, 7) : fallbackMonth;

    const map: Record<string, { mtdPct: number; allTimePct: number }> = {};
    for (const strat of strategies) {
      const stratTrades = sourceTrades.filter((t) => t.strategy === strat);
      const allTimePnl =
        stratTrades.length > 0
          ? stratTrades.reduce(
              (acc, t) => acc + (t.status === 'OPEN' ? (t.unrealized_pnl || 0) : (t.realized_pnl || 0)),
              0
            )
          : (paperPerformance?.strategy_breakdown?.[strat]?.net_pnl ?? 0);

      const mtdTrades = stratTrades.filter((t) => {
        if (t.status === 'OPEN') return true;
        if (t.exit_date && t.exit_date.slice(0, 7) === currentMonth) return true;
        if (!t.exit_date && t.entry_date && t.entry_date.slice(0, 7) === currentMonth) return true;
        return false;
      });
      const mtdPnl = mtdTrades.reduce(
        (acc, t) => acc + (t.status === 'OPEN' ? (t.unrealized_pnl || 0) : (t.realized_pnl || 0)),
        0
      );

      map[strat] = {
        mtdPct: Math.round((mtdPnl / 100000) * 1000) / 10,
        allTimePct: Math.round((allTimePnl / 100000) * 1000) / 10,
      };
    }
    return map;
  }, [allTrades, paperPerformance]);

  const activeMetrics = useMemo(() => {
    if (!paperPerformance && allTrades.length === 0) return null;
    const pool = perfTrades;

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

    const winRate =
      closed.length > 0
        ? (wins.length / closed.length) * 100
        : open.length > 0
          ? (open.filter((t) => (t.unrealized_pnl || 0) > 0).length / open.length) * 100
          : 0;

    const profitFactor = lossDollars > 0 ? winDollars / lossDollars : winDollars > 0 ? 99.9 : 1.0;
    const avgWin = wins.length > 0 ? winDollars / wins.length : 0;

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
    };
  }, [paperPerformance, allTrades, perfTrades]);

  const biggestWinners = useMemo(() => {
    return [...perfTrades]
      .filter((t) => (t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl) > 0)
      .sort((a, b) => {
        const pnlA = a.status === 'OPEN' ? a.unrealized_pnl : a.realized_pnl;
        const pnlB = b.status === 'OPEN' ? b.unrealized_pnl : b.realized_pnl;
        return pnlB - pnlA;
      })
      .slice(0, 4);
  }, [perfTrades]);

  const biggestLosers = useMemo(() => {
    return [...perfTrades]
      .filter((t) => (t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl) < 0)
      .sort((a, b) => {
        const pnlA = a.status === 'OPEN' ? a.unrealized_pnl : a.realized_pnl;
        const pnlB = b.status === 'OPEN' ? b.unrealized_pnl : b.realized_pnl;
        return pnlA - pnlB;
      })
      .slice(0, 4);
  }, [perfTrades]);

  const todayShort = getTodayDatePacific().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  });

  const scanScheduleStatus = useMemo(() => {
    const rawTs =
      paperPerformance?.timestamp ||
      taylorSignals?.timestamp ||
      turtleSignals?.timestamp ||
      odidSignals?.timestamp ||
      lindaSignals?.timestamp;

    let lastRunDisplay = '—';
    if (rawTs) {
      const dt = new Date(rawTs);
      if (!isNaN(dt.getTime())) {
        const ptTime = dt.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Los_Angeles',
        });
        const etTime = dt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/New_York',
        });
        lastRunDisplay = `${ptTime} PT (${etTime} ET)`;
      }
    }

    const now = new Date();
    const dailySlots: { hourUtc: number; minUtc: number; label: string; daysUtc: number[] }[] = [
      { hourUtc: 0, minUtc: 30, label: 'Settlement sync', daysUtc: [2, 3, 4, 5, 6] },
      { hourUtc: 3, minUtc: 30, label: 'Asia session', daysUtc: [2, 3, 4, 5, 6] },
      { hourUtc: 8, minUtc: 15, label: 'London open', daysUtc: [1, 2, 3, 4, 5] },
      { hourUtc: 14, minUtc: 0, label: 'Morning open', daysUtc: [1, 2, 3, 4, 5] },
      { hourUtc: 17, minUtc: 30, label: 'Mid-session', daysUtc: [1, 2, 3, 4, 5] },
      { hourUtc: 20, minUtc: 5, label: 'Pit close', daysUtc: [1, 2, 3, 4, 5] },
      { hourUtc: 21, minUtc: 15, label: 'Globex close', daysUtc: [1, 2, 3, 4, 5] },
    ];

    let nextCandidate: { dt: Date; label: string } | null = null;
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset));
      const dow = base.getUTCDay();
      for (const slot of dailySlots) {
        if (!slot.daysUtc.includes(dow)) continue;
        const slotDt = new Date(
          Date.UTC(
            base.getUTCFullYear(),
            base.getUTCMonth(),
            base.getUTCDate(),
            slot.hourUtc,
            slot.minUtc,
            0
          )
        );
        if (slotDt.getTime() > now.getTime()) {
          if (!nextCandidate || slotDt.getTime() < nextCandidate.dt.getTime()) {
            nextCandidate = { dt: slotDt, label: slot.label };
          }
        }
      }
      if (nextCandidate) break;
    }

    let nextRunDisplay = '—';
    let nextRunLabel = '';
    if (nextCandidate) {
      const isSameDayPt =
        nextCandidate.dt.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }) ===
        now.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
      const ptStr = nextCandidate.dt.toLocaleString('en-US', {
        ...(isSameDayPt ? {} : { weekday: 'short' }),
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Los_Angeles',
      });
      const etStr = nextCandidate.dt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
      });
      nextRunDisplay = `${ptStr} PT (${etStr} ET)`;
      nextRunLabel = nextCandidate.label;
    }

    return { lastRunDisplay, nextRunDisplay, nextRunLabel };
  }, [paperPerformance, taylorSignals, turtleSignals, odidSignals, lindaSignals]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-desk-raised border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading futures desk data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-8">
      {/* ──────────────── ASYMMETRIC DESK HERO ──────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
        {/* Left: Calm, specific desk statement + primary & secondary actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2 text-xs font-mono text-desk-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
            <span>NFA-registered CTA</span>
            <span>·</span>
            <span>{todayShort}</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] leading-[1.08] tracking-[-0.025em] font-medium text-desk-text">
              Systematic futures signals and execution ledger
            </h1>
            <p className="text-base leading-relaxed text-desk-secondary max-w-[34rem]">
              OzCTA runs automated Globex and pit-session scans across 14 commodity, equity index, interest rate, and currency futures contracts, logging every triggered setup with entry, stop, target, and round-turn friction.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/executed-trades" className="desk-btn-primary h-11 px-5 text-sm">
              <span>View execution ledger</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link to="/fund" className="desk-btn-secondary h-11 px-5 text-sm">
              Program profile
            </Link>
          </div>

          <div className="pt-2 border-t border-hairline flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2 text-xs font-mono text-desk-muted">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-3.5 h-3.5 text-desk-muted" />
              <span>Last scan:</span>
              <span className="text-desk-secondary">{scanScheduleStatus.lastRunDisplay}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Next:</span>
              <span className="text-desk-secondary">{scanScheduleStatus.nextRunDisplay}</span>
              {scanScheduleStatus.nextRunLabel && (
                <span className="text-desk-muted">({scanScheduleStatus.nextRunLabel})</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Moment #1 — Live Desk Cumulative Equity Blotter */}
        <div className="lg:col-span-7 desk-surface rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-hairline">
            <div>
              <div className="text-xs text-desk-muted">Model execution blotter ($100,000 baseline · 2% risk/trade)</div>
              <div className="mt-1.5 flex items-baseline gap-3">
                <span
                  className={`text-[32px] leading-none font-medium font-mono ${
                    deskHeroTotals.netPnl >= 0 ? 'text-desk-up' : 'text-desk-down'
                  }`}
                >
                  {deskHeroTotals.netPnl >= 0 ? '+' : ''}
                  {fmt$(deskHeroTotals.netPnl)}
                </span>
                <span className="text-xs font-mono text-desk-secondary">
                  {fmtSignedPct(deskHeroTotals.returnPct)} vs $100k starting capital
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right font-mono">
              <div>
                <div className="text-xs font-sans text-desk-muted">Closed realized</div>
                <div
                  className={`mt-0.5 text-sm font-medium ${
                    deskHeroTotals.realizedPnl >= 0 ? 'text-desk-text' : 'text-desk-down'
                  }`}
                >
                  {deskHeroTotals.realizedPnl >= 0 ? '+' : ''}
                  {fmt$(deskHeroTotals.realizedPnl)}
                </div>
                <div className="text-[11px] text-desk-muted">{deskHeroTotals.closedCount} closed</div>
              </div>

              <div>
                <div className="text-xs font-sans text-desk-muted">Active open</div>
                <div
                  className={`mt-0.5 text-sm font-medium ${
                    deskHeroTotals.unrealizedPnl >= 0 ? 'text-desk-up' : 'text-desk-down'
                  }`}
                >
                  {deskHeroTotals.unrealizedPnl >= 0 ? '+' : ''}
                  {fmt$(deskHeroTotals.unrealizedPnl)}
                </div>
                <div className="text-[11px] text-desk-muted">{deskHeroTotals.openCount} open</div>
              </div>
            </div>
          </div>

          <div className="mt-5 h-[220px] w-full">
            {heroEquityCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={heroEquityCurve} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="deskEquityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4cc38a" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#4cc38a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#232325" strokeDasharray="2 2" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#85858b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={36}
                    tick={{ fill: '#85858b', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <YAxis
                    stroke="#85858b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fill: '#85858b', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f0f10',
                      border: '1px solid rgba(237, 237, 237, 0.14)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#ededed',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    formatter={(val: any) => [fmt$(Number(val)), 'Cumulative net P&L']}
                    labelFormatter={(l) => `Session ${l}`}
                  />
                  <ReferenceLine y={0} stroke="#323236" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="cum_pnl"
                    stroke="#4cc38a"
                    strokeWidth={1.75}
                    fill="url(#deskEquityFill)"
                    fillOpacity={1}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-desk-muted font-mono">
                Awaiting cumulative curve points
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ──────────────── PRIVATE IRA WIDGET (owner only) ──────────────── */}
      <IraPortfolioWidget />

      {/* ──────────────── COMPACT STRATEGY SUMMARY ROW ──────────────── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-medium text-desk-text">Strategy overview</h2>
          <span className="text-xs font-mono text-desk-muted">5 systematic futures models · net of commissions & slippage</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StrategySummaryCard
            label="Trendorama"
            to="/trendorama"
            method="Donchian"
            value={turtleTriggered.length}
            sub={`${turtleTriggeredEligible.length} eligible`}
            mtdPct={strategyPerfSummary['Trendorama']?.mtdPct}
            allTimePct={strategyPerfSummary['Trendorama']?.allTimePct}
          />
          <StrategySummaryCard
            label="The Bradman"
            to="/taylor"
            method="Globex 1h"
            value={bradmanActionable.length}
            sub={`of ${taylorSignals?.total_scanned ?? 0} actionable`}
            mtdPct={strategyPerfSummary['The Bradman']?.mtdPct}
            allTimePct={strategyPerfSummary['The Bradman']?.allTimePct}
          />
          <StrategySummaryCard
            label="YouHaveChosenWisely"
            to="/grail"
            method="ADX / EMA"
            value={grailSignals?.total_triggered ?? 0}
            sub={`${grailTriggered.length} active setups`}
            mtdPct={strategyPerfSummary['YouHaveChosenWisely']?.mtdPct}
            allTimePct={strategyPerfSummary['YouHaveChosenWisely']?.allTimePct}
          />
          <StrategySummaryCard
            label="TooHot TooCold"
            to="/odid"
            method="OD/ID break"
            value={odidAlertsCount}
            sub={`${odidTriggered.length} triggered · ${odidOpenCount} open`}
            mtdPct={strategyPerfSummary['TooHot TooCold']?.mtdPct}
            allTimePct={strategyPerfSummary['TooHot TooCold']?.allTimePct}
          />
          <StrategySummaryCard
            label="The Linda"
            to="/linda"
            method="15m EMA"
            value={lindaTriggered.length}
            sub={`of ${lindaSignals?.total_scanned ?? 0} mean-revert`}
            mtdPct={strategyPerfSummary['The Linda']?.mtdPct}
            allTimePct={strategyPerfSummary['The Linda']?.allTimePct}
          />
        </div>
      </section>

      {/* ──────────────── ACTIVE SETUPS BY MODEL (PRICE LADDERS) ──────────────── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-medium text-desk-text">Active setups by strategy</h2>
          <span className="text-xs text-desk-muted">Select any contract row to inspect the TradingView study chart</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {/* 1. Trendorama */}
          <div className="desk-surface rounded-2xl flex flex-col justify-between overflow-hidden">
            <div>
              <div className="px-4 py-3.5 border-b border-hairline flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-desk-text">Trendorama</div>
                  <div className="text-xs text-desk-muted">55-day channel breakout</div>
                </div>
                <Link to="/trendorama" className="desk-btn-secondary h-7 px-2.5 text-xs shrink-0">
                  Signals
                </Link>
              </div>

              <div className="p-4 space-y-2">
                {turtleTriggered.length === 0 ? (
                  <p className="text-xs text-desk-muted py-6 text-center">
                    No breakouts triggered on the latest bar
                  </p>
                ) : (
                  turtleTriggered.slice(0, 3).map((t, i) => {
                    const isLong = t.side.toLowerCase() === 'long';
                    return (
                      <div key={`${t.symbol}-${i}`} className="desk-well rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-desk-up shrink-0" />
                            <span className="font-mono text-sm font-medium text-desk-text">{t.symbol}</span>
                            <span className="text-[11px] font-mono text-desk-muted">· Daily</span>
                            <span className={isLong ? 'desk-tag-up' : 'desk-tag-down'}>
                              {isLong ? 'Long' : 'Short'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setChartItem({
                                symbol: t.symbol,
                                strategy: 'trendorama',
                                interval: 'D',
                                signalLabel: `Trendorama · ${isLong ? 'Long' : 'Short'}`,
                                direction: isLong ? 'long' : 'short',
                                entryPrice: t.entry_stop,
                                stopPrice: t.stop_loss,
                              })
                            }
                            className="h-7 px-2 rounded-md bg-desk-raised hover:bg-[#2b2b2e] border border-hairline text-xs text-desk-secondary hover:text-desk-text inline-flex items-center gap-1.5 transition-colors duration-150 ease-desk shrink-0"
                            title="Open chart"
                          >
                            <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                            <span>1D</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-hairline text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-desk-muted">Entry</span>
                            <span className="text-desk-text">${formatSignalPrice(t.entry_stop)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-desk-muted">Stop</span>
                            <span className="text-desk-down">${formatSignalPrice(t.stop_loss)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-hairline flex justify-end">
              <Link
                to="/trendorama"
                className="inline-flex items-center gap-1 text-xs text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk"
              >
                <span>Signal matrix</span>
                <ArrowRightIcon className="w-3.5 h-3.5 text-desk-muted" />
              </Link>
            </div>
          </div>

          {/* 2. The Bradman */}
          <div className="desk-surface rounded-2xl flex flex-col justify-between overflow-hidden">
            <div>
              <div className="px-4 py-3.5 border-b border-hairline flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-desk-text">The Bradman</div>
                  <div className="text-xs text-desk-muted">24h Globex 1h + 3-day cycle</div>
                </div>
                <Link to="/taylor" className="desk-btn-secondary h-7 px-2.5 text-xs shrink-0">
                  Signals
                </Link>
              </div>

              <div className="p-4 space-y-2">
                {(bradmanActionable.length > 0 ? bradmanActionable : taylorSignals?.signals || [])
                  .slice(0, 3)
                  .map((sig) => {
                    const isLong = sig.action === 'BUY_LONG';
                    const isShort = sig.action === 'SELL_SHORT';
                    const actionLabel = isLong ? 'Long' : isShort ? 'Short' : 'Watch';
                    return (
                      <div key={sig.symbol} className="desk-well rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                isLong || isShort ? 'bg-desk-up' : 'bg-desk-muted'
                              }`}
                            />
                            <span className="font-mono text-sm font-medium text-desk-text">{sig.symbol}</span>
                            <span className="text-[11px] font-mono text-desk-muted truncate">
                              · {formatSessionLabel(sig.entry_session, Boolean(sig.hourly_divergence))}
                            </span>
                            <span className={isLong ? 'desk-tag-up' : isShort ? 'desk-tag-down' : 'desk-tag'}>
                              {actionLabel}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setChartItem({
                                symbol: sig.symbol,
                                strategy: 'taylor',
                                interval: sig.hourly_divergence ? '60' : 'D',
                                signalLabel: `The Bradman (${sig.hourly_divergence ? '60m Globex' : 'Daily'}) · ${actionLabel}`,
                                direction: isLong ? 'long' : isShort ? 'short' : null,
                                entryPrice: sig.entry_target,
                                targetPrice: sig.profit_target,
                                stopPrice: sig.stop_loss,
                              })
                            }
                            className="h-7 px-2 rounded-md bg-desk-raised hover:bg-[#2b2b2e] border border-hairline text-xs text-desk-secondary hover:text-desk-text inline-flex items-center gap-1.5 transition-colors duration-150 ease-desk shrink-0"
                            title="Open chart"
                          >
                            <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                            <span>{sig.hourly_divergence ? '60m' : '1D'}</span>
                          </button>
                        </div>

                        {sig.hourly_divergence && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-desk-secondary">
                            <span className="desk-tag text-[11px]">1h 3/10 div</span>
                            {sig.fx_pair_confirmed && (
                              <span className="desk-tag-up text-[11px]">EC / $ confirmed</span>
                            )}
                          </div>
                        )}

                        <div className="space-y-1 pt-1 border-t border-hairline text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-desk-muted">Entry</span>
                            <span className="text-desk-text">${formatSignalPrice(sig.entry_target)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-desk-muted">Target / Stop</span>
                            <span>
                              <span className="text-desk-up">${formatSignalPrice(sig.profit_target)}</span>
                              <span className="text-desk-muted mx-1">/</span>
                              <span className="text-desk-down">${formatSignalPrice(sig.stop_loss)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-hairline flex justify-end">
              <Link
                to="/taylor"
                className="inline-flex items-center gap-1 text-xs text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk"
              >
                <span>Cycle objectives</span>
                <ArrowRightIcon className="w-3.5 h-3.5 text-desk-muted" />
              </Link>
            </div>
          </div>

          {/* 3. YouHaveChosenWisely */}
          <div className="desk-surface rounded-2xl flex flex-col justify-between overflow-hidden">
            <div>
              <div className="px-4 py-3.5 border-b border-hairline flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-desk-text truncate">YouHaveChosenWisely</div>
                  <div className="text-xs text-desk-muted">ADX trend / 20 EMA pullback</div>
                </div>
                <Link to="/grail" className="desk-btn-secondary h-7 px-2.5 text-xs shrink-0">
                  Signals
                </Link>
              </div>

              <div className="p-4 space-y-2">
                {grailTriggered.length === 0 ? (
                  <p className="text-xs text-desk-muted py-6 text-center">
                    No active EMA pullback triggers today
                  </p>
                ) : (
                  grailTriggered.slice(0, 3).map((sig) => {
                    const isLong = sig.side === 'long';
                    return (
                      <div key={sig.symbol} className="desk-well rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-desk-up shrink-0" />
                            <span className="font-mono text-sm font-medium text-desk-text">{sig.symbol}</span>
                            <span className="text-[11px] font-mono text-desk-muted">· Daily</span>
                            <span className={isLong ? 'desk-tag-up' : 'desk-tag-down'}>
                              {isLong ? 'Long' : 'Short'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setChartItem({
                                symbol: sig.symbol,
                                strategy: 'grail',
                                interval: 'D',
                                signalLabel: `YouHaveChosenWisely · ${isLong ? 'Long' : 'Short'}`,
                                direction: isLong ? 'long' : 'short',
                                entryPrice: sig.entry_zone ?? sig.ema20,
                                targetPrice: sig.target,
                                stopPrice: sig.stop_loss,
                              })
                            }
                            className="h-7 px-2 rounded-md bg-desk-raised hover:bg-[#2b2b2e] border border-hairline text-xs text-desk-secondary hover:text-desk-text inline-flex items-center gap-1.5 transition-colors duration-150 ease-desk shrink-0"
                            title="Open chart"
                          >
                            <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                            <span>1D</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-hairline text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-desk-muted">Entry</span>
                            <span className="text-desk-text">${formatSignalPrice(sig.entry_zone)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-desk-muted">Stop</span>
                            <span className="text-desk-down">${formatSignalPrice(sig.stop_loss)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-hairline flex justify-end">
              <Link
                to="/grail"
                className="inline-flex items-center gap-1 text-xs text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk"
              >
                <span>Pullback watchlist</span>
                <ArrowRightIcon className="w-3.5 h-3.5 text-desk-muted" />
              </Link>
            </div>
          </div>

          {/* 4. TooHot TooCold */}
          <div className="desk-surface rounded-2xl flex flex-col justify-between overflow-hidden">
            <div>
              <div className="px-4 py-3.5 border-b border-hairline flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-desk-text">TooHot TooCold</div>
                  <div className="text-xs text-desk-muted">Range compression breakout</div>
                </div>
                <Link to="/odid" className="desk-btn-secondary h-7 px-2.5 text-xs shrink-0">
                  Monitor
                </Link>
              </div>

              <div className="p-4 space-y-2">
                {odidTriggered.length === 0 ? (
                  <p className="text-xs text-desk-muted py-6 text-center">
                    No close-confirmed range breakouts today
                  </p>
                ) : (
                  odidTriggered.slice(0, 3).map((t, i) => {
                    const isLong = t.side.toLowerCase() === 'long';
                    return (
                      <div key={`${t.symbol}-${i}`} className="desk-well rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-desk-up shrink-0" />
                            <span className="font-mono text-sm font-medium text-desk-text">{t.symbol}</span>
                            <span className="text-[11px] font-mono text-desk-muted">· Daily</span>
                            <span className={isLong ? 'desk-tag-up' : 'desk-tag-down'}>
                              {isLong ? 'Long' : 'Short'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setChartItem({
                                symbol: t.symbol,
                                strategy: 'odid',
                                interval: 'D',
                                signalLabel: `TooHot TooCold · ${isLong ? 'Long' : 'Short'}`,
                                direction: isLong ? 'long' : 'short',
                                entryPrice: t.entry_stop,
                                stopPrice: t.stop_loss,
                              })
                            }
                            className="h-7 px-2 rounded-md bg-desk-raised hover:bg-[#2b2b2e] border border-hairline text-xs text-desk-secondary hover:text-desk-text inline-flex items-center gap-1.5 transition-colors duration-150 ease-desk shrink-0"
                            title="Open chart"
                          >
                            <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                            <span>1D</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-hairline text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-desk-muted">Entry</span>
                            <span className="text-desk-text">${formatSignalPrice(t.entry_stop)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-desk-muted">Stop</span>
                            <span className="text-desk-down">${formatSignalPrice(t.stop_loss)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-hairline flex justify-end">
              <Link
                to="/odid"
                className="inline-flex items-center gap-1 text-xs text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk"
              >
                <span>Armed levels</span>
                <ArrowRightIcon className="w-3.5 h-3.5 text-desk-muted" />
              </Link>
            </div>
          </div>

          {/* 5. The Linda */}
          <div className="desk-surface rounded-2xl flex flex-col justify-between overflow-hidden">
            <div>
              <div className="px-4 py-3.5 border-b border-hairline flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-desk-text">The Linda</div>
                  <div className="text-xs text-desk-muted">Next-day 15m EMA reversion</div>
                </div>
                <Link to="/linda" className="desk-btn-secondary h-7 px-2.5 text-xs shrink-0">
                  Signals
                </Link>
              </div>

              <div className="p-4 space-y-2">
                {lindaTriggered.length === 0 ? (
                  <p className="text-xs text-desk-muted py-6 text-center">
                    No untagged-EMA trend days triggered today
                  </p>
                ) : (
                  lindaTriggered.slice(0, 3).map((sig) => {
                    const isFadeUp = sig.direction === 'FADE_UP';
                    return (
                      <div key={sig.symbol} className="desk-well rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-desk-up shrink-0" />
                            <span className="font-mono text-sm font-medium text-desk-text">{sig.symbol}</span>
                            <span className="text-[11px] font-mono text-desk-muted">· 15m</span>
                            <span className={isFadeUp ? 'desk-tag-down' : 'desk-tag-up'}>
                              {isFadeUp ? 'Fade up' : 'Fade down'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setChartItem({
                                symbol: sig.symbol,
                                strategy: 'linda',
                                interval: '15',
                                signalLabel: isFadeUp ? 'Fade up · Short' : 'Fade down · Long',
                                direction: isFadeUp ? 'fade_up' : 'fade_down',
                                entryPrice: sig.close,
                                targetPrice: sig.target,
                                stopPrice: sig.stop,
                              })
                            }
                            className="h-7 px-2 rounded-md bg-desk-raised hover:bg-[#2b2b2e] border border-hairline text-xs text-desk-secondary hover:text-desk-text inline-flex items-center gap-1.5 transition-colors duration-150 ease-desk shrink-0"
                            title="Open chart"
                          >
                            <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                            <span>15m</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-hairline text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-desk-muted">Target</span>
                            <span className={isFadeUp ? 'text-desk-down' : 'text-desk-up'}>
                              ${sig.target?.toFixed(2) ?? '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-desk-muted">Stop</span>
                            <span className="text-desk-secondary">${sig.stop?.toFixed(2) ?? '—'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-hairline flex justify-end">
              <Link
                to="/linda"
                className="inline-flex items-center gap-1 text-xs text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk"
              >
                <span>Reversion setups</span>
                <ArrowRightIcon className="w-3.5 h-3.5 text-desk-muted" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── SYSTEMATIC TRADING PERFORMANCE & EXECUTION LEDGER ──────────────── */}
      <section className="desk-surface rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-hairline pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-desk-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              <span>Systematic execution log</span>
            </div>
            <h2 className="mt-1.5 text-2xl font-medium text-desk-text tracking-tight">
              Trading performance
            </h2>
            <p className="mt-1 text-sm text-desk-secondary">
              Executed futures strategy signals with contract multipliers, active stops, targets, and round-turn friction
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/executed-trades?status=CLOSED"
              className="desk-well rounded-xl px-4 py-2.5 text-right hover:border-hairline-strong transition-colors duration-150 ease-desk"
            >
              <div className="text-xs text-desk-muted">Closed P&L (inception)</div>
              <div
                className={`mt-0.5 text-sm font-medium font-mono ${
                  (inceptionMetrics?.realizedPnl ?? 0) >= 0 ? 'text-desk-up' : 'text-desk-down'
                }`}
              >
                {(inceptionMetrics?.realizedPnl ?? 0) >= 0 ? '+' : ''}
                {fmt$(inceptionMetrics?.realizedPnl ?? 0)}{' '}
                <span className="text-xs text-desk-muted font-normal">
                  ({inceptionMetrics?.closedCount ?? 0})
                </span>
              </div>
            </Link>

            <Link
              to="/executed-trades?status=OPEN"
              className="desk-well rounded-xl px-4 py-2.5 text-right hover:border-hairline-strong transition-colors duration-150 ease-desk"
            >
              <div className="text-xs text-desk-muted">Open P&L (active)</div>
              <div
                className={`mt-0.5 text-sm font-medium font-mono ${
                  (inceptionMetrics?.unrealizedPnl ?? 0) >= 0 ? 'text-desk-up' : 'text-desk-down'
                }`}
              >
                {(inceptionMetrics?.unrealizedPnl ?? 0) >= 0 ? '+' : ''}
                {fmt$(inceptionMetrics?.unrealizedPnl ?? 0)}{' '}
                <span className="text-xs text-desk-muted font-normal">
                  ({inceptionMetrics?.openCount ?? 0})
                </span>
              </div>
            </Link>

            <Link to="/executed-trades" className="desk-btn-primary h-10 px-4 text-xs">
              <span>Full ledger</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ── STRATEGY & TIMEFRAME CONTROLS ── */}
        <div className="flex items-center justify-between gap-4 border-b border-hairline pb-4 overflow-x-auto no-scrollbar whitespace-nowrap flex-nowrap">
          <div className="flex items-center gap-1 shrink-0 flex-nowrap">
            {[
              { id: 'ALL', label: 'All models' },
              { id: 'Trendorama', label: 'Trendorama' },
              { id: 'The Bradman', label: 'The Bradman' },
              { id: 'YouHaveChosenWisely', label: 'YouHaveChosenWisely' },
              { id: 'TooHot TooCold', label: 'TooHot TooCold' },
              { id: 'The Linda', label: 'The Linda' },
            ].map((strat) => {
              const isSelected = selectedPerfStrategy === strat.id;
              return (
                <button
                  key={strat.id}
                  type="button"
                  onClick={() => setSelectedPerfStrategy(strat.id)}
                  className={`h-8 px-3 rounded-lg text-xs inline-flex items-center transition-colors duration-150 ease-desk shrink-0 ${
                    isSelected
                      ? 'bg-desk-raised text-desk-text font-medium shadow-inset-top border border-hairline'
                      : 'text-desk-secondary hover:text-desk-text hover:bg-desk-raised/50'
                  }`}
                >
                  {strat.label}
                </button>
              );
            })}
          </div>

          <div className="desk-well p-1 rounded-lg flex items-center gap-1 shrink-0 flex-nowrap">
            {[
              { id: 'QTD' as const, label: `QTD (Q${Math.floor(new Date().getMonth() / 3) + 1})` },
              { id: 'YTD' as const, label: `YTD (${new Date().getFullYear()})` },
              { id: 'INCEPTION' as const, label: 'Inception' },
            ].map((tf) => {
              const isSelected = selectedPerfTimeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setSelectedPerfTimeframe(tf.id)}
                  className={`h-7 px-3 rounded-md text-xs transition-colors duration-150 ease-desk shrink-0 ${
                    isSelected
                      ? 'bg-desk-raised text-desk-text font-medium border border-hairline'
                      : 'text-desk-muted hover:text-desk-text'
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Metrics (6 clean figure cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link
            to="/executed-trades?status=CLOSED"
            className="desk-well rounded-xl p-4 hover:border-hairline-strong transition-colors duration-150 ease-desk block"
          >
            <div className="text-xs text-desk-muted">
              Closed P&L ({selectedPerfTimeframe === 'INCEPTION' ? 'inception' : selectedPerfTimeframe})
            </div>
            <div
              className={`mt-2 text-2xl leading-none font-medium font-mono ${
                (activeMetrics?.realizedPnl ?? 0) >= 0 ? 'text-desk-up' : 'text-desk-down'
              }`}
            >
              {(activeMetrics?.realizedPnl ?? 0) >= 0 ? '+' : ''}
              {fmt$(activeMetrics?.realizedPnl ?? 0)}
            </div>
            <div className="mt-2 text-xs text-desk-muted font-mono">
              {activeMetrics?.closedCount ?? 0} closed · net
            </div>
          </Link>

          <Link
            to="/executed-trades?status=OPEN"
            className="desk-well rounded-xl p-4 hover:border-hairline-strong transition-colors duration-150 ease-desk block"
          >
            <div className="text-xs text-desk-muted">Open P&L (active)</div>
            <div
              className={`mt-2 text-2xl leading-none font-medium font-mono ${
                (activeMetrics?.unrealizedPnl ?? 0) >= 0 ? 'text-desk-up' : 'text-desk-down'
              }`}
            >
              {(activeMetrics?.unrealizedPnl ?? 0) >= 0 ? '+' : ''}
              {fmt$(activeMetrics?.unrealizedPnl ?? 0)}
            </div>
            <div className="mt-2 text-xs text-desk-muted font-mono">
              {activeMetrics?.openCount ?? 0} open positions
            </div>
          </Link>

          <Link
            to="/executed-trades"
            className="desk-well rounded-xl p-4 hover:border-hairline-strong transition-colors duration-150 ease-desk block"
          >
            <div className="text-xs text-desk-muted">Total net P&L</div>
            <div
              className={`mt-2 text-2xl leading-none font-medium font-mono ${
                (activeMetrics?.netPnl ?? 0) >= 0 ? 'text-desk-up' : 'text-desk-down'
              }`}
            >
              {(activeMetrics?.netPnl ?? 0) >= 0 ? '+' : ''}
              {fmt$(activeMetrics?.netPnl ?? 0)}
            </div>
            <div className="mt-2 text-xs text-desk-muted font-mono">
              {fmtSignedPct(activeMetrics?.returnPct)} vs $100k
            </div>
          </Link>

          <Link
            to="/executed-trades"
            className="desk-well rounded-xl p-4 hover:border-hairline-strong transition-colors duration-150 ease-desk block"
          >
            <div className="text-xs text-desk-muted">Commissions & slippage</div>
            <div className="mt-2 text-2xl leading-none font-medium font-mono text-desk-secondary">
              -{fmt$(activeMetrics?.totalCosts ?? 0)}
            </div>
            <div className="mt-2 text-xs text-desk-muted font-mono">
              {fmt$(activeMetrics?.totalCommissions ?? 0)} comm · {fmt$(activeMetrics?.totalSlippage ?? 0)} slip
            </div>
          </Link>

          <Link
            to="/executed-trades?status=CLOSED"
            className="desk-well rounded-xl p-4 hover:border-hairline-strong transition-colors duration-150 ease-desk block"
          >
            <div className="text-xs text-desk-muted">Win rate (net)</div>
            <div className="mt-2 text-2xl leading-none font-medium font-mono text-desk-text">
              {(activeMetrics?.winRate ?? 0).toFixed(1)}%
            </div>
            <div className="mt-2 text-xs text-desk-muted font-mono">
              {activeMetrics?.wins ?? 0}W / {activeMetrics?.losses ?? 0}L ({activeMetrics?.totalTrades ?? 0})
            </div>
          </Link>

          <Link
            to="/executed-trades?status=CLOSED"
            className="desk-well rounded-xl p-4 hover:border-hairline-strong transition-colors duration-150 ease-desk block"
          >
            <div className="text-xs text-desk-muted">Profit factor</div>
            <div className="mt-2 text-2xl leading-none font-medium font-mono text-desk-text">
              {(activeMetrics?.profitFactor ?? 0) > 50 ? '> 50' : (activeMetrics?.profitFactor ?? 0).toFixed(2)}
            </div>
            <div className="mt-2 text-xs text-desk-muted font-mono">
              Avg win {fmt$(activeMetrics?.avgWin ?? 0)}
            </div>
          </Link>
        </div>

        {/* ── LARGEST GAINS & DRAWDOWNS (COLLAPSIBLE) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="desk-well rounded-xl p-4">
            <button
              type="button"
              onClick={() => setWinnersOpen((o) => !o)}
              aria-expanded={winnersOpen}
              className={`flex w-full items-center justify-between text-left ${
                winnersOpen ? 'border-b border-hairline pb-3 mb-3' : ''
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-desk-text">
                <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
                <span>
                  Largest gains {selectedPerfStrategy !== 'ALL' ? `(${selectedPerfStrategy})` : ''}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs font-mono text-desk-muted">
                <span>{biggestWinners.length} trades</span>
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform duration-150 ease-desk ${
                    winnersOpen ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </button>

            {winnersOpen &&
              (biggestWinners.length === 0 ? (
                <p className="text-xs text-desk-muted py-2">No winning trades recorded for this filter</p>
              ) : (
                <div className="space-y-2">
                  {biggestWinners.map((t) => {
                    const pnl = t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg bg-desk-card border border-hairline px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-desk-text text-sm">{t.symbol}</span>
                            <span className={t.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                              {t.side === 'long' ? 'Long' : 'Short'}
                            </span>
                            <span className="text-xs text-desk-secondary truncate">{t.strategy}</span>
                          </div>
                          <div className="mt-1 text-[11px] font-mono text-desk-muted">
                            Opened {t.entry_date?.slice(0, 10)} ·{' '}
                            {t.status === 'OPEN' ? 'Open' : `Closed ${t.exit_date?.slice(0, 10) || ''}`}
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0 pl-3">
                          <div className="font-medium text-desk-up text-sm">+{fmt$(pnl)}</div>
                          <div className="text-[11px] text-desk-muted">{fmtSignedPct(t.return_pct)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>

          <div className="desk-well rounded-xl p-4">
            <button
              type="button"
              onClick={() => setLosersOpen((o) => !o)}
              aria-expanded={losersOpen}
              className={`flex w-full items-center justify-between text-left ${
                losersOpen ? 'border-b border-hairline pb-3 mb-3' : ''
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-desk-text">
                <span className="h-1.5 w-1.5 rounded-full bg-desk-down" />
                <span>
                  Largest drawdowns {selectedPerfStrategy !== 'ALL' ? `(${selectedPerfStrategy})` : ''}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs font-mono text-desk-muted">
                <span>{biggestLosers.length} trades</span>
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform duration-150 ease-desk ${
                    losersOpen ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </button>

            {losersOpen &&
              (biggestLosers.length === 0 ? (
                <p className="text-xs text-desk-muted py-2">No losing trades recorded for this filter</p>
              ) : (
                <div className="space-y-2">
                  {biggestLosers.map((t) => {
                    const pnl = t.status === 'OPEN' ? t.unrealized_pnl : t.realized_pnl;
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg bg-desk-card border border-hairline px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-desk-text text-sm">{t.symbol}</span>
                            <span className={t.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                              {t.side === 'long' ? 'Long' : 'Short'}
                            </span>
                            <span className="text-xs text-desk-secondary truncate">{t.strategy}</span>
                          </div>
                          <div className="mt-1 text-[11px] font-mono text-desk-muted">
                            Opened {t.entry_date?.slice(0, 10)} ·{' '}
                            {t.status === 'OPEN' ? 'Open' : `Closed ${t.exit_date?.slice(0, 10) || ''}`}
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0 pl-3">
                          <div className="font-medium text-desk-down text-sm">{fmt$(pnl)}</div>
                          <div className="text-[11px] text-desk-muted">{t.return_pct.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>

        {/* Recent Executed Signals Table */}
        <div className="desk-well rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-hairline flex items-center justify-between">
            <span className="text-sm font-medium text-desk-text">
              Recent executions {selectedPerfStrategy !== 'ALL' ? `· ${selectedPerfStrategy}` : ''}
            </span>
            <Link
              to="/executed-trades"
              className="inline-flex items-center gap-1 text-xs text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk"
            >
              <span>All {activeMetrics?.totalTrades ?? 0} trades</span>
              <ArrowRightIcon className="w-3.5 h-3.5 text-desk-muted" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-hairline text-desk-muted">
                <tr>
                  <th className="px-4 py-3 font-normal">Date</th>
                  <th className="px-4 py-3 font-normal">Contract</th>
                  <th className="px-4 py-3 font-normal">Strategy</th>
                  <th className="px-4 py-3 font-normal">Side</th>
                  <th className="px-4 py-3 text-right font-normal">Entry</th>
                  <th className="px-4 py-3 text-right font-normal">Mark / exit</th>
                  <th className="px-4 py-3 text-right font-normal">Stop</th>
                  <th className="px-4 py-3 text-right font-normal">Target</th>
                  <th className="px-4 py-3 text-right font-normal">Net P&L</th>
                  <th className="px-4 py-3 text-right font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {!perfTrades || perfTrades.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-desk-muted">
                      No executed trades recorded for this selection
                    </td>
                  </tr>
                ) : (
                  perfTrades.slice(0, Math.max(10, (activeMetrics?.openCount ?? 0) + 4)).map((t) => {
                    const isOpen = t.status === 'OPEN';
                    const displayPnl = isOpen ? t.unrealized_pnl : t.realized_pnl;
                    const tradeCost = t.fees_and_slippage ?? ((t.commission || 0) + (t.slippage || 0));
                    const statusInfo = STATUS_LABELS[t.status] || {
                      label: t.status,
                      dot: 'bg-desk-muted',
                      text: 'text-desk-secondary',
                    };

                    return (
                      <tr
                        key={t.id}
                        className={`transition-colors duration-150 ease-desk hover:bg-desk-raised/40 ${
                          isOpen ? 'bg-desk-card/70' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-desk-secondary">
                          <div>{t.entry_date}</div>
                          {isOpen && <div className="text-[11px] text-desk-up">Active</div>}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-desk-text">{t.symbol}</td>
                        <td className="px-4 py-3 text-desk-secondary">{t.strategy}</td>
                        <td className="px-4 py-3">
                          <span className={t.side === 'long' ? 'desk-tag-up' : 'desk-tag-down'}>
                            {t.side === 'long' ? 'Long' : 'Short'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-desk-secondary">
                          {formatSignalPrice(t.entry_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-desk-text">
                          {formatSignalPrice(isOpen ? t.current_price : t.exit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-desk-down">
                          {formatSignalPrice(t.stop_loss)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-desk-up">
                          {formatSignalPrice(t.profit_target)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <div className={`font-medium ${displayPnl >= 0 ? 'text-desk-up' : 'text-desk-down'}`}>
                            {displayPnl >= 0 ? '+' : ''}
                            {fmt$(displayPnl)}
                          </div>
                          {tradeCost > 0 && (
                            <div
                              className="text-[11px] text-desk-muted"
                              title={`Gross: ${fmt$(t.gross_pnl ?? displayPnl)} | Comm: -$${(t.commission || 0).toFixed(2)} | Slip: -$${(t.slippage || 0).toFixed(2)}`}
                            >
                              incl. -{fmt$(tradeCost)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center justify-end gap-1.5 text-xs ${statusInfo.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.label}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Interactive Chart Modal */}
      {chartItem && (
        <SignalChartModal
          isOpen={!!chartItem}
          onClose={closeChart}
          symbol={chartItem.symbol}
          strategy={chartItem.strategy}
          interval={chartItem.interval ?? 'D'}
          signalLabel={chartItem.signalLabel}
          direction={chartItem.direction}
          entryPrice={chartItem.entryPrice}
          targetPrice={chartItem.targetPrice}
          stopPrice={chartItem.stopPrice}
        />
      )}
    </div>
  );
}
