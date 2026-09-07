# Balance Check: Noble Gnomes — Expedition & Combat Systems

**Date**: 2026-09-07  
**System**: Combat, EXP Progression, Abilities & Boss Encounter  
**Analyzed By**: Economy & Systems Designer  

---

## Data Sources Analyzed
- `src/entities/SlimeBlob.js` (Boss HP, attack phases, damage deflection, healing from scum)
- `src/entities/Tugboat.js` (Hull HP, speed caps, fouling penalties, damage resolution)
- `src/entities/Bell.js` (Standard bell vs Big Bell cooldowns, timing)
- `src/systems/UpgradeSystem.js` (Active spells, passive boons, multipliers, spell damage)
- `src/systems/SlimeManager.js` (Collision damage, projectile damage, scum drops, EXP hooks)
- `src/systems/RippleSystem.js` (Bell shockwave damage propagation, boss damage calculation)
- `src/ui/ShopModal.js` (Tinkering Shed upgrade costs, tiers, debris economy sinks)
- `src/main.js` (Level up formula, EXP thresholds, rank rewards, draft trigger)
- `design/gdd/game-concept.md` (Game design pillars, target player pacing)

---

## Health Summary: CONCERNS

While the moment-to-moment cozy cruising and early economy flow smoothly, several critical balance disconnects exist between the newly introduced Roguelite Draft spells, the Big Bell boss phase, and the EXP/cargo speed stacking. Specifically, **all active spells currently deal 0 damage to the Bog Behemoth** due to an unhandled `isBigBell` gate in `SlimeBlob.js`, while the Big Bell pure TTK sits at an excessively long **45.0s minimum**. Furthermore, hoarding algae scum creates a degenerate speed loop (+60% top speed) that incentivizes never unloading cargo at Port Bramble Pier.

---

## Outliers Detected

| Item / Value | Expected Range | Actual | Issue |
| :--- | :--- | :--- | :--- |
| **Boss Spell Vulnerability** | 1–2 damage per spell strike | **0 damage** | `hit()` gates all damage behind `isBigBell`. Spells (`Steam Surge` [4 dmg], `Resonant Harmonic` [3 dmg], `Spiked Prow` [3 dmg]) pass `isBigBell=false` and are 100% deflected. |
| **Big Bell Boss TTK** | 18–25 seconds | **45.0s (10 hits @ 4.5s CD)** | Requiring 10 consecutive Big Bell strikes with a 4.5s cooldown makes Phase 2 and Phase 3 drag on excessively for a cozy game. |
| **Algae Bio-Furnace Speed** | +10% to +20% max speed | **Up to +60% speed (+2% per clot, 30 max)** | At full cargo (30 scum), boat reaches ~14.1 m/s passively. Negates algae drag and disincentivizes composting at the pier. |
| **Acoustic Resonator Boon** | +25% Big Bell cooldown speed | **+0% (Unimplemented)** | `passive_acoustic_amp` modifies `shockwaveRadiusBonus`, but never touches `bigBellCooldownDuration`. |
| **Bog Behemoth Scum Healing** | 0.5–1 HP per clot with cap | **Unlimited +1 HP per clot** | If defeated slimes drop scum within 3.4m of the boss, it immediately heals back to full health, undoing 4–5 Big Bell hits. |

---

## Degenerate Strategies Found

1. **The "Hoarder's Turbo" Loop (Algae Bio-Furnace Exploit)**:
   - *Behavior*: A player equips `Algae Bio-Furnace` (+2% speed per scum clot) and intentionally refuses to dock or compost their 30 scum clots.
   - *Impact*: The tugboat gains an unconditional +60% top speed boost forever. It outruns all boss projectiles, ignores the 55% algae fouling drag penalty completely, and trivializes navigation, breaking the core design loop of returning to Port Bramble Pier to deposit compost.

2. **Spell Deflection Disappointment**:
   - *Behavior*: A player drafts `Steam Surge` ("Rams through slimes for 4 damage!") or `Resonant Harmonic` ("Sonic crescent dealing 3 damage"), saves their spell for the Bog Behemoth, and rams it at full speed.
   - *Impact*: The boss deflects the attack with a rubbery squelch, dealing 0 damage because `isBigBell` was false. The player feels cheated by the card description.

---

## Progression & Economy Analysis

### EXP Pacing & Leveling Curve
- **Formula**: `expToNextLevel = Math.floor(expToNextLevel * 1.5 + 25)` starting at 50 EXP.
  - Level 1 → 2: 50 EXP (Scoop 5 scum or compost 3 scum)
  - Level 2 → 3: 100 EXP (Scoop 10 scum or compost 6 scum)
  - Level 3 → 4: 175 EXP
  - Level 4 → 5: 287 EXP
  - Level 5 → 6: 455 EXP
- **Pond 1 Scum Yield**: 16 slimes generate ~20 scum clots.
  - Scooping 20 clots: $+200$ EXP
  - Depositing 20 clots in pier vat: $+300$ EXP
  - Total Map 1 EXP: **~500 EXP** (yields **Level 3** and unlocks 2 Tome of the Lilypad drafts).
- **Verdict**: EXP pacing for Map 1 is **HEALTHY** and well-tuned.

### Shop Economy (Barnaby's Shed)
- **Faucets**:
  - Scum Composting: 4 Debris per clot $\times 20 = 80$ Debris.
  - Floating Pond Trash: 30–50 Debris per run.
  - Total per run: **110–130 Debris**.
- **Sinks**:
  - Tier 2 upgrades: 20–35 Debris (1 run).
  - Tier 3 upgrades: 50–75 Debris (2 runs).
  - Tier 4 upgrades: 85–125 Debris (3–4 runs).
- **Verdict**: Economy curve is **HEALTHY**.

---

## Recommendations

| Priority | Issue | Suggested Fix | Impact |
| :--- | :--- | :--- | :--- |
| **P1** | Spells deal 0 damage to Bog Behemoth | Allow spells/ramming to damage boss, capped at 1–2 damage per hit (`damage = Math.min(2, damage)`) | Makes drafted wizard spells feel impactful during the boss fight without trivializing the Big Bell mechanic. |
| **P2** | Big Bell Boss TTK too long (45.0s min) | Increase Big Bell direct hit damage from 1 to 2 HP on unshielded boss (reducing required hits from 10 to 5) | Lowers ideal boss TTK from 45.0s to 22.5s, preventing player fatigue during enrage phases. |
| **P3** | Algae Bio-Furnace speed stacking (+60%) | Cap bio-furnace speed bonus at +25% max (`Math.min(1.25, 1.0 + scum * 0.015)`) | Preserves the thrill of burning biofuel without turning the boat into an uncontrollable rocket or breaking dock loop. |
| **P4** | Acoustic Resonator missing Big Bell CD reduction | In `applyPassiveImmediateEffects`, set `boat.bell.bigBellCooldownDuration *= 0.75` (reducing CD from 4.5s to 3.375s) | Fulfills the tooltip promise of faster Big Bell recharges. |
| **P5** | Bog Behemoth Scum Clot Over-Healing | Limit boss healing to 1 HP every 3 seconds max, or cap max regenerated HP to +3 HP total | Prevents boss from instantly undoing multiple minutes of player work if a clot spawns nearby. |

---

## Values That Need Attention

1. **`src/entities/SlimeBlob.js` (line 1060)**:
   - *Current*: `if (this.stage === SLIME_STAGE.BOSS && !isBigBell) return { immuneToNormalBell: true };`
   - *Suggested*: Allow spell / ram damage:
     ```javascript
     if (this.stage === SLIME_STAGE.BOSS && !isBigBell) {
       if (damage > 1) {
         // Spells and heavy rams penetrate boss hide for tuned damage (max 2)
         damage = Math.min(2, damage);
       } else {
         return { immuneToNormalBell: true, health: this.health };
       }
     }
     ```

2. **`src/systems/RippleSystem.js` (line 67)**:
   - *Current*: `const damage = (slime.stage === SLIME_STAGE.BOSS) ? 1 : (rip.isBigBell ? 2 : 1);`
   - *Suggested*: `const damage = (slime.stage === SLIME_STAGE.BOSS) ? (rip.isBigBell ? 2 : 1) : (rip.isBigBell ? 2 : 1);` (Big Bell inflicts 2 damage to unshielded boss).

3. **`src/systems/UpgradeSystem.js` (lines 105, 292, 468)**:
   - *Current*: `boat.fuelSpeedBonus = 1.0 + (scumCount * 0.02);` (up to 1.6x)
   - *Suggested*: `boat.fuelSpeedBonus = Math.min(1.25, 1.0 + (scumCount * 0.012));`
   - *Current Acoustic Resonator*: misses `boat.bell.bigBellCooldownDuration = 3.375;`.
