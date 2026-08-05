import { useEffect, useRef } from 'react';
import { TV_SYMBOLS, CME_FUTURES_SYMBOLS, LBR_STUDIES } from '../lib/tradingview';

export interface SignalChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  strategy: string;
  interval?: string;
  // Signal overlay data
  signalLabel?: string;        // e.g. "FADE UP — SELL"
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

function PricePill({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null | undefined;
  color: string;
}) {
  if (value == null) return null;
  const formatted =
    Math.abs(value) >= 1000
      ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : value.toFixed(4);
  return (
    <div className={`flex flex-col items-center rounded-xl px-4 py-3 ${color}`}>
      <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70 mb-0.5">
        {label}
      </span>
      <span className="font-mono font-black text-lg leading-none">{formatted}</span>
    </div>
  );
}

export default function SignalChartModal({
  isOpen,
  onClose,
  symbol,
  strategy,
  interval = 'D',
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

  // Determine direction styling
  const isBullish =
    direction === 'long' || direction === 'fade_down';
  const dirColor = isBullish
    ? 'text-emerald-400'
    : direction
    ? 'text-rose-400'
    : 'text-slate-300';

  useEffect(() => {
    if (!isOpen) return;

    // Load TradingView widget script once
    const loadWidget = () => {
      if (!containerRef.current) return;

      // Clear previous widget
      containerRef.current.innerHTML = `<div id="${chartId.current}" style="height:100%;width:100%;"></div>`;

      widgetRef.current = new window.TradingView.widget({
        container_id: chartId.current,
        width: '100%',
        height: '100%',
        symbol: tvSymbol,
        interval,
        timezone: 'America/New_York',
        theme: 'dark',
        style: '1',           // candlestick
        locale: 'en',
        toolbar_bg: '#0f172a',
        enable_publishing: false,
        hide_side_toolbar: false,
        hide_top_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        studies: LBR_STUDIES.map((s) => s.id),
        studies_overrides: LBR_STUDIES.reduce(
          (acc, s) => ({ ...acc, ...s.overrides }),
          {}
        ),
        overrides: {
          'paneProperties.background': '#0f172a',
          'paneProperties.vertGridProperties.color': '#1e293b',
          'paneProperties.horzGridProperties.color': '#1e293b',
          'symbolWatermarkProperties.transparency': 90,
          'scalesProperties.textColor': '#94a3b8',
        },
        loading_screen: { backgroundColor: '#0f172a', foregroundColor: '#3b82f6' },
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
  }, [isOpen, tvSymbol, interval]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[1400px] h-[92vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-2xl text-white">{symbol}</span>
            {signalLabel && (
              <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                isBullish
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}>
                {signalLabel}
              </span>
            )}
            <span className="text-slate-500 text-xs font-mono">Mapped: {tvSymbol}</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(cmeSymbol)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 transition-colors flex items-center gap-1.5"
            >
              Open {cmeSymbol} on TradingView ↗
            </a>
            {signalDate && (
              <span className="text-xs text-slate-500">As of {signalDate}</span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors text-2xl leading-none px-2"
              aria-label="Close chart"
            >
              ×
            </button>
          </div>
        </div>

        {/* Chart */}
        <div ref={containerRef} className="flex-1 w-full min-h-[500px]" />

        {/* Signal details strip */}
        {(entryPrice != null || stopPrice != null || targetPrice != null || extraRows.length > 0) && (
          <div className="border-t border-slate-700 bg-slate-900 px-6 py-4 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              {/* Price pills */}
              <PricePill
                label="Entry"
                value={entryPrice}
                color="bg-slate-800 text-slate-100 border border-slate-600"
              />
              <PricePill
                label="Target"
                value={targetPrice}
                color={`bg-slate-800 border ${isBullish ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-500/40 text-rose-300'}`}
              />
              <PricePill
                label="Stop"
                value={stopPrice}
                color="bg-slate-800 border border-amber-500/30 text-amber-300"
              />

              {/* Risk/Reward */}
              {entryPrice != null && stopPrice != null && targetPrice != null && (
                <div className="flex flex-col items-center rounded-xl px-4 py-3 bg-indigo-950/50 border border-indigo-500/20">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-0.5">
                    R:R
                  </span>
                  <span className="font-mono font-black text-lg text-indigo-300">
                    {Math.abs(targetPrice - (entryPrice ?? targetPrice)) /
                      Math.abs((entryPrice ?? stopPrice) - stopPrice) > 0
                      ? (
                          Math.abs(targetPrice - (entryPrice ?? targetPrice)) /
                          Math.abs((entryPrice ?? stopPrice) - stopPrice)
                        ).toFixed(1)
                      : '—'}
                    :1
                  </span>
                </div>
              )}

              {/* Extra metadata rows */}
              {extraRows.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col items-center rounded-xl px-4 py-3 bg-slate-800 border border-slate-700"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
                    {row.label}
                  </span>
                  <span className={`font-mono font-bold text-sm ${row.highlight ? dirColor : 'text-slate-300'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* LBR indicator reminder */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                'Keltner Channel: 20 EMA ± 2.5×ATR',
                'EMA: 20-period',
                'MACD: 3/10/16 (LBR 3-10 Oscillator)',
              ].map((hint) => (
                <span key={hint} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                  {hint}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
