# Vulture Wars - Product Backlog & Initial Assessment

This backlog captures the initial assessment, feedback, ideas, and suggestions discussed in the design chat between Theo and Ed Fox, along with deferred features for future development phases of **Vulture Wars** (parody clone of Dope Wars).

---

## 1. Initial Assessment Summary

### Parody Theme & Aesthetic
- **Bloomberg Terminal Retro CRT Interface:** Standardized monospace UI in bright glowing green representing the high-pressure terminal style (referred to as the "Cuckberg Terminal" in the chat).
- **Core Parody Vibe:** Wall Street vulture capitalism at its finest—"good old honest arbitrage under the moral bankruptcy of Wall Street."
- **Parody Characters / References:**
  - **Larry Twink:** Board member parody of BlackRock's Larry Fink.
  - **LendLess Brothers:** Parody of Lehman Brothers providing shadow leverage.
  - **Luigi Mangione:** Angry worker/superintendent who assassinates cost-cutting vultures if tactical security details aren't bought.
  - **Tom Massie:** Congressman who has a 5% chance of refusing lobbyist money and reporting you to the SEC.
  - **Epstein IP:** Royalty-free high-society connection jokes.

### Key Gameplay Tension
- **Pass the Parcel:** Buy companies, inflate their on-paper value via financial tricks, extract cash, and unload them onto dumber retail buyers (like pension funds) before they collapse due to stripped viability.

---

## 2. Deferred Features

### Feature 2-1: "Too Big to Fail" Government Bailout (Lobbying Engine)
- **Concept:** When a company's viability drops below 30% and debt is overwhelming, allow players to lobby the government for a bailout instead of declaring Chapter 11.
- **Cost:** $500k cash spent on financial services PACs or political donations.
- **Effect:** Erases 50% of the target company's debt and restores viability to 50%.
- **Penalty:** Spikes Heat by +30% due to public outrage (unless the player has a permanent Supreme Court Justice or Senator bribe shield activated).

### Feature Part 3: Physical Assets vs. Valuation (Borrowing/Leverage Limits)

#### 3-1: LBO Debt Capacity (Leverage Limits)
- **Constraint:** Block Dividend Recaps if the company's Debt-to-Valuation ratio exceeds 80%.
- **Code implementation concept:**
  ```javascript
  document.getElementById('btn-modal-recap').disabled = (c.debt / c.valuation > 0.80);
  ```
- **Goal:** Forces players to actually optimize operations (cost-cut) or wait for sector multipliers to rise before they can run another dividend recap.

#### 3-2: Asset Strip Consequences (Collateral Destruction)
- **Constraint:** Stripping physical assets deletes the company's collateral.
- **Gameplay Effect:** Once physical assets are stripped, future borrowing capacity on that company is completely blocked, and long-term lease/rent costs compound aggressively, accelerating viability decay.

#### 3-3: High-Leverage Viability Decay
- **Constraint:** Debt-loaded companies decay faster.
- **Gameplay Effect:** If a company's debt exceeds 50% of its market valuation, its operating viability decays twice as fast every turn. This turns high-leverage assets into ticking financial time bombs.

---

## 3. Broader Design Ideas & Future Milestones

### Game Progression & Fund Cycles
- **LP fundraising:** Raise initial equity dry powder from Limited Partners (LPs). Performance of the current fund determines the starting capital of the next fund.
- **Geography Tiers:** Start as a small middle-America regional operator, moving up to Delaware, and ultimately to a Wall Street mega-fund in NYC or the Cayman Islands.

### Market Dynamics
- **Macro Credit Ticker:** News feed announcing Federal rate hikes, recessions, tight credit, or bull runs that dynamically scale sector multipliers (e.g., tech valuations swing from -50% to +100% in Silicon Valley).
- **Sector Monopolies ("Bolt-on Acquisitions"):** Buying multiple companies in the same sector (e.g., Retail, Food Service) allows you to consolidate them, eliminate local competition, and re-rate their combined valuation at a higher multiple.

### Social & Viral Mechanics
- **Finance Neek Leaderboard:** An online high-score leaderboard. Competitive finance professionals and "finance neeks" will fuel viral sharing as they compete to retire with the highest Net Worth.
- **Moral Play Option:** Allow players to try playing "morally" but make greed significantly more lucrative to highlight systemic capital loop-holes in an educational, satirical way.
