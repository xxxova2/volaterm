/**
 * Dense inline spark for Home chrome (DES / HIVG / strips).
 * No recharts — SVG path only. Never invents points.
 */
import { DESK_SERIES } from './seriesGrammar';
import { cn } from '../../lib/utils';

export function DeskSpark({
  values,
  color = DESK_SERIES.long,
  width = 96,
  height = 22,
  fill = true,
  className,
  title,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  /** Soft area wash under the line */
  fill?: boolean;
  className?: string;
  title?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 1.5;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / span) * (height - pad * 2) - pad;
    return { x, y };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area =
    fill &&
    `M${pts[0]!.x.toFixed(1)},${height} ` +
      pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L${pts[pts.length - 1]!.x.toFixed(1)},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      className={cn('shrink-0', className)}
      aria-hidden
      aria-label={title}
    >
      {area && <path d={area} fill={color} opacity={0.12} />}
      <polyline fill="none" stroke={color} strokeWidth="1.4" points={line} />
    </svg>
  );
}
