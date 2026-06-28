import type { SVIParams } from './types';

export function svi(param: SVIParams, k: number): number {
  const { a, b, rho, m, sigma } = param;
  const term = rho * (k - m) + Math.sqrt((k - m) * (k - m) + sigma * sigma);
  return a + b * term;
}

export function fitSVI(strikes: number[], ivs: number[], spot: number): SVIParams | null {
  const k = strikes.map(s => Math.log(s / spot));
  const valid: { k: number; iv: number }[] = [];
  for (let i = 0; i < k.length; i++) {
    if (ivs[i] != null && isFinite(ivs[i]!) && isFinite(k[i]!)) {
      valid.push({ k: k[i]!, iv: ivs[i]! });
    }
  }
  if (valid.length < 5) return null;

  const kMin = Math.min(...valid.map(v => v.k));
  const kMax = Math.max(...valid.map(v => v.k));

  const aEst = valid.reduce((s, v) => s + v.iv, 0) / valid.length;
  const mEst = (kMin + kMax) / 2;
  const sigmaEst = (kMax - kMin) / 4;
  const bEst = (valid[valid.length - 1]!.iv - valid[0]!.iv) / (kMax - kMin + sigmaEst);
  const rhoEst = 0;

  const params: SVIParams = { a: Math.max(aEst, 0.05), b: Math.max(Math.abs(bEst), 0.01), rho: rhoEst, m: mEst, sigma: Math.max(sigmaEst, 0.01) };

  for (let iter = 0; iter < 200; iter++) {
    const grad = { a: 0, b: 0, rho: 0, m: 0, sigma: 0 };
    let error = 0;
    for (const v of valid) {
      const pred = svi(params, v.k);
      const diff = pred - v.iv;
      error += diff * diff;
      const t = Math.sqrt((v.k - params.m) * (v.k - params.m) + params.sigma * params.sigma);
      const dtDm = -(v.k - params.m) / t;
      const dtDs = params.sigma / t;
      const term = params.rho * (v.k - params.m) + t;
      grad.a += diff;
      grad.b += diff * term;
      grad.rho += diff * params.b * (v.k - params.m);
      grad.m += diff * params.b * (-params.rho + dtDm);
      grad.sigma += diff * params.b * dtDs;
    }
    const lr = 0.001 / (1 + iter * 0.01);
    params.a -= lr * grad.a;
    params.b = Math.max(0.01, params.b - lr * grad.b);
    params.rho = Math.max(-0.99, Math.min(0.99, params.rho - lr * grad.rho));
    params.sigma = Math.max(0.01, params.sigma - lr * grad.sigma);
    if (error / valid.length < 1e-6) break;
  }

  return params;
}

export function buildSVISurface(
  expiries: string[],
  strikes: number[],
  spot: number,
  termIVs: number[],
): (number | null)[][] {
  const iv: (number | null)[][] = [];
  for (let e = 0; e < expiries.length; e++) {
    const row: (number | null)[] = [];
    const atmIV = termIVs[e] ?? 0.2;
    const skew = 0.1 * Math.exp(-(e + 1) / 5);
    for (let s = 0; s < strikes.length; s++) {
      const k = Math.log(strikes[s]! / spot);
      row.push(atmIV + skew * k + 0.02 * k * k);
    }
    iv.push(row);
  }
  return iv;
}
