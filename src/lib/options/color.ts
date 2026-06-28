export function ivRamp01(t: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, t));
  if (v < 0.2) {
    const u = v / 0.2;
    return [0.12 * (1 - u) + 0.2 * u, 0.4 * (1 - u) + 0.7 * u, 0.8 * (1 - u) + 0.9 * u];
  }
  if (v < 0.4) {
    const u = (v - 0.2) / 0.2;
    return [0.2 * (1 - u) + 0.3 * u, 0.7 * (1 - u) + 0.85 * u, 0.9 * (1 - u) + 0.6 * u];
  }
  if (v < 0.6) {
    const u = (v - 0.4) / 0.2;
    return [0.3 * (1 - u) + 0.7 * u, 0.85 * (1 - u) + 0.9 * u, 0.6 * (1 - u) + 0.2 * u];
  }
  if (v < 0.8) {
    const u = (v - 0.6) / 0.2;
    return [0.7 * (1 - u) + 0.95 * u, 0.9 * (1 - u) + 0.7 * u, 0.2 * (1 - u) + 0.05 * u];
  }
  const u = (v - 0.8) / 0.2;
  return [0.95 * (1 - u) + 0.9 * u, 0.7 * (1 - u) + 0.4 * u, 0.05 * (1 - u) + 0.1 * u];
}

export function ivRampCss(t: number, alpha = 1): string {
  const [r, g, b] = ivRamp01(t);
  return `rgba(${(r * 255) | 0}, ${(g * 255) | 0}, ${(b * 255) | 0}, ${alpha})`;
}

export function normalize(v: number, min: number, max: number): number {
  if (max - min === 0) return 0.5;
  return (v - min) / (max - min);
}
