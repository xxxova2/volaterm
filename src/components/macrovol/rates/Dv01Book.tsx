import type { Dispatch, SetStateAction } from 'react';
import { macrovolApi, type Dv01BookData } from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';

export function Dv01Book({
  dv01,
  setDv01,
  n2, setN2, n5, setN5, n10, setN10, n30, setN30,
  sh2, setSh2, sh5, setSh5, sh10, setSh10, sh30, setSh30,
  dv01Loading, setDv01Loading, reloadDv01,
}: {
  dv01: Dv01BookData | null;
  setDv01: Dispatch<SetStateAction<Dv01BookData | null>>;
  n2: number; setN2: (v: number) => void;
  n5: number; setN5: (v: number) => void;
  n10: number; setN10: (v: number) => void;
  n30: number; setN30: (v: number) => void;
  sh2: number; setSh2: (v: number) => void;
  sh5: number; setSh5: (v: number) => void;
  sh10: number; setSh10: (v: number) => void;
  sh30: number; setSh30: (v: number) => void;
  dv01Loading: boolean;
  setDv01Loading: (v: boolean) => void;
  reloadDv01: () => void | Promise<void>;
}) {
  return (
    <CollapsibleSection
      id="sec-dv01"
      belowFold
      className="order-20"
      title="DV01 BOOK (GENERIC PAR TREASURIES)"
      apis={['FRED', 'MacroVol']}
      defaultOpen={false}
      storageKey="rates.sec.dv01"
      subtitle="Semi-annual par · mod duration · $ per 1bp · not CTD/futures · long face = +DV01"
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {([
          ['2Y $mm', n2, setN2],
          ['5Y $mm', n5, setN5],
          ['10Y $mm', n10, setN10],
          ['30Y $mm', n30, setN30],
        ] as const).map(([lab, val, set]) => (
          <label key={lab} className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
            {lab}
            <input
              type="number"
              step="0.5"
              className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              value={val}
              onChange={(e) => set(parseFloat(e.target.value) || 0)}
            />
          </label>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        {([
          ['2Y shock bp', sh2, setSh2],
          ['5Y shock bp', sh5, setSh5],
          ['10Y shock bp', sh10, setSh10],
          ['30Y shock bp', sh30, setSh30],
        ] as const).map(([lab, val, set]) => (
          <label key={lab} className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
            {lab}
            <input
              type="number"
              step="1"
              className="rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              value={val}
              onChange={(e) => set(parseFloat(e.target.value) || 0)}
            />
          </label>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => reloadDv01()}
          className="rounded bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground"
        >
          {dv01Loading ? 'Computing…' : 'Recompute DV01'}
        </button>
        <button
          type="button"
          onClick={async () => {
            setSh2(1); setSh5(1); setSh10(1); setSh30(1);
            setDv01Loading(true);
            try {
              setDv01(await macrovolApi.ratesDv01({
                n2, n5, n10, n30, shock_2: 1, shock_5: 1, shock_10: 1, shock_30: 1,
              }));
            } finally { setDv01Loading(false); }
          }}
          className="rounded border border-border px-2 py-1.5 text-[10px] text-muted-foreground hover:border-primary"
        >
          +1bp parallel
        </button>
        <button
          type="button"
          onClick={async () => {
            setSh2(-1); setSh5(0); setSh10(1); setSh30(0);
            setDv01Loading(true);
            try {
              setDv01(await macrovolApi.ratesDv01({
                n2, n5, n10, n30, shock_2: -1, shock_5: 0, shock_10: 1, shock_30: 0,
              }));
            } finally { setDv01Loading(false); }
          }}
          className="rounded border border-border px-2 py-1.5 text-[10px] text-muted-foreground hover:border-primary"
        >
          Steepener −1/+1 2s10s
        </button>
        <button
          type="button"
          onClick={async () => {
            setSh2(0); setSh5(0); setSh10(0); setSh30(0);
            setDv01Loading(true);
            try {
              setDv01(await macrovolApi.ratesDv01({
                n2, n5, n10, n30, shock_2: 0, shock_5: 0, shock_10: 0, shock_30: 0,
              }));
            } finally { setDv01Loading(false); }
          }}
          className="rounded border border-border px-2 py-1.5 text-[10px] text-muted-foreground"
        >
          Clear shocks
        </button>
      </div>

      {dv01 && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <div className="text-[10px] text-muted-foreground">PARALLEL DV01</div>
              <div className="text-lg font-bold text-foreground">
                ${dv01.parallel_dv01_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] text-muted-foreground">USD / 1bp</div>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <div className="text-[10px] text-muted-foreground">P&amp;L IF +1bp</div>
              <div className={`text-lg font-bold ${(dv01.pnl_if_parallel_up_1bp_usd ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                ${(dv01.pnl_if_parallel_up_1bp_usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <div className="text-[10px] text-muted-foreground">P&amp;L IF −1bp</div>
              <div className={`text-lg font-bold ${(dv01.pnl_if_parallel_down_1bp_usd ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${(dv01.pnl_if_parallel_down_1bp_usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <div className="text-[10px] text-muted-foreground">SCENARIO P&amp;L</div>
              <div className={`text-lg font-bold ${(dv01.scenario?.total_pnl_usd ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${(dv01.scenario?.total_pnl_usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[9px] text-muted-foreground">from key-rate shocks</div>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="p-1.5 text-left font-normal">Tenor</th>
                  <th className="p-1.5 text-right font-normal">Yield</th>
                  <th className="p-1.5 text-right font-normal">Face $mm</th>
                  <th className="p-1.5 text-right font-normal">Mod Dur</th>
                  <th className="p-1.5 text-right font-normal">DV01 $</th>
                  <th className="p-1.5 text-right font-normal">Shock bp</th>
                  <th className="p-1.5 text-right font-normal">Scen P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {dv01.rows.map((row) => {
                  const scen = dv01.scenario?.details.find((d) => d.tenor === row.tenor);
                  return (
                    <tr key={row.tenor} className="border-t border-border/50">
                      <td className="p-1.5 font-medium text-foreground">{row.tenor}</td>
                      <td className="p-1.5 text-right text-foreground">
                        {row.yield_pct != null ? `${row.yield_pct.toFixed(2)}%` : '—'}
                      </td>
                      <td className="p-1.5 text-right">{row.face_mm}</td>
                      <td className="p-1.5 text-right">
                        {row.mod_duration != null ? row.mod_duration.toFixed(2) : '—'}
                      </td>
                      <td className="p-1.5 text-right font-bold">
                        {row.dv01_usd != null
                          ? `$${row.dv01_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : '—'}
                      </td>
                      <td className="p-1.5 text-right">{scen?.shock_bp ?? 0}</td>
                      <td className={`p-1.5 text-right font-bold ${
                        (scen?.pnl_usd ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {scen?.pnl_usd != null
                          ? `$${scen.pnl_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {dv01.note && <p className="mt-2 text-[9px] text-muted-foreground">{dv01.note}</p>}
          <DataBadge asOf={dv01.as_of} source={dv01.source || 'FRED'} className="mt-2" />
        </>
      )}
    </CollapsibleSection>
  );
}
