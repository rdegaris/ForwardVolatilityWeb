import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { ChevronDownIcon, XIcon } from './Icons';

type NavSectionKey =
  | 'forward'
  | 'earningsCrush'
  | 'preEarnings'
  | 'turtle'
  | 'grail'
  | 'odid'
  | 'taylor'
  | 'linda'
  | 'demark';

function getSection(pathname: string): NavSectionKey | null {
  if (pathname.startsWith('/taylor')) return 'taylor';
  if (pathname.startsWith('/linda')) return 'linda';
  if (pathname.startsWith('/demark')) return 'demark';
  if (pathname.startsWith('/trendorama') || pathname.startsWith('/turtle')) return 'turtle';
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
  ) {
    return 'forward';
  }
  return null;
}

type NavItem = { label: string; to: string };

const STRATEGY_LINKS: Array<{ key: NavSectionKey; label: string; meta: string; to: string }> = [
  { key: 'turtle', label: 'Trendorama', meta: '55-day breakout', to: '/trendorama' },
  { key: 'taylor', label: 'The Bradman', meta: 'Globex 1h + 3-day cycle', to: '/taylor' },
  { key: 'grail', label: 'YouHaveChosenWisely', meta: 'ADX / EMA pullback', to: '/grail' },
  { key: 'odid', label: 'TooHot TooCold', meta: 'Range expansion', to: '/odid' },
  { key: 'linda', label: 'The Linda', meta: '15m EMA reversion', to: '/linda' },
  { key: 'demark', label: 'LeMark Sequential', meta: 'Sell Countdown 13', to: '/demark' },
];

const SECTION_LABELS: Record<NavSectionKey, string> = {
  forward: 'Forward vol',
  earningsCrush: 'Earnings crush',
  preEarnings: 'Earnings ramp',
  turtle: 'Trendorama',
  grail: 'YouHaveChosenWisely',
  odid: 'TooHot TooCold',
  taylor: 'The Bradman',
  linda: 'The Linda',
  demark: 'LeMark Sequential',
};

const SUB_NAV: Record<NavSectionKey, NavItem[]> = {
  forward: [
    { label: 'NASDAQ 100', to: '/nasdaq100' },
    { label: 'MidCap 400', to: '/midcap400' },
    { label: 'IV rankings', to: '/iv-rankings' },
    { label: 'Calculator', to: '/calculator' },
    { label: 'Trade tracker', to: '/trade-tracker' },
  ],
  earningsCrush: [
    { label: 'Scanner', to: '/earnings-crush' },
    { label: 'Trade tracker', to: '/earnings-crush/trades' },
  ],
  preEarnings: [
    { label: 'Opportunities', to: '/pre-earnings' },
    { label: 'Open trades', to: '/pre-earnings/open-trades' },
  ],
  turtle: [
    { label: 'Signals', to: '/trendorama' },
    { label: 'Open trades', to: '/trendorama/open-trades' },
    { label: 'Triggers soon', to: '/trendorama/triggers' },
    { label: 'Executed trades', to: '/executed-trades' },
  ],
  grail: [
    { label: 'Signals', to: '/grail' },
    { label: 'Executed trades', to: '/executed-trades' },
  ],
  odid: [
    { label: 'Signals', to: '/odid' },
    { label: 'Executed trades', to: '/executed-trades' },
  ],
  taylor: [
    { label: 'Signals', to: '/taylor' },
    { label: 'Executed trades', to: '/executed-trades' },
  ],
  linda: [
    { label: 'Signals', to: '/linda' },
    { label: 'Executed trades', to: '/executed-trades' },
  ],
  demark: [
    { label: 'Signals & Countdown', to: '/demark' },
    { label: 'Executed trades', to: '/executed-trades' },
  ],
};

function OzCtaMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="7"
        fill="#19191b"
        stroke="#ededed"
        strokeOpacity="0.14"
        strokeWidth="1"
      />
      <path
        d="M8 21 L13.5 15.5 L17.5 18.5 L23.5 10.5"
        stroke="#ededed"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.5" cy="10.5" r="2" fill="#4cc38a" />
    </svg>
  );
}

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const section = getSection(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [strategiesOpen, setStrategiesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setStrategiesOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStrategiesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const isFuturesSection = section && STRATEGY_LINKS.some((s) => s.key === section);

  const navItemClass = (active: boolean) =>
    `h-8 px-3 rounded-lg text-sm inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors duration-150 ease-desk ${
      active
        ? 'bg-desk-raised text-desk-text font-medium shadow-inset-top border border-hairline'
        : 'text-desk-secondary hover:text-desk-text hover:bg-desk-raised/50'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-desk-deep border-b border-hairline">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Left: Brand + Primary links */}
          <div className="flex items-center gap-4 xl:gap-5 min-w-0">
            <Link
              to="/"
              aria-label="OzCTA home"
              className="inline-flex items-center gap-2.5 rounded-lg py-1 pr-2 transition-opacity duration-150 ease-desk hover:opacity-90"
            >
              <OzCtaMark className="w-7 h-7 shrink-0" />
              <div className="flex items-baseline gap-2">
                <span className="text-[17px] font-semibold tracking-tight text-desk-text leading-none">
                  OzCTA
                </span>
                <span className="hidden xl:inline text-xs text-desk-muted">
                  Futures desk
                </span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
              <Link to="/" className={navItemClass(location.pathname === '/')}>
                Dashboard
              </Link>

              {/* Futures strategies dropdown on lg/xl/2xl, inline on ultra-wide min-[1720px] */}
              <div ref={dropdownRef} className="relative min-[1720px]:hidden">
                <button
                  type="button"
                  onClick={() => setStrategiesOpen((o) => !o)}
                  aria-expanded={strategiesOpen}
                  className={navItemClass(Boolean(isFuturesSection || strategiesOpen))}
                >
                  <span className="flex items-center gap-1.5">
                    {isFuturesSection && <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />}
                    <span>{isFuturesSection && section ? SECTION_LABELS[section] : 'Strategies'}</span>
                  </span>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-desk-muted transition-transform duration-150 ease-desk ${
                      strategiesOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {strategiesOpen && (
                  <div className="absolute left-0 mt-2 w-64 rounded-xl bg-desk-card border border-hairline-strong p-1.5 shadow-xl z-50">
                    {STRATEGY_LINKS.map((item) => {
                      const active = section === item.key;
                      return (
                        <Link
                          key={item.key}
                          to={item.to}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 ease-desk ${
                            active
                              ? 'bg-desk-raised text-desk-text font-medium'
                              : 'text-desk-secondary hover:text-desk-text hover:bg-desk-raised/60'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                active ? 'bg-desk-up' : 'bg-desk-muted/50'
                              }`}
                            />
                            <span>{item.label}</span>
                          </span>
                          <span className="text-[11px] font-mono text-desk-muted">{item.meta.split(' ')[0]}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="hidden min-[1720px]:flex items-center gap-1">
                {STRATEGY_LINKS.map((item) => (
                  <Link
                    key={item.key}
                    to={item.to}
                    className={navItemClass(section === item.key)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <Link
                to="/executed-trades"
                className={navItemClass(
                  location.pathname === '/executed-trades' || location.pathname === '/paper-trades'
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
                Executed trades
              </Link>

              <Link to="/fund" className={navItemClass(location.pathname === '/fund')}>
                Program
              </Link>
            </nav>
          </div>

          {/* Right: Auth controls (one button max, Log in as quiet text link) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0 whitespace-nowrap">
            {isAuthenticated ? (
              <>
                <span className="text-xs text-desk-muted whitespace-nowrap shrink-0">
                  Signed in as <span className="text-desk-secondary font-medium">{user?.firstName || user?.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="h-8 px-2.5 rounded-lg text-sm text-desk-secondary hover:text-desk-text hover:bg-desk-raised/60 transition-colors duration-150 ease-desk whitespace-nowrap shrink-0"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-desk-secondary hover:text-desk-text transition-colors duration-150 ease-desk whitespace-nowrap shrink-0"
                >
                  Log in
                </Link>
                <Link to="/register" className="desk-btn-primary h-8 px-3.5 text-xs whitespace-nowrap shrink-0">
                  Create account
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="lg:hidden desk-btn-secondary h-9 px-3 text-xs"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? (
              <>
                <XIcon className="w-4 h-4 text-desk-secondary" />
                <span>Close</span>
              </>
            ) : (
              <span>Menu</span>
            )}
          </button>
        </div>
      </div>

      {/* Contextual Sub-Navigation Strip */}
      {section && SUB_NAV[section] && (
        <div className="border-t border-hairline bg-desk-bg/80">
          <div className="max-w-[1760px] mx-auto px-4 sm:px-6 md:px-8 h-10 flex items-center gap-3 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span className="flex items-center gap-2 text-xs font-medium text-desk-secondary shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              {SECTION_LABELS[section]}
            </span>
            <span className="h-3.5 w-px bg-desk-raised shrink-0" />
            <div className="flex items-center gap-1">
              {SUB_NAV[section].map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`h-7 px-2.5 rounded-md text-xs inline-flex items-center transition-colors duration-150 ease-desk ${
                      active
                        ? 'bg-desk-raised text-desk-text font-medium border border-hairline'
                        : 'text-desk-muted hover:text-desk-text hover:bg-desk-card'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation Sheet */}
      {menuOpen && (
        <div className="lg:hidden border-t border-hairline bg-desk-deep px-6 py-4 space-y-4">
          <div className="space-y-1">
            <Link
              to="/"
              className="flex items-center h-9 px-3 rounded-lg text-sm text-desk-text hover:bg-desk-raised"
            >
              Dashboard
            </Link>
            <Link
              to="/executed-trades"
              className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm text-desk-text hover:bg-desk-raised"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-desk-up" />
              Executed trades
            </Link>
            <Link
              to="/fund"
              className="flex items-center h-9 px-3 rounded-lg text-sm text-desk-text hover:bg-desk-raised"
            >
              Program profile
            </Link>
          </div>

          <div className="pt-3 border-t border-hairline">
            <div className="px-3 pb-2 text-xs text-desk-muted">Futures strategies</div>
            <div className="space-y-1">
              {STRATEGY_LINKS.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  className="flex items-center justify-between h-9 px-3 rounded-lg text-sm text-desk-secondary hover:text-desk-text hover:bg-desk-raised"
                >
                  <span>{item.label}</span>
                  <span className="text-xs font-mono text-desk-muted">{item.meta}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-hairline flex items-center justify-between gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-xs text-desk-muted px-3">
                  {user?.firstName || user?.email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="desk-btn-secondary h-9 px-4 text-xs"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-desk-secondary px-3">
                  Log in
                </Link>
                <Link to="/register" className="desk-btn-primary h-9 px-4 text-xs">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
