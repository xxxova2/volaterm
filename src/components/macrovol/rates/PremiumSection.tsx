import type {
  BasisData,
  CurveShapeData,
  PlumbingData,
  StirStripData,
} from '../../../lib/macrovol/api';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';

export function PremiumSection({
  basis,
  plumbing,
  stir,
  shape,
}: {
  basis: BasisData | null;
  plumbing: PlumbingData | null;
  stir: StirStripData | null;
  shape: CurveShapeData | null;
}) {
  return (
    <CollapsibleSection
      id="sec-premium"
      belowFold
      className="order-9"
      title="BASIS / PREMIUM MAP (DESK)"
      apis={['FRED', 'yfinance']}
      defaultOpen={false}
      storageKey="rates.sec.premium"
      subtitle="Where market pricing often embeds a premium or discount vs fair — not automatic trades."
    >
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {[
          {
            title: 'SOFR − EFFR',
            body: 'Secured vs unsecured overnight. Wide SOFR rich/cheap vs EFFR can flag quarter-end collateral stress or RRP dynamics. Typical ±5bp corridor.',
            signal: basis?.sofr_effr != null
              ? `${basis.sofr_effr >= 0 ? '+' : ''}${Number(basis.sofr_effr).toFixed(1)} bp live`
              : 'load basis',
          },
          {
            title: 'SOFR − IORB',
            body: 'Secured vs reserve floor. Rising toward 0 / positive = tighter plumbing (premium on cash / scarcity). Deeply negative = ample reserves.',
            signal: basis?.sofr_iorb != null
              ? `${basis.sofr_iorb >= 0 ? '+' : ''}${Number(basis.sofr_iorb).toFixed(1)} bp live`
              : 'load basis',
          },
          {
            title: 'EFFR − IORB',
            body: 'Unsecured corridor width. EFFR usually slightly below IORB. Compression or inversion is a corridor-stress flag.',
            signal: basis?.effr_iorb != null
              ? `${basis.effr_iorb >= 0 ? '+' : ''}${Number(basis.effr_iorb).toFixed(1)} bp live`
              : 'load basis',
          },
          {
            title: 'RRP volume vs reserves',
            body: 'High RRP = surplus cash parked at Fed (premium of safety). Falling RRP + rising SOFR-IORB = liquidity leaving RRP into private markets.',
            signal: plumbing?.rrp_volume_latest != null
              ? `RRP $${plumbing.rrp_volume_latest}B`
              : 'load plumbing',
          },
          {
            title: 'STIR path premium',
            body: 'Futures-implied path vs SOFR = priced cuts/hikes. Positive “cuts priced” is not a free long — risk is re-pricing of terminal rate / path volatility.',
            signal: stir?.path?.approx_25bp_cuts_priced != null
              ? `${Math.abs(stir.path.approx_25bp_cuts_priced).toFixed(2)}× 25bp ${
                  stir.path.approx_25bp_cuts_priced > 0 ? 'cuts' : stir.path.approx_25bp_cuts_priced < 0 ? 'hikes' : 'flat'
                }`
              : 'load STIR',
          },
          {
            title: '2s10s / fly',
            body: 'Curve steepener/flattener premium vs DV01-neutral. Fly 2s5s10s positive = belly rich. Use DV01 book (bottom of desk) for $ risk.',
            signal: shape?.regime ? `regime ${shape.regime}` : 'load shape',
          },
        ].map((card) => (
          <div key={card.title} className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-type-sm font-semibold text-foreground">{card.title}</span>
              <span className="text-type-xs font-bold text-foreground">{card.signal}</span>
            </div>
            <p className="mt-1 text-type-xs leading-snug text-muted-foreground">{card.body}</p>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
