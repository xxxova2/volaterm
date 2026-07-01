import { useMemo } from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { fmtPrice, fmtPct, fmtSigned, fmtSignedPct, fmtCompact } from '../../lib/format';
import { portfolioGreeks, impliedMove, gammaExposure, ivRank, maxPainStrike } from '../../lib/options/analytics';

export function DashboardView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const historicalFrames = useTerminalStore(s => s.historicalFrames);
  const frameIndex = useTerminalStore(s => s.frameIndex);
  const sviReadout = useTerminalStore(s => s.sviReadout);
  const arbResult = useTerminalStore(s => s.arbResult);

  const firstFrame = historicalFrames[0];
  const change = snapshot ? snapshot.spot - (firstFrame?.snapshot.spot ?? snapshot.spot) : 0;
  const changePct = firstFrame?.snapshot.spot ? change / firstFrame.snapshot.spot : 0;

  const ivData = useMemo(() => ivRank(historicalFrames, frameIndex), [historicalFrames, frameIndex]);
  const maxPain = useMemo(() => snapshot ? maxPainStrike(snapshot) : null, [snapshot]);
  const gex = useMemo(() => snapshot ? gammaExposure(snapshot) : null, [snapshot]);
  const portGreeks = useMemo(() => snapshot ? portfolioGreeks(snapshot) : null, [snapshot]);
  const move = useMemo(() => snapshot ? impliedMove(snapshot) : null, [snapshot]);

  const frontExpiry = snapshot?.expiries[0];
  const backExpiry = snapshot?.expiries[snapshot.expiries.length - 1];
  const termSlope = frontExpiry && backExpiry ? backExpiry.atmIV - frontExpiry.atmIV : 0;

  const ivHighLow = useMemo(() => {
    if (historicalFrames.length > 0) {
      const atmIVs: number[] = [];
      for (const f of historicalFrames) {
        if (!f.snapshot.expiries.length) continue;
        let minDteExpiry = f.snapshot.expiries[0]!;
        for (const e of f.snapshot.expiries) {
          if (e.dte < minDteExpiry.dte) minDteExpiry = e;
        }
        if (Number.isFinite(minDteExpiry.atmIV)) {
          atmIVs.push(minDteExpiry.atmIV);
        }
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
    if (!snapshot) return 0;
    if (!snapshot.expiries[0]) return 0;
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

  if (!snapshot) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-mono">No data</div>;
  }

  const volRegime = frontExpiry?.atmIV ?? 0;

  return (
    <div className="h-full overflow-y-auto p-1">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <Panel title="Spot & Change">
          <div className="p-3">
            <div className="font-mono text-2xl font-bold tabular-nums">{fmtPrice(snapshot.spot)}</div>
            <div className={`mt-1 font-mono text-sm tabular-nums ${change >= 0 ? 'text-up' : 'text-down'}`}>
              {fmtSigned(change)} ({fmtSignedPct(changePct)})
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(5, ((snapshot.spot - snapshot.spot * 0.9) / (snapshot.spot * 0.2)) * 100))}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[9px] font-mono text-muted-foreground">
              <span>{fmtPrice(snapshot.spot * 0.9, 0)}</span>
              <span>range</span>
              <span>{fmtPrice(snapshot.spot * 1.1, 0)}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Volatility Regime">
          <div className="grid grid-cols-2 gap-3 p-3">
            <MiniStat label="ATM IV 30d" value={fmtPct(volRegime)} color="text-primary" />
            <MiniStat label="IV Rank" value={`${(ivData.percentile * 100).toFixed(0)}%`} />
            <MiniStat label="IV High" value={fmtPct(ivHighLow.ivHigh)} color="text-up" />
            <MiniStat label="IV Low" value={fmtPct(ivHighLow.ivLow)} color="text-down" />
            <MiniStat label="Term Slope" value={fmtSignedPct(termSlope, 1)} color={termSlope >= 0 ? 'text-up' : 'text-down'} />
            <MiniStat label="Put/Call Skew" value={`${(pcSkew * 100).toFixed(2)}%`} color={pcSkew >= 0 ? 'text-down' : 'text-up'} />
          </div>
        </Panel>

        <Panel title="Key Levels">
          <div className="grid grid-cols-2 gap-3 p-3">
            <MiniStat label="Max Pain" value={maxPain ? fmtPrice(maxPain, 0) : '—'} color="text-primary" />
            <MiniStat label="Gamma Flip" value={gex?.gammaFlip ? fmtPrice(gex.gammaFlip, 0) : '—'} color="text-amber" />
            <MiniStat label="Call Wall" value={largestPos ? fmtPrice(largestPos.strike, 0) : '—'} color="text-up" />
            <MiniStat label="Put Wall" value={largestNeg ? fmtPrice(largestNeg.strike, 0) : '—'} color="text-down" />
            <MiniStat label="Total GEX" value={fmtCompact(gex?.totalGEX ?? 0)} color={gex && gex.totalGEX >= 0 ? 'text-up' : 'text-down'} />
            <MiniStat label="Expiries" value={String(snapshot.expiries.length)} />
          </div>
        </Panel>

        <Panel title="Portfolio Risk">
          <div className="grid grid-cols-2 gap-3 p-3">
            <MiniStat label="Net Delta" value={portGreeks?.delta.toFixed(2) ?? '—'} color={portGreeks && portGreeks.delta >= 0 ? 'text-up' : 'text-down'} />
            <MiniStat label="Net Gamma" value={portGreeks?.gamma.toFixed(4) ?? '—'} color="text-up" />
            <MiniStat label="Net Vega" value={portGreeks?.vega.toFixed(2) ?? '—'} color="text-amber" />
            <MiniStat label="Net Theta" value={portGreeks?.theta.toFixed(2) ?? '—'} color={portGreeks && portGreeks.theta >= 0 ? 'text-up' : 'text-down'} />
          </div>
        </Panel>

        <Panel title="Expected Move">
          <div className="p-3">
            {move ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Dollar Move</div>
                  <div className="font-mono text-xl font-bold tabular-nums text-primary">±{fmtPrice(move.move)}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="% Move" value={fmtPct(move.movePct)} color="text-primary" />
                  <MiniStat label="Prob Touch" value={fmtPct(move.probTouch)} color="text-cyan" />
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">Based on front ATM straddle (0.8×)</div>
              </div>
            ) : (
              <div className="text-muted-foreground font-mono text-sm">No data</div>
            )}
          </div>
        </Panel>

        <Panel title="SVI & Arbitrage">
          <div className="space-y-3 p-3" data-testid="diagnostics-card">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">SVI RMSE</span>
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
              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Status</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                  arbClean ? 'bg-up/15 text-up' : 'bg-down/15 text-down'
                }`}
                data-testid="arb-badge"
                data-arb-clean={arbClean ? 'true' : 'false'}
              >
                {arbClean ? 'No Arb' : 'Arb Found'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <MiniStat
                label="Calendar"
                value={String(calendarCount)}
                color={calendarCount === 0 ? 'text-up' : 'text-down'}
              />
              <MiniStat
                label="Butterfly"
                value={String(butterflyCount)}
                color={butterflyCount === 0 ? 'text-up' : 'text-down'}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Open Interest by Expiry">
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
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = 'text-foreground' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
