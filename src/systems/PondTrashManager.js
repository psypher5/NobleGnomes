import * as THREE from 'three';
import { sounds } from '../audio/SoundSynthesizer.js';

export const TRASH_TYPE = {
  DRIFTWOOD: {
    name: 'Weathered Oak Plank',
    repairAmount: 18,
    color: 0x8b5a2b,
    accent: 0x4a3219,
    scale: 1.0
  },
  TIN_CAN: {
    name: 'Rusted Biscuit Tin',
    repairAmount: 12,
    color: 0x9c8265,
    accent: 0xbf5700,
    scale: 0.85
  },
  CORK_FLOAT: {
    name: 'Vintage Net Cork',
    repairAmount: 10,
    color: 0xc29b61,
    accent: 0x7c5324,
    scale: 0.95
  },
  BOTTLE: {
    name: 'Sealed Glass Flagon',
    repairAmount: 20,
    color: 0x2e7d32,
    accent: 0xe0a96d,
    scale: 0.9
  }
};

/**
 * Manages floating pond salvage debris (wood, cans, corks, bottles) that player can
 * scoop up to repair their tugboat's hull integrity.
 */
export class PondTrashManager {
  constructor(scene, pondRadius = 36) {
    this.scene = scene;
    this.pondRadius = pondRadius;
    this.items = [];
    this.particles = [];
    this.totalCount = 14;

    this.initTrashItems();
  }

  initTrashItems() {
    const types = [
      TRASH_TYPE.DRIFTWOOD,
      TRASH_TYPE.TIN_CAN,
      TRASH_TYPE.CORK_FLOAT,
      TRASH_TYPE.BOTTLE
    ];

    for (let i = 0; i < this.totalCount; i++) {
      const type = types[i % types.length];
      this.spawnTrashItem(type, i);
    }
  }

  createTrashMesh(type) {
    const group = new THREE.Group();

    if (type === TRASH_TYPE.DRIFTWOOD) {
      // Weathered wood plank with iron spikes
      const plankGeo = new THREE.BoxGeometry(0.9, 0.12, 0.38);
      const plankMat = new THREE.MeshStandardMaterial({
        color: type.color,
        roughness: 0.85,
        metalness: 0.05
      });
      const plank = new THREE.Mesh(plankGeo, plankMat);
      plank.castShadow = true;
      group.add(plank);

      // Iron nails/brackets
      const nailGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.06, 6);
      const nailMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85, roughness: 0.3 });
      const n1 = new THREE.Mesh(nailGeo, nailMat);
      n1.position.set(-0.3, 0.07, 0.08);
      const n2 = new THREE.Mesh(nailGeo, nailMat);
      n2.position.set(0.3, 0.07, -0.06);
      group.add(n1, n2);

    } else if (type === TRASH_TYPE.TIN_CAN) {
      // Ribbed tin cylinder with peeling label and rust
      const canGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.42, 10);
      const canMat = new THREE.MeshStandardMaterial({
        color: type.color,
        roughness: 0.65,
        metalness: 0.55
      });
      const can = new THREE.Mesh(canGeo, canMat);
      can.rotation.z = Math.PI * 0.42; // Floating on its side
      can.castShadow = true;
      group.add(can);

      // Rusty lid edge
      const lidGeo = new THREE.TorusGeometry(0.18, 0.02, 6, 12);
      const lidMat = new THREE.MeshStandardMaterial({ color: type.accent, roughness: 0.9, metalness: 0.2 });
      const lid = new THREE.Mesh(lidGeo, lidMat);
      lid.rotation.x = Math.PI / 2;
      lid.rotation.y = Math.PI * 0.42;
      group.add(lid);

    } else if (type === TRASH_TYPE.CORK_FLOAT) {
      // Bulbous ribbed cork buoy with twine rope
      const corkGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.48, 10);
      const corkMat = new THREE.MeshStandardMaterial({
        color: type.color,
        roughness: 0.95,
        metalness: 0.02
      });
      const cork = new THREE.Mesh(corkGeo, corkMat);
      cork.rotation.z = 0.3;
      cork.castShadow = true;
      group.add(cork);

      // Hemp rope ring wrapping
      const ropeGeo = new THREE.TorusGeometry(0.22, 0.035, 6, 12);
      const ropeMat = new THREE.MeshStandardMaterial({ color: type.accent, roughness: 0.9 });
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.rotation.x = Math.PI / 2;
      rope.rotation.z = 0.3;
      group.add(rope);

    } else {
      // Sealed message bottle
      const bottleGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.5, 10);
      const bottleMat = new THREE.MeshStandardMaterial({
        color: type.color,
        roughness: 0.18,
        metalness: 0.15,
        transparent: true,
        opacity: 0.85
      });
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      bottle.rotation.z = Math.PI * 0.46;
      bottle.castShadow = true;
      group.add(bottle);

      // Bottle neck
      const neckGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.2, 8);
      const neck = new THREE.Mesh(neckGeo, bottleMat);
      neck.rotation.z = Math.PI * 0.46;
      neck.position.set(0.3, 0.04, 0);
      group.add(neck);

      // Cork stopper
      const stopperGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.09, 8);
      const stopperMat = new THREE.MeshStandardMaterial({ color: type.accent, roughness: 0.9 });
      const stopper = new THREE.Mesh(stopperGeo, stopperMat);
      stopper.rotation.z = Math.PI * 0.46;
      stopper.position.set(0.42, 0.05, 0);
      group.add(stopper);
    }

    // Floating water beacon ripple ring
    const ringGeo = new THREE.RingGeometry(0.45, 0.60, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.015;
    group.add(ring);

    return { group, ring };
  }

  spawnTrashItem(type, index = 0) {
    let x, z;
    let tries = 0;
    do {
      const dist = 8.0 + Math.random() * (this.pondRadius - 13.0);
      const angle = (index / this.totalCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      x = Math.cos(angle) * dist;
      z = Math.sin(angle) * dist;
      tries++;
    } while (tries < 20 && (Math.hypot(x - 1.6, z - 32.0) < 10.0 || Math.hypot(x, z) < 6.0));

    const { group, ring } = this.createTrashMesh(type);
    group.position.set(x, 0.06, z);
    this.scene.add(group);

    const item = {
      type,
      group,
      ring,
      position: new THREE.Vector3(x, 0.06, z),
      active: true,
      respawnTimer: 0,
      phase: Math.random() * Math.PI * 2,
      bobSpeed: 1.8 + Math.random() * 0.8
    };

    this.items.push(item);
    return item;
  }

  update(dt, time, tugboat, onCollectCallback = null) {
    if (!tugboat) return;

    for (const item of this.items) {
      if (!item.active) {
        // Handle respawn cycle
        item.respawnTimer -= dt;
        if (item.respawnTimer <= 0) {
          item.active = true;
          item.group.visible = true;
          item.group.scale.setScalar(0.01);
        }
        continue;
      }

      // Grow in smoothly after respawning
      if (item.group.scale.x < 1.0) {
        const nextScale = Math.min(1.0, item.group.scale.x + dt * 2.0);
        item.group.scale.setScalar(nextScale);
      }

      // Gentle wave bobbing physics
      const bob = Math.sin(time * item.bobSpeed + item.phase) * 0.04;
      item.group.position.y = 0.06 + bob;
      item.group.rotation.y += dt * 0.4;
      item.group.rotation.x = Math.sin(time * 1.5 + item.phase) * 0.08;
      item.group.rotation.z = Math.cos(time * 1.3 + item.phase) * 0.08;

      // Pulse beacon ring
      if (item.ring) {
        const ringScale = 1.0 + Math.sin(time * 3.0 + item.phase) * 0.25;
        item.ring.scale.set(ringScale, 1.0, ringScale);
        item.ring.material.opacity = 0.35 + Math.sin(time * 3.0 + item.phase) * 0.20;
      }

      // Proximity check with player's tugboat
      if (!tugboat.isCapsized) {
        const dist = Math.hypot(tugboat.position.x - item.position.x, tugboat.position.z - item.position.z);
        if (dist < 2.5) {
          this.collectItem(item, tugboat, onCollectCallback);
        }
      }
    }

    // Update sparkle particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.life += dt;
      const progress = p.userData.life / p.userData.maxLife;

      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      p.rotation.z += dt * 5.0;

      p.scale.setScalar((1.0 - progress) * p.userData.baseScale);
      p.material.opacity = 0.95 * (1.0 - progress);

      if (progress >= 1.0) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  collectItem(item, tugboat, onCollectCallback) {
    item.active = false;
    item.group.visible = false;
    item.respawnTimer = 28.0 + Math.random() * 14.0; // 28-42s respawn timer

    // Repair tugboat hull
    tugboat.repair(item.type.repairAmount);
    try { sounds.playTrashCollect(); } catch (e) { /* audio fallback */ }

    // Spawn salvage sparkle particles
    this.spawnSalvageSparkles(item.position, 12);

    if (onCollectCallback) {
      onCollectCallback(
        `🛠️ Salvaged ${item.type.name}! Repaired +${item.type.repairAmount} Hull HP!`,
        '#34d399'
      );
    }
  }

  spawnSalvageSparkles(pos, count = 12) {
    const geo = new THREE.OctahedronGeometry(0.12, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.95
    });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat.clone());
      p.position.set(
        pos.x + (Math.random() - 0.5) * 0.4,
        pos.y + 0.2 + Math.random() * 0.2,
        pos.z + (Math.random() - 0.5) * 0.4
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 1.8;

      p.userData = {
        vx: Math.cos(angle) * speed,
        vy: 1.8 + Math.random() * 2.2,
        vz: Math.sin(angle) * speed,
        baseScale: 0.8 + Math.random() * 0.6,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.35
      };

      this.scene.add(p);
      this.particles.push(p);
    }
  }

  resetLevel() {
    for (const item of this.items) {
      item.active = true;
      item.group.visible = true;
      item.respawnTimer = 0;
    }
  }
}
