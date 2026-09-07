import * as THREE from 'three';
import { SlimeBlob, SLIME_STAGE } from '../entities/SlimeBlob.js';
import { SlimeProjectile } from '../entities/SlimeProjectile.js';
import { RockProjectile } from '../entities/RockProjectile.js';
import { ScumClot } from '../entities/ScumClot.js';
import { sounds } from '../audio/SoundSynthesizer.js';

/**
 * Procedural organic colony scum disc with wavy perturbed perimeter.
 */
function createColonyScumGeometry(radius, lobes = 7, seed = 0) {
  const geo = new THREE.BufferGeometry();
  const vertices = [0, 0, 0];
  const uvs = [0.5, 0.5];
  const indices = [];
  const segments = 54;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const r = radius * (0.88 + Math.sin(angle * lobes + seed) * 0.12 + Math.cos(angle * 3.0 - seed) * 0.07);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    vertices.push(x, 0, z);
    uvs.push((x / (radius * 2.2)) + 0.5, (z / (radius * 2.2)) + 0.5);
    if (i > 0) {
      indices.push(0, i, i === segments ? 1 : i + 1);
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Manages the ecosystem of algae films, slime mounds, and expressive monsters.
 * Handles dynamic algae propagation, ballistic glob throwing, and cleansing effects.
 */
export class SlimeManager {
  constructor(scene, pondRadius = 36) {
    this.scene = scene;
    this.pondRadius = pondRadius;
    this.slimes = [];
    this.particles = [];
    this.projectiles = [];
    this.rockProjectiles = [];
    this.colonies = [];
    this.scumClots = [];
    this.totalScumSpawned = 0;
    this.scumDeposited = 0;

    this.initialSlimeCount = 20;
    this.maxSlimeCount = 28; // Keep performance crisp and allow breathing room
    this.cleansedCount = 0;
    this.totalSpawned = 0;

    this.initEcosystem();
  }

  initEcosystem() {
    // 1. Define 3 major pond territories with organic merged surface scum mats
    this.colonies = [
      {
        id: 'boss-fen',
        name: 'The Boss Fen',
        center: new THREE.Vector3(14, 0, -16),
        radius: 11.5,
        lobes: 7,
        seed: 1.2,
        hasBoss: true
      },
      {
        id: 'shadow-shoals',
        name: 'The Shadow Shoals',
        center: new THREE.Vector3(-16, 0, -13),
        radius: 9.8,
        lobes: 6,
        seed: 3.4,
        hasBoss: false
      },
      {
        id: 'murk-hollow',
        name: 'The Murk Hollow',
        center: new THREE.Vector3(17, 0, 13),
        radius: 8.8,
        lobes: 5,
        seed: 5.6,
        hasBoss: false
      }
    ];

    // 2. Build merged surface scum mats for each territory
    for (const col of this.colonies) {
      const colGroup = new THREE.Group();
      colGroup.position.set(col.center.x, 0.022, col.center.z);

      // Deep base scum mat
      const baseGeo = createColonyScumGeometry(col.radius, col.lobes, col.seed);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1d4715,
        roughness: 0.82,
        metalness: 0.05,
        transparent: true,
        opacity: 0.76,
        depthWrite: false
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      colGroup.add(baseMesh);

      // Lighter chartreuse surface swirl layer
      const innerGeo = createColonyScumGeometry(col.radius * 0.72, col.lobes - 1, col.seed + 1.5);
      const innerMat = new THREE.MeshStandardMaterial({
        color: 0x5fa820,
        emissive: 0x224808,
        emissiveIntensity: 0.35,
        roughness: 0.65,
        metalness: 0.05,
        transparent: true,
        opacity: 0.62,
        depthWrite: false
      });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.position.y = 0.003;
      colGroup.add(innerMesh);

      // Floating scum foam flecks & bubbles
      const fleckGeo = new THREE.CircleGeometry(0.35, 6);
      fleckGeo.rotateX(-Math.PI / 2);
      const fleckMat = new THREE.MeshBasicMaterial({
        color: 0x86ef34,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      });
      const fleckCount = 14;
      for (let f = 0; f < fleckCount; f++) {
        const fAngle = Math.random() * Math.PI * 2;
        const fDist = Math.random() * col.radius * 0.85;
        const fleck = new THREE.Mesh(fleckGeo, fleckMat);
        fleck.position.set(Math.cos(fAngle) * fDist, 0.005, Math.sin(fAngle) * fDist);
        fleck.scale.set(0.6 + Math.random() * 0.8, 1, 0.6 + Math.random() * 0.8);
        colGroup.add(fleck);
      }

      this.scene.add(colGroup);
      col.meshGroup = colGroup;
      col.initialRadius = col.radius;
    }

    // 3. Spawn the Bog Behemoth Boss at the center of The Boss Fen!
    const bossColony = this.colonies[0];
    this.spawnSlime(bossColony.center.x, bossColony.center.z, SLIME_STAGE.BOSS, 6.0);

    // 4. Distribute slimes across territories with strict anti-overlapping spacing (>= 4.2m)
    for (let c = 0; c < this.colonies.length; c++) {
      const colony = this.colonies[c];
      const count = c === 0 ? 5 : (c === 1 ? 6 : 5);

      for (let s = 0; s < count; s++) {
        let stage = SLIME_STAGE.FILM;
        if (s === 0 && !colony.hasBoss) {
          stage = SLIME_STAGE.MONSTER;
        } else if (s <= 2) {
          stage = SLIME_STAGE.BLOB;
        }

        this.spawnSlimeInColony(colony, stage, 4.2);
      }
    }
  }

  spawnSlimeInColony(colony, stage = SLIME_STAGE.FILM, minDistance = 4.2) {
    if (this.slimes.length >= this.maxSlimeCount) return null;

    let candidateX = 0;
    let candidateZ = 0;
    let found = false;

    // Retry up to 30 times to find a position with >= minDistance from all existing slimes
    for (let t = 0; t < 30; t++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = (0.2 + Math.random() * 0.72) * colony.radius;
      const x = colony.center.x + Math.cos(angle) * dist;
      const z = colony.center.z + Math.sin(angle) * dist;

      // Ensure not overlapping existing slimes
      let overlapping = false;
      for (const existing of this.slimes) {
        const sep = Math.hypot(x - existing.position.x, z - existing.position.z);
        const reqDist = existing.stage === SLIME_STAGE.BOSS ? 5.8 : minDistance;
        if (sep < reqDist) {
          overlapping = true;
          break;
        }
      }

      // Check distance to Pier
      if (Math.hypot(x - 1.6, z - 32.0) < 10.0 || Math.hypot(x, z) < 5.0) {
        overlapping = true;
      }

      if (!overlapping) {
        candidateX = x;
        candidateZ = z;
        found = true;
        break;
      }
    }

    if (found) {
      return this.spawnSlime(candidateX, candidateZ, stage, minDistance);
    }
    return null;
  }

  spawnSlime(x = null, z = null, stage = SLIME_STAGE.FILM, minDistance = 4.2) {
    if (this.slimes.length >= this.maxSlimeCount) return null;

    if (x === null || z === null) {
      // Pick random colony
      const colony = this.colonies[Math.floor(Math.random() * this.colonies.length)];
      return this.spawnSlimeInColony(colony, stage, minDistance);
    }

    // Clamp within pond basin
    const r = Math.sqrt(x * x + z * z);
    if (r > this.pondRadius - 3.0) {
      const factor = (this.pondRadius - 3.0) / r;
      x *= factor;
      z *= factor;
    }

    const slime = new SlimeBlob(x, z, stage);
    this.scene.add(slime.group);
    this.slimes.push(slime);
    this.totalSpawned++;
    return slime;
  }

  launchProjectile(startPos, targetPos, pondWater = null, tugboat = null, onFouledCallback = null, isBossAlgae = false) {
    const proj = new SlimeProjectile(startPos, targetPos, 4.2, (landPos) => {
      this.handleProjectileLanding(landPos, pondWater, tugboat, onFouledCallback, isBossAlgae);
    });

    this.scene.add(proj.group);
    this.projectiles.push(proj);
  }

  launchRockProjectile(startPos, targetPos, pondWater = null, tugboat = null, onHitCallback = null) {
    const proj = new RockProjectile(startPos, targetPos, 4.8, (landPos) => {
      this.handleRockLanding(landPos, pondWater, tugboat, onHitCallback);
    });

    this.scene.add(proj.group);
    this.rockProjectiles.push(proj);
  }

  /**
   * Radial bullet-heaven ring spread — fires projectiles in evenly spaced directions
   */
  launchProjectileRing(origin, count, isBossAlgae, pondWater = null, tugboat = null, onFouledCallback = null) {
    const ringRadius = 28.0; // How far each projectile travels
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const target = new THREE.Vector3(
        origin.x + Math.cos(angle) * ringRadius,
        0.05,
        origin.z + Math.sin(angle) * ringRadius
      );
      this.launchProjectile(origin.clone(), target, pondWater, tugboat, onFouledCallback, isBossAlgae);
    }
  }

  /**
   * Boss Ground Pound — massive tidal shockwave that pushes the boat back and disperses bell ripples
   */
  triggerBossGroundPound(boss, pondWater = null, tugboat = null, rippleSystem = null, onFouledCallback = null) {
    const center = boss.position.clone();
    const pushRadius = 26.0;
    const pushForce = 18.0;

    // 0. Visceral concussive sound effect
    try { sounds.playGroundPound(); } catch (e) {}

    // 1. Massive pond splash ripple
    if (pondWater) {
      pondWater.addRipple(center.x, center.z, 2.2, 18.0, 38.0);
    }

    // 2. Pushback: radial impulse on tugboat
    if (tugboat && !tugboat.isCapsized) {
      const dx = tugboat.position.x - center.x;
      const dz = tugboat.position.z - center.z;
      const dist = Math.hypot(dx, dz);
      if (dist < pushRadius && dist > 0.1) {
        const falloff = 1.0 - (dist / pushRadius);
        const force = pushForce * falloff;
        const nx = dx / dist;
        const nz = dz / dist;
        // Apply impulse by nudging position and reversing speed
        tugboat.position.x += nx * force * 0.22;
        tugboat.position.z += nz * force * 0.22;
        if (typeof tugboat.speed === 'number') {
          tugboat.speed = Math.min(tugboat.speed, -3.5);
        }
        // Also damage if close
        if (dist < 9.0) {
          tugboat.takeDamage(10, 'Bog Behemoth Ground Pound');
          try { sounds.playHullDamage(); } catch (e) { /* optional */ }
          if (onFouledCallback) {
            onFouledCallback('💥 TIDAL WAVE IMPACT! Ground Pound cracked the hull (-10 HP)!', '#ef4444');
          }
        } else {
          if (onFouledCallback) {
            onFouledCallback('🌊 Colossal tidal wave pushes you back! Bell waves dispersed!', '#38bdf8');
          }
        }
      }
    }

    // 3. Disperse active bell ripples
    if (rippleSystem) {
      rippleSystem.disperseRipplesNear(center, pushRadius);
    }

    // 4. Bullet-heaven splash: radial ring of slime projectiles ejected from impact
    this.launchProjectileRing(center.clone().add(new THREE.Vector3(0, 1.2, 0)), 8, true, pondWater, tugboat, onFouledCallback);

    // 5. Splash particles around the impact zone
    this.spawnSplashParticles(center, 32);
  }

  handleBossHealed(boss, val = 1, onFouledCallback = null) {
    try { sounds.playAlgaeSplattered(); } catch (e) {}
    this.spawnSplashParticles(boss.position, 10);
    if (onFouledCallback) {
      onFouledCallback(`🦠 Bog Behemoth swallowed algae scum and recovered +${val} HP! (${boss.health}/${boss.maxHealth} HP)`, '#22c55e');
    }
  }

  handleRockLanding(landPos, pondWater = null, tugboat = null, onHitCallback = null) {
    // 1. Check direct rock impact on player's tugboat hull
    if (tugboat && !tugboat.isCapsized) {
      const distToBoat = Math.hypot(landPos.x - tugboat.position.x, landPos.z - tugboat.position.z);
      if (distToBoat < 2.8) {
        tugboat.takeDamage(20, 'Bog Behemoth Mossy Boulder');
        sounds.playRockCrash();
        sounds.playHullDamage();
        if (onHitCallback) {
          onHitCallback('💥 CRITICAL HIT! Bog Behemoth boulder smashed hull (-20 HP)!', '#ef4444');
        }
      }
    }

    // 2. Heavy rock crash audio
    sounds.playRockCrash();

    // 3. Splash particles & mud fragments
    this.spawnRockSplashParticles(landPos, 16);

    // 4. Large dramatic pond ripple
    if (pondWater) {
      pondWater.addRipple(landPos.x, landPos.z, 0.75, 16.0, 14.0);
    }
  }

  handleProjectileLanding(landPos, pondWater = null, tugboat = null, onFouledCallback = null, isBossAlgae = false) {
    // 1. Check direct projectile hit on player's tugboat
    if (tugboat && !tugboat.isCapsized) {
      const distToBoat = Math.hypot(landPos.x - tugboat.position.x, landPos.z - tugboat.position.z);
      if (distToBoat < 2.5) {
        tugboat.addAlgae(0.35);
        sounds.playAlgaeSplattered();
        if (onFouledCallback) {
          onFouledCallback('⚠️ Direct Hit! Algae splattered on boat! Press [C] to Clean!', '#f87171');
        }
      }
    }

    // 2. Play gooey squelch sound
    sounds.playSlimeSplat();

    // 3. Spawn gooey splash particles
    this.spawnSplashParticles(landPos, 10);

    // 4. Trigger small water ripple if pondWater provided
    if (pondWater) {
      pondWater.addRipple(landPos.x, landPos.z, 0.45, 12.0, 10.0);
    }

    // 5. Sprout fertile Algae Bloom on water impact
    // Boss throws have higher sprout chance (70%), standard monsters 35%
    const shouldSproutBloom = isBossAlgae ? (Math.random() < 0.70) : (Math.random() < 0.35);
    if (shouldSproutBloom && this.slimes.length < this.maxSlimeCount) {
      const distFromCenter = Math.hypot(landPos.x, landPos.z);
      if (distFromCenter < 37.0) {
        const newBloom = this.spawnSlime(landPos.x, landPos.z, SLIME_STAGE.FILM, 2.6);
        if (newBloom) {
          sounds.playBubblePop(1.5);
          if (onFouledCallback) {
            onFouledCallback('⚠️ Algae bloom sprouted! Cleanse it before it matures into a monster!', '#a3e635');
          }
        }
      }
    }
  }

  handleBubbleHatched(pos, pondWater = null) {
    if (this.slimes.length < this.maxSlimeCount) {
      sounds.playBubblePop(1.4);
      this.spawnSplashParticles(pos, 6);
      if (pondWater) {
        pondWater.addRipple(pos.x, pos.z, 0.35, 10.0, 8.0);
      }
      let closestColony = this.colonies[0];
      let minDist = 999;
      for (const col of this.colonies) {
        const d = col.center.distanceTo(pos);
        if (d < minDist) {
          minDist = d;
          closestColony = col;
        }
      }
      this.spawnSlimeInColony(closestColony, SLIME_STAGE.FILM, 4.2);
    }
  }

  spawnSplashParticles(pos, count = 10) {
    const dropGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const dropMat = new THREE.MeshBasicMaterial({
      color: 0x72d91e,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(dropGeo, dropMat);
      p.position.set(pos.x, 0.1, pos.z);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.2;

      p.userData = {
        vx: Math.cos(angle) * speed,
        vy: 2.2 + Math.random() * 2.2,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.35
      };

      this.scene.add(p);
      this.particles.push(p);
    }
  }

  spawnRockSplashParticles(pos, count = 16) {
    const waterGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const waterMat = new THREE.MeshBasicMaterial({
      color: 0x99ddff,
      transparent: true,
      opacity: 0.85
    });
    const rockGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x4a4238,
      roughness: 0.9
    });

    for (let i = 0; i < count; i++) {
      const isMud = i % 2 === 0;
      const p = new THREE.Mesh(isMud ? rockGeo : waterGeo, isMud ? rockMat : waterMat);
      p.position.set(pos.x + (Math.random() - 0.5) * 0.5, 0.1, pos.z + (Math.random() - 0.5) * 0.5);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 3.2;

      p.userData = {
        vx: Math.cos(angle) * speed,
        vy: 3.5 + Math.random() * 3.5,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.4
      };

      this.scene.add(p);
      this.particles.push(p);
    }
  }

  handleSlimeCleansed(slime, isDestroyed) {
    this.spawnPopParticles(slime.position, isDestroyed ? 12 : 5);
    if (isDestroyed) {
      this.cleansedCount++;

      // Spawn floating Scum Clot drop(s) where slime was defeated
      const clotCount = slime.stage === SLIME_STAGE.BOSS ? 4 : (slime.stage === SLIME_STAGE.MONSTER ? 2 : 1);
      for (let c = 0; c < clotCount; c++) {
        const ox = (Math.random() - 0.5) * (clotCount > 1 ? 1.6 : 0.4);
        const oz = (Math.random() - 0.5) * (clotCount > 1 ? 1.6 : 0.4);
        const clot = new ScumClot(slime.position.x + ox, slime.position.z + oz, 1);
        this.scene.add(clot.group);
        this.scumClots.push(clot);
      }
      this.totalScumSpawned += clotCount;
    }
  }

  spawnPopParticles(pos, count = 8) {
    const bubbleGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xb7f0d0,
      transparent: true,
      opacity: 0.88
    });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(bubbleGeo, bubbleMat);
      p.position.set(
        pos.x + (Math.random() - 0.5) * 0.6,
        pos.y + 0.2 + Math.random() * 0.4,
        pos.z + (Math.random() - 0.5) * 0.6
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.0;

      p.userData = {
        vx: Math.cos(angle) * speed,
        vy: 2.0 + Math.random() * 2.5,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4
      };

      this.scene.add(p);
      this.particles.push(p);
    }
  }

  update(dt, time, boatPosition, pondWater = null, boatHeading = 0, boatSpeed = 0, tugboat = null, onFouledCallback = null, rippleSystem = null, onScumCollectedCallback = null) {
    // 0. Animate colony merged scum mats and scale according to resident slimes
    for (const col of this.colonies) {
      if (col.meshGroup) {
        let slimesInCol = 0;
        for (const s of this.slimes) {
          if (Math.hypot(s.position.x - col.center.x, s.position.z - col.center.z) < col.radius * 1.35) {
            slimesInCol++;
          }
        }
        const targetScale = slimesInCol === 0 ? 0.001 : Math.min(1.0, 0.45 + (slimesInCol / 6) * 0.55);
        const breathe = 1.0 + Math.sin(time * 1.6 + col.seed) * 0.035;
        col.meshGroup.scale.set(targetScale * breathe, 1, targetScale * breathe);
        col.meshGroup.visible = col.meshGroup.scale.x > 0.05;
      }
    }

    // 1. Update individual slimes
    const isBoatMoving = Math.abs(boatSpeed) > 0.5;

    for (let i = this.slimes.length - 1; i >= 0; i--) {
      const slime = this.slimes[i];

      // Dynamic boat wake wobble check
      if (isBoatMoving && !slime.isDead) {
        const dx = slime.position.x - boatPosition.x;
        const dz = slime.position.z - boatPosition.z;
        const fwd = dx * Math.sin(boatHeading) + dz * Math.cos(boatHeading);
        const lat = dx * Math.cos(boatHeading) - dz * Math.sin(boatHeading);

        if (fwd < -0.6 && fwd > -8.5) {
          const distBehind = -fwd;
          const wakeHalfWidth = 0.85 + distBehind * 0.42;
          const armDist = Math.abs(Math.abs(lat) - wakeHalfWidth);

          if (armDist < 2.0) {
            const wakeProximity = (1.0 - distBehind / 8.5) * (1.0 - armDist / 2.0) * Math.min(1.0, Math.abs(boatSpeed) / 7.5);
            slime.applyWakeWobble(wakeProximity, dt);
          }
        }
      }

      // Collision check: boat plowing into active algae patch
      if (tugboat && !tugboat.isCapsized && !slime.isDead) {
        const distToBoat = Math.hypot(slime.position.x - boatPosition.x, slime.position.z - boatPosition.z);
        const contactRadius = (slime.radius || 1.3) + 1.25;
        if (distToBoat < contactRadius) {
          const oldLevel = tugboat.algaeLevel;
          tugboat.addAlgae(dt * 0.40);

          if (oldLevel < 0.25 && tugboat.algaeLevel >= 0.25 && onFouledCallback) {
            onFouledCallback('⚠️ Plowing through algae! Speed reduced. Press [C] to Clean!', '#f59e0b');
          }

          // Direct collision impact damage from heavy monsters & boss
          if (slime.stage === SLIME_STAGE.BOSS) {
            if (!this.lastBossSmashTime || time - this.lastBossSmashTime > 1.5) {
              this.lastBossSmashTime = time;
              tugboat.takeDamage(12, 'Bog Behemoth Collision');
              sounds.playHullDamage();
              if (onFouledCallback) {
                onFouledCallback('💥 Rammed by Bog Behemoth! Hull cracked (-12 HP)!', '#ef4444');
              }
            }
          } else if (slime.stage === SLIME_STAGE.MONSTER) {
            if (!this.lastMonsterRamTime || time - this.lastMonsterRamTime > 2.0) {
              this.lastMonsterRamTime = time;
              tugboat.takeDamage(5, 'Monster Impact');
              sounds.playHullDamage();
            }
          }

          if (!this.lastHullSquelchTime || time - this.lastHullSquelchTime > 0.5) {
            this.lastHullSquelchTime = time;
            sounds.playSlimeSplat();
            this.spawnSplashParticles(slime.position, 4);
          }
        }
      }

      slime.update(
        dt,
        time,
        boatPosition,
        (start, target, isBossAlgae = false) => {
          this.launchProjectile(start, target, pondWater, tugboat, onFouledCallback, isBossAlgae);
        },
        (hatchPos) => {
          this.handleBubbleHatched(hatchPos, pondWater);
        },
        (start, target) => {
          this.launchRockProjectile(start, target, pondWater, tugboat, onFouledCallback);
        },
        (origin, count, isBossAlgae = true) => {
          this.launchProjectileRing(origin, count, isBossAlgae, pondWater, tugboat, onFouledCallback);
        },
        (boss) => {
          this.triggerBossGroundPound(boss, pondWater, tugboat, rippleSystem, onFouledCallback);
        },
        this.scumClots,
        (boss, val) => {
          this.handleBossHealed(boss, val, onFouledCallback);
        }
      );

      if (slime.isDead) {
        slime.dispose();
        this.scene.remove(slime.group);
        this.slimes.splice(i, 1);
      }
    }

    // 2. Update active slime projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt, this.scene);

      if (proj.isDead) {
        this.scene.remove(proj.group);
        proj.dispose(this.scene);
        this.projectiles.splice(i, 1);
      }
    }

    // 2b. Update active rock projectiles
    for (let i = this.rockProjectiles.length - 1; i >= 0; i--) {
      const proj = this.rockProjectiles[i];
      proj.update(dt, this.scene);

      if (proj.isDead) {
        this.scene.remove(proj.group);
        proj.dispose(this.scene);
        this.rockProjectiles.splice(i, 1);
      }
    }

    // 3. Animate clean water bubbles / splash particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.life += dt;
      const progress = p.userData.life / p.userData.maxLife;

      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      p.userData.vy -= 9.8 * dt * 0.6; // Gravity arc

      p.scale.setScalar(1.0 - progress * 0.7);
      p.material.opacity = 0.85 * (1.0 - progress);

      if (progress >= 1.0) {
        this.scene.remove(p);
        p.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }

    // 4. Update Floating Scum Clots & Scooping into Tugboat Hopper
    if (this.scumClots && this.scumClots.length > 0) {
      for (let i = this.scumClots.length - 1; i >= 0; i--) {
        const clot = this.scumClots[i];

        // Check collection collision and magnetic attraction with tugboat
        if (tugboat && !clot.isCollected) {
          const distToBoat = Math.hypot(clot.position.x - boatPosition.x, clot.position.z - boatPosition.z);

          // Magnetic suction: pull clot toward boat when within 7.5 meters!
          if (distToBoat < 7.5 && distToBoat > 1.5) {
            const pullSpeed = (1.0 - (distToBoat / 7.5)) * 10.5 * dt;
            const dirX = (boatPosition.x - clot.position.x) / distToBoat;
            const dirZ = (boatPosition.z - clot.position.z) / distToBoat;
            clot.position.x += dirX * pullSpeed;
            clot.position.z += dirZ * pullSpeed;
            clot.group.position.x = clot.position.x;
            clot.group.position.z = clot.position.z;
          }

          // Scoop into hopper when within 3.8 meters
          if (distToBoat < 3.8) {
            if (tugboat.scumCargo < tugboat.maxScumCargo) {
              clot.startCollection(tugboat);
              tugboat.addScumCargo(clot.value);
              try { sounds.playDebrisCollected(); } catch (e) { /* audio fallback */ }
              const expEarned = clot.value * 10;
              if (onScumCollectedCallback) {
                onScumCollectedCallback(clot.value, expEarned);
              }
              if (onFouledCallback) {
                onFouledCallback(`🧪 +${clot.value} Algae Scum Scooped! (+${expEarned} EXP ⭐) [${tugboat.scumCargo}/${tugboat.maxScumCargo}]`, '#86efac');
              }
            } else if (onFouledCallback && Math.random() > 0.8) {
              onFouledCallback('⚠️ Scum Hopper Full! Return to Port Bramble Pier to unload!', '#facc15');
            }
          }
        }

        const isFinished = clot.update(dt, time);
        if (isFinished) {
          clot.dispose(this.scene);
          this.scumClots.splice(i, 1);
        }
      }
    }

  }

  getTotalScumSpawned() {
    return this.totalScumSpawned;
  }

  getScumDeposited() {
    return this.scumDeposited;
  }

  addScumDeposited(amount) {
    this.scumDeposited += amount;
  }

  getFloatingScumCount() {
    return this.scumClots.filter((c) => !c.isCollected).length;
  }

  getPondPurityPercentage() {
    if (this.totalSpawned === 0) return 100;
    const remaining = this.slimes.length;
    const purity = Math.max(0, Math.min(100, Math.round(((this.totalSpawned - remaining) / this.totalSpawned) * 100)));
    return purity;
  }

  getRemainingCount() {
    return this.slimes.length;
  }

  resetLevel(levelConfig = {}) {
    // 1. Remove & dispose existing slimes
    for (const slime of this.slimes) {
      if (slime.group) {
        this.scene.remove(slime.group);
        slime.dispose(this.scene);
      }
    }
    this.slimes = [];

    // 1b. Remove & dispose floating scum clots
    if (this.scumClots) {
      for (const clot of this.scumClots) {
        clot.dispose(this.scene);
      }
      this.scumClots = [];
    }
    this.totalScumSpawned = 0;
    this.scumDeposited = 0;

    // 2. Remove & dispose projectiles
    for (const proj of this.projectiles) {
      if (proj.group) {
        this.scene.remove(proj.group);
        proj.dispose(this.scene);
      }
    }
    this.projectiles = [];

    for (const proj of this.rockProjectiles) {
      if (proj.group) {
        this.scene.remove(proj.group);
        proj.dispose(this.scene);
      }
    }
    this.rockProjectiles = [];

    // 3. Remove & dispose particles
    for (const p of this.particles) {
      this.scene.remove(p);
      if (p.geometry) p.geometry.dispose();
      if (p.material) p.material.dispose();
    }
    this.particles = [];

    // 4. Remove existing colonies
    for (const col of this.colonies) {
      if (col.meshGroup) {
        this.scene.remove(col.meshGroup);
        col.meshGroup.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        });
      }
    }
    this.colonies = [];

    this.cleansedCount = 0;
    this.totalSpawned = 0;

    if (typeof levelConfig.slimeCount === 'number') {
      this.initialSlimeCount = levelConfig.slimeCount;
    } else {
      this.initialSlimeCount = 20;
    }

    // 5. Spawn fresh ecosystem tailored to the level!
    this.initEcosystem();
  }

  getBossSlime() {
    return this.slimes.find(s => s.stage === SLIME_STAGE.BOSS && !s.isDead) || null;
  }

  resetBossPosition() {
    const boss = this.getBossSlime();
    if (boss) {
      const bossColony = this.colonies.find(c => c.hasBoss) || this.colonies[0];
      const targetPos = bossColony ? bossColony.center : new THREE.Vector3(14, 0, -16);
      boss.position.set(targetPos.x, 0, targetPos.z);
      if (boss.mesh) {
        boss.mesh.position.copy(boss.position);
      }
      boss.targetPos = null;
      boss.throwTimer = 0;
      boss.poundTimer = 0;
      boss.isCharging = false;
      boss.isPounding = false;
      boss.isAgitated = false;

      // Despawn any airborne rock projectiles hurled by the boss
      for (let i = this.rockProjectiles.length - 1; i >= 0; i--) {
        const rock = this.rockProjectiles[i];
        if (rock && typeof rock.dispose === 'function') {
          rock.dispose();
        } else if (rock && rock.mesh && rock.mesh.parent) {
          rock.mesh.parent.remove(rock.mesh);
        }
        this.rockProjectiles.splice(i, 1);
      }
    }
  }
}
