import { Link, useLocation } from 'react-router-dom';

type NavSectionKey = 'forward' | 'earningsCrush' | 'preEarnings' | 'turtle';

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
};

function getSection(pathname: string): NavSectionKey {
  if (pathname.startsWith('/turtle')) return 'turtle';
  if (pathname.startsWith('/pre-earnings')) return 'preEarnings';
  if (pathname.startsWith('/earnings-crush')) return 'earningsCrush';
  return 'forward';
}

type NavItem = { label: string; to: string };

const SUB_NAV: Record<NavSectionKey, NavItem[]> = {
  forward: [
    { label: 'Home', to: '/' },
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
    { label: 'Suggested', to: '/turtle' },
    { label: 'Signals', to: '/turtle/signals' },
    { label: 'Open Trades', to: '/turtle/open-trades' },
    { label: 'Triggers Soon', to: '/turtle/triggers' },
  ],
};

export default function Navigation() {
  const location = useLocation();

  const section = getSection(location.pathname);
  const accent = ACCENTS[section];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white/90 dark:bg-slate-900/60 shadow-md mb-8 rounded-xl overflow-hidden border border-slate-200/70 dark:border-slate-800/60 backdrop-blur">
      <div className="max-w-7xl mx-auto">
        {/* Top Level Navigation */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200/70 dark:border-slate-800/60">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Options Scanners
            </Link>

            <div className="hidden sm:flex items-center gap-2">
              {(
                [
                  { key: 'forward' as const, label: 'Forward Vol', to: '/' },
                  { key: 'earningsCrush' as const, label: 'Earnings Crush', to: '/earnings-crush' },
                  { key: 'preEarnings' as const, label: 'Pre-Earnings', to: '/pre-earnings' },
                  { key: 'turtle' as const, label: 'Turtle', to: '/turtle' },
                ] satisfies Array<{ key: NavSectionKey; label: string; to: string }>
              ).map((item) => {
                const isSectionActive = section === item.key;
                const a = ACCENTS[item.key];
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    className={`relative px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isSectionActive ? a.topActiveText : `${a.topInactiveText} ${a.topHoverText}`
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${a.dot} ${isSectionActive ? 'opacity-100' : 'opacity-35'}`} />
                      {item.label}
                    </span>
                    {isSectionActive && (
                      <span className={`absolute left-3 right-3 -bottom-[9px] h-[3px] rounded-full ${a.topActiveUnderline}`} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="hidden md:block text-sm text-slate-600 dark:text-slate-300">
            Follow and DM me at{' '}
            <a
              href="https://x.com/OzCTA"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-900 dark:text-slate-100 hover:underline"
            >
              @OzCTA
            </a>
          </div>
        </div>

        {/* Sub Navigation (connected to active section via tint + dot rail) */}
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
                      ? 'Pre-Earnings'
                      : 'Turtle'}
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
          <div className="sm:hidden mt-3 flex flex-wrap gap-2">
            {(
              [
                { key: 'forward' as const, label: 'Forward Vol', to: '/' },
                { key: 'earningsCrush' as const, label: 'Earnings Crush', to: '/earnings-crush' },
                { key: 'preEarnings' as const, label: 'Pre-Earnings', to: '/pre-earnings' },
                { key: 'turtle' as const, label: 'Turtle', to: '/turtle' },
              ] satisfies Array<{ key: NavSectionKey; label: string; to: string }>
            ).map((item) => {
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
          </div>
        </div>
      </div>
    </nav>
  );
}
