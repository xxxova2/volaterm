import { blackScholes } from './black-scholes';

export function impliedVol(
  type: 'call' | 'put',
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  q: number,
): number | null {
  if (marketPrice <= 0 || T <= 0) return null;

  const intrinsic = type === 'call'
    ? Math.max(S - K * Math.exp(-r * T), 0)
    : Math.max(K * Math.exp(-r * T) - S, 0);
  if (marketPrice < intrinsic * 0.99) return null;

  if (T < 1 / 365) {
    const approx = Math.abs(Math.log(S / K)) / Math.sqrt(T);
    return isFinite(approx) ? approx : 0.3;
  }

  let vol = 0.3;
  for (let i = 0; i < 100; i++) {
    const bs = blackScholes(type, S, K, T, r, q, vol);
    const diff = bs.price - marketPrice;
    if (Math.abs(diff) < 1e-8) return vol;
    if (Math.abs(bs.vega) < 1e-12) break;
    vol = vol - diff / bs.vega;
    if (vol < 0.001) { vol = 0.001; break; }
    if (vol > 5) { vol = 5; break; }
  }

  let lo = 0.001;
  let hi = 5;
  const target = marketPrice;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const bs = blackScholes(type, S, K, T, r, q, mid);
    if (bs.price > target) {
      hi = mid;
    } else {
      lo = mid;
    }
    if (hi - lo < 1e-6) return (lo + hi) / 2;
  }
  return (lo + hi) / 2;
}
