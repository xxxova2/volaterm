# W3 Vol Secondary Charts (Smile · Term · Fit)

**Goal:** Re-skin Smile, Term, and Surface Fit with the desk kit — black chart field, axis unit titles, ATM mark, ordinal expiry colors, PrintStrip metrics. Math and data paths unchanged.

**Scope**
- `SmileView.tsx` — X mode (log-m / K / Δ), IV% Y, ATM ref line, SVI overlay, expiry chips via ordinal palette
- `TermView.tsx` — √DTE X, ATM IV% Y, HV overlay, print strip for front/back/slope/VRP
- `ArbitrageView.tsx` (Surface Fit) — heatmap frame + axis captions, mode bar, SVI/arb print strip

**Reuse:** `DeskChartFrame`, `deskChartChrome`, `deskAxisLabel`, `PrintStrip`, `DeskModeBar`, `CHART_SERIES_ORDINAL`, `DESK_SERIES`

**Non-goals:** Surface 3D / Greeks redesign; new fit math; Thalex embeds.

**Done when**
- [x] Smile: black field, axis titles match X mode + IV%, ATM mark on moneyness/strike
- [x] Smile: PrintStrip ATM · RR · Fly; DeskModeBar for X mode
- [x] Term: black field, DTE / ATM IV% titles; PrintStrip front/back/slope
- [x] Fit: black field captions Strike · DTE; DeskModeBar Combined/Calendar/Butterfly; PrintStrip RMSE · Cal · Fly
- [x] Existing Smile/Term/Arbitrage tests green; kit smoke tests
