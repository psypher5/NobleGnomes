import * as THREE from 'three';
import { getWaterSurfaceHeight } from '../environment/PondWater.js';

let clotGeoCache = null;

function getClotGeometries() {
  if (!clotGeoCache) {
    clotGeoCache = {
      core: new THREE.SphereGeometry(0.46, 12, 10),
      satellite: new THREE.SphereGeometry(0.26, 8, 7),
      fleck: new THREE.SphereGeometry(0.16, 6, 5),
      ring: new THREE.RingGeometry(0.75, 1.05, 24),
      beam: new THREE.CylinderGeometry(0.12, 0.32, 2.8, 8, 1, true),
      diamond: new THREE.OctahedronGeometry(0.24, 0)
    };
    clotGeoCache.core.scale(1.25, 0.65, 1.15);
    clotGeoCache.ring.rotateX(-Math.PI / 2);
    clotGeoCache.beam.translate(0, 1.4, 0); // Base sits at water level
  }
  return clotGeoCache;
}

/**
 * Floating Algae Scum Clot dropped when an algae blob is popped.
 * Bobs on pond waves and is scooped up by the player's tugboat.
 */
export class ScumClot {
  constructor(x, z, value = 1) {
    this.value = value;
    this.position = new THREE.Vector3(x, 0.05, z);
    this.basePos = this.position.clone();
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.isCollected = false;
    this.collectProgress = 0;
    this.targetBoat = null;
    this.startCollectPos = null;

    this.bobOffset = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 1.8;

    this.createVisuals();
  }

  createVisuals() {
    const geos = getClotGeometries();

    // 1. High-visibility glossy chartreuse algae materials
    this.scumMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16,      // Vibrant lime
      emissive: 0x22c55e,   // Glowing green
      emissiveIntensity: 0.85,
      roughness: 0.18,
      metalness: 0.08,
      transparent: true,
      opacity: 0.95
    });

    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0xa7f3d0,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.diamondMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,      // Golden lime tip
      emissive: 0xa3e635,
      emissiveIntensity: 1.2,
      roughness: 0.15
    });

    // Main spongy organic clot
    this.coreMesh = new THREE.Mesh(geos.core, this.scumMat);
    this.coreMesh.castShadow = true;
    this.group.add(this.coreMesh);

    // Satellites to make it chunky & organic
    const s1 = new THREE.Mesh(geos.satellite, this.scumMat);
    s1.position.set(0.28, 0.06, 0.22);
    this.group.add(s1);

    const s2 = new THREE.Mesh(geos.satellite, this.scumMat);
    s2.position.set(-0.30, -0.04, -0.18);
    this.group.add(s2);

    const f1 = new THREE.Mesh(geos.fleck, this.scumMat);
    f1.position.set(0.15, 0.18, -0.24);
    this.group.add(f1);

    // Subtle water surface halo ring
    this.haloRing = new THREE.Mesh(geos.ring, this.haloMat);
    this.haloRing.position.y = -0.02;
    this.group.add(this.haloRing);

    // Vertical luminous beacon beam shooting up from water
    this.beaconBeam = new THREE.Mesh(geos.beam, this.beamMat);
    this.group.add(this.beaconBeam);

    // Floating spinning diamond gem above the clot
    this.diamondMesh = new THREE.Mesh(geos.diamond, this.diamondMat);
    this.diamondMesh.position.y = 2.1;
    this.group.add(this.diamondMesh);
  }


  startCollection(tugboat) {
    if (this.isCollected) return;
    this.isCollected = true;
    this.collectProgress = 0;
    this.targetBoat = tugboat;
    this.startCollectPos = this.group.position.clone();
  }

  update(dt, elapsedTime) {
    // 1. Arcing Scoop Animation into Boat Hopper
    if (this.isCollected && this.targetBoat) {
      this.collectProgress += dt * 3.8;
      const t = Math.min(1.0, this.collectProgress);

      const targetPos = this.targetBoat.position.clone();
      targetPos.y += 0.45; // Deck level

      // Quadratic bezier arc trajectory
      const arcHeight = 1.2;
      const currentX = THREE.MathUtils.lerp(this.startCollectPos.x, targetPos.x, t);
      const currentZ = THREE.MathUtils.lerp(this.startCollectPos.z, targetPos.z, t);
      const currentY = THREE.MathUtils.lerp(this.startCollectPos.y, targetPos.y, t) + Math.sin(t * Math.PI) * arcHeight;

      this.group.position.set(currentX, currentY, currentZ);

      // Shrink into boat hopper
      const scale = 1.0 - t * 0.75;
      this.group.scale.setScalar(scale);

      return t >= 1.0; // Return true when scoop animation finishes
    }

    // 2. Buoyant Water Bobbing & Rotation
    const waterY = getWaterSurfaceHeight(this.position.x, this.position.z, elapsedTime);
    const waveBob = Math.sin(elapsedTime * 2.8 + this.bobOffset) * 0.035;
    this.group.position.y = waterY + 0.05 + waveBob;

    this.group.rotation.y += this.rotSpeed * dt;

    // Halo pulse & ripple expansion
    if (this.haloRing) {
      const pulse = 1.0 + Math.sin(elapsedTime * 4.0 + this.bobOffset) * 0.18;
      this.haloRing.scale.set(pulse, pulse, 1);
      this.haloMat.opacity = 0.45 + Math.sin(elapsedTime * 3.5) * 0.20;
    }

    // Vertical beacon pulse & shimmer
    if (this.beaconBeam && this.beamMat) {
      this.beamMat.opacity = 0.22 + Math.sin(elapsedTime * 5.0 + this.bobOffset) * 0.15;
      const bScale = 1.0 + Math.sin(elapsedTime * 3.0) * 0.08;
      this.beaconBeam.scale.set(bScale, 1.0, bScale);
    }

    // Floating spinning diamond gem animation
    if (this.diamondMesh) {
      this.diamondMesh.rotation.y += 2.4 * dt;
      this.diamondMesh.rotation.x = Math.sin(elapsedTime * 2.0) * 0.2;
      this.diamondMesh.position.y = 2.0 + Math.sin(elapsedTime * 3.5 + this.bobOffset) * 0.18;
    }

    return false;
  }

  dispose(scene) {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    if (scene) {
      scene.remove(this.group);
    }
    if (this.scumMat) this.scumMat.dispose();
    if (this.haloMat) this.haloMat.dispose();
    if (this.beamMat) this.beamMat.dispose();
    if (this.diamondMat) this.diamondMat.dispose();
  }
}

