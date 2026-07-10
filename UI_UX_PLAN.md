# VOLATERM — Frontend UI/UX Upgrade Plan

Status: **Phases A–H complete** · Design `DESIGN.md` + UI alignment program · 2026-07-10

---

## Shipped

| Phase | Highlights |
|-------|------------|
| **A** Density | Jump nav, collapsibles, DV01 collapsed, bottom strip, chrome shrink |
| **B** Visual | Dense/readable (**D**), chart theme, panel chrome |
| **C** Nav | `[` `]` sections, context bar, Home deep-links |
| **D** Trust | LIVE/DELAYED/STALE chips, EmptyState, skeletons |
| **E** Interact | Imply drawer, sticky/virtual boards, CSV export, section boundaries |
| **F** Desks | γ-flip callout, blotter-first MM, dual BTC/ETH tape, strike zoom |
| **G** Perf | Virtualized SR3 strip, `content-visibility` below-fold, chain CSV |
| **H** Align | UI system alignment — trust honesty, shared chrome, chart tokens, LIVE-only docs |

---

## Phase H — UI system alignment (PR-UI-01…09)

Residual polish after A–G so Rates / Crypto / Equity / Macrovol read as one terminal. Product remains **LIVE-only** (no demo product mode).

### Alignment decisions

| Decision | Rationale |
|----------|-----------|
| **MODE LIVE ≠ freshness** | Header product-mode chip is muted `MODE LIVE`; domain trust uses `FreshnessChip` / `classifyDomainFreshness` (KD-UI-13). Never paint permanent green LIVE as data age. |
| **L re-asserts LIVE** | Runtime `L` calls `setSource('live')` + toast — not Live/Demo toggle. Overlay, README, and Appendix A must match. |
| **Soft sub-nav grammar** | Desk section chips: soft `bg-primary/20 text-primary`. TabNav keeps underline active. Edition CTAs (e.g. Greeks 1.0) may stay solid primary. |
| **Chart colors from tokens** | Hex literals only in `chartTheme.ts` (`CHART` / `CANVAS` / `CHART_RESOLVED` / Plotly helpers). Views consume tokens. |
| **PlaybackBar mount** | Between SidePanel and StatusBar when `historicalFrames.length ≥ 2` (KD-UI-06); zero vertical cost when absent. |
| **Orphans deleted** | `MacrovolView`, `MacroView`, `MarketView` removed — not in shell switch; avoid accidental second-skin routes (KD-UI-17). Linked legacy (`Greeks10View`, `IVSurfaceMacro`) stay reachable and rethemed. |
| **7-desk IA** | Home · Vol · Positioning · Greeks · MM · Crypto · Rates — unchanged. |

### PR map (Phase H)

| PR | Focus |
|----|--------|
| PR-UI-01 | Honest trust chips, EmptyState LIVE-only copy, DeskContextBar provenance |
| PR-UI-02 | Shortcuts ⌨, L copy, PlaybackBar remount, SymbolDialog for S |
| PR-UI-03 | Shared `DeskChrome` / `DeskModeBar` sub-nav grammar |
| PR-UI-04 | Recharts → `chartTheme` (Rates + equity series) |
| PR-UI-05 | Canvas 2D + R3F materials → `CANVAS` / resolved tokens |
| PR-UI-06 | Shared empty/loading copy catalog |
| PR-UI-07 | Density type + panel/table completeness |
| PR-UI-08 | Greeks10 + IVSurfaceMacro Plotly on terminal tokens |
| PR-UI-09 | Docs (this file, README, DESIGN shell truth) + orphan hygiene |

### Verify Phase H

1. Header shows muted **MODE LIVE** + data summary ≤ StatusBar trust  
2. **?** / ⌨ overlay: `L` = **Refresh LIVE feeds** (no Live/Demo toggle)  
3. PlaybackBar appears only with ≥2 historical frames  
4. README key table matches overlay; no primary “Synthetic demo” feature bullet  
5. `src/components/views/` has no `MacrovolView` / `MacroView` / `MarketView`  

---

## How to verify (A–G + H)

1. **Rates** — STIR board scrolls with virtualized rows · **CSV** button · click imply chip  
2. **Positioning** — ±5/10/20% strike zoom · γ-flip banner  
3. **Crypto (6)** — dual BTC|ETH tape; click to switch active book  
4. **MM Desk** — blotter Σ first  
5. **D** density · **[ ]** section jump  
6. **L** re-asserts LIVE feeds · **?** shortcuts match README  

---

## Optional later
- Full dual-chain charts for both BTC and ETH simultaneously (not just tape)
- Chrome height density vars (type/panels already density-aware)
- Virtualize remaining boards if needed
- Paid OPRA streaming

## Shortcuts
| Key | Action |
|-----|--------|
| 1–7 | Desks |
| [ ] | Section |
| D | Density |
| R | Refresh data |
| S | Symbol search |
| L | Refresh LIVE feeds |
| ? | Shortcuts overlay |
