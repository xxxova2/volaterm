/**
 * MM Desk — full Thalex-inspired toolkit (12 tools):
 * Simulator · Combo PnL · Straddle · Combo Greeks · Greeks · Option PnL ·
 * Break-even · Roll PnL · Basis · Subjective · Δ Follower · Hedging · Grid
 *
 * Pricing: Black–Scholes–Merton (r, q). IV = Newton/bisection invert of BS.
 * Equity chain: yfinance (auto) / FMP. BTC/ETH options: Deribit public.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { EmptyState } from '../common/EmptyState';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import { FreshnessFromDomain } from '../common/Freshness';
import { DeskChrome } from '../terminal/DeskChrome';
import { DeskModeBar } from '../terminal/DeskModeBar';
import { fmtPrice } from '../../lib/format';
import { cn } from '../../lib/utils';
import { UI_COPY } from '../../config/uiCopy';
import { isCryptoSymbol } from '../../lib/options/basis';
import { inventoryByExpiry, portfolioGreeks } from '../../lib/options/analytics';
import { DeskLoading } from '../common/Skeleton';
import { consumeDeskJumpOnMount } from '../../lib/market/deskJump';
import { resolveTradeModeSection } from '../../config/deskSections';
import { SimTool } from '../desk/tools/SimTool';
import { ComboGreeksTool } from '../desk/tools/ComboGreeksTool';
import { GridTool } from '../desk/tools/GridTool';
import { BreakEvenTool } from '../desk/tools/BreakEvenTool';
import { SubjectiveTool } from '../desk/tools/SubjectiveTool';
import { ComboPnlTool } from '../desk/tools/ComboPnlTool';
import { OptionPnlTool } from '../desk/tools/OptionPnlTool';
import { StraddleTool } from '../desk/tools/StraddleTool';
import { HedgeTool } from '../desk/tools/HedgeTool';
import { DFollowTool } from '../desk/tools/DFollowTool';
import { BacktestTool } from '../desk/tools/BacktestTool';
import { BasisTool } from '../desk/tools/BasisTool';
import { RollTool } from '../desk/tools/RollTool';

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

/** Quant workflow: 3 red-bar modes; tools pick inside the workspace. */
const TOOLS: { id: ToolId; label: string; blurb: string; mode: string }[] = [
  { id: 'combo', label: 'Combo Greeks', blurb: 'Multi-leg greeks vs spot', mode: 'trade-sub-structure' },
  { id: 'grid', label: 'Grid', blurb: 'Ω leverage · 1/N(d2)', mode: 'trade-sub-structure' },
  { id: 'sim', label: 'Simulator', blurb: 'GBM path cloud + multi-leg PnL bands', mode: 'trade-sub-structure' },
  { id: 'optionpnl', label: 'Option PnL', blurb: 'Single-option historical mark PnL', mode: 'trade-sub-pnl' },
  { id: 'combopnl', label: 'Combo PnL', blurb: 'Historical multi-leg PnL by greek', mode: 'trade-sub-pnl' },
  { id: 'straddle', label: 'Straddle', blurb: 'Break-even + historical straddle PnL', mode: 'trade-sub-pnl' },
  { id: 'breakeven', label: 'Break Even', blurb: 'BE prices + N(d2)', mode: 'trade-sub-pnl' },
  { id: 'subjective', label: 'Subjective', blurb: 'Drift + VRP fair value (BS)', mode: 'trade-sub-pnl' },
  { id: 'backtest', label: 'Backtest', blurb: 'Weekly short-straddle Δ-hedged path', mode: 'trade-sub-pnl' },
  { id: 'hedge', label: 'Hedging', blurb: 'Threshold / tolerance / period Δ-hedge', mode: 'trade-sub-risk' },
  { id: 'dfollow', label: 'Δ Follower', blurb: 'Track option delta with hedge', mode: 'trade-sub-risk' },
  { id: 'basis', label: 'Basis', blurb: 'Forward basis + ann. carry', mode: 'trade-sub-risk' },
  { id: 'roll', label: 'Roll PnL', blurb: 'Funding/basis carry heatmap', mode: 'trade-sub-risk' },
  { id: 'analyze', label: 'Greeks', blurb: 'Greeks surfaces · GEX · OI (Thalex-class)', mode: 'trade-sub-structure' },
];

const MODE_DEFAULT_TOOL: Record<string, ToolId> = {
  'trade-sub-structure': 'combo',
  'trade-sub-pnl': 'optionpnl',
  'trade-sub-risk': 'hedge',
};

function toolsForMode(mode: string) {
  return TOOLS.filter((t) => t.mode === mode && t.id !== 'analyze');
}

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
  // Lab-first default; red bar modes + function codes override via deskSectionId
  const [tool, setTool] = useState<ToolId>(chrome === 'thalex' ? 'sim' : 'combo');

  useEffect(() => consumeDeskJumpOnMount(), []);

  // Red bar (trade-sub-*) or legacy desk-ws-* function codes → tool workspace
  useEffect(() => {
    if (!deskSectionId) return;

    const legacyTool = SECTION_TO_TOOL[deskSectionId];
    if (legacyTool) {
      setTool(legacyTool);
      const meta = TOOLS.find((t) => t.id === legacyTool);
      setDeskContext({
        id: TOOL_TO_SECTION[legacyTool],
        label: meta?.label ?? legacyTool,
        apis:
          legacyTool === 'analyze'
            ? chrome === 'thalex' ? ['Deribit', 'MacroVol'] : ['MacroVol', 'yfinance']
            : chrome === 'thalex' ? ['Deribit'] : ['yfinance', 'FMP', 'Deribit'],
      });
      return;
    }

    const mode = resolveTradeModeSection(deskSectionId);
    if (
      deskSectionId === 'trade-sub-structure'
      || deskSectionId === 'trade-sub-pnl'
      || deskSectionId === 'trade-sub-risk'
    ) {
      setTool((prev) => {
        const inMode = toolsForMode(mode).some((t) => t.id === prev);
        return inMode ? prev : (MODE_DEFAULT_TOOL[mode] ?? 'combo');
      });
      const modeLabel =
        mode === 'trade-sub-pnl' ? 'PnL'
          : mode === 'trade-sub-risk' ? 'Hedge'
            : 'Structure';
      setDeskContext({
        id: mode,
        label: modeLabel,
        apis: chrome === 'thalex' ? ['Deribit'] : ['yfinance', 'FMP', 'Deribit'],
      });
    }
  }, [deskSectionId, setDeskContext, chrome]);

  const activeMode = useMemo(() => {
    const fromTool = TOOLS.find((t) => t.id === tool)?.mode;
    if (fromTool) return fromTool;
    return resolveTradeModeSection(deskSectionId);
  }, [tool, deskSectionId]);

  const modeTools = useMemo(() => toolsForMode(activeMode), [activeMode]);

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
        {modeTools.length > 1 && (
          <DeskModeBar
            items={modeTools.map((t) => ({
              id: t.id,
              label: t.label,
              title: t.blurb,
            }))}
            activeId={tool}
            onSelect={(id) => setTool(id as ToolId)}
          />
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
