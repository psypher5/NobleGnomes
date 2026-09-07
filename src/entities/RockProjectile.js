import * as THREE from 'three';

/**
 * Ballistic mossy boulder thrown by the Bog Behemoth mini-boss.
 * Arcs across the pond with organic tumbling spin and trailing spray,
 * crashing down on the player's tugboat or into the water with a massive splash.
 */
export class RockProjectile {
  constructor(startPos, targetPos, arcHeight = 6.2, onLand = null) {
    this.startPos = startPos.clone();
    this.targetPos = targetPos.clone();
    this.targetPos.y = 0.05; // Land on water surface
    this.arcHeight = arcHeight;
    this.onLand = onLand;

    this.group = new THREE.Group();
    this.group.position.copy(this.startPos);

    this.progress = 0;
    this.duration = 1.6 + Math.random() * 0.3;
    this.isDead = false;

    this.rotSpeedX = 3.5 + Math.random() * 3.0;
    this.rotSpeedY = 2.5 + Math.random() * 2.5;
    this.rotSpeedZ = 4.0 + Math.random() * 2.5;

    this.trailParticles = [];
    this.createMesh();
  }

  createMesh() {
    // 1. Weathered, faceted river boulder
    const rockGeo = new THREE.DodecahedronGeometry(0.55, 1);
    const pos = rockGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const angle = Math.atan2(z, x);
      const noise = Math.sin(angle * 4.0) * 0.08 + Math.cos(y * 5.0) * 0.06;
      pos.setXYZ(i, x * (1.0 + noise), y * (0.9 + noise * 0.5), z * (1.0 + noise));
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5a5448, // Deep river slate stone
      roughness: 0.85,
      metalness: 0.12,
      flatShading: true
    });

    this.mesh = new THREE.Mesh(rockGeo, rockMat);
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    // 2. Velvet Green Moss Cap
    const mossGeo = new THREE.SphereGeometry(0.42, 8, 6);
    mossGeo.scale(1.15, 0.45, 1.15);
    const mossMat = new THREE.MeshStandardMaterial({
      color: 0x3d7822,
      roughness: 0.90,
      metalness: 0.05,
      flatShading: true
    });
    const mossCap = new THREE.Mesh(mossGeo, mossMat);
    mossCap.position.set(0, 0.35, 0);
    this.mesh.add(mossCap);

    // 3. Embedded miniature sharp flint pebbles
    const flintGeo = new THREE.TetrahedronGeometry(0.16, 0);
    const flintMat = new THREE.MeshStandardMaterial({ color: 0x2e3328, roughness: 0.5, metalness: 0.3 });
    for (let i = 0; i < 3; i++) {
      const flint = new THREE.Mesh(flintGeo, flintMat);
      const a = (i / 3) * Math.PI * 2;
      flint.position.set(Math.cos(a) * 0.42, (Math.random() - 0.5) * 0.3, Math.sin(a) * 0.42);
      flint.rotation.set(Math.random(), Math.random(), Math.random());
      this.mesh.add(flint);
    }
  }

  update(dt, scene) {
    if (this.isDead) return;

    this.progress += dt / this.duration;

    if (this.progress >= 1.0) {
      this.progress = 1.0;
      this.isDead = true;
      if (this.onLand) {
        this.onLand(this.targetPos);
      }
      return;
    }

    // Parabolic arc trajectory
    const t = this.progress;
    const currentX = THREE.MathUtils.lerp(this.startPos.x, this.targetPos.x, t);
    const currentZ = THREE.MathUtils.lerp(this.startPos.z, this.targetPos.z, t);
    const arcY = THREE.MathUtils.lerp(this.startPos.y, this.targetPos.y, t) + 4 * this.arcHeight * t * (1 - t);

    this.group.position.set(currentX, arcY, currentZ);

    // Tumbling boulder spin
    this.mesh.rotation.x += dt * this.rotSpeedX;
    this.mesh.rotation.y += dt * this.rotSpeedY;
    this.mesh.rotation.z += dt * this.rotSpeedZ;

    // Spawn trailing dust & moss crumb particles
    if (Math.random() > 0.45 && scene) {
      this.spawnTrailParticle(scene);
    }

    // Update existing trail particles
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.userData.life += dt;
      const progress = p.userData.life / p.userData.maxLife;

      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      p.userData.vy -= 9.8 * dt * 0.5;

      p.scale.setScalar(p.userData.baseScale * (1.0 - progress));
      p.material.opacity = 0.75 * (1.0 - progress);

      if (progress >= 1.0) {
        scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.trailParticles.splice(i, 1);
      }
    }
  }

  spawnTrailParticle(scene) {
    const pGeo = new THREE.DodecahedronGeometry(0.08, 0);
    const isMoss = Math.random() > 0.5;
    const pMat = new THREE.MeshBasicMaterial({
      color: isMoss ? 0x4d8c2e : 0x736d5e,
      transparent: true,
      opacity: 0.75
    });

    const p = new THREE.Mesh(pGeo, pMat);
    p.position.copy(this.group.position);
    p.position.x += (Math.random() - 0.5) * 0.25;
    p.position.y += (Math.random() - 0.5) * 0.25;
    p.position.z += (Math.random() - 0.5) * 0.25;

    p.userData = {
      life: 0,
      maxLife: 0.5 + Math.random() * 0.3,
      baseScale: 0.8 + Math.random() * 0.4,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.2) * 1.2,
      vz: (Math.random() - 0.5) * 1.2
    };

    scene.add(p);
    this.trailParticles.push(p);
  }

  dispose(scene) {
    for (const p of this.trailParticles) {
      if (scene) scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
    }
    this.trailParticles = [];
  }
}
