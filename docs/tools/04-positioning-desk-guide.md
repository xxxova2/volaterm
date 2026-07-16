# Positioning and GEX Desk Guide

**Academy level:** Intermediate  
**Codes:** `POS`, `GEX`, `CHAIN`, `LVL`, `TOOLS`  
**What you will learn:** Operational reading of the positioning desk; conventions; levels tools; what not to claim.

---

## 1. Chain first

Liquidity, OI, and spreads live on the chain. GEX built on fantasy mids is fiction. Check:

- Open interest concentration  
- Bid–ask sanity  
- Expiry selection (0DTE vs all)

---

## 2. GEX profile panel

Read in order:

1. Spot vs bars.  
2. Net sign near spot.  
3. CR / PS / HVL / flip rails.  
4. DEX profile skew.  
5. Expiry mode (all vs 0DTE vs selected).

Write the three decision answers from the GEX grammar article.

---

## 3. Levels strip and tools

Expected move, parity helpers, strategy strips, FlashAlpha-style external levels (when configured) are **context**. Prefer consistency with your own OI-derived walls before treating any external print as ground truth.

---

## 4. Session features

If session heatmap / book Δ is available:

- Watch structure evolve.  
- Note 1D changes on expiry matrix.  
- Remember samples only exist while the app observes.

---

## 5. Honesty constraints (memorize)

| Do | Don't |
|----|-------|
| Badge OI dealer convention | Claim true MM vs customer split without data |
| Poll on your cadence; note stale | Promise 1-minute institutional flow |
| Use single-name chains you actually have | Invent index aggregate GEX you don't compute |
| Educational hedge-flow language | Autopilot trade alerts |

---

## 6. Pairing with vol

Never finish a GEX read without smile/term glance. +GEX pin with exploding put skew is a different world from +GEX with sleepy skew.

---

## 7. Key takeaways

1. Chain quality bounds GEX quality.  
2. Decision questions &gt; color aesthetics.  
3. Modes (0DTE/all) change the story.  
4. External levels are cross-checks.  
5. Conventions on, fiction off.

---

## 8. Study path

Positioning Academy articles 01–05 end-to-end.
