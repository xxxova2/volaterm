# Desk Tools Visual Enhancement — Design Spec

| Field | Value |
|-------|--------|
| **Status** | Approved direction (2026-07-16) |
| **Product** | VOLATERM |
| **Approach** | Kit-first shared presentation layer, then re-skin tools in PR waves |
| **Out of scope** | Vol 3D surface · full Greeks 1.0 · Crypto Thalex iframe embeds |

---

## 1. Problem

Most desks outside Vol surface / Greeks / Crypto·Thalex read as **AI slop**:

- Default Recharts look (dashed grid, bare ticks, no axis titles/units)
- Equal-weight stat cards and marketing blurbs instead of desk print strips
- Rainbow series without grammar or legends
- Weak hierarchy vs Thalex lab craft or Bloomberg blotter density

Trade native tools (`DeskView.tsx` ~1.4k lines) are the largest surface and set the bar for later waves.

---

## 2. Goals

1. **Shared craft** so every chart/tool looks intentional and consistent.
2. **Hybrid visual bar:**
   - **A (Thalex craft)** — black chart field, labeled axes + units, series grammar, path clouds, spot/zero refs.
   - **B (Bloomberg density)** — mono tables, amber editable fields, tight chrome, function-strip grammar.
3. **Break-even** inverts the hybrid: **B-primary** (matrix / blotter); chart secondary.
4. **Math and data paths unchanged** (BS-Merton, yfinance/FMP/Deribit, fail-closed LIVE). Presentation only unless a bug blocks readability (e.g. domain scale).
5. **Phased delivery** of all 12 Trade tools, then Flow → Smile/Term/Fit → Rates (narrow) → Home → Academy.

### Non-goals

- Cloning Thalex branding or Bloomberg licensed mnemonics/branding.
- Replacing Crypto desk Thalex iframes with native replicas.
- Redesigning full Greeks / 3D surface (already preferred quality).
- Full Rates desk redesign (only curve axes + history compare).
- New pricing models or paid data vendors.

---

## 3. Visual language

### 3.1 Chart craft (A) — primary for most tools

| Rule | Detail |
|------|--------|
| Canvas | Near-black chart field (`bg-black` / theme black); chrome outside the plot |
| Axes | **Title + unit** on X and Y (e.g. `Spot`, `PnL ($)`, `γ ×10⁻⁴`, `Days`) |
| Ticks | Mono, compact formatters: price, bps, %, days, compact $ |
| Domain | Use `tightDomain` (or equivalent) — no dead 0→max empty space unless zero must show |
| Refs | Spot / ATM / zero lines with short labels when meaningful |
| Legend | Human series names; map through series grammar (not raw `dataKey`) |
| Tooltip | Mono, card bg, units on values |
| Dual-Y | Only when two scales (e.g. PnL + residual Δ); both axes labeled |

### 3.2 Series grammar

Extend `src/lib/chartTheme.ts` (or `desk/seriesGrammar.ts` re-exporting it):

| Role | Color token | Use |
|------|-------------|-----|
| Combo / net | white / `CHART.series.live` | Aggregate multi-leg |
| Long / buy | `CHART.series.info` (cyan-blue) | Long legs, upside path density |
| Short / sell | `CHART.series.down` | Short legs, loss density |
| Path cloud | red→blue density gradient (canvas or layered bands) | Simulator |
| PnL positive | `CHART.series.up` | |
| PnL negative / zero line | `CHART.series.down` / muted | |
| Spot mark | `CHART.series.amber` / warn dashed | Live spot vertical |
| History live | white | Dual-path “today” |
| History compare | `CHART.series.compare` (blue) | Prior window |

Greek lines when multi-series: prefer `CHART_GREEK` (delta/gamma/theta/vega) already defined.

### 3.3 Density chrome (B)

| Element | Rule |
|---------|------|
| Inputs | Amber-tinted editable fields (BBG “amber = editable”) where controls exist |
| Print strip | Tight mono table: Avg / Median / BE / Max Loss / Win% — not equal marketing cards |
| Source badge | Honest vendor (YFINANCE / FMP / DERIBIT / DEMO) + freshness |
| Tables | Sticky headers, tabular-nums, dense row height; charts secondary when B-primary |
| Layout | Controls row → print strip → primary viz; minimize nested “app inside app” |

### 3.4 Break-even special case (B-first)

- Primary: dense strike / BE / N(d2) / payoff table (Bloomberg option analytics feel).
- Amber inputs for legs, spot, IV overrides if present.
- Secondary: small payoff diagram using DeskChart (A craft, reduced height).
- No large empty chart dominating the tool.

---

## 4. Architecture (kit-first)

### 4.1 New modules

```
src/components/desk/
  DeskToolShell.tsx      # B density chrome wrapper
  DeskChart.tsx          # A craft wrappers around Recharts (or thin helpers)
  PrintStrip.tsx         # Key-value print cells
  seriesGrammar.ts       # Role → color (uses chartTheme)
  tools/
    SimTool.tsx
    ComboGreeksTool.tsx
    BreakEvenTool.tsx
    GridTool.tsx
    ComboPnlTool.tsx
    OptionPnlTool.tsx
    StraddleTool.tsx
    HedgeTool.tsx
    DFollowTool.tsx
    BacktestTool.tsx
    BasisTool.tsx
    RollTool.tsx
    SubjectiveTool.tsx
```

`DeskView.tsx` shrinks to:

- Trade chrome + listed-Σ strip (existing honest labeling)
- Tool router by `deskSectionId` / tool id
- No inline chart boilerplate

### 4.2 DeskToolShell API (conceptual)

```tsx
<DeskToolShell
  title="Simulator"
  source={badge}           // label + detail
  controls={<>…amber inputs…</>}
  print={<PrintStrip items={[…]} />}
>
  {children}               // DeskChart or table
</DeskToolShell>
```

### 4.3 DeskChart responsibilities

- Apply black field container + consistent margins
- Axis title slots (top of Y, bottom of X or Recharts `label`)
- Default `chartGridProps`, `chartAxisTick`, `chartTooltipStyle` from `chartTheme`
- Helpers: `priceTick`, `pctTick`, `dayTick`, `signedTick`
- Optional `spotRef`, `zeroRef`, dual YAxis configuration props
- **Do not** invent new math; only layout and presentation

### 4.4 chartTheme extensions

- Document axis-label CSS class (muted mono 2xs uppercase tracking)
- Path-cloud palette hex confined to `chartTheme` / seriesGrammar (existing KD rule: hex only in theme modules)
- Ensure Trade tools stop using ad-hoc `stroke="var(--primary)"` / inline tick styles; all go through kit

### 4.5 Math / lib boundary

- Keep pricing in `src/lib/options/*` (`pathSim`, `portfolio`, `breakEven`, `hedging`, `basis`, …)
- Tools only compose UI + call pure lib functions
- No behavior change to fail-closed LIVE / synthetic under LIVE rules

---

## 5. Trade tool inventory (all 12, phased)

| Tool | Primary viz | Hybrid tilt | Phase |
|------|-------------|-------------|-------|
| Simulator | Path cloud + PnL bands + print (Avg/BE/Max) | A | T1 |
| Combo Greeks | PnL vs spot + multi-greek vs spot; white combo | A | T1 |
| Option Grid | Strike×expiry Ω / 1/N(d2); spot dashed | A | T1 |
| Break-even | Dense BE / N(d2) matrix | **B** | T2 |
| Subjective | Fair vs market table + small IV/spot chart | B+A | T2 |
| Combo PnL | Historical multi-leg PnL + greek decomp | A+B | T3 |
| Option PnL | Single option mark PnL path | A+B | T3 |
| Straddle | BE table + hist straddle PnL | A+B | T3 |
| Hedging | Dual-Y PnL + residual Δ path | A | T4 |
| Δ Follower | Track path + error | A | T4 |
| Backtest | Weekly short-straddle Δ-hedged bands | A | T4 |
| Basis | Basis / ann. carry vs time | A | T5 |
| Roll PnL | Funding/basis heatmap | A | T5 |

*(Backtest counts in the lab set; Trade `TRADE_SECTIONS` may omit backtest in red bar — still enhance if present in TOOLS.)*

### Phase detail

| PR | Deliverable | Success criteria |
|----|-------------|------------------|
| **T0** | Kit: DeskToolShell, DeskChart, PrintStrip, seriesGrammar; chartTheme helpers; unit tests for formatters/grammar | Story/demo or minimal mount; no visual regression on Greeks/surface |
| **T1** | Sim · Combo Greeks · Grid on kit | Axis titles visible; series grammar; black field; print strip on Sim |
| **T2** | Break-even BBG matrix · Subjective | BE is table-first; amber fields; chart ≤ ~30% height |
| **T3** | Combo/Option PnL · Straddle | Shared history X grammar (date ticks); dual-series legends |
| **T4** | Hedge · DFollow · Backtest | Dual-Y labeled; trade markers optional; honest “path sim not parquet” copy |
| **T5** | Basis · Roll | Heatmap color scale from theme; axis maturity/time labels |

Each PR: migrate tool(s) out of `DeskView`, delete dead inline chart styles, keep existing tests green + add shell/chart tests where cheap.

---

## 6. Later waves (same kit)

| Wave | Scope | Notes |
|------|-------|-------|
| **W2 Flow** | Positioning Book + Tools | B density on chain/levels; A heatmaps for GEX/session |
| **W3 Vol secondary** | Smile · Term · Surface Fit | Axis units (Δ / K / IV%), ATM mark, ordinal expiries via `CHART_SERIES_ORDINAL` |
| **W4 Rates narrow** | Curve charts only | Clearer maturity **X** and yield **Y** titles/ticks; compare chips **1M · 3M · 6M · 1Y · custom** on dual-path (extend `YieldCurveCompare` / CurvesBoard). Not a full Rates redesign |
| **W5 Home chrome** | Launchpad, DES, Hist IV, strips | Density + sparklines; no new data vendors |
| **W6 Academy** | Reader / news / glossary | Publication tokens (`academy-*`); **not** desk black-field lab style |

Rates W4 data: use existing FRED history already used for “today vs last year”; add window selection that recomputes compare series (1M/3M/…) without inventing points.

---

## 7. Anti-slop checklist (definition of done per tool)

- [ ] X title + unit; Y title + unit (both axes if dual-Y)
- [ ] Tick formatters match quantity
- [ ] Spot / zero / ATM refs where meaningful
- [ ] Legend uses series grammar names
- [ ] `tightDomain` or justified zero-inclusive domain
- [ ] Black chart field; chrome outside plot
- [ ] Print strip for key outputs (not only free-text blurbs)
- [ ] Amber editable controls
- [ ] Honest source + freshness (no fake Live)
- [ ] No nested mini-app header duplicating global symbol chrome

---

## 8. Testing & risk

| Risk | Mitigation |
|------|------------|
| Visual-only changes break jsdom Recharts tests | Keep ResponsiveContainer polyfills; prefer testing shell props and pure formatters |
| Regression on Crypto Thalex embeds | Do not touch `chrome === 'thalex'` iframe path |
| chartTheme token drift | Tests already assert ordinal uniqueness; extend for seriesGrammar roles |
| Scope creep into Greeks/surface | Explicit out-of-scope; do not refactor Greeks10View for style in T0–T5 unless sharing a pure formatter |
| Large `DeskView` PR | Extract tools PR-by-PR; never rewrite all 12 in one commit |

---

## 9. Reference visuals

Internal research refs (session):

- Thalex: simulator path cloud, combo-greeks γ profile, option grid (thalextech.github.io images)
- In-repo: `YieldCurveCompare` dual-path black field (prototype for DeskChart live/compare series)
- Docs: `docs/engineering/BLOOMBERG_VISUAL_RESEARCH.md` (density, amber fields, green/red semantic)

---

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-07-16 | Scope: all except full Rates; Rates only axes + compare windows |
| 2026-07-16 | First wave: Trade tools |
| 2026-07-16 | Visual bar: A+B hybrid; A style default; BE = BBG-first |
| 2026-07-16 | All 12 Trade tools planned (★), phased T0–T5 |
| 2026-07-16 | Architecture: **kit-first (approach 1)** approved |

---

## 11. Next step

After user review of this file: write implementation plan (`docs/superpowers/plans/…`) starting with **T0 kit**, then T1 tools.
