# Relative Value on Yield Curves: PCA, Butterflies, and Mean Reversion


---

## 1. Why relative value (RV)

Directional rate trading asks: “Will yields rise or fall?”  
RV asks: “Is the **5-year** mispriced relative to **2s and 10s** regardless of parallel level?”

God (or the market) gave you a curve; RV traders harvest **kinks** after hedging systematic factors.

---

## 2. PCA decomposition of the curve

Yield changes across tenors are highly correlated. Principal component analysis (PCA) finds orthogonal drivers:

| Component | Nickname | Typical variance share (order of magnitude) | Macro association |
|-----------|----------|-----------------------------------------------|-------------------|
| **PC1** | Level | ~85–95% | Policy shocks, broad inflation news |
| **PC2** | Slope | ~5–10% | Growth vs recession, front vs back policy path |
| **PC3** | Curvature | ~1–5% | Supply in the belly, local demand, technicals |

Exact percentages vary by sample; the **taxonomy** matters more than the digits.

### Residuals as alpha candidates
Fit tenors to PC1–PC3. If the 5-year yield sits 8–10 bp rich/cheap to the model residual:

- Buy cheap / sell rich.  
- Hedge level and slope with wings (2s and 10s).  
- Bet residual mean-reverts.

This is the intellectual core of many curve RV books.

---

## 3. Butterfly trades

A classic curvature trade:

- **Long body** (e.g. 5y)  
- **Short wings** (e.g. 2y and 10y)  

Or the reverse.

Weightings aim for:

- Approximate **duration neutrality** (PC1 hedge)  
- Approximate **slope neutrality** (PC2 hedge)  
- Residual **curvature** exposure (PC3)

### Regime cartoon
- Front end pinned by policy path.  
- Long end loose due to fiscal/term premium.  
- Belly absorbs auction supply.  

After heavy belly issuance, 5s may cheapen vs the 2s10s spline; a fly that owns the belly expects **richening after digestion**—conditional on funding and risk appetite.

---

## 4. Mean reversion and first-passage thinking

RV spreads are often modeled as mean-reverting processes (Ornstein–Uhlenbeck style):

\[
dx_t = \kappa(\mu - x_t)\,dt + \sigma\,dW_t
\]

Educational use:

- Estimate mean \(\mu\), speed \(\kappa\), vol \(\sigma\).  
- Ask **first passage** questions: probability of reversion within N days.  
- Compare expected edge to **carry and bid–ask** of holding the structure.  
- If EV after costs is poor, pass—even if residual “looks cheap.”

This is process discipline, not a promise that OU fits Treasuries always.

---

## 5. Basis swaps as plumbing sensors

Basis swaps exchange one floating index for another (e.g. different SOFR tenors, or SOFR vs fed funds style indices). Spreads embed:

- Credit and operational differences  
- Balance-sheet preferences  
- Stress in secured vs unsecured 

When secured funding is expensive relative to unsecured, certain bases tighten/widen in characteristic ways (sign depends on quote convention). RV curve traders watch these as **regime filters** before putting on long-horizon flies.

---

## 6. How to practice without a full RV OMS

On this terminal:

1. Inspect curve shape tools and global yields.  
2. Note auction calendar (supply in specific tenors).  
3. Overlay plumbing regime (can dealers warehouse?).  
4. Write a residual thesis in prose: “Belly should richen after supply because ___.”  
5. List what would **invalidate** the thesis (funding spike, data shock, PC1 blowout).

---

## 7. Key takeaways

1. Most curve variance is level; alpha often hides in slope/curvature residuals.  
2. Butterflies isolate curvature when weighted well.  
3. Mean-reversion EV must beat costs and risk of regime break.  
4. Basis swaps are sensors, not only products.  
5. Supply calendars are first-class RV data.

---

## 8. Study path

Continue to *FX, Cross-Currency Basis, and Dollar Funding*.
