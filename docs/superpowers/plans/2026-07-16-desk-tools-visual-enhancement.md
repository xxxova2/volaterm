# Desk Tools Visual Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace AI-slop Trade desk charts/chrome with a shared kit (Thalex craft + Bloomberg density), migrate all 12 native Trade tools onto it, then reuse the kit on later desks.

**Architecture:** Kit-first. Build `DeskToolShell` + `DeskChart` + `seriesGrammar` + `PrintStrip` + amber field styles; extract tools from monolithic `DeskView.tsx` into `src/components/desk/tools/*`; leave math in `src/lib/options/*`. Crypto Thalex iframes, Vol surface, and full Greeks stay untouched.

**Tech Stack:** React 18, TypeScript, Recharts, Zustand (`terminalStore`), Vitest + Testing Library, Tailwind v4 + `chartTheme` tokens, Vite.

**Spec:** `docs/superpowers/specs/2026-07-16-desk-tools-visual-enhancement-design.md`

**Scope of this plan:** Trade phases **T0–T5** (kit + all 12 tools). Later waves (Flow, Smile/Term/Fit, Rates narrow, Home, Academy) are listed at the end as **follow-up plan stubs** — implement only after T5 unless the user expands scope mid-flight.

---

## File map

| Path | Responsibility |
|------|----------------|
| `src/lib/chartTheme.ts` | Existing tokens; add tick formatters + axis label style + DESK_SERIES roles |
| `src/lib/chartTheme.test.ts` | Tests for new formatters / DESK_SERIES uniqueness |
| `src/components/desk/seriesGrammar.ts` | Re-export desk series roles + legend labels (thin façade) |
| `src/components/desk/PrintStrip.tsx` | Dense mono key-value print cells |
| `src/components/desk/PrintStrip.test.tsx` | Render labels/values |
| `src/components/desk/DeskField.tsx` | Amber editable label+input/select chrome |
| `src/components/desk/DeskChart.tsx` | Black field container + axis title helpers + default Recharts props |
| `src/components/desk/DeskChart.test.tsx` | Renders titles; exports helpers |
| `src/components/desk/DeskToolShell.tsx` | Controls row + print + children layout |
| `src/components/desk/DeskToolShell.test.tsx` | Structure smoke test |
| `src/components/desk/tools/*.tsx` | One file per Trade tool |
| `src/components/views/DeskView.tsx` | Router + listed-Σ strip + Thalex iframe path only |
| `src/index.css` | Optional `.desk-field` utility if class is cleaner than Tailwind strings |

**Do not modify (this plan):** `Greeks10View.tsx`, `surface/*`, `BtcView` Thalex embed path beyond leaving `chrome==='thalex'` intact.

---

### Task 1: DESK_SERIES + tick formatters in chartTheme

**Files:**
- Modify: `src/lib/chartTheme.ts`
- Modify: `src/lib/chartTheme.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/chartTheme.test.ts`:

```ts
import {
  DESK_SERIES,
  chartPriceTick,
  chartPctTick,
  chartDayTick,
  chartSignedTick,
  chartAxisLabelStyle,
} from './chartTheme';

describe('DESK_SERIES + ticks', () => {
  it('maps combo/long/short/spot roles to distinct token strings', () => {
    expect(DESK_SERIES.combo).toBe(CHART.series.live);
    expect(DESK_SERIES.long).toBe(CHART.series.info);
    expect(DESK_SERIES.short).toBe(CHART.series.down);
    expect(DESK_SERIES.spot).toBe(CHART.series.amber);
    expect(DESK_SERIES.median).toBe(CHART.series.brand);
    expect(DESK_SERIES.bandOuter).toBe(CHART.series.info);
    expect(DESK_SERIES.bandInner).toBe(CHART.series.brand);
    const roles = Object.values(DESK_SERIES);
    // combo is white/live — may equal other roles only if intentionally aliased; require long ≠ short
    expect(DESK_SERIES.long).not.toBe(DESK_SERIES.short);
  });

  it('formats price / pct / day / signed ticks', () => {
    expect(chartPriceTick(1234.5)).toMatch(/1,?235|1235|1.23k/i);
    expect(chartPctTick(0.123)).toMatch(/%/);
    expect(chartDayTick(21.4)).toMatch(/21/);
    expect(chartSignedTick(-12.3)).toMatch(/-/);
  });

  it('exports axis label style with mono family', () => {
    expect(chartAxisLabelStyle.fill).toBeTruthy();
    expect(String(chartAxisLabelStyle.fontFamily)).toMatch(/mono/i);
  });
});
```

Adjust `chartPriceTick` expectation to match the formatter you implement (prefer simple: `n >= 1000 ? n.toFixed(0) : n.toFixed(2)` → `'1235'` for 1234.5).

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/kalde/trading-terminal-pro
npm test -- --run src/lib/chartTheme.test.ts
```

Expected: FAIL — `DESK_SERIES` / tick helpers not exported.

- [ ] **Step 3: Implement minimal additions in chartTheme.ts**

Append before the canvas section (or after `chartGridProps`):

```ts
/** Trade / desk series roles — Thalex-class grammar. */
export const DESK_SERIES = {
  combo: CHART.series.live,
  long: CHART.series.info,
  short: CHART.series.down,
  spot: CHART.series.amber,
  median: CHART.series.brand,
  bandOuter: CHART.series.info,
  bandInner: CHART.series.brand,
  zero: CHART.series.muted,
  historyLive: CHART.series.live,
  historyCompare: CHART.series.compare,
} as const;

export const chartAxisLabelStyle = {
  fill: CHART.axisMuted,
  fontSize: 10,
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
} as const;

export function chartPriceTick(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

export function chartPctTick(v: number, asFraction = true): string {
  if (!Number.isFinite(v)) return '—';
  const pct = asFraction ? v * 100 : v;
  return `${pct.toFixed(1)}%`;
}

export function chartDayTick(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v)}d`;
}

export function chartSignedTick(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}`;
}
```

Fix test expectations to match:

```ts
expect(chartPriceTick(1234.5)).toBe('1235'); // or '1234' if toFixed(0) rounds — use 1234 → '1234'
expect(chartPriceTick(1234)).toBe('1234');
expect(chartPctTick(0.123)).toBe('12.3%');
expect(chartDayTick(21.4)).toBe('21d');
expect(chartSignedTick(-12.3)).toBe('-12.3');
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- --run src/lib/chartTheme.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/chartTheme.ts src/lib/chartTheme.test.ts
git commit -m "feat(chart): DESK_SERIES roles and tick formatters"
```

---

### Task 2: seriesGrammar façade

**Files:**
- Create: `src/components/desk/seriesGrammar.ts`
- Create: `src/components/desk/seriesGrammar.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/components/desk/seriesGrammar.test.ts
import { describe, it, expect } from 'vitest';
import { DESK_SERIES, DESK_LEGEND } from './seriesGrammar';

describe('seriesGrammar', () => {
  it('exposes legend labels for combo/long/short', () => {
    expect(DESK_LEGEND.combo).toMatch(/combo/i);
    expect(DESK_LEGEND.long).toMatch(/long|buy/i);
    expect(DESK_LEGEND.short).toMatch(/short|sell/i);
    expect(DESK_SERIES.long).not.toBe(DESK_SERIES.short);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

```bash
npm test -- --run src/components/desk/seriesGrammar.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/components/desk/seriesGrammar.ts
export { DESK_SERIES } from '../../lib/chartTheme';

/** Human legend strings for desk charts. */
export const DESK_LEGEND = {
  combo: 'Combo',
  long: 'Long / buy',
  short: 'Short / sell',
  spot: 'Spot',
  median: 'Median',
  p50: 'p50',
  market: 'Market',
  fair: 'Fair',
  edge: 'Edge',
  pnl: 'PnL',
  netDelta: 'Net Δ',
} as const;
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- --run src/components/desk/seriesGrammar.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/components/desk/seriesGrammar.ts src/components/desk/seriesGrammar.test.ts
git commit -m "feat(desk): seriesGrammar legend façade"
```

---

### Task 3: PrintStrip

**Files:**
- Create: `src/components/desk/PrintStrip.tsx`
- Create: `src/components/desk/PrintStrip.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
// src/components/desk/PrintStrip.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintStrip } from './PrintStrip';

describe('PrintStrip', () => {
  it('renders label and value cells', () => {
    render(
      <PrintStrip
        items={[
          { label: 'E[PnL]', value: '+12.3', tone: 'up' },
          { label: 'Win', value: '55%' },
        ]}
      />,
    );
    expect(screen.getByText('E[PnL]')).toBeTruthy();
    expect(screen.getByText('+12.3')).toBeTruthy();
    expect(screen.getByText('Win')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- --run src/components/desk/PrintStrip.test.tsx
```

- [ ] **Step 3: Implement**

```tsx
// src/components/desk/PrintStrip.tsx
import { cn } from '../../lib/utils';

export type PrintItem = {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'muted' | 'default';
  title?: string;
};

const toneClass: Record<NonNullable<PrintItem['tone']>, string> = {
  up: 'text-up',
  down: 'text-down',
  muted: 'text-muted-foreground',
  default: 'text-foreground',
};

export function PrintStrip({ items, className }: { items: PrintItem[]; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-x-3 gap-y-1 rounded border border-border bg-black/40 px-2 py-1 font-mono',
        className,
      )}
    >
      {items.map((it) => (
        <div key={it.label} className="flex flex-col" title={it.title}>
          <span className="text-type-2xs uppercase tracking-wider text-muted-foreground">{it.label}</span>
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              toneClass[it.tone ?? 'default'],
            )}
          >
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run — PASS**

```bash
npm test -- --run src/components/desk/PrintStrip.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/desk/PrintStrip.tsx src/components/desk/PrintStrip.test.tsx
git commit -m "feat(desk): PrintStrip dense key-value row"
```

---

### Task 4: DeskField (amber editable)

**Files:**
- Create: `src/components/desk/DeskField.tsx`
- Create: `src/components/desk/DeskField.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeskField, DeskSelect } from './DeskField';

describe('DeskField', () => {
  it('renders amber input and calls onChange', () => {
    const onChange = vi.fn();
    render(<DeskField label="Drift μ" value={0.1} onChange={onChange} step={0.01} />);
    expect(screen.getByText('Drift μ')).toBeTruthy();
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '0.2' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders select options', () => {
    render(
      <DeskSelect
        label="Type"
        value="call"
        onChange={() => {}}
        options={[
          { value: 'call', label: 'Calls' },
          { value: 'put', label: 'Puts' },
        ]}
      />,
    );
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByDisplayValue('Calls')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
npm test -- --run src/components/desk/DeskField.test.tsx
```

- [ ] **Step 3: Implement**

```tsx
// src/components/desk/DeskField.tsx
import type { ChangeEvent } from 'react';
import { cn } from '../../lib/utils';

const fieldClass =
  'w-full min-w-[4rem] rounded border border-amber-500/40 bg-background px-1.5 py-0.5 font-mono text-xs text-foreground shadow-[inset_0_0_0_1px_rgba(232,168,56,0.12)] focus:border-amber-400 focus:outline-none';

const labelClass = 'flex flex-col gap-0.5 font-mono text-type-2xs uppercase tracking-wider text-amber-500/90';

export function DeskField({
  label,
  value,
  onChange,
  step,
  min,
  max,
  className,
  inputClassName,
}: {
  label: string;
  value: number | string;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <label className={cn(labelClass, className)}>
      {label}
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(+e.target.value)}
        className={cn(fieldClass, inputClassName)}
      />
    </label>
  );
}

export function DeskSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn(labelClass, className)}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={fieldClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 4: Run — PASS**

```bash
npm test -- --run src/components/desk/DeskField.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/desk/DeskField.tsx src/components/desk/DeskField.test.tsx
git commit -m "feat(desk): amber DeskField / DeskSelect controls"
```

---

### Task 5: DeskChart shell + axis helpers

**Files:**
- Create: `src/components/desk/DeskChart.tsx`
- Create: `src/components/desk/DeskChart.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeskChartFrame, deskAxisLabel } from './DeskChart';

describe('DeskChart', () => {
  it('renders black frame with axis title captions', () => {
    render(
      <DeskChartFrame xTitle="Days" yTitle="PnL ($)" height={120}>
        <div data-testid="plot">plot</div>
      </DeskChartFrame>,
    );
    expect(screen.getByText(/PnL/)).toBeTruthy();
    expect(screen.getByText(/Days/)).toBeTruthy();
    expect(screen.getByTestId('plot')).toBeTruthy();
  });

  it('deskAxisLabel builds Recharts label props', () => {
    const lab = deskAxisLabel('Spot');
    expect(lab.value).toBe('Spot');
    expect(lab.position).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
npm test -- --run src/components/desk/DeskChart.test.tsx
```

- [ ] **Step 3: Implement**

```tsx
// src/components/desk/DeskChart.tsx
import type { ReactNode, CSSProperties } from 'react';
import { cn } from '../../lib/utils';
import {
  CHART,
  chartAxisTick,
  chartGridProps,
  chartTooltipStyle,
  chartAxisLabelStyle,
} from '../../lib/chartTheme';

/** Recharts axis label prop object. */
export function deskAxisLabel(
  value: string,
  position: 'insideBottom' | 'insideLeft' | 'insideTop' | 'insideRight' = 'insideBottom',
): { value: string; position: typeof position; style: CSSProperties; offset?: number } {
  return {
    value,
    position,
    offset: position === 'insideBottom' ? -2 : 8,
    style: { ...chartAxisLabelStyle },
  };
}

export const deskDefaultMargin = { top: 12, right: 14, bottom: 22, left: 8 };

export function deskChartChrome() {
  return {
    grid: chartGridProps,
    tick: chartAxisTick,
    tooltipStyle: chartTooltipStyle,
    axisLine: CHART.axisLine,
    margin: deskDefaultMargin,
  };
}

/**
 * Black chart field + optional axis title strip (outside Recharts when needed).
 * Prefer Recharts label={{...deskAxisLabel()}} on axes; captions here for a11y/tests.
 */
export function DeskChartFrame({
  children,
  xTitle,
  yTitle,
  height,
  className,
  header,
}: {
  children: ReactNode;
  xTitle?: string;
  yTitle?: string;
  height?: number | string;
  className?: string;
  header?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col rounded border border-border bg-black',
        className,
      )}
      style={height != null ? { height, minHeight: height } : undefined}
    >
      {(header || yTitle) && (
        <div className="flex shrink-0 items-center justify-between gap-2 px-2 pt-1 font-mono text-type-2xs text-zinc-500">
          <span>{yTitle}</span>
          {header}
        </div>
      )}
      <div className="min-h-0 flex-1 px-0.5 pb-0.5">{children}</div>
      {xTitle && (
        <div className="shrink-0 pb-1 text-center font-mono text-type-2xs text-zinc-500">{xTitle}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — PASS**

```bash
npm test -- --run src/components/desk/DeskChart.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/desk/DeskChart.tsx src/components/desk/DeskChart.test.tsx
git commit -m "feat(desk): DeskChartFrame and axis label helpers"
```

---

### Task 6: DeskToolShell

**Files:**
- Create: `src/components/desk/DeskToolShell.tsx`
- Create: `src/components/desk/DeskToolShell.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeskToolShell } from './DeskToolShell';
import { PrintStrip } from './PrintStrip';

describe('DeskToolShell', () => {
  it('lays out controls, print strip, and body', () => {
    render(
      <DeskToolShell
        controls={<span>CTRL</span>}
        print={<PrintStrip items={[{ label: 'X', value: '1' }]} />}
      >
        <div>BODY</div>
      </DeskToolShell>,
    );
    expect(screen.getByText('CTRL')).toBeTruthy();
    expect(screen.getByText('X')).toBeTruthy();
    expect(screen.getByText('BODY')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
npm test -- --run src/components/desk/DeskToolShell.test.tsx
```

- [ ] **Step 3: Implement**

```tsx
// src/components/desk/DeskToolShell.tsx
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function DeskToolShell({
  controls,
  print,
  children,
  className,
  bodyClassName,
}: {
  controls?: ReactNode;
  print?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-1', className)}>
      {controls && (
        <div className="flex shrink-0 flex-wrap items-end gap-2 rounded border border-border bg-card/60 px-2 py-1">
          {controls}
        </div>
      )}
      {print && <div className="shrink-0">{print}</div>}
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run — PASS**

```bash
npm test -- --run src/components/desk/DeskToolShell.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/desk/DeskToolShell.tsx src/components/desk/DeskToolShell.test.tsx
git commit -m "feat(desk): DeskToolShell layout chrome"
```

---

### Task 7: Extract SimTool onto kit (T1)

**Files:**
- Create: `src/components/desk/tools/SimTool.tsx`
- Modify: `src/components/views/DeskView.tsx` (import + remove local `SimTool`)

- [ ] **Step 1: Create SimTool with kit**

Create `src/components/desk/tools/SimTool.tsx` by moving logic from `DeskView.tsx` `SimTool` (lines ~678–745). Replace controls with `DeskField`/`DeskSelect`, stats with `PrintStrip`, chart wrapper with `DeskChartFrame` + theme props.

Key chart wiring (keep `simulatePaths` math unchanged):

```tsx
import { useMemo, useState } from 'react';
import {
  Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTerminalStore } from '../../../store/terminalStore';
import { templateLegs } from '../../../lib/options/portfolio';
import { simulatePaths } from '../../../lib/options/pathSim';
import { fmtPct, fmtSigned } from '../../../lib/format';
import { DeskToolShell } from '../DeskToolShell';
import { DeskField, DeskSelect } from '../DeskField';
import { PrintStrip } from '../PrintStrip';
import { DeskChartFrame, deskChartChrome, deskAxisLabel } from '../DeskChart';
import { DESK_SERIES } from '../seriesGrammar';
import { chartDayTick, chartSignedTick, tightDomain } from '../../../lib/chartTheme';

export function SimTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const [drift, setDrift] = useState(0);
  const [vol, setVol] = useState(snapshot.expiries[0]?.atmIV ?? 0.25);
  const [days, setDays] = useState(21);
  const [template, setTemplate] = useState<'short_straddle' | 'long_straddle' | 'long_call'>('short_straddle');

  const legs = useMemo(() => templateLegs(template, snapshot, 0), [template, snapshot]);
  const sim = useMemo(
    () => simulatePaths(legs, snapshot, { drift, vol, days, steps: 40, paths: 200, seed: 99 }),
    [legs, snapshot, drift, vol, days],
  );

  const chart = sim.t.map((t, i) => ({
    t,
    p5: sim.pnlBands.p5[i],
    p25: sim.pnlBands.p25[i],
    p50: sim.pnlBands.p50[i],
    p75: sim.pnlBands.p75[i],
    p95: sim.pnlBands.p95[i],
  }));

  const chrome = deskChartChrome();
  const yDomain = tightDomain(chart.flatMap((r) => [r.p5, r.p95]), 0.08, { includeZero: true });
  const last = chart.length - 1;

  return (
    <DeskToolShell
      controls={
        <>
          <DeskSelect
            label="Structure"
            value={template}
            onChange={setTemplate}
            options={[
              { value: 'short_straddle', label: 'Short straddle' },
              { value: 'long_straddle', label: 'Long straddle' },
              { value: 'long_call', label: 'Long call' },
            ]}
          />
          <DeskField label="Drift μ" value={drift} onChange={setDrift} step={0.01} />
          <DeskField label="Realized σ" value={vol} onChange={setVol} step={0.01} />
          <DeskField label="Horizon d" value={days} onChange={setDays} step={1} min={1} />
        </>
      }
      print={
        <PrintStrip
          items={[
            {
              label: 'E[PnL]',
              value: fmtSigned(sim.meanTerminalPnl),
              tone: sim.meanTerminalPnl >= 0 ? 'up' : 'down',
            },
            { label: 'Win', value: fmtPct(sim.winRate) },
            {
              label: 'p5 term',
              value: fmtSigned(sim.pnlBands.p5[last] ?? 0),
              tone: 'down',
            },
            {
              label: 'p95 term',
              value: fmtSigned(sim.pnlBands.p95[last] ?? 0),
              tone: 'up',
            },
          ]}
        />
      }
    >
      <DeskChartFrame xTitle="Horizon (days)" yTitle="PnL ($)" className="min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={chrome.margin}>
            <CartesianGrid {...chrome.grid} />
            <XAxis
              dataKey="t"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              tickFormatter={(v: number) => chartDayTick(v)}
              label={deskAxisLabel('Days')}
            />
            <YAxis
              tick={chrome.tick}
              stroke={chrome.axisLine}
              width={52}
              domain={yDomain}
              tickFormatter={(v: number) => chartSignedTick(v, 0)}
              label={deskAxisLabel('PnL ($)', 'insideLeft')}
            />
            <Tooltip contentStyle={chrome.tooltipStyle} />
            <ReferenceLine y={0} stroke={DESK_SERIES.zero} />
            <Area type="monotone" dataKey="p95" stroke="none" fill={DESK_SERIES.bandOuter} fillOpacity={0.12} />
            <Area type="monotone" dataKey="p5" stroke="none" fill="#000" fillOpacity={1} />
            <Area type="monotone" dataKey="p75" stroke="none" fill={DESK_SERIES.bandInner} fillOpacity={0.18} />
            <Area type="monotone" dataKey="p25" stroke="none" fill="#000" fillOpacity={1} />
            <Line type="monotone" dataKey="p50" stroke={DESK_SERIES.median} strokeWidth={2} dot={false} name="p50" />
          </ComposedChart>
        </ResponsiveContainer>
      </DeskChartFrame>
    </DeskToolShell>
  );
}
```

Add missing import: `CartesianGrid` from recharts.

- [ ] **Step 2: Wire DeskView**

At top of `DeskView.tsx` trade tools section:

```ts
import { SimTool } from '../desk/tools/SimTool';
```

Delete local `function SimTool() { ... }` entirely. Keep `{tool === 'sim' && snapshot && <SimTool />}`.

- [ ] **Step 3: Run related tests + typecheck**

```bash
npm test -- --run src/components/desk src/lib/chartTheme.test.ts
npx tsc -b --pretty false 2>&1 | tail -40
```

Expected: tests pass; no new TS errors in desk files.

- [ ] **Step 4: Manual check**

Open Trade → Simulator. Confirm amber fields, print strip, black chart, axis titles Days / PnL.

- [ ] **Step 5: Commit**

```bash
git add src/components/desk/tools/SimTool.tsx src/components/views/DeskView.tsx
git commit -m "feat(desk): migrate Simulator onto DeskChart kit"
```

---

### Task 8: Combo Greeks tool (T1)

**Files:**
- Create: `src/components/desk/tools/ComboGreeksTool.tsx`
- Modify: `src/components/views/DeskView.tsx` — remove `ComboTool`, import new

- [ ] **Step 1: Migrate ComboTool**

Move `ComboTool` from DeskView (~491–567) to `ComboGreeksTool.tsx`.

Requirements:
- `DeskToolShell` + `DeskSelect` for template/expiry
- `PrintStrip` for Mark, PnL, Δ, Γ, ν, Θ, BEs
- Two `DeskChartFrame` panels in `grid grid-cols-1 md:grid-cols-2`:
  - Left: PnL vs spot — X `Spot`, Y `PnL ($)`, `ReferenceLine x={spot}` with `DESK_SERIES.spot`, zero Y line, area fill `DESK_SERIES.combo`
  - Right: greeks vs spot — lines use `CHART_GREEK.delta/gamma` and `DESK_SERIES` for vega; legend via `name=` props
- Use `chartPriceTick`, `deskChartChrome`, `tightDomain`

Export: `export function ComboGreeksTool()`.

- [ ] **Step 2: DeskView router**

```ts
import { ComboGreeksTool } from '../desk/tools/ComboGreeksTool';
// ...
{tool === 'combo' && snapshot && <ComboGreeksTool />}
```

Delete local `ComboTool`.

- [ ] **Step 3: Verify**

```bash
npx tsc -b --pretty false 2>&1 | tail -20
npm test -- --run src/components/desk
```

Manual: Trade → Combo Greeks — dual panels, labeled axes, spot dash.

- [ ] **Step 4: Commit**

```bash
git add src/components/desk/tools/ComboGreeksTool.tsx src/components/views/DeskView.tsx
git commit -m "feat(desk): migrate Combo Greeks onto kit"
```

---

### Task 9: Option Grid tool (T1)

**Files:**
- Create: `src/components/desk/tools/GridTool.tsx`
- Modify: `src/components/views/DeskView.tsx`

- [ ] **Step 1: Migrate GridTool**

Move grid table from DeskView (~882+). Visual upgrades (no math change):
- `DeskToolShell` + amber selects for type/metric
- `PrintStrip`: Strikes, Expiries, Spot
- Table on black/card field; sticky K column + sticky header
- Highlight row nearest spot with `bg-amber-500/10` and left border amber
- Cell color: keep intensity by |metric|/maxAbs but use `text-up` / `text-down` / zinc for near-zero — no rainbow random

- [ ] **Step 2: Wire + delete local GridTool**

- [ ] **Step 3: Verify tsc + manual Grid**

- [ ] **Step 4: Commit**

```bash
git add src/components/desk/tools/GridTool.tsx src/components/views/DeskView.tsx
git commit -m "feat(desk): migrate Option Grid with spot highlight"
```

---

### Task 10: Break-even BBG-first (T2)

**Files:**
- Create: `src/components/desk/tools/BreakEvenTool.tsx`
- Modify: `src/components/views/DeskView.tsx`

- [ ] **Step 1: Migrate with B-primary layout**

Structure:

```tsx
<DeskToolShell controls={…DeskSelect expiry/type…} print={PrintStrip spot + row count}>
  <div className="grid h-full min-h-0 grid-rows-[1fr_minmax(100px,28%)] gap-1">
    {/* PRIMARY: dense table */}
    <div className="min-h-0 overflow-auto rounded border border-border bg-card">
      <table className="w-full font-mono text-type-xs">… sticky head, tabular-nums …</table>
    </div>
    {/* SECONDARY: small payoff/BE distance chart if near rows exist */}
    <DeskChartFrame xTitle="Strike" yTitle="BE dist %" height={120}>
      {/* bar or line of beDistPct vs strike; spot ref */}
    </DeskChartFrame>
  </div>
</DeskToolShell>
```

Table columns stay: K, Type, Mid, BE, BE dist, N(d2), Δ, IV.  
Call type = `text-up`, put = `text-down`. ATM row (min |K−spot|) gets amber left border.

- [ ] **Step 2: Wire router `breakeven`**

- [ ] **Step 3: Manual — table dominates; chart ≤ ~30% height**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(desk): Break-even Bloomberg-first matrix + support chart"
```

---

### Task 11: Subjective tool (T2)

**Files:**
- Create: `src/components/desk/tools/SubjectiveTool.tsx`
- Modify: `src/components/views/DeskView.tsx`

- [ ] **Step 1: Migrate**

- Amber μ / VRP fields
- PrintStrip: Avg edge, Cheap, Rich, Best long
- Chart: market (muted) vs fair (brand) vs edge (info dashed); X Strike, Y Price ($); spot ref
- Optional: dense edge table under chart if space — not required for pass

- [ ] **Step 2: Wire + commit**

```bash
git commit -m "feat(desk): migrate Subjective Valuation onto kit"
```

---

### Task 12: Historical PnL family (T3)

**Files:**
- Create: `src/components/desk/tools/ComboPnlTool.tsx`
- Create: `src/components/desk/tools/OptionPnlTool.tsx`
- Create: `src/components/desk/tools/StraddleTool.tsx`
- Create: `src/components/desk/useSpotPath.ts` (move `useSpotPath` out of DeskView)
- Modify: `src/components/views/DeskView.tsx`

- [ ] **Step 1: Extract `useSpotPath`**

Move `useSpotPath` from DeskView to `src/components/desk/useSpotPath.ts` unchanged. Export it. Update tool files to import from there.

- [ ] **Step 2: Migrate three tools**

Shared history axis rules for all three:
- X title: `Date` or `Session` (match existing dataKey)
- Y title: `PnL ($)`
- Live series: `DESK_SERIES.historyLive`
- Secondary / greek decomp lines: `CHART_GREEK` or ordinal
- Empty path: honest empty state (already fail-closed when no history) — keep

Each tool: `DeskToolShell` + amber controls that already exist + `PrintStrip` for terminal stats.

- [ ] **Step 3: Wire `combopnl` | `optionpnl` | `straddle`**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(desk): migrate Combo/Option/Straddle PnL onto kit"
```

---

### Task 13: Hedge family (T4)

**Files:**
- Create: `src/components/desk/tools/HedgeTool.tsx`
- Create: `src/components/desk/tools/DFollowTool.tsx`
- Create: `src/components/desk/tools/BacktestTool.tsx`
- Modify: `src/components/views/DeskView.tsx`

- [ ] **Step 1: Migrate each with dual-Y grammar**

For Hedge / DFollow:
- Left Y: `PnL ($)` — `DESK_SERIES.median` or up/down area
- Right Y: `Net Δ` — `CHART_GREEK.delta`
- X: `Day`
- Both axis titles present
- PrintStrip: Terminal PnL, Trades, Max DD, Avg |Δ|

Backtest:
- Keep honest copy: local path sim, not Thalex parquet
- Bands like SimTool (`DESK_SERIES` bands + median)
- PrintStrip: E[PnL], Win, weeks, σ

- [ ] **Step 2: Wire `hedge` | `dfollow` | `backtest`**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(desk): migrate Hedge, Delta Follower, Backtest onto kit"
```

---

### Task 14: Basis + Roll (T5)

**Files:**
- Create: `src/components/desk/tools/BasisTool.tsx`
- Create: `src/components/desk/tools/RollTool.tsx`
- Modify: `src/components/views/DeskView.tsx`

- [ ] **Step 1: Basis**

- Chart: basis and/or ann. carry vs time
- X: `Time` / date ticks; Y: `Basis` and dual Y `Ann. carry %` if two series
- Spot/index ref if present in data
- `DESK_SERIES` / `CHART.series.rate` for carry

- [ ] **Step 2: Roll PnL heatmap**

- Keep heatmap matrix; improve:
  - Axis labels: funding/index buckets with units in header
  - Color scale via existing theme (up/down intensity) — no CSS rainbow
  - PrintStrip for selected cell / max roll if data allows

- [ ] **Step 3: Wire `basis` | `roll`**

- [ ] **Step 4: Confirm DeskView has no remaining local tool functions** except:
  - `ThalexLabEmbed`
  - `apiBadge`
  - router / listed-Σ strip
  - `useSpotPath` removed

Run:

```bash
rg -n '^function (Sim|Combo|Grid|BreakEven|Subjective|Hedge|DFollow|Basis|Roll|Backtest|OptionPnl|ComboPnl|Straddle)Tool' src/components/views/DeskView.tsx
```

Expected: no matches.

- [ ] **Step 5: Full desk test suite + tsc**

```bash
npm test -- --run src/components/desk src/lib/chartTheme.test.ts src/config/deskNav.test.ts src/config/functionRegistry.test.ts
npx tsc -b --pretty false
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(desk): migrate Basis and Roll PnL; finish Trade tool extract"
```

---

### Task 15: DeskView slim smoke + anti-slop checklist

**Files:**
- Modify: `src/components/views/DeskView.tsx` only if dead imports remain
- Optional: `src/components/desk/tools/index.ts` barrel exports

- [ ] **Step 1: Remove unused imports from DeskView** (Recharts, pathSim, etc. if fully extracted)

- [ ] **Step 2: Manual anti-slop pass** (each tool on Trade red bar)

For each tool, verify checklist from spec §7:
- Axis titles + units (or BBG table-primary for BE)
- Amber fields
- Print strip
- Black chart field
- Honest source badge on desk chrome (existing)

- [ ] **Step 3: Final commit if cleanup**

```bash
git commit -m "chore(desk): slim DeskView after tool extraction"
```

---

## Follow-up plans (do not expand this PR stream unless asked)

These implement **design §6 later waves** using the same kit. Write a dedicated plan file when starting each:

| ID | Plan file (to create later) | Scope |
|----|----------------------------|--------|
| W2 | `docs/superpowers/plans/2026-XX-XX-flow-visual-kit.md` | Positioning Book + Tools density/heatmaps |
| W3 | `2026-07-16-vol-secondary-charts.md` | Smile · Term · Fit axes/ATM/ordinal ✅ |
| W4 | `2026-07-16-rates-axes-compare.md` | YieldCurveCompare: axis clarity + 1M/3M/6M/1Y chips ✅ |
| W5 | `2026-07-16-home-chrome-density.md` | Launchpad / DES / strips ✅ |
| W6 | `2026-07-16-academy-polish.md` | Publication tokens only ✅ |

**W4 sketch (for when started):** extend `YieldCurveCompare` with `compareWindow: '1M'|'3M'|'6M'|'1Y'|'custom'` prop; parent loads FRED history window; X label `Maturity`, Y label `Yield (%)`; live white / compare blue already partially there.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| DESK series grammar | T1–T2, tools use DESK_SERIES |
| Amber editable fields | T4 DeskField |
| Print strip | T3 + tools |
| DeskChart black field + axis titles | T5 + tool migrations |
| DeskToolShell | T6 |
| Sim / Combo / Grid | T7–T9 |
| BE BBG-first | T10 |
| Subjective | T11 |
| PnL family | T12 |
| Hedge / DFollow / Backtest | T13 |
| Basis / Roll | T14 |
| Extract from DeskView | T7–T15 |
| Math unchanged | All tools call existing lib only |
| No Thalex iframe / Greeks / surface changes | Explicit non-touch |
| Later waves | Follow-up section only |

---

## Execution notes

- Prefer **one task per subagent** with commit at end.
- If Recharts `label` on Y axis clips, rely on `DeskChartFrame` `yTitle` caption (tests already cover captions).
- Path-cloud true density (canvas) is optional enhancement after Sim band chart looks good — YAGNI until T7 accepted.
- Do not rename `macrovol` package/paths in this plan.
