/**
 * MM Desk — full Thalex-inspired toolkit (12 tools):
 * Simulator · Combo PnL · Straddle · Combo Greeks · Greeks · Option PnL ·
 * Break-even · Roll PnL · Basis · Subjective · Δ Follower · Hedging · Grid
 *
 * Pricing: Black–Scholes–Merton (r, q). IV = Newton/bisection invert of BS.
 * Equity chain: yfinance (auto) / FMP. BTC/ETH options: Deribit public.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Area, Bar, CartesianGrid, ComposedChart, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { Explain } from '../common/Explain';
import { EmptyState } from '../common/EmptyState';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import { FreshnessFromDomain } from '../common/Freshness';
import { DeskChrome } from '../terminal/DeskChrome';
import { fmtPct, fmtPrice, fmtSigned } from '../../lib/format';
import { cn } from '../../lib/utils';
import { UI_COPY } from '../../config/uiCopy';
import { templateLegs } from '../../lib/options/portfolio';
import { simulatePaths } from '../../lib/options/pathSim';
import { defaultHedgeFromSnapshot, simulateDeltaHedge, type HedgeMode } from '../../lib/options/hedging';
import { buildBasisCurve, rollPnlHeatmap } from '../../lib/options/basis';
import { isCryptoSymbol } from '../../lib/options/basis';
import { inventoryByExpiry, portfolioGreeks } from '../../lib/options/analytics';
import { DeskLoading } from '../common/Skeleton';
import { consumeDeskJumpOnMount } from '../../lib/market/deskJump';
import { SimTool } from '../desk/tools/SimTool';
import { ComboGreeksTool } from '../desk/tools/ComboGreeksTool';
import { GridTool } from '../desk/tools/GridTool';
import { BreakEvenTool } from '../desk/tools/BreakEvenTool';
import { SubjectiveTool } from '../desk/tools/SubjectiveTool';
import { ComboPnlTool } from '../desk/tools/ComboPnlTool';
import { OptionPnlTool } from '../desk/tools/OptionPnlTool';
import { StraddleTool } from '../desk/tools/StraddleTool';

const GreeksView = lazy(() =>
  import('./GreeksView').then((m) => ({ default: m.GreeksView })),
);

type ToolId =
  | 'sim' | 'combopnl' | 'straddle' | 'combo' | 'analyze' | 'optionpnl'
  | 'breakeven' | 'roll' | 'basis' | 'subjective' | 'dfollow' | 'hedge' | 'grid'
  | 'backtest';

/** ToolId → Thalex deploy path (crypto chrome embeds real lab, not thin replicas). */
const TOOL_TO_THALEX_SLUG: Record<ToolId, string> = {
  sim: 'simulator',
  combopnl: 'combo-pnl',
  straddle: 'straddle',
  combo: 'combo-greeks',
  analyze: 'greeks',
  optionpnl: 'option-pnl',
  breakeven: 'break-even',
  roll: 'roll-pnl',
  basis: 'futures-basis',
  subjective: 'subjective',
  backtest: 'backtest',
  dfollow: 'dfollow',
  hedge: 'hedging',
  grid: 'grid',
};

function ThalexLabEmbed({ tool }: { tool: ToolId }) {
  const slug = TOOL_TO_THALEX_SLUG[tool];
  const url = `https://thalextech.github.io/${slug}/`;
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded border border-border bg-card px-2 py-1 font-mono text-type-2xs text-muted-foreground">
        <span className="font-bold uppercase tracking-wider text-foreground">Thalex lab</span>
        <span className="hidden sm:inline">· live app from thalextech.github.io (not a VOLATERM replica)</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-sky-400 hover:underline"
        >
          Open full screen ↗
        </a>
        <a
          href="https://github.com/thalextech/thalextech.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          source
        </a>
      </div>
      <iframe
        key={url}
        title={`Thalex ${slug}`}
        src={url}
        className="min-h-0 w-full flex-1 rounded border border-border bg-background"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

/** desk-ws-* section id → tool (red bar / function codes). */
const SECTION_TO_TOOL: Record<string, ToolId> = {
  'desk-ws-sim': 'sim',
  'desk-ws-combo': 'combo',
  'desk-ws-grid': 'grid',
  'desk-ws-combopnl': 'combopnl',
  'desk-ws-optionpnl': 'optionpnl',
  'desk-ws-straddle': 'straddle',
  'desk-ws-breakeven': 'breakeven',
  'desk-ws-subjective': 'subjective',
  'desk-ws-hedge': 'hedge',
  'desk-ws-dfollow': 'dfollow',
  'desk-ws-basis': 'basis',
  'desk-ws-roll': 'roll',
  'desk-ws-analyze': 'analyze',
  'desk-ws-backtest': 'backtest',
  // legacy greeks deep-links
  'greeks-desk': 'analyze',
  'greeks-sub-surface3d': 'analyze',
  'greeks-mesh': 'analyze',
};

const TOOL_TO_SECTION: Record<ToolId, string> = {
  sim: 'desk-ws-sim',
  combo: 'desk-ws-combo',
  grid: 'desk-ws-grid',
  combopnl: 'desk-ws-combopnl',
  optionpnl: 'desk-ws-optionpnl',
  straddle: 'desk-ws-straddle',
  breakeven: 'desk-ws-breakeven',
  subjective: 'desk-ws-subjective',
  hedge: 'desk-ws-hedge',
  dfollow: 'desk-ws-dfollow',
  basis: 'desk-ws-basis',
  roll: 'desk-ws-roll',
  analyze: 'desk-ws-analyze',
  backtest: 'desk-ws-backtest',
};

/** Quant workflow groups: structure → P&L → hedge → carry → analyze */
const TOOLS: { id: ToolId; label: string; blurb: string; group: string }[] = [
  { id: 'sim', label: 'Simulator', blurb: 'GBM path cloud + multi-leg PnL bands', group: 'structure' },
  { id: 'combo', label: 'Combo Greeks', blurb: 'Multi-leg greeks vs spot', group: 'structure' },
  { id: 'grid', label: 'Option Grid', blurb: 'Ω leverage · 1/N(d2)', group: 'structure' },
  { id: 'analyze', label: 'Greeks', blurb: 'Greeks surfaces · GEX · OI (Thalex-class)', group: 'analyze' },
  { id: 'combopnl', label: 'Combo PnL', blurb: 'Historical multi-leg PnL by greek', group: 'pnl' },
  { id: 'optionpnl', label: 'Option PnL', blurb: 'Single-option historical mark PnL', group: 'pnl' },
  { id: 'straddle', label: 'Straddle', blurb: 'Break-even + historical straddle PnL', group: 'pnl' },
  { id: 'breakeven', label: 'Break Even', blurb: 'BE prices + N(d2)', group: 'pnl' },
  { id: 'subjective', label: 'Subjective Valuation', blurb: 'Drift + VRP fair value (BS)', group: 'pnl' },
  { id: 'backtest', label: 'Backtest', blurb: 'Weekly short-straddle Δ-hedged path', group: 'pnl' },
  { id: 'hedge', label: 'Hedging', blurb: 'Threshold / tolerance / period Δ-hedge', group: 'hedge' },
  { id: 'dfollow', label: 'Delta Follower', blurb: 'Track option delta with hedge', group: 'hedge' },
  { id: 'basis', label: 'Basis', blurb: 'Forward basis + ann. carry', group: 'carry' },
  { id: 'roll', label: 'Roll PnL', blurb: 'Funding/basis carry heatmap', group: 'carry' },
];

function apiBadge(
  source: 'demo' | 'live',
  chainUsed: string,
  symbol: string,
): { label: string; detail: string } {
  if (source !== 'live') return { label: 'DEMO', detail: 'Synthetic SVI surface' };
  const crypto = isCryptoSymbol(symbol);
  if (chainUsed === 'deribit') {
    return { label: 'DERIBIT', detail: 'Live options + mark IV · BS greeks' };
  }
  if (chainUsed === 'yfinance') {
    return { label: 'YFINANCE', detail: 'Live chain · IV = BS invert of mid' };
  }
  if (chainUsed === 'fmp') {
    return { label: 'FMP', detail: 'Paid option chain · IV = BS invert' };
  }
  if (crypto) {
    return { label: 'SYNTH+SPOT', detail: 'Crypto smile @ live spot' };
  }
  return { label: 'SYNTH', detail: 'Synthetic surface fallback' };
}

function Stat({ label, value, color, term }: { label: string; value: string; color?: string; term?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-type-xs text-muted-foreground font-mono">
        {term ? <Explain term={term}>{label}</Explain> : label}
      </span>
      <span className="text-xs font-semibold font-mono tabular-nums" style={{ color: color ?? 'var(--foreground)' }}>{value}</span>
    </div>
  );
}

function ToolChrome({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col h-full min-h-0 gap-1">{children}</div>;
}

export function DeskView({
  chrome = 'trade',
}: {
  /** trade = equity blotter chrome; thalex = crypto lab (Thalex-class) chrome */
  chrome?: 'trade' | 'thalex';
}) {
  const snapshot = useTerminalStore(s => s.snapshot);
  const source = useTerminalStore(s => s.source);
  const chainUsed = useTerminalStore(s => s.chainUsed);
  const chainAvailable = useTerminalStore(s => s.chainAvailable);
  const lastChainUpdate = useTerminalStore(s => s.lastChainUpdate);
  const provenance = useTerminalStore(s => s.provenance);
  const symbol = useTerminalStore(s => s.symbol);
  const deskSectionId = useTerminalStore(s => s.deskSectionId);
  const setDeskContext = useTerminalStore(s => s.setDeskContext);
  // Lab-first default (Thalex surface); red bar / codes override via deskSectionId
  const [tool, setTool] = useState<ToolId>(chrome === 'thalex' ? 'sim' : 'sim');

  useEffect(() => consumeDeskJumpOnMount(), []);

  // Red bar / function codes → tool workspace
  useEffect(() => {
    if (!deskSectionId) return;
    const mapped = SECTION_TO_TOOL[deskSectionId];
    if (!mapped) return;
    setTool(mapped);
    const meta = TOOLS.find((t) => t.id === mapped);
    setDeskContext({
      id: TOOL_TO_SECTION[mapped],
      label: meta?.label ?? mapped,
      apis:
        mapped === 'analyze'
          ? chrome === 'thalex' ? ['Deribit', 'MacroVol'] : ['MacroVol', 'yfinance']
          : chrome === 'thalex' ? ['Deribit'] : ['yfinance', 'FMP', 'Deribit'],
    });
  }, [deskSectionId, setDeskContext, chrome]);

  // Fail-closed: domain classification — never optimistic live without asOf age; re-ticks every 5s
  const chainMissing = !chainAvailable || chainUsed === 'none';
  const chainAsOfMs = provenance.chain?.asOfMs ?? (lastChainUpdate > 0 ? lastChainUpdate : null);

  const inv = useMemo(() => (snapshot ? inventoryByExpiry(snapshot) : []), [snapshot]);
  const port = useMemo(
    () => (snapshot ? portfolioGreeks(snapshot) : { delta: 0, gamma: 0, theta: 0, vega: 0 }),
    [snapshot],
  );
  const topBuckets = inv.slice(0, 5);

  const badge = snapshot ? apiBadge(source, chainUsed, symbol) : null;
  const deskLabel = chrome === 'thalex' ? 'THALEX LAB' : 'TRADE';
  const deskApis = chrome === 'thalex' ? ['Thalex'] : ['yfinance', 'FMP', 'Deribit'];

  // Crypto chrome: embed the real Thalex second-screen apps (full depth).
  // Trade chrome: VOLATERM-native BS tools on our surface/snapshot.
  if (chrome === 'thalex') {
    return (
      <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
        <SectionErrorBoundary key={tool} name={`${deskLabel} ${tool}`}>
          <ThalexLabEmbed tool={tool} />
        </SectionErrorBoundary>
      </div>
    );
  }

  if (!snapshot && tool !== 'analyze') {
    return (
      <Panel title={deskLabel} apis={deskApis} className="h-full">
        <EmptyState
          kind="no-data"
          title="No surface data"
          body={`${UI_COPY.empty.chain} Inventory blotter needs a snapshot. Open Greeks for MacroVol without a full chain.`}
        />
      </Panel>
    );
  }

  return (
    <div className="h-full flex flex-col gap-1 overflow-hidden">
      <div className="flex flex-col gap-1 rounded border border-border bg-card px-2 py-1">
        <DeskChrome
          label={deskLabel}
          labelClassName="mr-0 px-1"
          sticky={false}
          className="border-0 bg-transparent p-0"
          trailing={
            <FreshnessFromDomain
              asOfMs={chainAsOfMs}
              domain="chain"
              down={chainMissing}
              previousKind={provenance.chain?.kind}
            />
          }
        >
          {snapshot && (
            <span className="font-mono text-type-xs text-muted-foreground">
              {snapshot.symbol} @ {fmtPrice(snapshot.spot, snapshot.spot > 1000 ? 1 : 2)}
            </span>
          )}
          {badge && (
            <span
              className="rounded border border-border px-1.5 py-0.5 font-mono text-type-2xs text-muted-foreground"
              title={badge.detail}
            >
              {badge.label}
            </span>
          )}
          <span className="font-mono text-type-2xs text-foreground">
            {TOOLS.find((t) => t.id === tool)?.label ?? tool}
          </span>
          <span className="hidden font-mono text-type-2xs text-muted-foreground md:inline">
            {`Blotter · BS-Merton${chainUsed === 'deribit' ? ' · Deribit mark IV' : ''}`}
          </span>
        </DeskChrome>
        {snapshot && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded border border-border bg-muted/40 px-2 py-1 font-mono text-type-xs">
            <span className="font-bold uppercase tracking-wider text-foreground">Blotter Σ</span>
            <span>
              <span className="text-muted-foreground">Δ </span>
              <span className={cn('font-bold tabular-nums', port.delta >= 0 ? 'text-up' : 'text-down')}>{port.delta.toFixed(1)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Γ </span>
              <span className="font-bold tabular-nums text-foreground">{port.gamma.toFixed(3)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">ν </span>
              <span className="font-bold tabular-nums text-foreground">{port.vega.toFixed(1)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Θ </span>
              <span className={cn('font-bold tabular-nums', port.theta >= 0 ? 'text-up' : 'text-down')}>{port.theta.toFixed(1)}</span>
            </span>
            <span className="text-muted-foreground">|</span>
            {topBuckets.map((b) => (
              <span key={b.expiry} className="text-muted-foreground">
                {b.dte}d Δ<span className="text-foreground">{b.delta.toFixed(0)}</span>
                {' '}ν<span className="text-foreground">{b.vega.toFixed(0)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <SectionErrorBoundary key={tool} name={`${deskLabel} ${tool}`}>
          {tool === 'analyze' && (
            <Suspense fallback={<DeskLoading message={UI_COPY.load.greeks} />}>
              <GreeksView />
            </Suspense>
          )}
          {tool === 'sim' && snapshot && <SimTool />}
          {tool === 'combopnl' && snapshot && <ComboPnlTool />}
          {tool === 'straddle' && snapshot && <StraddleTool />}
          {tool === 'combo' && snapshot && <ComboGreeksTool />}
          {tool === 'optionpnl' && snapshot && <OptionPnlTool />}
          {tool === 'breakeven' && snapshot && <BreakEvenTool />}
          {tool === 'roll' && snapshot && <RollTool />}
          {tool === 'basis' && snapshot && <BasisTool />}
          {tool === 'subjective' && snapshot && <SubjectiveTool />}
          {tool === 'dfollow' && snapshot && <DFollowTool />}
          {tool === 'hedge' && snapshot && <HedgeTool />}
          {tool === 'grid' && snapshot && <GridTool />}
          {tool === 'backtest' && snapshot && <BacktestTool />}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}

/* ─── Hedging ───────────────────────────────────────────────── */

function HedgeTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const defaults = useMemo(() => defaultHedgeFromSnapshot(snapshot), [snapshot]);
  const [mode, setMode] = useState<HedgeMode>('threshold');
  const [threshold, setThreshold] = useState(0.1);
  const [tolerance, setTolerance] = useState(0.05);
  const [period, setPeriod] = useState(5);
  const [rv, setRv] = useState(defaults.realizedVol ?? 0.25);
  const [qty, setQty] = useState(-1);

  const result = useMemo(() => {
    if (!defaults.strike || !defaults.T || !defaults.vol) return null;
    return simulateDeltaHedge({
      mode,
      threshold,
      tolerance,
      periodSteps: period,
      type: defaults.type ?? 'call',
      strike: defaults.strike,
      T: defaults.T,
      vol: defaults.vol,
      realizedVol: rv,
      drift: 0,
      days: defaults.days ?? 21,
      steps: defaults.steps ?? 60,
      optionQty: qty,
      hedgeInstrument: 'spot',
      r: snapshot.riskFreeRate,
      q: snapshot.dividendYield,
      seed: 19,
    }, snapshot.spot);
  }, [snapshot, defaults, mode, threshold, tolerance, period, rv, qty]);

  const chart = result?.steps.map(s => ({
    t: s.tDay.toFixed(1),
    pnl: s.totalPnl,
    netDelta: s.netDelta,
    spot: s.spot,
  })) ?? [];

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Mode
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={mode} onChange={e => setMode(e.target.value as HedgeMode)}>
            <option value="threshold">Threshold</option>
            <option value="tolerance">Tolerance band</option>
            <option value="period">Period</option>
          </select>
        </label>
        {mode === 'threshold' && (
          <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
            |Δ| trigger
            <input type="number" step={0.01} value={threshold} onChange={e => setThreshold(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
          </label>
        )}
        {mode === 'tolerance' && (
          <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
            Band
            <input type="number" step={0.01} value={tolerance} onChange={e => setTolerance(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
          </label>
        )}
        {mode === 'period' && (
          <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
            Every N steps
            <input type="number" step={1} value={period} onChange={e => setPeriod(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
          </label>
        )}
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Realized vol
          <input type="number" step={0.01} value={rv} onChange={e => setRv(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Opt qty (− short)
          <input type="number" step={1} value={qty} onChange={e => setQty(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
        </label>
        {result && (
          <>
            <Stat label="Terminal PnL" term="hedgePnl" value={fmtSigned(result.terminalPnl)} color={result.terminalPnl >= 0 ? 'var(--up)' : 'var(--down)'} />
            <Stat label="Trades" value={String(result.tradeCount)} />
            <Stat label="Max DD" value={fmtSigned(result.maxDrawdown)} color="var(--down)" />
            <Stat label="Avg |Δ|" value={result.avgAbsNetDelta.toFixed(3)} />
            <Stat label="Strike" value={fmtPrice(defaults.strike)} />
          </>
        )}
      </div>
      <Panel title="Hedged PnL path" subtitle="Option + Δ-hedge mark-to-market" className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} />
            <YAxis yAxisId="pnl" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={48} />
            <YAxis yAxisId="d" orientation="right" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={36} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <ReferenceLine yAxisId="pnl" y={0} stroke="var(--muted-foreground)" />
            <Area yAxisId="pnl" type="monotone" dataKey="pnl" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
            <Line yAxisId="d" type="monotone" dataKey="netDelta" stroke="var(--cyan)" strokeWidth={1} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>
    </ToolChrome>
  );
}

/* ─── Backtest (Thalex: weekly short straddle Δ-hedged) ─────── */

function BacktestTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const [weeks, setWeeks] = useState(8);
  const [rv, setRv] = useState(snapshot.expiries[0]?.atmIV ?? 0.35);
  const legs = useMemo(() => templateLegs('short_straddle', snapshot, 0), [snapshot]);
  const days = Math.max(5, weeks * 7);

  const pathSim = useMemo(
    () => simulatePaths(legs, snapshot, {
      drift: 0,
      vol: rv,
      days,
      steps: Math.min(80, days),
      paths: 120,
      seed: 42,
    }),
    [legs, snapshot, rv, days],
  );

  const hedge = useMemo(() => {
    const d = defaultHedgeFromSnapshot(snapshot);
    if (!d.strike || !d.T || !d.vol) return null;
    return simulateDeltaHedge({
      mode: 'period',
      threshold: 0.1,
      tolerance: 0.05,
      periodSteps: 5,
      type: d.type ?? 'call',
      strike: d.strike,
      T: d.T,
      vol: d.vol,
      realizedVol: rv,
      drift: 0,
      days,
      steps: Math.min(60, days),
      optionQty: -1,
      hedgeInstrument: 'spot',
      r: snapshot.riskFreeRate,
      q: snapshot.dividendYield,
      seed: 7,
    }, snapshot.spot);
  }, [snapshot, rv, days]);

  const chart = pathSim.t.map((t, i) => ({
    t: t.toFixed(1),
    p50: pathSim.pnlBands.p50[i],
    p5: pathSim.pnlBands.p5[i],
    p95: pathSim.pnlBands.p95[i],
  }));

  return (
    <ToolChrome>
      <div className="flex flex-wrap items-end gap-3 rounded border border-border bg-card/50 px-2 py-1">
        <span className="font-mono text-type-xs text-muted-foreground">
          Thalex-style weekly BTC short straddle · Δ-hedged (local path — not Thalex parquet)
        </span>
        <label className="flex flex-col gap-0.5 font-mono text-type-xs text-muted-foreground">
          Weeks
          <input
            type="number"
            min={1}
            max={26}
            value={weeks}
            onChange={(e) => setWeeks(+e.target.value)}
            className="w-14 rounded border border-border bg-background px-1 py-0.5 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5 font-mono text-type-xs text-muted-foreground">
          Realized σ
          <input
            type="number"
            step={0.01}
            value={rv}
            onChange={(e) => setRv(+e.target.value)}
            className="w-16 rounded border border-border bg-background px-1 py-0.5 font-mono text-xs"
          />
        </label>
        <Stat label="E[PnL]" value={fmtSigned(pathSim.meanTerminalPnl)} color={pathSim.meanTerminalPnl >= 0 ? 'var(--up)' : 'var(--down)'} />
        <Stat label="Win" value={fmtPct(pathSim.winRate)} />
        {hedge && (
          <Stat
            label="Hedge PnL"
            value={fmtSigned(hedge.terminalPnl)}
            color={hedge.terminalPnl >= 0 ? 'var(--up)' : 'var(--down)'}
          />
        )}
      </div>
      <Panel title="Short-straddle path bands" subtitle={`${weeks}w · ${pathSim.t.length} steps · 120 paths`} className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={48} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.4} />
            <Area type="monotone" dataKey="p95" stroke="none" fill="var(--up)" fillOpacity={0.08} />
            <Area type="monotone" dataKey="p5" stroke="none" fill="var(--down)" fillOpacity={0.08} />
            <Line type="monotone" dataKey="p50" stroke="var(--cyan)" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>
    </ToolChrome>
  );
}

/* ─── Delta follower ────────────────────────────────────────── */

function DFollowTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const defaults = useMemo(() => defaultHedgeFromSnapshot(snapshot), [snapshot]);
  const [band, setBand] = useState(0.05);
  const [qty, setQty] = useState(1);
  const [rv, setRv] = useState(defaults.realizedVol ?? 0.25);

  const result = useMemo(() => {
    if (!defaults.strike || !defaults.T || !defaults.vol) return null;
    return simulateDeltaHedge({
      mode: 'tolerance',
      threshold: band,
      tolerance: band,
      periodSteps: 1,
      type: 'call',
      strike: defaults.strike,
      T: defaults.T,
      vol: defaults.vol,
      realizedVol: rv,
      drift: 0,
      days: defaults.days ?? 21,
      steps: 80,
      optionQty: qty,
      hedgeInstrument: 'future',
      r: snapshot.riskFreeRate,
      q: snapshot.dividendYield,
      seed: 33,
    }, snapshot.spot);
  }, [snapshot, defaults, band, qty, rv]);

  const chart = result?.steps.map(s => ({
    t: s.tDay.toFixed(1),
    target: -s.optionDelta * qty,
    hedge: s.hedgeQty,
    pnl: s.totalPnl,
  })) ?? [];

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Band
          <input type="number" step={0.01} value={band} onChange={e => setBand(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Option qty
          <input type="number" step={1} value={qty} onChange={e => setQty(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Realized σ
          <input type="number" step={0.01} value={rv} onChange={e => setRv(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
        </label>
        {result && (
          <>
            <Stat label="Terminal PnL" value={fmtSigned(result.terminalPnl)} color={result.terminalPnl >= 0 ? 'var(--up)' : 'var(--down)'} />
            <Stat label="Rebalances" value={String(result.tradeCount)} />
            <Stat label="Avg |Δ err|" value={result.avgAbsNetDelta.toFixed(3)} />
          </>
        )}
      </div>
      <Panel title="Delta follower" subtitle="Hedge tracks −qty·Δ_option within band" className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={44} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <Line type="monotone" dataKey="target" stroke="var(--amber)" strokeWidth={1.5} dot={false} name="Target hedge" />
            <Line type="monotone" dataKey="hedge" stroke="var(--cyan)" strokeWidth={1.5} dot={false} name="Actual hedge" />
            <Line type="monotone" dataKey="pnl" stroke="var(--primary)" strokeWidth={1} strokeDasharray="3 2" dot={false} name="PnL" />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
    </ToolChrome>
  );
}

/* ─── Basis ──────────────────────────────────────────────────── */

function BasisTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const fundingAnn = useTerminalStore(s => s.fundingAnn);
  const liveFunding = fundingAnn ?? snapshot.fundingAnn ?? null;
  const curve = useMemo(
    () => buildBasisCurve(snapshot, { fundingAnn: liveFunding }),
    [snapshot, liveFunding],
  );
  const chart = curve.points.map(p => ({
    dte: p.dte,
    basisPct: (p.basis / curve.spot) * 100,
    carry: p.annCarry * 100,
    forward: p.forward,
    source: p.source,
  }));
  const mktN = curve.points.filter(p => p.source === 'market').length;

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <Stat label="Spot" value={fmtPrice(snapshot.spot, snapshot.spot > 1000 ? 1 : 2)} />
        <Stat label="r" value={fmtPct(curve.r)} />
        <Stat label="q_eff" value={fmtPct(curve.q)} />
        {liveFunding != null && <Stat label="Funding ann" term="rollPnl" value={fmtPct(liveFunding)} color={liveFunding >= 0 ? 'var(--up)' : 'var(--down)'} />}
        {curve.perp && (
          <Stat
            label="Perp mark"
            value={`${fmtPrice(curve.perp.mark, curve.perp.mark > 1000 ? 0 : 2)} (${fmtSigned(curve.perp.basis)})`}
          />
        )}
        <Stat label="Front basis" value={chart[0] ? `${chart[0].basisPct.toFixed(3)}%` : '—'} />
        <Stat label="Marks" value={curve.hasMarketMarks ? `mkt ${mktN}` : 'theo'} />
        <span className="text-type-2xs font-mono text-muted-foreground self-center">
          {curve.hasMarketMarks
            ? 'Live futures marks when matched · else F=S·e⁽ʳ⁻ᵠ⁾ᵀ'
            : <>F = S·e<sup>(r−q)T</sup>{isCryptoSymbol(snapshot.symbol) ? ' · crypto q≈−funding' : ''}</>}
        </span>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-1 min-h-0">
        <Panel title="Basis % vs DTE" subtitle={curve.hasMarketMarks ? 'Market F − S (Deribit)' : '(F−S)/S theo'} className="min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="dte" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={40} unit="%" />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <Bar dataKey="basisPct" fill="var(--cyan)" opacity={0.8} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Ann. carry" subtitle="(F/S−1)/T" className="min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="dte" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={40} unit="%" />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <Line type="monotone" dataKey="carry" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </ToolChrome>
  );
}

/* ─── Roll PnL heatmap ───────────────────────────────────────── */

function RollTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const fundingAnn = useTerminalStore(s => s.fundingAnn);
  const liveFunding = fundingAnn ?? snapshot.fundingAnn ?? null;
  const roll = useMemo(
    () => rollPnlHeatmap(snapshot, {
      fundingAnn: liveFunding ?? (snapshot.riskFreeRate - snapshot.dividendYield),
    }),
    [snapshot, liveFunding],
  );

  const flat = roll.shocks.flatMap((sh, si) =>
    roll.horizons.map((h, hi) => ({
      shock: `${(sh * 100).toFixed(0)}%`,
      days: h,
      pnl: roll.pnl[si]![hi]!,
    })),
  );

  // Matrix for simple table heatmap
  const maxAbs = Math.max(...flat.map(c => Math.abs(c.pnl)), 1e-9);

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <Stat
          label="Carry ann"
          term="rollPnl"
          value={fmtPct(liveFunding ?? (snapshot.riskFreeRate - snapshot.dividendYield))}
        />
        <Stat label="Notional" value={fmtPrice(snapshot.spot, snapshot.spot > 1000 ? 0 : 2)} />
        <span className="text-type-2xs font-mono text-muted-foreground self-center">
          PnL ≈ S·(1+shock) · carry · days/365
          {liveFunding != null ? ' · Deribit funding' : ' · r−q equity carry'}
        </span>
      </div>
      <Panel title="Roll / funding PnL heatmap" subtitle="Spot shock × hold horizon" className="flex-1 min-h-0 overflow-auto">
        <table className="text-type-xs font-mono border-collapse w-full">
          <thead className="sticky top-0 bg-card">
            <tr>
              <th className="px-2 py-1 text-left text-muted-foreground">Shock \ Days</th>
              {roll.horizons.map(h => (
                <th key={h} className="px-2 py-1 text-muted-foreground font-normal">{h}d</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roll.shocks.map((sh, si) => (
              <tr key={sh}>
                <td className="px-2 py-0.5 text-muted-foreground">{(sh * 100).toFixed(0)}%</td>
                {roll.horizons.map((h, hi) => {
                  const v = roll.pnl[si]![hi]!;
                  const intensity = Math.min(1, Math.abs(v) / maxAbs);
                  const bg = v >= 0
                    ? `color-mix(in oklch, var(--up) ${Math.round(intensity * 50)}%, transparent)`
                    : `color-mix(in oklch, var(--down) ${Math.round(intensity * 50)}%, transparent)`;
                  return (
                    <td key={h} className="px-2 py-0.5 text-right tabular-nums" style={{ background: bg }}>
                      {fmtSigned(v, v > 100 ? 0 : 2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </ToolChrome>
  );
}
