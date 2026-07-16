# Weekends don't decay like weekdays


---

## 1. Theta as the “income Greek” — incomplete story

Theta is often introduced as: time passes → options lose value → sellers benefit. That story hides a design choice in almost every textbook model:

> **Pricing engines advance a continuous time argument.**  
> **Exchanges open and close. Risk does not.**

If you only watch the theta number on a screen, you can confuse **model clock advance** with **economic risk decay**.

---

## 2. Continuous time vs market hours

Standard Black–Scholes-type models treat \(t\) as continuous. In reality:

- Cash equities in the U.S. trade regular hours (plus limited extended sessions).
- Options liquidity concentrates in the cash session.
- News, geopolitics, earnings, and policy do not respect the close.

Two mental clocks matter:

| Clock | Definition | Implication |
|-------|------------|-------------|
| **Trading time** | Risk accumulates mainly when markets are open and hedgeable | Weekend calendar decay may overstate “earned” edge |
| **Calendar time** | Risk exists 24/7; gaps can open at the open | IV should embed closed-market uncertainty |

Neither clock is perfect. Professional practice mixes both: models often use calendar for rates/dividends and adjusted vol for trading-hour variance, while traders mark weekend risk in the **vol surface**, not only in θ.

---

## 3. The weekend thought experiment

Imagine holding an option from Friday close to Monday open:

- Spot may barely move in the print you see Monday morning.
- Your model still advanced \(t\) by two calendar days (or three if holiday).
- Was the P&L “earned” because risk disappeared—or because the **pricing function** moved \(t\) forward while IV and spot gap absorbed the residual?

Often, **part of Monday’s apparent theta gain was already negotiated on Friday** via higher weekend IV (the **weekend effect**). Friday’s mark embeds uncertainty you cannot hedge until Monday. When Monday is calm, IV may compress and the mark improves—not because you discovered alpha, but because the market’s insurance premium for the closed period was not needed.

---

## 4. Why Fridays look different

Observed patterns (educational regularities, not guarantees):

1. **IV adjustment into the weekend.** Front-end options may hold extra premium for gap risk.
2. **Reduced willingness to short unhedgeable tails** into known event weekends (elections, geopolitics, major data).
3. **Monday open:** combination of calendar θ, gap in spot, and IV crush or expansion.

Experienced vol traders therefore ask better questions than “how much θ do I earn overnight?”:

- Is implied vol **pricing weekend and event risk** fairly relative to history and my scenario set?
- Is the market **underestimating** closed-market uncertainty (cheap wings / thin weekend premium)?
- Is today’s premium reflecting the **actual risks ahead**, or only the open-session variance?

Those questions sit on the **surface and term structure**, not on a single theta cell.

---

## 5. Events, not just weekends

The same logic applies to:

- Overnight sessions in futures-led products  
- Holiday bridges  
- FOMC, CPI, NFP, earnings  
- Geopolitical weekends  

For events, traders often think in **variance budgets**: how much total variance the market is pricing between now and the event vs after. Theta is the local time derivative; **event vol** is a discrete lump of variance sitting on the calendar. Confusing the two produces false confidence in short premium into binary risk.

---

## 6. Model time conventions (desk literacy)

Without becoming a quant desk, know that:

- **Calendar-day θ** vs **business-day θ** can differ in vendor screens.
- **0DTE** options have almost no “weekend θ” left—their risk is pure path and pin within the day.
- **Weekend weight** in vol models (e.g., more variance on weekdays than Saturday–Sunday) is an engineering choice that changes reported θ.

If two systems show different θ for the same option, check **day-count and variance calendar** before declaring one wrong.

---

## 7. How to use this in the terminal

| Question | Desk |
|----------|------|
| Is front IV rich into Friday? | Smile / surface; term structure front vs back |
| How much move is priced to next session? | Expected move from ATM straddle; levels tools |
| Am I short gap risk or session variance? | 0DTE vs weekly expiry selection; GEX/charm path |
| Did Monday P&L come from IV crush? | Compare pre-close IV vs open IV on hist IV / surface |

---

## 8. Key takeaways

1. Models run continuous time; markets do not.  
2. Theta can be **mechanical mark-to-model**, not economic edge.  
3. Weekends and events are often priced in **IV**, not only in θ.  
4. Monday profits may have been **sold on Friday**.  
5. Ask whether premium matches **unhedgeable risk**, not whether the θ number looks large.

---

## 9. Study path

1. Pick a Friday close: note ATM IV and expected move.  
2. Monday open: decompose P&L into spot gap vs IV change (rough mental GVV).  
3. Compare a week with a major event vs a quiet week.  
4. Continue to: *Implied Volatility Surface & Term Structure* and *0DTE Mechanics*.
