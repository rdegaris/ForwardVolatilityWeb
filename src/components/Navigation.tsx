import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isForwardVolSection = () => {
    return ['/', '/nasdaq100', '/midcap400', '/iv-rankings', '/calculator', '/trade-tracker'].includes(location.pathname);
  };

  const isEarningsCrushSection = () => {
    return location.pathname.startsWith('/earnings-crush');
  };

  const isPreEarningsSection = () => {
    return location.pathname.startsWith('/pre-earnings');
  };

  const isTurtleSection = () => {
    return location.pathname.startsWith('/turtle');
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md mb-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Level Navigation */}
        <div className="flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-8">
            <Link 
              to="/" 
              className={`text-xl font-bold transition-colors ${
                isForwardVolSection() 
                  ? 'text-slate-900 dark:text-slate-100' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300'
              }`}
            >
              Forward Vol
            </Link>
            
            <Link 
              to="/earnings-crush" 
              className={`text-xl font-bold transition-colors ${
                isEarningsCrushSection() 
                  ? 'text-slate-900 dark:text-slate-100' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300'
              }`}
            >
              Earnings Crush
            </Link>

            <Link
              to="/pre-earnings"
              className={`text-xl font-bold transition-colors ${
                isPreEarningsSection()
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300'
              }`}
            >
              Pre-Earnings Straddles
            </Link>

            <Link
              to="/turtle"
              className={`text-xl font-bold transition-colors ${
                isTurtleSection()
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300'
              }`}
            >
              Turtle
            </Link>
          </div>
          
          <div className="hidden md:block text-sm text-gray-600 dark:text-gray-400">
            Follow and DM me at{' '}
            <a 
              href="https://x.com/OzCTA" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-700 dark:text-indigo-300 hover:underline font-medium"
            >
              @OzCTA
            </a>
            {' '}on X with comments / suggestions
          </div>
        </div>

        {/* Sub Navigation - Forward Vol */}
        {isForwardVolSection() && (
          <div className="flex items-center h-12">
            <div className="flex space-x-2">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Home
              </Link>
              
              <Link
                to="/nasdaq100"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/nasdaq100') 
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                NASDAQ 100
              </Link>
              
              <Link
                to="/midcap400"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/midcap400') 
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                MidCap 400
              </Link>
              
              <Link
                to="/iv-rankings"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/iv-rankings') 
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                IV Rankings
              </Link>
              
              <Link
                to="/calculator"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/calculator') 
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Calculator
              </Link>
              
              <Link
                to="/trade-tracker"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/trade-tracker') 
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Trade Tracker
              </Link>
            </div>
          </div>
        )}

        {/* Sub Navigation - Earnings Crush */}
        {isEarningsCrushSection() && (
          <div className="flex items-center h-12">
            <div className="flex space-x-2">
              <Link
                to="/earnings-crush"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/earnings-crush') 
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Scanner
              </Link>
              
              <Link
                to="/earnings-crush/trades"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/earnings-crush/trades') 
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Trade Tracker
              </Link>
            </div>
          </div>
        )}

        {/* Sub Navigation - Pre-Earnings Straddles */}
        {isPreEarningsSection() && (
          <div className="flex items-center h-12">
            <div className="flex space-x-2">
              <Link
                to="/pre-earnings"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/pre-earnings')
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Opportunities
              </Link>

              <Link
                to="/pre-earnings/open-trades"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/pre-earnings/open-trades')
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Open Trades
              </Link>
            </div>
          </div>
        )}

        {/* Sub Navigation - Turtle */}
        {isTurtleSection() && (
          <div className="flex items-center h-12">
            <div className="flex space-x-2">
              <Link
                to="/turtle"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/turtle')
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Suggested
              </Link>

              <Link
                to="/turtle/open-trades"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/turtle/open-trades')
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Open Trades
              </Link>

              <Link
                to="/turtle/triggers"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/turtle/triggers')
                    ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Triggers Soon
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
