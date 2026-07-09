/**
 * MacroVol tab — rates, macro indicators, and IV surface from the MacroVol FastAPI
 * (FRED + yfinance), proxied through /api/macrovol/*.
 */
import { useEffect, useState } from 'react';
import { MacroPanel } from '../macrovol/MacroPanel';
import { RatesPanel } from '../macrovol/RatesPanel';
import { IVSurfaceMacro } from '../macrovol/IVSurfaceMacro';
import { macrovolApi } from '../../lib/macrovol/api';
import { DataBadge } from '../macrovol/DataBadge';

type SubTab = 'overview' | 'macro' | 'rates' | 'surface';

const SUBS: { id: SubTab; label: string; desc: string }[] = [
  { id: 'overview', label: 'Overview', desc: 'Modules · live ticker' },
  { id: 'macro', label: 'Macro', desc: 'CPI · NFP · FRED' },
  { id: 'rates', label: 'Rates & STIR', desc: 'SOFR · curve · plumbing' },
  { id: 'surface', label: 'IV Surface', desc: '3D vol · yfinance' },
];

export function MacrovolView() {
  const [sub, setSub] = useState<SubTab>('overview');
  const [ticker, setTicker] = useState<{ label: string; value: string }[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      macrovolApi.ratesSummary(),
      macrovolApi.macroSummary(),
    ]).then(([rates, macro]) => {
      if (cancelled) return;
      const ok = rates.status === 'fulfilled' || macro.status === 'fulfilled';
      setApiOk(ok);
      const items: { label: string; value: string }[] = [];
      if (rates.status === 'fulfilled') {
        const r = rates.value;
        setAsOf(r.as_of || null);
        if (r.sofr != null) items.push({ label: 'SOFR', value: `${r.sofr.toFixed(2)}%` });
        if (r.usy10 != null) items.push({ label: '10Y', value: `${r.usy10.toFixed(2)}%` });
        // FRED T10Y2Y is percentage points → bps for ticker
        if (r.spread_2s10s != null) items.push({ label: '2s10s', value: `${(r.spread_2s10s * 100).toFixed(0)}bp` });
        if (r.risk_free_rate != null) items.push({ label: 'r', value: `${(r.risk_free_rate * 100).toFixed(2)}%` });
      }
      if (macro.status === 'fulfilled') {
        const m = macro.value;
        setAsOf((prev) => m.as_of || prev);
        if (m.cpi_yoy != null) items.push({ label: 'CPI', value: `${m.cpi_yoy.toFixed(1)}%` });
        if (m.unemployment != null) items.push({ label: 'U3', value: `${m.unemployment.toFixed(1)}%` });
        if (m.nfp_mom != null) items.push({ label: 'NFP', value: `${m.nfp_mom >= 0 ? '+' : ''}${m.nfp_mom.toFixed(0)}k` });
      }
      setTicker(items);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-3 py-2">
        <span className="font-mono text-xs font-bold tracking-wider text-primary">MACROVOL</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          IV SURFACE · STIR RATES · MACRO · FRED · yfinance
        </span>
        <div className="ml-auto flex items-center gap-3 overflow-x-auto font-mono text-[10px]">
          {ticker.map((t) => (
            <span key={t.label} className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-muted-foreground">{t.label}</span>
              <span className="font-bold text-foreground">{t.value}</span>
            </span>
          ))}
          {apiOk === false && (
            <span className="text-red-400">API offline — start macrovol-api :8765</span>
          )}
          {apiOk && <span className="text-emerald-400">API live</span>}
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 border-b border-border px-2 py-1.5">
        {SUBS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSub(s.id)}
            className={`rounded px-2.5 py-1 font-mono text-[10px] transition-colors ${
              sub === s.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={s.desc}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {sub === 'overview' && (
          <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 font-mono">
            <div>
              <h1 className="text-xl font-bold text-foreground">MACROVOL</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Implied volatility · STIR rates · Macro indicators — integrated from the MacroVol terminal
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {([
                { id: 'surface' as const, mod: '01', title: 'IV SURFACE', body: '3D implied vol surface via Black-Scholes + cubic interpolation. SPY, QQQ, AAPL and more from yfinance.' },
                { id: 'rates' as const, mod: '02', title: 'RATES & STIR', body: 'Curve shape · DV01 book · SOFR futures path · Fed plumbing · term-structure r for pricing.' },
                { id: 'macro' as const, mod: '03', title: 'MACRO', body: 'CPI, Core CPI, Core PCE, NFP, unemployment, retail sales, housing starts, Fed balance sheet.' },
              ]).map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSub(card.id)}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary"
                >
                  <div className="text-[10px] text-muted-foreground">MODULE {card.mod}</div>
                  <div className="text-base font-semibold text-foreground">{card.title}</div>
                  <div className="text-xs leading-relaxed text-muted-foreground">{card.body}</div>
                  <div className="mt-auto text-[10px] text-primary">OPEN →</div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 text-[10px] text-muted-foreground">
              <div className="flex flex-wrap gap-4">
                <span>DATA: FRED API · yfinance</span>
                <span>SURFACE: Black-Scholes · Cubic interpolation</span>
                <span>RATES: NY Fed · SOFR · EFFR · IORB</span>
                <span>PROXY: /api/macrovol/* → MacroVol FastAPI</span>
              </div>
              <div className="mt-2">
                <DataBadge asOf={asOf} source="MacroVol API" note={apiOk ? 'connected' : 'check :8765'} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-4 text-xs text-muted-foreground">
              <strong className="text-foreground">Also in this terminal:</strong>
              {' '}Open the <span className="text-primary">Greeks</span> tab and switch to{' '}
              <span className="text-primary">Greeks 1.0</span> for the full MacroVol Greeks desk
              (ATM snapshot, 3D greek surfaces, GEX/Charm heatmaps, OI ladder, GEX calendar, IV surface).
            </div>
          </div>
        )}
        {sub === 'macro' && <MacroPanel />}
        {sub === 'rates' && <RatesPanel />}
        {sub === 'surface' && <IVSurfaceMacro />}
      </div>
    </div>
  );
}
