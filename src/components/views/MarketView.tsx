import { useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, Bar,
} from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { fmtPrice, fmtCompact, fmtSignedPct } from '../../lib/format';
import { computeIndicators } from '../../lib/market/indicators';
import { cn } from '../../lib/utils';
import { Explain } from '../common/Explain';

function SourceChip({ label, ok, source }: { label: string; ok: boolean; source: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
      <span
        className={cn('w-1.5 h-1.5 rounded-full', ok ? 'bg-emerald-400' : 'bg-amber')}
        aria-hidden="true"
      />
      {label}: <span className="text-foreground">{source}</span>
    </span>
  );
}

export function MarketView() {
  const {
    symbol, source, fmpHistory, fmpProfile, fmpNews, fmpEarnings,
    chainAvailable, spotSource, chainUsed, chainMode, setChainMode,
    historySource, profileSource,
  } = useTerminalStore();

  const chartData = useMemo(() => {
    if (!fmpHistory || fmpHistory.length === 0) return [];
    const prices = fmpHistory.map((b) => ({ date: b.date, close: b.close }));
    const ind = computeIndicators(prices);
    const sliced = fmpHistory.slice(-250);
    const offset = fmpHistory.length - sliced.length;
    return sliced.map((b, i) => ({
      date: b.date,
      close: b.close,
      volume: b.volume,
      sma20: ind.sma20[offset + i] ?? NaN,
      sma50: ind.sma50[offset + i] ?? NaN,
      bbUpper: ind.bollinger.upper[offset + i] ?? NaN,
      bbLower: ind.bollinger.lower[offset + i] ?? NaN,
      label: b.date.slice(5),
    }));
  }, [fmpHistory]);

  const earningsDate = fmpEarnings && fmpEarnings.length > 0 ? fmpEarnings[0]!.date : undefined;
  const earningsInRange = earningsDate && chartData.some((d) => d.date === earningsDate);

  if (source !== 'live') {
    return (
      <Panel title="Quote" subtitle="Price · Profile · News" className="h-full">
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">
          Switch to LIVE (press L) to load price history, fundamentals and news.
        </div>
      </Panel>
    );
  }

  if (!fmpHistory || fmpHistory.length === 0) {
    return (
      <Panel title="Quote" subtitle="Price · Profile · News" className="h-full">
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">
          No FMP data — set FMP_API_KEY on the server (or a paid plan is required).
        </div>
      </Panel>
    );
  }

  const last = chartData[chartData.length - 1]!;
  const first = chartData[0]!;
  const periodChange = last.close - first.close;
  const periodPct = periodChange / first.close;

  return (
    <Panel
      title="Quote"
      subtitle={`${symbol} · ${chartData.length}d`}
      className="h-full"
      actions={
        <div className="flex items-center gap-1">
          <SourceChip
            label="Spot"
            ok={spotSource !== 'synthetic'}
            source={
              spotSource === 'fmp' ? 'FMP'
                : spotSource === 'yfinance' ? 'yfinance'
                  : spotSource === 'deribit' ? 'Deribit'
                    : 'Synthetic'
            }
          />
          <SourceChip
            label="Chain"
            ok={chainAvailable}
            source={
              chainAvailable
                ? (chainMode === 'auto' ? `auto→${chainUsed}` : chainUsed)
                : 'Synthetic'
            }
          />
          <SourceChip label="Hist" ok={historySource !== 'none'} source={historySource === 'none' ? 'None' : historySource === 'fmp' ? 'FMP' : 'yfinance'} />
          <SourceChip label="Fund" ok={profileSource !== 'none'} source={profileSource === 'none' ? 'None' : profileSource === 'fmp' ? 'FMP' : 'yfinance'} />
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border h-full overflow-hidden">
        {/* Price + volume chart */}
        <div className="lg:col-span-2 flex flex-col bg-background overflow-hidden">
          <div className="flex items-baseline gap-3 px-3 py-2 border-b border-border">
            <span className="text-lg font-bold font-mono tabular-nums">{fmtPrice(last.close)}</span>
            <span className={cn('text-xs font-mono tabular-nums', periodChange >= 0 ? 'text-up' : 'text-down')}>
              {fmtSignedPct(periodPct)} ({fmtSignedPct(periodChange, 2)})
            </span>
            <div className="ml-auto flex items-center gap-1 text-[10px] font-mono">
              <button
                onClick={() => setChainMode('auto')}
                className={cn('px-1.5 py-0.5 rounded', chainMode === 'auto' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
              >
                Auto
              </button>
              <button
                onClick={() => setChainMode('fmp')}
                className={cn('px-1.5 py-0.5 rounded', chainMode === 'fmp' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
              >
                FMP
              </button>
              <button
                onClick={() => setChainMode('yfinance')}
                className={cn('px-1.5 py-0.5 rounded', chainMode === 'yfinance' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
              >
                yfinance
              </button>
              <button
                onClick={() => setChainMode('deribit')}
                className={cn('px-1.5 py-0.5 rounded', chainMode === 'deribit' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
                title="BTC/ETH Deribit public chain"
              >
                Deribit
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  interval={Math.max(1, Math.floor(chartData.length / 12))}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v: number) => fmtPrice(v, 0)}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Area dataKey="close" stroke="var(--primary)" strokeWidth={1.5} fill="url(#priceFill)" connectNulls dot={false} isAnimationActive={false} />
                <Line dataKey="sma20" stroke="var(--cyan)" strokeWidth={1} dot={false} connectNulls={false} isAnimationActive={false} />
                <Line dataKey="sma50" stroke="var(--violet)" strokeWidth={1} dot={false} connectNulls={false} isAnimationActive={false} />
                <Line dataKey="bbUpper" stroke="var(--muted-foreground)" strokeWidth={0.5} strokeDasharray="3 3" dot={false} connectNulls={false} isAnimationActive={false} />
                <Line dataKey="bbLower" stroke="var(--muted-foreground)" strokeWidth={0.5} strokeDasharray="3 3" dot={false} connectNulls={false} isAnimationActive={false} />
                {earningsInRange && (
                  <ReferenceLine x={earningsDate!.slice(5)} stroke="var(--amber)" strokeDasharray="2 2" label={{ value: 'EPS', position: 'top', fill: 'var(--amber)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="h-20 border-t border-border">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                <XAxis dataKey="label" hide />
                <YAxis tick={{ fontSize: 8, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} tickLine={false} width={52} tickFormatter={(v: number) => fmtCompact(v)} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Bar dataKey="volume" fill="var(--muted-foreground)" opacity={0.5} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="px-3 py-1 text-[10px] text-muted-foreground font-mono border-t border-border flex gap-3">
            <span><span className="text-primary">━</span> Close</span>
            <span><span className="text-cyan">━</span> <Explain term="sma20">SMA20</Explain></span>
            <span><span className="text-violet">━</span> <Explain term="sma50">SMA50</Explain></span>
            <span><span className="text-muted-foreground">┄</span> <Explain term="bollinger">Bollinger(20,2)</Explain></span>
          </div>
        </div>

        {/* Profile + news */}
        <div className="flex flex-col bg-background overflow-hidden">
          <div className="border-b border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Profile</div>
            {fmpProfile ? (
              <div className="space-y-1 text-[11px] font-mono">
                <div className="font-semibold text-foreground">{fmpProfile.companyName ?? symbol}</div>
                {fmpProfile.sector && (
                  <div className="text-muted-foreground">
                    {fmpProfile.sector}{fmpProfile.industry ? ` · ${fmpProfile.industry}` : ''}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <span className="text-muted-foreground"><Explain term="marketCap">Mkt Cap</Explain></span>
                  <span className="tabular-nums text-right">{fmtCompact(fmpProfile.marketCap ?? fmpProfile.mktCap ?? NaN)}</span>
                  <span className="text-muted-foreground"><Explain term="beta">Beta</Explain></span>
                  <span className="tabular-nums text-right">{fmpProfile.beta != null ? fmpProfile.beta.toFixed(2) : '—'}</span>
                  <span className="text-muted-foreground">52W</span>
                  <span className="tabular-nums text-right">{fmpProfile.range ?? '—'}</span>
                  {fmpProfile.ceo && (<><span className="text-muted-foreground">CEO</span><span className="truncate text-right">{fmpProfile.ceo}</span></>)}
                </div>
                {fmpProfile.description && (
                  <p className="text-[10px] leading-snug text-muted-foreground mt-1 line-clamp-4">{fmpProfile.description}</p>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground font-mono">No profile data.</div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">News</div>
            {fmpNews && fmpNews.length > 0 ? (
              <ul className="space-y-1.5">
                {fmpNews.slice(0, 25).map((n, i) => (
                  <li key={i} className="text-[11px] leading-snug">
                    <a
                      href={n.url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground hover:text-primary hover:underline"
                    >
                      {n.title ?? '(untitled)'}
                    </a>
                    <div className="text-[9px] text-muted-foreground font-mono">
                      {n.site ?? ''}{n.publishedDate ? ` · ${n.publishedDate.slice(0, 10)}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[11px] text-muted-foreground font-mono">No news data.</div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
