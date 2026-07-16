# Black–Scholes Intuition for Desk Users


---

## 1. What the model is for

Black–Scholes–Merton (and close cousins Black-76, Garman–Kohlhagen) provide a **mapping**:

\[
V = f(S, K, T, r, q, \sigma)
\]

from observable and assumed inputs to a theoretical price. Markets invert the map for \(\sigma\) given price — that inversion is **implied volatility**.

BS is a **language and risk engine**, not a claim that returns are literally lognormal forever.

---

## 2. Core assumptions (know them to break them)

Educational list:

1. **Geometric Brownian motion** for the underlying with constant volatility.  
2. **Continuous trading**, no jumps.  
3. **Frictionless** markets (no bid–ask, no borrow constraints) in the ideal form.  
4. **Constant rates** (extended models relax this).  
5. **Lognormal** terminal distribution under the risk-neutral measure for the basic call/put.

Every serious market violation (smiles, crashes, discrete hedges, funding) is a place where **desk judgment overlays** the model.

---

## 3. Risk-neutral pricing in one paragraph

Under no-arbitrage with hedging, the option price equals the discounted expected payoff under a measure where the underlying drifts at the financing rate (adjusted for dividends). Traders do not need measure-theory fluency daily, but they need this consequence:

> Price is not “expected payoff under your personal probability” without risk adjustment.  
> IV embeds both beliefs and risk premia.

That is why VRP can exist even if your physical forecast equals the forward.

---

## 4. Greeks as derivatives of the pricing map

If \(V = BS(\cdot)\), then:

| Greek | Derivative |
|-------|------------|
| Δ | ∂V/∂S |
| Γ | ∂²V/∂S² |
| ν | ∂V/∂σ |
| θ | ∂V/∂t |
| ρ | ∂V/∂r |

Closed forms exist for European calls/puts. This terminal and most vendors compute them (or finite differences) for risk. **Model greeks ≠ guaranteed real-world hedges** when assumptions fail—but they remain the shared coordinate system.

---

## 5. Put-call parity (model-light truth)

For European options on non-dividend underlyings (sketch):

\[
C - P = S - Ke^{-rT}
\]

(with dividend yield variants). Parity is more robust than BS itself. Violations signal misprints, early exercise premia (Americans), or stale legs. Chain tools that check parity are literacy tools.

---

## 6. Why one σ cannot fit all strikes

If BS were true with constant σ, the smile would be flat. It is not. Therefore:

- Either dynamics are wrong (jumps, stochastic vol, local vol), or  
- Supply/demand for insurance shapes prices beyond diffusion risk.

Practitioners still quote in BS IV because **it normalizes prices** across strikes and tenors. The surface is a BS-implied chart of non-BS reality.

---

## 7. Local vol, stochastic vol, jumps (map only)

| Framework | Idea | Desk consequence |
|-----------|------|------------------|
| Local vol | σ = σ(S,t) fitted to smile | Fits vanilla surface; dynamics can be unrealistic |
| Stochastic vol | σ itself random (Heston-like) | Volga/vanna richer; smile moves with spot more realistically sometimes |
| Jumps | Discontinuous S | OTM puts/calls demand premium; continuous-hedge error |

You do not need to implement Heston to benefit: when wings explode, think **jumps + demand**, not only “BS gamma.”

---

## 8. Using BS on this terminal

1. Read IV as **quote language**.  
2. Read greeks as **risk coordinates**.  
3. Stress with narrative shocks (gap, vol +10 points) beyond infinitesimal greeks.  
4. Compare structures on **smile** not only on BS ATM.  
5. Lab: change subjective vol and see value — that is model sensitivity education.

---

## 9. Key takeaways

1. BS is a map and a language.  
2. IV is inverted BS, not physical destiny.  
3. Greeks are derivatives of that map.  
4. Smile proves constant-σ failure.  
5. Parity and no-arbitrage beat model religion.

---

## 10. Study path

Continue to *Vanna, Volga, and Skew* and *IV Surface & Term Structure*.
