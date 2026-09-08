import * as THREE from 'three';
import { sounds } from '../audio/SoundSynthesizer.js';

export const ALL_UPGRADES = [
  // --- Active Gnome Wizard Spells ---
  {
    id: 'spell_steam_surge',
    name: 'Steam Surge',
    icon: '💨',
    type: 'SPELL',
    rarity: 'Rare',
    patron: 'Barnaby the Engineer',
    cooldown: 8.0,
    description: 'Overcharges boiler for a 2.2s hydro-dash (15m/s). Rams through slimes for 4 damage!',
    color: '#38bdf8'
  },
  {
    id: 'spell_verdant_flare',
    name: 'Verdant Flare',
    icon: '🌟',
    type: 'SPELL',
    rarity: 'Uncommon',
    patron: 'Pip the Lookout',
    cooldown: 12.0,
    description: 'Launches a luminous spore mortar illuminating pond depths. Slimes yield double scum!',
    color: '#facc15'
  },
  {
    id: 'spell_resonant_harmonic',
    name: 'Resonant Harmonic',
    icon: '🎵',
    type: 'SPELL',
    rarity: 'Epic',
    patron: 'Clover the Bell Tuner',
    cooldown: 10.0,
    description: 'Sonic crescent wave slicing across water, stunning slimes for 3.0s and dealing 3 damage.',
    color: '#c084fc'
  },
  {
    id: 'spell_tidal_whirlpool',
    name: 'Tidal Whirlpool',
    icon: '🌀',
    type: 'SPELL',
    rarity: 'Rare',
    patron: 'Gideon the Fen Druid',
    cooldown: 15.0,
    description: 'Summons a swirling water vortex vacuuming all floating scum clots & debris within 18m into your boat!',
    color: '#2dd4bf'
  },
  {
    id: 'spell_chrono_chime',
    name: 'Chrono Chime',
    icon: '⏳',
    type: 'SPELL',
    rarity: 'Legendary',
    patron: 'Thimble the Clockmaker',
    cooldown: 20.0,
    description: 'Freezes incoming rock projectiles and slows all enemy movement by 80% for 3.5 seconds.',
    color: '#fbbf24'
  },

  // --- Passive Tugboat Boons ---
  {
    id: 'passive_magnetic_scupper',
    name: 'Magnetic Scupper',
    icon: '🧲',
    type: 'PASSIVE',
    rarity: 'Common',
    description: 'Widens scum & salvage debris vacuum collection radius by +50%.',
    color: '#a7f3d0'
  },
  {
    id: 'passive_self_scrubbing',
    name: 'Self-Scrubbing Skids',
    icon: '🧽',
    type: 'PASSIVE',
    rarity: 'Uncommon',
    description: 'Automatically sheds 15% hull algae fouling every 4 seconds without manual scrubbing.',
    color: '#93c5fd'
  },
  {
    id: 'passive_acoustic_amp',
    name: 'Acoustic Resonator',
    icon: '🔔',
    type: 'PASSIVE',
    rarity: 'Rare',
    description: 'Increases standard Bell strike radius by +40% and speeds up Big Bell recharge by +25%.',
    color: '#fde047'
  },
  {
    id: 'passive_spiked_prow',
    name: 'Bramble Spiked Prow',
    icon: '⚔️',
    type: 'PASSIVE',
    rarity: 'Rare',
    description: 'Heavy bronze ram deals 3 concussive damage to slimes on impact when cruising over 4 m/s.',
    color: '#fb7185'
  },
  {
    id: 'passive_algae_fuel',
    name: 'Algae Bio-Furnace',
    icon: '🔥',
    type: 'PASSIVE',
    rarity: 'Uncommon',
    description: 'Each scum clot in your cargo hopper feeds the boiler (+1.2% top speed per clot, max +25%).',
    color: '#fdba74'
  },
  {
    id: 'passive_oak_plating',
    name: 'Ancient Oak Plating',
    icon: '🛡️',
    type: 'PASSIVE',
    rarity: 'Common',
    description: 'Seasoned bog oak reinforces hull: +35 Max Hull HP and immediately repairs 35 HP.',
    color: '#86efac'
  },
  {
    id: 'passive_deep_keel',
    name: 'Deep Draft Keel',
    icon: '⚓',
    type: 'PASSIVE',
    rarity: 'Uncommon',
    description: 'Increases turning agility by +35% and grants immunity to capsize from boss shockwaves.',
    color: '#67e8f9'
  }
];

export class UpgradeSystem {
  constructor(game) {
    this.game = game;
    this.activePassives = new Set();
    this.equippedSpells = []; // max 4 spells: { ...upgradeDef, currentCooldown: 0 }

    // Active spell runtime state
    this.dashTimer = 0;
    this.dashDuration = 2.2;
    this.flareTimer = 0;
    this.flareDuration = 8.0;
    this.chronoTimer = 0;
    this.chronoDuration = 3.5;
    this.whirlpoolTimer = 0;
    this.whirlpoolDuration = 4.5;
    this.whirlpoolCenter = new THREE.Vector3();
    this.scrubTimer = 0;
    this.dashHitSet = new Set();
    this.prowHitCooldowns = new Map();

    // Visual FX group
    this.fxGroup = new THREE.Group();
    this.game.engine.scene.add(this.fxGroup);

    this.createSpellFXMeshes();

    // Default starter spell for Captain Bramble: Steam Surge
    const starterSpell = ALL_UPGRADES.find(u => u.id === 'spell_steam_surge');
    if (starterSpell) {
      this.equipSpell(starterSpell);
    }
  }

  createSpellFXMeshes() {
    // 1. Whirlpool mesh (translucent swirl ring)
    const wpGeo = new THREE.RingGeometry(0.8, 5.0, 32);
    const wpMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.whirlpoolMesh = new THREE.Mesh(wpGeo, wpMat);
    this.whirlpoolMesh.rotation.x = -Math.PI / 2;
    this.whirlpoolMesh.position.y = 0.08;
    this.fxGroup.add(this.whirlpoolMesh);

    // 2. Chrono Chime clockwork ring
    const chronoGeo = new THREE.RingGeometry(2.0, 14.0, 48);
    const chronoMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.chronoMesh = new THREE.Mesh(chronoGeo, chronoMat);
    this.chronoMesh.rotation.x = -Math.PI / 2;
    this.chronoMesh.position.y = 0.12;
    this.fxGroup.add(this.chronoMesh);

    // 3. Resonant Harmonic sonic crescent wave
    const waveGeo = new THREE.RingGeometry(1.5, 2.5, 32, 1, 0, Math.PI);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.sonicWaveMesh = new THREE.Mesh(waveGeo, waveMat);
    this.sonicWaveMesh.rotation.x = -Math.PI / 2;
    this.sonicWaveMesh.position.y = 0.15;
    this.fxGroup.add(this.sonicWaveMesh);
    this.sonicWaveTimer = 0;

    // 4. Steam Dash jet particles
    const steamCount = 20;
    const steamGeo = new THREE.BufferGeometry();
    const steamPos = new Float32Array(steamCount * 3);
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
    const steamMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 1.2,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.steamPoints = new THREE.Points(steamGeo, steamMat);
    this.fxGroup.add(this.steamPoints);
    this.steamParticles = Array.from({ length: steamCount }, () => ({
      x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, life: 0
    }));
  }

  getDraftChoices(count = 3) {
    const available = ALL_UPGRADES.filter(u => {
      if (u.type === 'PASSIVE') {
        return !this.activePassives.has(u.id);
      } else {
        const alreadyEquipped = this.equippedSpells.some(s => s.id === u.id);
        return !alreadyEquipped || this.equippedSpells.length < 4;
      }
    });

    const pool = [...available].sort(() => Math.random() - 0.5);
    return pool.slice(0, Math.min(count, pool.length));
  }

  applyChoice(upgrade) {
    if (!upgrade) return;

    if (upgrade.type === 'SPELL') {
      this.equipSpell(upgrade);
      this.game.hud.showHint(`✨ Attuned Gnome Spell: ${upgrade.icon} ${upgrade.name}!`, upgrade.color || '#38bdf8');
    } else {
      this.activePassives.add(upgrade.id);
      this.applyPassiveImmediateEffects(upgrade);
      this.game.hud.showHint(`⚓ Acquired Boon: ${upgrade.icon} ${upgrade.name}!`, upgrade.color || '#86efac');
    }

    try { sounds.playTokenFanfare(); } catch (e) { sounds.playFanfare(); }
  }

  equipSpell(spellDef) {
    const existing = this.equippedSpells.find(s => s.id === spellDef.id);
    if (existing) {
      existing.cooldown = Math.max(3.0, existing.cooldown * 0.8);
      existing.level = (existing.level || 1) + 1;
      return;
    }

    if (this.equippedSpells.length < 4) {
      this.equippedSpells.push({
        ...spellDef,
        level: 1,
        currentCooldown: 0,
        slotIdx: this.equippedSpells.length
      });
    } else {
      this.equippedSpells[3] = {
        ...spellDef,
        level: 1,
        currentCooldown: 0,
        slotIdx: 3
      };
    }
  }

  applyPassiveImmediateEffects(upgrade) {
    const boat = this.game.tugboat;
    if (!boat) return;

    switch (upgrade.id) {
      case 'passive_oak_plating':
        boat.maxHealth += 35;
        boat.health = Math.min(boat.maxHealth, boat.health + 35);
        break;
      case 'passive_deep_keel':
        boat.turnSpeed = (boat.turnSpeed || 1.8) * 1.35;
        boat.capsizingImmunity = true;
        break;
      case 'passive_acoustic_amp':
        boat.shockwaveRadiusBonus = (boat.shockwaveRadiusBonus || 1.0) * 1.4;
        if (boat.bell) {
          boat.bell.bigBellCooldownDuration = 3.375; // 4.5s * 0.75 (+25% faster recharge)
        }
        break;
    }
  }

  hasPassive(id) {
    return this.activePassives.has(id);
  }

  castSpell(slotIdx) {
    if (slotIdx < 0 || slotIdx >= this.equippedSpells.length) return false;
    const spell = this.equippedSpells[slotIdx];
    if (!spell || spell.currentCooldown > 0) return false;

    sounds.init();

    const boat = this.game.tugboat;

    switch (spell.id) {
      case 'spell_steam_surge':
        this.dashTimer = this.dashDuration;
        this.dashHeading = boat.heading;
        this.dashHitSet.clear();
        boat.speed = 15.0;
        try { boat.tootWhistle(); } catch (e) {}
        this.game.hud.showHint('💨 STEAM SURGE! Full throttle hydro-dash!', '#38bdf8');
        break;

      case 'spell_verdant_flare':
        this.flareTimer = this.flareDuration;
        this.game.hud.showHint('🌟 VERDANT FLARE! Pond depths illuminated, scum harvest doubled!', '#facc15');
        this.game.rippleSystem.triggerBellShockwave(boat.position, 26.0, 18.0, 1.2, true);
        break;

      case 'spell_resonant_harmonic':
        this.sonicWaveTimer = 1.4;
        this.sonicWaveMesh.position.copy(boat.position);
        this.sonicWaveMesh.position.y = 0.15;
        this.sonicWaveMesh.rotation.z = boat.heading;
        this.triggerSonicCrescentDamage(boat.position, boat.heading, 16.0);
        this.game.hud.showHint('🎵 RESONANT HARMONIC! Sonic crescent stunning slimes!', '#c084fc');
        try { sounds.playFanfare(); } catch (e) {}
        break;

      case 'spell_tidal_whirlpool':
        this.whirlpoolTimer = this.whirlpoolDuration;
        this.whirlpoolCenter.copy(boat.position);
        this.whirlpoolMesh.position.copy(this.whirlpoolCenter);
        this.whirlpoolMesh.position.y = 0.08;
        this.game.hud.showHint('🌀 TIDAL WHIRLPOOL! Vacuuming all floating scum & debris!', '#2dd4bf');
        break;

      case 'spell_chrono_chime':
        this.chronoTimer = this.chronoDuration;
        this.chronoMesh.position.copy(boat.position);
        this.chronoMesh.position.y = 0.12;
        this.game.hud.showHint('⏳ CHRONO CHIME! Time dilated! Enemies and rocks frozen!', '#fbbf24');
        break;
    }

    spell.currentCooldown = spell.cooldown;
    return true;
  }

  triggerSonicCrescentDamage(origin, heading, range) {
    const slimes = this.game.slimeManager.slimes;
    const forward = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));

    slimes.forEach(s => {
      if (s.isDead) return;
      const d = origin.distanceTo(s.position);
      if (d <= range) {
        const toSlime = new THREE.Vector3().subVectors(s.position, origin).normalize();
        const dot = forward.dot(toSlime);
        if (dot > 0.2) {
          const hitResult = s.hit(3);
          if (hitResult && hitResult.shielded) {
            this.game.hud.showHint('🛡️ BEHEMOTH SHIELD DEFLECTED WAVE! Rescue gnomes to break shield!', '#facc15');
          } else {
            s.stunTimer = 3.0;
            this.game.slimeManager.handleSlimeCleansed(s, s.health <= 0);
          }
        }
      }
    });
  }

  update(dt, elapsedTime) {
    const boat = this.game.tugboat;
    if (!boat) return;

    // 1. Decrement cooldowns
    for (const spell of this.equippedSpells) {
      if (spell.currentCooldown > 0) {
        spell.currentCooldown = Math.max(0, spell.currentCooldown - dt);
      }
    }

    // 2. Active Spell Durations & Real-Time Logic
    // 2a. Steam Surge Dash
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      boat.speed = Math.max(boat.speed, 14.5);
      const slimes = this.game.slimeManager.slimes;
      slimes.forEach(s => {
        if (!s.isDead && !this.dashHitSet.has(s) && boat.position.distanceTo(s.position) < 3.2) {
          this.dashHitSet.add(s);
          const hitResult = s.hit(4);
          if (hitResult && hitResult.shielded) {
            this.game.hud.showHint('🛡️ BEHEMOTH SHIELD DEFLECTED RAM! Rescue gnomes to break shield!', '#facc15');
            boat.speed = -4.0; // Recoil bounce back
            this.dashTimer = 0; // Cancel dash on shield impact
          } else {
            this.game.slimeManager.handleSlimeCleansed(s, s.health <= 0);
            this.game.hud.showHint('💥 HYDRO-RAM! Slime shattered by steam prow!', '#38bdf8');
          }
        }
      });

      this.emitSteamPuff(boat.position, boat.heading, dt);
    } else {
      this.fadeSteamParticles(dt);
    }

    // 2b. Tidal Whirlpool Vacuum
    if (this.whirlpoolTimer > 0) {
      this.whirlpoolTimer -= dt;
      this.whirlpoolMesh.material.opacity = Math.min(0.65, this.whirlpoolTimer * 0.8);
      this.whirlpoolMesh.rotation.z += dt * 4.5;
      const scale = 1.0 + Math.sin(elapsedTime * 6.0) * 0.15;
      this.whirlpoolMesh.scale.set(scale, scale, 1.0);

      this.vacuumScumAndDebris(this.whirlpoolCenter, 18.0, dt * 8.5);
    } else {
      this.whirlpoolMesh.material.opacity = Math.max(0, this.whirlpoolMesh.material.opacity - dt * 2.0);
    }

    // 2c. Chrono Chime Time Slow
    if (this.chronoTimer > 0) {
      this.chronoTimer -= dt;
      this.chronoMesh.material.opacity = Math.min(0.5, this.chronoTimer * 0.7);
      this.chronoMesh.rotation.z += dt * 0.8;
    } else {
      this.chronoMesh.material.opacity = Math.max(0, this.chronoMesh.material.opacity - dt * 2.0);
    }

    // 2d. Sonic Crescent Wave
    if (this.sonicWaveTimer > 0) {
      this.sonicWaveTimer -= dt;
      this.sonicWaveMesh.material.opacity = Math.min(0.7, this.sonicWaveTimer * 1.5);
      const s = (1.4 - this.sonicWaveTimer) * 11.0;
      this.sonicWaveMesh.scale.set(s, s, 1.0);
    } else {
      this.sonicWaveMesh.material.opacity = 0;
    }

    // 2e. Verdant Flare
    if (this.flareTimer > 0) {
      this.flareTimer -= dt;
    }

    // 3. Passive Boons Logic
    // 3a. Self-Scrubbing Skids: sheds 15% algae every 4s
    if (this.hasPassive('passive_self_scrubbing')) {
      this.scrubTimer += dt;
      if (this.scrubTimer >= 4.0) {
        this.scrubTimer = 0;
        if (boat.algaeLevel > 0) {
          boat.algaeLevel = Math.max(0, boat.algaeLevel - 0.15);
        }
      }
    }

    // 3b. Bramble Spiked Prow: deals 3 ramming damage when cruising > 4m/s
    for (const [s, cd] of this.prowHitCooldowns.entries()) {
      if (cd <= dt) {
        this.prowHitCooldowns.delete(s);
      } else {
        this.prowHitCooldowns.set(s, cd - dt);
      }
    }

    if (this.hasPassive('passive_spiked_prow') && boat.speed > 4.0) {
      const slimes = this.game.slimeManager.slimes;
      slimes.forEach(s => {
        if (!s.isDead && !this.prowHitCooldowns.has(s) && boat.position.distanceTo(s.position) < 2.8) {
          this.prowHitCooldowns.set(s, 1.5);
          const hitResult = s.hit(3);
          if (hitResult && hitResult.shielded) {
            this.game.hud.showHint('🛡️ BEHEMOTH SHIELD DEFLECTED RAM! Rescue gnomes to break shield!', '#facc15');
            boat.speed = -3.0; // Recoil bounce back
          } else {
            this.game.slimeManager.handleSlimeCleansed(s, s.health <= 0);
            this.game.hud.showHint('⚔️ Spiked Prow gored slime!', '#fb7185');
          }
        }
      });
    }

    // 3c. Algae Bio-Furnace: +1.2% top speed per scum clot, capped at +25% max
    if (this.hasPassive('passive_algae_fuel')) {
      const scumCount = boat.scumCargo || 0;
      boat.fuelSpeedBonus = Math.min(1.25, 1.0 + (scumCount * 0.012));
    } else {
      boat.fuelSpeedBonus = 1.0;
    }
  }

  vacuumScumAndDebris(center, radius, strength) {
    const boat = this.game.tugboat;
    const scumManager = this.game.slimeManager;

    if (scumManager && scumManager.scumPickups) {
      scumManager.scumPickups.forEach(pickup => {
        if (!pickup.active) return;
        const d = center.distanceTo(pickup.position);
        if (d < radius) {
          const dir = new THREE.Vector3().subVectors(boat.position, pickup.position).normalize();
          pickup.position.addScaledVector(dir, strength * (1.0 - d / radius));
          if (pickup.position.distanceTo(boat.position) < 2.6) {
            scumManager.collectScumPickup(pickup, boat);
          }
        }
      });
    }

    if (this.game.pondTrashManager && this.game.pondTrashManager.debrisItems) {
      this.game.pondTrashManager.debrisItems.forEach(item => {
        if (item.collected) return;
        const d = center.distanceTo(item.position);
        if (d < radius) {
          const dir = new THREE.Vector3().subVectors(boat.position, item.position).normalize();
          item.position.addScaledVector(dir, strength * (1.0 - d / radius));
        }
      });
    }
  }

  emitSteamPuff(boatPos, heading, dt) {
    const rearPos = new THREE.Vector3(
      boatPos.x + Math.sin(heading) * 1.8,
      boatPos.y + 0.5,
      boatPos.z + Math.cos(heading) * 1.8
    );

    const positions = this.steamPoints.geometry.attributes.position.array;
    this.steamPoints.material.opacity = 0.75;

    for (let i = 0; i < this.steamParticles.length; i++) {
      const p = this.steamParticles[i];
      p.life -= dt * 2.5;
      if (p.life <= 0) {
        p.x = rearPos.x + (Math.random() - 0.5) * 0.8;
        p.y = rearPos.y + Math.random() * 0.4;
        p.z = rearPos.z + (Math.random() - 0.5) * 0.8;
        p.vx = Math.sin(heading) * 2.0 + (Math.random() - 0.5) * 1.5;
        p.vy = 1.2 + Math.random() * 1.0;
        p.vz = Math.cos(heading) * 2.0 + (Math.random() - 0.5) * 1.5;
        p.life = 1.0;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
      }
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }
    this.steamPoints.geometry.attributes.position.needsUpdate = true;
  }

  fadeSteamParticles(dt) {
    if (this.steamPoints.material.opacity > 0) {
      this.steamPoints.material.opacity = Math.max(0, this.steamPoints.material.opacity - dt * 2.0);
    }
  }

  getTimeSlowFactor() {
    return this.chronoTimer > 0 ? 0.2 : 1.0;
  }

  getScumYieldMultiplier() {
    return this.flareTimer > 0 ? 2 : 1;
  }

  getSuctionRadiusMultiplier() {
    return this.hasPassive('passive_magnetic_scupper') ? 1.5 : 1.0;
  }
}
