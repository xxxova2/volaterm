# Greeks Desk and Trade Lab Guide

**Academy level:** Intermediate  
**Codes:** `GRK`, analyze / sim lab codes (`SIM`, `COMBO`, `STRD`, …)  
**What you will learn:** How to use greeks views for education; Taylor strip; profiles; lab tools as sandbox—not prediction engines.

---

## 1. Why a Greeks desk exists

The chain shows prices. The Greeks desk shows **risk**. Education goal: connect any structure you imagine to Δ, Γ, ν, θ, vanna, volga, charm.

---

## 2. ATM cards and stacks

Read:

- Theta with the *not free money* mindset.  
- Gamma as expected rehedge fuel.  
- Vega as IV mark risk.  
- Higher orders when wings or short-dated.

Use Explain tooltips until definitions are automatic.

---

## 3. Profiles vs strike

Gamma, delta, charm, vanna profiles teach **where** risk lives on the ladder—the same geography GEX will recolor under dealer conventions.

Exercise: pick a vertical spread; sketch net γ profile; confirm with desk.

---

## 4. Surfaces and 3D meshes

Geometric views of greek or IV fields help spatial memory. They are not automatically “better signals”; they are **better maps** for some learners.

---

## 5. Trade lab / Thalex-class tools

Simulation workspaces (straddle, combo, breakeven, subjective vol, hedge followers, etc.) exist to:

- Force you to state a view.  
- See payoff and greek evolution.  
- Practice without live capital.

Rules for Academy use:

1. Write the hypothesis first.  
2. Simulate.  
3. List what greek kills you if wrong.  
4. Do not reverse-engineer “the answer” from a pretty chart.

---

## 6. Taylor / GVV strip

Keep the identity visible mentally:

\[
dV \approx \theta dt + \Delta dx + \nu d\sigma + \tfrac12\Gamma (dx)^2 + \tfrac12\mathrm{Volga}(d\sigma)^2 + \mathrm{Vanna}\,dx\,d\sigma
\]

After any lab session, attribute imaginary P&L in words.

---

## 7. Key takeaways

1. Greeks desk = risk language.  
2. Profiles link to GEX geography.  
3. Lab is a sandbox.  
4. Taylor attribution is the exam.  
5. Units and multipliers always.

---

## 8. Study path

Academy options track from *Theta Is Not Free Money* through *Greeks Hierarchy*.
