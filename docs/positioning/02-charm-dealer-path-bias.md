# Charm and Dealer Path Bias


---

## 1. Charm defined

\[
\mathrm{Charm} \approx \frac{\partial \Delta}{\partial t}
\]

Even if spot is unchanged, the passage of time changes option deltas—especially near ATM and near expiry. Anyone delta-hedging must trade the underlying (or futures) to stay neutral.

---

## 2. Dealer translation

Under customer-long / dealer-short conventions:

- As short calls decay toward zero delta when OTM, dealers who hedged with **long futures** may **sell futures** as hedges shrink.  
- As short puts decay, the mirror image can produce **buying**.  
- Zones of “bullish charm” vs “bearish charm” are maps of **forced flow bias through the clock**.

Teaching case used in flow education:

- Dealer short calls (customers bought calls), already hedged with long futures.  
- As the 0DTE straddle cheapens or price leaves the largest short-call concentration, dealers sell futures.  
- That is a **mechanical path bias**, not a forecast of news.

---

## 3. Intraday seasonality of risks

Rough educational pattern many vol desks discuss:

- **Open / morning:** often more sensitive to **vanna** (IV re-marks, overnight gap digestion).  
- **Midday / afternoon into close:** **charm** weight can rise as pure time decay of deltas into expiry dominates, especially 0DTE.

Reality is name- and event-dependent. Use the pattern as a question generator: “Is today’s P&L from IV mark or from clock decay?”

---

## 4. Charm vs GEX

| | GEX | Charm |
|---|-----|-------|
| Main driver | Spot move convexity | Time passage |
| Hedge trigger | \(dS\) | \(dt\) (and moneyness drift) |
| Chart job | Dampen/amplify zones | Path of least resistance through time |

TRACE-style “charm pressure” modes exist in commercial tools; this terminal exposes charm totals/grids/profiles where data allows. Same honesty rule: OI conventions, not participant tape.

---

## 5. Study drill

1. Note spot flat for 30 minutes.  
2. Observe whether model deltas of large OI strikes migrate.  
3. Infer hedge direction for a short-call-heavy book.  
4. Compare to actual futures/ETF path—sometimes aligns, often confounded by news and vanna.  
5. Journal misses: what else moved (IV, order flow)?

---

## 6. Key takeaways

1. Charm moves delta without news.  
2. Dealer futures flow can be pure clock.  
3. 0DTE magnifies charm.  
4. Vanna and charm co-exist; path is contingent.  
5. Use as mechanics education, not autopilot signals.

---

## 7. Study path

Continue to *Walls, HVL, Magnets, and Dealer Mode*.
