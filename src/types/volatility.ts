export interface OptionInput {
  frontStrike: number;
  frontPrice: number;
  frontDTE: number;
  backStrike: number;
  backPrice: number;
  backDTE: number;
  underlyingPrice: number;
  riskFreeRate: number;
}

export interface CalculationResult {
  frontIV: number;
  backIV: number;
  forwardVol: number;
}
