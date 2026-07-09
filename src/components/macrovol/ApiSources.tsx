import type { ReactNode } from 'react';

/** Hover legend for known upstreams (Phase D trust). */
const API_LEGEND: Record<string, string> = {
  FRED: 'Federal Reserve Economic Data — free key recommended · daily/monthly macro & UST',
  NYFed: 'NY Fed Markets API — free, no key · SOFR/EFFR ref prints + volume',
  yfinance: 'Yahoo Finance via local proxy — delayed futures/equity · free',
  MacroVol: 'Local MacroVol service (:8765) — STIR path, DV01, plumbing glue',
  FMP: 'Financial Modeling Prep — spot/profile/news · free tier + paid chain',
  Deribit: 'Deribit public REST — BTC/ETH options mark IV + futures',
  synthetic: 'Demo SVI surface — offline, not market',
};

/**
 * Per-tool API provenance chips — traders see which upstream each section uses.
 * Prefer concrete vendor names (FRED, NYFed, yfinance) over generic "MacroVol".
 */
export function ApiSources({
  apis,
  className = '',
}: {
  /** Unique upstream labels, e.g. ['FRED', 'NYFed', 'yfinance'] */
  apis: string[];
  className?: string;
}) {
  if (!apis.length) return null;
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1 ${className}`}
      title={`Data sources: ${apis.join(' · ')}`}
      data-testid="api-sources"
    >
      <span className="text-[8px] uppercase tracking-wider text-muted-foreground/70">API</span>
      {apis.map((a) => (
        <span
          key={a}
          title={API_LEGEND[a] ?? a}
          className="rounded border border-border/80 bg-background/70 px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground"
        >
          {a}
        </span>
      ))}
    </div>
  );
}

/** Section title row: name + API chips + optional right-side controls */
export function SectionHead({
  title,
  apis,
  children,
  as: Tag = 'h3',
}: {
  title: string;
  apis: string[];
  children?: ReactNode;
  as?: 'h2' | 'h3' | 'h4';
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Tag className="text-xs font-semibold text-foreground">{title}</Tag>
      <ApiSources apis={apis} />
      {children}
    </div>
  );
}
