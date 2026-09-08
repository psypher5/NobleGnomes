import * as THREE from 'three';
import { SLIME_STAGE } from '../entities/SlimeBlob.js';

/**
 * Manages the physics and gameplay propagation of bell sonic ripples.
 * Communicates with the PondWater shader and applies shockwaves to slime targets.
 */
export class RippleSystem {
  constructor(pondWater) {
    this.pondWater = pondWater;
    this.ripples = [];
    // Reusable scratch Vector2 to avoid per-frame allocations in intersection loops
    this._tmpV2 = new THREE.Vector2();
    this._tmpCenter2D = new THREE.Vector2();
  }

  /**
   * Spawn a new expanding bell chime shockwave
   */
  triggerBellShockwave(origin, radius = 22.0, speed = 15.0, strength = 1.0, isBigBell = false) {
    const ripple = {
      origin: new THREE.Vector2(origin.x, origin.z),
      currentRadius: 0.1,
      maxRadius: radius,
      speed: speed,
      strength: strength,
      isBigBell: Boolean(isBigBell),
      damageAppliedSet: new Set() // Prevent multiple hits on same entity from single wave
    };

    this.ripples.push(ripple);

    // Pass to water surface shader for visual wave displacement
    if (this.pondWater) {
      this.pondWater.addRipple(origin.x, origin.z, strength, speed, radius);
    }
  }

  /**
   * Disperse / cancel active bell ripples caught in a tidal ground pound surge
   */
  disperseRipplesNear(center, radius = 24.0) {
    this._tmpCenter2D.set(center.x, center.z);
    for (let r = this.ripples.length - 1; r >= 0; r--) {
      const rip = this.ripples[r];
      const dist = rip.origin.distanceTo(this._tmpCenter2D);
      if (dist < radius + rip.currentRadius) {
        this.ripples.splice(r, 1);
      }
    }
  }

  update(dt, slimes, onSlimeCleansed) {
    for (let r = this.ripples.length - 1; r >= 0; r--) {
      const rip = this.ripples[r];
      const prevRadius = rip.currentRadius;
      rip.currentRadius += rip.speed * dt;

      // Test intersection against all active slimes
      for (const slime of slimes) {
        if (slime.isDead) continue;
        if (rip.damageAppliedSet.has(slime)) continue;

        // Reuse scratch vec2 to avoid per-frame allocation
        this._tmpV2.set(slime.position.x, slime.position.z);
        const dist = rip.origin.distanceTo(this._tmpV2);

        // When the expanding wave ring sweeps across the slime
        if (dist >= prevRadius - 1.2 && dist <= rip.currentRadius + 1.2) {
          rip.damageAppliedSet.add(slime);
          // Boss takes 2 damage per Big Bell hit (5 hits total to defeat, TTK ~22.5s)
          const damage = (slime.stage === SLIME_STAGE.BOSS) ? (rip.isBigBell ? 2 : 1) : (rip.isBigBell ? 2 : 1);
          const hitResult = slime.hit(damage, rip.isBigBell);
          const isShielded = Boolean(hitResult && hitResult.shielded);
          const isDestroyed = (hitResult === true);

          if (onSlimeCleansed) {
            onSlimeCleansed(slime, isDestroyed, isShielded, hitResult, rip.isBigBell);
          }
        }
      }

      if (rip.currentRadius >= rip.maxRadius) {
        this.ripples.splice(r, 1);
      }
    }
  }
}
