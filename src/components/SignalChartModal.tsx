import { useEffect, useRef } from 'react';
import {
  TV_SYMBOLS,
  CME_FUTURES_SYMBOLS,
  LBR_STUDIES,
  LBR_STUDIES_OVERRIDES,
  STRATEGY_INTERVALS,
} from '../lib/tradingview';
import { ArrowUpRightIcon, XIcon } from './Icons';

export interface SignalChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  strategy: string;
  interval?: string;
  signalLabel?: string;
  direction?: 'long' | 'short' | 'fade_up' | 'fade_down' | null;
  entryPrice?: number | null;
  stopPrice?: number | null;
  targetPrice?: number | null;
  signalDate?: string | null;
  extraRows?: { label: string; value: string; highlight?: boolean }[];
}

declare global {
  interface Window {
    TradingView: any;
  }
}

function PriceStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number | null | undefined;
  tone?: 'neutral' | 'up' | 'down';
}) {
  if (value == null) return null;
  const formatted =
    Math.abs(value) >= 1000
      ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.abs(value) < 2
        ? value.toFixed(4)
        : value.toFixed(2);
  const valueClass =
    tone === 'up' ? 'text-desk-up' : tone === 'down' ? 'text-desk-down' : 'text-desk-text';

  return (
    <div className="desk-well rounded-lg px-3.5 py-2 min-w-[104px]">
      <div className="text-xs text-desk-muted">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-medium ${valueClass}`}>${formatted}</div>
    </div>
  );
}

export default function SignalChartModal({
  isOpen,
  onClose,
  symbol,
  strategy,
  interval,
  signalLabel,
  direction,
  entryPrice,
  stopPrice,
  targetPrice,
  signalDate,
  extraRows = [],
}: SignalChartModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const chartId = useRef(`tv_${symbol}_${strategy}_${Math.random().toString(36).slice(2)}`);

  const tvSymbol = TV_SYMBOLS[symbol] ?? 'SPY';
  const cmeSymbol = CME_FUTURES_SYMBOLS[symbol] ?? symbol;

  const effectiveInterval =
    interval ||
    STRATEGY_INTERVALS[strategy?.toLowerCase()?.replaceAll(/\s+/g, '_')] ||
    STRATEGY_INTERVALS[strategy?.toLowerCase()] ||
    'D';

  const isBullish = direction === 'long' || direction === 'fade_down';
  const dirColor = isBullish ? 'text-desk-up' : direction ? 'text-desk-down' : 'text-desk-secondary';

  useEffect(() => {
    if (!isOpen) return;

    const loadWidget = () => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = `<div id="${chartId.current}" style="height:100%;width:100%;"></div>`;

      widgetRef.current = new window.TradingView.widget({
        container_id: chartId.current,
        width: '100%',
        height: '100%',
        symbol: tvSymbol,
        interval: effectiveInterval,
        timezone: 'America/New_York',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#141415',
        enable_publishing: false,
        hide_side_toolbar: false,
        hide_top_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        studies: LBR_STUDIES,
        studies_overrides: LBR_STUDIES_OVERRIDES,
        overrides: {
          'paneProperties.background': '#141415',
          'paneProperties.vertGridProperties.color': '#232325',
          'paneProperties.horzGridProperties.color': '#232325',
          'symbolWatermarkProperties.transparency': 92,
          'scalesProperties.textColor': '#85858b',
        },
        loading_screen: { backgroundColor: '#141415', foregroundColor: '#ededed' },
      });
    };

    if (window.TradingView) {
      loadWidget();
    } else {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = loadWidget;
      document.head.appendChild(script);
    }

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [isOpen, tvSymbol, effectiveInterval]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  const intervalLabel =
    effectiveInterval === '15'
      ? '15m pit session'
      : effectiveInterval === '1'
        ? '1m'
        : effectiveInterval === '30'
          ? '30m'
          : effectiveInterval === '60' || effectiveInterval === '1H'
            ? '60m Globex'
            : 'Daily (1D)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/75" />

      <div className="relative z-10 w-full max-w-[1440px] h-[90vh] bg-desk-card rounded-2xl border border-hairline-strong overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-hairline bg-desk-deep shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xl font-medium text-desk-text">{symbol}</span>
            {signalLabel && (
              <span className={isBullish ? 'desk-tag-up' : direction ? 'desk-tag-down' : 'desk-tag'}>
                {signalLabel}
              </span>
            )}
            <span className="desk-tag font-mono">{intervalLabel}</span>
            <span className="text-xs font-mono text-desk-muted">Proxy: {tvSymbol}</span>
          </div>

          <div className="flex items-center gap-3">
            {signalDate && <span className="text-xs font-mono text-desk-muted">Session {signalDate}</span>}
            <a
              href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(cmeSymbol)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="desk-btn-secondary h-8 px-3 text-xs"
            >
              <span>Open {cmeSymbol}</span>
              <ArrowUpRightIcon className="w-3.5 h-3.5 text-desk-muted" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-desk-muted hover:text-desk-text hover:bg-desk-raised transition-colors duration-150 ease-desk"
              aria-label="Close chart"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chart */}
        <div ref={containerRef} className="flex-1 w-full min-h-[460px] bg-desk-bg" />

        {/* Signal details strip */}
        {(entryPrice != null || stopPrice != null || targetPrice != null || extraRows.length > 0) && (
          <div className="border-t border-hairline bg-desk-deep px-6 py-3.5 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <PriceStat label="Entry" value={entryPrice} tone="neutral" />
                <PriceStat label="Target" value={targetPrice} tone={isBullish ? 'up' : 'down'} />
                <PriceStat label="Stop" value={stopPrice} tone="down" />

                {entryPrice != null && stopPrice != null && targetPrice != null && (
                  <div className="desk-well rounded-lg px-3.5 py-2 min-w-[88px]">
                    <div className="text-xs text-desk-muted">Reward / risk</div>
                    <div className="mt-0.5 font-mono text-sm font-medium text-desk-text">
                      {Math.abs((entryPrice ?? stopPrice) - stopPrice) > 0
                        ? (
                            Math.abs(targetPrice - (entryPrice ?? targetPrice)) /
                            Math.abs((entryPrice ?? stopPrice) - stopPrice)
                          ).toFixed(1)
                        : '—'}
                      :1
                    </div>
                  </div>
                )}

                {extraRows.map((row) => (
                  <div key={row.label} className="desk-well rounded-lg px-3.5 py-2 min-w-[96px]">
                    <div className="text-xs text-desk-muted">{row.label}</div>
                    <div className={`mt-0.5 font-mono text-sm font-medium ${row.highlight ? dirColor : 'text-desk-secondary'}`}>
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-desk-muted">
                <span className="font-mono">Keltner 20 EMA ± 2.5 ATR · LBR 3/10</span>
                <a
                  href="https://discord.gg/W3G2TpJQvP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk"
                >
                  <span>Desk Discord</span>
                  <ArrowUpRightIcon className="w-3.5 h-3.5 text-desk-muted" />
                </a>
                <a
                  href="https://x.com/OzCTA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk"
                >
                  <span>@OzCTA</span>
                  <ArrowUpRightIcon className="w-3.5 h-3.5 text-desk-muted" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
