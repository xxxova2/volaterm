import type { BSResult } from './black-scholes';
import { normCdf, normPdf } from './black-scholes';

export interface GreeksResult extends BSResult {
  /** Second-order Greek: sensitivity of delta to volatility changes */
  vanna: number;
  /** Second-order Greek: sensitivity of delta to time decay */
  charm: number;
  /** Second-order Greek: sensitivity of vega to volatility changes (convexity) */
  volga: number;
  /** Third-order Greek: sensitivity of gamma to underlying price changes */
  speed: number;
  /** Second-order Greek: sensitivity of vega to time decay */
  veta: number;
  /** Third-order Greek: sensitivity of gamma to time decay */
  color: number;
  /** Third-order Greek: sensitivity of gamma to volatility changes */
  zomma: number;
  /** Third-order Greek: sensitivity of vega to volatility changes (higher order) */
  ultima: number;
}

/**
 * Calculates comprehensive option Greeks including first, second, and third order sensitivities
 * Extends the basic Black-Scholes model with higher-order Greeks for advanced risk analysis
 * 
 * @param type - Option type ('call' or 'put')
 * @param S - Current spot price of the underlying asset
 * @param K - Strike price of the option
 * @param T - Time to expiration in years
 * @param r - Risk-free interest rate (as decimal)
 * @param q - Dividend yield (as decimal)
 * @param vol - Implied volatility (as decimal)
 * @returns Object containing option price and all Greeks
 */
export function computeGreeks(
  type: 'call' | 'put',
  S: number,
  K: number,
  T: number,
  r: number,
  q: number,
  vol: number,
): GreeksResult {
  const sqrtT = Math.sqrt(T);
  const volSqrtT = vol * sqrtT;
  const d1 = (Math.log(S / K) + (r - q + vol * vol / 2) * T) / volSqrtT;
  const d2 = d1 - volSqrtT;

  const pdf = normPdf(d1);
  const nd2 = type === 'call' ? normCdf(d2) : normCdf(-d2);
  const sign = type === 'call' ? 1 : -1;

  const eq = Math.exp(-q * T);
  const ert = Math.exp(-r * T);

  const delta = sign * eq * (type === 'call' ? normCdf(d1) : normCdf(-d1));
  const gamma = eq * pdf / (S * volSqrtT);
  // Raw mathematical vega (dV/dσ) and theta (dV/dT, T in years).
  const vegaRaw = S * eq * pdf * sqrtT;
  const thetaRaw = (-eq * S * pdf * vol / (2 * sqrtT)
    - r * K * ert * nd2
    + sign * q * S * eq * (type === 'call' ? normCdf(d1) : normCdf(-d1)));
  // Market convention used across the terminal:
  //   θ  → P&L per calendar day   (raw / 365)
  //   ν  → P&L per 1 volatility point (raw / 100)
  const vega = vegaRaw / 100;
  const theta = thetaRaw / 365;
  const rho = sign * K * T * ert * (type === 'call' ? normCdf(d2) : normCdf(-d2));

  const price = type === 'call'
    ? S * eq * normCdf(d1) - K * ert * normCdf(d2)
    : K * ert * normCdf(-d2) - S * eq * normCdf(-d1);

  // Higher-order greeks on mathematical (raw-σ, year) scale of BS.
  // Charm = ∂Δ/∂T (Haug / Wikipedia). Call vs put differ by the q·N(·) term.
  // Consumers that want per-calendar-day charm divide by 365 (see dealerExposure).
  const vanna = -eq * pdf * d2 / vol;
  const charmCore = pdf * (2 * (r - q) * T - d2 * volSqrtT) / (2 * T * volSqrtT);
  const nd1Call = type === 'call' ? normCdf(d1) : normCdf(-d1);
  const charm = type === 'call'
    ? -eq * (charmCore - q * nd1Call)
    : -eq * (charmCore + q * nd1Call);
  const volga = vegaRaw * d1 * d2 / vol;
  const speed = -gamma * (d1 / volSqrtT + 1 / S);
  // Veta = ∂ν/∂T (year); includes full Haug terms
  const veta = -S * eq * pdf * sqrtT * (
    q + ((r - q) * d1) / volSqrtT - (1 + d1 * d2) / (2 * T)
  );
  const color = -eq * pdf / (S * volSqrtT) * (
    2 * q * T + 1
    + (2 * (r - q) * T - d2 * volSqrtT) * d1 / volSqrtT
  ) / (2 * T);
  const zomma = gamma * (d1 * d2 - 1) / vol;
  const ultima = -vegaRaw * (d1 * d2 * (1 - d1 * d2) + d1 * d1 + d2 * d2) / (vol * vol);

  return { price, delta, gamma, theta, vega, rho, vanna, charm, volga, speed, veta, color, zomma, ultima };
}
