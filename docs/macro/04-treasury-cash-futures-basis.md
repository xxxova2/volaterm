# Treasury Cash–Futures Basis


---

## 1. Why this trade sits at the center of modern fixed income

The cash–futures basis links:

- Cash Treasuries (spot bonds)  
- Exchange-traded Treasury futures  
- Overnight and term **repo** financing  

It is a primary channel through which leveraged accounts intermediate government debt. When it runs smoothly, issuance finds homes. When funding or margin fails, the basis becomes a **systemic unwind amplifier**.

---

## 2. Defining the basis

A standard educational definition:

\[
\text{Basis} \approx P_{\text{cash}} - \left(P_{\text{futures}} \times \text{Conversion Factor}\right)
\]

(Exact exchange quoting conventions vary; learn the sign and units your screen uses.)

If markets were frictionless with no optionality, forward pricing would pin cash and futures tightly. In reality the basis embeds:

1. **Carry** — coupons earned on cash bonds minus financing (repo). Futures require margin but not full cash outlay; the futures price adjusts for carry.  
2. **Delivery options** — the short futures position chooses **which** eligible bond to deliver and has timing options. Those options have value.

Intuition:

\[
\text{Futures fair} \approx \text{adjusted cash} - \text{value of options to the short}
\]

Rich/cheap basis language: high basis can mean expensive options or favorable carry; low/negative basis can mean squeeze, rich futures, or stressed cash.

---

## 3. Conversion factors and CTD

Exchanges use **conversion factors (CF)** to normalize bonds with different coupons and maturities into a common futures deliverable basket (classically approximating a notional coupon convention).

**Cheapest to deliver (CTD):** the bond that minimizes the cost of delivery for the short (maximizes advantage given CF and prices).

Rough duration rule of thumb (educational):

- When yields are **high** relative to the CF convention, longer-duration / lower-coupon bonds often become CTD.  
- When yields are **low**, shorter-duration / higher-coupon bonds often become CTD.

### CTD switch
If yields move enough, the CTD identity **switches**. Futures begin tracking the new CTD. That switch option behaves like **convexity owned by the short**. Long futures are short that convexity. Basis traders must model switch risk, not only static carry.

---

## 4. The classic long-basis trade (“widowmaker” when abused)

**Long basis (one common packaging):**

- Long cash CTD (or candidate CTD)  
- Short the futures  
- Finance the cash bond in repo  

Held toward delivery/convergence, components that were rich/cheap relative to fair can compress. Spreads are often small → **leverage** is used to make ROE acceptable.

### Profit sketch
Profit relates to basis at entry versus carry and financing over the hold—minus mark-to-market noise and margin.

### Risk that matters (modern edition)
The risk is less “will UST default?” and more **funding liquidity + margin**:

1. You hold large notional cash Treasuries financed overnight.  
2. Repo rates spike (see money-markets article) → carry collapses.  
3. Simultaneously, rates rally or futures mark against the short leg → **margin calls**.  
4. You need cash **today**. Haircuts rise; repo lines tighten.  
5. Forced selling of cash bonds pushes cash prices down; futures may lag → basis **moves against** the position.  
6. Unwind feeds on itself.

This is the educational core of “basis blowup” scenarios discussed by researchers and policymakers: leverage + daily margin + overnight funding.

---

## 5. Wildcard and squeeze intuitions

### Wildcard-style timing option
Futures settlement prices fix at a known time; cash bonds may still trade after. In volatile sessions, the short may exploit timing differences between the futures fix and cash trading—option value that should be reflected in the basis. When realized vol is high, option components of the basis deserve respect.

### Squeeze
If futures open interest is large relative to deliverable float of the CTD, shorts may scramble for bonds; futures can richen vs cash; specials appear in repo. “Hot” CTDs are dangerous to be short in physical markets.

---

## 6. Trading the switch (relative value framing)

Advanced educational approach:

1. Identify current CTD and the **challenger** bond.  
2. Compute approximate yield level where CTD switches.  
3. Near the crossover, basis volatility rises.  
4. Structures that benefit from switch convexity become interesting **relative to carry and repo**—always conditional on funding.

This is not “set and forget arbitrage.” It is **options on the curve embedded in a futures contract**, financed in repo.

---

## 7. Data honesty on this terminal

The app may show **cash yields, futures context, SOFR, and educational basis monitors**. It does not automatically know every hedge fund’s Cayman holdings or true system-wide basis gross. Use the monitor to learn **relationships and regimes**, not to size mythical risk-free levered books.

---

## 8. Study exercises

1. Explain carry: coupon vs repo for a notional 10-year.  
2. Explain why futures shorts own delivery options.  
3. Walk the unwind spiral in six steps without numbers.  
4. On the Rates desk, note SOFR stress and ask how a levered basis book would feel.  
5. Connect issuance calendar (auctions) to potential CTD/repo pressure.

---

## 9. Key takeaways

1. Basis = cash vs futures adjusted for CF, carry, and options.  
2. CTD and switch create embedded convexity.  
3. Levered long basis is a **funding + margin** trade.  
4. Spikes in SOFR and rising haircuts are existential to the trade.  
5. Treat “arbitrage” language with suspicion when leverage is 50×.

---

## 10. Study path

Continue to *Interest Rate Swaps, Spreads, and Convexity Bias* and *Relative Value on the Curve*.
