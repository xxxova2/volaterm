/**
 * Put–call parity helpers.
 *
 * European-style parity (good approx for equity index options / American with
 * low early-exercise premium near ATM):
 *   C − P = e^{−rT} (F − K) = S e^{−qT} − K e^{−rT}
 *
 * From liquid ATM call/put mids we recover the implied forward and continuous
 * dividend yield used by the IV solver.
 */

export interface ParityPoint {
  strike: number;
  callMid: number;
  putMid: number;
}

export interface ParityResult {
  /** Implied forward F */
  forward: number;
  /** Continuous dividend yield q (decimal) */
  dividendYield: number;
  /** Number of strike pairs used */
  samples: number;
  /** RMSE of (C−P) vs model parity residual at used strikes */
  rmse: number;
}

/**
 * Forward from a single strike: F = K + (C − P) e^{rT}
 */
export function forwardFromParity(
  callMid: number,
  putMid: number,
  strike: number,
  T: number,
  r: number,
): number {
  return strike + (callMid - putMid) * Math.exp(r * T);
}

/**
 * Continuous dividend yield from spot and forward:
 * F = S e^{(r−q)T}  ⇒  q = r − ln(F/S) / T
 */
export function impliedDividendYield(
  spot: number,
  forward: number,
  T: number,
  r: number,
): number | null {
  if (!(spot > 0) || !(forward > 0) || !(T > 0) || !isFinite(r)) return null;
  const q = r - Math.log(forward / spot) / T;
  if (!isFinite(q)) return null;
  // Sanity band: no extreme negative yields / absurd dividends.
  if (q < -0.05 || q > 0.25) return null;
  return q;
}

/**
 * Estimate ATM forward + dividend yield from call/put mid pairs near spot.
 * Prefers strikes within ±5% of spot with both mids > 0.
 */
export function estimateParityDividend(
  calls: { strike: number; mid: number }[],
  puts: { strike: number; mid: number }[],
  spot: number,
  T: number,
  r: number,
): ParityResult | null {
  if (!(spot > 0) || !(T > 0)) return null;

  const putByK = new Map<number, number>();
  for (const p of puts) {
    if (p.mid > 0 && isFinite(p.mid)) putByK.set(p.strike, p.mid);
  }

  const pairs: { k: number; c: number; p: number; dist: number }[] = [];
  for (const c of calls) {
    if (!(c.mid > 0) || !isFinite(c.mid)) continue;
    const pm = putByK.get(c.strike);
    if (pm == null || !(pm > 0)) continue;
    const dist = Math.abs(c.strike - spot) / spot;
    if (dist > 0.08) continue; // stay near ATM
    pairs.push({ k: c.strike, c: c.mid, p: pm, dist });
  }

  if (pairs.length === 0) return null;
  pairs.sort((a, b) => a.dist - b.dist);

  // Weight nearest 1–5 strikes more heavily.
  const used = pairs.slice(0, Math.min(5, pairs.length));
  let wSum = 0;
  let fSum = 0;
  for (const u of used) {
    const w = 1 / (u.dist + 0.002);
    const F = forwardFromParity(u.c, u.p, u.k, T, r);
    if (!(F > 0) || !isFinite(F)) continue;
    wSum += w;
    fSum += w * F;
  }
  if (wSum <= 0) return null;

  const forward = fSum / wSum;
  const dividendYield = impliedDividendYield(spot, forward, T, r);
  if (dividendYield == null) return null;

  // Residual quality check.
  let sse = 0;
  for (const u of used) {
    const model = Math.exp(-r * T) * (forward - u.k);
    const mkt = u.c - u.p;
    const e = mkt - model;
    sse += e * e;
  }
  const rmse = Math.sqrt(sse / used.length);

  return { forward, dividendYield, samples: used.length, rmse };
}

/**
 * Blend profile/seed dividend with parity-implied q when parity is liquid.
 * Heavily trust parity when RMSE is tight.
 */
export function blendDividendYield(
  seedQ: number,
  parity: ParityResult | null,
): number {
  if (!parity) return seedQ;
  // Wide residual → distrust parity.
  if (parity.rmse > 0.5) return seedQ;
  if (parity.rmse < 0.05 && parity.samples >= 2) {
    return 0.25 * seedQ + 0.75 * parity.dividendYield;
  }
  return 0.5 * seedQ + 0.5 * parity.dividendYield;
}
