/**
 * Option Pricing Utilities
 * Black-Scholes pricing and Greeks estimation for calendar spread P&L
 */

// Standard normal CDF
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Standard normal PDF
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface OptionGreeks {
  price: number;
  delta: number;
  gamma: number;
  theta: number;  // Per day
  vega: number;   // Per 1% IV change
}

export interface CalendarSpreadEstimate {
  frontPrice: number;
  backPrice: number;
  spreadPrice: number;
  spreadDelta: number;
  spreadGamma: number;
  spreadTheta: number;  // Per day (should be positive for calendar spreads)
  spreadVega: number;   // Should be positive (long vega)
  estimatedPnL: number;
  priceChange: number;
  priceChangePct: number;
  // Debug info for verification
  frontIVUsed: number;  // Implied volatility used for front month
  backIVUsed: number;   // Implied volatility used for back month
  frontIVEstimated: number; // IV estimated from current price
  backIVEstimated: number;  // IV estimated from current price
}

/**
 * Calculate Black-Scholes price and Greeks for a European option
 * 
 * @param S - Current stock price
 * @param K - Strike price
 * @param T - Time to expiration in years
 * @param r - Risk-free rate (e.g., 0.05 for 5%)
 * @param sigma - Implied volatility (e.g., 0.30 for 30%)
 * @param isCall - true for call, false for put
 */
export function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  isCall: boolean
): OptionGreeks {
  // Handle edge case: at expiration
  if (T <= 0) {
    const intrinsic = isCall ? Math.max(0, S - K) : Math.max(0, K - S);
    const delta = isCall 
      ? (S > K ? 1 : S < K ? 0 : 0.5)
      : (S < K ? -1 : S > K ? 0 : -0.5);
    return {
      price: intrinsic,
      delta,
      gamma: 0,
      theta: 0,
      vega: 0,
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = normalCDF(d1);
  const Nd2 = normalCDF(d2);
  const nd1 = normalPDF(d1);

  let price: number;
  let delta: number;

  if (isCall) {
    price = S * Nd1 - K * Math.exp(-r * T) * Nd2;
    delta = Nd1;
  } else {
    price = K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
    delta = Nd1 - 1;
  }

  // Gamma (same for calls and puts)
  const gamma = nd1 / (S * sigma * sqrtT);

  // Theta (per day - divide by 365)
  const thetaAnnual = isCall
    ? -(S * nd1 * sigma) / (2 * sqrtT) - r * K * Math.exp(-r * T) * Nd2
    : -(S * nd1 * sigma) / (2 * sqrtT) + r * K * Math.exp(-r * T) * normalCDF(-d2);
  const theta = thetaAnnual / 365;

  // Vega (per 1% IV change - already normalized)
  const vegaRaw = S * sqrtT * nd1;
  const vega = vegaRaw / 100; // Per 1% change

  return {
    price: Math.max(0, price),
    delta,
    gamma,
    theta,
    vega,
  };
}

/**
 * Convert DTE to years
 */
export function dteToYears(expirationDate: string): number {
  const expiration = new Date(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiration.setHours(0, 0, 0, 0);
  
  const diffMs = expiration.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  return Math.max(0, diffDays / 365);
}

/**
 * Estimate implied volatility from option price using Newton-Raphson
 */
export function estimateIV(
  price: number,
  S: number,
  K: number,
  T: number,
  r: number,
  isCall: boolean
): number {
  if (T <= 0 || price <= 0) return 0.30; // Default fallback
  
  let sigma = 0.30; // Initial guess
  const maxIterations = 100;
  const tolerance = 0.0001;
  
  for (let i = 0; i < maxIterations; i++) {
    const result = blackScholes(S, K, T, r, sigma, isCall);
    const diff = result.price - price;
    
    if (Math.abs(diff) < tolerance) {
      return sigma;
    }
    
    // Newton-Raphson step
    const vega = result.vega * 100; // Convert back to raw vega
    if (vega < 0.0001) {
      break;
    }
    
    sigma = sigma - diff / vega;
    
    // Keep sigma in reasonable bounds
    sigma = Math.max(0.01, Math.min(3.0, sigma));
  }
  
  return sigma;
}

export interface CalendarSpreadOptions {
  /** Days forward to simulate (0 = today, 1 = tomorrow) */
  daysForward?: number;
  /** 
   * Post-earnings target IV for front month (e.g., 0.35 = 35%)
   * If not set, falls back to frontIVCrush percentage reduction
   */
  frontTargetIV?: number;
  /** 
   * Post-earnings target IV for back month (e.g., 0.40 = 40%)  
   * If not set, falls back to backIVCrush percentage reduction
   */
  backTargetIV?: number;
  /** IV crush percentage for front month (legacy, use targetIV instead) */
  frontIVCrush?: number;
  /** IV crush percentage for back month (legacy, use targetIV instead) */
  backIVCrush?: number;
  /** Risk-free rate */
  riskFreeRate?: number;
}

/**
 * Estimate calendar spread value at a new underlying price
 * 
 * @param currentUnderlying - Current underlying price
 * @param newUnderlying - New underlying price to estimate
 * @param strike - Strike price
 * @param frontExpiration - Front month expiration date (YYYY-MM-DD)
 * @param backExpiration - Back month expiration date (YYYY-MM-DD)
 * @param frontCurrentPrice - Current front month option price
 * @param backCurrentPrice - Current back month option price
 * @param quantity - Number of spreads
 * @param isCall - true for call calendar, false for put
 * @param options - Additional options for time/IV simulation
 */
export function estimateCalendarSpread(
  currentUnderlying: number,
  newUnderlying: number,
  strike: number,
  frontExpiration: string,
  backExpiration: string,
  frontCurrentPrice: number,
  backCurrentPrice: number,
  quantity: number,
  isCall: boolean = true,
  options: CalendarSpreadOptions = {}
): CalendarSpreadEstimate {
  const {
    daysForward = 0,
    frontTargetIV,
    backTargetIV,
    frontIVCrush = 0,
    backIVCrush = 0,
    riskFreeRate = 0.05,
  } = options;

  // Current time to expiration
  const frontT = dteToYears(frontExpiration);
  const backT = dteToYears(backExpiration);
  
  // Adjusted time for future date simulation
  const daysForwardYears = daysForward / 365;
  const frontTNew = Math.max(0, frontT - daysForwardYears);
  const backTNew = Math.max(0, backT - daysForwardYears);
  
  // Estimate current IVs from prices
  const frontIV = estimateIV(frontCurrentPrice, currentUnderlying, strike, frontT, riskFreeRate, isCall);
  const backIV = estimateIV(backCurrentPrice, currentUnderlying, strike, backT, riskFreeRate, isCall);
  
  // Determine post-earnings IV:
  // If target IV is set, use it directly (better for post-earnings modeling)
  // Otherwise fall back to percentage-based crush
  const frontIVNew = frontTargetIV !== undefined 
    ? frontTargetIV 
    : frontIV * (1 - frontIVCrush);
  const backIVNew = backTargetIV !== undefined 
    ? backTargetIV 
    : backIV * (1 - backIVCrush);
  
  // Calculate new prices at the new underlying level, new time, and crushed IV
  const frontNew = blackScholes(newUnderlying, strike, frontTNew, riskFreeRate, frontIVNew, isCall);
  const backNew = blackScholes(newUnderlying, strike, backTNew, riskFreeRate, backIVNew, isCall);
  
  const currentSpread = backCurrentPrice - frontCurrentPrice;
  const newSpread = backNew.price - frontNew.price;
  
  // Calendar spread Greeks (long back, short front)
  const spreadDelta = backNew.delta - frontNew.delta;
  const spreadGamma = backNew.gamma - frontNew.gamma;
  const spreadTheta = backNew.theta - frontNew.theta; // Should be positive (front theta decays faster)
  const spreadVega = backNew.vega - frontNew.vega;    // Should be positive (long net vega)
  
  // P&L calculation
  const spreadChange = newSpread - currentSpread;
  const estimatedPnL = spreadChange * quantity * 100;
  
  return {
    frontPrice: frontNew.price,
    backPrice: backNew.price,
    spreadPrice: newSpread,
    spreadDelta,
    spreadGamma,
    spreadTheta,
    spreadVega,
    estimatedPnL,
    priceChange: newUnderlying - currentUnderlying,
    priceChangePct: ((newUnderlying - currentUnderlying) / currentUnderlying) * 100,
    frontIVUsed: frontIVNew,
    backIVUsed: backIVNew,
    frontIVEstimated: frontIV,
    backIVEstimated: backIV,
  };
}

/**
 * Generate P&L scenarios for a range of prices
 */
export function generatePnLScenarios(
  currentUnderlying: number,
  strike: number,
  frontExpiration: string,
  backExpiration: string,
  frontCurrentPrice: number,
  backCurrentPrice: number,
  quantity: number,
  isCall: boolean = true,
  priceRange: { min: number; max: number; step: number } = { min: -15, max: 15, step: 1 }
): CalendarSpreadEstimate[] {
  const scenarios: CalendarSpreadEstimate[] = [];
  
  for (let pctChange = priceRange.min; pctChange <= priceRange.max; pctChange += priceRange.step) {
    const newPrice = currentUnderlying * (1 + pctChange / 100);
    const estimate = estimateCalendarSpread(
      currentUnderlying,
      newPrice,
      strike,
      frontExpiration,
      backExpiration,
      frontCurrentPrice,
      backCurrentPrice,
      quantity,
      isCall
    );
    scenarios.push(estimate);
  }
  
  return scenarios;
}
