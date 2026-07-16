# Macros, Plumbing, Greeks & MenthorQ-style GEX — research (living)

| Field | Value |
|-------|--------|
| **Status** | Phase 0–3 **shipped** (MenthorQ GEX + plumbing + Taylor + dual gradients + charm/vanna + 1D book Δ + cash–futures monitor) |
| **Started** | 2026-07-13 |
| **Product** | VOLATERM |
| **Principle** | Enrich **what we already have** (Rates/Plumbing, Greeks desk, Positioning GEX, surface); do not clone MenthorQ/Conks brands; keep vol surface quality bar |

Related: `docs/POSITIONING_TRACE_RESEARCH.md`, `docs/BLOOMBERG_VISUAL_RESEARCH.md`, `docs/API_PROVIDERS_EVAL.md`.

---

## What we are building (mental model)

VOLATERM is **three linked machines**, not three disconnected charts:

```
PLUMBING (Rates)          → cost of leverage / funding stress
        ↓
VOL + GREEKS              → price of risk (θ / γ / vanna / volga)
        ↓
POSITIONING (GEX/DEX)     → where dealers rehedge → path of equity
```

- **@conksresearch / OnlySOFRs** teach *why* SOFR, RRP, basis, SLR matter.
- **@bennpeifert** teaches *how* option P&L actually works (θ ≠ free money).
- **@MenthorQpro** packages *where* GEX/DEX walls sit for a symbol.
- **@minus1_12 / Thalex** packages *lab tools* for crypto options math.
- **@Souvik131 / TradingAlgo** packages open-source dashboards (GEX, surface, forward vol).

Our job: **honest public-data versions** of these decision jobs inside existing tabs.

---

## MenthorQ profile language (Pack C — images)

### Chart type: Net GEX All Expirations (QQQ / SPX)

| Visual | Meaning |
|--------|---------|
| **Green bars** | Positive GEX at strike (dealer long γ → dampen) |
| **Orange/red bars** | Negative GEX (amplify / free-to-move) |
| **Yellow line — GEX Profile** | Cumulative / profile of net GEX across strikes (shape of the book) |
| **Orange line — DEX Profile** | **Delta Exposure** profile (directional hedge pressure, not γ) |
| **Red dashed — Call Resistance** | Largest call-side wall above spot |
| **Green dashed — Put Support** | Largest put-side wall below spot |
| **Yellow dashed — HVL** | **High Vol Level** — often largest |GEX| or “vol magnet” / key vol strike |
| **Blue/white dashed — Spot** | Current price |

**Decision jobs:**  
1) Am I *above* HVL / call resistance (bullish structure intact) or *testing* walls?  
2) Is spot in a **+GEX cluster** (pin/consolidation) or **−GEX trough** (range expand)?  
3) DEX profile skew tells whether *delta* rehedging pushes up or down as spot walks.

### Multi-expiration 2×2 (Image #4)

Four panels: First exp · Next exp · Highest GEX exp · 2nd highest GEX exp.  
Annotations: highest GEX cluster, spot vs resistance, long-dated anchor.  
Narrative box: “gamma-pinned consolidation — break needs conviction past +$X GEX.”

### Expiry table (Image #3)

| Columns | Use |
|---------|-----|
| DTE, GEX, DEX | Per-expiry totals |
| GEX/DEX/OI Normalized | Share of book |
| GEX/DEX Change 1D | Flow / OI change proxy |
| Call Resistance, Put Support, High Vol Level | Levels **per expiry** |
| Expiry Exp. Move | Expected move to that expiry |

**Tot. Exposure row** = aggregate. Color bars for magnitude.

### Map to VOLATERM today

| MenthorQ | We have | Gap |
|----------|---------|-----|
| Net GEX by strike | `dealerExposure` + Positioning | Polish chart: dual GEX+DEX profiles |
| Call/Put wall | `callWall` / `putWall` | Rename rails Call Resistance / Put Support in UI |
| Gamma flip | `gammaFlip` | Keep + explain |
| HVL | — | Derive: strike of max \|GEX\| or max OI×γ |
| DEX profile | Partial (`totalVEX` is vanna-ish; true DEX = Σ Δ×OI) | Add **DEX by strike** series |
| Multi-exp small multiples | Chain by expiry | 2×2 “focus expiries” view |
| Expiry matrix table | Chain table | Dense MenthorQ-style table + 1D Δ if we sample |

**Enhance path (Grok charts):** rebuild Positioning **Dealer** panel as MenthorQ-class profile (bars + GEX/DEX curves + HVL/CR/PS), not a new product brand.

---

## Plumbing — Conks + OnlySOFRs (Macros tab)

### Core thesis (Conks threads)

1. **Unsecured → secured standard** after GFC: Basel III / SLR / G-SIB → banks as utilities; risk in **shadow banks + repo**.
2. **Repo > Fed Funds** as the true funding complex; EFFR is often regulatory arb (FHLB → foreign banks → IORB).
3. **Fed Volatility Suppressor™**: unlimited UST buying / facilities when “safe assets” fail in a dash-for-cash (Mar 2020).
4. **Cash-futures basis trade**: long cash CTD / short futures / finance in bilateral repo → huge leverage; margin + rollover risk = unwind.
5. **RRP drain / excess cash → excess collateral**: when RRP → 0, private repo rates set the market; SRF is the ceiling; hierarchy of rates matters.
6. **Primary dealers** absorb less of auctions → market-based finance fragility.

### OnlySOFRs primer structure (map to our Rates sections)

| Primer part | Content | VOLATERM section already | Enhance |
|-------------|---------|--------------------------|---------|
| P1 Money markets / repo | Hierarchy: RRP floor · private repo · IORB · SRF ceiling; SOFR−EFFR = dealer capacity | `sec-mm-strip`, `sec-plumbing`, `sec-basis` | Regime chip: **excess cash vs excess collateral**; SOFR−EFFR barometer callout |
| P2 UST basis | Cash–futures basis, CTD, delivery options | Partial auctions / curves | Educational Explain; later futures basis if data |
| P3 Swaps | Swap spreads, convexity bias futures vs swaps | Curves / STIR | SERFF / SOFR path already partial |
| P4 RV | PCA level/slope/curve, butterflies | `sec-shape` | Residual / fly cards (later) |
| P5 FX XCCY | Dollar funding stress | `sec-fx` | Cross-currency basis series if we get data |
| P6 Macro flows | BoP / issuance | Macro | Keep high-level |

### Rates desk enhancement priority (plumbing)

| Priority | Enhancement | Data |
|----------|-------------|------|
| **M0** | Briefing strip: SOFR, EFFR, IORB, SOFR−EFFR, RRP bal, reserves — with **regime label** | FRED/NY Fed (already) |
| **M0** | Explain tooltips: RRP floor / SRF ceiling / why SOFR can > EFFR | Copy only |
| **M1** | Plumbing hierarchy diagram (static + live numbers) like Conks “repo hierarchy” | Existing prints |
| **M1** | ON basis history prominence (already `sec-basis`) | Keep |
| **M2** | Auction + issuance stress next to dealer capacity | FiscalData |
| **Later** | Cash-futures basis monitor | Needs futures feeds |

Do **not** claim we “see” G-SIB scores or NCCBR haircuts without data.

---

## Greeks — Benn Eifert lessons (enhance GRK tab)

### Taylor identity (must live in Explain / desk copy)

```
dV ≈ θ dt + Δ dx + ν dσ + ½ Γ dx² + ½ Volga dσ² + Vanna dx dσ
```

| Lesson | Product implication |
|--------|---------------------|
| θ is **not** free income | Short option cards show **θ vs expected γ/volga cost** |
| Short options pay the piper on Γ, volga, vanna | Greeks desk: stack **γ / vanna / volga / charm** not only Δ |
| Variance drag | Optional Home/portfolio note (compound growth) |
| Tail hedges can lose standalone but help **portfolio** compound | Strategy lab later — not fake signals |
| GVV links surface shape to risk factors | Keep **surface** as gold standard; Greeks mesh already points this way |
| VRP / term structure / skew / FVA / VIX basis | Term + smile desks; glossary |

### Greeks tab enhance list

| Have | Enrich |
|------|--------|
| ATM cards, Plotly surface, 3D mesh (user loves) | Keep; don’t dumb down |
| Charm / vanna in MacroVol | **Profile vs strike** (MenthorQ DEX sister) + time-decay narrative |
| hedgeFlow brief | Embed Benn language: “θ pays for asymmetric risk” |
| Greeks PnL helpers | Surface **GVV-style** attribution panel on desk |

---

## Accounts

| Handle | Role for us |
|--------|-------------|
| [@conksresearch](https://x.com/conksresearch) | Plumbing narratives + diagrams → Rates Explain + hierarchy UI |
| [conks.plumbing](https://www.conks.plumbing/) | Substack “global monetary mechanics” |
| [OnlySOFRs](https://onlysofrs.substack.com/p/the-plumbing-the-basis-and-the-end) | Structured SOFR/repo/basis syllabus → Rates roadmap |
| [@MenthorQpro](https://x.com/MenthorQpro) | GEX/DEX/HVL chart grammar → Positioning enhance |
| [@minus1_12](https://x.com/minus1_12) | Thalex founder → crypto lab tool surface (already mapped) |
| [@bennpeifert](https://x.com/bennpeifert) | Greeks truth + VRP → Greeks copy + risk panels |
| [@perfiliev](https://x.com/perfiliev) | Curated Benn index |
| [@Souvik131](https://x.com/Souvik131) / [TradingAlgo tools](https://tradingalgo.blr1.digitaloceanspaces.com/index.html) | Open dashboards: GEX, 3D surface, forward vol matrix, expected move — **feature checklist**, India-focused |

### TradingAlgo tool checklist vs us

| Their tool | Us |
|------------|-----|
| 3D Vol Surface | **Keep / love** — gold standard |
| GEX Dashboard | Enhance Positioning to MenthorQ class |
| Forward Vol Matrix | Term / calendar — partial |
| Expected Move | Easy from ATM straddle (align MenthorQ + VS3D rails) |
| Market beta / corr | Rates asset corr partial |
| MCX smile / India G-sec | Out of scope unless we expand geo |

---

## Unified enhance roadmap (existing tabs only)

### 1. Positioning / GEX (MenthorQ-class) — **P0**

- Single chart: green/red GEX bars + **GEX profile** + **DEX profile** + spot / CR / PS / **HVL**.
- Mode: All expirations | 0DTE | selected exp.
- Optional multi-exp 2×2 for top GEX expiries.
- Expiry table: GEX, DEX, % of book, walls, HVL, exp move.
- Badge: OI-inferred dealer convention.

### 2. Macros & Rates (Conks/OnlySOFRs) — **P0–P1**

- Top **plumbing barometer**: SOFR−EFFR, RRP, reserves, IORB, regime chip.
- Hierarchy visual (RRP → private repo → Wall St repo → SRF).
- Explain copy from primers (no hype branding).

### 3. Greeks (Benn) — **P1**

- Taylor / GVV Explain always one click away.
- Strike profiles for Δ exposure (DEX), γ, charm, vanna.
- θ card reframed as risk compensation.
- Keep surface quality.

### 4. Cross-desk links

- Home: plumbing regime + GEX sign + ATM IV (trapdoor = −γ + fat put skew).
- Rates stress → higher vol regime note on vol desk (educational).

---

## Explicit non-goals

- Clone MenthorQ / Conks / VS3D branding or proprietary OI.
- Fake basis-trade size or G-SIB scores.
- Replace loved vol surface with weaker heatmaps.
- Poll FlashAlpha every 15m free.

---

## Change log

| Date | Note |
|------|------|
| 2026-07-13 | MenthorQ C pack + Conks/OnlySOFRs/Benn/TradingAlgo/Thalex map; enhance existing Macros & Greeks & GEX |
| 2026-07-13 | **Build Phase 0–1:** Positioning MenthorQ-class net GEX bars + GEX/DEX cum profiles + CR/PS/HVL + expiry matrix + multi-exp; Rates `PlumbingBarometer` + hierarchy; Greeks Taylor/GVV strip; analytics `highVolLevel` / `dealerProfiles` / `dealerExposureByExpiry` |
| 2026-07-13 | **Build Phase 2:** Dual TRACE-style GEX+Charm calendar gradients (`dealerCalendarGrid` + `DealerGradientPanel`); Greeks charm/vanna unit profiles + OI-weighted strike strip on G1.0; glossary `dealerGradient` |
| 2026-07-13 | **Build Phase 3:** `gexBookStore` 1D/session GEX·DEX Δ on expiry matrix; Rates `CashFuturesMonitor` (Tsy fut × cash yields × SOFR, not CTD); Positioning Levels equity forward/basis strip |
