# W5 Home Chrome Density

**Goal:** Density + sparklines on Home chrome — Launchpad, DES, Hist IV, shared/vol strips. No new data vendors.

**Scope**
- `DeskSpark` — shared inline spark (stroke + optional wash fill)
- `SecurityDesCard` — denser DES prints + GP/HIVG sparklines
- `HistIvStrip` — PrintStrip density + spark
- `LaunchpadGrid` — denser function-code grid
- `ThreeVolStrip` · `SharedDeskStrip` — black-field strip density

**Non-goals:** New APIs; Academy (W6); Rates/Trade rework; fake Live badges.

**Done when**
- [x] DES shows print-style ATM/rank/nearest + GP spark when path present
- [x] HIVG strip uses denser prints + spark (no dummy series)
- [x] Launchpad is denser mono grid (LPAD chrome)
- [x] Three-vol + shared desk strips use desk black/40 density
- [x] Existing DES/HIVG tests green; kit smoke tests
