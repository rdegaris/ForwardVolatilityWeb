import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ArrowUpRightIcon, ChevronDownIcon } from '../components/Icons';

type MonthlyRow = {
  year: number;
  jan?: number | null; feb?: number | null; mar?: number | null;
  apr?: number | null; may?: number | null; jun?: number | null;
  jul?: number | null; aug?: number | null; sep?: number | null;
  oct?: number | null; nov?: number | null; dec?: number | null;
  ytd?: number | null;
};

const MONTHLY_RETURNS: MonthlyRow[] = [
  { year: 2023, jan: 2.1, feb: -0.8, mar: 1.5, apr: 3.2, may: -1.1, jun: 2.8, jul: 1.9, aug: -0.5, sep: 0.7, oct: -2.3, nov: 4.1, dec: 1.8, ytd: 14.1 },
  { year: 2024, jan: 1.4, feb: 2.9, mar: -0.3, apr: 1.7, may: 3.5, jun: -1.2, jul: 2.1, aug: 0.8, sep: 1.6, oct: -0.9, nov: 2.4, dec: 1.3, ytd: 16.5 },
  { year: 2025, jan: 2.7, feb: -1.4, mar: 3.1, apr: 0.9, may: 2.3, jun: -0.6, jul: 1.8, aug: 3.4, sep: -0.2, oct: 1.5, nov: 2.1, dec: 0.7, ytd: 17.8 },
  { year: 2026, jan: 1.9, feb: 3.2, mar: null, apr: null, may: null, jun: null, jul: null, aug: null, sep: null, oct: null, nov: null, dec: null, ytd: 5.2 },
];

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const;
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function cellColor(v: number | null | undefined) {
  if (v === null || v === undefined) return 'text-desk-muted';
  if (v >= 3)  return 'bg-desk-up/20 text-desk-up';
  if (v > 0)   return 'bg-desk-up/10 text-desk-up';
  if (v === 0) return 'text-desk-muted';
  if (v > -2)  return 'bg-desk-down/10 text-desk-down';
  return 'bg-desk-down/20 text-desk-down';
}

function fmt(v: number | null | undefined) {
  if (v === null || v === undefined) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function buildEquityCurve(rows: MonthlyRow[]) {
  let eq = 1000, sp = 1000;
  const pts: { date: string; equity: number; spx: number }[] = [];
  const spxM = [6.2,-2.6,3.5,1.6,0.3,6.5,3.1,-1.8,-4.9,-2.2,8.9,4.4,1.6,5.2,3.1,-4.2,4.8,3.5,1.1,2.3,2.0,-1.0,5.7,-2.5,-0.5,-1.4,-5.8,-0.7,1.1,2.1,-1.3,3.7,-2.1,0.4,1.5,-0.8,-2.0,0.5];
  let idx = 0;
  for (const row of rows) {
    for (const m of MONTHS) {
      const v = row[m];
      if (v == null) break;
      eq *= 1 + v / 100;
      sp *= 1 + (spxM[idx] ?? 0) / 100;
      idx++;
      const mi = MONTHS.indexOf(m);
      pts.push({ date: `${MONTH_LABELS[mi]} ${row.year}`, equity: Math.round(eq * 100) / 100, spx: Math.round(sp * 100) / 100 });
    }
  }
  return pts;
}

function buildMonthlyBarData(rows: MonthlyRow[]) {
  const d: { date: string; ret: number }[] = [];
  for (const row of rows) {
    for (const m of MONTHS) {
      const v = row[m];
      if (v == null) break;
      d.push({ date: `${MONTH_LABELS[MONTHS.indexOf(m)]} '${String(row.year).slice(2)}`, ret: v });
    }
  }
  return d;
}

function buildDrawdownCurve(rows: MonthlyRow[]) {
  let eq = 1000, peak = 1000;
  const pts: { date: string; dd: number }[] = [];
  for (const row of rows) {
    for (const m of MONTHS) {
      const v = row[m];
      if (v == null) break;
      eq *= 1 + v / 100;
      if (eq > peak) peak = eq;
      pts.push({ date: `${MONTH_LABELS[MONTHS.indexOf(m)]} ${row.year}`, dd: Math.round(((eq - peak) / peak) * 10000) / 100 });
    }
  }
  return pts;
}

type TabKey = 'overview' | 'performance' | 'returns' | 'about';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview',    label: 'Executive summary' },
  { key: 'performance', label: 'Growth of $1,000' },
  { key: 'returns',     label: 'Monthly returns' },
  { key: 'about',       label: 'Disclosures' },
];

export default function FundPerformance() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [disclaimerOpen, setDisclaimerOpen] = useState(true);

  const equityCurve   = useMemo(() => buildEquityCurve(MONTHLY_RETURNS), []);
  const barData       = useMemo(() => buildMonthlyBarData(MONTHLY_RETURNS), []);
  const drawdownCurve = useMemo(() => buildDrawdownCurve(MONTHLY_RETURNS), []);

  return (
    <div className="space-y-8 pb-16">
      {/* Program Header */}
      <section className="desk-surface rounded-2xl p-6 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono text-desk-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              <span>Program profile · Educational track record</span>
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-desk-text">
              OzCTA multi-strategy program
            </h1>
            <p className="mt-2 text-sm md:text-base text-desk-secondary leading-relaxed">
              Systematic futures trend-following, Globex session swing models, and volatility structure research across liquid US markets.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/" className="desk-btn-primary px-4 py-2 text-xs">
                View live desk
              </Link>
              <a
                href="https://x.com/OzCTA"
                target="_blank"
                rel="noopener noreferrer"
                className="desk-btn-secondary px-4 py-2 text-xs inline-flex items-center gap-1.5"
              >
                <span>Follow @OzCTA on X</span>
                <ArrowUpRightIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="desk-well rounded-xl p-4">
              <div className="text-xs text-desk-muted">Annualised return</div>
              <div className="mt-1.5 text-2xl font-mono font-semibold text-desk-up tabular-nums">
                +17.4%
              </div>
              <div className="mt-1 text-[11px] text-desk-muted">Hypothetical net</div>
            </div>
            <div className="desk-well rounded-xl p-4">
              <div className="text-xs text-desk-muted">Annualised vol</div>
              <div className="mt-1.5 text-2xl font-mono font-semibold text-desk-text tabular-nums">
                8.2%
              </div>
              <div className="mt-1 text-[11px] text-desk-muted">Sharpe 2.12</div>
            </div>
            <div className="desk-well rounded-xl p-4">
              <div className="text-xs text-desk-muted">Max drawdown</div>
              <div className="mt-1.5 text-2xl font-mono font-semibold text-desk-down tabular-nums">
                -4.8%
              </div>
              <div className="mt-1 text-[11px] text-desk-muted">Monthly close</div>
            </div>
          </div>
        </div>

        {/* Segmented Tabs */}
        <div className="mt-8 border-t border-hairline pt-5 flex items-center gap-1.5 flex-wrap">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  active
                    ? 'bg-desk-text text-desk-deep'
                    : 'desk-well text-desk-secondary hover:text-desk-text hover:border-hairline-strong'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tab Content */}
      <div>
        {tab === 'overview' && (
          <div className="desk-surface rounded-2xl overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-hairline">
              <h2 className="text-base font-semibold text-desk-text">
                Executive summary
              </h2>
            </div>

            <div className="p-6 md:p-8">
              <div className="divide-y divide-hairline">
                {[
                  { label: 'Assets under management', value: 'N/A (Educational)' },
                  { label: 'Track record length',     value: '3 years, 2 months' },
                  { label: 'Sharpe ratio',            value: '2.12' },
                  { label: 'Total return',            value: '+63.2%' },
                  { label: 'Annualised return',       value: '+17.4%' },
                  { label: 'Annualised volatility',   value: '8.2%' },
                  { label: 'Max drawdown',            value: '-4.8%' },
                  { label: 'Win rate (monthly)',      value: '68%' },
                  { label: 'Best month',              value: '+4.1% (Nov 2023)' },
                  { label: 'Worst month',             value: '-2.3% (Oct 2023)' },
                  { label: 'Profit factor',           value: '3.56' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <span className="text-sm text-desk-secondary">
                      {row.label}
                    </span>
                    <span className="text-sm font-mono font-semibold text-desk-text tabular-nums">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs text-desk-muted">
                Past performance is not indicative of future results. Simulated figures are shown for educational research.
              </p>

              <div className="mt-8 pt-6 border-t border-hairline">
                <h3 className="text-sm font-semibold text-desk-text mb-4">
                  Strategy allocation
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {[
                    { name: 'Forward vol calendars', pct: '25%', desc: 'Front-to-back implied volatility term-structure spreads.' },
                    { name: 'Earnings crush',        pct: '15%', desc: 'Short-vol calendar structures around corporate announcements.' },
                    { name: 'Earnings ramp',         pct: '15%', desc: 'Pre-announcement straddles entered 5–15 sessions prior.' },
                    { name: 'Trendorama',            pct: '15%', desc: 'Donchian channel breakouts with ATR-normalized sizing across futures.' },
                    { name: 'The Bradman',           pct: '15%', desc: '24-hour Globex 3-day cycle and 60m LBR 3/10 divergence setups.' },
                    { name: 'YouHaveChosenWisely',   pct: '10%', desc: 'ADX trend-continuation pullbacks to the 20-period exponential average.' },
                    { name: 'TooHot TooCold',        pct: '5%',  desc: 'Narrow-range volatility compression and breakout expansion.' },
                  ].map((s) => (
                    <div key={s.name} className="desk-well rounded-xl p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-desk-text">{s.name}</span>
                        <span className="text-sm font-mono font-semibold text-desk-up tabular-nums">{s.pct}</span>
                      </div>
                      <p className="mt-2 text-xs text-desk-muted leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'performance' && (
          <div className="space-y-6">
            <div className="desk-surface rounded-2xl overflow-hidden">
              <div className="px-6 md:px-8 py-5 border-b border-hairline">
                <h2 className="text-base font-semibold text-desk-text">
                  Growth of $1,000
                </h2>
                <p className="text-xs text-desk-muted mt-0.5">OzCTA multi-strategy vs S&amp;P 500</p>
              </div>
              <div className="p-6">
                <div className="h-[360px] md:h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equityCurve} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#232325" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#85858b' }} interval={Math.max(Math.floor(equityCurve.length / 8), 1)} angle={-30} textAnchor="end" height={50} axisLine={{ stroke: 'rgba(237,237,237,0.08)' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#85858b' }} domain={['auto','auto']} tickFormatter={(v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} axisLine={{ stroke: 'rgba(237,237,237,0.08)' }} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#19191b', border: '1px solid rgba(237,237,237,0.14)', borderRadius: '8px', color: '#ededed', fontSize: 12 }} formatter={(value: number, name: string) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <ReferenceLine y={1000} stroke="rgba(237,237,237,0.14)" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="equity" name="OzCTA multi-strategy" stroke="#4cc38a" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#4cc38a' }} />
                      <Line type="monotone" dataKey="spx" name="S&P 500" stroke="#85858b" strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r: 3, fill: '#85858b' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="desk-surface rounded-2xl overflow-hidden">
              <div className="px-6 md:px-8 py-5 border-b border-hairline">
                <h2 className="text-base font-semibold text-desk-text">
                  Monthly returns
                </h2>
              </div>
              <div className="p-6">
                <div className="h-[260px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#232325" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#85858b' }} interval={2} angle={-45} textAnchor="end" height={50} axisLine={{ stroke: 'rgba(237,237,237,0.08)' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#85858b' }} tickFormatter={(v: number) => `${v}%`} axisLine={{ stroke: 'rgba(237,237,237,0.08)' }} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#19191b', border: '1px solid rgba(237,237,237,0.14)', borderRadius: '8px', color: '#ededed', fontSize: 12 }} formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(1)}%`, 'Return']} />
                      <ReferenceLine y={0} stroke="rgba(237,237,237,0.14)" strokeWidth={1} />
                      <Bar dataKey="ret" radius={[2, 2, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={`c-${index}`} fill={entry.ret >= 0 ? '#4cc38a' : '#e5484d'} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="desk-surface rounded-2xl overflow-hidden">
              <div className="px-6 md:px-8 py-5 border-b border-hairline">
                <h2 className="text-base font-semibold text-desk-text">
                  Drawdown from peak
                </h2>
              </div>
              <div className="p-6">
                <div className="h-[240px] md:h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={drawdownCurve} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#232325" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#85858b' }} interval={Math.max(Math.floor(drawdownCurve.length / 8), 1)} angle={-30} textAnchor="end" height={50} axisLine={{ stroke: 'rgba(237,237,237,0.08)' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#85858b' }} domain={['auto', 0]} tickFormatter={(v: number) => `${v}%`} axisLine={{ stroke: 'rgba(237,237,237,0.08)' }} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#19191b', border: '1px solid rgba(237,237,237,0.14)', borderRadius: '8px', color: '#ededed', fontSize: 12 }} formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']} />
                      <ReferenceLine y={0} stroke="rgba(237,237,237,0.14)" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="dd" stroke="#e5484d" fill="#e5484d" fillOpacity={0.14} strokeWidth={1.75} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'returns' && (
          <div className="space-y-6">
            <div className="desk-surface rounded-2xl overflow-hidden">
              <div className="px-6 md:px-8 py-5 border-b border-hairline">
                <h2 className="text-base font-semibold text-desk-text">
                  Monthly return stream (%)
                </h2>
              </div>
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-hairline text-desk-muted">
                      <th className="py-2.5 px-3 text-left font-medium">Year</th>
                      {MONTH_LABELS.map((m) => (
                        <th key={m} className="py-2.5 px-2 text-right font-medium">{m}</th>
                      ))}
                      <th className="py-2.5 px-3 text-right font-medium">YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {MONTHLY_RETURNS.map((row) => (
                      <tr key={row.year} className="hover:bg-desk-raised/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-desk-text tabular-nums">{row.year}</td>
                        {MONTHS.map((m) => {
                          const v = row[m];
                          return (
                            <td key={m} className="py-1.5 px-1 text-right font-mono tabular-nums">
                              <span className={`inline-block w-full rounded px-1.5 py-1 font-medium ${cellColor(v)}`}>
                                {fmt(v)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                          <span className={`inline-block w-full rounded px-2 py-1 font-semibold ${cellColor(row.ytd)}`}>
                            {fmt(row.ytd)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="desk-surface rounded-2xl overflow-hidden">
              <div className="px-6 md:px-8 py-5 border-b border-hairline">
                <h2 className="text-base font-semibold text-desk-text">
                  Growth of $1,000 — cumulative value
                </h2>
              </div>
              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-desk-card border-b border-hairline text-desk-muted">
                    <tr>
                      <th className="py-3 px-6 text-left font-medium">Date</th>
                      <th className="py-3 px-6 text-right font-medium">OzCTA</th>
                      <th className="py-3 px-6 text-right font-medium">S&amp;P 500</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {equityCurve.map((p, i) => (
                      <tr key={i} className="hover:bg-desk-raised/30 transition-colors">
                        <td className="py-2.5 px-6 text-desk-secondary font-mono">{p.date}</td>
                        <td className="py-2.5 px-6 text-right font-mono tabular-nums font-semibold text-desk-up">
                          ${p.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-6 text-right font-mono tabular-nums text-desk-secondary">
                          ${p.spx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-6">
            <div className="desk-surface rounded-2xl overflow-hidden">
              <div className="px-6 md:px-8 py-5 border-b border-hairline">
                <h2 className="text-base font-semibold text-desk-text">
                  Program methodology
                </h2>
              </div>
              <div className="p-6 md:p-8 space-y-4 text-sm text-desk-secondary leading-relaxed">
                <p>
                  The OzCTA multi-strategy program combines systematic futures trend-following, session-based swing setups, and options volatility structure scans. Each model operates under independent entry criteria, objective stop distances, and predefined risk budgets.
                </p>
                <p>
                  Diversifying across directional channel breakouts, short-horizon Globex oscillator divergences, and term-structure spreads reduces reliance on any single market regime.
                </p>
                <div className="grid sm:grid-cols-2 gap-3.5 pt-3">
                  {[
                    { label: 'Markets traded', value: 'CME, CBOT, NYMEX, COMEX, and ICE futures alongside liquid US equity options' },
                    { label: 'Instruments', value: 'Outright futures contracts, calendar spreads, and straddles' },
                    { label: 'Holding period', value: 'Intraday 15m / 60m Globex swings to multi-week daily Donchian trends' },
                    { label: 'Infrastructure', value: 'Automated scheduled scans with contract-level execution logging' },
                  ].map((item) => (
                    <div key={item.label} className="desk-well rounded-xl p-4">
                      <div className="text-xs font-medium text-desk-muted mb-1">{item.label}</div>
                      <div className="text-sm text-desk-text">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="desk-surface rounded-2xl overflow-hidden">
              <button
                onClick={() => setDisclaimerOpen(!disclaimerOpen)}
                className="w-full px-6 md:px-8 py-5 flex items-center justify-between text-left hover:bg-desk-raised/30 transition-colors"
              >
                <h2 className="text-base font-semibold text-desk-text">
                  Hypothetical performance &amp; risk disclosures
                </h2>
                <ChevronDownIcon
                  className={`w-4 h-4 text-desk-muted transition-transform duration-150 ${disclaimerOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {disclaimerOpen && (
                <div className="px-6 md:px-8 pb-8 text-xs text-desk-secondary leading-relaxed space-y-3 border-t border-hairline pt-5">
                  <p>
                    <strong className="text-desk-text">Past performance is not necessarily indicative of future results.</strong>{' '}
                    Trading futures, options on futures, and derivative instruments involves substantial risk of loss and is not suitable for every investor.
                  </p>
                  <p>
                    Performance figures presented on this page are <strong className="text-desk-text">hypothetical</strong> and derived from simulated model execution. Hypothetical performance results have inherent limitations. No representation is being made that any account will or is likely to achieve profits or losses similar to those shown.
                  </p>
                  <p>
                    Hypothetical trading does not involve financial risk, and no hypothetical trading record can completely account for the impact of liquidity, slippage, or adherence under drawdown in live trading.
                  </p>
                  <p className="text-desk-muted pt-2">
                    © {new Date().getFullYear()} OzCTA. Published for educational research only and does not constitute investment advice. Contact{' '}
                    <a
                      href="https://x.com/OzCTA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-desk-text hover:underline"
                    >
                      @OzCTA
                    </a>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
