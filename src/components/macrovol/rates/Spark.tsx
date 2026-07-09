export function Spark({ values, color = '#3b82f6' }: { values: number[]; color?: string }) {
  if (!values.length) return <div className="h-8 text-[9px] text-muted-foreground">no history</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * w;
    const y = h - ((v - min) / span) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}
