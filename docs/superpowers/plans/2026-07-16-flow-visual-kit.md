# W2 Flow Visual Kit Plan

**Goal:** Re-skin Flow (Positioning Book + Tools) with the Trade desk kit — Thalex craft (A) on GEX/session charts, Bloomberg density (B) on chain/levels/prints. Math and data paths unchanged.

**Scope**
- `PositioningView.tsx` — main GEX profile, OI/near-spot tools charts, print strips, denser levels
- `SessionGexHeatmap.tsx` — black field panes + axis caption grammar
- Reuse only: `DeskChartFrame`, `deskChartChrome`, `deskAxisLabel`, `PrintStrip`, `DESK_SERIES`, `DeskModeBar`

**Non-goals:** Extract PositioningView into many files; new metrics; Thalex embeds; Vol Greeks redesign.

**Done when**
- [x] Main dealer chart has black field + Strike / Net $M axis titles
- [x] CR · PS · HVL · Flip · Σ on PrintStrip (not marketing cards)
- [x] Tools levels + risk budget use PrintStrip density
- [x] Session heatmap panes use black field + strike/time captions
- [x] Existing tests green; smoke test for Flow kit chrome
