/**
 * Home Desk — regime tape first, then the numbers pros check before trading.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { fmtPrice, fmtPct, fmtSigned, fmtSignedPct, fmtCompact } from '../../lib/format';
import {
  portfolioGreeks, impliedMove, dealerExposure, ivRank, maxPainStrike,
  realizedVolCloseToClose, volRiskPremium, scanParityEdges,
} from '../../lib/options/analytics';
import { Explain } from '../common/Explain';
import { macrovolApi, type RatesSummary, type StirStripData, type MacroSummary } from '../../lib/macrovol/api';
import type { ActiveTab } from '../../lib/options/types';

export function DashboardView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const historicalFrames = useTerminalStore(s => s.historicalFrames);
  const frameIndex = useTerminalStore(s => s.frameIndex);
  const sviReadout = useTerminalStore(s => s.sviReadout);
  const arbResult = useTerminalStore(s => s.arbResult);
  const fmpHistory = useTerminalStore(s => s.fmpHistory);
  const fmpQuote = useTerminalStore(s => s.fmpQuote);
  const symbol = useTerminalStore(s => s.symbol);
  const source = useTerminalStore(s => s.source);
  const chainUsed = useTerminalStore(s => s.chainUsed);
  const setActiveTab = useTerminalStore(s => s.setActiveTab);

  const [rates, setRates] = useState<RatesSummary | null>(null);
  const [stir, setStir] = useState<StirStripData | null>(null);
  const [macro, setMacro] = useState<MacroSummary | null>(null);
  const [macroHealth, setMacroHealth] = useState<'ok' | 'down' | 'pending'>('pending');

  useEffect(() => {
    let cancelled = false;
    setMacroHealth('pending');
    Promise.allSettled([
      macrovolApi.ratesSummary(),
      macrovolApi.stirStrip().catch(() => null),
      macrovolApi.macroSummary().catch(() => null),
    ]).then(([r, st, m]) => {
      if (cancelled) return;
      if (r.status === 'fulfilled') {
        setRates(r.value);
        setMacroHealth('ok');
      } else {
        setRates(null);
        setMacroHealth('down');
      }
      if (st.status === 'fulfilled' && st.value) setStir(st.value as StirStripData);
      if (m.status === 'fulfilled' && m.value) setMacro(m.value as MacroSummary);
    });
    return () => { cancelled = true; };
  }, []);

  const firstFrame = historicalFrames[0];
  const change = snapshot ? snapshot.spot - (firstFrame?.snapshot.spot ?? snapshot.spot) : 0;
  const changePct = firstFrame?.snapshot.spot ? change / firstFrame.snapshot.spot : 0;

  const ivData = useMemo(() => ivRank(historicalFrames, frameIndex), [historicalFrames, frameIndex]);
  const maxPain = useMemo(() => snapshot ? maxPainStrike(snapshot) : null, [snapshot]);
  const gex = useMemo(() => snapshot ? dealerExposure(snapshot) : null, [snapshot]);
  const portGreeks = useMemo(() => snapshot ? portfolioGreeks(snapshot) : null, [snapshot]);
  const move = useMemo(() => snapshot ? impliedMove(snapshot) : null, [snapshot]);
  const parityFlags = useMemo(
    () => (snapshot ? scanParityEdges(snapshot).filter((r) => r.tradeable).length : 0),
    [snapshot],
  );

  const frontExpiry = snapshot?.expiries[0];
  const backExpiry = snapshot?.expiries[snapshot.expiries.length - 1];
  const termSlope = frontExpiry && backExpiry ? backExpiry.atmIV - frontExpiry.atmIV : 0;
  const termLabel = termSlope > 0.01 ? 'CONTANGO' : termSlope < -0.01 ? 'BACKWARDATION' : 'FLAT TERM';

  const ivHighLow = useMemo(() => {
    if (historicalFrames.length > 0) {
      const atmIVs: number[] = [];
      for (const f of historicalFrames) {
        if (!f.snapshot.expiries.length) continue;
        let minDteExpiry = f.snapshot.expiries[0]!;
        for (const e of f.snapshot.expiries) {
          if (e.dte < minDteExpiry.dte) minDteExpiry = e;
        }
        if (Number.isFinite(minDteExpiry.atmIV)) atmIVs.push(minDteExpiry.atmIV);
      }
      if (atmIVs.length > 0) {
        return { ivHigh: Math.max(...atmIVs), ivLow: Math.min(...atmIVs) };
      }
    }
    if (snapshot && snapshot.expiries.length > 0) {
      let minDteExpiry = snapshot.expiries[0]!;
      for (const e of snapshot.expiries) {
        if (e.dte < minDteExpiry.dte) minDteExpiry = e;
      }
      if (Number.isFinite(minDteExpiry.atmIV)) {
        return { ivHigh: minDteExpiry.atmIV, ivLow: minDteExpiry.atmIV };
      }
    }
    return { ivHigh: 0, ivLow: 0 };
  }, [historicalFrames, snapshot]);

  const arbClean = (arbResult?.calendar.violations ?? 0) === 0 && (arbResult?.butterfly.violations ?? 0) === 0;
  const calendarCount = arbResult?.calendar.violations ?? 0;
  const butterflyCount = arbResult?.butterfly.violations ?? 0;
  const sviRmse = sviReadout?.rmse ?? 0;
  const sviSamples = sviReadout?.samples ?? 0;

  const pcSkew = useMemo(() => {
    if (!snapshot?.expiries[0]) return 0;
    const front30 = snapshot.expiries.reduce((best, e) =>
      Math.abs(e.dte - 30) < Math.abs(best.dte - 30) ? e : best
    , snapshot.expiries[0]);
    const hasDeltaC = front30.calls.filter(q => q.delta != null);
    const hasDeltaP = front30.puts.filter(q => q.delta != null);
    if (!hasDeltaC.length || !hasDeltaP.length) return 0;
    const call25 = hasDeltaC.reduce((best, q) =>
      Math.abs(q.delta! - 0.25) < Math.abs(best.delta! - 0.25) ? q : best
    , hasDeltaC[0]!);
    const put25 = hasDeltaP.reduce((best, q) =>
      Math.abs(q.delta! + 0.25) < Math.abs(best.delta! + 0.25) ? q : best
    , hasDeltaP[0]!);
    return (put25.iv ?? 0) - (call25.iv ?? 0);
  }, [snapshot]);

  const largestPos = gex?.points?.length ? [...gex.points].sort((a, b) => b.netGEX - a.netGEX)[0] : null;
  const largestNeg = gex?.points?.length ? [...gex.points].sort((a, b) => a.netGEX - b.netGEX)[0] : null;

  const expiryOI = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.expiries.map(e => ({
      label: `${e.dte}d`,
      oi: e.calls.reduce((s, q) => s + q.openInterest, 0) + e.puts.reduce((s, q) => s + q.openInterest, 0),
    }));
  }, [snapshot]);

  const quotePath = useMemo(() => {
    if (fmpHistory && fmpHistory.length > 0) {
      return fmpHistory.slice(-60).map(b => ({ t: b.date.slice(5), close: b.close }));
    }
    return [];
  }, [fmpHistory]);

  const rv = useMemo(() => {
    if (!fmpHistory?.length) return null;
    return realizedVolCloseToClose(fmpHistory.map((b) => b.close));
  }, [fmpHistory]);
  const vrp = useMemo(
    () => volRiskPremium(frontExpiry?.atmIV, rv),
    [frontExpiry?.atmIV, rv],
  );

  const go = (tab: ActiveTab, sectionId?: string) => {
    if (sectionId) {
      try {
        sessionStorage.setItem('desk.jump', sectionId);
      } catch {
        /* ignore */
      }
    }
    setActiveTab(tab);
  };

  const volRegime = frontExpiry?.atmIV ?? 0;
  const dayChg = fmpQuote?.change ?? change;
  const dayChgPct = fmpQuote?.changePercentage != null
    ? fmpQuote.changePercentage / 100
    : changePct;

  const gexSign = (gex?.totalGEX ?? 0) >= 0 ? 'GEX+' : 'GEX−';
  const ivrLabel = ivData.percentile >= 70 ? 'IV RICH' : ivData.percentile <= 30 ? 'IV CHEAP' : 'IV MID';
  const cuts = stir?.path?.approx_25bp_cuts_priced;
  const qualityLabel = arbClean ? 'FIT CLEAN' : 'FIT FLAGS';

  const actionChips = useMemo(() => {
    const chips: { label: string; tab: ActiveTab; section?: string; tone: 'up' | 'down' | 'amber' | 'neutral' }[] = [];
    if (ivData.percentile >= 70) chips.push({ label: 'IV rich vs history → Vol', tab: 'vol', tone: 'down' });
    if (ivData.percentile <= 30) chips.push({ label: 'IV cheap vs history → Vol', tab: 'vol', tone: 'up' });
    if (termSlope < -0.015) chips.push({ label: 'Backwardation stress → Term', tab: 'vol', tone: 'amber' });
    if ((gex?.totalGEX ?? 0) < 0) chips.push({ label: 'Short-γ zone → Positioning', tab: 'positioning', tone: 'down' });
    if ((gex?.totalGEX ?? 0) > 0) chips.push({ label: 'Long-γ dampen → Levels', tab: 'positioning', tone: 'up' });
    if (pcSkew > 0.03) chips.push({ label: 'Put skew steep → Smile', tab: 'vol', tone: 'amber' });
    if (vrp != null && vrp > 0.04) chips.push({ label: 'VRP rich (IV≫RV) → MM Desk', tab: 'desk', tone: 'down' });
    if (vrp != null && vrp < -0.02) chips.push({ label: 'IV cheap vs RV → Desk', tab: 'desk', tone: 'up' });
    if (!arbClean) chips.push({ label: 'Surface quality flags → Quality', tab: 'vol', tone: 'amber' });
    if (parityFlags > 0) chips.push({ label: `${parityFlags} parity edge? → Edge`, tab: 'positioning', tone: 'amber' });
    if (cuts != null && cuts > 1) {
      chips.push({ label: `${cuts.toFixed(1)}× cuts priced → STIR`, tab: 'rates', section: 'sec-stir', tone: 'up' });
    }
    if (rates?.spread_2s10s != null && rates.spread_2s10s < 0) {
      chips.push({ label: '2s10s inverted → Curve', tab: 'rates', section: 'sec-shape', tone: 'down' });
    }
    if (chips.length === 0) chips.push({ label: 'Quiet tape — scan chain', tab: 'positioning', tone: 'neutral' });
    return chips.slice(0, 6);
  }, [ivData.percentile, termSlope, gex?.totalGEX, pcSkew, vrp, arbClean, parityFlags, cuts, rates?.spread_2s10s]);

  if (!snapshot) {
    return (
      <div className="flex h-full flex-col gap-2 overflow-y-auto p-2">
        <FeedHealth
          source={source}
          chainUsed={chainUsed}
          macroHealth={macroHealth}
          hasQuote={!!fmpQuote}
          hasHistory={(fmpHistory?.length ?? 0) > 0}
        />
        <RatesStrip rates={rates} stir={stir} onOpen={() => go('rates')} />
        <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground">
          Loading surface… rates strip still live when MacroVol is up.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-1">
      {/* Regime banner — single glance */}
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-[11px]">
        <span className="font-bold tracking-wider text-primary">{symbol}</span>
        <span className="text-foreground font-semibold tabular-nums">{fmtPrice(snapshot.spot)}</span>
        <span className={dayChg >= 0 ? 'text-up' : 'text-down'}>{fmtSignedPct(dayChgPct)}</span>
        <Sep />
        <span className="text-cyan font-semibold">{termLabel}</span>
        <Sep />
        <span className={ivData.percentile >= 70 ? 'text-down' : ivData.percentile <= 30 ? 'text-up' : 'text-foreground'}>
          {ivrLabel} {ivData.percentile.toFixed(0)}%
        </span>
        <Sep />
        <span className={(gex?.totalGEX ?? 0) >= 0 ? 'text-up' : 'text-down'}>{gexSign}</span>
        <span className="text-muted-foreground">
          flip {gex?.gammaFlip != null ? fmtPrice(gex.gammaFlip, 0) : '—'}
        </span>
        <Sep />
        {cuts != null && (
          <>
            <span className="text-amber">
              STIR {cuts >= 0 ? `${cuts.toFixed(1)}× cuts` : `${Math.abs(cuts).toFixed(1)}× hikes`}
            </span>
            <Sep />
          </>
        )}
        <span className={arbClean ? 'text-up' : 'text-down'}>{qualityLabel}</span>
        {vrp != null && (
          <>
            <Sep />
            <span className={vrp >= 0 ? 'text-muted-foreground' : 'text-up'}>
              VRP {(vrp * 100).toFixed(1)}pt
            </span>
          </>
        )}
      </div>

      <FeedHealth
        source={source}
        chainUsed={chainUsed}
        macroHealth={macroHealth}
        hasQuote={!!fmpQuote}
        hasHistory={(fmpHistory?.length ?? 0) > 0}
      />

      <RatesStrip rates={rates} stir={stir} macro={macro} onOpen={() => go('rates')} />

      {/* Action chips */}
      <div className="mb-2 flex flex-wrap gap-1 px-1">
        {actionChips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => go(c.tab, c.section)}
            className={`rounded border px-2 py-0.5 font-mono text-[10px] transition-colors hover:border-primary ${
              c.tone === 'up' ? 'border-up/40 text-up'
                : c.tone === 'down' ? 'border-down/40 text-down'
                  : c.tone === 'amber' ? 'border-amber/40 text-amber'
                    : 'border-border text-muted-foreground'
            }`}
          >
            {c.label}
          </button>
        ))}
        <span className="ml-auto hidden font-mono text-[9px] text-muted-foreground sm:inline">
          Deep-link chips · not trade advice
        </span>
      </div>

      {/* Quick nav */}
      <div className="mb-2 flex flex-wrap gap-1 px-1">
        {([
          ['vol', 'Vol Structure'],
          ['positioning', 'Positioning'],
          ['greeks', 'Greeks 1.0'],
          ['desk', 'MM Desk'],
          ['crypto', 'Crypto'],
          ['rates', 'Macros & Rates'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => go(id)}
            className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
          >
            {label} →
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <Panel title={<Explain term="spot">Spot &amp; Session</Explain>}>
          <div className="p-3">
            <div className="font-mono text-2xl font-bold tabular-nums">{fmtPrice(snapshot.spot)}</div>
            <div className={`mt-1 font-mono text-sm tabular-nums ${dayChg >= 0 ? 'text-up' : 'text-down'}`}>
              {fmtSigned(dayChg)} ({fmtSignedPct(dayChgPct)})
            </div>
            {quotePath.length > 1 ? (
              <div className="mt-2 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={quotePath} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="homeQuoteFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="close" stroke="var(--primary)" fill="url(#homeQuoteFill)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-3 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, Math.max(5, ((snapshot.spot - snapshot.spot * 0.9) / (snapshot.spot * 0.2)) * 100))}%` }}
                />
              </div>
            )}
            <div className="mt-1 text-[9px] font-mono text-muted-foreground">
              {quotePath.length > 1 ? '60d close path' : 'Enable LIVE for price history'}
            </div>
          </div>
        </Panel>

        <Panel title={<Explain term="volRegime">Volatility Regime</Explain>}>
          <div className="grid grid-cols-2 gap-3 p-3">
            <MiniStat label="ATM IV front" term="atmIV" value={fmtPct(volRegime)} color="text-primary" />
            <MiniStat label="IV Rank" term="ivRank" value={`${(ivData.percentile).toFixed(0)}%`} />
            <MiniStat label="IV High" value={fmtPct(ivHighLow.ivHigh)} color="text-up" />
            <MiniStat label="IV Low" value={fmtPct(ivHighLow.ivLow)} color="text-down" />
            <MiniStat label="Term Slope" term="termStructure" value={fmtSignedPct(termSlope, 1)} color={termSlope >= 0 ? 'text-up' : 'text-down'} />
            <MiniStat label="25Δ RR" term="skew" value={`${(pcSkew * 100).toFixed(2)}%`} color={pcSkew >= 0 ? 'text-down' : 'text-up'} />
            <MiniStat label="RV (hist)" value={rv != null ? fmtPct(rv) : '—'} />
            <MiniStat
              label="VRP IV−RV"
              value={vrp != null ? `${(vrp * 100).toFixed(1)}pt` : '—'}
              color={vrp != null && vrp < 0 ? 'text-up' : 'text-muted-foreground'}
            />
          </div>
          <button
            type="button"
            onClick={() => go('vol')}
            className="w-full border-t border-border px-3 py-1.5 text-left font-mono text-[9px] text-primary hover:bg-muted/40"
          >
            Open Vol Structure (surface · smile · term · quality) →
          </button>
        </Panel>

        <Panel title={<Explain term="keyLevels">Key Levels</Explain>}>
          <div className="grid grid-cols-2 gap-3 p-3">
            <MiniStat label="Max Pain" term="maxPain" value={maxPain ? fmtPrice(maxPain, 0) : '—'} color="text-primary" />
            <MiniStat label="Gamma Flip" term="gammaFlip" value={gex?.gammaFlip ? fmtPrice(gex.gammaFlip, 0) : '—'} color="text-amber" />
            <MiniStat label="Call Wall" term="callWall" value={largestPos ? fmtPrice(largestPos.strike, 0) : '—'} color="text-up" />
            <MiniStat label="Put Wall" term="putWall" value={largestNeg ? fmtPrice(largestNeg.strike, 0) : '—'} color="text-down" />
            <MiniStat label="Total GEX" term="gex" value={fmtCompact(gex?.totalGEX ?? 0)} color={gex && gex.totalGEX >= 0 ? 'text-up' : 'text-down'} />
            <MiniStat label="Σ DEX $" term="dex" value={gex ? fmtCompact(gex.totalDEX) : '—'} />
          </div>
          <button
            type="button"
            onClick={() => go('positioning')}
            className="w-full border-t border-border px-3 py-1.5 text-left font-mono text-[9px] text-primary hover:bg-muted/40"
          >
            Open Positioning (chain · dealer · edge) →
          </button>
        </Panel>

        <Panel title={<Explain term="portfolioRisk">Chain Inventory Σ</Explain>}>
          <div className="grid grid-cols-2 gap-3 p-3">
            <MiniStat label="Σ Delta" term="netDelta" value={portGreeks?.delta.toFixed(2) ?? '—'} color={portGreeks && portGreeks.delta >= 0 ? 'text-up' : 'text-down'} />
            <MiniStat label="Σ Gamma" term="netGamma" value={portGreeks?.gamma.toFixed(4) ?? '—'} color="text-up" />
            <MiniStat label="Σ Vega" term="netVega" value={portGreeks?.vega.toFixed(2) ?? '—'} color="text-amber" />
            <MiniStat label="Σ Theta" term="netTheta" value={portGreeks?.theta.toFixed(2) ?? '—'} color={portGreeks && portGreeks.theta >= 0 ? 'text-up' : 'text-down'} />
          </div>
          <div className="px-3 pb-2 text-[9px] font-mono text-muted-foreground">
            Sum of listed contract greeks — not a position book. Use MM Desk for book risk.
          </div>
        </Panel>

        <Panel title={<Explain term="expectedMove">Expected Move</Explain>}>
          <div className="p-3">
            {move ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Dollar Move</div>
                  <div className="font-mono text-xl font-bold tabular-nums text-primary">±{fmtPrice(move.move)}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="% Move" term="expectedMove" value={fmtPct(move.movePct)} color="text-primary" />
                  <MiniStat label="Prob Touch" term="probTouch" value={fmtPct(move.probTouch)} color="text-cyan" />
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">Front ATM straddle (0.8× convention)</div>
              </div>
            ) : (
              <div className="font-mono text-sm text-muted-foreground">No data</div>
            )}
          </div>
        </Panel>

        <Panel title={<Explain term="surface">Surface Quality</Explain>}>
          <div className="space-y-3 p-3" data-testid="diagnostics-card">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                <Explain term="sviRmse">SVI RMSE</Explain>
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-primary" data-testid="svi-rmse">
                {fmtPct(sviRmse)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">SVI Samples</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {String(sviSamples)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                <Explain term="arbitrage">Calendar / Butterfly</Explain>
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                  arbClean ? 'bg-up/15 text-up' : 'bg-down/15 text-down'
                }`}
                data-testid="arb-badge"
                data-arb-clean={arbClean ? 'true' : 'false'}
              >
                {arbClean ? 'Clean' : 'Flags'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <MiniStat label="Calendar" term="calendarArb" value={String(calendarCount)} color={calendarCount === 0 ? 'text-up' : 'text-down'} />
              <MiniStat label="Butterfly" term="butterflyArb" value={String(butterflyCount)} color={butterflyCount === 0 ? 'text-up' : 'text-down'} />
            </div>
            {parityFlags > 0 && (
              <div className="text-[10px] font-mono text-amber">
                {parityFlags} parity residual(s) past half-spread → Positioning Edge
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => go('vol')}
            className="w-full border-t border-border px-3 py-1.5 text-left font-mono text-[9px] text-primary hover:bg-muted/40"
          >
            Inspect quality map under Vol Structure → Quality
          </button>
        </Panel>

        <Panel title="Open Interest by Expiry" className="lg:col-span-2">
          <div className="h-48 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expiryOI} margin={{ top: 4, right: 8, bottom: 18, left: 0 }}>
                <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} stroke="var(--border)" />
                <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} stroke="var(--border)" width={40} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded border border-border bg-popover/95 p-2 font-mono text-[10px] shadow backdrop-blur">
                        <div className="mb-1 font-semibold text-foreground">{label}</div>
                        <div className="text-foreground">OI: {(payload[0]!.value as number).toLocaleString()}</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="oi" fill="var(--primary)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Quant notes">
          <ul className="space-y-1.5 p-3 font-mono text-[10px] text-muted-foreground leading-snug">
            <li>· <span className="text-foreground">Home</span> = regime tape + chips before trading.</li>
            <li>· <span className="text-foreground">Dealer stack</span> = GEX/DEX/VEX/Charm under Positioning.</li>
            <li>· <span className="text-foreground">Parity edge</span> = residual vs costs, not free lunch.</li>
            <li>· <span className="text-foreground">VRP</span> needs LIVE price history (close-to-close RV).</li>
            <li>· <span className="text-foreground">Greeks 1.0</span> preferred (live SOFR r) over raw 3D mesh.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Sep() {
  return <span className="text-border">·</span>;
}

function FeedHealth({
  source,
  chainUsed,
  macroHealth,
  hasQuote,
  hasHistory,
}: {
  source: string;
  chainUsed: string;
  macroHealth: 'ok' | 'down' | 'pending';
  hasQuote: boolean;
  hasHistory: boolean;
}) {
  const pill = (label: string, ok: boolean | 'pending') => (
    <span
      className={`rounded px-1.5 py-0.5 text-[9px] font-mono border ${
        ok === 'pending'
          ? 'border-border text-muted-foreground'
          : ok
            ? 'border-up/40 text-up'
            : 'border-down/40 text-down'
      }`}
    >
      {label}
    </span>
  );
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
      <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">Feeds</span>
      {pill(source === 'live' ? `CHAIN ${chainUsed || 'live'}` : 'DEMO SURFACE', source === 'live')}
      {pill('QUOTE', hasQuote)}
      {pill('HIST', hasHistory)}
      {pill(
        macroHealth === 'ok' ? 'MACROVOL' : macroHealth === 'pending' ? 'MACRO…' : 'MACRO DOWN',
        macroHealth === 'pending' ? 'pending' : macroHealth === 'ok',
      )}
    </div>
  );
}

function RatesStrip({
  rates,
  stir,
  macro,
  onOpen,
}: {
  rates: RatesSummary | null;
  stir?: StirStripData | null;
  macro?: MacroSummary | null;
  onOpen: () => void;
}) {
  const cuts = stir?.path?.approx_25bp_cuts_priced;
  const items = rates ? [
    { label: 'SOFR', value: rates.sofr != null ? `${rates.sofr.toFixed(2)}%` : '—' },
    { label: 'EFFR', value: rates.effr != null ? `${rates.effr.toFixed(2)}%` : '—' },
    { label: '2Y', value: rates.usy2 != null ? `${rates.usy2.toFixed(2)}%` : '—' },
    { label: '10Y', value: rates.usy10 != null ? `${rates.usy10.toFixed(2)}%` : '—' },
    {
      label: '2s10s',
      value: rates.spread_2s10s != null ? `${(rates.spread_2s10s * 100).toFixed(0)}bp` : '—',
      alert: rates.spread_2s10s != null && rates.spread_2s10s < 0,
    },
    {
      label: 'STIR',
      value: cuts != null
        ? (cuts >= 0 ? `${cuts.toFixed(1)}× cut` : `${Math.abs(cuts).toFixed(1)}× hike`)
        : '—',
    },
    {
      label: 'CPI',
      value: macro?.cpi_yoy != null ? `${macro.cpi_yoy.toFixed(1)}%` : '—',
    },
    {
      label: 'r',
      value: rates.risk_free_rate != null ? `${(rates.risk_free_rate * 100).toFixed(2)}%` : '—',
    },
  ] : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-2 flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded border border-border bg-card/60 px-3 py-1.5 text-left hover:border-primary/50"
    >
      <span className="font-mono text-[10px] font-bold tracking-wider text-primary">RATES · MACRO</span>
      {items ? items.map((it) => (
        <span key={it.label} className="font-mono text-[10px]">
          <span className="text-muted-foreground">{it.label} </span>
          <span className={it.alert ? 'font-bold text-red-400' : 'font-semibold text-foreground'}>{it.value}</span>
        </span>
      )) : (
        <span className="font-mono text-[10px] text-muted-foreground">MacroVol offline — start :8765 for SOFR strip</span>
      )}
      <span className="ml-auto font-mono text-[9px] text-primary">Rates desk →</span>
    </button>
  );
}

function MiniStat({ label, value, color = 'text-foreground', term }: { label: string; value: string; color?: string; term?: string }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
        {term ? <Explain term={term}>{label}</Explain> : label}
      </div>
      <div className={`font-mono text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
