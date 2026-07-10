/**
 * MM Desk — full Thalex-inspired toolkit (12 tools):
 * Simulator · Combo PnL · Straddle · Combo Greeks · Greeks · Option PnL ·
 * Break-even · Roll PnL · Basis · Subjective · Δ Follower · Hedging · Grid
 *
 * Pricing: Black–Scholes–Merton (r, q). IV = Newton/bisection invert of BS.
 * Equity chain: yfinance (auto) / FMP. BTC/ETH options: Deribit public.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { Explain } from '../common/Explain';
import { EmptyState } from '../common/EmptyState';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import { FreshnessFromDomain } from '../common/Freshness';
import { DeskChrome, DeskChromeLabel } from '../terminal/DeskChrome';
import { fmtPct, fmtPrice, fmtSigned, fmtCompact } from '../../lib/format';
import { cn } from '../../lib/utils';
import { UI_COPY } from '../../config/uiCopy';
import {
  analyzeComboBreakEven,
  breakEvenTable,
} from '../../lib/options/breakEven';
import {
  comboGreeksProfile,
  evaluateCombo,
  spotGrid,
  templateLegs,
  type PortfolioLeg,
} from '../../lib/options/portfolio';
import { simulatePaths } from '../../lib/options/pathSim';
import { defaultHedgeFromSnapshot, simulateDeltaHedge, type HedgeMode } from '../../lib/options/hedging';
import { evaluateSubjective, subjectiveSummary } from '../../lib/options/subjective';
import { buildOptionGrid } from '../../lib/options/optionGrid';
import {
  comboGreeksPnl,
  historyToSpotBars,
  optionGreeksPnl,
  straddleBreakEvens,
} from '../../lib/options/greeksPnl';
import { buildBasisCurve, rollPnlHeatmap } from '../../lib/options/basis';
import { isCryptoSymbol } from '../../lib/options/basis';
import { inventoryByExpiry, portfolioGreeks } from '../../lib/options/analytics';

type ToolId =
  | 'sim' | 'combopnl' | 'straddle' | 'combo' | 'greeks' | 'optionpnl'
  | 'breakeven' | 'roll' | 'basis' | 'subjective' | 'dfollow' | 'hedge' | 'grid';

/** Quant workflow groups: structure → P&L → hedge → carry */
const TOOLS: { id: ToolId; label: string; blurb: string; group: string }[] = [
  { id: 'sim', label: 'Simulator', blurb: 'GBM path cloud + multi-leg PnL bands', group: 'structure' },
  { id: 'combo', label: 'Combo Greeks', blurb: 'Multi-leg greeks vs spot', group: 'structure' },
  { id: 'grid', label: 'Option Grid', blurb: 'Ω leverage · 1/N(d2)', group: 'structure' },
  { id: 'greeks', label: 'Greeks tab', blurb: 'Full greeks desk (Greeks 1.0)', group: 'structure' },
  { id: 'combopnl', label: 'Combo PnL', blurb: 'Historical multi-leg PnL by greek', group: 'pnl' },
  { id: 'optionpnl', label: 'Option PnL', blurb: 'Single-option historical mark PnL', group: 'pnl' },
  { id: 'straddle', label: 'Straddle', blurb: 'Break-even + historical straddle PnL', group: 'pnl' },
  { id: 'breakeven', label: 'Break-even', blurb: 'BE prices + N(d2)', group: 'pnl' },
  { id: 'subjective', label: 'Subjective', blurb: 'Drift + VRP fair value (BS)', group: 'pnl' },
  { id: 'hedge', label: 'Hedging', blurb: 'Threshold / tolerance / period Δ-hedge', group: 'hedge' },
  { id: 'dfollow', label: 'Δ Follower', blurb: 'Track option delta with hedge', group: 'hedge' },
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

export function DeskView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const source = useTerminalStore(s => s.source);
  const chainUsed = useTerminalStore(s => s.chainUsed);
  const chainAvailable = useTerminalStore(s => s.chainAvailable);
  const lastChainUpdate = useTerminalStore(s => s.lastChainUpdate);
  const provenance = useTerminalStore(s => s.provenance);
  const symbol = useTerminalStore(s => s.symbol);
  const setActiveTab = useTerminalStore(s => s.setActiveTab);
  // Blotter-first default: Combo PnL (mark risk) over abstract simulator
  const [tool, setTool] = useState<ToolId>('combopnl');

  // Fail-closed: domain classification — never optimistic live without asOf age; re-ticks every 5s
  const chainMissing = !chainAvailable || chainUsed === 'none';
  const chainAsOfMs = provenance.chain?.asOfMs ?? (lastChainUpdate > 0 ? lastChainUpdate : null);

  const inv = useMemo(() => (snapshot ? inventoryByExpiry(snapshot) : []), [snapshot]);
  const port = useMemo(
    () => (snapshot ? portfolioGreeks(snapshot) : { delta: 0, gamma: 0, theta: 0, vega: 0 }),
    [snapshot],
  );
  const topBuckets = inv.slice(0, 5);

  if (!snapshot) {
    return (
      <Panel title="MM Desk" apis={['yfinance', 'FMP', 'Deribit']} className="h-full">
        <EmptyState
          kind="no-data"
          title="No surface data"
          body={`${UI_COPY.empty.chain} Inventory blotter needs a snapshot.`}
        />
      </Panel>
    );
  }

  const badge = apiBadge(source, chainUsed, symbol);

  return (
    <div className="h-full flex flex-col gap-1 overflow-hidden">
      {/* Blotter-first strip (Phase F) — light DeskChrome for label + freshness only */}
      <div className="flex flex-col gap-1 rounded border border-border bg-card px-2 py-1.5">
        <DeskChrome
          sticky={false}
          className="border-0 bg-transparent p-0 backdrop-blur-none"
          trailing={
            <FreshnessFromDomain
              asOfMs={chainAsOfMs}
              domain="chain"
              down={chainMissing}
              previousKind={provenance.chain?.kind}
            />
          }
        >
          <DeskChromeLabel className="mr-0 px-1 text-xs">MM DESK</DeskChromeLabel>
          <span className="font-mono text-type-xs text-muted-foreground">
            {snapshot.symbol} @ {fmtPrice(snapshot.spot, snapshot.spot > 1000 ? 1 : 2)}
          </span>
          <span
            className="rounded border border-border px-1.5 py-0.5 font-mono text-type-2xs text-amber"
            title={badge.detail}
          >
            {badge.label}
          </span>
          <span className="hidden font-mono text-type-2xs text-muted-foreground md:inline">
            Blotter first · tools secondary · BS-Merton
            {chainUsed === 'deribit' ? ' · Deribit mark IV' : ''}
          </span>
        </DeskChrome>
        {/* Inventory blotter — primary risk tape */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded border border-primary/20 bg-primary/5 px-2 py-1 font-mono text-type-xs">
          <span className="font-bold uppercase tracking-wider text-primary">Blotter Σ</span>
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
            <span className="font-bold tabular-nums text-amber">{port.vega.toFixed(1)}</span>
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
          <span className="ml-auto hidden text-type-2xs text-muted-foreground sm:inline">
            listed OI scan — not your fills · Combo for real book
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {(['structure', 'pnl', 'hedge', 'carry'] as const).map((group) => (
            <div key={group} className="flex flex-wrap items-center gap-0.5">
              <span className="mr-0.5 font-mono text-type-2xs uppercase tracking-wider text-muted-foreground/70">
                {group}
              </span>
              {TOOLS.filter((t) => t.group === group).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.blurb}
                  onClick={() => {
                    if (t.id === 'greeks') {
                      setActiveTab('greeks');
                      return;
                    }
                    setTool(t.id);
                  }}
                  className={cn(
                    'px-1.5 py-0.5 text-type-xs font-mono rounded border transition-colors',
                    tool === t.id
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <SectionErrorBoundary key={tool} name={`MM ${tool}`}>
          {tool === 'sim' && <SimTool />}
          {tool === 'combopnl' && <ComboPnlTool />}
          {tool === 'straddle' && <StraddleTool />}
          {tool === 'combo' && <ComboTool />}
          {tool === 'optionpnl' && <OptionPnlTool />}
          {tool === 'breakeven' && <BreakEvenTool />}
          {tool === 'roll' && <RollTool />}
          {tool === 'basis' && <BasisTool />}
          {tool === 'subjective' && <SubjectiveTool />}
          {tool === 'dfollow' && <DFollowTool />}
          {tool === 'hedge' && <HedgeTool />}
          {tool === 'grid' && <GridTool />}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}

/**
 * Spot path for desk tools: real FMP/yfinance history only.
 * No synthetic path under LIVE — tools show empty until history is available.
 */
function useSpotPath(days = 40) {
  const fmpHistory = useTerminalStore(s => s.fmpHistory);
  const historySource = useTerminalStore(s => s.historySource);
  return useMemo(() => {
    const fromHist = historyToSpotBars(fmpHistory, days);
    if (fromHist.length >= 5 && historySource !== 'none') {
      return { path: fromHist, source: historySource };
    }
    return { path: [] as ReturnType<typeof historyToSpotBars>, source: 'none' as const };
  }, [fmpHistory, historySource, days]);
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

/* ─── Combo ─────────────────────────────────────────────────── */

function ComboTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const [template, setTemplate] = useState<'long_straddle' | 'short_straddle' | 'risk_reversal' | 'call_spread' | 'long_call'>('short_straddle');
  const [expiryIdx, setExpiryIdx] = useState(0);

  const legs: PortfolioLeg[] = useMemo(
    () => templateLegs(template, snapshot, expiryIdx),
    [template, snapshot, expiryIdx],
  );
  const mark = useMemo(() => evaluateCombo(legs, snapshot), [legs, snapshot]);
  const profile = useMemo(() => {
    const spots = spotGrid(snapshot.spot, 0.15, 61);
    return comboGreeksProfile(legs, snapshot, spots);
  }, [legs, snapshot]);
  const be = useMemo(() => analyzeComboBreakEven(legs, snapshot.spot), [legs, snapshot]);

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Template
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={template} onChange={e => setTemplate(e.target.value as typeof template)}>
            <option value="short_straddle">Short straddle (MM)</option>
            <option value="long_straddle">Long straddle</option>
            <option value="risk_reversal">Risk reversal</option>
            <option value="call_spread">Call spread</option>
            <option value="long_call">Long call</option>
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Expiry
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={expiryIdx} onChange={e => setExpiryIdx(+e.target.value)}>
            {snapshot.expiries.map((e, i) => (
              <option key={e.expiry} value={i}>{e.expiry} ({e.dte}d)</option>
            ))}
          </select>
        </label>
        <Stat label="Mark" value={fmtSigned(mark.mark)} />
        <Stat label="PnL" value={fmtSigned(mark.pnl)} color={mark.pnl >= 0 ? 'var(--up)' : 'var(--down)'} />
        <Stat label="Δ" term="delta" value={fmtSigned(mark.greeks.delta, 3)} />
        <Stat label="Γ" term="gamma" value={fmtCompact(mark.greeks.gamma)} />
        <Stat label="ν" term="vega" value={fmtSigned(mark.greeks.vega, 2)} />
        <Stat label="Θ" term="theta" value={fmtSigned(mark.greeks.theta, 2)} />
        <Stat label="BEs" value={be.breakEvens.map(x => fmtPrice(x, 0)).join(' · ') || '—'} />
      </div>
      <div className="flex-1 grid grid-cols-2 gap-1 min-h-0">
        <Panel title="Combo PnL vs Spot" subtitle="Mark-to-model" className="min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={profile} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="spot" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} tickFormatter={(v: number) => fmtPrice(v, 0)} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={44} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <ReferenceLine x={snapshot.spot} stroke="var(--amber)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="pnl" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Combo Δ / Γ / ν" subtitle="Greeks vs spot" className="min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profile} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="spot" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} tickFormatter={(v: number) => fmtPrice(v, 0)} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={44} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <ReferenceLine x={snapshot.spot} stroke="var(--amber)" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="delta" stroke="var(--cyan)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="vega" stroke="var(--primary)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="gamma" stroke="var(--up)" strokeWidth={1} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </ToolChrome>
  );
}

/* ─── Simulator ─────────────────────────────────────────────── */

function SimTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const [drift, setDrift] = useState(0);
  const [vol, setVol] = useState(snapshot.expiries[0]?.atmIV ?? 0.25);
  const [days, setDays] = useState(21);
  const [template, setTemplate] = useState<'short_straddle' | 'long_straddle' | 'long_call'>('short_straddle');

  const legs = useMemo(() => templateLegs(template, snapshot, 0), [template, snapshot]);
  const sim = useMemo(() => simulatePaths(legs, snapshot, {
    drift, vol, days, steps: 40, paths: 200, seed: 99,
  }), [legs, snapshot, drift, vol, days]);

  const chart = sim.t.map((t, i) => ({
    t: t.toFixed(1),
    p5: sim.pnlBands.p5[i],
    p25: sim.pnlBands.p25[i],
    p50: sim.pnlBands.p50[i],
    p75: sim.pnlBands.p75[i],
    p95: sim.pnlBands.p95[i],
  }));

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Structure
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={template} onChange={e => setTemplate(e.target.value as typeof template)}>
            <option value="short_straddle">Short straddle</option>
            <option value="long_straddle">Long straddle</option>
            <option value="long_call">Long call</option>
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Drift μ
          <input type="number" step={0.01} value={drift} onChange={e => setDrift(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Realized σ
          <input type="number" step={0.01} value={vol} onChange={e => setVol(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Horizon d
          <input type="number" step={1} value={days} onChange={e => setDays(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
        </label>
        <Stat label="E[PnL]" value={fmtSigned(sim.meanTerminalPnl)} color={sim.meanTerminalPnl >= 0 ? 'var(--up)' : 'var(--down)'} />
        <Stat label="Win rate" value={fmtPct(sim.winRate)} />
        <Stat label="p5 term" value={fmtSigned(sim.pnlBands.p5[sim.pnlBands.p5.length - 1])} color="var(--down)" />
        <Stat label="p95 term" value={fmtSigned(sim.pnlBands.p95[sim.pnlBands.p95.length - 1])} color="var(--up)" />
      </div>
      <Panel title="PnL distribution cloud" subtitle="Monte Carlo bands (200 paths)" className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={48} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
            <Area type="monotone" dataKey="p95" stroke="none" fill="var(--cyan)" fillOpacity={0.08} />
            <Area type="monotone" dataKey="p5" stroke="none" fill="var(--background)" fillOpacity={1} />
            <Area type="monotone" dataKey="p75" stroke="none" fill="var(--primary)" fillOpacity={0.15} />
            <Area type="monotone" dataKey="p25" stroke="none" fill="var(--background)" fillOpacity={1} />
            <Line type="monotone" dataKey="p50" stroke="var(--primary)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>
    </ToolChrome>
  );
}

/* ─── Break-even ────────────────────────────────────────────── */

function BreakEvenTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const [expiryIdx, setExpiryIdx] = useState(0);
  const [type, setType] = useState<'call' | 'put' | 'both'>('call');
  const rows = useMemo(() => breakEvenTable(snapshot, expiryIdx, type), [snapshot, expiryIdx, type]);
  const near = rows.filter(r => Math.abs(r.strike - snapshot.spot) / snapshot.spot < 0.12);

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Expiry
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={expiryIdx} onChange={e => setExpiryIdx(+e.target.value)}>
            {snapshot.expiries.map((e, i) => (
              <option key={e.expiry} value={i}>{e.expiry} ({e.dte}d)</option>
            ))}
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Type
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={type} onChange={e => setType(e.target.value as typeof type)}>
            <option value="call">Calls</option>
            <option value="put">Puts</option>
            <option value="both">Both</option>
          </select>
        </label>
        <Stat label="Spot" value={fmtPrice(snapshot.spot)} />
        <Stat label="Rows" value={String(near.length)} />
      </div>
      <Panel title="Break-evens · N(d2)" subtitle="Near-money contracts" className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-type-sm font-mono">
          <thead className="sticky top-0 bg-card text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left px-2 py-1">K</th>
              <th className="text-left px-2 py-1">Type</th>
              <th className="text-right px-2 py-1">Mid</th>
              <th className="text-right px-2 py-1">BE</th>
              <th className="text-right px-2 py-1">BE dist</th>
              <th className="text-right px-2 py-1"><Explain term="nd2">N(d2)</Explain></th>
              <th className="text-right px-2 py-1">Δ</th>
              <th className="text-right px-2 py-1">IV</th>
            </tr>
          </thead>
          <tbody>
            {near.map(r => (
              <tr key={`${r.type}-${r.strike}`} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-2 py-0.5">{fmtPrice(r.strike, r.strike > 1000 ? 0 : 2)}</td>
                <td className="px-2 py-0.5" style={{ color: r.type === 'call' ? 'var(--up)' : 'var(--down)' }}>{r.type}</td>
                <td className="px-2 py-0.5 text-right">{fmtPrice(r.mid)}</td>
                <td className="px-2 py-0.5 text-right">{fmtPrice(r.beLong, r.beLong > 1000 ? 0 : 2)}</td>
                <td className="px-2 py-0.5 text-right" style={{ color: r.beDistPct >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmtPct(r.beDistPct)}</td>
                <td className="px-2 py-0.5 text-right">{(r.nd2 * 100).toFixed(1)}%</td>
                <td className="px-2 py-0.5 text-right">{r.delta.toFixed(3)}</td>
                <td className="px-2 py-0.5 text-right">{fmtPct(r.iv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </ToolChrome>
  );
}

/* ─── Subjective ────────────────────────────────────────────── */

function SubjectiveTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const [expiryIdx, setExpiryIdx] = useState(0);
  const [drift, setDrift] = useState(0.05);
  const [vrp, setVrp] = useState(0.02);

  const rows = useMemo(
    () => evaluateSubjective(snapshot, expiryIdx, { drift, vrp }, 'both'),
    [snapshot, expiryIdx, drift, vrp],
  );
  const summary = useMemo(() => subjectiveSummary(rows), [rows]);
  const chart = rows.filter(r => r.type === 'call' && Math.abs(r.strike - snapshot.spot) / snapshot.spot < 0.15)
    .map(r => ({
      strike: r.strike,
      market: r.marketMid,
      fair: r.subjectivePrice,
      edge: r.edge,
    }));

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Expiry
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={expiryIdx} onChange={e => setExpiryIdx(+e.target.value)}>
            {snapshot.expiries.map((e, i) => (
              <option key={e.expiry} value={i}>{e.expiry} ({e.dte}d)</option>
            ))}
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Drift μ
          <input type="number" step={0.01} value={drift} onChange={e => setDrift(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          VRP
          <input type="number" step={0.005} value={vrp} onChange={e => setVrp(+e.target.value)} className="w-16 bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" />
        </label>
        <Stat label="Avg edge" value={fmtSigned(summary.avgEdge)} color={summary.avgEdge >= 0 ? 'var(--up)' : 'var(--down)'} />
        <Stat label="Cheap" value={String(summary.cheapCount)} color="var(--up)" />
        <Stat label="Rich" value={String(summary.richCount)} color="var(--down)" />
        {summary.bestLong && (
          <Stat
            label="Best long"
            value={`${summary.bestLong.type[0]!.toUpperCase()} ${fmtPrice(summary.bestLong.strike, 0)} (${fmtSigned(summary.bestLong.edge)})`}
          />
        )}
      </div>
      <Panel title="Market mid vs subjective fair" subtitle="σ_subj = IV − VRP · r_eff = μ + q" className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="strike" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} tickFormatter={(v: number) => fmtPrice(v, 0)} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={44} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <ReferenceLine x={snapshot.spot} stroke="var(--amber)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="market" stroke="var(--muted-foreground)" strokeWidth={1.5} dot={false} name="Market" />
            <Line type="monotone" dataKey="fair" stroke="var(--primary)" strokeWidth={2} dot={false} name="Fair" />
            <Line type="monotone" dataKey="edge" stroke="var(--cyan)" strokeWidth={1} strokeDasharray="2 2" dot={false} name="Edge" />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>
    </ToolChrome>
  );
}

/* ─── Grid ──────────────────────────────────────────────────── */

function GridTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const [type, setType] = useState<'call' | 'put'>('call');
  const [metric, setMetric] = useState<'omega' | 'invNd2' | 'nd2'>('omega');
  const grid = useMemo(() => buildOptionGrid(snapshot, type, 6), [snapshot, type]);

  const values = grid.cells.flatMap(row => row.map(c => c[metric]).filter((v): v is number => v != null && isFinite(v)));
  const maxAbs = Math.max(...values.map(Math.abs), 1e-9);

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Type
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={type} onChange={e => setType(e.target.value as typeof type)}>
            <option value="call">Calls</option>
            <option value="put">Puts</option>
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Metric
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={metric} onChange={e => setMetric(e.target.value as typeof metric)}>
            <option value="omega">Ω leverage</option>
            <option value="nd2">N(d2)</option>
            <option value="invNd2">1/N(d2)</option>
          </select>
        </label>
        <Stat label="Strikes" value={String(grid.strikes.length)} />
        <Stat label="Expiries" value={String(grid.expiries.length)} />
      </div>
      <Panel title="Option Grid" subtitle={metric === 'omega' ? 'ω = Δ·S/V' : metric} className="flex-1 min-h-0 overflow-auto">
        <div className="overflow-auto h-full">
          <table className="text-type-xs font-mono border-collapse">
            <thead className="sticky top-0 bg-card z-10">
              <tr>
                <th className="px-1 py-1 text-left text-muted-foreground sticky left-0 bg-card">K \\ T</th>
                {grid.dtes.map((d, i) => (
                  <th key={grid.expiries[i]} className="px-1 py-1 text-muted-foreground font-normal">{d}d</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.strikes.map((K, ki) => (
                <tr key={K}>
                  <td className="px-1 py-0.5 text-muted-foreground sticky left-0 bg-card">{fmtPrice(K, K > 1000 ? 0 : 1)}</td>
                  {grid.cells.map((row, ei) => {
                    const cell = row[ki];
                    const v = cell?.[metric] ?? null;
                    const intensity = v != null ? Math.min(1, Math.abs(v) / maxAbs) : 0;
                    const bg = v == null
                      ? 'transparent'
                      : `color-mix(in oklch, var(--cyan) ${Math.round(intensity * 55)}%, transparent)`;
                    return (
                      <td key={ei} className="px-1 py-0.5 text-right tabular-nums" style={{ background: bg }}>
                        {v == null ? '·' : metric === 'nd2' ? (v * 100).toFixed(0) : v.toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

/* ─── Combo PnL (historical greek decomposition) ───────────── */

function ComboPnlTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const { path, source: pathSrc } = useSpotPath(45);
  const [template, setTemplate] = useState<'short_straddle' | 'long_straddle' | 'risk_reversal' | 'call_spread' | 'long_call'>('short_straddle');
  const [expiryIdx, setExpiryIdx] = useState(0);

  const legs = useMemo(() => templateLegs(template, snapshot, expiryIdx), [template, snapshot, expiryIdx]);
  const series = useMemo(() => comboGreeksPnl(legs, snapshot, path), [legs, snapshot, path]);

  const chart = series.bars.map(b => ({
    t: b.dateLabel,
    pnl: b.pnl,
    delta: b.cumDelta,
    gamma: b.cumGamma,
    theta: b.cumTheta,
    residual: b.cumResidual,
  }));

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Structure
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={template} onChange={e => setTemplate(e.target.value as typeof template)}>
            <option value="short_straddle">Short straddle</option>
            <option value="long_straddle">Long straddle</option>
            <option value="risk_reversal">Risk reversal</option>
            <option value="call_spread">Call spread</option>
            <option value="long_call">Long call</option>
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Expiry
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={expiryIdx} onChange={e => setExpiryIdx(+e.target.value)}>
            {snapshot.expiries.map((e, i) => (
              <option key={e.expiry} value={i}>{e.expiry} ({e.dte}d)</option>
            ))}
          </select>
        </label>
        <Stat label="Term PnL" value={fmtSigned(series.terminalPnl)} color={series.terminalPnl >= 0 ? 'var(--up)' : 'var(--down)'} />
        <Stat label="Σ Δ" value={fmtSigned(series.totalDelta)} />
        <Stat label="Σ Γ" value={fmtSigned(series.totalGamma)} />
        <Stat label="Σ Θ" value={fmtSigned(series.totalTheta)} />
        <Stat label="Residual" value={fmtSigned(series.totalResidual)} />
        <Stat label="Path" value={pathSrc} />
        <Stat label="Marks" value="BS sticky-IV" />
      </div>
      <Panel
        title="Combo mark PnL · greek attribution"
        subtitle={`Approx · sticky-strike BS (not exchange marks) · path=${pathSrc} · Δ·dS+½Γ·dS²+Θ·dT`}
        className="flex-1 min-h-0"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={48} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
            <Area type="monotone" dataKey="pnl" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.12} name="Mark PnL" />
            <Line type="monotone" dataKey="delta" stroke="var(--cyan)" strokeWidth={1} dot={false} name="ΣΔ" />
            <Line type="monotone" dataKey="gamma" stroke="var(--up)" strokeWidth={1} dot={false} name="ΣΓ" />
            <Line type="monotone" dataKey="theta" stroke="var(--amber)" strokeWidth={1} dot={false} name="ΣΘ" />
            <Line type="monotone" dataKey="residual" stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="2 2" dot={false} name="Residual" />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>
    </ToolChrome>
  );
}

/* ─── Option PnL ─────────────────────────────────────────────── */

function OptionPnlTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const { path, source: pathSrc } = useSpotPath(45);
  const [expiryIdx, setExpiryIdx] = useState(0);
  const [type, setType] = useState<'call' | 'put'>('call');
  const [side, setSide] = useState<'long' | 'short'>('long');

  const slice = snapshot.expiries[expiryIdx] ?? snapshot.expiries[0];
  const strikes = useMemo(() => {
    if (!slice) return [] as number[];
    const list = type === 'call' ? slice.calls : slice.puts;
    return list.filter(q => q.iv != null).map(q => q.strike).sort((a, b) => a - b);
  }, [slice, type]);

  const defaultStrike = useMemo(() => {
    if (!strikes.length) return snapshot.spot;
    return strikes.reduce((b, k) => Math.abs(k - snapshot.spot) < Math.abs(b - snapshot.spot) ? k : b, strikes[0]!);
  }, [strikes, snapshot.spot]);

  const [strike, setStrike] = useState(defaultStrike);
  useEffect(() => { setStrike(defaultStrike); }, [defaultStrike]);

  const series = useMemo(() => {
    if (!slice) return null;
    return optionGreeksPnl(snapshot, {
      type, strike, expiry: slice.expiry, side, path,
    });
  }, [snapshot, type, strike, slice, side, path]);

  const chart = series?.bars.map(b => ({
    t: b.dateLabel,
    pnl: b.pnl,
    mark: b.mark,
    delta: b.cumDelta,
    gamma: b.cumGamma,
    theta: b.cumTheta,
  })) ?? [];

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Expiry
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={expiryIdx} onChange={e => setExpiryIdx(+e.target.value)}>
            {snapshot.expiries.map((e, i) => (
              <option key={e.expiry} value={i}>{e.expiry} ({e.dte}d)</option>
            ))}
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Type
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={type} onChange={e => setType(e.target.value as 'call' | 'put')}>
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Strike
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={strike} onChange={e => setStrike(+e.target.value)}>
            {strikes.map(k => (
              <option key={k} value={k}>{fmtPrice(k, k > 1000 ? 0 : 2)}</option>
            ))}
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Side
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={side} onChange={e => setSide(e.target.value as 'long' | 'short')}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>
        {series && (
          <>
            <Stat label="Term PnL" value={fmtSigned(series.terminalPnl)} color={series.terminalPnl >= 0 ? 'var(--up)' : 'var(--down)'} />
            <Stat label="Σ Δ" value={fmtSigned(series.totalDelta)} />
            <Stat label="Σ Γ" value={fmtSigned(series.totalGamma)} />
            <Stat label="Σ Θ" value={fmtSigned(series.totalTheta)} />
            <Stat label="Path" value={pathSrc} />
            <Stat label="Marks" value="BS sticky-IV" />
          </>
        )}
      </div>
      <Panel title="Option mark PnL" subtitle={`Approx · sticky-strike BS (not exchange marks) · path=${pathSrc}`} className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={48} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <ReferenceLine y={0} stroke="var(--muted-foreground)" />
            <Area type="monotone" dataKey="pnl" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
            <Line type="monotone" dataKey="delta" stroke="var(--cyan)" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="theta" stroke="var(--amber)" strokeWidth={1} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>
    </ToolChrome>
  );
}

/* ─── Straddle (BE + historical PnL) ─────────────────────────── */

function StraddleTool() {
  const snapshot = useTerminalStore(s => s.snapshot)!;
  const { path, source: pathSrc } = useSpotPath(45);
  const [expiryIdx, setExpiryIdx] = useState(0);
  const [mode, setMode] = useState<'breakeven' | 'pnl'>('breakeven');
  const [side, setSide] = useState<'long' | 'short'>('long');

  const legs = useMemo(
    () => templateLegs(side === 'long' ? 'long_straddle' : 'short_straddle', snapshot, expiryIdx),
    [side, snapshot, expiryIdx],
  );
  const mark = useMemo(() => evaluateCombo(legs, snapshot), [legs, snapshot]);
  const be = useMemo(() => analyzeComboBreakEven(legs, snapshot.spot), [legs, snapshot]);

  const strike = legs[0]?.strike ?? snapshot.spot;
  const callMid = legs.find(l => l.kind === 'call')?.entryPrice ?? 0;
  const putMid = legs.find(l => l.kind === 'put')?.entryPrice ?? 0;
  const strBe = straddleBreakEvens(strike, callMid, putMid, side);

  const series = useMemo(() => comboGreeksPnl(legs, snapshot, path), [legs, snapshot, path]);
  const pnlChart = series.bars.map(b => ({ t: b.dateLabel, pnl: b.pnl, delta: b.cumDelta, theta: b.cumTheta }));
  const payoffChart = be.payoffCurve.map(p => ({ spot: p.spot, pnl: p.pnl }));

  return (
    <ToolChrome>
      <div className="flex flex-wrap gap-3 px-2 py-1 border border-border bg-card/50 rounded items-end">
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Mode
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={mode} onChange={e => setMode(e.target.value as typeof mode)}>
            <option value="breakeven">Break-even</option>
            <option value="pnl">Historical PnL</option>
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Side
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={side} onChange={e => setSide(e.target.value as typeof side)}>
            <option value="long">Long straddle</option>
            <option value="short">Short straddle</option>
          </select>
        </label>
        <label className="text-type-xs font-mono text-muted-foreground flex flex-col gap-0.5">
          Expiry
          <select className="bg-background border border-border rounded px-1 py-0.5 text-xs font-mono" value={expiryIdx} onChange={e => setExpiryIdx(+e.target.value)}>
            {snapshot.expiries.map((e, i) => (
              <option key={e.expiry} value={i}>{e.expiry} ({e.dte}d)</option>
            ))}
          </select>
        </label>
        <Stat label="K" value={fmtPrice(strike, strike > 1000 ? 0 : 2)} />
        <Stat label="Premium" value={fmtPrice(strBe.totalPremium)} />
        <Stat label="BE lo" value={fmtPrice(strBe.lower, strBe.lower > 1000 ? 0 : 2)} />
        <Stat label="BE hi" value={fmtPrice(strBe.upper, strBe.upper > 1000 ? 0 : 2)} />
        <Stat label="Mark Δ" term="delta" value={fmtSigned(mark.greeks.delta, 3)} />
        <Stat label="Mark ν" term="vega" value={fmtSigned(mark.greeks.vega, 2)} />
        {mode === 'pnl' && <Stat label="Path" value={pathSrc} />}
      </div>
      {mode === 'breakeven' ? (
        <Panel title="Straddle payoff at expiry" subtitle="BEs = K ± (call+put premium)" className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={payoffChart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="spot" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} tickFormatter={(v: number) => fmtPrice(v, 0)} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={44} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <ReferenceLine x={snapshot.spot} stroke="var(--amber)" strokeDasharray="3 3" />
              <ReferenceLine x={strBe.lower} stroke="var(--cyan)" strokeDasharray="2 2" />
              <ReferenceLine x={strBe.upper} stroke="var(--cyan)" strokeDasharray="2 2" />
              <Area type="monotone" dataKey="pnl" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      ) : (
        <Panel title="Straddle historical mark PnL" subtitle="BS sticky-IV greek decomposition" className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pnlChart} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} width={48} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <Area type="monotone" dataKey="pnl" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
              <Line type="monotone" dataKey="delta" stroke="var(--cyan)" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="theta" stroke="var(--amber)" strokeWidth={1} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
      )}
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
