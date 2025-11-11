import VolatilityCalculator from '../components/VolatilityCalculator';
import ForwardFactorCalculator from '../components/ForwardFactorCalculator';

export default function Calculator() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Forward Volatility Calculators
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Calculate forward implied volatility for options trading strategies
        </p>
      </div>
      
      {/* Forward Factor Calculator - Direct IV Input */}
      <ForwardFactorCalculator />
      
      {/* Divider */}
      <div className="my-12 border-t-2 border-gray-300 dark:border-gray-600"></div>
      
      {/* Original Calculator - From Option Prices */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Calculate from Option Prices
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Derive implied volatility from option prices using Black-Scholes
        </p>
      </div>
      
      <VolatilityCalculator />
      
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          How It Works
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          The forward volatility represents the implied volatility between two expiration dates. 
          It's calculated using the formula:
        </p>
        <div className="bg-white dark:bg-gray-800 rounded p-4 mb-3 overflow-x-auto">
          <div className="text-center space-y-2">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              Forward Volatility (σ<sub>forward</sub>)
            </div>
            <div className="text-2xl text-gray-900 dark:text-white border-t border-b border-gray-300 dark:border-gray-600 py-3 my-2">
              √[<span className="text-blue-600 dark:text-blue-400">(σ<sub>back</sub>² × T<sub>2</sub>)</span> - <span className="text-red-600 dark:text-red-400">(σ<sub>front</sub>² × T<sub>1</sub>)</span>] / (T<sub>2</sub> - T<sub>1</sub>)
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div>where σ<sub>back</sub> = IV of back month, σ<sub>front</sub> = IV of front month</div>
              <div>T<sub>2</sub> = back month DTE, T<sub>1</sub> = front month DTE (in years)</div>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          This is useful for calendar spread trading to understand the expected volatility 
          in the period between the front and back month expirations.
        </p>
      </div>
    </div>
  );
}
