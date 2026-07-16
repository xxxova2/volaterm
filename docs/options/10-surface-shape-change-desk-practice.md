# When the SPY surface shape changes — desk practice

**Desk:** Vol · SURF / SMILE / TERM  
**Level:** Intermediate  
**Read with:** *Vol surface & term structure*, *Vanna / skew*, *VRP*

---

## 1. The mistake this post prevents

Seeing the 3D surface “look different than four hours ago” and guessing:

- either **“the market rewrote vol”**, or  
- **“the app is broken / frozen / fake.”**

Both can be wrong. Shape change is a **measurement question**. You need three different numbers, two different strike conventions, and an honest label for how the terminal last painted the mesh.

---

## 2. Three numbers — never equate them

| Label on this terminal | What it is | What it is **not** |
|------------------------|------------|--------------------|
| **VIXCLS** | CBOE VIX index via FRED (`VIXCLS`) | Not SPY front ATM IV |
| **ATM** | Front-expiry ATM IV from the **option chain** (mid-solved) | Not VIX |
| **RV20** | ~20-day close-to-close **realized** vol | Not VIX, not a forecast |

**VRP study** compares **implied vs realized** (e.g. ATM or variance vs RV20).  
“IV minus VIX” is a different animal (index basis) — only use it when labeled as such.

If VIXCLS prints **16.5** while front SPY ATM is ~**10%**, that is not a bug by itself: different underlyings, different tenors, different constructions. Short-dated SPY ATM can sit well below VIX in calm spots; wings and term structure still carry risk.

---

## 3. Sticky strike vs sticky delta (why the mesh moves)

When **spot** moves between full chain refreshes, this terminal **recomputes greeks at sticky IV** (`sticky-IV` path in the VOL strip / header `surf:sticky`).

| Rule of thumb | IV held constant… | What you see on SURF |
|---------------|-------------------|----------------------|
| **Sticky strike** | …by strike K | Moneyness grid shifts → **shape can change even if no option mid moved** |
| **Sticky delta** | …by delta / moneyness | Smile slides with spot; RR/fly more stable in δ-space |

Educational: neither rule is always true in the market. The terminal’s inter-refresh path is **sticky-IV by strike** until the next full chain rebuild (`surf:chain` / `full-chain`).

---

## 4. Legitimate reasons shape changes

1. **True mid IV moves** at fixed strikes (supply/demand).  
2. **Sticky-IV + spot move** (above).  
3. **Tenor set change** — 0DTE rolls off, new weekly enters.  
4. **Delayed Yahoo catch-up** after the open (lagged, still market data).  
5. **Product path change** — e.g. Macro surface including weeklies after a fix (different sample set, not “fake prints”).

---

## 5. Misleading paint (treat with suspicion)

1. **Wing SVI clamp** on extreme OTM mids (desk chain smoother).  
2. **SVI / grid hole-fill** inventing cells off sparse quotes.  
3. **Desk surface vs Macro surface** disagreeing silently (different filters/fit).  
4. **Cache flip** without reading age / provenance.  
5. **Any synthetic / demo smile** — LIVE is fail-closed; if chain is dead you should see empty, not a cartoon smile.

---

## 6. Drill (10 minutes)

1. Open **VOL** strip: note **VIXCLS**, **ATM**, **RV20**.  
2. Open **SURF** → **SMILE** → **TERM**.  
3. On SMILE, read **25Δ RR / fly** (put wing − call wing when RR is positive = rich puts).  
4. Watch the VOL strip for **ΔATM** / **ΔRR25** after a refresh.  
5. Check header provenance: `chain:yfinance` · `surf:chain` vs `surf:sticky`.  
6. Write one sentence:

> Fixed-K ATM± moved by X; 25Δ RR moved by Y; path was sticky/full-chain; so I attribute shape change to ___.

If fixed-K is flat but the 3D moneyness mesh moved, prefer **sticky-strike + spot** over “vol exploded.”

---

## 7. Fixed-strike vol vs VIX (desk idea)

Index VIX can rise while **fixed-strike** SPX/SPY vol is flat or falling — different story about who is still bidding insurance at a level. Use fixed-K samples on the tape; do not use VIX alone as “the surface.”

Educational only — not a signal.

---

## 8. Cross-desk

| If you see… | Also open… |
|-------------|------------|
| Backwardation + put RR up | GEX / positioning — trapdoor narrative is *separate data* |
| Calm contango + VIX mid-teens | Rates plumbing — is funding easy or weird? |
| ATM ≪ VIXCLS | Check tenor (0DTE vs 30d) and wing liquidity before crowning “cheap vol” |

---

## 9. Takeaways

1. Shape change needs **decomposition**, not vibes.  
2. **VIXCLS ≠ ATM ≠ RV20**.  
3. Sticky-IV path can move the mesh without a new smile.  
4. Prefer liquid strikes; distrust far wings.  
5. LIVE fail-closed beats a pretty lie.

**Next:** *Variance risk premium* · *Vol desk tools* · Positioning GEX grammar.
