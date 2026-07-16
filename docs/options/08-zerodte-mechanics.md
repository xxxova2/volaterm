# What 0DTE actually changes


---

## 1. What 0DTE is

**0DTE options** expire on the same calendar day you are trading them. In index complex products, they now account for a large share of volume. Economically they are:

- Extremely high **gamma per premium** near ATM  
- Extreme **theta** (almost all remaining value is variance for the rest of the day)  
- Sensitive to **pin** and **dealer rehedging** into the close  

They are not a separate asset class; they are the front of the surface with almost no calendar left.

---

## 2. Stack the gammas — never one number

Institutional commentary often splits gamma into components. Educational stack:

| Component | Meaning |
|-----------|---------|
| **0DTE gamma** | Same-day expiry contracts’ contribution |
| **Expiring OI gamma** | Contracts that expire today (may include 0DTE and other same-day) |
| **Non-expiring gamma** | Longer-dated book still on |

These can have **different signs**. Example teaching case:

- Index average long gamma over a week from the total book  
- But **0DTE gamma negative** (amplifying) while **expiring and non-expiring positive**  

If you only look at “net GEX,” you miss that the **intraday path** may be driven by the 0DTE slice while the multi-day anchor sits in longer OI.

**Rule:** stack the three; do not worship a single aggregate.

---

## 3. Charm on 0DTE

Charm = how delta changes as time passes. On 0DTE:

- As the clock runs, ATM options’ deltas migrate toward 0 or ±1 depending on path.  
- Dealers hedging customer flow must **buy or sell futures** as deltas decay—even if spot is unchanged.  
- Crossing into “bullish charm” or “bearish charm” zones is a **path bias**, not a prophecy.

Teaching narrative used in flow education:

- Customers long calls → dealers short calls → dealers long futures as hedge.  
- As the 0DTE straddle cheapens or price leaves the largest short-call mass, dealers **reduce long futures** → selling pressure.  
- Symmetric stories exist for puts.

This is **mechanics**, not a trade recommendation.

---

## 4. Pin risk and magnets

Large open interest at a strike near spot into expiration can create **pin** dynamics:

- Dealers long gamma near the strike dampen moves (mean reversion toward the mass).  
- Into the final hour, gamma explodes ATM; hedges become hair-trigger.  
- After expiry, the pin **vanishes**—next day’s book is a new map.

Positioning magnets are **not** classical technical support; they are **hedging-induced** and temporary.

---

## 5. Risks unique to 0DTE learners

1. **Lottery asymmetry:** cheap OTM 0DTE options are lottery tickets; sellers face jump risk in minutes.  
2. **Model θ is almost meaningless** mid-day without path; variance is realized in ticks.  
3. **Liquidity holes** around data releases.  
4. **Confusion between volume and open interest:** volume can be noise; OI structure matters for gamma maps.  
5. **Assuming participant tags** (MM vs customer) without data—this terminal uses **OI dealer conventions**, not omniscient flow tape.

---

## 6. How to study 0DTE in the app

1. Filter GEX / chain toward **0DTE / nearest expiry**.  
2. Compare all-expiry GEX vs 0DTE-only if available.  
3. Read charm / hedge-flow notes for directional bias from time.  
4. Watch walls (call resistance / put support) vs spot through the session.  
5. After expiry, note how the map resets next open.

---

## 7. Key takeaways

1. 0DTE is concentrated residual variance and gamma.  
2. Always stack 0DTE vs longer gamma.  
3. Charm creates futures flow without spot news.  
4. Pins expire.  
5. Treat flow narratives as education in mechanics, not signals.

---

## 8. Study path

Continue to *Charm & Dealer Path Bias* and *Reading the Positioning Desk*.
