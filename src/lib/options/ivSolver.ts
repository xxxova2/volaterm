import { blackScholes } from './black-scholes';

/**
 * Brenner–Subrahmanyam ATM seed, clamped to a sane band.
 * Better than a fixed 30% start for weekly / high-vol names.
 */
function initialVolGuess(
  type: 'call' | 'put',
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  q: number,
): number {
  const F = S * Math.exp((r - q) * T);
  const disc = Math.exp(-r * T);
  // Extrinsic relative to discounted intrinsic on the forward.
  const intrinsic =
    type === 'call' ? Math.max(0, disc * (F - K)) : Math.max(0, disc * (K - F));
  const extrinsic = Math.max(1e-8, marketPrice - intrinsic * 0.5);
  // Classic ATM approximation: C ≈ 0.4 S σ √T  →  σ ≈ C / (0.4 S √T)
  const atmSeed = extrinsic / (0.3989 * S * Math.sqrt(T) + 1e-12);
  const moneyness = Math.abs(Math.log(S / K)) / Math.sqrt(T);
  const seed = Math.max(atmSeed, moneyness * 0.5);
  if (!isFinite(seed) || seed <= 0) return 0.25;
  return Math.min(3, Math.max(0.03, seed));
}

export function impliedVol(
  type: 'call' | 'put',
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  q: number,
): number | null {
  if (marketPrice <= 0 || T <= 0 || S <= 0 || K <= 0) return null;

  const intrinsic = type === 'call'
    ? Math.max(S * Math.exp(-q * T) - K * Math.exp(-r * T), 0)
    : Math.max(K * Math.exp(-r * T) - S * Math.exp(-q * T), 0);
  if (marketPrice < intrinsic * 0.99) return null;

  if (T < 1 / (365 * 24)) {
    // Sub-hour residual: avoid singular solver; return a rough local vol proxy.
    const approx = Math.abs(Math.log(S / K)) / Math.sqrt(Math.max(T, 1e-8));
    return isFinite(approx) ? Math.min(5, Math.max(0.01, approx)) : 0.3;
  }

  let vol = initialVolGuess(type, marketPrice, S, K, T, r, q);
  for (let i = 0; i < 100; i++) {
    const bs = blackScholes(type, S, K, T, r, q, vol);
    const diff = bs.price - marketPrice;
    if (Math.abs(diff) < 1e-8) return vol;
    if (Math.abs(bs.vega) < 1e-12) break;
    vol = vol - diff / bs.vega;
    if (vol < 0.001) { vol = 0.001; break; }
    if (vol > 5) { vol = 5; break; }
  }

  // Robust bisection fallback (always converges for monotone BS price in σ).
  let lo = 0.001;
  let hi = 5;
  const target = marketPrice;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const bs = blackScholes(type, S, K, T, r, q, mid);
    if (bs.price > target) {
      hi = mid;
    } else {
      lo = mid;
    }
    if (hi - lo < 1e-7) return (lo + hi) / 2;
  }
  return (lo + hi) / 2;
}
