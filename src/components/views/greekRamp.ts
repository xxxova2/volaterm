/**
 * Three-stop ramp used to color Greek vertices: cyan -> white -> amber.
 * `t` is clamped to [0, 1].
 */
export function greekRamp01(t: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, t));
  if (v < 0.5) {
    const u = v / 0.5;
    return [u, 0.8 + 0.2 * u, 0.95 + 0.05 * u];
  }
  const u = (v - 0.5) / 0.5;
  return [1.0, 1.0 - 0.25 * u, 1.0 - u];
}
