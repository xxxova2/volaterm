import type { SVIReadout } from '../../lib/options/surfaceTools';
import type { NoArbResult } from '../../lib/options/noarb';
import { fmtPct, fmtInt } from '../../lib/format';

export interface DiagnosticsStripProps {
  sviReadout: SVIReadout | null;
  arbResult: NoArbResult | null;
  'data-testid'?: string;
}

interface StatBlockProps {
  label: string;
  value: string;
  valueClassName: string;
  testId?: string;
}

function StatBlock({ label, value, valueClassName, testId }: StatBlockProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={`font-mono text-sm font-semibold tabular-nums ${valueClassName}`}
        data-testid={testId}
      >
        {value}
      </span>
    </div>
  );
}

export function DiagnosticsStrip({ sviReadout, arbResult, 'data-testid': testId }: DiagnosticsStripProps) {
  const rmseValue = sviReadout ? fmtPct(sviReadout.rmse) : '\u2014';
  const calendarValue = arbResult ? fmtInt(arbResult.calendar.violations) : '\u2014';
  const butterflyValue = arbResult ? fmtInt(arbResult.butterfly.violations) : '\u2014';

  const calendarClass = arbResult && arbResult.calendar.violations > 0 ? 'text-red-400' : 'text-green-400';
  const butterflyClass = arbResult && arbResult.butterfly.violations > 0 ? 'text-red-400' : 'text-green-400';

  const arbClean = arbResult?.clean ?? true;

  return (
    <div
      className="flex items-center justify-between gap-4 px-3 py-2"
      data-testid={testId ?? 'diagnostics-strip'}
      data-arb-clean={arbClean ? 'true' : 'false'}
    >
      <div className="flex items-center gap-5">
        <StatBlock label="SVI RMSE" value={rmseValue} valueClassName="text-foreground" testId="diagnostics-svi-rmse" />
        <StatBlock
          label="Calendar"
          value={calendarValue}
          valueClassName={calendarClass}
          testId="diagnostics-calendar"
        />
        <StatBlock
          label="Butterfly"
          value={butterflyValue}
          valueClassName={butterflyClass}
          testId="diagnostics-butterfly"
        />
      </div>
      <span
        className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
          arbClean ? 'bg-up/15 text-up' : 'bg-down/15 text-down'
        }`}
        data-testid="diagnostics-arb-badge"
        data-arb-clean={arbClean ? 'true' : 'false'}
      >
        {arbClean ? 'Clean' : 'Arb'}
      </span>
    </div>
  );
}

export default DiagnosticsStrip;
