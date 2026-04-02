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

/* ================================================================== */
/*  DATA                                                               */
/* ================================================================== */

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

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function cellColor(v: number | null | undefined) {
  if (v === null || v === undefined) return '';
  if (v >= 3)  return 'bg-emerald-100 text-emerald-800';
  if (v > 0)   return 'bg-emerald-50 text-emerald-700';
  if (v === 0) return 'text-slate-500';
  if (v > -2)  return 'bg-rose-50 text-rose-700';
  return 'bg-rose-100 text-rose-800';
}

function fmt(v: number | null | undefined) {
  if (v === null || v === undefined) return '\u2014';
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

/* ================================================================== */
/*  Tabs                                                               */
/* ================================================================== */
type TabKey = 'overview' | 'performance' | 'returns' | 'about';

const TABS: { key: TabKey; letter: string; label: string }[] = [
  { key: 'overview',    letter: 'A', label: 'Executive Summary' },
  { key: 'performance', letter: 'B', label: 'Growth of $1,000' },
  { key: 'returns',     letter: 'C', label: 'Monthly Returns' },
  { key: 'about',       letter: 'D', label: 'Misc & Disclaimers' },
];

/* ================================================================== */
/*  Radial progress ring (used in hero stat circles)                   */
/* ================================================================== */
function StatRing({ value, label, color, sub }: { value: string; label: string; color: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`relative h-40 w-40 md:h-48 md:w-48 rounded-full border-[6px] ${color} flex items-center justify-center bg-white/60 dark:bg-slate-950/30 shadow-lg`}>
        <div className="text-center">
          <div className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">{value}</div>
          {sub && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{sub}</div>}
        </div>
      </div>
      <div className="mt-3 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{label}</div>
    </div>
  );
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function FundPerformance() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const equityCurve   = useMemo(() => buildEquityCurve(MONTHLY_RETURNS), []);
  const barData       = useMemo(() => buildMonthlyBarData(MONTHLY_RETURNS), []);
  const drawdownCurve = useMemo(() => buildDrawdownCurve(MONTHLY_RETURNS), []);

  /* ──────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-0">

      {/* ============================================================== */}
      {/*  HERO — Centered fund title + 3 big stat circles (RCM style)   */}
      {/* ============================================================== */}
      <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/50 shadow-lg border border-slate-200/70 dark:border-slate-800/60 backdrop-blur">
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-10 right-0 h-64 w-64 rounded-full bg-teal-500/8 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/8 blur-3xl" />
        </div>

        <div className="relative text-center px-6 pt-12 pb-10 md:px-10 md:pt-16 md:pb-14">
          {/* Small badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/30 px-3.5 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-sm mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Fund Profile
          </div>

          {/* Fund name — large, centered, like RCM */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.1] mx-auto max-w-4xl">
            <span className="bg-gradient-to-r from-indigo-600 via-teal-500 to-fuchsia-500 dark:from-indigo-400 dark:via-teal-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
              OzCTA
            </span>{' '}
            Multi-Strategy Program
          </h1>

          <p className="mt-4 text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Systematic options &amp; trend-following across US equities
          </p>

          {/* ── 3 BIG STAT CIRCLES (mirrors RCM Return / Risk / $Minimum) ── */}
          <div className="mt-10 flex flex-wrap justify-center gap-6 md:gap-10">
            <StatRing value="17.4%" label="Return" color="border-emerald-400 dark:border-emerald-600" sub="Annualised" />
            <StatRing value="8.2%"  label="Risk"   color="border-amber-400 dark:border-amber-600"   sub="Ann. Volatility" />
            <StatRing value="$0"    label="Minimum" color="border-indigo-400 dark:border-indigo-600" sub="Educational" />
          </div>

          {/* CTA row */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-3">
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-md hover:shadow-lg hover:brightness-110 transition"
            >
              ← Back to Dashboard
            </Link>
            <a
              href="https://x.com/OzCTA"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/20 text-slate-800 dark:text-slate-200 hover:shadow-md transition"
            >
              Follow @OzCTA on 𝕏
            </a>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/*  TAB BAR — RCM-style A / B / C / D                             */}
      {/* ============================================================== */}
      <div className="mt-14 flex items-center justify-center gap-2 flex-wrap">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`group relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all border ${
                active
                  ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white border-transparent shadow-lg shadow-indigo-500/20'
                  : 'bg-white/90 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-bold ${
                active
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
              }`}>
                {t.letter}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/*  TAB CONTENT                                                    */}
      {/* ============================================================== */}
      <div className="mt-10">

        {/* ── A) EXECUTIVE SUMMARY (mirrors RCM layout exactly) ── */}
        {tab === 'overview' && (
          <div className="rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur overflow-hidden">
            {/* Section header */}
            <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/50">
              <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Executive Summary
              </h2>
            </div>

            <div className="p-8">
              {/* RCM-style stat rows: label on left, value on right, with separator lines */}
              <div className="divide-y divide-slate-200/70 dark:divide-slate-800/50">
                {([
                  { label: 'Assets Under Management',  value: 'N/A (Educational)' },
                  { label: 'Track Record Length',       value: '3 years, 2 months' },
                  { label: 'Sharpe Ratio',              value: '2.12' },
                  { label: 'Total Return',              value: '+63.2%' },
                  { label: 'Annualised Return',         value: '+17.4%' },
                  { label: 'Annualised Volatility',     value: '8.2%' },
                  { label: 'Max Drawdown',              value: '-4.8%' },
                  { label: 'Win Rate (monthly)',        value: '68%' },
                  { label: 'Best Month',                value: '+4.1% (Nov 2023)' },
                  { label: 'Worst Month',               value: '-2.3% (Oct 2023)' },
                  { label: 'Profit Factor',             value: '3.56' },
                ]).map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {row.label}
                    </span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Past performance notice (like RCM) */}
              <p className="mt-8 text-center text-sm text-slate-400 dark:text-slate-500 italic">
                Past performance is not indicative of future results
              </p>

              {/* Strategy allocation — 4 cards below the summary */}
              <div className="mt-10">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                  Strategy Allocation
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {([
                    { name: 'Forward Vol Calendars', pct: '35%', desc: 'Sell rich front-month IV, buy cheaper back-month — capitalise on the forward volatility factor.', dot: 'bg-indigo-500', border: 'border-indigo-200/60 dark:border-indigo-800/40' },
                    { name: 'Earnings Crush',        pct: '20%', desc: 'Short-vol plays selling inflated pre-earnings IV via calendar spreads around announcement dates.',  dot: 'bg-teal-500',   border: 'border-teal-200/60 dark:border-teal-800/40' },
                    { name: 'Earnings Ramp',         pct: '20%', desc: 'Long straddles entered 5-15 days before earnings, riding the IV expansion into the announcement.', dot: 'bg-amber-500',  border: 'border-amber-200/60 dark:border-amber-800/40' },
                    { name: 'Trendorama',            pct: '25%', desc: 'Systematic trend-following using channel breakouts and ATR-based position sizing across equities.',  dot: 'bg-fuchsia-500', border: 'border-fuchsia-200/60 dark:border-fuchsia-800/40' },
                  ]).map((s) => (
                    <div key={s.name} className={`rounded-xl border ${s.border} bg-white/60 dark:bg-slate-950/20 p-5`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.name}</span>
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">{s.pct}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── B) GROWTH OF $1,000 (chart tab like RCM) ── */}
        {tab === 'performance' && (
          <div className="space-y-6">
            {/* Line chart */}
            <div className="rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/50">
                <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Growth of $1,000
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">OzCTA Multi-Strategy vs S&amp;P 500</p>
              </div>
              <div className="p-6">
                <div className="h-[380px] md:h-[440px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equityCurve} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={Math.max(Math.floor(equityCurve.length / 8), 1)} angle={-30} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto','auto']} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.92)', border: 'none', borderRadius: '10px', color: '#e2e8f0', fontSize: 13 }} formatter={(value: number, name: string) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, name]} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <ReferenceLine y={1000} stroke="#94a3b8" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="equity" name="OzCTA System" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                      <Line type="monotone" dataKey="spx" name="S&P 500" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r: 3, fill: '#94a3b8' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="px-8 pb-5 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                Past performance is not indicative of future results
              </div>
            </div>

            {/* Monthly bar chart */}
            <div className="rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/50">
                <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Monthly Returns
                </h2>
              </div>
              <div className="p-6">
                <div className="h-[280px] md:h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={2} angle={-45} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.92)', border: 'none', borderRadius: '10px', color: '#e2e8f0', fontSize: 13 }} formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(1)}%`, 'Return']} />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                      <Bar dataKey="ret" radius={[3, 3, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={`c-${index}`} fill={entry.ret >= 0 ? '#10b981' : '#f43f5e'} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Drawdown chart */}
            <div className="rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/50">
                <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Drawdown from Peak
                </h2>
              </div>
              <div className="p-6">
                <div className="h-[250px] md:h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={drawdownCurve} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={Math.max(Math.floor(drawdownCurve.length / 8), 1)} angle={-30} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto', 0]} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.92)', border: 'none', borderRadius: '10px', color: '#e2e8f0', fontSize: 13 }} formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']} />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="dd" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── C) MONTHLY RETURNS TABLE ── */}
        {tab === 'returns' && (
          <div className="space-y-6">
            {/* Heatmap table */}
            <div className="rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/50">
                <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Monthly Return Stream (%)
                </h2>
              </div>
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/60 dark:border-slate-800/50">
                      <th className="py-2 px-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Year</th>
                      {MONTH_LABELS.map((m) => (
                        <th key={m} className="py-2 px-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">{m}</th>
                      ))}
                      <th className="py-2 px-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">YTD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHLY_RETURNS.map((row) => (
                      <tr key={row.year} className="border-b border-slate-100/80 dark:border-slate-800/40 hover:bg-slate-50/50 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{row.year}</td>
                        {MONTHS.map((m) => {
                          const v = row[m];
                          return <td key={m} className={`py-2.5 px-2 text-center font-mono text-xs font-semibold rounded ${cellColor(v)}`}>{fmt(v)}</td>;
                        })}
                        <td className={`py-2.5 px-3 text-center font-mono text-xs font-bold rounded ${cellColor(row.ytd)}`}>{fmt(row.ytd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Growth of $1,000 table */}
            <div className="rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/50">
                <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Growth of $1,000 — Cumulative Value
                </h2>
              </div>
              <div className="p-6 overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900">
                    <tr className="border-b border-slate-200/60 dark:border-slate-800/50">
                      <th className="py-2 px-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                      <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">OzCTA</th>
                      <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">S&amp;P 500</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equityCurve.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100/80 dark:border-slate-800/40 hover:bg-slate-50/50 transition">
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{p.date}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-indigo-700 dark:text-indigo-300">${p.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">${p.spx.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── D) MISC & DISCLAIMERS (collapsible, like RCM) ── */}
        {tab === 'about' && (
          <div className="space-y-6">
            {/* About */}
            <div className="rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/50">
                <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  About the Program
                </h2>
              </div>
              <div className="p-8 space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  The OzCTA Multi-Strategy Program is a systematic, rules-based approach to
                  options and equities trading. The program allocates capital across four
                  distinct, uncorrelated strategy modules — each with its own alpha source,
                  risk budget, and position-sizing methodology.
                </p>
                <p>
                  By diversifying across volatility selling (forward vol calendars, earnings crush),
                  volatility buying (pre-earnings straddles), and directional trend-following
                  (Trendorama channel breakouts), the program aims to deliver consistent
                  risk-adjusted returns with low correlation to traditional equity indices.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 pt-4">
                  {([
                    { label: 'Markets Traded', value: 'US equities & equity options (NASDAQ 100, S&P MidCap 400, broader liquid universe)' },
                    { label: 'Instruments', value: 'Calendar spreads, long straddles, single-leg options, equity positions' },
                    { label: 'Time Horizon', value: 'Short-term (1-45 DTE options) to medium-term (trend-following holds weeks to months)' },
                    { label: 'Technology', value: 'Python + IB API for execution; React + Vite dashboard for monitoring; automated daily scans' },
                  ]).map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200/60 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/20 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{item.label}</div>
                      <div className="text-sm text-slate-700 dark:text-slate-200">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Disclaimers — collapsible like RCM */}
            <div className="rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/50 backdrop-blur overflow-hidden">
              <button
                onClick={() => setDisclaimerOpen(!disclaimerOpen)}
                className="w-full px-8 py-5 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition"
              >
                <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Disclaimers
                </h2>
                <svg
                  className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${disclaimerOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {disclaimerOpen && (
                <div className="px-8 pb-8 text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 border-t border-slate-200/60 dark:border-slate-800/50 pt-5">
                  <p>
                    <strong>Past performance is not necessarily indicative of future results.</strong>{' '}
                    Trading futures, options on futures, and other derivative instruments involves
                    substantial risk of loss and is not suitable for all investors.
                  </p>
                  <p>
                    The performance data shown on this page is <strong>hypothetical</strong> and
                    based on backtested and simulated results. Hypothetical performance results have
                    many inherent limitations. No representation is being made that any account will
                    or is likely to achieve profits or losses similar to those shown.
                  </p>
                  <p>
                    One of the limitations of hypothetical performance results is that they are
                    generally prepared with the benefit of hindsight. In addition, hypothetical
                    trading does not involve financial risk, and no hypothetical trading record can
                    completely account for the impact of financial risk in actual trading.
                  </p>
                  <p>
                    The ability to withstand losses or to adhere to a particular trading program in
                    spite of trading losses are material points which can adversely affect actual
                    trading results. There are numerous other factors related to the markets in
                    general or to the implementation of any specific trading program which cannot be
                    fully accounted for in the preparation of hypothetical performance results, all
                    of which can adversely affect actual trading results.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                    © {new Date().getFullYear()} @OzCTA. For educational purposes only. This is not
                    investment advice. Questions? Contact me on X at{' '}
                    <a
                      href="https://x.com/OzCTA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold hover:underline"
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
