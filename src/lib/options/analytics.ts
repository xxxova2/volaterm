import type { VolSnapshot, GreeksProfile, SensitivityMatrix } from './types';
import { computeGreeks } from './greeks';
import { normCdf } from './black-scholes';

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
 * Front-month expected move from the ATM straddle.
 *
 * Near-term ATM straddle ≈ 0.8 · S · σ · √T  (BS ATM approx),
 * while 1σ move = S · σ · √T, so:
 *   1σ ≈ straddle / 0.8
 *
 * Fallback when no liquid straddle: S · atmIV · √(dte/365).
 *
 * probTouch ≈ one-sided barrier touch of the +move level under zero-drift BM
 * (reflection): 2 · N(−d) with d = move / (S σ √T). Not a two-sided finish prob.
 */
export function impliedMove(snap: VolSnapshot) {
  if (snap.expiries.length === 0) return { move: 0, movePct: 0, probTouch: 0, straddle: 0 };
  const front = snap.expiries[0]!;
  const calls = front.calls;
  const puts = front.puts;

  // Prefer the ATM straddle (strike closest to spot with both call + put mids).
  let straddle = 0;
  let bestDist = Infinity;
  for (const c of calls) {
    if (!(c.mid > 0)) continue;
    const p = puts.find((pp) => pp.strike === c.strike);
    if (!p || !(p.mid > 0)) continue;
    const dist = Math.abs(c.strike - snap.spot);
    if (dist < bestDist) {
      bestDist = dist;
      straddle = c.mid + p.mid;
    }
  }

  // 1σ: straddle ≈ 0.8 × 1σ  ⇒  1σ ≈ straddle / 0.8
  const T = Math.max(front.dte / 365, 1e-8);
  const move = straddle > 0
    ? straddle / 0.8
    : snap.spot * front.atmIV * Math.sqrt(T);
  const movePct = snap.spot > 0 ? move / snap.spot : 0;
  const sig = Math.max(front.atmIV > 0 ? front.atmIV : 0.2, 0.01);
  const d = move / (snap.spot * sig * Math.sqrt(T) + 1e-12);
  // Reflection principle: P(touch upper barrier at +move) for driftless BM.
  const probTouch = Math.min(0.99, Math.max(0, 2 * (1 - normCdf(Math.abs(d)))));

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
 * Sum of listed option Greeks across the full chain (inventory scan).
 * This is NOT position / book risk — it scales with how many strikes are quoted.
 * Prefer multi-leg portfolio tools for real desk risk.
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
 * Weight for dealer exposure aggregates.
 * - oi: open interest (canonical SpotGamma-style)
 * - volume: session volume (fallback when free feeds zero OI)
 * - unit: 1 per listed contract with OI, volume, or non-zero gamma
 */
export type ExposureWeight = 'oi' | 'volume' | 'unit';

export type DealerMetric = 'gex' | 'dex' | 'vex' | 'charm';

export interface DealerPoint {
  strike: number;
  callGEX: number;
  putGEX: number;
  netGEX: number;
  /** $ delta notional (customer long OI): δ · S · w · mult */
  callDEX: number;
  putDEX: number;
  netDEX: number;
  /** Vanna × S × w × mult (vol×spot cross) */
  callVEX: number;
  putVEX: number;
  netVEX: number;
  /** Charm per day × S × w × mult ($ delta bleed / day) */
  callCharm: number;
  putCharm: number;
  netCharm: number;
}

export interface DealerExposure {
  points: DealerPoint[];
  totalGEX: number;
  totalDEX: number;
  totalVEX: number;
  totalCharm: number;
  gammaFlip: number | null;
  callWall: number | null;
  putWall: number | null;
  /** Weight actually applied (may auto-fallback from oi → volume/unit). */
  weight: ExposureWeight;
  /** True when caller asked for oi but feed had no OI. */
  weightFallback: boolean;
  unitNote: string;
}

type WeightableQuote = {
  openInterest: number;
  volume: number;
  gamma?: number | null;
};

function weightOf(q: WeightableQuote, mode: ExposureWeight): number {
  if (mode === 'unit') {
    if ((q.openInterest ?? 0) > 0 || (q.volume ?? 0) > 0) return 1;
    // Last resort when Yahoo zeroes both OI and volume on some rows
    return q.gamma != null && Math.abs(q.gamma) > 0 ? 1 : 0;
  }
  if (mode === 'volume') return Math.max(0, q.volume ?? 0);
  return Math.max(0, q.openInterest ?? 0);
}

/** Sum OI / volume across a snapshot — used to auto-pick a usable weight. */
function chainWeightTotals(snap: VolSnapshot): { oi: number; volume: number } {
  let oi = 0;
  let volume = 0;
  for (const slice of snap.expiries) {
    for (const q of [...slice.calls, ...slice.puts]) {
      oi += Math.max(0, q.openInterest ?? 0);
      volume += Math.max(0, q.volume ?? 0);
    }
  }
  return { oi, volume };
}

/**
 * Resolve weight mode. Free Yahoo often returns openInterest=0 for entire chains;
 * fall back to volume, then unit greeks so the dealer stack is never blank.
 */
export function resolveExposureWeight(
  snap: VolSnapshot,
  requested: ExposureWeight = 'oi',
): { weight: ExposureWeight; fallback: boolean; note: string } {
  if (requested === 'volume') {
    return {
      weight: 'volume',
      fallback: false,
      note: 'Volume-weighted · proxy when OI unavailable · not inventory',
    };
  }
  if (requested === 'unit') {
    return {
      weight: 'unit',
      fallback: false,
      note: 'Unit weight (1 per listed OI/vol/γ) · compare structure not size',
    };
  }
  const { oi, volume } = chainWeightTotals(snap);
  if (oi > 0) {
    return {
      weight: 'oi',
      fallback: false,
      note: 'OI-weighted · GEX = γ·S²·0.01·OI·mult (1% $gamma) · DEX/VEX use ×S',
    };
  }
  if (volume > 0) {
    return {
      weight: 'volume',
      fallback: true,
      note: 'OI missing from feed — volume-weighted proxy (not true inventory GEX)',
    };
  }
  return {
    weight: 'unit',
    fallback: true,
    note: 'OI & volume missing — unit weight on contracts with γ (structure only)',
  };
}

function flipFromSeries(points: { strike: number; net: number }[]): number | null {
  if (points.length === 0) return null;
  let cumulative = 0;
  let prevCum = 0;
  let flip: number | null = null;
  for (const p of points) {
    prevCum = cumulative;
    cumulative += p.net;
    if (flip === null && prevCum < 0 && cumulative >= 0) flip = p.strike;
  }
  if (flip !== null) return flip;
  let best = points[0]!;
  let run = 0;
  let bestAbs = Infinity;
  for (const p of points) {
    run += p.net;
    if (Math.abs(run) < bestAbs) {
      bestAbs = Math.abs(run);
      best = p;
    }
  }
  return best.strike;
}

/**
 * Full dealer stack: GEX / DEX / VEX / Charm by strike.
 *
 * SpotGamma-style convention (customer long listed OI → dealers short):
 *   call GEX = +γ · S² · 0.01 · w · mult   ($ gamma for a 1% spot move)
 *   put  GEX = −γ · S² · 0.01 · w · mult
 *   DEX = δ · S · w · mult
 *   VEX = vanna · S · w · mult
 *   Charm = (charm/365) · S · w · mult   ($ delta change per calendar day)
 *
 * Matches macrovol-api `greeks_calculator._gex_unit`.
 * weight 'oi' = open interest (default); 'unit' = 1 per listed contract with OI>0.
 */
export function dealerExposure(
  snap: VolSnapshot,
  opts?: { maxDte?: number; weight?: ExposureWeight },
): DealerExposure {
  const requested = opts?.weight ?? 'oi';
  const resolved = resolveExposureWeight(snap, requested);
  const weight = resolved.weight;
  const maxDte = opts?.maxDte;
  const mult = snap.contractSize ?? 100;
  const S = snap.spot;

  type Acc = {
    callGEX: number; putGEX: number;
    callDEX: number; putDEX: number;
    callVEX: number; putVEX: number;
    callCharm: number; putCharm: number;
  };
  const map = new Map<number, Acc>();

  for (const slice of snap.expiries) {
    if (maxDte != null && slice.dte > maxDte) continue;
    for (const q of [...slice.calls, ...slice.puts]) {
      const w = weightOf(q, weight);
      if (w <= 0) continue;
      const acc = map.get(q.strike) ?? {
        callGEX: 0, putGEX: 0,
        callDEX: 0, putDEX: 0,
        callVEX: 0, putVEX: 0,
        callCharm: 0, putCharm: 0,
      };
      // 1% dollar-gamma (SpotGamma): γ · S² · 0.01 · OI · mult
      const gexScale = S * S * 0.01 * w * mult;
      const notionalScale = S * w * mult;
      const gamma = q.gamma ?? 0;
      const delta = q.delta ?? 0;
      const vanna = q.vanna ?? 0;
      // greeks.charm is dΔ/dT (year); convert to per calendar day
      const charmDay = (q.charm ?? 0) / 365;

      if (q.type === 'call') {
        acc.callGEX += gamma * gexScale;
        acc.callDEX += delta * notionalScale;
        acc.callVEX += vanna * notionalScale;
        acc.callCharm += charmDay * notionalScale;
      } else {
        acc.putGEX -= gamma * gexScale; // dealer-style put GEX negative
        acc.putDEX += delta * notionalScale; // put δ already ≤ 0
        acc.putVEX += vanna * notionalScale;
        acc.putCharm += charmDay * notionalScale;
      }
      map.set(q.strike, acc);
    }
  }

  const sorted = [...map.entries()].sort((a, b) => a[0] - b[0]);
  const points: DealerPoint[] = sorted.map(([strike, g]) => ({
    strike,
    callGEX: g.callGEX,
    putGEX: g.putGEX,
    netGEX: g.callGEX + g.putGEX,
    callDEX: g.callDEX,
    putDEX: g.putDEX,
    netDEX: g.callDEX + g.putDEX,
    callVEX: g.callVEX,
    putVEX: g.putVEX,
    netVEX: g.callVEX + g.putVEX,
    callCharm: g.callCharm,
    putCharm: g.putCharm,
    netCharm: g.callCharm + g.putCharm,
  }));

  let totalGEX = 0, totalDEX = 0, totalVEX = 0, totalCharm = 0;
  for (const p of points) {
    totalGEX += p.netGEX;
    totalDEX += p.netDEX;
    totalVEX += p.netVEX;
    totalCharm += p.netCharm;
  }

  const gammaFlip = flipFromSeries(points.map((p) => ({ strike: p.strike, net: p.netGEX })));
  const callWall = points.length
    ? [...points].sort((a, b) => b.callGEX - a.callGEX)[0]!.strike
    : null;
  const putWall = points.length
    ? [...points].sort((a, b) => a.putGEX - b.putGEX)[0]!.strike
    : null;

  return {
    points,
    totalGEX,
    totalDEX,
    totalVEX,
    totalCharm,
    gammaFlip,
    callWall,
    putWall,
    weight,
    weightFallback: resolved.fallback,
    unitNote: resolved.note,
  };
}

/**
 * Calculates gamma exposure (GEX) by strike (backward-compatible wrapper).
 * Prefer dealerExposure() for DEX / VEX / Charm.
 */
export function gammaExposure(
  snap: VolSnapshot,
  maxDte?: number,
): { points: { strike: number; callGEX: number; putGEX: number; netGEX: number }[]; totalGEX: number; gammaFlip: number | null } {
  const d = dealerExposure(snap, { maxDte });
  return {
    points: d.points.map((p) => ({
      strike: p.strike,
      callGEX: p.callGEX,
      putGEX: p.putGEX,
      netGEX: p.netGEX,
    })),
    totalGEX: d.totalGEX,
    gammaFlip: d.gammaFlip,
  };
}

export interface ParityEdgeRow {
  expiry: string;
  dte: number;
  strike: number;
  callMid: number;
  putMid: number;
  /** C − P − (S e^{-qT} − K e^{-rT}) */
  residual: number;
  residualPctSpot: number;
  /** Bid/ask edge proxy: residual vs half-spread sum */
  tradeable: boolean;
  halfSpread: number;
}

/**
 * Put–call parity residual scan (European approximation).
 * residual > 0 ⇒ synthetic long stock (C−P) rich vs cash; < 0 ⇒ cheap.
 * tradeable only when |residual| > call/put half-spread sum (rough costs).
 */
export function scanParityEdges(
  snap: VolSnapshot,
  opts?: { maxDte?: number; bandPct?: number; maxRows?: number },
): ParityEdgeRow[] {
  const band = opts?.bandPct ?? 0.06;
  const maxDte = opts?.maxDte ?? 120;
  const maxRows = opts?.maxRows ?? 40;
  const rows: ParityEdgeRow[] = [];
  const r = snap.riskFreeRate;
  const q = snap.dividendYield;

  for (const slice of snap.expiries) {
    if (slice.dte > maxDte || slice.dte <= 0) continue;
    const T = slice.dte / 365;
    const discS = snap.spot * Math.exp(-q * T);
    const putByK = new Map(slice.puts.map((p) => [p.strike, p]));
    for (const c of slice.calls) {
      if (Math.abs(c.strike / snap.spot - 1) > band) continue;
      const p = putByK.get(c.strike);
      if (!p || !(c.mid > 0) || !(p.mid > 0)) continue;
      const theo = discS - c.strike * Math.exp(-r * T);
      const residual = (c.mid - p.mid) - theo;
      const halfSpread =
        Math.max(0, (c.ask - c.bid) / 2) + Math.max(0, (p.ask - p.bid) / 2);
      rows.push({
        expiry: slice.expiry,
        dte: slice.dte,
        strike: c.strike,
        callMid: c.mid,
        putMid: p.mid,
        residual,
        residualPctSpot: residual / snap.spot,
        tradeable: Math.abs(residual) > halfSpread + 1e-9 && halfSpread > 0,
        halfSpread,
      });
    }
  }

  rows.sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual));
  return rows.slice(0, maxRows);
}

/** Listed inventory by expiry (MM scan — not a position book). */
export function inventoryByExpiry(snap: VolSnapshot) {
  return snap.expiries.map((slice) => {
    let delta = 0, gamma = 0, vega = 0, theta = 0, callOI = 0, putOI = 0;
    for (const q of slice.calls) {
      delta += q.delta ?? 0;
      gamma += q.gamma ?? 0;
      vega += q.vega ?? 0;
      theta += q.theta ?? 0;
      callOI += q.openInterest;
    }
    for (const q of slice.puts) {
      delta += q.delta ?? 0;
      gamma += q.gamma ?? 0;
      vega += q.vega ?? 0;
      theta += q.theta ?? 0;
      putOI += q.openInterest;
    }
    return {
      expiry: slice.expiry,
      dte: slice.dte,
      atmIV: slice.atmIV,
      delta,
      gamma,
      vega,
      theta,
      callOI,
      putOI,
      pcr: callOI > 0 ? putOI / callOI : null,
    };
  });
}

/**
 * Close-to-close annualized realized vol (simple log returns).
 * needs ≥5 closes; returns null otherwise.
 */
export function realizedVolCloseToClose(closes: number[], periodsPerYear = 252): number | null {
  if (closes.length < 5) return null;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1]!;
    const b = closes[i]!;
    if (a > 0 && b > 0) rets.push(Math.log(b / a));
  }
  if (rets.length < 4) return null;
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  let v = 0;
  for (const x of rets) v += (x - mean) ** 2;
  const std = Math.sqrt(v / (rets.length - 1));
  return std * Math.sqrt(periodsPerYear);
}

/** IV − RV premium (positive = IV rich vs realized). */
export function volRiskPremium(atmIV: number | null | undefined, rv: number | null): number | null {
  if (atmIV == null || rv == null || !(atmIV > 0) || !(rv > 0)) return null;
  return atmIV - rv;
}
