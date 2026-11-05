import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchJson } from '../lib/http';
import type { TaylorSignalsPayload, TaylorSignalItem } from '../types/taylor';
import SignalChartModal from '../components/SignalChartModal';
import { AlertCircleIcon, ChartLineIcon } from '../components/Icons';

const SYMBOL_NAMES: Record<string, string> = {
  ES: 'E-mini S&P 500',
  NQ: 'E-mini Nasdaq 100',
  RTY: 'E-mini Russell 2000',
  YM: 'E-mini Dow Jones',
  GC: 'Gold Futures',
  SI: 'Silver Futures',
  CL: 'Crude Oil Futures',
  NG: 'Natural Gas Futures',
  '6E': 'Euro FX Futures (EC)',
  '6J': 'Japanese Yen Futures',
  '6B': 'British Pound Futures',
  DX: 'US Dollar Index ($)',
  ZB: '30-Year T-Bond Futures',
  ZN: '10-Year T-Note Futures',
};

function formatPrice(val: number) {
  if (val === null || val === undefined || Number.isNaN(val)) return '—';
  if (Math.abs(val) >= 1000) {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (Math.abs(val) < 2) return val.toFixed(4);
  return val.toFixed(2);
}

function sessionLabel(session?: string | null) {
  if (session === 'ASIA') return 'Asia session';
  if (session === 'LONDON') return 'London session';
  if (session === 'US') return 'US session';
  return 'Daily RTH';
}

function cyclePhaseLabel(phase: string) {
  if (phase === 'BUY_DAY') return 'Buy day';
  if (phase === 'SELL_DAY') return 'Sell day';
  if (phase === 'SELL_SHORT_DAY') return 'Sell short day';
  return phase.replaceAll('_', ' ');
}

function actionLabel(action: string) {
  if (action === 'BUY_LONG') return 'Buy long';
  if (action === 'SELL_SHORT') return 'Sell short';
  if (action === 'SELL_EXIT') return 'Sell exit';
  return 'Watch';
}

export default function TaylorTrade() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TaylorSignalsPayload | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'HOURLY_DIV' | 'BUY_DAY' | 'SELL_DAY' | 'SELL_SHORT_DAY'>('ALL');
  const [chartState, setChartState] = useState<{ item: TaylorSignalItem; interval: '60' | 'D' } | null>(null);

  const openChart = useCallback((item: TaylorSignalItem, interval: '60' | 'D') => {
    setChartState({ item, interval });
  }, []);
  const closeChart = useCallback(() => setChartState(null), []);

  useEffect(() => {
    async function loadData() {
      try {
        const payload = await fetchJson<TaylorSignalsPayload>('/data/taylor_signals_latest.json', { cache: 'no-store' });
        setData(payload);
      } catch (err) {
        console.error('Failed loading Taylor signals:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredSignals = useMemo(() => {
    if (!data?.signals) return [];
    if (filter === 'ALL') return data.signals;
    if (filter === 'HOURLY_DIV') return data.signals.filter((s) => !!s.hourly_divergence);
    return data.signals.filter((s) => s.cycle_phase === filter);
  }, [data, filter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="h-6 w-6 rounded-full border-2 border-desk-raised border-t-desk-text animate-spin" />
        <p className="text-sm text-desk-muted">Loading The Bradman signals…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-2 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-desk-down">
          <AlertCircleIcon className="w-4 h-4" />
          <span>Signal data unavailable</span>
        </div>
        <p className="text-sm text-desk-muted">The Bradman signal feed could not be loaded.</p>
      </div>
    );
  }

  const summary = data?.summary || { buy_day_count: 0, sell_day_count: 0, sell_short_day_count: 0 };
  const hourlyDivCount = summary.hourly_div_count ?? data.signals.filter((s) => !!s.hourly_divergence).length;
  const overnightDivCount =
    summary.overnight_div_count ??
    data.signals.filter((s) => s.entry_session === 'ASIA' || s.entry_session === 'LONDON').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="desk-surface rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono text-desk-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              <span>24h Globex + 3-day swing cycle</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-desk-text">
              The Bradman
            </h1>
            <p className="text-sm leading-relaxed text-desk-secondary">
              Combines George Douglass Taylor’s 3-day swing cycle with 24-hour Globex (Asia, London, and US) 60-minute LBR 3/10 oscillator divergences and Keltner Channel (20 EMA ± 2.5 ATR) exhaustion triggers, including Euro FX (<span className="font-mono text-desk-text">6E</span>) / US Dollar (<span className="font-mono text-desk-text">DX</span>) inverse swing confirmation.
            </p>
          </div>

          <div className="shrink-0 md:text-right">
            <div className="text-xs text-desk-muted">Signal session</div>
            <div className="mt-1 text-xl font-medium font-mono text-desk-text">{data.date}</div>
          </div>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Contracts scanned</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {data?.total_scanned ?? 0}
            </div>
            <div className="mt-2 text-xs text-desk-muted">Globex + ICE futures</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">1h 3/10 divergences</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {hourlyDivCount}
            </div>
            <div className="mt-2 text-xs text-desk-muted">{overnightDivCount} in Asia or London</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Buy days (Day 1)</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-up">
              {summary.buy_day_count}
            </div>
            <div className="mt-2 text-xs text-desk-muted">Support / buy div</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Sell days (Day 2)</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-text">
              {summary.sell_day_count}
            </div>
            <div className="mt-2 text-xs text-desk-muted">Mid-cycle rotation</div>
          </div>
          <div className="desk-well rounded-xl p-4">
            <div className="text-xs text-desk-muted">Sell short days (Day 3)</div>
            <div className="mt-2 text-[28px] leading-none font-medium font-mono text-desk-down">
              {summary.sell_short_day_count}
            </div>
            <div className="mt-2 text-xs text-desk-muted">Resistance / sell div</div>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-hairline pb-3">
        {(
          [
            { id: 'ALL', label: 'All contracts' },
            { id: 'HOURLY_DIV', label: `1h divergences (${hourlyDivCount})` },
            { id: 'BUY_DAY', label: 'Buy day' },
            { id: 'SELL_DAY', label: 'Sell day' },
            { id: 'SELL_SHORT_DAY', label: 'Sell short day' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`h-8 px-3.5 rounded-lg text-xs transition-colors duration-150 ease-desk ${
              filter === tab.id
                ? 'bg-desk-raised text-desk-text font-medium shadow-inset-top border border-hairline'
                : 'text-desk-secondary hover:text-desk-text hover:bg-desk-card'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Signals Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSignals.map((item) => {
          const fullName = SYMBOL_NAMES[item.symbol] || item.symbol;
          const isBuy = item.cycle_phase === 'BUY_DAY';
          const isShortDay = item.cycle_phase === 'SELL_SHORT_DAY';
          const isLongAction = item.action === 'BUY_LONG';
          const isShortAction = item.action === 'SELL_SHORT';

          return (
            <div
              key={item.symbol}
              className="desk-surface rounded-2xl p-5 flex flex-col justify-between hover:border-hairline-strong transition-colors duration-150 ease-desk"
            >
              <div className="space-y-4">
                {/* Symbol Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isLongAction || isShortAction ? 'bg-desk-up' : 'bg-desk-muted'
                        }`}
                      />
                      <span className="font-mono text-xl font-medium text-desk-text">{item.symbol}</span>
                      <span className="text-xs text-desk-muted">{fullName}</span>
                    </div>
                    <div className="mt-1 text-xs font-mono text-desk-secondary">
                      Last close <span className="text-desk-text font-medium">{formatPrice(item.close)}</span>
                    </div>
                  </div>

                  <span className={isBuy ? 'desk-tag-up' : isShortDay ? 'desk-tag-down' : 'desk-tag'}>
                    Day {item.cycle_day} · {cyclePhaseLabel(item.cycle_phase)}
                  </span>
                </div>

                {/* Overnight / 1H Divergence & Session Stamps */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="desk-tag font-mono text-[11px]">{sessionLabel(item.entry_session)}</span>
                  {item.hourly_divergence && (
                    <span
                      className={
                        item.hourly_divergence === 'BUY_DIV'
                          ? 'desk-tag-up font-mono text-[11px]'
                          : 'desk-tag-down font-mono text-[11px]'
                      }
                    >
                      1h 3/10 {item.hourly_divergence === 'BUY_DIV' ? 'buy div' : 'sell div'}
                      {item.divergence_time_et ? ` · ${item.divergence_time_et}` : ''}
                    </span>
                  )}
                  {item.keltner_pierce && (
                    <span className="desk-tag font-mono text-[11px]">Keltner ±2.5</span>
                  )}
                  {item.fx_pair_confirmed && (
                    <span className="desk-tag-up font-mono text-[11px]">EC / $ inverse confirmed</span>
                  )}
                </div>

                {/* Key Objectives Table */}
                <div className="desk-well rounded-xl p-3.5 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-desk-muted">Buying objective</div>
                    <div className="font-mono font-medium text-desk-up text-sm mt-0.5">
                      ${formatPrice(item.buying_objective)}
                    </div>
                  </div>
                  <div>
                    <div className="text-desk-muted">Selling objective</div>
                    <div className="font-mono font-medium text-desk-down text-sm mt-0.5">
                      ${formatPrice(item.selling_objective)}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-hairline">
                    <div className="text-desk-muted">Buying pressure</div>
                    <div className="font-mono text-desk-secondary mt-0.5">{formatPrice(item.buying_pressure)}</div>
                  </div>
                  <div className="pt-2 border-t border-hairline">
                    <div className="text-desk-muted">Selling pressure</div>
                    <div className="font-mono text-desk-secondary mt-0.5">{formatPrice(item.selling_pressure)}</div>
                  </div>
                </div>

                {/* Recommended Trade Action */}
                <div className="desk-well rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-desk-muted">Recommended action</span>
                    <span
                      className={
                        isLongAction ? 'desk-tag-up' : isShortAction ? 'desk-tag-down' : 'desk-tag'
                      }
                    >
                      {actionLabel(item.action)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-hairline text-xs font-mono">
                    <div>
                      <span className="text-desk-muted block text-[11px] font-sans">Entry</span>
                      <span className="text-desk-text font-medium">${formatPrice(item.entry_target)}</span>
                    </div>
                    <div>
                      <span className="text-desk-muted block text-[11px] font-sans">Target</span>
                      <span className="text-desk-up font-medium">${formatPrice(item.profit_target)}</span>
                    </div>
                    <div>
                      <span className="text-desk-muted block text-[11px] font-sans">Stop</span>
                      <span className="text-desk-down font-medium">${formatPrice(item.stop_loss)}</span>
                    </div>
                  </div>
                </div>

                {item.notes && <p className="text-xs text-desk-secondary leading-relaxed">{item.notes}</p>}
              </div>

              {/* View Chart Buttons */}
              <div className="mt-4 pt-3 border-t border-hairline grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openChart(item, '60')}
                  className={
                    item.hourly_divergence
                      ? 'desk-btn-primary h-8 px-3 text-xs'
                      : 'desk-btn-secondary h-8 px-3 text-xs'
                  }
                >
                  <ChartLineIcon className="w-3.5 h-3.5" />
                  <span>60m Globex</span>
                </button>
                <button
                  type="button"
                  onClick={() => openChart(item, 'D')}
                  className="desk-btn-secondary h-8 px-3 text-xs"
                >
                  <ChartLineIcon className="w-3.5 h-3.5 text-desk-muted" />
                  <span>Daily chart</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Modal */}
      {chartState && (
        <SignalChartModal
          isOpen={!!chartState}
          onClose={closeChart}
          symbol={chartState.item.symbol}
          strategy="taylor"
          interval={chartState.interval}
          signalLabel={`The Bradman (${chartState.interval === '60' ? '60m Globex' : 'Daily'}) · ${cyclePhaseLabel(chartState.item.cycle_phase)}`}
          direction={
            chartState.item.action === 'BUY_LONG'
              ? 'long'
              : chartState.item.action === 'SELL_SHORT'
                ? 'short'
                : null
          }
          entryPrice={chartState.item.entry_target}
          targetPrice={chartState.item.profit_target}
          stopPrice={chartState.item.stop_loss}
          extraRows={[
            { label: 'Cycle day', value: `Day ${chartState.item.cycle_day}` },
            {
              label: 'Session',
              value: sessionLabel(chartState.item.entry_session),
              highlight: chartState.item.entry_session === 'ASIA' || chartState.item.entry_session === 'LONDON',
            },
            ...(chartState.item.hourly_divergence
              ? [
                  {
                    label: '1h 3/10 div',
                    value: `${chartState.item.hourly_divergence === 'BUY_DIV' ? 'Buy div' : 'Sell div'}${
                      chartState.item.divergence_time_et ? ` (${chartState.item.divergence_time_et})` : ''
                    }`,
                    highlight: true,
                  },
                ]
              : []),
            { label: 'Buy objective', value: `$${formatPrice(chartState.item.buying_objective)}` },
            { label: 'Sell objective', value: `$${formatPrice(chartState.item.selling_objective)}` },
          ]}
        />
      )}
    </div>
  );
}
