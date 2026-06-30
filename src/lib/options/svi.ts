import type { SVIParams, SVIFit } from './types';

/**
 * Pure SVI total implied variance evaluation.
 *
 *   w(k) = a + b * (rho * (k - m) + sqrt((k - m)^2 + sigma^2))
 *
 * where k = log(K/F) is log-moneyness. Kept as a standalone export because
 * downstream code/tests call it directly.
 */
export function svi(param: SVIParams, k: number): number {
  const { a, b, rho, m, sigma } = param;
  const term = rho * (k - m) + Math.sqrt((k - m) * (k - m) + sigma * sigma);
  return a + b * term;
}

const NO_ARB_EPS = 1e-9;

/**
 * Project SVI parameters onto the no-arbitrage (no-calendar + no-butterfly)
 * feasible set.
 *
 * Constraints enforced:
 *   b >= 1e-4            (positive slope, no calendar arb)
 *   |rho| <= 0.999       (slope bounded by asymptotes)
 *   sigma >= 1e-4        (positive smile curvature)
 *   a + b * sigma * sqrt(1 - rho^2) >= 0   (no butterfly arbitrage)
 *
 * The butterfly constraint is enforced by bumping `a` upward when needed;
 * this preserves the already-fit shape (b, rho, m, sigma) rather than
 * distorting it.
 */
function projectNoArb(p: SVIParams): SVIParams {
  const b = Math.max(p.b, 1e-4);
  const rho = Math.max(-0.999, Math.min(0.999, p.rho));
  const sigma = Math.max(p.sigma, 1e-4);
  let a = p.a;
  const butterfly = a + b * sigma * Math.sqrt(1 - rho * rho);
  if (butterfly < 0) {
    a = -b * sigma * Math.sqrt(1 - rho * rho) + NO_ARB_EPS;
  }
  return { a, b, rho, m: p.m, sigma };
}

/**
 * Jacobian of the SVI model w.r.t. {a, b, rho, m, sigma} at log-moneyness k.
 * Returns the five partial derivatives as a tuple.
 */
function sviJacobian(p: SVIParams, k: number): [number, number, number, number, number] {
  const { a: _a, b, rho, m, sigma } = p;
  const dk = k - m;
  const dist = Math.sqrt(dk * dk + sigma * sigma);
  const term = rho * dk + dist;
  // d/da = 1
  const dA = 1;
  // d/db = term
  const dB = term;
  // d/drho = b * (k - m)
  const dRho = b * dk;
  // d/dm = b * (-rho + d(dist)/dm) = b * (-rho - (k-m)/dist)
  const dM = b * (-rho - dk / dist);
  // d/dsigma = b * (sigma / dist)
  const dSigma = b * (sigma / dist);
  return [dA, dB, dRho, dM, dSigma];
}

function residual(p: SVIParams, k: number, iv: number): number {
  return svi(p, k) - iv;
}

function sse(p: SVIParams, samples: { k: number; iv: number }[]): number {
  let s = 0;
  for (const { k, iv } of samples) {
    const r = residual(p, k, iv);
    s += r * r;
  }
  return s;
}

/**
 * Solve a 5x5 linear system A x = rhs via Gaussian elimination with partial
 * pivoting. Returns the solution vector (length 5).
 */
function solve5x5(A: number[][], rhs: number[]): number[] {
  // Augmented matrix copy.
  const M: number[][] = A.map((row, i) => [...row, rhs[i]!]);
  for (let col = 0; col < 5; col++) {
    // Partial pivot.
    let pivot = col;
    let best = Math.abs(M[col]![col]!);
    for (let r = col + 1; r < 5; r++) {
      const v = Math.abs(M[r]![col]!);
      if (v > best) {
        best = v;
        pivot = r;
      }
    }
    if (best < 1e-18) continue; // singular column; skip
    if (pivot !== col) {
      const tmp = M[pivot]!;
      M[pivot] = M[col]!;
      M[col] = tmp;
    }
    const pivVal = M[col]![col]!;
    for (let r = 0; r < 5; r++) {
      if (r === col) continue;
      const factor = M[r]![col]! / pivVal;
      if (factor === 0) continue;
      for (let c = col; c <= 5; c++) {
        M[r]![c] = (M[r]![c] ?? 0) - factor * (M[col]![c] ?? 0);
      }
    }
  }
  const x: number[] = [0, 0, 0, 0, 0];
  for (let i = 0; i < 5; i++) {
    const piv = M[i]![i]!;
    x[i] = Math.abs(piv) < 1e-18 ? 0 : (M[i]![5]! ?? 0) / piv;
  }
  return x;
}

/**
 * Fit SVI parameters to an implied-volatility smile using Levenberg-Marquardt
 * with projection onto the no-arbitrage feasible set after each accepted step.
 *
 * @param strikes  strike prices (same length as ivs)
 * @param ivs      implied volatilities (sqrt variance per unit time), parallel to strikes
 * @param spot     reference spot/forward used for log-moneyness k = log(K/spot)
 * @returns SVIFit with fitted params, RMSE, and sample count, or null when
 *          fewer than 5 valid (finite) points are available.
 */
export function fitSVI(strikes: number[], ivs: (number | null)[], spot: number): SVIFit | null {
  if (spot <= 0 || !isFinite(spot)) return null;

  const samples: { k: number; iv: number }[] = [];
  for (let i = 0; i < strikes.length; i++) {
    const iv = ivs[i];
    const strike = strikes[i];
    if (strike == null || iv == null) continue;
    if (!isFinite(strike) || !isFinite(iv)) continue;
    if (strike <= 0) continue;
    const k = Math.log(strike / spot);
    if (!isFinite(k)) continue;
    samples.push({ k, iv });
  }
  if (samples.length < 5) return null;

  // ---- Initial parameter estimate from the data shape ----
  const kVals = samples.map(s => s.k);
  const kMin = Math.min(...kVals);
  const kMax = Math.max(...kVals);
  const width = Math.max(kMax - kMin, 1e-6);

  const ivMean = samples.reduce((acc, s) => acc + s.iv, 0) / samples.length;
  const ivMin = Math.min(...samples.map(s => s.iv));
  // a ~ minimum of the smile (level); b ~ vertical scale.
  const aEst = Math.max(ivMin, 1e-3) * 0.5;
  // Estimate skew direction (rho sign) from the slope of iv vs k.
  const left = samples[0]!.iv;
  const right = samples[samples.length - 1]!.iv;
  const rhoEst = Math.max(-0.5, Math.min(0.5, (right - left) / Math.max(ivMean, 1e-3)));
  const mEst = (kMin + kMax) / 2;
  const sigmaEst = Math.max(width / 4, 1e-2);
  // b chosen so that the ATM-ish level roughly matches ivMean.
  const bEst = Math.max((ivMean - aEst) / Math.max(sigmaEst, 1e-3), 1e-2);

  let params = projectNoArb({
    a: aEst,
    b: bEst,
    rho: rhoEst,
    m: mEst,
    sigma: sigmaEst,
  });

  const n = samples.length;
  const MAX_ITER = 100;
  const REL_TOL = 1e-10;
  let lambda = 1e-3;
  let prevSSE = sse(params, samples);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Build J^T J (5x5) and J^T r (5).
    const JtJ = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];
    const Jtr = [0, 0, 0, 0, 0];
    for (const { k, iv } of samples) {
      const jac = sviJacobian(params, k);
      const r = residual(params, k, iv);
      for (let i = 0; i < 5; i++) {
        Jtr[i]! += jac[i]! * r;
        for (let j = 0; j < 5; j++) {
          JtJ[i]![j]! += jac[i]! * jac[j]!;
        }
      }
    }

    // Levenberg-Marquardt damping: (J^T J + lambda * diag(J^T J)).
    const A: number[][] = JtJ.map((row, i) => {
      const d = row[i]!;
      const diag = d <= 0 ? lambda : lambda * d;
      return row.map((v, j) => (i === j ? v + diag : v));
    });

    const delta = solve5x5(A, Jtr);
    if (!delta.every(isFinite)) {
      lambda *= 2;
      if (lambda > 1e12) break;
      continue;
    }

    const trial = projectNoArb({
      a: params.a - delta[0]!,
      b: params.b - delta[1]!,
      rho: params.rho - delta[2]!,
      m: params.m - delta[3]!,
      sigma: params.sigma - delta[4]!,
    });

    const trialSSE = sse(trial, samples);
    if (trialSSE < prevSSE) {
      const improvement = prevSSE - trialSSE;
      params = trial;
      lambda *= 0.7;
      // Convergence: relative SSE improvement negligible.
      if (improvement / Math.max(prevSSE, 1e-30) < REL_TOL) {
        prevSSE = trialSSE;
        break;
      }
      prevSSE = trialSSE;
    } else {
      lambda *= 2;
      if (lambda > 1e12) break;
    }
  }

  const finalSSE = sse(params, samples);
  const rmse = Math.sqrt(finalSSE / n);
  return { params, rmse, samples: n };
}

/**
 * Build an SVI-evaluated implied-volatility surface across the strike grid.
 *
 * For each expiry row of raw IVs, fit a per-expiry SVI smile with {@link fitSVI}
 * and sample the fitted curve onto every strike: cell = svi(params, log(K/spot)).
 *
 * @param strikes  strike grid (shared across expiries)
 * @param spot     reference spot/forward
 * @param ivRows   per-expiry IV rows (parallel to strikes). `null` cells are
 *                 dropped before fitting; a row with fewer than 5 valid points
 *                 yields a null surface row (Phase 2 fills these via
 *                 interpolation).
 * @returns object with the evaluated `iv` grid and the per-row `fits`
 *          (null where no fit was possible).
 */
export function buildSVISurface(
  strikes: number[],
  spot: number,
  ivRows: (number | null)[][],
): { iv: (number | null)[][]; fits: (SVIFit | null)[] } {
  const iv: (number | null)[][] = [];
  const fits: (SVIFit | null)[] = [];

  for (const row of ivRows) {
    if (!row || row.length !== strikes.length) {
      iv.push(strikes.map(() => null));
      fits.push(null);
      continue;
    }
    const fit = fitSVI(strikes, row, spot);
    if (!fit) {
      iv.push(strikes.map(() => null));
      fits.push(null);
      continue;
    }
    const outRow: (number | null)[] = strikes.map(strike => {
      if (!strike || strike <= 0) return null;
      const k = Math.log(strike / spot);
      if (!isFinite(k)) return null;
      return svi(fit.params, k);
    });
    iv.push(outRow);
    fits.push(fit);
  }

  return { iv, fits };
}
