# The variance risk premium, without the mystique

**Deck:** Why sellers of insurance get paid on average — and when they don't.  
**Desk:** Term · Smile · Surface · Greeks  
**Level:** Intermediate+

---

![VIX — market price of near-term uncertainty (FRED)](/docs/academy/figures/charts/vix.png)


## 1. Definition

The **variance risk premium** is the idea that, on average over long samples, **implied variance exceeds realized variance** for many equity index options. Option sellers earn a risk premium for bearing variance risk that buyers want to shed (portfolio insurance demand, institutional hedging, convexity preference).

VRP is an **average, ex post statistical phenomenon**, not a daily ATM.

**Honesty on this terminal:** study **implied vs realized** (e.g. front ATM IV vs RV20 close-to-close).  
Do **not** call “ATM IV − VIXCLS” a VRP without labeling it as **VIX basis** — VIX is a separate index construction, not your SPY chain ATM.

---

## 2. Link to the Taylor identity

For ATM options, model logic ties θ to expected gamma P&L. If the market sets IV **above** the vol that later realizes, short gamma tends to win **on average**: theta collected exceeds gamma paid.

If IV is **below** what realizes (or path is jump-heavy), shorts lose despite “collecting theta.”

So VRP is not a separate mystic force—it is the empirical statement that the market often **overprices variance** relative to subsequent realized quadratic variation, after careful measurement.

---

## 3. Why a premium can exist

Educational hypotheses (can coexist):

1. **Hedging demand:** asset owners buy puts / collars; dealers and sellers require compensation.  
2. **Crashophobia:** left-tail events dominate utility; buyers overpay relative to physical measure.  
3. **Balance-sheet and intermediary constraints:** limited risk-bearing capacity in stress.  
4. **Path and jump risk** not captured by simple vol comparisons.

None of these guarantee that **your** short-vol trade is +EV after costs.

---

## 4. Measurement cautions

Naive “IV minus last 30d realized” is a start, not a research paper:

- Which IV? ATM, variance swap fair strike, corridor?  
- Which realized? Close-to-close, high-frequency, overnight included?  
- Overlapping samples bias.  
- Regime dependence: VRP can flip sign for stretches.  
- Single names ≠ index.  
- Earnings and events dominate short-dated comparisons.

---

## 5. Vol of vol and premium erosion

Even when average VRP is positive:

- **Short vol can suffer years of pain** in clustered crises.  
- Transaction costs and bid–ask can erase the edge for retail size.  
- Crowded short-vol strategies can **compress** the premium.  
- 0DTE and continuous gamma selling change the microstructure of who earns what.

Treat VRP as a **macro feature of option markets**, not a personal ATM strategy.

---

## 6. Studying VRP in the terminal

| Step | Action |
|------|--------|
| 1 | Note ATM IV on surface/term for your horizon |
| 2 | Compare to hist IV / realized proxy strips |
| 3 | Adjust for known events in the window |
| 4 | Check skew: is “cheap vol” actually cheap crash vol? |
| 5 | Check positioning: is the market already pinned (realized may be suppressed)? |

Pinning from positive dealer gamma can **lower realized vol**, making short vol look genius until the pin breaks.

---

## 7. Key takeaways

1. VRP ≈ implied variance often > realized, on average, for indices.  
2. Mechanically related to θ vs γ economics.  
3. Not free money; regime- and cost-dependent.  
4. Measure carefully; events matter.  
5. Positioning can endogenously change realized vol.

---

## 8. Study path

Revisit *Theta Is Not Free Money*; then *0DTE Mechanics* and *GEX grammar* to see how structure affects realized paths.
