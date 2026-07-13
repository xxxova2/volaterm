# Positioning / TRACE-style tools — visual research (living)

| Field | Value |
|-------|--------|
| **Status** | Research only — no product clone of SpotGamma TRACE |
| **Started** | 2026-07-13 |
| **Product** | VOLATERM |
| **Asset pack** | Pack A #1–10 + Pack B #1–10 (20 total; keep all) |
| **Principle** | Steal **layout + decision jobs**, not branding, proprietary OI attribution, or fake 1‑min institutional feeds |
| **Chart owner** | Prefer **Grok** for visual/chart/profile implementation (user preference); Hy3 for pure chrome packs if needed |

Related: `docs/BLOOMBERG_VISUAL_RESEARCH.md`, `docs/API_PROVIDERS_EVAL.md`, `docs/BLOOMBERG_SHELL_REDESIGN.md`, **`docs/MACROS_GREEKS_GEX_RESEARCH.md`** (MenthorQ GEX/DEX/HVL + Conks plumbing + Benn greeks).

---

## Product jobs (from SpotGamma TRACE marketing copy)

Map marketing → **decision job** → what VOLATERM can honestly claim.

| TRACE claim | Decision job | VOLATERM honesty |
|-------------|--------------|------------------|
| Act earlier with 1‑min updates | See hedging pressure form **intraday** before price fully reprices | We can poll chain/GEX on **our** cadence (minutes), badge **STALE/DELAYED**; we do **not** have OPRA 1‑min HIRO without paid tape |
| Plan ahead with multi‑day heatmaps | Persistent γ structure over calendar; “where pressure intensifies/fades” | Need **strike × date** or **spot × date** grid history — not one-shot OI snapshot |
| Trade levels that matter | Walls / flip / pin zones from **options positioning** | We already compute call/put wall, flip, net GEX from OI (dealer convention) |
| Validate with participant insight | MM vs customer vs retail vs broker | **Hard gap** without participant-tagged flow (SpotGamma/OPRA proprietary). Do **not** fake. Optional later: crude “assumption toggle” only |
| Institutional-grade S&P pressure | Index aggregate + single-name | Index chain hard; FlashAlpha free = single-name budget; no free SPY GEX |

**UI principle from TRACE copy:** every chart answers *support / resistance / vol zone / path bias* — not “pretty heatmap.”

---

## Image catalog (keep these 10)

Paths under session assets (also mirrored in user attach list). Labels are **feature names**, not product names to ship.

### #1 — Intraday GEX heatmap + strike ladder (MM, ODTE-ish)
**Title pattern:** `SPX Gamma Exposure and GEX by Strike – Market Makers`  
**Layout:**
- **Left rail:** vertical **GEX by strike** bars (red/purple clusters, multi-marker ticks = time-ago samples)
- **Main:** price (candles) over **strike axis** + purple/red **heatmap** (gamma $ notional) through session
- **Tooltip:** strike, ODTE GEX $, 30d percentile, 10/30/60m ago, daily min/max
- **Chrome:** metric dropdown (Gamma), date, Stability gauge, ODTE GEX toggle, strike zoom, participant (Market Makers), inverted/key levels, bar size (5m), heatmap zoom

**Jobs:** where is γ concentrated vs spot *right now*; how did that bar change through the day.

### #2 — Multi-day calendar heatmap (index aggregate, beta-projected)
**Title:** `S&P 100 Aggregate Dealer Side · Beta-Projected Gamma Map`  
**Layout:**
- Header metrics: SPX spot, Today Aggregate $ Gamma / 1% SPX, names projected, horizon (33d), σ assumed, top contributors (AAPL GOOG …)
- **X = calendar date**, **Y = SPX level (beta-projected)**
- Diverging blue (long γ / dampen) ↔ red (short γ / amplify) scale in **$M per 1% SPX**
- Cyan horizontal = current spot band

**Jobs:** multi-day planning; “where does aggregate dealer γ stack as spot walks.”

### #3 — Same shell as #1, **Customers** + dual series (price + HIRO-like)
**Title:** GEX by Strike – **Customers**  
**Diff vs #1:** participant = Customers; right axis series (purple line) can be **HIRO / flow proxy** not just price; 1m bars.

**Jobs:** contrast customer vs MM positioning; flow vs spot path.

### #4 — Single-name calendar $γ surface (NVDA)
**Title:** `NVDA Dealer Side · Calendarized $ Gamma`  
**Layout:** calendar × price level; annotations for **short γ cluster** (red box above spot) vs **long γ shelf** (yellow box below).  
Header: spot, today dealer $γ / 1%, peak |gamma| day & price, horizon.

**Jobs:** single-name wall planning; vol-amp zones above/below spot.

### #5 — Pure strike ladder (dark, dual-color bars)
Orange vs blue/cyan bars left/right of zero — call vs put or signed γ components at each strike. Dense index strikes (~7000–7300).

**Jobs:** classic “profile” view — max positive / negative strikes at a glance.

### #6 — Intraday MM heatmap, blue/red divergent (pre-open → RTH)
Clear **positive γ above / negative below** (or vice versa) with spot line; Stability %; key levels toggle.

**Jobs:** regime picture for the day (dampen vs amplify zones relative to open).

### #7 — “Magnet” / pin band (strong purple ridge at strike)
Price under a **thick horizontal γ ridge** (~7025) with red wings; classic pin / mean-reversion narrative when net long γ at a strike.

**Jobs:** trade the level that “matters” — ridge = expected support/resistance from hedging.

### #8 — Macro context (not GEX): rolling return distribution
`S&P 500 Rolling 10-Day Returns (since 1950)` histogram + current return percentile.  
**Jobs:** regime / stretch context next to positioning (Home analytics, not GEX desk core).

### #9 — **Charm Pressure** mode + annotated walls
Same TRACE chrome; metric = **Charm Pressure** (not Gamma).  
Labels: Call Wall, Hedge Wall, SG Implied 1d Move High/Low, Last Closing; arrows for **potential pinning**.  
Key levels ON. Dark purple/red field.

**Jobs:** *path of least resistance through time* (delta decay → rehedge), not just static γ.

### #10 — Contour / isosurface style + early session candles
Heatmap as **closed contours** (pink/teal blobs), price breaking levels, labeled last close / notional tags.

**Jobs:** continuous field of pressure in strike×time; less bar, more “weather map.”

---

## Shared chrome pattern (extract for VOLATERM)

Any “TRACE-class” desk should eventually share:

| Control | Purpose | v1 / later |
|---------|---------|------------|
| Metric mode | Gamma · Charm · (Vanna later) | v1 Gamma; Charm when we already have charm grid |
| Participant lens | MM / Customers / … | **Honest:** only “OI dealer convention” until real tags |
| Date | Session or as-of | v1 as-of chain snapshot |
| ODTE / DTE filter | 0DTE vs all | Filter expiries in our chain |
| Strike zoom / heatmap zoom | Density | UI only |
| Key levels | Walls, flip, move bands | We have walls/flip; move bands = IV×spot |
| Stability gauge | Composite “how pinned / how toxic” | Derive from net GEX + distance to flip + concentration |
| Dual plot | Strike profile ‖ time×strike field | **Core layout** for GEX desk upgrade |
| Tooltip history | 10/30/60m ago, day range | Needs **session memory** (we have `gexSession` spark; extend) |

---

## Utah Bloomberg guide (https://campusguides.lib.utah.edu/bloomberg)

Library guide is **policy + product definition**, not option-screen tutorials:

- Bloomberg = integrated platform: price, financials, news, trading data, multi-asset (equities, indices, FI, FX, futures, options, …).
- Interaction model: **command line + GO** (`TRAI <GO>` training, `BCER <GO>` certificates).
- Research use only on campus hardware; commercial use forbidden on their terminals.

**Carry into VOLATERM (already partially true):**
- Function codes + GO (`GEX`, `POS`, …) not SpotGamma menus.
- Integrated desks (vol + positioning + rates) under one shell — not a single vendor heatmap product.
- Do not imply we *are* Bloomberg or SpotGamma.

---

## Gap map: pics vs current VOLATERM

| Capability | Pics | We have today | Gap |
|------------|------|---------------|-----|
| Net GEX / walls / flip | #1–7,9 | `dealerExposure`, `GexLevelsStrip`, Positioning | Polish labels (Call wall, pin) |
| GEX by strike bars | #1,3,5,6,7 | Positioning / analytics strike series | Dual-color call/put; multi-tick “ago” markers |
| Intraday strike×time heatmap | #1,3,6,7,10 | Partial MacroVol `gex_grid` / canvas | **Need time axis history** of strike GEX, not one frame |
| Calendar multi-day heatmap | #2,4 | No | Needs daily snapshots × strike ladder stored or recomputed |
| Charm pressure field | #9 | `totalCharm`, charm grid in MacroVol, `hedgeFlow` text | Visual field + wall overlays |
| Participant split | #1 vs #3 | No real data | Do not fake; doc only |
| HIRO-like flow line | #3,9 | No OPRA | Skip or label experimental proxy later |
| Stability % | gauge | Partial via hedgeFlow tone | Single 0–100 from concentration + net GEX |
| Return histogram context | #8 | Home analytics possible | Optional Home card from hist prices |
| FlashAlpha / Massive | — | Keys eval only | External GEX levels cross-check, not full TRACE |

---

## Deliver-with-our-APIs (positioning focus)

| Layer | Source | Can power |
|-------|--------|-----------|
| Chain OI + mid | Yahoo / FMP (existing) | Strike GEX profile, walls, flip, net GEX, charm/vanna totals |
| Session memory | Client `gexSession` + extend | Sparks, “ago” samples if we sample often enough |
| Server GEX/charm grid | MacroVol `build_gex_grid` / charm | One-shot field; seed for heatmap if we persist |
| FlashAlpha | free 5/day stocks | Occasional levels API cross-check; **not** 15‑min poll; no free SPY |
| Massive | aggs | Spot/path candles under heatmap; not GEX math |
| True MM vs customer | — | Out of scope without paid feed |
| 1‑min institutional | — | Out of scope |

---

## Phased product plan (when we build — not this pass)

### Phase A — “Levels that matter” (high value, low fiction)
- Positioning desk: strike ladder polish (#5), call/put wall + flip + pin callouts (#7, #9 style labels).
- Stability chip from existing exposures.
- Key-levels overlay on any price spark we already show.
- Copy: “OI-inferred dealer convention” badge always on.

### Phase B — Dual canvas (TRACE layout skeleton)
- Left: GEX-by-strike; main: spot path + **session** heatmap built from **recorded** strike profiles (sample every N min while app open).
- Metric toggle: Gamma | Charm (reuse grids).
- No participant dropdown until data exists (or single disabled option “Assumed dealer short customer OI”).

### Phase C — Calendar heatmap (forward structure)
- Nightly or on-demand: store strike GEX snapshot per symbol/day.
- Heatmap date × strike (or strike as % moneyness).
- Single-name first (NVDA/AAPL); index aggregate later.

### Phase D — Aggregate / beta map (#2)
- Only if we have multi-name chain budget — expensive; **not** free FlashAlpha loop.
- Explicitly later.

### Explicit non-goals
- Clone SpotGamma TRACE chrome/logo/colors as brand.
- Fake “Market Makers vs Customers” without data.
- Promise 1‑min HIRO.
- Poll FlashAlpha every 15 minutes on free tier.

---

## TRACE marketing → our UI copy (when shipping)

Use **our** language:

| Avoid | Prefer |
|-------|--------|
| “TRACE / SpotGamma-grade” | “OI-inferred dealer GEX” |
| “1-minute institutional updates” | “Updates with chain refresh · last sample …” |
| “See what market makers are doing” | “Dealer-convention exposure from listed OI (assumption: customers long listed)” |
| “Five-day edge” | “Multi-day structure when snapshot history exists” |

---

## Pass 2 — 2026-07-13 (SpotGamma + VolSignals + Thalex)

### Sources

| Source | What we took |
|--------|----------------|
| [Geopolitical Risk Hits a Fragile Market](https://spotgamma.com/geopolitical-risk-hits-a-fragile-market/) | Narrative: **neg γ below level + put skew = trapdoor**; TRACE / Synthetic OI / dealer gamma / forward-vol language |
| [The Market's 0DTE Underbelly Is Exposed](https://spotgamma.com/the-markets-0dte-underbelly-is-exposed/) | Narrative: restored **strong +γ**; 0DTE underbelly; impact on **vol + path** after OPEX/FOMC-type regimes |
| [@spotgamma](https://x.com/spotgamma) | Live teaching: dealer long/short γ by name; **γ map flips** after tape bombs; OPEX walls; single-name support |
| [@VolSignals](https://x.com/VolSignals) + [thread 205635649…](https://x.com/VolSignals/status/2056356498905739494) | BofA-style decompose 0DTE vs expiring OI vs longer OI; **Charm yellow = MMs buy futures as decay**; long-γ vs short-γ realized vol regimes |
| [VS3D home](https://vs3d.volsignals.com/home) / [platform overview](https://vs3d.volsignals.com/home/docs/platform-overview) / [release notes](https://vs3d.volsignals.com/home/release-notes) | Product IA: Gradient Chart, Positions by Strike, Position Grid, by Expiration, dashboards; Gamma/Charm/Vanna; straddle lines; Delta Change greek; **claim “real MM positions not IV-inferred”** (we cannot match claim) |
| [@ThalexGlobal](https://x.com/ThalexGlobal) + [thalextech.github.io](https://thalextech.github.io/) | **Crypto options lab**: Simulator, Combo PnL, Straddle, Combo Greeks, Greeks, Option PnL, Break Even, Roll PnL, Basis, Subjective, Backtest, Delta Follower, Hedging, Option Grid |

### SpotGamma decision language (encode in UI copy / Explain)

| Concept | Meaning for traders | VOLATERM encoding |
|---------|---------------------|-------------------|
| Positive γ resistance | Dealers dampen into a strike (sell rips) | Label “+γ resistance / dampen zone” on strike field |
| Negative γ = free to move | Amplify path; wider expected range | “−γ free-to-move / toxic” band |
| Day rollover of γ map | 3/31 vs 4/1 structure change | Session boundary on time axis (Pack B #1) |
| 0DTE underbelly | Intraday inventory dominates path when longer OI thin | ODTE filter + net GEX split if we can tag DTE |
| Trapdoor | Neg γ **below** spot + heavy put skew | Combine GEX field + smile/skew strip on Home |
| Synthetic / proprietary OI | Their edge | We use **listed OI + dealer convention** only; badge always |

### VolSignals VS3D — tool map (from site + Pack B pics)

| VS3D view | Decision job | Math core | Our parity |
|-----------|--------------|-----------|------------|
| **Gradient Chart · Gamma** | Where hedge pressure stabilizes/amplifies vs time & price | Portfolio γ at every (S,t) under MM inventory | Partial: gex grid + path; no full live SPX MM book |
| **Gradient Chart · Charm** | Directional rehedge as clock runs (yellow buy / blue sell in their palette) | Revalue book +εt → Δdelta → hedge | We have charm totals + MacroVol charm grid; no full gradient sim UI |
| **Gradient · Vanna / Delta Change** | Vol-shock & instantaneous delta path | vanna / dΔ | Partial greeks |
| **Positions by Strike** | Orange short / blue long **net position** (not just γ) | Signed OI by strike (calls+puts) | We show GEX bars; **position bars** (Pack B #6/#9 legend) are cleaner UX |
| **Position Grid** | Strike × expiry matrix of size | OI or $gex cells | Chain table exists; **matrix heatmap** does not |
| **Straddle lines** | ±1× ATM straddle as “expected range” rails | ATM call+put mid | Easy win from chain |
| **Tooltip Gradient box** | Price, Exposure, $/percent, Hedge product to trade | MM risk units | Our Explain + levels strip can grow |
| **Dual panel Gamma+Charm** | Read path + time pressure together | Two gradients | Layout target for Phase B |
| **VIX expiry strike view** | Vol-of-vol / OPEX week structure | VIX options book | Later; equity first |
| **Educational callouts** | “Ceiling not active selling” | Narrative | `hedgeFlow` + Explain — keep educational, not signal |

**VS3D release notes (product maturity signal):** sync crosshairs; straddle lines on gradient; after-hours SPX; invert Charm colors; remove “simulated” greeks from gradient (they tightened honesty). **Lesson for us:** badge assumptions; don’t mix simulated and live without labels.

### Pack B image catalog (new 10 — keep Pack A)

| ID | Product | Feature |
|----|---------|---------|
| B1 | SpotGamma TRACE | **Overnight/day γ field** with annotations: “6600 +γ resistance”, “Neg γ = free to move”, 3/31 vs 4/1 panels |
| B2 | VS3D | Full-width **Gamma gradient** + price path + red contour islands right edge (EOD structure) |
| B3 | VS3D dashboard | **3-pane**: Positions by Strike ‖ Gamma gradient ‖ Charm gradient (gold/blue) |
| B4 | VS3D | **Position Grid** strike × expiry green/red cells (spot row highlight) |
| B5 | VS3D | VIX **Positions by Strike** + OPEX week narrative + 1× straddle rails + comparison dots |
| B6 | VS3D | Dense SPX 0DTE position ladder: gold left / blue right, straddle markers |
| B7 | VS3D | Pure **Charm gradient** (gold/blue lobes through session) |
| B8 | VS3D | **Gamma profile** teaching card: +γ above = rally ceiling, ODTE straddle, overnight range |
| B9 | VS3D | Legend pack: orange=short / blue=long position; green γ stabilizes; yellow/blue charm buy/sell futures |
| B10 | Thalex lab home | Tool grid: Simulator, Combo PnL, Straddle, Combo Greeks, Greeks, Option PnL, Break Even, Roll PnL, Basis |

### Thalex lab → VOLATERM (user preference: Grok owns charts)

| Thalex tool | Already in repo (lib/UI) | Gap / add |
|-------------|--------------------------|-----------|
| Simulator | `pathSim.ts` | Surface in Strategy / desk UI |
| Combo PnL / Option PnL | `greeksPnl.ts` | Historical mark path UI |
| Straddle | chain + break-even helpers | Dedicated straddle panel |
| Combo Greeks / Greeks | Greeks desk, surfaces | Multi-leg as f(S,T) — partial |
| Break Even | `breakEven.ts` | Panel polish |
| Roll PnL / Basis | `basis.ts`, BTC basis, rates basis | Crypto desk + equity forward curve |
| Subjective | `subjective.ts` | Wire to UI |
| Hedging / Delta follower | `hedging.ts` | Strategy sim panel |
| Option Grid | `optionGrid.ts` | Dense omega / N(d2) grid view |
| Backtest | — | Optional later |

**Insight:** Thalex is the **right model for VOLATERM crypto + strategy lab** (math we own). SpotGamma/VS3D are the **right model for equity Positioning desk chrome** (fields we approximate from OI).

---

## Unified tool taxonomy (20 pics → product modules)

```
POSITIONING DESK (equity / index / single-name)
├── Levels strip          [have] walls, flip, net GEX, spark
├── Strike position ladder [partial] → gold/blue net pos + GEX mode
├── Gradient field         [gap] Gamma | Charm | (Vanna) over time×spot
├── Key rails              [easy] ±1 straddle, call/put wall, flip
├── Position grid          [gap] strike × expiry heatmap
├── ODTE / All / Custom exp [partial]
└── Narrative brief        [have] hedgeFlow — expand with zone labels

STRATEGY / THALEX-CLASS LAB (esp. BTC desk)
├── Path simulator
├── Multi-leg greeks / PnL
├── Straddle / break-even
├── Basis / roll
├── Subjective valuation
└── Hedge rules sim

HOME BRIEFING
├── Regime: +γ / −γ / near flip
├── Trapdoor flags: skew + below-flip
└── Optional return percentile (Pack A #8)
```

---

## Benefit matrix — what to build first

| Priority | Module | Why | Data honesty | Effort |
|----------|--------|-----|--------------|--------|
| **P0** | Strike ladder gold/blue + mode GEX vs Net position | Highest information density; VS3D/TRACE core | OI dealer convention | M |
| **P0** | Zone labels on field (+γ resistance, −γ free-to-move) | SpotGamma teaching language | Same math | S |
| **P0** | ±1 ATM straddle rails on any price chart | VS3D release-note feature; cheap edge | Chain mids | S |
| **P1** | Gradient Gamma (session samples) | Dual-canvas TRACE/VS3D signature | Session history while app open | L |
| **P1** | Gradient Charm (dual stack with Gamma) | Path bias; VolSignals yellow=buy framing | Charm grid + time axis | L |
| **P1** | Position Grid strike×exp | Roll / OPEX concentration | Chain | M |
| **P2** | Overnight/session boundary on gradient | Pack B1 narrative | Time stamps | S |
| **P2** | Expose Thalex-class tools in UI (pathSim, subjective, grid) | User prefers Grok charts; libs exist | Local math | M–L |
| **P3** | Multi-day calendar GEX | Plan-ahead TRACE claim | Daily snapshots | L |
| **Never** | Claim “actual MM positions” / clone VS3D/TRACE brand | Legal + honesty | — | — |

---

## How the three vendors differ (so we don’t mush them)

| | SpotGamma TRACE | VolSignals VS3D | Thalex lab |
|--|-----------------|-----------------|------------|
| Asset | SPX/equity focus | SPX/VIX MM book | Crypto options (BTC) |
| Edge claim | Proprietary/Synthetic OI, HIRO-class flow | “Real MM positions” live | Transparent exchange math tools |
| Visual signature | Purple/red strike×time + ladder | Green/red γ gradient, gold/blue charm, dashboard tiles | Black tool cards, path fans, basis |
| Best steal for us | Narrative zones + ODTE underbelly | Dashboard 3-pane IA + straddle rails + gradient/charm dual | Full strategy lab surface for BTC/STRAT |

VOLATERM = **BBG-ish shell** + **OI-honest positioning (TRACE/VS3D jobs)** + **Thalex-class math lab** (already half-built in `src/lib/options/*`).

---

## Next research passes

- [x] Pack B catalog + SpotGamma posts + VS3D docs + Thalex grid
- [ ] Screenshot our live `GEX` / Positioning for side-by-side
- [ ] Wireframe: P0 ladder + straddle rails + zone labels (Grok implement when approved)
- [ ] Optional FlashAlpha levels probe after **key rotate**
- [ ] More user pics → append Pack C (do not drop A/B)

---

## Change log

| Date | Note |
|------|------|
| 2026-07-13 | Initial catalog of Images #1–#10 + TRACE jobs + Utah BBG guide notes + phased plan |
| 2026-07-13 | Pass 2: Pack B (VS3D/Thalex/TRACE), SpotGamma weeklies + X, VS3D platform, Thalex lab, unified taxonomy + P0–P3 |
