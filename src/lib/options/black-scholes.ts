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
  /**
   * Raw θ = ∂V/∂T with T in years (NOT per calendar day).
   * Divide by 365 for market “theta per day”. See computeGreeks for scaled form.
   */
  theta: number;
  /**
   * Raw ν = ∂V/∂σ with σ as a decimal (e.g. 0.20).
   * Divide by 100 for P&L per 1 volatility point. See computeGreeks for scaled form.
   */
  vega: number;
  /** First-order Greek: ∂V/∂r with r as a decimal (not per bp). */
  rho: number;
}

/**
 * Black–Scholes–Merton price and first-order Greeks.
 *
 * Units (raw mathematical — NOT market display conventions):
 *   - theta: ∂V/∂T with T in years (divide by 365 for P&L per calendar day)
 *   - vega:  ∂V/∂σ with σ as a decimal (divide by 100 for P&L per 1 vol point)
 *   - rho:   ∂V/∂r with r as a decimal (divide by 100 for P&L per 1% rate)
 *
 * For market-scaled θ/ν and higher-order greeks, use `computeGreeks` in greeks.ts.
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
  // At/after expiry: intrinsic only. Digital-like delta at the strike.
  if (T <= 0) {
    const price = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    let delta = 0;
    if (type === 'call') delta = S > K ? 1 : S < K ? 0 : 0.5;
    else delta = S < K ? -1 : S > K ? 0 : -0.5;
    return { price, delta, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  // Zero vol → discounted intrinsic (forward intrinsic under continuous rates).
  if (!(vol > 0) || !isFinite(vol)) {
    const dfS = Math.exp(-q * T);
    const dfK = Math.exp(-r * T);
    if (type === 'call') {
      const price = Math.max(0, S * dfS - K * dfK);
      const delta = S * dfS > K * dfK ? dfS : 0;
      return { price, delta, gamma: 0, theta: 0, vega: 0, rho: 0 };
    }
    const price = Math.max(0, K * dfK - S * dfS);
    const delta = K * dfK > S * dfS ? -dfS : 0;
    return { price, delta, gamma: 0, theta: 0, vega: 0, rho: 0 };
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
