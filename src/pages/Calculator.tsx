import VolatilityCalculator from '../components/VolatilityCalculator';

export default function Calculator() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Forward Volatility Calculator
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Calculate forward implied volatility for options trading strategies
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
        <div className="bg-white dark:bg-gray-800 rounded p-3 mb-3 font-mono text-sm">
          σ_forward = √[(σ_back² × T₂ - σ_front² × T₁) / (T₂ - T₁)]
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          This is useful for calendar spread trading to understand the expected volatility 
          in the period between the front and back month expirations.
        </p>
      </div>
    </div>
  );
}
