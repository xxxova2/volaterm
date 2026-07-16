# Walls, HVL, Magnets, and Dealer Mode


---

## 1. Walls

**Call wall / call resistance:** strike with exceptionally large call open interest (or call GEX mass) above spot. Educational reading: as spot approaches, dealer hedging of short calls can cap or slow upside—until it does not.

**Put wall / put support:** mirror below spot for puts.

These are **positioning levels**, temporary and expiry-dependent. They are not mystical floors.

---

## 2. Why prices seem stuck (magnets)

Large options concentrations create **temporary magnets**:

- Long dealer gamma near a strike → mean-reverting hedges.  
- Into expiration, pin risk rises.  
- After expiry, magnet disappears.

Prices “stuck” near a strike is often **hedging mechanics**, not a new economic equilibrium.

---

## 3. HVL — high vol level

Vendor language varies. Educational definitions used in research packs:

- Strike of maximum \|GEX\|, or  
- Key vol magnet / high-vol reference on the profile, or  
- Level separating regimes on a vendor’s model  

On this terminal, HVL-style metrics are derived where implemented (e.g. max \|GEX\| logic). Read the on-screen definition when present.

**Decision use:** above HVL / call resistance with +GEX structure intact vs losing those levels into −GEX air.

---

## 4. Dealer mode — “buy or buy”

Teaching quote pattern from sell-side research popularized in options education:

> Dealers get longer gamma to the downside and need to **buy** deltas if the market falls; they can be short gamma if the market rises and still need to **buy** deltas to hedge. Dealers are in **buy-or-buy** mode.

Interpretation practice:

- Map the gamma profile: is the book such that both up and down scenarios force **buying** (or both force selling)?  
- That is a **flow skew**, not a guaranteed rally.  
- Combine with spot path and IV.

---

## 5. Buyside short gamma / dealers long

After powerful rallies, it is possible that **buyside is short gamma** (sold calls, structured products, covered programs) so **dealers are long gamma** on net. Then:

- Dealers dampen (blue/positive GEX in teaching charts).  
- Skew may still show **right-tail** artifacts if the market fears continued upside melt.

Always separate **who is short gamma** from **where skew prices tails**.

---

## 6. Trapdoor narrative (skew + negative gamma)

Educational fragility cocktail:

1. Spot near a level with **negative gamma below**.  
2. **Put skew** elevated (crash insurance demand).  
3. Catalyst arrives.

Path: break level → short-gamma amplification → IV expands → vanna/spot spiral risk. This is a **scenario framework** for reading Home/desk risk, not a trade alert service.

---

## 7. Key takeaways

1. Walls are OI/GEX masses, not eternal S/R.  
2. Magnets expire.  
3. HVL marks regime geography on the profile.  
4. Dealer mode describes hedge directionality of the book.  
5. Trapdoors combine −γ and skew.

---

## 8. Study path

Continue to *Reading Session Positioning* and *Three Linked Machines*.
