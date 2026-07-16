# W4 Rates Axes + Compare Windows

**Goal:** Curve charts only — clearer maturity X / yield Y, compare chips **1M · 3M · 6M · 1Y · custom** on dual-path UST. Not a full Rates redesign.

**Scope**
- `YieldCurveCompare.tsx` — axis titles (Maturity · Yield %), DeskModeBar windows, optional custom days
- `SofrFuturesCurve.tsx` — axis titles (Delivery · Yield %)
- `useRatesData.ts` — `comparePeriod` + refetch `ratesCurveHistory`
- `macrovol-api/main.py` `curve-history` — accept preset + `Nd` custom lookback (no invented points)
- Wire via `CurvesBoard` / `RatesPanel` (same state for early UST + hero chart)

**Non-goals:** Full Rates board redesign; new data vendors; Japan JGB redesign beyond shared chart component.

**Done when**
- [x] Dual UST chart has Maturity / Yield % axis captions
- [x] Chips 1M · 3M · 6M · 1Y · Custom recompute compare series from FRED
- [x] Custom = positive day lookback (`45d`), not synthetic points
- [x] SOFR futures path has Delivery / Yield % titles
- [x] Existing YieldCurveCompare / Sofr tests green + window chip tests
