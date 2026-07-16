# Dealer Hedging Mechanics (Education)


---

## 1. Simplified market-maker mandate

Educational MM:

1. Provides liquidity in options.  
2. Aims to run **near delta-neutral** (or within risk limits).  
3. Earns spread / edge while managing γ, ν, and jump risk.  
4. Hedges residual delta in underlying, ETF, or futures.

Real dealers have inventory, skew books, OTC, and internal netting. The simple model still explains **why** GEX charts are useful.

---

## 2. Static picture after a customer trade

Customer **buys** 100 ATM calls from a dealer:

- Dealer is **short** calls ⇒ short delta, short gamma, short vega (BS signs).  
- Dealer **buys** underlying/futures to neutralize delta.  
- As spot rises, short call delta becomes more negative ⇒ dealer must **buy more** (short gamma amplifies).  
- As spot falls, short call delta moves toward zero ⇒ dealer **sells** some hedge.

That last pair is the seed of “short gamma amplifies trends.”

If customers are **sellers** of options, signs flip: dealers long gamma **fade** moves.

---

## 3. Aggregation → GEX

Sum, across strikes and expiries, dealer gamma × OI × multipliers × sign convention → **GEX profile**.

Caveats:

- OI is not all “customer vs dealer.”  
- Multi-listed, OT C, and cross-product hedges blur.  
- Index options vs single stock futures hedges differ.  
- Still: large listed OI is informative **mass**.

---

## 4. Time and vol without spot moves

| Shock | Effect on delta | Hedge impulse |
|-------|-----------------|---------------|
| Time passes (charm) | Δ drifts | Trade futures even if S flat |
| IV rises/falls (vanna) | Δ drifts | Trade futures / re-mark risk |
| Spot moves (gamma) | Δ drifts | Classic rehedge |

Intraday narratives that mention only gamma are incomplete; charm and vanna share the microphone.

---

## 5. Index futures as the hedge vehicle

For SPX-style complex, liquid futures (and ETFs) absorb delta hedges. Educational consequences:

- Futures prints can reflect **options rehedging**, not only “cash equities opinion.”  
- Into 0DTE expiry, hedge flows compress into a short window.  
- Pin dynamics appear when long-gamma dealers lean against moves near a strike mass.

---

## 6. “Buy or buy” and one-way flows

If the gamma profile is skewed such that both a selloff and a rally force **additional long delta** for dealers, futures demand can be one-sided. That is a **positioning state**, fragile when IV and spot jump together (vanna).

---

## 7. What this terminal will never know without paid tape

- True participant breakdown (MM vs customer vs prop).  
- Every OTC hedge.  
- Exact dealer risk limits.  

Hence badges: **OI-inferred convention**. Use as structured hypothesis, update with price confirmation, never as omniscience.

---

## 8. Study drill

1. Assume customers long the largest OI call strike.  
2. Spot +1% and −1%: write dealer hedge direction each way.  
3. Age one day with spot flat: charm direction?  
4. IV +3 points: vanna direction?  
5. Compare to GEX/DEX chart for consistency.

---

## 9. Key takeaways

1. MM delta neutrality creates flows from γ, charm, vanna.  
2. Customer long options ⇒ dealer short γ is a working default, not law.  
3. Futures are the pressure valve.  
4. One-way modes exist in profiles.  
5. Honesty about data beats fake certainty.

---

## 10. Study path

Return to *GEX Chart Grammar* and *Charm Path Bias* with this mental simulator running.
