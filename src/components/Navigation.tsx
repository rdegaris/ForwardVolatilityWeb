import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';

type NavSectionKey = 'forward' | 'earningsCrush' | 'preEarnings' | 'turtle' | 'grail';

type AccentStyle = {
  topActiveText: string;
  topInactiveText: string;
  topHoverText: string;
  topActiveUnderline: string;
  subBarBg: string;
  subBarBorder: string;
  subActivePill: string;
  subInactivePill: string;
  subHoverPill: string;
  dot: string;
};

const ACCENTS: Record<NavSectionKey, AccentStyle> = {
  forward: {
    topActiveText: 'text-indigo-900 dark:text-indigo-100',
    topInactiveText: 'text-slate-600 dark:text-slate-300',
    topHoverText: 'hover:text-indigo-800 dark:hover:text-indigo-200',
    topActiveUnderline: 'bg-indigo-500',
    subBarBg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
    subBarBorder: 'border-indigo-200/70 dark:border-indigo-800/40',
    subActivePill: 'bg-indigo-600 text-white',
    subInactivePill: 'text-slate-700 dark:text-slate-200',
    subHoverPill: 'hover:bg-indigo-100/70 dark:hover:bg-indigo-900/30',
    dot: 'bg-indigo-500',
  },
  earningsCrush: {
    topActiveText: 'text-teal-900 dark:text-teal-100',
    topInactiveText: 'text-slate-600 dark:text-slate-300',
    topHoverText: 'hover:text-teal-800 dark:hover:text-teal-200',
    topActiveUnderline: 'bg-teal-500',
    subBarBg: 'bg-teal-50/70 dark:bg-teal-950/25',
    subBarBorder: 'border-teal-200/70 dark:border-teal-800/40',
    subActivePill: 'bg-teal-600 text-white',
    subInactivePill: 'text-slate-700 dark:text-slate-200',
    subHoverPill: 'hover:bg-teal-100/70 dark:hover:bg-teal-900/30',
    dot: 'bg-teal-500',
  },
  preEarnings: {
    topActiveText: 'text-amber-900 dark:text-amber-100',
    topInactiveText: 'text-slate-600 dark:text-slate-300',
    topHoverText: 'hover:text-amber-800 dark:hover:text-amber-200',
    topActiveUnderline: 'bg-amber-500',
    subBarBg: 'bg-amber-50/70 dark:bg-amber-950/25',
    subBarBorder: 'border-amber-200/70 dark:border-amber-800/40',
    subActivePill: 'bg-amber-600 text-white',
    subInactivePill: 'text-slate-700 dark:text-slate-200',
    subHoverPill: 'hover:bg-amber-100/70 dark:hover:bg-amber-900/30',
    dot: 'bg-amber-500',
  },
  turtle: {
    topActiveText: 'text-fuchsia-900 dark:text-fuchsia-100',
    topInactiveText: 'text-slate-600 dark:text-slate-300',
    topHoverText: 'hover:text-fuchsia-800 dark:hover:text-fuchsia-200',
    topActiveUnderline: 'bg-fuchsia-500',
    subBarBg: 'bg-fuchsia-50/70 dark:bg-fuchsia-950/25',
    subBarBorder: 'border-fuchsia-200/70 dark:border-fuchsia-800/40',
    subActivePill: 'bg-fuchsia-600 text-white',
    subInactivePill: 'text-slate-700 dark:text-slate-200',
    subHoverPill: 'hover:bg-fuchsia-100/70 dark:hover:bg-fuchsia-900/30',
    dot: 'bg-fuchsia-500',
  },
  grail: {
    topActiveText: 'text-orange-900 dark:text-orange-100',
    topInactiveText: 'text-slate-600 dark:text-slate-300',
    topHoverText: 'hover:text-orange-800 dark:hover:text-orange-200',
    topActiveUnderline: 'bg-orange-500',
    subBarBg: 'bg-orange-50/70 dark:bg-orange-950/25',
    subBarBorder: 'border-orange-200/70 dark:border-orange-800/40',
    subActivePill: 'bg-orange-600 text-white',
    subInactivePill: 'text-slate-700 dark:text-slate-200',
    subHoverPill: 'hover:bg-orange-100/70 dark:hover:bg-orange-900/30',
    dot: 'bg-orange-500',
  },
};

function getSection(pathname: string): NavSectionKey | null {
  if (pathname.startsWith('/turtle')) return 'turtle';
  if (pathname.startsWith('/grail')) return 'grail';
  if (pathname.startsWith('/pre-earnings')) return 'preEarnings';
  if (pathname.startsWith('/earnings-crush')) return 'earningsCrush';
  if (
    pathname.startsWith('/nasdaq100') ||
    pathname.startsWith('/midcap400') ||
    pathname.startsWith('/iv-rankings') ||
    pathname.startsWith('/calculator') ||
    pathname.startsWith('/trade-tracker')
  ) return 'forward';
  return null;
}

type NavItem = { label: string; to: string };

const SUB_NAV: Record<NavSectionKey, NavItem[]> = {
  forward: [
    { label: 'NASDAQ 100', to: '/nasdaq100' },
    { label: 'MidCap 400', to: '/midcap400' },
    { label: 'IV Rankings', to: '/iv-rankings' },
    { label: 'Calculator', to: '/calculator' },
    { label: 'Trade Tracker', to: '/trade-tracker' },
  ],
  earningsCrush: [
    { label: 'Scanner', to: '/earnings-crush' },
    { label: 'Trade Tracker', to: '/earnings-crush/trades' },
  ],
  preEarnings: [
    { label: 'Opportunities', to: '/pre-earnings' },
    { label: 'Open Trades', to: '/pre-earnings/open-trades' },
  ],
  turtle: [
    { label: 'Signals', to: '/turtle' },
    { label: 'Open Trades', to: '/turtle/open-trades' },
    { label: 'Triggers Soon', to: '/turtle/triggers' },
  ],
  grail: [
    { label: 'Signals', to: '/grail' },
  ],
};

function OzCtaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ozcta-bg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="0.45" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#D946EF" />
        </linearGradient>
        <linearGradient id="ozcta-line" x1="10" y1="32" x2="38" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#FDE68A" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#ozcta-bg)" />
      <rect x="2" y="2" width="44" height="44" rx="12" fill="white" opacity="0.06" />
      <polyline
        points="10,32 18,28 22,34 28,18 34,22 38,14"
        stroke="url(#ozcta-line)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="34,14 38,14 38,18"
        stroke="#FDE68A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type TopGroup = 'futures' | 'options' | null;

const FUTURES_KEYS: NavSectionKey[] = ['turtle', 'grail'];
const OPTIONS_KEYS: NavSectionKey[] = ['forward', 'earningsCrush', 'preEarnings'];

function getActiveGroup(section: NavSectionKey | null): TopGroup {
  if (section && FUTURES_KEYS.includes(section)) return 'futures';
  if (section && OPTIONS_KEYS.includes(section)) return 'options';
  return null;
}

function ExpandableItems({ 
  show, children 
}: { show: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (ref.current) setWidth(ref.current.scrollWidth);
  }, [children]);

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{ maxWidth: show ? width : 0, opacity: show ? 1 : 0 }}
    >
      <div ref={ref} className="flex items-center gap-1 whitespace-nowrap">
        {children}
      </div>
    </div>
  );
}

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const section = getSection(location.pathname);
  const accent = section ? ACCENTS[section] : null;
  const activeGroup = getActiveGroup(section);

  const [expanded, setExpanded] = useState<TopGroup>(activeGroup);

  // Sync expanded group when route changes
  useEffect(() => {
    setExpanded(activeGroup);
  }, [activeGroup]);

  const isActive = (path: string) => location.pathname === path;

  const toggleGroup = (group: TopGroup) => {
    setExpanded(prev => prev === group ? null : group);
  };

  return (
    <nav className="bg-white/90 dark:bg-slate-900/60 shadow-md mb-8 rounded-xl overflow-hidden border border-slate-200/70 dark:border-slate-800/60 backdrop-blur">
      <div className="max-w-7xl mx-auto">
        {/* Top Level Navigation */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200/70 dark:border-slate-800/60">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              aria-label="OzCTA"
              className="group inline-flex items-center gap-2 rounded-xl px-3 py-2 -ml-2 transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
            >
              <span className="relative">
                <OzCtaMark className="h-8 w-8 drop-shadow-sm" />
                <span className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-white/25" />
              </span>
              <span className="leading-tight">
                <span className="block text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  OzCTA
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  Commodity Trading Advisor
                </span>
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-1.5">
              {/* ── Futures ── */}
              <button
                onClick={() => toggleGroup('futures')}
                className={`relative px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                  expanded === 'futures'
                    ? 'bg-fuchsia-600/10 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 ring-1 ring-fuchsia-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  Futures Strategies
                  <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded === 'futures' ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>

              <ExpandableItems show={expanded === 'futures'}>
                {([
                  { key: 'turtle' as const, label: 'Trendorama', to: '/turtle' },
                  { key: 'grail' as const, label: 'Grail Trade', to: '/grail' },
                ] satisfies Array<{ key: NavSectionKey; label: string; to: string }>).map((item) => {
                  const isSectionActive = section === item.key;
                  const a = ACCENTS[item.key];
                  return (
                    <Link
                      key={item.key}
                      to={item.to}
                      className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isSectionActive
                          ? `${a.topActiveText} bg-white/80 dark:bg-slate-800/60 shadow-sm`
                          : `text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30`
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${a.dot} ${isSectionActive ? 'opacity-100' : 'opacity-30'}`} />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </ExpandableItems>

              <div className="h-5 w-px bg-slate-200/60 dark:bg-slate-700/40 mx-1" />

              {/* ── Options ── */}
              <button
                onClick={() => toggleGroup('options')}
                className={`relative px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                  expanded === 'options'
                    ? 'bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 ring-1 ring-indigo-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                }`}
              >
                <span className="flex items-center gap-2">
                  Option Strategies
                  <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded === 'options' ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>

              <ExpandableItems show={expanded === 'options'}>
                {([
                  { key: 'forward' as const, label: 'Forward Vol', to: '/trade-tracker' },
                  { key: 'earningsCrush' as const, label: 'Earnings Crush', to: '/earnings-crush' },
                  { key: 'preEarnings' as const, label: 'Earnings Ramp', to: '/pre-earnings' },
                ] satisfies Array<{ key: NavSectionKey; label: string; to: string }>).map((item) => {
                  const isSectionActive = section === item.key;
                  const a = ACCENTS[item.key];
                  return (
                    <Link
                      key={item.key}
                      to={item.to}
                      className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isSectionActive
                          ? `${a.topActiveText} bg-white/80 dark:bg-slate-800/60 shadow-sm`
                          : `text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/30`
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${a.dot} ${isSectionActive ? 'opacity-100' : 'opacity-30'}`} />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </ExpandableItems>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/fund"
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                location.pathname === '/fund'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
              }`}
            >
              Home
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Hi, <span className="font-semibold text-slate-900 dark:text-slate-100">{user?.firstName}</span>
                </span>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                Log In
              </Link>
            )}
          </div>
        </div>

        {/* Sub Navigation (connected to active section via tint + dot rail) */}
        {section && accent && (
        <div className={`px-4 py-3 border-t ${accent.subBarBorder} ${accent.subBarBg}`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {section === 'forward'
                  ? 'Forward Vol'
                  : section === 'earningsCrush'
                    ? 'Earnings Crush'
                    : section === 'preEarnings'
                      ? 'Earnings Ramp'
                      : section === 'grail'
                        ? 'Grail Trade'
                        : 'Trendorama'}
              </span>
            </div>

            <div className="h-4 w-px bg-slate-300/60 dark:bg-slate-700/60" />

            <div className="flex flex-wrap gap-2">
              {SUB_NAV[section].map((item) => {
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      active
                        ? accent.subActivePill
                        : `${accent.subInactivePill} ${accent.subHoverPill} bg-white/60 dark:bg-slate-950/20`
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile top-level fallback */}
          <div className="sm:hidden mt-3 space-y-2">
            <button
              onClick={() => toggleGroup('futures')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                expanded === 'futures'
                  ? 'bg-fuchsia-600/10 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Futures Strategies
              <svg className={`w-4 h-4 transition-transform duration-300 ${expanded === 'futures' ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            <ExpandableItems show={expanded === 'futures'}>
            {([
              { key: 'turtle' as const, label: 'Trendorama', to: '/turtle' },
              { key: 'grail' as const, label: 'Grail Trade', to: '/grail' },
            ] satisfies Array<{ key: NavSectionKey; label: string; to: string }>).map((item) => {
              const isSectionActive = section === item.key;
              const a = ACCENTS[item.key];
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border border-slate-200/60 dark:border-slate-800/60 ${
                    isSectionActive
                      ? `${a.subActivePill}`
                      : `${a.topInactiveText} ${a.topHoverText} bg-white/60 dark:bg-slate-950/20`
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            </ExpandableItems>

            <button
              onClick={() => toggleGroup('options')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                expanded === 'options'
                  ? 'bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Option Strategies
              <svg className={`w-4 h-4 transition-transform duration-300 ${expanded === 'options' ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            <ExpandableItems show={expanded === 'options'}>
            {([
              { key: 'forward' as const, label: 'Forward Vol', to: '/trade-tracker' },
              { key: 'earningsCrush' as const, label: 'Earnings Crush', to: '/earnings-crush' },
              { key: 'preEarnings' as const, label: 'Earnings Ramp', to: '/pre-earnings' },
            ] satisfies Array<{ key: NavSectionKey; label: string; to: string }>).map((item) => {
              const isSectionActive = section === item.key;
              const a = ACCENTS[item.key];
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border border-slate-200/60 dark:border-slate-800/60 ${
                    isSectionActive
                      ? `${a.subActivePill}`
                      : `${a.topInactiveText} ${a.topHoverText} bg-white/60 dark:bg-slate-950/20`
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            </ExpandableItems>
          </div>
        </div>
        )}
      </div>
    </nav>
  );
}
