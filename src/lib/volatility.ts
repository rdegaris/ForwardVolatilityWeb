import type { OptionInput, CalculationResult } from '../types/volatility';

/**
 * Standard normal cumulative distribution function
 */
function normCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - probability : probability;
}

/**
 * Black-Scholes option pricing formula
 */
function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  isCall: boolean = true
): number {
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  if (isCall) {
    return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
  }
}

/**
 * Calculate implied volatility using Newton-Raphson method
 */
function calculateImpliedVolatility(
  optionPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  isCall: boolean = true
): number {
  let sigma = 0.5; // Initial guess
  const tolerance = 0.0001;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    const price = blackScholes(S, K, T, r, sigma, isCall);
    const diff = price - optionPrice;

    if (Math.abs(diff) < tolerance) {
      return sigma;
    }

    // Vega calculation for Newton-Raphson
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
    const vega = S * Math.sqrt(T) * normCDF(d1) * 0.3989423 * Math.exp(-d1 * d1 / 2);

    if (vega < 1e-10) {
      break;
    }

    sigma = sigma - diff / vega;

    // Keep sigma positive
    if (sigma <= 0) {
      sigma = 0.01;
    }
  }

  return sigma;
}

/**
 * Calculate forward volatility
 */
export function calculateForwardVolatility(inputs: OptionInput): CalculationResult {
  const {
    frontStrike,
    frontPrice,
    frontDTE,
    backStrike,
    backPrice,
    backDTE,
    underlyingPrice,
    riskFreeRate,
  } = inputs;

  // Convert DTE to years
  const T1 = frontDTE / 365;
  const T2 = backDTE / 365;

  // Calculate implied volatilities
  const frontIV = calculateImpliedVolatility(
    frontPrice,
    underlyingPrice,
    frontStrike,
    T1,
    riskFreeRate,
    true
  );

  const backIV = calculateImpliedVolatility(
    backPrice,
    underlyingPrice,
    backStrike,
    T2,
    riskFreeRate,
    true
  );

  // Calculate forward volatility
  // Formula: σ_forward = sqrt((σ_back² * T2 - σ_front² * T1) / (T2 - T1))
  const numerator = (backIV * backIV * T2) - (frontIV * frontIV * T1);
  const denominator = T2 - T1;

  if (denominator <= 0 || numerator < 0) {
    throw new Error('Invalid calculation: ensure back month expires after front month');
  }

  const forwardVol = Math.sqrt(numerator / denominator);

  return {
    frontIV,
    backIV,
    forwardVol,
  };
}
