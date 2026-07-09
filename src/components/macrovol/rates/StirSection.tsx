import { useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ImplyRead, StirStripData } from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { chartTooltipStyle } from '../../../lib/chartTheme';
import { ImplyChip } from '../../common/ImplyDrawer';
import { EmptyState } from '../../common/EmptyState';
import { VirtualRows } from '../../common/VirtualRows';
import { ExportCsvButton } from '../../common/ExportCsvButton';
import {
  useBoardFocus,
  useRegisterBoard,
  type FocusableBoardApi,
} from '../../../hooks/useBoardFocus';
import { SerffBoard } from './SerffBoard';
import { CalendarPacksBoard } from './CalendarPacksBoard';

export function StirSection({
  stir,
  stirChart,
  onOpenImply,
}: {
  stir: StirStripData | null;
  stirChart: { x: string; rate: number | null; vsSofr: number | null; source?: string }[];
  onOpenImply: (i: ImplyRead) => void;
}) {
  const { focused: stirFocused, rowIndex: stirRow, focusRow: focusStir } = useBoardFocus('stir-sr3');
  const sr3Ref = useRef<{ month: string; ticker: string; implied: number }[]>([]);
  const stirFocusApi = useMemo<FocusableBoardApi>(() => ({
    scrollToRow: () => {},
    getCellText: (row) => {
      const r = sr3Ref.current[row];
      return r ? `${r.ticker} ${r.implied}` : '';
    },
    rowCount: () => sr3Ref.current.length,
    colKeys: () => ['ticker', 'implied'],
  }), []);
  useRegisterBoard('stir-sr3', stirFocusApi);

  const liveSr3 = (stir?.sr3 || []).filter((c) => c.implied_rate != null);

  return (
    <CollapsibleSection
      id="sec-stir"
      className="order-3"
      title="STIR PATH (SOFR FUTURES)"
      apis={['yfinance', 'NYFed', 'FRED', 'MacroVol']}
      defaultOpen
      storageKey="rates.sec.stir"
      subtitle="Implied rate = 100 − price · CME-style strip · delayed yfinance · no silent fallbacks"
    >
      {stir?.path && (
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {stir.path.imply && (
            <div className="col-span-2 rounded border border-border bg-background/40 px-2 py-1.5 md:col-span-3 lg:col-span-6">
              <div className="text-type-2xs text-muted-foreground">STRIP IMPLIES</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <ImplyChip imply={stir.path.imply} onOpen={onOpenImply} />
                {stir.path.front_imply && <ImplyChip imply={stir.path.front_imply} compact onOpen={onOpenImply} />}
              </div>
            </div>
          )}
          <div className="rounded border border-border px-2 py-1.5">
            <div className="text-type-2xs text-muted-foreground">SOFR spot</div>
            <div className="text-sm font-bold">{stir.sofr != null ? `${stir.sofr.toFixed(2)}%` : '—'}</div>
          </div>
          <div className="rounded border border-border px-2 py-1.5">
            <div className="text-type-2xs text-muted-foreground">Path Δ (live)</div>
            <div className={`text-sm font-bold ${
              (stir.path.path_change_bps ?? 0) < 0 ? 'text-up' : 'text-amber-400'
            }`}>
              {stir.path.path_change_bps != null
                ? `${stir.path.path_change_bps >= 0 ? '+' : ''}${stir.path.path_change_bps} bps`
                : '—'}
            </div>
          </div>
          <div className="rounded border border-border px-2 py-1.5">
            <div className="text-type-2xs text-muted-foreground">≈ 25bp steps priced</div>
            <div className={`text-sm font-bold ${
              (stir.path.approx_25bp_cuts_priced ?? 0) > 0
                ? 'text-up'
                : (stir.path.approx_25bp_cuts_priced ?? 0) < 0
                  ? 'text-amber-400'
                  : 'text-foreground'
            }`}>
              {stir.path.approx_25bp_cuts_priced != null
                ? `${Math.abs(stir.path.approx_25bp_cuts_priced).toFixed(2)} ${
                    stir.path.approx_25bp_cuts_priced > 0
                      ? 'cuts'
                      : stir.path.approx_25bp_cuts_priced < 0
                        ? 'hikes'
                        : 'flat'
                  }`
                : '—'}
            </div>
          </div>
          <div className="rounded border border-border px-2 py-1.5">
            <div className="text-type-2xs text-muted-foreground">Cut / hike path</div>
            <div className={`text-sm font-bold ${
              (stir.path.path_change_bps ?? 0) < 0 ? 'text-up' : 'text-amber-400'
            }`}>
              {stir.path.path_change_bps != null
                ? (stir.path.path_change_bps < 0
                  ? `${(Math.abs(stir.path.path_change_bps) / 100).toFixed(2)}% cuts`
                  : `${(stir.path.path_change_bps / 100).toFixed(2)}% hikes`)
                : '—'}
            </div>
            <div className="text-type-2xs text-muted-foreground">path Δ in rate pts</div>
          </div>
          <div className="rounded border border-border px-2 py-1.5">
            <div className="text-type-2xs text-muted-foreground">Front vs SOFR</div>
            <div className="text-sm font-bold">
              {stir.path.front_vs_sofr_bps != null
                ? `${stir.path.front_vs_sofr_bps >= 0 ? '+' : ''}${stir.path.front_vs_sofr_bps} bps`
                : '—'}
            </div>
          </div>
          <div className="rounded border border-border px-2 py-1.5">
            <div className="text-type-2xs text-muted-foreground">Implied end rate</div>
            <div className="text-sm font-bold">
              {stir.path.back?.implied_rate != null
                ? `${Number(stir.path.back.implied_rate).toFixed(2)}%`
                : '—'}
            </div>
            <div className="text-type-2xs text-muted-foreground">
              {stir.path.back?.month || stir.path.back?.contract || 'back live'}
            </div>
          </div>
        </div>
      )}
      {stirChart.length > 0 ? (
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stirChart} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#1f1f1f" strokeDasharray="2 2" />
              <XAxis dataKey="x" tick={{ fill: '#71717a', fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 9 }}
                domain={['auto', 'auto']}
                tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
                width={48}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number, name: string) => [
                  name === 'rate' ? `${Number(v).toFixed(3)}%` : `${Number(v).toFixed(1)} bps`,
                  name === 'rate' ? 'Implied' : 'vs SOFR',
                ]}
              />
              {stir?.sofr != null && (
                <ReferenceLine
                  y={stir.sofr}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  label={{ value: `SOFR ${stir.sofr.toFixed(2)}%`, fill: '#f59e0b', fontSize: 9 }}
                />
              )}
              <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-3 rounded border border-border bg-background/40 p-3 text-type-xs text-muted-foreground">
          No live SOFR futures quotes — strip left empty rather than inventing rates.
        </div>
      )}
      {/* CME Globex-style SOFR futures board: Last · Change · Settlement · High · Low · Volume */}
      {liveSr3.length > 0 && (
        <div className="mt-3 space-y-3">
          <div className="rounded border border-border">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/50 px-2 py-1 text-type-xs font-semibold text-foreground">
              <span>
                3M SOFR FUTURES (SFR / SR3) · CME-style board
                <span className="ml-2 font-normal text-muted-foreground">
                  {liveSr3.length} live · virtualized
                </span>
              </span>
              <ExportCsvButton
                className="ml-auto"
                filename={`sr3-strip-${new Date().toISOString().slice(0, 10)}`}
                headers={['Month', 'Ticker', 'Last', 'Change', 'Settlement', 'High', 'Low', 'Volume', 'Implied%', 'vsSOFR_bp']}
                rows={(stir?.sr3 || []).filter((c) => c.implied_rate != null).map((c) => {
                  const vs = stir?.sofr != null && c.implied_rate != null
                    ? (c.implied_rate - stir.sofr) * 100
                    : null;
                  const net = c.net ?? c.change;
                  const last = c.last_price ?? (c.implied_rate != null ? 100 - c.implied_rate : null);
                  const sett = c.settlement ?? c.prev_close;
                  return [
                    c.month, c.ticker || c.contract,
                    last, net, sett, c.high, c.low, c.volume,
                    c.implied_rate, vs != null ? vs.toFixed(1) : null,
                  ];
                })}
              />
            </div>
            {/* Sticky header row + virtual body (Phase G) */}
            <div className="flex border-b border-border bg-card px-1.5 py-1 font-mono text-type-2xs text-muted-foreground sticky top-0 z-[1]">
              <span className="w-14 shrink-0">Month</span>
              <span className="w-16 shrink-0">Ticker</span>
              <span className="w-14 shrink-0 text-right">Last</span>
              <span className="w-14 shrink-0 text-right">Chg</span>
              <span className="w-14 shrink-0 text-right">Sett</span>
              <span className="w-12 shrink-0 text-right">Hi</span>
              <span className="w-12 shrink-0 text-right">Lo</span>
              <span className="w-14 shrink-0 text-right">Vol</span>
              <span className="w-14 shrink-0 text-right">Impl%</span>
              <span className="w-14 shrink-0 text-right">vsS</span>
              <span className="min-w-0 flex-1">Imply</span>
            </div>
            <VirtualRows
              height={Math.min(320, Math.max(120, liveSr3.length * 28))}
              rowHeight={28}
              items={(stir?.sr3 || []).filter((c) => c.implied_rate != null)}
              renderRow={({ index, style, item: c }) => {
                // Keep focus registry in sync (cheap)
                const live = (stir?.sr3 || []).filter((x) => x.implied_rate != null);
                sr3Ref.current = live.map((x) => ({
                  month: x.month || '',
                  ticker: x.ticker || x.contract,
                  implied: x.implied_rate!,
                }));
                const vs = stir?.sofr != null && c.implied_rate != null
                  ? (c.implied_rate - stir.sofr) * 100
                  : null;
                const net = c.net ?? c.change;
                const last = c.last_price ?? (c.implied_rate != null ? 100 - c.implied_rate : null);
                const sett = c.settlement ?? c.prev_close;
                const ptImply = (stir?.path?.points || []).find(
                  (p) => p.contract === c.contract,
                )?.imply;
                return (
                  <div
                    style={style}
                    role="row"
                    aria-selected={stirFocused && index === stirRow}
                    onClick={() => focusStir(index, 'ticker')}
                    className={`flex items-center border-b border-border/40 px-1.5 font-mono text-type-xs hover:bg-muted/20 cursor-default ${
                      stirFocused && index === stirRow ? 'focus-ring-term-inset bg-primary/10' : ''
                    }`}
                  >
                    <span className="w-14 shrink-0 text-muted-foreground">{c.month}</span>
                    <span className="w-16 shrink-0 font-bold text-foreground">{c.ticker || c.contract}</span>
                    <span className="w-14 shrink-0 text-right tabular-nums font-semibold">
                      {last != null ? last.toFixed(2) : '—'}
                    </span>
                    <span className={`w-14 shrink-0 text-right tabular-nums ${
                      net == null ? '' : net >= 0 ? 'text-up' : 'text-down'
                    }`}>
                      {net != null ? (net >= 0 ? `+${net.toFixed(3)}` : net.toFixed(3)) : '—'}
                    </span>
                    <span className="w-14 shrink-0 text-right tabular-nums text-muted-foreground">
                      {sett != null ? sett.toFixed(2) : '—'}
                    </span>
                    <span className="w-12 shrink-0 text-right tabular-nums">
                      {c.high != null ? c.high.toFixed(2) : '—'}
                    </span>
                    <span className="w-12 shrink-0 text-right tabular-nums">
                      {c.low != null ? c.low.toFixed(2) : '—'}
                    </span>
                    <span className="w-14 shrink-0 text-right tabular-nums">
                      {c.volume != null ? c.volume.toLocaleString() : '—'}
                    </span>
                    <span className="w-14 shrink-0 text-right tabular-nums">
                      {c.implied_rate!.toFixed(3)}
                    </span>
                    <span className={`w-14 shrink-0 text-right tabular-nums ${
                      vs != null && vs < 0 ? 'text-up' : vs != null && vs > 0 ? 'text-amber-400' : ''
                    }`}>
                      {vs != null ? `${vs >= 0 ? '+' : ''}${vs.toFixed(0)}` : '—'}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <ImplyChip imply={ptImply} compact onOpen={onOpenImply} />
                    </span>
                  </div>
                );
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="overflow-x-auto rounded border border-border">
              <div className="border-b border-border bg-background/50 px-2 py-1 text-type-xs font-semibold text-foreground">
                1M SOFR (SR1) · monthly SERFF legs
              </div>
              {(stir?.sr1 || []).filter((c) => c.implied_rate != null).length === 0 ? (
                <EmptyState kind="no-data" compact title="No live SR1" body="Strip empty or yfinance delayed — not silent zeros." />
              ) : (
                <table className="w-full border-collapse text-type-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="p-1.5 text-left font-normal">Month</th>
                      <th className="p-1.5 text-left font-normal">Ticker</th>
                      <th className="p-1.5 text-right font-normal">Last</th>
                      <th className="p-1.5 text-right font-normal">Change</th>
                      <th className="p-1.5 text-right font-normal">High</th>
                      <th className="p-1.5 text-right font-normal">Low</th>
                      <th className="p-1.5 text-right font-normal">Vol</th>
                      <th className="p-1.5 text-right font-normal">Implied %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stir?.sr1 || []).filter((c) => c.implied_rate != null).map((c) => (
                      <tr key={c.contract} className="border-t border-border/50">
                        <td className="p-1.5 text-muted-foreground">{c.month}</td>
                        <td className="p-1.5 font-bold">{c.ticker || c.contract}</td>
                        <td className="p-1.5 text-right font-mono tabular-nums">
                          {(c.last_price ?? (100 - c.implied_rate!)).toFixed(2)}
                        </td>
                        <td className={`p-1.5 text-right font-mono tabular-nums ${
                          c.net == null ? '' : c.net >= 0 ? 'text-up' : 'text-down'
                        }`}>
                          {c.net != null ? (c.net >= 0 ? `+${c.net.toFixed(3)}` : c.net.toFixed(3)) : '—'}
                        </td>
                        <td className="p-1.5 text-right font-mono tabular-nums">{c.high != null ? c.high.toFixed(2) : '—'}</td>
                        <td className="p-1.5 text-right font-mono tabular-nums">{c.low != null ? c.low.toFixed(2) : '—'}</td>
                        <td className="p-1.5 text-right font-mono tabular-nums">
                          {c.volume != null ? c.volume.toLocaleString() : '—'}
                        </td>
                        <td className="p-1.5 text-right font-mono tabular-nums">{c.implied_rate!.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Treasury futures continuum — CME rates complex */}
            <div className="overflow-x-auto rounded border border-border">
              <div className="border-b border-border bg-background/50 px-2 py-1 text-type-xs font-semibold text-foreground">
                TREASURY FUTURES · ZT / ZF / ZN / TN / ZB / UB
                <span className="ml-2 font-normal text-muted-foreground">
                  {stir?.live_tsy ?? 0} live
                </span>
              </div>
              {(stir?.treasury_futures || []).filter((c) => c.last_price != null).length === 0 ? (
                <div className="p-3 text-type-xs text-muted-foreground">No live Treasury futures</div>
              ) : (
                <table className="w-full border-collapse text-type-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="p-1.5 text-left font-normal">Product</th>
                      <th className="p-1.5 text-left font-normal">CC</th>
                      <th className="p-1.5 text-right font-normal">Last</th>
                      <th className="p-1.5 text-right font-normal">Change</th>
                      <th className="p-1.5 text-right font-normal">High</th>
                      <th className="p-1.5 text-right font-normal">Low</th>
                      <th className="p-1.5 text-right font-normal">Vol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stir?.treasury_futures || []).filter((c) => c.last_price != null).map((c) => (
                      <tr key={c.contract} className="border-t border-border/50 hover:bg-muted/20">
                        <td className="p-1.5 text-muted-foreground">{c.product || c.month}</td>
                        <td className="p-1.5 font-bold text-foreground">{c.ticker || c.contract}</td>
                        <td className="p-1.5 text-right font-mono font-semibold tabular-nums">
                          {c.last_price!.toFixed(4)}
                        </td>
                        <td className={`p-1.5 text-right font-mono tabular-nums ${
                          c.net == null ? '' : c.net >= 0 ? 'text-up' : 'text-down'
                        }`}>
                          {c.net != null ? (c.net >= 0 ? `+${c.net.toFixed(4)}` : c.net.toFixed(4)) : '—'}
                        </td>
                        <td className="p-1.5 text-right font-mono tabular-nums">{c.high != null ? c.high.toFixed(4) : '—'}</td>
                        <td className="p-1.5 text-right font-mono tabular-nums">{c.low != null ? c.low.toFixed(4) : '—'}</td>
                        <td className="p-1.5 text-right font-mono tabular-nums">
                          {c.volume != null ? c.volume.toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {stir?.serff_board && stir.serff_board.length > 0 && (
        <SerffBoard rows={stir.serff_board} onOpenImply={onOpenImply} />
      )}

      {/* Path cut/hike detail table */}
      {liveSr3.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse text-type-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="p-1 text-left font-normal">Contract</th>
                <th className="p-1 text-right font-normal">Cut/Hike vs SOFR</th>
                <th className="p-1 text-right font-normal">≈25bp</th>
                <th className="p-1 text-right font-normal">Src</th>
              </tr>
            </thead>
            <tbody>
              {(stir?.sr3 || []).filter((c) => c.implied_rate != null).map((c) => {
                const vs = stir?.sofr != null && c.implied_rate != null
                  ? (c.implied_rate - stir.sofr) * 100
                  : null;
                const cuts25 = vs != null ? vs / -25 : null;
                const cutHikePct = vs != null
                  ? (vs < 0
                    ? `${(Math.abs(vs) / 100).toFixed(2)}% cut`
                    : `${(vs / 100).toFixed(2)}% hike`)
                  : null;
                return (
                  <tr key={`path-${c.contract}`} className="border-t border-border/50">
                    <td className="p-1 font-medium">{c.ticker || c.contract} <span className="text-muted-foreground">{c.month}</span></td>
                    <td className={`p-1 text-right ${
                      vs != null && vs < 0 ? 'text-up' : vs != null && vs > 0 ? 'text-amber-400' : ''
                    }`}>
                      {cutHikePct ?? '—'}
                    </td>
                    <td className="p-1 text-right">
                      {cuts25 != null ? (cuts25 >= 0 ? `+${cuts25.toFixed(2)}c` : `${cuts25.toFixed(2)}h`) : '—'}
                    </td>
                    <td className={`p-1 text-right ${c.source === 'live' ? 'text-up' : 'text-amber-400'}`}>
                      {c.source}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {stir && <CalendarPacksBoard stir={stir} onOpenImply={onOpenImply} />}

      <DataBadge
        asOf={stir?.as_of}
        source={stir?.source || 'yfinance'}
        note={stir?.path?.note || stir?.quality_note || undefined}
        className="mt-2"
      />
    </CollapsibleSection>
  );
}
