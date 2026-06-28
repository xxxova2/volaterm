export interface SpyReturn {
  date: string;
  close: number;
  simpleReturn: number;
  logReturn: number;
  vix: number;
}

function generateDemoHistory(): SpyReturn[] {
  const data: SpyReturn[] = [];
  const start = new Date('1993-01-29');
  let price = 40;
  let vix = 18;
  const now = new Date();

  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dailyVol = 0.01;
    const ret = (Math.random() - 0.5) * dailyVol * 2;
    price *= (1 + ret);
    vix = Math.max(8, Math.min(80, vix + (Math.random() - 0.5) * 2));
    data.push({
      date: d.toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
      simpleReturn: ret,
      logReturn: Math.log(1 + ret),
      vix: Math.round(vix * 10) / 10,
    });
  }

  return data;
}

export function fetchSpyHistory(): SpyReturn[] {
  return generateDemoHistory();
}

export function computeHistogram(
  returns: number[],
  bins = 80,
): { binEdges: number[]; counts: number[]; binCenters: number[] } {
  if (returns.length === 0) return { binEdges: [], counts: [], binCenters: [] };

  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const range = max - min || 1;
  const binWidth = range / bins;

  const binEdges: number[] = Array.from({ length: bins + 1 }, (_, i) => min + i * binWidth);
  const counts: number[] = Array.from({ length: bins }, () => 0);

  for (const r of returns) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((r - min) / binWidth)));
    counts[idx] = (counts[idx] ?? 0) + 1;
  }

  const binCenters = binEdges.slice(0, -1).map(e => e + binWidth / 2);

  return { binEdges, counts, binCenters };
}

export function computeStats(returns: number[]) {
  const n = returns.length;
  if (n === 0) return { mean: 0, std: 0, skewness: 0, kurtosis: 0, var95: 0, var99: 0, cvar95: 0, cvar99: 0 };

  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);

  const sorted = [...returns].sort((a, b) => a - b);
  const idx95 = Math.floor(n * 0.05);
  const idx99 = Math.floor(n * 0.01);
  const idx95clamped = Math.min(idx95, n - 1);
  const idx99clamped = Math.min(idx99, n - 1);
  const var95 = sorted[idx95clamped] ?? sorted[0]!;
  const var99 = sorted[idx99clamped] ?? sorted[0]!;

  const cvar95 = sorted.slice(0, Math.max(1, idx95)).reduce((s, r) => s + r, 0) / Math.max(1, idx95);
  const cvar99 = sorted.slice(0, Math.max(1, idx99)).reduce((s, r) => s + r, 0) / Math.max(1, idx99);

  const m3 = returns.reduce((s, r) => s + (r - mean) ** 3, 0) / n;
  const m4 = returns.reduce((s, r) => s + (r - mean) ** 4, 0) / n;
  const skewness = m3 / (variance * std);
  const kurtosis = m4 / (variance * variance) - 3;

  return { mean, std, skewness, kurtosis, var95, var99, cvar95, cvar99 };
}

export function normalPDF(x: number, mean: number, std: number): number {
  return Math.exp(-((x - mean) ** 2) / (2 * std * std)) / (std * Math.sqrt(2 * Math.PI));
}
