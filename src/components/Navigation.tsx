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
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              Forward Vol
            </Link>
            
            <Link 
              to="/earnings-crush" 
              className={`text-xl font-bold transition-colors ${
                isEarningsCrushSection() 
                  ? 'text-teal-600 dark:text-teal-400' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
            >
              Earnings Crush
            </Link>
          </div>
          
          <div className="hidden md:block text-sm text-gray-600 dark:text-gray-400">
            Follow and DM me at{' '}
            <a 
              href="https://x.com/OzCTA" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
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
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Home
              </Link>
              
              <Link
                to="/nasdaq100"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/nasdaq100') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                NASDAQ 100
              </Link>
              
              <Link
                to="/midcap400"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/midcap400') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                MidCap 400
              </Link>
              
              <Link
                to="/iv-rankings"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/iv-rankings') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                IV Rankings
              </Link>
              
              <Link
                to="/calculator"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/calculator') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Calculator
              </Link>
              
              <Link
                to="/trade-tracker"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/trade-tracker') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
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
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Scanner
              </Link>
              
              <Link
                to="/earnings-crush/trades"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/earnings-crush/trades') 
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Trade Tracker
              </Link>

              <Link
                to="/earnings-crush/pre-earnings-straddles"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/earnings-crush/pre-earnings-straddles') 
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Pre-Earnings Straddles
              </Link>

              <Link
                to="/earnings-crush/pre-earnings-trades"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/earnings-crush/pre-earnings-trades') 
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Open Trades
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
