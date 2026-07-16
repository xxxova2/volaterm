# Reading Session Positioning


---

## 1. Product jobs (translated from commercial positioning tools)

| Job | Question |
|-----|----------|
| Act on forming pressure | Where is gamma concentrated vs spot **now**, and how did it change through the session? |
| Plan multi-day | Where does dealer γ stack as spot walks across dates? |
| Trade levels that matter | Walls, flip, pin zones from options structure |
| Validate participants | MM vs customer vs retail — **requires tagged data** |

This terminal prioritizes honest jobs: OI-based levels, session samples while open, public chains. It does **not** fake OPRA participant tapes or 1-minute institutional HIRO-style feeds without data.

---

## 2. Strike ladder

Dense bar chart of signed GEX (or call vs put components) by strike.

**Jobs:** max positive / negative strikes at a glance; distance from spot to walls; visual mass.

---

## 3. Intraday heatmap (strike × time)

When session memory records strike profiles over the day:

- X or Y as time; other axis strikes.  
- Color as gamma notional or charm.  
- Spot path overlaid.

**Jobs:** did the pin ridge hold? did negative gamma expand below? when did the structure flip?

Tooltip literacy (when present): strike, GEX $, percentiles, samples from N minutes ago, day min/max.

---

## 4. Calendar heatmap (date × level)

Multi-day planning view:

- Axis: calendar date vs price level (or moneyness).  
- Color: long γ dampen vs short γ amplify.  
- Spot band horizontal.

**Jobs:** where pressure intensifies or fades across the week; single-name wall planning.

Building true calendars needs stored daily snapshots—use when the app provides them; otherwise recompute mental calendars from daily profiles.

---

## 5. Stability and key levels

Educational composites:

- **Stability / pin gauge:** concentration of GEX + distance to flip + net sign.  
- **Key levels:** call wall, put wall, flip, implied 1-day move band from ATM IV.  
- **Expected move rails:** straddle-implied ranges as context, not targets.

---

## 6. Metric modes

| Mode | Story |
|------|-------|
| Gamma | Dampen vs amplify vs spot |
| Charm | Path bias through time |
| Vanna (when available) | Vol-driven delta drift |

Toggle metrics; do not assume one heatmap answers all questions.

---

## 7. Session checklist

1. Net GEX sign and nearest walls.  
2. 0DTE vs all-exp agreement.  
3. Charm bias note.  
4. Skew direction of change on vol desk.  
5. Plumbing regime (is today a macro risk day?).  
6. One invalidation: “If spot closes beyond ___ with ___ GEX flip, narrative breaks.”

---

## 8. Key takeaways

1. Every chart needs a decision job.  
2. Session memory turns snapshots into paths.  
3. Participant splits are optional truth, not default.  
4. Stability is composite, not magic.  
5. Combine with vol surface always.

---

## 9. Study path

Continue to *Three Linked Machines* and Tools curriculum for desk navigation.
