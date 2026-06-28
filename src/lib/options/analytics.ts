import type { VolSnapshot, GreeksProfile, SensitivityMatrix } from './types';
import { computeGreeks } from './greeks';

/**
 * Generates a Greeks profile for a specific expiry
 * @param snap - Volatility snapshot containing option data
 * @param expiryIdx - Index of the expiry to analyze
 * @param key - Which Greek to profile ('delta', 'gamma', 'theta', or 'vega')
 * @returns Object containing strikes and corresponding Greek values
 */
export function greeksProfile(snap: VolSnapshot, expiryIdx: number, key: 'delta' | 'gamma' | 'theta' | 'vega'): GreeksProfile {
  const slice = snap.expiries[expiryIdx];
  if (!slice) return { strikes: [], values: [] };

  const allQuotes = [...slice.calls, ...slice.puts];
  allQuotes.sort((a, b) => a.strike - b.strike);

  const strikes: number[] = [];
  const values: number[] = [];
  for (const q of allQuotes) {
    strikes.push(q.strike);
    const g = q[key];
    values.push(g ?? 0);
  }

  return { strikes, values };
}

/**
 * Calculates portfolio sensitivity to spot price changes
 * @param snap - Volatility snapshot containing option data
 * @returns Sensitivity matrix showing portfolio Greeks under different spot price scenarios
 */
export function spotSensitivity(snap: VolSnapshot): SensitivityMatrix {
  const spot = snap.spot;
  const shocks = [-0.05, 0, 0.05];
  const ivShocks = [-0.05, 0, 0.05];

  const delta: number[] = [];
  const gamma: number[] = [];
  const vega: number[] = [];
  const theta: number[] = [];

  for (const s of shocks) {
    const S = spot * (1 + s);
    let dSum = 0, gSum = 0, vSum = 0, tSum = 0;
    for (const slice of snap.expiries) {
      for (const q of [...slice.calls, ...slice.puts]) {
        if (q.iv == null || q.iv <= 0) continue;
        const T = slice.dte / 365;
        if (T <= 0) continue;
        const g = computeGreeks(q.type, S, q.strike, T, snap.riskFreeRate, snap.dividendYield, q.iv);
        dSum += g.delta;
        gSum += g.gamma;
        vSum += g.vega;
        tSum += g.theta;
      }
    }
    delta.push(dSum);
    gamma.push(gSum);
    vega.push(vSum);
    theta.push(tSum);
  }

  return { spotShocks: shocks, ivShocks, delta, gamma, vega, theta };
}

/**
 * Calculates portfolio sensitivity to volatility changes
 * @param snap - Volatility snapshot containing option data
 * @returns Sensitivity matrix showing portfolio Greeks under different volatility scenarios
 */
export function ivSensitivity(snap: VolSnapshot): SensitivityMatrix {
  const shocks = [-0.05, 0, 0.05];
  const ivShocks = [-0.2, 0, 0.2];

  const delta: number[] = [];
  const gamma: number[] = [];
  const vega: number[] = [];
  const theta: number[] = [];

  for (const ivS of ivShocks) {
    let dSum = 0, gSum = 0, vSum = 0, tSum = 0;
    for (const slice of snap.expiries) {
      for (const q of [...slice.calls, ...slice.puts]) {
        if (q.iv == null || q.iv <= 0) continue;
        const T = slice.dte / 365;
        if (T <= 0) continue;
        const vol = Math.max(0.01, q.iv * (1 + ivS));
        const g = computeGreeks(q.type, snap.spot, q.strike, T, snap.riskFreeRate, snap.dividendYield, vol);
        dSum += g.delta;
        gSum += g.gamma;
        vSum += g.vega;
        tSum += g.theta;
      }
    }
    delta.push(dSum);
    gamma.push(gSum);
    vega.push(vSum);
    theta.push(tSum);
  }

  return { spotShocks: shocks, ivShocks, delta, gamma, vega, theta };
}

/**
 * Aggregates portfolio Greeks by expiry date
 * @param snap - Volatility snapshot containing option data
 * @returns Array of expiry buckets with aggregated Greeks
 */
export function netByExpiry(snap: VolSnapshot) {
  return snap.expiries.map(slice => {
    let delta = 0, gamma = 0, vega = 0;
    for (const q of [...slice.calls, ...slice.puts]) {
      delta += q.delta ?? 0;
      gamma += q.gamma ?? 0;
      vega += q.vega ?? 0;
    }
    return { expiry: slice.expiry, dte: slice.dte, delta, gamma, vega };
  });
}

/**
 * Calculates the expected move based on the front-month ATM straddle
 * Uses the 0.8x straddle rule of thumb for expected move
 * @param snap - Volatility snapshot containing option data
 * @returns Object containing expected move in dollars and percentage
 */
export function impliedMove(snap: VolSnapshot) {
  if (snap.expiries.length === 0) return { move: 0, movePct: 0, probTouch: 0, straddle: 0 };
  const front = snap.expiries[0]!;
  const calls = front.calls;
  const puts = front.puts;

  let straddle = 0;
  for (const c of calls) {
    const p = puts.find(p => p.strike === c.strike);
    if (p && c.mid > 0 && p.mid > 0) {
      straddle = c.mid + p.mid;
      break;
    }
  }

  const move = straddle * 0.8;
  const movePct = move / snap.spot;
  const probTouch = 0.5;

  return { move, movePct, probTouch, straddle };
}

/**
 * Calculates the max pain strike price
 * Max pain is the strike price at which option writers (sellers) would experience the least pain
 * (minimum total intrinsic value of options at expiration)
 * @param snap - Volatility snapshot containing option data
 * @returns The max pain strike price, or null if no data available
 */
export function maxPainStrike(snap: VolSnapshot): number | null {
  if (!snap.expiries[0]) return null;
  const slice = snap.expiries[0];
  const allStrikes = [...new Set([...slice.calls, ...slice.puts].map(q => q.strike))].sort((a, b) => a - b);

  let minPain = Infinity;
  let maxPain = allStrikes[0] ?? snap.spot;

  // Max pain = the settlement strike that minimises the aggregate intrinsic
  // value of outstanding options. For each candidate `strike`, assume the
  // underlying settles there: calls are ITM when settlement > K, puts when K > settlement.
  for (const strike of allStrikes) {
    let pain = 0;
    for (const q of [...slice.calls, ...slice.puts]) {
      if (q.openInterest <= 0) continue;
      if (q.type === 'call') {
        pain += Math.max(0, strike - q.strike) * q.openInterest;
      } else {
        pain += Math.max(0, q.strike - strike) * q.openInterest;
      }
    }
    if (pain < minPain) {
      minPain = pain;
      maxPain = strike;
    }
  }

  return maxPain;
}

/**
 * Calculates aggregate portfolio Greeks across all expiries
 * @param snap - Volatility snapshot containing option data
 * @returns Object containing total portfolio delta, gamma, theta, and vega
 */
export function portfolioGreeks(snap: VolSnapshot) {
  let delta = 0, gamma = 0, theta = 0, vega = 0;
  for (const slice of snap.expiries) {
    for (const q of [...slice.calls, ...slice.puts]) {
      delta += q.delta ?? 0;
      gamma += q.gamma ?? 0;
      theta += q.theta ?? 0;
      vega += q.vega ?? 0;
    }
  }
  return { delta, gamma, theta, vega };
}

/**
 * Calculates IV Rank and IV Percentile based on historical data
 * IV Rank shows where current IV falls within its historical range (0-1)
 * IV Percentile shows what percentage of historical values are below current IV
 * @param frames - Array of historical volatility snapshots
 * @param currentIdx - Index of the current frame in the history
 * @returns Object containing IV rank (0-1) and percentile (0-100)
 */
export function ivRank(frames: { snapshot: VolSnapshot }[], currentIdx: number): { rank: number; percentile: number } {
  if (frames.length < 2) return { rank: 0.5, percentile: 50 };
  const current = frames[currentIdx]?.snapshot;
  if (!current) return { rank: 0.5, percentile: 50 };

  const currentATM = current.expiries[0]?.atmIV ?? 0;
  const histIVs: number[] = [];
  for (const f of frames) {
    const iv = f.snapshot.expiries[0]?.atmIV;
    if (iv != null) histIVs.push(iv);
  }
  if (histIVs.length === 0) return { rank: 0.5, percentile: 50 };

  const min = Math.min(...histIVs);
  const max = Math.max(...histIVs);
  const rank = max - min === 0 ? 0.5 : (currentATM - min) / (max - min);
  const below = histIVs.filter(iv => iv <= currentATM).length;
  const percentile = (below / histIVs.length) * 100;

  return { rank: Math.max(0, Math.min(1, rank)), percentile };
}

/**
 * Calculates gamma exposure (GEX) by strike
 * GEX measures the sensitivity of market makers' delta hedging requirements to price changes
 * Positive GEX indicates dealers must buy when price drops (stabilizing)
 * Negative GEX indicates dealers must sell when price drops (destabilizing)
 * @param snap - Volatility snapshot containing option data
 * @param maxDte - Optional maximum DTE to include in calculation
 * @returns Object containing GEX points by strike, total GEX, and gamma flip point
 */
export function gammaExposure(
  snap: VolSnapshot,
  maxDte?: number,
): { points: { strike: number; callGEX: number; putGEX: number; netGEX: number }[]; totalGEX: number; gammaFlip: number | null } {
  const gexMap = new Map<number, { callGEX: number; putGEX: number }>();

  for (const slice of snap.expiries) {
    if (maxDte && slice.dte > maxDte) continue;
    for (const q of [...slice.calls, ...slice.puts]) {
      if (q.gamma == null || q.openInterest <= 0) continue;
      const gex = q.gamma * snap.spot * q.openInterest * 100;
      const existing = gexMap.get(q.strike) ?? { callGEX: 0, putGEX: 0 };
      if (q.type === 'call') {
        existing.callGEX += gex;
      } else {
        existing.putGEX += gex;
      }
      gexMap.set(q.strike, existing);
    }
  }

  const sorted = [...gexMap.entries()].sort((a, b) => a[0] - b[0]);
  const points = sorted.map(([strike, g]) => ({
    strike,
    callGEX: g.callGEX,
    putGEX: g.putGEX,
    netGEX: g.callGEX + g.putGEX,
  }));

  let totalGEX = 0;
  for (const p of points) totalGEX += p.netGEX;

  let gammaFlip: number | null = null;
  let cumulative = 0;
  for (const p of points) {
    cumulative += p.netGEX;
    if (cumulative >= 0 && gammaFlip === null) {
      gammaFlip = p.strike;
    }
  }

  return { points, totalGEX, gammaFlip };
}
