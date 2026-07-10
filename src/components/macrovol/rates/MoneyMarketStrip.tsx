/**
 * Bloomberg-style money-market quote strip — primary data layer for Rates.
 * SOFR / EFFR / IORB / OBFR + overnight spreads. Charts live below this strip.
 */
import type {
  RatesSummary,
  BasisData,
  PlumbingData,
  BasisHistoryData,
  StirStripData,
} from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { cn } from '../../../lib/utils';

type QuoteCell = {
  label: string;
  value: number | null;
  suffix?: string;
  /** Absolute 1d change in same units as value (percentage points for rates). */
  d1?: number | null;
  sub?: string;
  emphasize?: boolean;
};

type SpreadCell = {
  label: string;
  bps: number | null;
  hint?: string;
};

function fmtRate(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}

function fmtBps(bps: number | null | undefined): string {
  if (bps == null || !Number.isFinite(bps)) return '—';
  const sign = bps > 0 ? '+' : '';
  return `${sign}${bps.toFixed(1)}`;
}

function fmtDeltaPp(d: number | null | undefined): string {
  if (d == null || !Number.isFinite(d)) return '';
  // Show in bp when |Δ| < 0.5pp for readability
  const bp = d * 100;
  const sign = bp > 0 ? '+' : '';
  return `${sign}${bp.toFixed(1)}bp`;
}

function rateFromNyFed(
  nyfed: StirStripData['nyfed'] | undefined,
  code: string,
): number | null {
  const row = nyfed?.ref_print?.find((r) => r.code === code);
  return row?.rate != null && Number.isFinite(row.rate) ? row.rate : null;
}

function sofrOneDayDelta(hist: BasisHistoryData | null): number | null {
  const rows = hist?.history;
  if (!rows || rows.length < 2) return null;
  const a = rows[rows.length - 1]?.sofr;
  const b = rows[rows.length - 2]?.sofr;
  if (a == null || b == null) return null;
  return a - b;
}

export function MoneyMarketStrip({
  summary,
  basis,
  plumbing,
  basisHist,
  stir,
}: {
  summary: RatesSummary | null;
  basis: BasisData | null;
  plumbing: PlumbingData | null;
  basisHist: BasisHistoryData | null;
  stir: StirStripData | null;
}) {
  const ny = stir?.nyfed;
  const sofr =
    basis?.sofr ?? plumbing?.sofr ?? summary?.sofr ?? rateFromNyFed(ny, 'SOFR');
  const effr =
    basis?.effr ?? plumbing?.effr ?? summary?.effr ?? rateFromNyFed(ny, 'EFFR');
  const iorb = basis?.iorb ?? plumbing?.iorb ?? null;
  const obfr = rateFromNyFed(ny, 'OBFR');
  const d1Sofr = sofrOneDayDelta(basisHist);

  const quotes: QuoteCell[] = [
    {
      label: 'SOFR',
      value: sofr,
      suffix: '%',
      d1: d1Sofr,
      sub: 'Secured ON',
      emphasize: true,
    },
    {
      label: 'EFFR',
      value: effr,
      suffix: '%',
      sub: 'Unsecured ON',
    },
    {
      label: 'IORB',
      value: iorb,
      suffix: '%',
      sub: 'Reserve floor',
    },
    {
      label: 'OBFR',
      value: obfr,
      suffix: '%',
      sub: 'Broad funding',
    },
  ];

  const spreads: SpreadCell[] = [
    {
      label: 'SOFR−EFFR',
      bps:
        basis?.sofr_effr
        ?? (sofr != null && effr != null ? (sofr - effr) * 100 : null),
      hint: basis?.context?.sofr_effr,
    },
    {
      label: 'SOFR−IORB',
      bps:
        basis?.sofr_iorb
        ?? (sofr != null && iorb != null ? (sofr - iorb) * 100 : null),
      hint: basis?.context?.sofr_iorb,
    },
    {
      label: 'SOFR−OBFR',
      bps: sofr != null && obfr != null ? (sofr - obfr) * 100 : null,
      hint: 'Secured SOFR vs broad unsecured OBFR (NY Fed).',
    },
    {
      label: 'EFFR−IORB',
      bps:
        basis?.effr_iorb
        ?? (effr != null && iorb != null ? (effr - iorb) * 100 : null),
      hint: basis?.context?.effr_iorb,
    },
  ];

  const asOf =
    basis?.obs_dates?.SOFR
    || ny?.as_of
    || summary?.obs_dates?.SOFR
    || basis?.as_of
    || summary?.as_of;

  const sourceBits = [
    basis?.source,
    ny?.source,
    summary?.source,
  ].filter(Boolean);
  const source = sourceBits[0] || 'FRED · NYFed';

  return (
    <CollapsibleSection
      id="sec-mm-strip"
      title="MONEY MARKETS"
      apis={['FRED', 'NYFed']}
      defaultOpen
      storageKey="rates.sec.mm-strip"
      subtitle="Primary prints · data first — charts for the same series sit directly below"
      badge={
        basis?.regime ? (
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-type-2xs font-bold uppercase',
              basis.regime === 'corridor_normal' && 'bg-up/15 text-up',
              basis.regime === 'above_floor' && 'bg-warn/15 text-warn',
              basis.regime === 'wide_discount' && 'bg-down/15 text-down',
            )}
          >
            {basis.regime.replace(/_/g, ' ')}
          </span>
        ) : null
      }
    >
      {/* Rate quotes — Bloomberg-style primary row */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {quotes.map((q) => {
          const d = q.d1;
          const dColor =
            d == null ? 'text-muted-foreground'
              : d > 0.0005 ? 'text-down'
                : d < -0.0005 ? 'text-up'
                  : 'text-muted-foreground';
          return (
            <div
              key={q.label}
              className={cn(
                'rounded border px-2 py-1.5',
                q.emphasize
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-background/50',
              )}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-type-xs font-semibold tracking-wide text-muted-foreground">
                  {q.label}
                </span>
                {q.sub && (
                  <span className="truncate text-type-2xs text-muted-foreground/80">{q.sub}</span>
                )}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span
                  className={cn(
                    'font-mono tabular-nums font-bold text-foreground',
                    q.emphasize ? 'text-2xl leading-none' : 'text-xl leading-none',
                  )}
                >
                  {fmtRate(q.value)}
                  {q.value != null && (
                    <span className="ml-0.5 text-type-xs font-normal text-muted-foreground">
                      {q.suffix}
                    </span>
                  )}
                </span>
                {q.label === 'SOFR' && d != null && (
                  <span className={cn('font-mono text-type-xs tabular-nums', dColor)} title="1d change">
                    1d {fmtDeltaPp(d)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overnight spreads — same hierarchy, still primary data */}
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {spreads.map((s) => {
          const neg = s.bps != null && s.bps < 0;
          const pos = s.bps != null && s.bps > 0;
          return (
            <div
              key={s.label}
              className="rounded border border-border bg-card/60 px-2 py-1.5"
              title={s.hint}
            >
              <div className="text-type-xs text-muted-foreground">{s.label}</div>
              <div
                className={cn(
                  'mt-0.5 font-mono text-lg font-bold tabular-nums leading-none',
                  neg && 'text-down',
                  pos && 'text-foreground',
                  s.bps == null && 'text-muted-foreground',
                )}
              >
                {fmtBps(s.bps)}
                <span className="ml-0.5 text-type-2xs font-normal text-muted-foreground">bp</span>
              </div>
            </div>
          );
        })}
      </div>

      {basis?.regime_note && (
        <p className="mt-1.5 text-type-xs text-muted-foreground">{basis.regime_note}</p>
      )}

      <DataBadge
        asOf={asOf}
        source={source}
        note="Rates in % · spreads in bp (×100 on % prints). No synthetic levels."
        staleThresholdMin={60}
        className="mt-1"
      />
    </CollapsibleSection>
  );
}
