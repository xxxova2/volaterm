/**
 * Calculates the cumulative distribution function (CDF) of the standard normal distribution
 * Uses the Abramowitz and Stegun approximation (Formula 26.2.17)
 * @param x - The value at which to evaluate the CDF
 * @returns The probability that a standard normal random variable is less than or equal to x
 */
export function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/**
 * Calculates the probability density function (PDF) of the standard normal distribution
 * @param x - The value at which to evaluate the PDF
 * @returns The probability density at x
 */
export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface BSResult {
  /** Option price (premium) */
  price: number;
  /** First-order Greek: sensitivity to underlying price changes */
  delta: number;
  /** Second-order Greek: sensitivity of delta to underlying price changes */
  gamma: number;
  /** First-order Greek: sensitivity to time decay (per day) */
  theta: number;
  /** First-order Greek: sensitivity to volatility changes (per 1% change) */
  vega: number;
  /** First-order Greek: sensitivity to interest rate changes */
  rho: number;
}

/**
 * Calculates option price and first-order Greeks using the Black-Scholes model
 * @param type - Option type ('call' or 'put')
 * @param S - Current spot price of the underlying asset
 * @param K - Strike price of the option
 * @param T - Time to expiration in years
 * @param r - Risk-free interest rate (as decimal, e.g., 0.05 for 5%)
 * @param q - Dividend yield (as decimal, e.g., 0.01 for 1%)
 * @param vol - Implied volatility (as decimal, e.g., 0.2 for 20%)
 * @returns Object containing option price and Greeks
 */
export function blackScholes(
  type: 'call' | 'put',
  S: number,
  K: number,
  T: number,
  r: number,
  q: number,
  vol: number,
): BSResult {
  // Handle expiration edge case: options are worth intrinsic value, Greeks are zero
  if (T <= 0) {
    const price = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + vol * vol / 2) * T) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;

  if (type === 'call') {
    const price = S * Math.exp(-q * T) * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
    const delta = Math.exp(-q * T) * normCdf(d1);
    const gamma = Math.exp(-q * T) * normPdf(d1) / (S * vol * sqrtT);
    const theta = (-Math.exp(-q * T) * S * normPdf(d1) * vol / (2 * sqrtT)
      - r * K * Math.exp(-r * T) * normCdf(d2)
      + q * S * Math.exp(-q * T) * normCdf(d1));
    const vega = S * Math.exp(-q * T) * normPdf(d1) * sqrtT;
    const rho = K * T * Math.exp(-r * T) * normCdf(d2);
    return { price, delta, gamma, theta, vega, rho };
  }

  const price = K * Math.exp(-r * T) * normCdf(-d2) - S * Math.exp(-q * T) * normCdf(-d1);
  const delta = -Math.exp(-q * T) * normCdf(-d1);
  const gamma = Math.exp(-q * T) * normPdf(d1) / (S * vol * sqrtT);
  const theta = (-Math.exp(-q * T) * S * normPdf(d1) * vol / (2 * sqrtT)
    + r * K * Math.exp(-r * T) * normCdf(-d2)
    - q * S * Math.exp(-q * T) * normCdf(-d1));
  const vega = S * Math.exp(-q * T) * normPdf(d1) * sqrtT;
  const rho = -K * T * Math.exp(-r * T) * normCdf(-d2);
  return { price, delta, gamma, theta, vega, rho };
}
