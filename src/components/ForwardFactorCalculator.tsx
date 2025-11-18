import { useState } from 'react';
import { getTodayDatePacific } from '../lib/dateUtils';

interface ForwardFactorInputs {
  frontIV: string;
  backIV: string;
  frontDate: string;
  backDate: string;
}

interface ForwardFactorResults {
  forwardVol: number;
  forwardFactor: number;
  frontDTE: number;
  backDTE: number;
  dateRange: string;
}

export default function ForwardFactorCalculator() {
  const [inputs, setInputs] = useState<ForwardFactorInputs>({
    frontIV: '',
    backIV: '',
    frontDate: '',
    backDate: ''
  });

  const [results, setResults] = useState<ForwardFactorResults | null>(null);
  const [error, setError] = useState<string>('');

  // Calculate DTE from a date string
  const calculateDTE = (dateStr: string): number => {
    const targetDate = new Date(dateStr);
    const today = getTodayDatePacific();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Calculate forward volatility and forward factor
  const calculate = () => {
    setError('');
    
    try {
      // Validate inputs
      const frontIV = parseFloat(inputs.frontIV);
      const backIV = parseFloat(inputs.backIV);
      
      if (isNaN(frontIV) || isNaN(backIV)) {
        setError('Please enter valid IV values');
        return;
      }

      if (frontIV <= 0 || frontIV > 1000 || backIV <= 0 || backIV > 1000) {
        setError('IV must be between 1 and 1000');
        return;
      }

      if (!inputs.frontDate || !inputs.backDate) {
        setError('Please select both dates');
        return;
      }

      const frontDTE = calculateDTE(inputs.frontDate);
      const backDTE = calculateDTE(inputs.backDate);

      if (frontDTE <= 0 || backDTE <= 0) {
        setError('Dates must be in the future');
        return;
      }

      if (frontDTE >= backDTE) {
        setError('Front date must be before back date');
        return;
      }

      // Convert to decimal (IV is input as percentage)
      const sigma1 = frontIV / 100;
      const sigma2 = backIV / 100;

      // Convert DTE to years
      const T1 = frontDTE / 365;
      const T2 = backDTE / 365;

      // Calculate forward variance
      const forwardVariance = (sigma2 * sigma2 * T2 - sigma1 * sigma1 * T1) / (T2 - T1);

      if (forwardVariance < 0) {
        setError('Negative forward variance - front IV too high or back IV too low');
        return;
      }

      // Calculate forward volatility
      const forwardVol = Math.sqrt(forwardVariance);

      // Calculate forward factor: (Front IV - Forward Vol) / Forward Vol
      const forwardFactor = (sigma1 - forwardVol) / forwardVol;

      setResults({
        forwardVol: forwardVol * 100, // Convert back to percentage
        forwardFactor: forwardFactor * 100, // As percentage
        frontDTE,
        backDTE,
        dateRange: `${formatDate(inputs.frontDate)} and ${formatDate(inputs.backDate)}`
      });
    } catch (err) {
      setError('Calculation error: ' + (err as Error).message);
    }
  };

  const handleInputChange = (field: keyof ForwardFactorInputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setResults(null); // Clear results when inputs change
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Forward Volatility / Forward Factor Calculator
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Calculate forward volatility and forward factor between two dates
        </p>
      </div>

      {/* Inputs */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Inputs</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Front IV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Front IV (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              max="1000"
              value={inputs.frontIV}
              onChange={(e) => handleInputChange('frontIV', e.target.value)}
              placeholder="61.87"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              IV in percent (1-1000)
            </span>
          </div>

          {/* Back IV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Back IV (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              max="1000"
              value={inputs.backIV}
              onChange={(e) => handleInputChange('backIV', e.target.value)}
              placeholder="52.11"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              IV in percent (1-1000)
            </span>
          </div>

          {/* Front Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Front Date
            </label>
            <input
              type="date"
              value={inputs.frontDate}
              onChange={(e) => handleInputChange('frontDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {inputs.frontDate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {calculateDTE(inputs.frontDate)} DTE
              </span>
            )}
          </div>

          {/* Back Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Back Date
            </label>
            <input
              type="date"
              value={inputs.backDate}
              onChange={(e) => handleInputChange('backDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {inputs.backDate && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {calculateDTE(inputs.backDate)} DTE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="mb-6">
        <button
          onClick={calculate}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-md transition duration-200 ease-in-out transform hover:scale-105"
        >
          Calculate
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Results</h3>
          
          {/* Result Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Forward Volatility Card */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
              <h4 className="text-sm font-medium opacity-90 mb-2">
                Forward Volatility
              </h4>
              <div className="text-4xl font-bold mb-2">
                {results.forwardVol.toFixed(2)}%
              </div>
              <div className="text-sm opacity-80">
                Between {results.dateRange}
              </div>
            </div>

            {/* Forward Factor Card */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
              <h4 className="text-sm font-medium opacity-90 mb-2">
                Forward Factor
              </h4>
              <div className={`text-4xl font-bold mb-2 ${results.forwardFactor > 0 ? 'text-green-300' : 'text-red-300'}`}>
                {results.forwardFactor > 0 ? '+' : ''}{results.forwardFactor.toFixed(2)}%
              </div>
              <div className="text-sm opacity-80">
                (Front IV / Forward Vol) - 1
              </div>
            </div>
          </div>

          {/* Calculation Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
              Calculation Details
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                <span className="text-gray-700 dark:text-gray-300">Front DTE:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{results.frontDTE} days</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                <span className="text-gray-700 dark:text-gray-300">Back DTE:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{results.backDTE} days</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                <span className="text-gray-700 dark:text-gray-300">Time Spread:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{results.backDTE - results.frontDTE} days</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                <span className="text-gray-700 dark:text-gray-300">Front IV:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{inputs.frontIV}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                <span className="text-gray-700 dark:text-gray-300">Back IV:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{inputs.backIV}%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-700 dark:text-gray-300">Forward Volatility:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{results.forwardVol.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Interpretation */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              Interpretation
            </h4>
            {results.forwardFactor > 40 ? (
              <p className="text-green-700 dark:text-green-400">
                <span className="text-2xl">✅</span> <strong>Strong Opportunity:</strong> Forward Factor above 40% indicates front-month IV is significantly elevated. 
                Consider calendar spreads to capture the volatility term structure edge.
              </p>
            ) : results.forwardFactor > 20 ? (
              <p className="text-orange-700 dark:text-orange-400">
                <span className="text-2xl">⚠️</span> <strong>Moderate Opportunity:</strong> Forward Factor above 20% suggests a potential calendar spread opportunity.
                Front-month IV is elevated relative to forward volatility.
              </p>
            ) : results.forwardFactor > 0 ? (
              <p className="text-blue-700 dark:text-blue-400">
                <span className="text-2xl">📊</span> <strong>Positive FF:</strong> Front IV is higher than forward vol, but the edge may be small.
                Consider other factors before entering a trade.
              </p>
            ) : (
              <p className="text-red-700 dark:text-red-400">
                <span className="text-2xl">❌</span> <strong>Negative FF:</strong> Front IV is lower than forward volatility. 
                Calendar spreads are not favorable in this term structure.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
