import * as THREE from 'three';

/**
 * Visual and gameplay representation of slimy algae infesting a lily pad
 * and entrapping a stranded garden gnome.
 * Requires bell acoustic shockwaves to crack and cleanse.
 */
export class LilyPadAlgae {
  constructor(scene, pad) {
    this.scene = scene;
    this.pad = pad;
    this.health = 2;
    this.maxHealth = 2;
    this.isDead = false;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.flashTimer = 0;
    this.baseEmissive = new THREE.Color(0x143c0d);
    this.flashEmissive = new THREE.Color(0xa3e635);

    this.splatterParticles = [];
    this.bubbleParticles = [];
    this.stinkParticles = [];

    this.createModel();
    this.createStinkVapors();
  }

  createModel() {
    // 1. Organic Slime Material (Glossy, translucent subsurface glow)
    this.slimeMat = new THREE.MeshStandardMaterial({
      color: 0x275924,
      roughness: 0.14,
      metalness: 0.05,
      emissive: 0x143c0d,
      emissiveIntensity: 0.45,
      flatShading: false
    });

    // 2. Pad Surface Scum Crust (Irregular disc covering the leaf)
    const crustGeo = new THREE.CylinderGeometry(1.9, 2.05, 0.16, 20, 2);
    const pos = crustGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      if (r > 0.3) {
        // Asymmetric organic lobe displacement
        const angle = Math.atan2(z, x);
        const wobble = Math.sin(angle * 4.0) * 0.18 + Math.cos(angle * 7.0) * 0.10;
        pos.setX(i, x * (1.0 + wobble * 0.15));
        pos.setZ(i, z * (1.0 + wobble * 0.15));
        if (y > 0) {
          // Bumpy surface goop mounds
          const bump = Math.sin(x * 3.0) * Math.cos(z * 3.0) * 0.06;
          pos.setY(i, y + bump);
        }
      }
    }
    crustGeo.computeVertexNormals();

    this.crustMesh = new THREE.Mesh(crustGeo, this.slimeMat);
    this.crustMesh.position.y = 0.08;
    this.crustMesh.castShadow = true;
    this.crustMesh.receiveShadow = true;
    this.group.add(this.crustMesh);

    // 3. Central Entrapment Mound (Cocoon around the gnome's legs/torso)
    this.cocoonGroup = new THREE.Group();
    this.group.add(this.cocoonGroup);

    const moundGeo = new THREE.SphereGeometry(0.72, 16, 12);
    moundGeo.scale(1.0, 0.65, 0.95);
    const moundMesh = new THREE.Mesh(moundGeo, this.slimeMat);
    moundMesh.position.set(0, 0.22, 0);
    this.cocoonGroup.add(moundMesh);

    // 4. Glossy Satellite Blisters around the gnome
    const blisterGeo = new THREE.SphereGeometry(0.24, 10, 8);
    const blisterOffsets = [
      { x: -0.38, y: 0.16, z: 0.28, s: 1.1 },
      { x: 0.42, y: 0.14, z: -0.22, s: 1.25 },
      { x: 0.35, y: 0.18, z: 0.32, s: 0.85 },
      { x: -0.45, y: 0.12, z: -0.26, s: 0.95 },
      { x: 0.05, y: 0.28, z: -0.42, s: 1.05 }
    ];

    blisterOffsets.forEach(b => {
      const bl = new THREE.Mesh(blisterGeo, this.slimeMat);
      bl.position.set(b.x, b.y, b.z);
      bl.scale.set(b.s, b.s * 0.75, b.s);
      this.cocoonGroup.add(bl);
    });

    // 5. Gooey Slime Tendril Arches trapping the waist
    const tendrilGeo = new THREE.TorusGeometry(0.38, 0.065, 6, 12, Math.PI);
    const tendril1 = new THREE.Mesh(tendrilGeo, this.slimeMat);
    tendril1.rotation.x = -0.4;
    tendril1.rotation.y = 0.5;
    tendril1.position.set(0.05, 0.38, 0.05);
    this.cocoonGroup.add(tendril1);

    const tendril2 = new THREE.Mesh(tendrilGeo, this.slimeMat);
    tendril2.rotation.x = 0.35;
    tendril2.rotation.y = -0.8;
    tendril2.position.set(-0.04, 0.35, -0.05);
    this.cocoonGroup.add(tendril2);
  }

  createStinkVapors() {
    this.stinkGroup = new THREE.Group();
    this.group.add(this.stinkGroup);

    const stinkGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(163, 230, 53, 0.65)');
    grad.addColorStop(0.5, 'rgba(132, 204, 22, 0.35)');
    grad.addColorStop(1, 'rgba(101, 163, 13, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    this.stinkMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(stinkGeo, this.stinkMat);
      const angle = (i / 4) * Math.PI * 2;
      const r = 0.4 + Math.random() * 0.4;
      mesh.position.set(Math.cos(angle) * r, 0.3 + Math.random() * 0.3, Math.sin(angle) * r);
      this.stinkGroup.add(mesh);
      this.stinkParticles.push({
        mesh,
        baseX: mesh.position.x,
        baseZ: mesh.position.z,
        y: mesh.position.y,
        speed: 0.35 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  setRotation(rx, ry, rz) {
    this.group.rotation.set(rx, ry, rz);
  }

  /**
   * Struck by bell acoustic shockwave
   */
  hit(damage = 1) {
    if (this.isDead) return true;

    this.health -= damage;
    this.flashTimer = 0.25;

    // Flash bright neon green
    this.slimeMat.emissive.copy(this.flashEmissive);
    this.slimeMat.emissiveIntensity = 1.35;

    // Spawn green goop splatter burst
    this.spawnSplatters(14);

    if (this.health === 1) {
      // First hit: Algae cracks and shrinks significantly
      this.cocoonGroup.scale.set(0.65, 0.45, 0.65);
      this.crustMesh.scale.set(0.85, 0.6, 0.85);
      return false; // Not fully cleared yet
    }

    // Cleansed!
    this.isDead = true;
    this.spawnJewelBubbles(22);
    this.destroy();
    return true;
  }

  spawnSplatters(count) {
    const geo = new THREE.SphereGeometry(0.08, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x84cc16 });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(this.group.position);
      mesh.position.y += 0.35;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;
      this.splatterParticles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 3.0 + Math.random() * 2.5,
        vz: Math.sin(angle) * speed,
        life: 0.65
      });
    }
  }

  spawnJewelBubbles(count) {
    const geo = new THREE.SphereGeometry(0.12, 10, 8);
    const colors = [0x67e8f9, 0xa7f3d0, 0xfde047, 0xf472b6, 0xffffff];

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.85
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(this.group.position);
      mesh.position.x += (Math.random() - 0.5) * 1.5;
      mesh.position.z += (Math.random() - 0.5) * 1.5;
      mesh.position.y += 0.2 + Math.random() * 0.4;
      this.scene.add(mesh);

      this.bubbleParticles.push({
        mesh,
        vy: 1.8 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 1.2,
        vz: (Math.random() - 0.5) * 1.2,
        scale: 0.7 + Math.random() * 0.8,
        life: 1.0,
        maxLife: 1.0
      });
    }
  }

  update(dt, time) {
    if (this.isDead) {
      this.updateParticles(dt);
      return;
    }

    // 1. Organic Breathing Squish
    const pulse = Math.sin(time * 3.5) * 0.04;
    this.cocoonGroup.scale.y = (this.health === 1 ? 0.45 : 1.0) + pulse;

    // 2. Damage Flash Recovery
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.slimeMat.emissive.copy(this.baseEmissive);
        this.slimeMat.emissiveIntensity = 0.45;
      }
    }

    // 3. Stink Vapors Drifting Up
    for (const p of this.stinkParticles) {
      p.y += p.speed * dt;
      if (p.y > 1.6) {
        p.y = 0.25;
      }
      p.mesh.position.y = p.y;
      p.mesh.position.x = p.baseX + Math.sin(time * 2.0 + p.phase) * 0.12;
      p.mesh.position.z = p.baseZ + Math.cos(time * 2.0 + p.phase) * 0.12;
      const fade = 1.0 - (p.y - 0.25) / 1.35;
      p.mesh.scale.setScalar(0.8 + (p.y - 0.25) * 0.7);
    }

    this.updateParticles(dt);
  }

  hasActiveParticles() {
    return this.bubbleParticles.length > 0 || this.splatterParticles.length > 0;
  }

  accelerateCollectionPop() {
    // When gnome is collected quickly, give active jewel bubbles an energetic celebratory pop
    // and accelerate their fade so they never linger or hang in mid-air
    for (const b of this.bubbleParticles) {
      b.vy = Math.max(b.vy, 2.6);
      b.life = Math.min(b.life, 0.32);
      b.maxLife = Math.min(b.maxLife, 0.32);
    }
  }

  updateParticles(dt) {
    // Splatter droplets
    for (let i = this.splatterParticles.length - 1; i >= 0; i--) {
      const p = this.splatterParticles[i];
      p.life -= dt;
      p.vy -= 9.8 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      if (p.life <= 0 || p.mesh.position.y < 0) {
        if (p.mesh.parent) {
          p.mesh.parent.remove(p.mesh);
        }
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        this.splatterParticles.splice(i, 1);
      }
    }

    // Jewel bubbles floating up
    for (let i = this.bubbleParticles.length - 1; i >= 0; i--) {
      const b = this.bubbleParticles[i];
      b.life -= dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.z += b.vz * dt;

      const progress = 1.0 - Math.max(0, (b.life / b.maxLife));
      if (b.mesh.material) {
        b.mesh.material.opacity = Math.max(0, 1.0 - progress);
      }
      b.mesh.scale.setScalar(b.scale * (1.0 + progress * 0.5));

      if (b.life <= 0) {
        if (b.mesh.parent) {
          b.mesh.parent.remove(b.mesh);
        }
        if (b.mesh.geometry) b.mesh.geometry.dispose();
        if (b.mesh.material) b.mesh.material.dispose();
        this.bubbleParticles.splice(i, 1);
      }
    }
  }

  clearAllParticles() {
    for (const p of this.splatterParticles) {
      if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
      if (p.mesh.geometry) p.mesh.geometry.dispose();
      if (p.mesh.material) p.mesh.material.dispose();
    }
    this.splatterParticles = [];

    for (const b of this.bubbleParticles) {
      if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
      if (b.mesh.geometry) b.mesh.geometry.dispose();
      if (b.mesh.material) b.mesh.material.dispose();
    }
    this.bubbleParticles = [];
  }

  destroy() {
    // Smoothly dismantle and remove algae crust & cocoon
    if (this.group.parent) {
      this.scene.remove(this.group);
    }
  }

  dispose() {
    this.destroy();
    this.clearAllParticles();
    if (this.crustMesh && this.crustMesh.geometry) {
      this.crustMesh.geometry.dispose();
    }
    if (this.slimeMat) {
      this.slimeMat.dispose();
    }
  }
}
