# VOLATERM — Frontend UI/UX Upgrade Plan

Status: **Phases A–G core complete** · Design `DESIGN.md` PR-01…09 implemented · 2026-07-09

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

---

## How to verify

1. **Rates** — STIR board scrolls with virtualized rows · **CSV** button · click imply chip  
2. **Positioning** — ±5/10/20% strike zoom · γ-flip banner  
3. **Crypto (6)** — dual BTC|ETH tape; click to switch active book  
4. **MM Desk** — blotter Σ first  
5. **D** density · **[ ]** section jump  

---

## Optional later
- Full dual-chain charts for both BTC and ETH simultaneously (not just tape)
- Keyboard row focus / copy-cell
- Virtualize SERFF / calendar boards too
- Paid OPRA streaming

## Shortcuts
| Key | Action |
|-----|--------|
| 1–7 | Desks |
| [ ] | Section |
| D | Density |
| R / S / L / ? | Refresh / symbol / live / help |
