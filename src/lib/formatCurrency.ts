/**
 * Format a number as a dollar amount with commas: $1,234.56
 * @param value - The number to format
 * @param decimals - Decimal places (default 2)
 * @param showSign - Whether to prefix with +/- (default false)
 */
export function fmt$(value: number, decimals = 2, showSign = false): string {
  const sign = showSign ? (value >= 0 ? '+' : '') : '';
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${value < 0 ? '-' : sign}$${formatted}`;
}

/**
 * Format a number with commas (no dollar sign): 1,234.56
 */
export function fmtNum(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
