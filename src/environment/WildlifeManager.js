import * as THREE from 'three';
import { getWaterSurfaceHeight } from './PondWater.js';
import { sounds } from '../audio/SoundSynthesizer.js';

/**
 * Manages active pond wildlife that flourishes when the water is cleansed:
 * - Golden & Calico Koi fish that swim, cruise between lily pads, and leap into the air
 * - Shimmering dragonflies and butterflies hovering over the flora and pier
 * - Floating restoration motes rising from the purified depths
 */
export class WildlifeManager {
  constructor(scene, pondWater = null) {
    this.scene = scene;
    this.pondWater = pondWater;
    this.group = new THREE.Group();
    this.fish = [];
    this.dragonflies = [];
    this.motes = null;
    this.splashParticles = [];

    this.initFish();
    this.initDragonflies();
    this.initRestorationMotes();

    this.scene.add(this.group);
  }

  get koiFish() {
    return this.fish;
  }

  initFish(count = 6) {
    // Slender, stylized koi fish geometry
    const bodyGeo = new THREE.ConeGeometry(0.16, 0.72, 6);
    bodyGeo.rotateX(Math.PI / 2);

    const tailGeo = new THREE.BufferGeometry();
    const tailVertices = new Float32Array([
      0, 0, 0,
      -0.12, 0.08, -0.32,
      0.12, 0.08, -0.32,
      0, -0.06, -0.28
    ]);
    const tailIndices = [0, 1, 2, 0, 2, 3, 0, 3, 1];
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVertices, 3));
    tailGeo.setIndex(tailIndices);
    tailGeo.computeVertexNormals();

    const fishMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.2 }), // Golden Amber Koi
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.1 }), // Ruby Red Koi
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1 }), // Pearl White
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.15 }) // Calico Orange
    ];

    for (let i = 0; i < count; i++) {
      const fishGroup = new THREE.Group();
      const mat = fishMaterials[i % fishMaterials.length];

      const body = new THREE.Mesh(bodyGeo, mat);
      body.castShadow = true;
      fishGroup.add(body);

      const tail = new THREE.Mesh(tailGeo, mat);
      tail.position.z = -0.36;
      fishGroup.add(tail);

      // Random position across the pond
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 6.0 + Math.random() * 18.0;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      fishGroup.position.set(x, -0.35, z);

      this.fish.push({
        group: fishGroup,
        tail,
        baseX: x,
        baseZ: z,
        angle,
        speed: 1.2 + Math.random() * 0.8,
        swimRadius: 4.0 + Math.random() * 6.0,
        phase: Math.random() * Math.PI * 2,
        isLeaping: false,
        leapTimer: 0,
        leapDuration: 1.1,
        leapOrigin: new THREE.Vector3(),
        leapApex: 1.8 + Math.random() * 1.2,
        leapTarget: new THREE.Vector3(),
        nextLeapDelay: 3.0 + Math.random() * 8.0
      });

      this.group.add(fishGroup);
    }
  }

  initDragonflies(count = 5) {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant electric cyan
      emissive: 0x0369a1,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.8
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });

    const bodyGeo = new THREE.CylinderGeometry(0.025, 0.015, 0.38, 5);
    bodyGeo.rotateX(Math.PI / 2);

    const wingGeo = new THREE.PlaneGeometry(0.32, 0.08);

    for (let i = 0; i < count; i++) {
      const dfGroup = new THREE.Group();

      const body = new THREE.Mesh(bodyGeo, bodyMat);
      dfGroup.add(body);

      const wingL = new THREE.Mesh(wingGeo, wingMat);
      wingL.position.set(-0.16, 0.02, 0.02);
      dfGroup.add(wingL);

      const wingR = new THREE.Mesh(wingGeo, wingMat);
      wingR.position.set(0.16, 0.02, 0.02);
      dfGroup.add(wingR);

      // Start near reeds or pier
      const x = (i === 0 ? 3.5 : (Math.random() - 0.5) * 28.0);
      const z = (i === 0 ? 28.0 : (Math.random() - 0.5) * 28.0);
      dfGroup.position.set(x, 1.2, z);

      this.dragonflies.push({
        group: dfGroup,
        wingL,
        wingR,
        anchor: new THREE.Vector3(x, 1.2, z),
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 1.0,
        hoverHeight: 0.8 + Math.random() * 1.2
      });

      this.group.add(dfGroup);
    }
  }

  initRestorationMotes(count = 70) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    const c1 = new THREE.Color(0xfacc15); // Golden pollen
    const c2 = new THREE.Color(0x38bdf8); // Crystal water blue

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * 32.0;
      positions[i * 3] = Math.cos(ang) * r;
      positions[i * 3 + 1] = 0.2 + Math.random() * 4.0;
      positions[i * 3 + 2] = Math.sin(ang) * r;

      const c = Math.random() > 0.5 ? c1 : c2;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      alphas[i] = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.24,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.motes = new THREE.Points(geo, mat);
    this.motes.visible = false; // Turned on when pond is clean / during outro
    this.group.add(this.motes);
  }

  triggerLeap(fishObj, targetPos = null) {
    fishObj.isLeaping = true;
    fishObj.leapTimer = 0;
    fishObj.leapDuration = 1.05 + Math.random() * 0.3;
    fishObj.leapOrigin.copy(fishObj.group.position);

    if (targetPos) {
      fishObj.leapTarget.copy(targetPos);
    } else {
      const jumpDist = 3.5 + Math.random() * 3.0;
      const jumpAngle = fishObj.group.rotation.y;
      fishObj.leapTarget.set(
        fishObj.leapOrigin.x + Math.sin(jumpAngle) * jumpDist,
        -0.2,
        fishObj.leapOrigin.z + Math.cos(jumpAngle) * jumpDist
      );
    }

    this.spawnSplash(fishObj.leapOrigin, 8);
    if (this.pondWater) {
      this.pondWater.addRipple(fishObj.leapOrigin.x, fishObj.leapOrigin.z, 0.45, 12.0, 10.0);
    }
  }

  spawnSplash(pos, count = 8) {
    const geo = new THREE.DodecahedronGeometry(0.08, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.85 });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      p.position.y = Math.max(0.05, p.position.y);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.2;
      p.userData = {
        vx: Math.cos(angle) * speed,
        vy: 2.4 + Math.random() * 2.2,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.3
      };

      this.scene.add(p);
      this.splashParticles.push(p);
    }
  }

  triggerAllFishLeapCelebration() {
    this.fish.forEach((f, idx) => {
      setTimeout(() => {
        this.triggerLeap(f);
      }, idx * 350);
    });
  }

  update(dt, time, isClean = false, isOutro = false) {
    // 1. Update Fish
    this.fish.forEach((f) => {
      if (f.isLeaping) {
        f.leapTimer += dt;
        const prog = Math.min(1.0, f.leapTimer / f.leapDuration);

        // Parabolic arc trajectory
        const curX = THREE.MathUtils.lerp(f.leapOrigin.x, f.leapTarget.x, prog);
        const curZ = THREE.MathUtils.lerp(f.leapOrigin.z, f.leapTarget.z, prog);
        const arcY = Math.sin(prog * Math.PI) * f.leapApex;
        const waterSurface = getWaterSurfaceHeight(curX, curZ, time);
        f.group.position.set(curX, waterSurface + arcY, curZ);

        // Pitch up on ascent, dive on descent
        const pitch = (0.5 - prog) * 1.8;
        f.group.rotation.x = pitch;
        f.tail.rotation.y = Math.sin(time * 30.0) * 0.45;

        // Splash on landing
        if (prog >= 1.0) {
          f.isLeaping = false;
          f.leapTimer = 0;
          f.nextLeapDelay = isOutro ? (1.5 + Math.random() * 2.5) : (5.0 + Math.random() * 8.0);
          this.spawnSplash(f.group.position, 10);
          if (this.pondWater) {
            this.pondWater.addRipple(curX, curZ, 0.55, 14.0, 12.0);
          }
        }
      } else {
        // Normal gentle underwater swimming
        f.angle += (f.speed / f.swimRadius) * dt;
        const targetX = f.baseX + Math.cos(f.angle) * f.swimRadius;
        const targetZ = f.baseZ + Math.sin(f.angle) * f.swimRadius;

        const dirX = targetX - f.group.position.x;
        const dirZ = targetZ - f.group.position.z;
        const heading = Math.atan2(dirX, dirZ);

        f.group.position.x = targetX;
        f.group.position.z = targetZ;

        // Follow undulating water surface below waterline
        const waterY = getWaterSurfaceHeight(targetX, targetZ, time);
        f.group.position.y = waterY - 0.28 + Math.sin(time * 2.5 + f.phase) * 0.08;

        f.group.rotation.y = heading;
        f.group.rotation.x = 0;
        f.tail.rotation.y = Math.sin(time * 14.0 + f.phase) * 0.35;

        // Periodic leaping when pond is clean or during outro
        if (isClean || isOutro) {
          f.nextLeapDelay -= dt;
          if (f.nextLeapDelay <= 0) {
            this.triggerLeap(f);
          }
        }
      }
    });

    // 2. Update Dragonflies
    this.dragonflies.forEach((df) => {
      const flutter = Math.sin(time * 48.0 + df.phase);
      df.wingL.rotation.z = flutter * 0.45;
      df.wingR.rotation.z = -flutter * 0.45;

      // Figure-8 hover pattern
      const t = time * df.speed + df.phase;
      const hx = df.anchor.x + Math.sin(t) * 2.2;
      const hz = df.anchor.z + Math.sin(t * 2.0) * 1.4;
      const waterY = getWaterSurfaceHeight(hx, hz, time);
      const hy = waterY + df.hoverHeight + Math.sin(t * 3.5) * 0.25;

      df.group.position.set(hx, hy, hz);
      df.group.rotation.y = Math.atan2(Math.cos(t), Math.cos(t * 2.0) * 2.0);
    });

    // 3. Restoration Motes
    if (this.motes) {
      const shouldShowMotes = isClean || isOutro;
      this.motes.visible = shouldShowMotes;

      if (shouldShowMotes) {
        const posAttr = this.motes.geometry.attributes.position;
        const arr = posAttr.array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] += dt * 0.65; // Drift upward
          if (arr[i + 1] > 6.5) {
            arr[i + 1] = 0.2;
          }
          arr[i] += Math.sin(time * 1.5 + i) * dt * 0.25;
        }
        posAttr.needsUpdate = true;
      }
    }

    // 4. Splash Particles
    for (let i = this.splashParticles.length - 1; i >= 0; i--) {
      const p = this.splashParticles[i];
      p.userData.life += dt;
      const prog = p.userData.life / p.userData.maxLife;

      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      p.userData.vy -= 9.8 * dt;

      p.scale.setScalar(1.0 - prog * 0.75);
      p.material.opacity = 0.85 * (1.0 - prog);

      if (prog >= 1.0) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.splashParticles.splice(i, 1);
      }
    }
  }

  resetLevel() {
    this.splashParticles.forEach((p) => {
      this.scene.remove(p);
      if (p.geometry) p.geometry.dispose();
      if (p.material) p.material.dispose();
    });
    this.splashParticles = [];
    if (this.motes) this.motes.visible = false;
  }
}
