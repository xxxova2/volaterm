# Bloomberg Terminal — Visual & UX Research Log

| Field | Value |
|-------|--------|
| **Status** | Living document — multi-pass |
| **Started** | 2026-07-13 |
| **Product** | VOLATERM |
| **Principle** | Inspire density + command language; never clone branding or fake institutional feeds |

---

## Pass 1 — 2026-07-13 (baseline)

### Sources

| Type | Examples |
|------|----------|
| Official UX | Bloomberg “Designing the Terminal for Color Accessibility” (Launchpad screenshot, CVD themes, amber non-semantic) |
| 101 manuals | Student Getting Started PDF; NYU/Columbia/CFI function lists |
| Product | professional.bloomberg.com/products/bloomberg-terminal |
| Culture | Reddit (density, codes over menus); HN amber/green history |
| X / video | Hampton function threads; Launchpad tutorial thumbs; @TheTerminal |
| Visuals inspected | Launchpad CVD PNG (multi-tile black grid); tutorial channel thumbs |

### Style tokens (public, re-interpretable)

| Token | BBG observation | VOLATERM action |
|-------|-----------------|-----------------|
| Canvas | Near-black | Keep graphite/black |
| Amber | Editable fields + brand text | Optional: style command inputs amber |
| Green/Red | Up/down semantic | Keep; consider CVD blue/red opt later |
| Red function bar | Title strip on function windows | Optional desk chrome strip |
| Density | No empty marketing whitespace | Home packs 1–5; continue |
| Font | Mono / Prop Unicode heritage | `font-mono` + dense type scale |
| Launchpad | Multi-monitor tiles, sparklines in cells | LaunchpadGrid + last-seen metrics |
| Grammar | Ticker load once; mnemonic + GO | Header symbol + functionRegistry |

### What we will **not** ship

- Licensed Bloomberg mnemonics as product brand
- Instant Bloomberg / fake news terminal
- Multi-live OPRA cosplay
- Full FA/ANR research suite without paid data

### Deliver-with-our-APIs matrix (high level)

| BBG-ish role | Our data | Visual target |
|--------------|----------|---------------|
| OMON | Yahoo/FMP chain | Dense chain table |
| OVDV/SKEW | Vol Structure + MacroVol | Surface + smile |
| Greeks | MacroVol + BS mesh | Greeks desk |
| DES/GP | Quote + FMP hist + DES card | Home |
| HIVG | Live frame ring | Combined DES/HIVG |
| GEX levels | OI-inferred + optional FlashAlpha | Positioning (honest source badge) |
| Rates/SOFR | FRED / NY Fed / MacroVol | Rates desk |
| Quote tape | FMP / Massive aggs | Header + DES |

### Next research passes

- Pass 2: more Launchpad / monitor screenshots; table cell spark patterns
- Pass 3: options functions OMON/OVDV stills from public tutorials
- Pass 4: token CSS proposal (amber fields, red desk bar) for Hy3 pack

---

## Change log

| Date | Note |
|------|------|
| 2026-07-13 | Pass 1 scaffold after orchestration Home packs 1–5 |
