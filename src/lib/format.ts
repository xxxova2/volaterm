export function fmtPrice(n: number | null | undefined, dp = 2): string {
  if (n == null || !isFinite(n)) return '\u2014';
  return n.toFixed(dp);
}

export function fmtPct(n: number | null | undefined, dp = 2): string {
  if (n == null || !isFinite(n)) return '\u2014';
  return `${(n * 100).toFixed(dp)}%`;
}

export function fmtSignedPct(n: number | null | undefined, dp = 2): string {
  if (n == null || !isFinite(n)) return '\u2014';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(dp)}%`;
}

export function fmtSigned(n: number | null | undefined, dp = 2): string {
  if (n == null || !isFinite(n)) return '\u2014';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(dp)}`;
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '\u2014';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '\u2014';
  return n.toLocaleString('en-US');
}

export function fmtTime(ts: number): string {
  return new Date(ts).toISOString().slice(11, 19);
}

export function fmtClock(ts: number): string {
  return new Date(ts).toISOString().slice(11, 16);
}
