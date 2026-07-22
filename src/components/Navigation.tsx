import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';

type NavSectionKey = 'forward' | 'earningsCrush' | 'preEarnings' | 'turtle' | 'grail' | 'odid' | 'taylor';

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
  odid: {
    topActiveText: 'text-cyan-900 dark:text-cyan-100',
    topInactiveText: 'text-slate-600 dark:text-slate-300',
    topHoverText: 'hover:text-cyan-800 dark:hover:text-cyan-200',
    topActiveUnderline: 'bg-cyan-500',
    subBarBg: 'bg-cyan-50/70 dark:bg-cyan-950/25',
    subBarBorder: 'border-cyan-200/70 dark:border-cyan-800/40',
    subActivePill: 'bg-cyan-600 text-white',
    subInactivePill: 'text-slate-700 dark:text-slate-200',
    subHoverPill: 'hover:bg-cyan-100/70 dark:hover:bg-cyan-900/30',
    dot: 'bg-cyan-500',
  },
  taylor: {
    topActiveText: 'text-amber-100',
    topInactiveText: 'text-slate-300',
    topHoverText: 'hover:text-amber-200',
    topActiveUnderline: 'bg-amber-500',
    subBarBg: 'bg-amber-950/25',
    subBarBorder: 'border-amber-800/40',
    subActivePill: 'bg-amber-600 text-white',
    subInactivePill: 'text-slate-200',
    subHoverPill: 'hover:bg-amber-900/30',
    dot: 'bg-amber-500',
  },
};

function getSection(pathname: string): NavSectionKey | null {
  if (pathname.startsWith('/taylor')) return 'taylor';
  if (pathname.startsWith('/turtle')) return 'turtle';
  if (pathname.startsWith('/grail')) return 'grail';
  if (pathname.startsWith('/odid')) return 'odid';
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
  odid: [
    { label: 'Signals', to: '/odid' },
  ],
  taylor: [
    { label: 'Signals', to: '/taylor' },
  ],
};

function OzCtaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ozcta-shield" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F172A" />
          <stop offset="0.5" stopColor="#1E1B4B" />
          <stop offset="1" stopColor="#090D16" />
        </linearGradient>
        <linearGradient id="ozcta-glow" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="0.5" stopColor="#06B6D4" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="ozcta-gold" x1="12" y1="44" x2="48" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="0.5" stopColor="#10B981" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#ozcta-shield)" stroke="url(#ozcta-glow)" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="16" y1="18" x2="16" y2="46" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="48" y1="18" x2="48" y2="46" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
      <rect x="14" y="24" width="4" height="12" rx="1" fill="#10B981" opacity="0.6" />
      <rect x="46" y="20" width="4" height="14" rx="1" fill="#F59E0B" opacity="0.6" />
      <path d="M14 42 L24 34 L32 40 L46 18" stroke="url(#ozcta-gold)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 18 H46 V26" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="46" cy="18" r="3.5" fill="#F59E0B" />
    </svg>
  );
}

type TopGroup = 'futures' | null;

const FUTURES_KEYS: NavSectionKey[] = ['turtle', 'grail', 'odid'];

function getActiveGroup(section: NavSectionKey | null): TopGroup {
  if (section && FUTURES_KEYS.includes(section)) return 'futures';
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
    <nav className="bg-slate-900/90 shadow-xl mb-8 rounded-xl overflow-hidden border border-slate-800/80 backdrop-blur">
      <div className="max-w-7xl mx-auto">
        {/* Top Level Navigation */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800/80">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              aria-label="OzCTA"
              className="group inline-flex items-center gap-2.5 rounded-xl px-3 py-2 -ml-2 transition-colors hover:bg-slate-800/50"
            >
              <span className="relative">
                <OzCtaMark className="h-9 w-9 drop-shadow-md transition-transform duration-300 group-hover:scale-105" />
              </span>
              <span className="leading-tight">
                <span className="block text-xl font-black tracking-tight text-slate-100">
                  Oz<span className="bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">CTA</span>
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
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
                  { key: 'grail' as const, label: 'YouHaveChosenWisely', to: '/grail' },
                  { key: 'odid' as const, label: 'TooHotTooCold', to: '/odid' },
                  { key: 'taylor' as const, label: 'Bradman Cycle', to: '/taylor' },
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
                        : section === 'odid'
                          ? 'OD/ID Breakout'
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
              { key: 'grail' as const, label: 'YouHaveChosenWisely', to: '/grail' },
              { key: 'odid' as const, label: 'TooHotTooCold', to: '/odid' },
              { key: 'taylor' as const, label: 'Bradman Cycle', to: '/taylor' },
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
