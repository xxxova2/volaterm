# Plumbing, vol, and positioning are the same problem

**Deck:** Three desks. One market. Stop reading them in isolation.  
**Level:** Intermediate  
**Product model** for this terminal

![Three linked machines](/docs/academy/figures/three-machines.svg)

---

## The short version

Every serious session can be reduced to three questions:

1. **Plumbing** — Can leverage fund itself overnight without stress?  
2. **Vol** — What is insurance priced at, and is that rich or cheap for the risk?  
3. **Positioning** — Who is forced to buy or sell as price moves?

Miss one and your story is incomplete. That is why this product has three “machines,” not three unrelated toys.

---

## Machine 1 — Plumbing (funding)

Leverage is not free. It rolls in **repo**, **futures basis**, **cross-currency basis**, bank balance-sheet space.

When funding is easy, risk assets can be held with less friction.  
When funding is weird (SOFR spikes, basis blows, RRP drains in a disorderly way), risk is forced — sometimes before the narrative changes.

![SOFR — overnight financing rate (FRED)](/docs/academy/figures/charts/sofr.png)

You do not need a PhD. You need a daily glance: *are money markets calm or screaming?*

---

## Machine 2 — Vol (insurance price)

Options are insurance. IV is the sticker price. Greeks tell you how that price changes when the world moves.

- High IV → insurance expensive → short premium *looks* attractive and is often *riskier*  
- Low IV → insurance cheap → long convexity is cheaper, but calm can last  

![VIX — one window on near-term equity uncertainty (FRED)](/docs/academy/figures/charts/vix.png)

Vol is not “fear” as a personality trait. It is a **market clearing price** for variance.

---

## Machine 3 — Positioning (forced flow)

GEX / DEX / charm are maps of **mechanical** hedging. They do not care about your thesis. They care about open interest, gamma, and the need to stay delta-neutral.

This is why quiet weeks and violent weeks feel different even when the news is the same size: the **hedging environment** changed.

---

## How the three talk to each other

| If you see… | Also check… | Because… |
|-------------|-------------|----------|
| Easy funding, risk-on | Vol crush + long gamma | Path can grind; shorts of vol get paid until they don’t |
| Funding stress | IV spike + short gamma | Forced de-risking stacks with dealer chase |
| Huge 0DTE OI | Charm + pin risk | Time itself moves delta |
| Rich VRP | Event calendar + positioning | Premium may be fair for a landmine |

---

## Daily cross-desk briefing (five minutes)

1. **Rates / plumbing desk** — SOFR, RRP, anything broken?  
2. **Vol desk** — term structure, skew, is vol rich/cheap vs recent realized?  
3. **Positioning** — net GEX near spot, nearest walls, 0DTE weight.  
4. **One sentence synthesis** — *“Funding is ___, vol is ___, dealers look ___; my base case path is ___ unless ___.”*

If you cannot write that sentence, you are not ready to size risk.

---

## Bottom line

Plumbing is the **fuel**.  
Vol is the **price of insurance**.  
Positioning is the **steering** when hedging is forced.

Read them together. That is the whole product thesis.

**Next:** pick the track you are weakest in — options, macro, or GEX — and do three lessons, not thirty.
