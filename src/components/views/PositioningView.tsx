/**
 * Positioning desk — chain + dealer stack (GEX/DEX/VEX/Charm) + levels + parity edge.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { OptionChain } from './OptionChain';
import { DiagnosticsStrip } from './DiagnosticsStrip';
import { Explain } from '../common/Explain';
import { EmptyState } from '../common/EmptyState';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import { FreshnessFromDomain } from '../common/Freshness';
import { VirtualRows } from '../common/VirtualRows';
import { fmtCompact, fmtPrice, fmtPct, fmtSigned } from '../../lib/format';
import {
  dealerExposure,
  impliedMove,
  maxPainStrike,
  scanParityEdges,
  type DealerMetric,
  type ExposureWeight,
} from '../../lib/options/analytics';
import { cn } from '../../lib/utils';
import { CHART, chartAxisTick, chartTooltipStyle, chartGridProps } from '../../lib/chartTheme';
import {
  useBoardFocus,
  useRegisterBoard,
  type FocusableBoardApi,
} from '../../hooks/useBoardFocus';
import { PERF_BUDGET } from '../../config/perfBudget';
import { DeskChrome } from '../terminal/DeskChrome';
import { DeskModeBar } from '../terminal/DeskModeBar';
import { GexLevelsStrip } from '../common/GexLevelsStrip';
import { StrategyBuilderStrip } from '../common/StrategyBuilderStrip';

type Sub = 'chain' | 'dealer' | 'levels' | 'edge' | 'strategy';

const SUBS: { id: Sub; label: string; blurb: string; domId: string }[] = [
  { id: 'chain', label: 'Option Chain', blurb: 'Bid/ask · IV · OI', domId: 'pos-sub-chain' },
  { id: 'dealer', label: 'Dealer Stack', blurb: 'GEX · DEX · VEX · Charm', domId: 'pos-sub-dealer' },
  { id: 'levels', label: 'Key Levels', blurb: 'Walls · flip · max pain · move', domId: 'pos-sub-levels' },
  { id: 'edge', label: 'Parity Edge', blurb: 'Put–call residual vs costs', domId: 'pos-sub-edge' },
  { id: 'strategy', label: 'Strategy', blurb: 'Multi-leg mid + net greeks', domId: 'pos-sub-strategy' },
];

const METRICS: { id: DealerMetric; label: string; term: string; unit: string }[] = [
  { id: 'gex', label: 'GEX', term: 'gex', unit: '$ γ·S exposure' },
  { id: 'dex', label: 'DEX', term: 'dex', unit: '$ δ notional' },
  { id: 'vex', label: 'VEX', term: 'vex', unit: 'vanna · S' },
  { id: 'charm', label: 'Charm', term: 'charmExposure', unit: '$ Δ / day' },
];

function metricFields(m: DealerMetric) {
  switch (m) {
    case 'dex': return { call: 'callDEX' as const, put: 'putDEX' as const, net: 'netDEX' as const, total: 'totalDEX' as const };
    case 'vex': return { call: 'callVEX' as const, put: 'putVEX' as const, net: 'netVEX' as const, total: 'totalVEX' as const };
    case 'charm': return { call: 'callCharm' as const, put: 'putCharm' as const, net: 'netCharm' as const, total: 'totalCharm' as const };
    default: return { call: 'callGEX' as const, put: 'putGEX' as const, net: 'netGEX' as const, total: 'totalGEX' as const };
  }
}

type StrikeZoom = 'all' | 'atm20' | 'atm10' | 'atm5';

export function PositioningView() {
  const [sub, setSub] = useState<Sub>('dealer');
  const [metric, setMetric] = useState<DealerMetric>('gex');
  const [weight, setWeight] = useState<ExposureWeight>('oi');
  const [strikeZoom, setStrikeZoom] = useState<StrikeZoom>('atm20');
  const snapshot = useTerminalStore((s) => s.snapshot);
  const sviReadout = useTerminalStore((s) => s.sviReadout);
  const arbResult = useTerminalStore((s) => s.arbResult);
  const setDeskContext = useTerminalStore((s) => s.setDeskContext);
  const chainAvailable = useTerminalStore((s) => s.chainAvailable);
  const chainUsed = useTerminalStore((s) => s.chainUsed);
  const lastChainUpdate = useTerminalStore((s) => s.lastChainUpdate);
  const provenance = useTerminalStore((s) => s.provenance);

  // Fail-closed: never optimistic live from snapshot presence alone; FreshnessFromDomain re-ticks age
  const chainMissing = !chainAvailable || chainUsed === 'none';
  const chainAsOfMs = provenance.chain?.asOfMs ?? (lastChainUpdate > 0 ? lastChainUpdate : null);

  useEffect(() => {
    const meta = SUBS.find((s) => s.id === sub);
    setDeskContext({ id: meta?.domId ?? null, label: meta?.label ?? 'Dealer', apis: [] });
    return () => setDeskContext({ id: null, label: null, apis: [] });
  }, [sub, setDeskContext]);

  const dealer = useMemo(
    () => (snapshot ? dealerExposure(snapshot, { weight }) : null),
    [snapshot, weight],
  );
  const maxPain = useMemo(() => (snapshot ? maxPainStrike(snapshot) : null), [snapshot]);
  const move = useMemo(() => (snapshot ? impliedMove(snapshot) : null), [snapshot]);
  const parity = useMemo(
    () => (snapshot ? scanParityEdges(snapshot) : []),
    [snapshot],
  );

  const fields = metricFields(metric);
  const totalVal = dealer ? (dealer[fields.total] as number) : 0;

  const zoomThr = strikeZoom === 'atm5' ? 0.05 : strikeZoom === 'atm10' ? 0.10 : strikeZoom === 'atm20' ? 0.20 : Infinity;

  const chartData = useMemo(() => {
    if (!dealer || !snapshot) return [];
    const spot = snapshot.spot;
    return dealer.points
      .filter((p) => zoomThr === Infinity || Math.abs(p.strike - spot) / spot <= zoomThr)
      .map((p) => ({
        strike: p.strike,
        label: fmtPrice(p.strike, p.strike > 1000 ? 0 : 2),
        call: (p[fields.call] as number) / 1e6,
        put: (p[fields.put] as number) / 1e6,
        net: (p[fields.net] as number) / 1e6,
      }));
  }, [dealer, fields.call, fields.put, fields.net, snapshot, zoomThr]);

  /** Snap a price to nearest chart category label (Recharts categorical X needs exact match). */
  const nearestLabel = (price: number | null | undefined): string | null => {
    if (price == null || !chartData.length) return null;
    let best = chartData[0]!;
    let bestAbs = Math.abs(best.strike - price);
    for (const p of chartData) {
      const d = Math.abs(p.strike - price);
      if (d < bestAbs) {
        bestAbs = d;
        best = p;
      }
    }
    return best.label;
  };
  const spotLabel = nearestLabel(snapshot?.spot);
  const flipLabel = metric === 'gex' ? nearestLabel(dealer?.gammaFlip) : null;
  const callWallLabel = metric === 'gex' ? nearestLabel(dealer?.callWall) : null;
  const putWallLabel = metric === 'gex' ? nearestLabel(dealer?.putWall) : null;

  const chartRef = useRef(chartData);
  chartRef.current = chartData;
  const { focused: dealerFocused, rowIndex: dealerRow, focusRow: focusDealer } = useBoardFocus('dealer-bars');
  const dealerApi = useMemo<FocusableBoardApi>(
    () => ({
      scrollToRow: () => {},
      getCellText: (row, colKey) => {
        const r = chartRef.current[row];
        if (!r) return '';
        if (colKey === 'net') return String(r.net);
        return String(r.strike);
      },
      rowCount: () => chartRef.current.length,
      colKeys: () => ['strike', 'net'],
    }),
    [],
  );
  useRegisterBoard('dealer-bars', sub === 'dealer' && chartData.length ? dealerApi : null);

  const oiByExpiry = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.expiries.map((e) => {
      const callOI = e.calls.reduce((s, q) => s + q.openInterest, 0);
      const putOI = e.puts.reduce((s, q) => s + q.openInterest, 0);
      return {
        label: `${e.dte}d`,
        callOI,
        putOI,
        total: callOI + putOI,
        pcr: callOI > 0 ? putOI / callOI : null,
      };
    });
  }, [snapshot]);

  const tradeableParity = parity.filter((r) => r.tradeable);

  const flip = dealer?.gammaFlip;
  const aboveFlip = flip != null && snapshot ? snapshot.spot >= flip : null;

  const activeDomId = SUBS.find((s) => s.id === sub)?.domId ?? 'pos-sub-dealer';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DeskChrome
        label="POSITIONING"
        trailing={
          <FreshnessFromDomain
            asOfMs={chainAsOfMs}
            domain="chain"
            down={chainMissing}
            previousKind={provenance.chain?.kind}
          />
        }
      >
        <DeskModeBar
          items={SUBS.map((s) => ({
            id: s.domId,
            label: s.label,
            title: s.blurb,
          }))}
          activeId={activeDomId}
          onSelect={(domId) => {
            const m = SUBS.find((s) => s.domId === domId);
            if (m) setSub(m.id);
          }}
          asSectionButtons
        />
      </DeskChrome>

      {/* Sticky GEX walls + regime + session path (Phase 2.5 / 3) */}
      <GexLevelsStrip className="bg-card/50" showSpark />

      {/* Extra context under sticky strip */}
      {snapshot && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-card/30 px-3 py-1 font-mono text-type-2xs text-muted-foreground">
          {flip != null && (
            <span className={aboveFlip ? 'text-up' : 'text-down'}>
              {aboveFlip ? 'ABOVE γ-FLIP' : 'BELOW γ-FLIP'}
            </span>
          )}
          <span>
            Max pain{' '}
            <span className="text-foreground">{maxPain != null ? fmtPrice(maxPain, 0) : '—'}</span>
          </span>
          <span>
            Move <span className="text-cyan">{move ? `±${fmtPrice(move.move)}` : '—'}</span>
          </span>
          {tradeableParity.length > 0 && (
            <span className="text-foreground">
              {tradeableParity.length} parity flag{tradeableParity.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="ml-auto">{dealer?.unitNote ?? ''}</span>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {sub === 'chain' && (
          <SectionErrorBoundary name="Chain">
            <Panel title="Option Chain" className="h-full">
              <div className="flex h-full flex-col">
                <DiagnosticsStrip sviReadout={sviReadout} arbResult={arbResult} />
                <div className="min-h-0 flex-1">
                  <OptionChain />
                </div>
              </div>
            </Panel>
          </SectionErrorBoundary>
        )}

        {sub === 'dealer' && (
          <SectionErrorBoundary name="Dealer">
          <Panel
            title={<Explain term="dealerStack">Dealer Stack</Explain>}
            subtitle="Customer long OI → dealers short · pick metric + weight"
            className="h-full"
          >
            {!dealer || dealer.points.length === 0 ? (
              <EmptyState
                kind="no-data"
                title="No dealer exposure"
                body="Chain has no open interest, volume, or γ to weight. Wait for a live chain or try another symbol."
              />
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                {dealer.weightFallback && (
                  <div
                    className="shrink-0 border-b border-warn/30 bg-warn/10 px-3 py-1 font-mono text-type-2xs text-warn"
                    role="status"
                  >
                    {dealer.unitNote}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-1.5">
                  <div className="flex gap-0.5">
                    {METRICS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetric(m.id)}
                        className={cn(
                          'rounded px-2 py-0.5 font-mono text-type-xs border transition-colors',
                          metric === m.id
                            ? 'border-primary bg-secondary text-foreground ring-1 ring-border'
                            : 'border-border text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Explain term={m.term}>{m.label}</Explain>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-0.5 ml-2">
                    {([
                      ['oi', 'OI'],
                      ['volume', 'Vol'],
                      ['unit', 'Unit'],
                    ] as const).map(([w, lab]) => {
                      // When feed has no OI, 'oi' request auto-falls to volume — highlight effective mode
                      const effective = dealer.weight;
                      const active =
                        weight === w || (w === effective && dealer.weightFallback && weight === 'oi');
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWeight(w)}
                          className={cn(
                            'rounded px-2 py-0.5 font-mono text-type-xs border',
                            active
                              ? 'border-border bg-secondary text-foreground'
                              : 'border-border text-muted-foreground',
                          )}
                          title={
                            w === 'oi'
                              ? 'Open interest (auto→volume if OI missing)'
                              : w === 'volume'
                                ? 'Session volume weight'
                                : '1 per listed contract'
                          }
                        >
                          {lab}
                          {w === 'volume' && dealer.weightFallback && weight === 'oi' ? '·auto' : ''}
                        </button>
                      );
                    })}
                  </div>
                  <div className="ml-2 flex gap-0.5" title="Strike axis zoom around spot">
                    {([
                      ['atm5', '±5%'],
                      ['atm10', '±10%'],
                      ['atm20', '±20%'],
                      ['all', 'All'],
                    ] as const).map(([id, lab]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setStrikeZoom(id)}
                        className={cn(
                          'rounded px-1.5 py-0.5 font-mono text-type-2xs border',
                          strikeZoom === id
                            ? 'border-cyan bg-cyan/10 text-cyan'
                            : 'border-border text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {lab}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex flex-wrap gap-3 font-mono text-type-xs">
                    <StatMini label={`Σ ${metric.toUpperCase()}`} value={fmtCompact(totalVal)} color={totalVal >= 0 ? CHART.series.up : CHART.series.down} />
                    <StatMini label="DEX $" value={fmtCompact(dealer.totalDEX)} color={dealer.totalDEX >= 0 ? CHART.series.up : CHART.series.down} />
                    <StatMini label="Charm/d" value={fmtCompact(dealer.totalCharm)} />
                    <StatMini label="Flip" value={dealer.gammaFlip != null ? fmtPrice(dealer.gammaFlip, 0) : '—'} color={CHART.series.amber} />
                  </div>
                </div>
                <div className="flex min-h-[280px] flex-1 flex-col lg:flex-row">
                  {/* Absolute fill so Recharts ResponsiveContainer gets a real height */}
                  <div className="relative min-h-[240px] min-w-0 flex-1 basis-0 lg:min-h-0">
                    <div className="absolute inset-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 14, right: 12, bottom: 8, left: 4 }}>
                          <CartesianGrid {...chartGridProps} />
                          <XAxis
                            dataKey="label"
                            tick={{ ...chartAxisTick, fontSize: 9 }}
                            tickLine={false}
                            interval={Math.max(0, Math.floor(chartData.length / 14))}
                          />
                          <YAxis
                            tick={chartAxisTick}
                            tickLine={false}
                            width={44}
                            tickFormatter={(v: number) => `${v.toFixed(0)}M`}
                          />
                          <Tooltip contentStyle={chartTooltipStyle} />
                          <ReferenceLine y={0} stroke={CHART.refLine} />
                          {spotLabel && (
                            <ReferenceLine
                              x={spotLabel}
                              stroke={CHART.series.amber}
                              strokeDasharray="4 4"
                              label={{ value: 'Spot', position: 'top', fill: CHART.series.amber, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                            />
                          )}
                          {flipLabel && flipLabel !== spotLabel && (
                            <ReferenceLine
                              x={flipLabel}
                              stroke={CHART.series.down}
                              strokeDasharray="3 3"
                              label={{ value: 'Flip', position: 'top', fill: CHART.series.down, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                            />
                          )}
                          {callWallLabel && callWallLabel !== flipLabel && (
                            <ReferenceLine
                              x={callWallLabel}
                              stroke={CHART.series.up}
                              strokeDasharray="2 4"
                              label={{ value: 'C-wall', position: 'top', fill: CHART.series.up, fontSize: 8, fontFamily: 'JetBrains Mono' }}
                            />
                          )}
                          {putWallLabel && putWallLabel !== flipLabel && (
                            <ReferenceLine
                              x={putWallLabel}
                              stroke={CHART.series.down}
                              strokeOpacity={0.7}
                              strokeDasharray="2 4"
                              label={{ value: 'P-wall', position: 'top', fill: CHART.series.down, fontSize: 8, fontFamily: 'JetBrains Mono' }}
                            />
                          )}
                          {metric === 'gex' ? (
                            <>
                              <Bar dataKey="call" fill={CHART.series.up} stackId="m" opacity={0.85} name="Call" isAnimationActive={false} />
                              <Bar dataKey="put" fill={CHART.series.down} stackId="m" opacity={0.85} name="Put" isAnimationActive={false} />
                            </>
                          ) : (
                            <Bar dataKey="net" fill={CHART.series.cyan} opacity={0.9} name="Net" isAnimationActive={false} />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Keyboard-focusable strike board (dealer-bars) */}
                  <div className="flex h-44 w-full shrink-0 flex-col border-t border-border lg:h-auto lg:min-h-0 lg:w-48 lg:border-l lg:border-t-0">
                    <div className="shrink-0 border-b border-border/60 px-1.5 py-0.5 font-mono text-type-2xs text-muted-foreground">
                      STRIKES · j/k · y copy
                    </div>
                    <div className="min-h-0 flex-1">
                      <VirtualRows
                        items={chartData}
                        rowHeight={22}
                        overscanCount={PERF_BUDGET.virtualOverscan}
                        height="100%"
                        className="h-full"
                        renderRow={({ index, style, item: r }) => {
                          const isFocused = dealerFocused && index === dealerRow;
                          return (
                            <div
                              style={style}
                              role="row"
                              aria-selected={isFocused}
                              onClick={() => focusDealer(index, 'strike')}
                              className={cn(
                                'flex cursor-default items-center justify-between gap-1 border-b border-border/30 px-1.5 font-mono text-type-2xs hover:bg-muted/20',
                                isFocused && 'focus-ring-term-inset bg-primary/10',
                              )}
                            >
                              <span className="tabular-nums text-foreground">{r.label}</span>
                              <span
                                className={cn(
                                  'tabular-nums',
                                  r.net >= 0 ? 'text-up' : 'text-down',
                                )}
                              >
                                {r.net.toFixed(1)}M
                              </span>
                            </div>
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="border-t border-border px-3 py-1 font-mono text-type-2xs text-muted-foreground leading-snug">
                  {METRICS.find((m) => m.id === metric)?.unit}. GEX: net+ ≈ dealers long γ (dampen); net− ≈ short γ (amplify).
                  DEX = signed $ delta inventory of listed OI. VEX = vanna flow. Charm = overnight delta bleed.
                  Not a free signal — assumes customer long OI / dealers short.
                </div>
              </div>
            )}
          </Panel>
          </SectionErrorBoundary>
        )}

        {sub === 'levels' && (
          <SectionErrorBoundary name="Levels">
          <div className="h-full overflow-y-auto p-2">
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              <Panel title={<Explain term="keyLevels">Dealer Levels</Explain>}>
                <div className="grid grid-cols-2 gap-3 p-3 font-mono">
                  <LevelStat label="Spot" value={snapshot ? fmtPrice(snapshot.spot) : '—'} />
                  <LevelStat
                    label="Gamma Flip"
                    term="gammaFlip"
                    value={dealer?.gammaFlip != null ? fmtPrice(dealer.gammaFlip, 0) : '—'}
                    color="text-foreground"
                  />
                  <LevelStat
                    label="Call Wall"
                    term="callWall"
                    value={dealer?.callWall != null ? fmtPrice(dealer.callWall, 0) : '—'}
                    color="text-up"
                  />
                  <LevelStat
                    label="Put Wall"
                    term="putWall"
                    value={dealer?.putWall != null ? fmtPrice(dealer.putWall, 0) : '—'}
                    color="text-down"
                  />
                  <LevelStat
                    label="Max Pain"
                    term="maxPain"
                    value={maxPain != null ? fmtPrice(maxPain, 0) : '—'}
                    color="text-foreground"
                  />
                  <LevelStat
                    label="Total GEX"
                    term="gex"
                    value={dealer ? fmtCompact(dealer.totalGEX) : '—'}
                    color={(dealer?.totalGEX ?? 0) >= 0 ? 'text-up' : 'text-down'}
                  />
                  <LevelStat
                    label="Σ DEX $"
                    term="dex"
                    value={dealer ? fmtCompact(dealer.totalDEX) : '—'}
                    color={(dealer?.totalDEX ?? 0) >= 0 ? 'text-up' : 'text-down'}
                  />
                  <LevelStat
                    label="Σ Charm/d"
                    term="charmExposure"
                    value={dealer ? fmtCompact(dealer.totalCharm) : '—'}
                  />
                  <LevelStat
                    label="Exp Move $"
                    term="expectedMove"
                    value={move ? `±${fmtPrice(move.move)}` : '—'}
                  />
                  <LevelStat
                    label="Exp Move %"
                    value={move ? fmtPct(move.movePct) : '—'}
                  />
                </div>
                <p className="border-t border-border px-3 py-2 text-type-2xs font-mono text-muted-foreground leading-snug">
                  Walls = largest call / put GEX strikes. Flip = cumulative net GEX zero-cross.
                  Max pain = strike minimising aggregate option payoff at front expiry.
                </p>
              </Panel>

              <Panel title="Open Interest by Expiry">
                <div className="h-64 p-2">
                  {oiByExpiry.length === 0 ? (
                    <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                      No chain data
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={oiByExpiry} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                        <CartesianGrid {...chartGridProps} />
                        <XAxis
                          dataKey="label"
                          tick={{ ...chartAxisTick, fontSize: 9 }}
                        />
                        <YAxis
                          tick={{ ...chartAxisTick, fontSize: 9 }}
                          width={40}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                        />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="callOI" stackId="oi" fill={CHART.series.up} name="Call OI" opacity={0.85} />
                        <Bar dataKey="putOI" stackId="oi" fill={CHART.series.down} name="Put OI" opacity={0.85} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>

              {snapshot && dealer && (
                <Panel title="Net GEX near spot (±8%)" className="lg:col-span-2">
                  <div className="h-56 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dealer.points
                          .filter((p) => Math.abs(p.strike / snapshot.spot - 1) <= 0.08)
                          .map((p) => ({
                            label: fmtPrice(p.strike, 0),
                            net: p.netGEX / 1e6,
                          }))}
                        margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
                      >
                        <CartesianGrid {...chartGridProps} />
                        <XAxis
                          dataKey="label"
                          tick={{ ...chartAxisTick, fontSize: 8 }}
                          interval={Math.max(0, Math.floor(dealer.points.length / 20))}
                        />
                        <YAxis
                          tick={{ ...chartAxisTick, fontSize: 9 }}
                          width={36}
                          tickFormatter={(v) => `${v.toFixed(0)}M`}
                        />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <ReferenceLine y={0} stroke={CHART.refLine} />
                        <ReferenceLine
                          x={fmtPrice(snapshot.spot, 0)}
                          stroke={CHART.series.amber}
                          strokeDasharray="3 3"
                        />
                        <Bar dataKey="net" fill={CHART.series.cyan} name="Net GEX $M" opacity={0.9} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              )}
            </div>
          </div>
          </SectionErrorBoundary>
        )}

        {sub === 'edge' && (
          <SectionErrorBoundary name="Edge">
          <Panel
            title={<Explain term="parityEdge">Put–Call Parity Edge</Explain>}
            subtitle="European residual · tradeable only if |res| > half-spreads"
            className="h-full"
          >
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap gap-4 border-b border-border px-3 py-2 font-mono text-type-xs">
                <span>
                  <span className="text-muted-foreground">Pairs scanned </span>
                  <span className="text-foreground">{parity.length}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Tradeable after costs </span>
                  <span className={tradeableParity.length ? 'text-warn' : 'text-up'}>
                    {tradeableParity.length}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  residual = (C−P) − (Se^{'-qT'} − Ke^{'-rT'}) · band ±6% · DTE≤120
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {parity.length === 0 ? (
                  <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                    No ATM pairs with mids — need live chain
                  </div>
                ) : (
                  <table className="w-full font-mono text-type-xs">
                    <thead className="sticky top-0 bg-card border-b border-border text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left">DTE</th>
                        <th className="px-2 py-1.5 text-right">Strike</th>
                        <th className="px-2 py-1.5 text-right">C mid</th>
                        <th className="px-2 py-1.5 text-right">P mid</th>
                        <th className="px-2 py-1.5 text-right">Residual</th>
                        <th className="px-2 py-1.5 text-right">vs Spot</th>
                        <th className="px-2 py-1.5 text-right">½ spr</th>
                        <th className="px-2 py-1.5 text-left">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parity.map((row) => (
                        <tr
                          key={`${row.expiry}-${row.strike}`}
                          className={cn(
                            'border-b border-border/50',
                            row.tradeable && 'bg-amber/5',
                          )}
                        >
                          <td className="px-2 py-1">{row.dte}d</td>
                          <td className="px-2 py-1 text-right tabular-nums">{fmtPrice(row.strike, 0)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{fmtPrice(row.callMid)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{fmtPrice(row.putMid)}</td>
                          <td className={cn(
                            'px-2 py-1 text-right tabular-nums',
                            row.residual >= 0 ? 'text-up' : 'text-down',
                          )}>
                            {fmtSigned(row.residual)}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                            {(row.residualPctSpot * 100).toFixed(3)}%
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                            {fmtPrice(row.halfSpread)}
                          </td>
                          <td className="px-2 py-1">
                            {row.tradeable ? (
                              <span className="text-warn">EDGE?</span>
                            ) : (
                              <span className="text-muted-foreground">noise</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="border-t border-border px-3 py-1.5 font-mono text-type-2xs text-muted-foreground leading-snug">
                Positive residual ⇒ synthetic stock (C−P) rich vs cash-and-carry. American early exercise,
                borrow, and dividends can explain residuals — do not auto-trade. Crypto: use carefully (often European on Deribit).
              </div>
            </div>
          </Panel>
          </SectionErrorBoundary>
        )}

        {sub === 'strategy' && (
          <SectionErrorBoundary name="Strategy">
            <div id="pos-sub-strategy" data-desk-section="1" className="flex h-full flex-col gap-2 p-1">
              <StrategyBuilderStrip />
              <p className="px-1 font-mono text-type-2xs text-muted-foreground">
                Same units as chain greeks (per contract). Source may differ from MacroVol Greeks 1.0 —
                use MM Desk for path sim / hedge tools.
              </p>
            </div>
          </SectionErrorBoundary>
        )}
      </div>
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span>
      <span className="text-muted-foreground">{label} </span>
      <span className="font-semibold tabular-nums" style={{ color: color ?? 'var(--foreground)' }}>{value}</span>
    </span>
  );
}

function LevelStat({
  label,
  value,
  color = 'text-foreground',
  term,
}: {
  label: string;
  value: string;
  color?: string;
  term?: string;
}) {
  return (
    <div>
      <div className="text-type-2xs uppercase tracking-wider text-muted-foreground">
        {term ? <Explain term={term}>{label}</Explain> : label}
      </div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
