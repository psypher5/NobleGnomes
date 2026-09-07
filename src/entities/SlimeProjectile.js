import * as THREE from 'three';

/**
 * Ballistic slime projectile thrown by Slime Monsters or burped by mature Blobs.
 * Arcs through the air leaving trailing goop droplets, then splashes down
 * to propagate a new algae colony or splat the player's boat.
 */
export class SlimeProjectile {
  constructor(startPos, targetPos, arcHeight = 4.5, onLand = null) {
    this.startPos = startPos.clone();
    this.targetPos = targetPos.clone();
    this.targetPos.y = 0.05; // Land on water surface
    this.arcHeight = arcHeight;
    this.onLand = onLand;

    this.group = new THREE.Group();
    this.group.position.copy(this.startPos);

    this.progress = 0;
    this.duration = 1.4 + Math.random() * 0.4;
    this.isDead = false;

    this.trailParticles = [];
    this.createMesh();
  }

  createMesh() {
    // Gooey core projectile
    const coreGeo = new THREE.SphereGeometry(0.32, 10, 8);
    coreGeo.scale(1.0, 1.2, 1.0);

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x62c918,
      roughness: 0.25,
      metalness: 0.1,
      emissive: 0x2d6b08,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.92,
      flatShading: true
    });

    this.mesh = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.mesh);

    // Mini orbiting goop drops
    const dropGeo = new THREE.SphereGeometry(0.1, 6, 6);
    for (let i = 0; i < 3; i++) {
      const drop = new THREE.Mesh(dropGeo, coreMat);
      const angle = (i / 3) * Math.PI * 2;
      drop.position.set(Math.cos(angle) * 0.28, (Math.random() - 0.5) * 0.2, Math.sin(angle) * 0.28);
      this.mesh.add(drop);
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

    // Parabolic arc interpolation
    const t = this.progress;
    const currentX = THREE.MathUtils.lerp(this.startPos.x, this.targetPos.x, t);
    const currentZ = THREE.MathUtils.lerp(this.startPos.z, this.targetPos.z, t);
    // Inverted parabola: 4 * h * t * (1 - t)
    const arcY = THREE.MathUtils.lerp(this.startPos.y, this.targetPos.y, t) + 4 * this.arcHeight * t * (1 - t);

    this.group.position.set(currentX, arcY, currentZ);

    // Tumbling wobble
    this.mesh.rotation.x += dt * 5.0;
    this.mesh.rotation.z += dt * 4.0;
    const stretch = 1.0 + Math.sin(t * Math.PI) * 0.35;
    this.mesh.scale.set(1.0 / Math.sqrt(stretch), stretch, 1.0 / Math.sqrt(stretch));

    // Spawn trailing droplet particles
    if (Math.random() > 0.4 && scene) {
      this.spawnTrailParticle(scene);
    }

    // Update existing trail particles
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.userData.life += dt;
      const prog = p.userData.life / p.userData.maxLife;
      p.scale.setScalar((1.0 - prog) * p.userData.baseScale);
      p.position.y -= dt * 0.8;

      if (prog >= 1.0) {
        scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.trailParticles.splice(i, 1);
      }
    }
  }

  spawnTrailParticle(scene) {
    const pGeo = new THREE.DodecahedronGeometry(0.1, 0);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0x76db20,
      transparent: true,
      opacity: 0.75
    });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.copy(this.group.position);
    p.position.x += (Math.random() - 0.5) * 0.2;
    p.position.z += (Math.random() - 0.5) * 0.2;

    p.userData = {
      life: 0,
      maxLife: 0.5 + Math.random() * 0.3,
      baseScale: 0.8 + Math.random() * 0.5
    };

    scene.add(p);
    this.trailParticles.push(p);
  }

  dispose(scene) {
    for (const p of this.trailParticles) {
      scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
    }
    this.trailParticles = [];
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}
