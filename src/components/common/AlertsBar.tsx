/**
 * Desk alerts strip — rules + recent fires; browser Notification when permitted.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import {
  alertKindLabel,
  clearAlertEvents,
  defaultRules,
  evaluateAlerts,
  loadAlertEvents,
  loadAlertRules,
  saveAlertRules,
  type AlertEvent,
  type AlertKind,
  type AlertRule,
} from '../../lib/market/alerts';
import { dealerExposure, ivRank } from '../../lib/options/analytics';
import { cn } from '../../lib/utils';

function newRule(symbol: string, kind: AlertKind = 'price_above'): AlertRule {
  return {
    id: Math.random().toString(36).slice(2, 9),
    kind,
    symbol: symbol.toUpperCase(),
    threshold: kind.startsWith('iv') ? 70 : undefined,
    enabled: true,
    cooldownMs: 15 * 60_000,
    lastFiredAt: null,
  };
}

export function AlertsBar({ className }: { className?: string }) {
  const symbol = useTerminalStore((s) => s.symbol);
  const snapshot = useTerminalStore((s) => s.snapshot);
  const historicalFrames = useTerminalStore((s) => s.historicalFrames);
  const frameIndex = useTerminalStore((s) => s.frameIndex);
  const [rules, setRules] = useState<AlertRule[]>(() => loadAlertRules());
  const [events, setEvents] = useState<AlertEvent[]>(() => loadAlertEvents());
  const [open, setOpen] = useState(false);

  const gex = useMemo(() => (snapshot ? dealerExposure(snapshot) : null), [snapshot]);
  const ivr = useMemo(
    () => ivRank(historicalFrames, frameIndex).percentile,
    [historicalFrames, frameIndex],
  );

  // Re-evaluate when spot / GEX / IV move (read rules from storage to avoid dep loops)
  useEffect(() => {
    if (!snapshot) return;
    const current = loadAlertRules();
    const fired = evaluateAlerts({
      symbol,
      spot: snapshot.spot,
      ivRankPct: ivr,
      totalGex: gex?.totalGEX ?? null,
      gammaFlip: gex?.gammaFlip ?? null,
    }, current);
    if (fired.length) {
      setRules(loadAlertRules());
      setEvents(loadAlertEvents());
    }
  }, [symbol, snapshot?.spot, gex?.totalGEX, gex?.gammaFlip, ivr, snapshot]);

  // Keep rule symbols in sync when underlier changes
  useEffect(() => {
    setRules((prev) => {
      const next = prev.map((r) =>
        r.kind === 'gex_flip' ? { ...r, symbol: symbol.toUpperCase() } : r,
      );
      saveAlertRules(next);
      return next;
    });
  }, [symbol]);

  const persist = (next: AlertRule[]) => {
    setRules(next);
    saveAlertRules(next);
  };

  return (
    <div className={cn('rounded border border-border bg-card/50 font-mono', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2 py-1 text-left text-type-xs hover:bg-muted/30"
      >
        <span className="font-semibold text-foreground">Alerts</span>
        <span className="text-muted-foreground">
          {rules.filter((r) => r.enabled).length} on · {events.length} fired
        </span>
        <span className="ml-auto text-type-2xs text-muted-foreground">
          {open ? '▾' : '▸'} browser notify
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-border/60 px-2 py-2">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className="rounded border border-border px-1.5 py-0.5 text-type-2xs hover:border-primary"
              onClick={() => persist([...rules, newRule(symbol, 'price_above')])}
            >
              + price ≥
            </button>
            <button
              type="button"
              className="rounded border border-border px-1.5 py-0.5 text-type-2xs hover:border-primary"
              onClick={() => persist([...rules, newRule(symbol, 'iv_rank_above')])}
            >
              + IVR ≥
            </button>
            <button
              type="button"
              className="rounded border border-border px-1.5 py-0.5 text-type-2xs hover:border-primary"
              onClick={() => {
                const has = rules.some((r) => r.kind === 'gex_flip');
                if (has) return;
                persist([...rules, ...defaultRules(symbol)]);
              }}
            >
              + GEX flip
            </button>
            <button
              type="button"
              className="ml-auto rounded border border-border px-1.5 py-0.5 text-type-2xs text-muted-foreground hover:border-primary"
              onClick={() => {
                clearAlertEvents();
                setEvents([]);
              }}
            >
              clear log
            </button>
          </div>
          <ul className="space-y-1">
            {rules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 text-type-2xs">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => {
                      persist(rules.map((x) => (x.id === r.id ? { ...x, enabled: e.target.checked } : x)));
                    }}
                  />
                  <span className="text-foreground">{alertKindLabel(r.kind)}</span>
                </label>
                <span className="text-muted-foreground">{r.symbol}</span>
                {r.kind !== 'gex_flip' && (
                  <input
                    type="number"
                    className="w-20 rounded border border-border bg-background px-1 py-0.5 tabular-nums"
                    value={r.threshold ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? undefined : Number(e.target.value);
                      persist(rules.map((x) => (x.id === r.id ? { ...x, threshold: v } : x)));
                    }}
                  />
                )}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-down"
                  onClick={() => persist(rules.filter((x) => x.id !== r.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {events.length > 0 && (
            <ul className="max-h-20 overflow-y-auto border-t border-border/40 pt-1 text-type-2xs text-muted-foreground">
              {events.slice(0, 8).map((ev) => (
                <li key={ev.id}>
                  {new Date(ev.at).toLocaleTimeString()} · {ev.message}
                </li>
              ))}
            </ul>
          )}
          <p className="text-type-2xs text-muted-foreground">
            Local only · not execution alerts · request notification permission when prompted
          </p>
        </div>
      )}
    </div>
  );
}
