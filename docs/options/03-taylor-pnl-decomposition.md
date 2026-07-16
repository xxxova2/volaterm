# How option P&L actually breaks down

**Deck:** Six buckets. Theta is only one of them.  
**Desk:** Greeks (`GRK`) · Analyze / GVV  
**Level:** Intermediate

![Where option P&L comes from](/docs/academy/figures/taylor-identity.svg)

---

## Why attribution exists

A raw P&L number does not teach. Professionals decompose:

> “We made money because **realized vol was below implied** and **skew didn’t blow**, despite being slightly short delta.”

That sentence is informal P&L attribution. Desks share a common ledger so traders and risk can argue about *causes*, not vibes.

---

## The six buckets (plain English)

Think of option value as a machine with dials: **spot**, **time**, **implied vol**. When those dials move, P&L lands in buckets:

| Bucket | Name | What it means |
|--------|------|----------------|
| Clock | **Theta** | Value change as time passes, all else equal |
| Direction | **Delta** | Spot moves × your delta |
| IV level | **Vega** | Implied vol moves × your vega |
| Big spot moves | **Gamma** | Convexity vs spot — path matters |
| Vol-of-vol | **Volga** | Convexity vs IV |
| Spot + vol together | **Vanna** | When spot and IV co-move (crashes love this) |

Higher-order greeks exist. For most books, these six are the professional baseline.

---

## Reading each bucket like a risk manager

### Theta
Compensation for holding risk through time. For shorts: a credit. For longs: a debit. Always ask: *what risks does that credit purchase?*

### Delta
Linear exposure. If you claim a “pure vol trade,” leftover delta is still P&L. Charm and vanna change delta even when spot is flat — yesterday’s hedge goes stale by construction.

### Vega
First-order IV risk. Parallel vol shocks dominate ATM books; wings need volga too.

### Gamma
The heart of realized-vs-implied. Long gamma likes large moves; short gamma pays for them. Two paths with the same close can produce different gamma P&L if one path thrashs more.

### Volga
“I was flat vega and still lost on the vol shock.” That is often volga on short OTM options.

### Vanna
Equity selloff + IV spike on a short-put / short-skew book. Spot and vol are **not** independent in crises.

---

## Short-option story in one paragraph

You short an option and collect theta. Every material spot move costs through gamma. Every material IV move costs through vega and volga. Adverse joint moves cost through vanna. You either **rehedge** (lock costs, pay friction) or **accumulate** risk (a path bet). The stream is positive only if the market overcharged for those risks relative to what realized — after costs.

---

## When the ledger lies

- **Jumps** overnight and on news — smooth-step math fails locally  
- **Discrete hedges** — you cannot hedge continuously  
- **Wrong model** — local vol vs stochastic vol changes the greeks  
- **Smile dynamics** — sticky strike vs sticky delta changes effective vanna/volga  

Use the buckets as a **ledger**, not a law of nature.

---

## What to do in the terminal

Open Greeks on a live option. Mentally assign today’s P&L to the six buckets. Write one sentence naming the dominant two. That is professional hygiene.

**Next:** *The greeks, in the order that matters* · *The variance risk premium*
