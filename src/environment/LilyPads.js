import * as THREE from 'three';
import { getWaterSurfaceHeight } from './PondWater.js';

/**
 * Creates stylized notched lily pads and floating water lilies.
 * Serves as natural obstacles and rescue islands for stranded gnomes.
 */
export class LilyPads {
  constructor(count = 18, pondRadius = 38) {
    this.group = new THREE.Group();
    this.pads = [];

    this.createLilyPads(count, pondRadius);
  }

  createLilyPads(count, pondRadius) {
    // 1. Organic Lily Pad Shape (Wavy natural margin with smooth rounded cleft)
    const shape = new THREE.Shape();
    const padRadius = 2.4;
    const notchAngle = 0.32; // Organic cleft opening angle
    const pointsCount = 48;

    // Start at the rounded cleft apex near the stem hub
    const apexX = 0.15;
    const apexZ = 0.0;
    shape.moveTo(apexX, apexZ);

    // Inner cleft entry curve (right lip)
    const rightLipX = Math.cos(notchAngle) * padRadius;
    const rightLipZ = Math.sin(notchAngle) * padRadius;
    shape.quadraticCurveTo(apexX + 0.6, apexZ + 0.25, rightLipX, rightLipZ);

    // Perimeter with subtle botanical lobes and wavy scallops
    for (let i = 1; i <= pointsCount; i++) {
      const t = i / pointsCount;
      const angle = notchAngle + t * (Math.PI * 2 - notchAngle * 2);

      // Natural harmonic organic lobes
      const lobe1 = Math.sin(angle * 3.0) * 0.08;
      const lobe2 = Math.cos(angle * 5.0) * 0.05;
      const lobe3 = Math.sin(angle * 7.0) * 0.03;
      const r = padRadius * (1.0 + lobe1 + lobe2 + lobe3);

      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;
      shape.lineTo(px, pz);
    }

    // Left lip curving back into the cleft apex
    shape.quadraticCurveTo(apexX + 0.6, apexZ - 0.25, apexX, apexZ);

    const extrudeSettings = {
      depth: 0.10,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.05
    };

    const padGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    padGeometry.rotateX(Math.PI / 2);

    // Rich waxy water lily leaf material (translucent emerald with glossy highlights)
    const padMaterial = new THREE.MeshStandardMaterial({
      color: 0x228842,
      emissive: 0x0d3817,
      emissiveIntensity: 0.32,
      roughness: 0.32,
      metalness: 0.05,
      flatShading: false
    });

    // Embossed Vein Rib Material (lighter sunlit chartreuse)
    const veinMaterial = new THREE.MeshStandardMaterial({
      color: 0x48a855,
      emissive: 0x1a5223,
      emissiveIntensity: 0.40,
      roughness: 0.28,
      metalness: 0.04
    });

    // Lotus Flower Shared Materials & Geometries
    const outerPetalGeo = new THREE.SphereGeometry(0.34, 8, 6);
    outerPetalGeo.scale(0.55, 0.18, 1.35);

    const midPetalGeo = new THREE.SphereGeometry(0.28, 8, 6);
    midPetalGeo.scale(0.52, 0.22, 1.15);

    const innerPetalGeo = new THREE.SphereGeometry(0.22, 7, 5);
    innerPetalGeo.scale(0.48, 0.24, 0.95);

    const lotusWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffe4ec,
      emissiveIntensity: 0.25,
      roughness: 0.30
    });

    const lotusBlushMat = new THREE.MeshStandardMaterial({
      color: 0xfce7f3, // Soft rose blush tip
      emissive: 0xf472b6,
      emissiveIntensity: 0.20,
      roughness: 0.35
    });

    const flowerCenterMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.55,
      roughness: 0.35
    });

    const stamenMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      roughness: 0.25
    });

    // Clear Water Droplet Material
    const dropMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0xbae6fd,
      emissiveIntensity: 0.15,
      roughness: 0.04,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85
    });
    const dropGeo = new THREE.SphereGeometry(0.08, 8, 6);
    dropGeo.scale(1.0, 0.55, 1.0);

    // Contact Froth & Edge Meniscus Materials & Geometry
    const frothMaterial = new THREE.MeshStandardMaterial({
      color: 0xecfdf5,
      emissive: 0x6ee7b7,
      emissiveIntensity: 0.18,
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const frothGeo = new THREE.BufferGeometry();
    const frothPositions = [];
    const frothUvs = [];
    const frothIndices = [];
    const frothPointsCount = 36;
    for (let p = 0; p <= frothPointsCount; p++) {
      const t = p / frothPointsCount;
      const angle = notchAngle + t * (Math.PI * 2 - notchAngle * 2);
      const lobe1 = Math.sin(angle * 3.0) * 0.08;
      const lobe2 = Math.cos(angle * 5.0) * 0.05;
      const lobe3 = Math.sin(angle * 7.0) * 0.03;
      const rInner = padRadius * (1.0 + lobe1 + lobe2 + lobe3) * 0.98;
      const rOuter = rInner + 0.22;

      frothPositions.push(Math.cos(angle) * rInner, 0.005, Math.sin(angle) * rInner);
      frothUvs.push(0.0, t);
      frothPositions.push(Math.cos(angle) * rOuter, 0.003, Math.sin(angle) * rOuter);
      frothUvs.push(1.0, t);

      if (p < frothPointsCount) {
        const v0 = p * 2;
        const v1 = p * 2 + 1;
        const v2 = (p + 1) * 2;
        const v3 = (p + 1) * 2 + 1;
        frothIndices.push(v0, v1, v2);
        frothIndices.push(v1, v3, v2);
      }
    }
    frothGeo.setAttribute('position', new THREE.Float32BufferAttribute(frothPositions, 3));
    frothGeo.setAttribute('uv', new THREE.Float32BufferAttribute(frothUvs, 2));
    frothGeo.setIndex(frothIndices);
    frothGeo.computeVertexNormals();

    const bubbleGeo = new THREE.SphereGeometry(0.065, 6, 4);
    bubbleGeo.scale(1.0, 0.45, 1.0);

    for (let i = 0; i < count; i++) {
      const padGroup = new THREE.Group();

      let x, z, scale, hasFlower, isGnomePad = false;

      if (i === 0) {
        // Pip (Lookout) - North-East
        x = 16.0;
        z = -14.0;
        scale = 1.15;
        hasFlower = false;
        isGnomePad = true;
      } else if (i === 1) {
        // Barnaby (Engineer) - West-South-West
        x = -19.0;
        z = 10.0;
        scale = 1.20;
        hasFlower = false;
        isGnomePad = true;
      } else if (i === 2) {
        // Clover (Bell Tuner) - South-East
        x = 12.0;
        z = 20.0;
        scale = 1.15;
        hasFlower = false;
        isGnomePad = true;
      } else {
        // Distribute in donut region of pond, clear of Port Bramble Pier (x ≈ 0, z ≈ 30-38)
        let attempts = 0;
        do {
          const r = 8 + Math.random() * (pondRadius - 14);
          const theta = ((i - 3) / (count - 3)) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          x = Math.cos(theta) * r;
          z = Math.sin(theta) * r;
          attempts++;
        } while (attempts < 20 && Math.hypot(x - 1.6, z - 32.0) < 7.5);

        scale = 0.82 + Math.random() * 0.65;
        hasFlower = Math.random() > 0.45;
      }

      // 1. Base Leaf Mesh
      const padMesh = new THREE.Mesh(padGeometry, padMaterial);
      padMesh.receiveShadow = true;
      padGroup.add(padMesh);

      // 1b. Contact Froth Ribbon & Foam Pearl Bits at the waterline
      const frothGroup = new THREE.Group();
      const frothMesh = new THREE.Mesh(frothGeo, frothMaterial);
      frothGroup.add(frothMesh);

      const bubbleCount = 12;
      for (let b = 0; b < bubbleCount; b++) {
        const bT = b / bubbleCount;
        const bAngle = notchAngle + bT * (Math.PI * 2 - notchAngle * 2);
        const lobe = (Math.sin(bAngle * 3.0) * 0.08 + Math.cos(bAngle * 5.0) * 0.05);
        const bR = padRadius * (1.0 + lobe) + (Math.random() * 0.10 - 0.02);
        const bubble = new THREE.Mesh(bubbleGeo, frothMaterial);
        bubble.scale.setScalar(0.65 + Math.random() * 0.7);
        bubble.position.set(
          Math.cos(bAngle) * bR,
          0.015,
          Math.sin(bAngle) * bR
        );
        frothGroup.add(bubble);
      }
      padGroup.add(frothGroup);

      // 2. Embossed Vein Rib Network radiating from stem cleft apex
      const veinGroup = new THREE.Group();
      veinGroup.position.y = 0.055; // Slightly above leaf top surface

      // Central stem hub attachment disc
      const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.03, 10);
      const hub = new THREE.Mesh(hubGeo, veinMaterial);
      hub.position.set(0.15, 0, 0);
      veinGroup.add(hub);

      // 8 Primary Radiating Vein Ribs
      const veinAngles = [0.65, 1.25, 1.95, 2.70, 3.55, 4.30, 5.05, 5.65];
      veinAngles.forEach((vAngle, vIdx) => {
        const vLength = 1.65 + (Math.sin(vIdx * 2.1) * 0.25);
        const veinGeo = new THREE.CylinderGeometry(0.022, 0.045, vLength, 4);
        veinGeo.rotateZ(Math.PI / 2);
        veinGeo.translate(vLength / 2, 0, 0);

        const vMesh = new THREE.Mesh(veinGeo, veinMaterial);
        vMesh.position.set(0.15, 0, 0);
        vMesh.rotation.y = -vAngle;
        veinGroup.add(vMesh);

        // Secondary delicate branching veinlets
        const bLength = 0.55;
        const bGeo = new THREE.CylinderGeometry(0.012, 0.025, bLength, 3);
        bGeo.rotateZ(Math.PI / 2);
        bGeo.translate(bLength / 2, 0, 0);

        const b1 = new THREE.Mesh(bGeo, veinMaterial);
        b1.position.set(
          0.15 + Math.cos(vAngle) * (vLength * 0.55),
          0,
          Math.sin(vAngle) * (vLength * 0.55)
        );
        b1.rotation.y = -vAngle - 0.55;
        veinGroup.add(b1);

        const b2 = new THREE.Mesh(bGeo, veinMaterial);
        b2.position.set(
          0.15 + Math.cos(vAngle) * (vLength * 0.70),
          0,
          Math.sin(vAngle) * (vLength * 0.70)
        );
        b2.rotation.y = -vAngle + 0.55;
        veinGroup.add(b2);
      });
      padGroup.add(veinGroup);

      // 3. Glistening Dewdrops on the waxy leaf surface
      const dropletCount = 3 + Math.floor(Math.random() * 3);
      for (let d = 0; d < dropletCount; d++) {
        const drop = new THREE.Mesh(dropGeo, dropMat);
        const dAngle = Math.random() * Math.PI * 2;
        const dDist = 0.6 + Math.random() * 1.3;
        const dScale = 0.7 + Math.random() * 0.6;
        drop.scale.setScalar(dScale);
        drop.position.set(
          0.15 + Math.cos(dAngle) * dDist,
          0.065,
          Math.sin(dAngle) * dDist
        );
        padGroup.add(drop);
      }

      // 4. High-Fidelity Multi-Tiered Water Lily Flower
      if (hasFlower) {
        const flowerGroup = new THREE.Group();
        const fAngle = Math.random() * Math.PI * 2;
        const fDist = 0.75 + Math.random() * 0.55;
        flowerGroup.position.set(Math.cos(fAngle) * fDist, 0.12, Math.sin(fAngle) * fDist);

        // Center golden carpellary seed disc
        const carpel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.18, 10), flowerCenterMat);
        carpel.position.y = 0.12;
        flowerGroup.add(carpel);

        // Ring of 14 golden pollen stamens
        const stamenCount = 14;
        const stamenGeo = new THREE.ConeGeometry(0.04, 0.18, 4);
        stamenGeo.translate(0, 0.09, 0);
        for (let s = 0; s < stamenCount; s++) {
          const sAngle = (s / stamenCount) * Math.PI * 2;
          const st = new THREE.Mesh(stamenGeo, stamenMat);
          st.position.set(Math.cos(sAngle) * 0.28, 0.14, Math.sin(sAngle) * 0.28);
          st.rotation.y = -sAngle;
          st.rotation.z = -0.32; // Splay outwards
          flowerGroup.add(st);
        }

        // Tier 1: Outer guard petals (flared open, rose-tinted blush tips)
        const outerCount = 6;
        for (let p = 0; p < outerCount; p++) {
          const pAngle = (p / outerCount) * Math.PI * 2;
          const petal = new THREE.Mesh(outerPetalGeo, lotusBlushMat);
          petal.position.set(Math.cos(pAngle) * 0.44, 0.10, Math.sin(pAngle) * 0.44);
          petal.rotation.y = -pAngle + Math.PI / 2;
          petal.rotation.x = 0.15; // Flared open
          petal.castShadow = true;
          flowerGroup.add(petal);
        }

        // Tier 2: Mid cupped petals (graceful bowl shape)
        const midCount = 8;
        for (let p = 0; p < midCount; p++) {
          const pAngle = (p / midCount) * Math.PI * 2 + (Math.PI / 8);
          const petal = new THREE.Mesh(midPetalGeo, lotusWhiteMat);
          petal.position.set(Math.cos(pAngle) * 0.36, 0.15, Math.sin(pAngle) * 0.36);
          petal.rotation.y = -pAngle + Math.PI / 2;
          petal.rotation.x = 0.45; // Cupped inward
          petal.castShadow = true;
          flowerGroup.add(petal);
        }

        // Tier 3: Inner upright bud petals (sheltering the carpel)
        const innerCount = 6;
        for (let p = 0; p < innerCount; p++) {
          const pAngle = (p / innerCount) * Math.PI * 2 + (Math.PI / 6);
          const petal = new THREE.Mesh(innerPetalGeo, lotusWhiteMat);
          petal.position.set(Math.cos(pAngle) * 0.26, 0.18, Math.sin(pAngle) * 0.26);
          petal.rotation.y = -pAngle + Math.PI / 2;
          petal.rotation.x = 0.75; // Upright cup
          flowerGroup.add(petal);
        }

        padGroup.add(flowerGroup);
      }

      // 5. Submerged stem descending into clear water depths
      const stemMat = new THREE.MeshStandardMaterial({
        color: 0x1d3d25,
        roughness: 0.85
      });
      const stemGeo = new THREE.CylinderGeometry(0.045, 0.065, 2.4, 6);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(0.15, -1.15, 0);
      stem.rotation.z = (Math.random() - 0.5) * 0.20;
      padGroup.add(stem);

      padGroup.scale.set(scale, scale, scale);
      padGroup.position.set(x, 0.14, z);
      padGroup.rotation.y = Math.random() * Math.PI * 2;

      this.group.add(padGroup);


      this.pads.push({
        group: padGroup,
        x,
        z,
        position: new THREE.Vector3(x, 0.14, z),
        radius: (padRadius + 0.04) * scale,
        rotation: -padGroup.rotation.y, // Exact world notch center angle
        baseY: 0.14,
        bobPhase: Math.random() * Math.PI * 2,
        isGnomePad,
        // Dynamic ripple & wake physics
        offsetX: 0,
        offsetZ: 0,
        velX: 0,
        velZ: 0,
        tiltX: 0,
        tiltZ: 0,
        tiltVelX: 0,
        tiltVelZ: 0,
        heaveY: 0,
        heaveVelY: 0
      });
    }
  }

  update(dt, time, boat = null, ripples = null) {
    for (const pad of this.pads) {
      // 1. Bell Acoustic Ripple Wave Push & Tilt
      if (ripples && ripples.length > 0) {
        for (const rip of ripples) {
          rip.padImpactSet = rip.padImpactSet || new Set();
          if (rip.padImpactSet.has(pad)) continue;

          const currentPadX = pad.x + pad.offsetX;
          const currentPadZ = pad.z + pad.offsetZ;
          const dx = currentPadX - rip.origin.x;
          const dz = currentPadZ - rip.origin.y;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist >= rip.currentRadius - 1.2 && dist <= rip.currentRadius + 1.2) {
            rip.padImpactSet.add(pad);
            const dirX = dist > 0.01 ? dx / dist : 1.0;
            const dirZ = dist > 0.01 ? dz / dist : 0.0;
            const strength = Math.max(0.0, 1.0 - dist / rip.maxRadius) * rip.strength;

            // Physical outward surge
            const pushImpulse = 2.4 * strength;
            pad.velX += dirX * pushImpulse;
            pad.velZ += dirZ * pushImpulse;

            // Wave tilt away from impact
            pad.tiltVelX += -dirZ * 2.2 * strength;
            pad.tiltVelZ += dirX * 2.2 * strength;

            // Wave crest vertical heave
            pad.heaveVelY += 1.8 * strength;
          }
        }
      }

      // 2. Dynamic Tugboat Wake Rolling & Wobbling
      if (boat && Math.abs(boat.speed) > 0.4) {
        const boatPos = boat.position;
        const heading = boat.heading;
        const speedRatio = Math.min(1.0, Math.abs(boat.speed) / boat.maxSpeed);

        const currentPadX = pad.x + pad.offsetX;
        const currentPadZ = pad.z + pad.offsetZ;
        const bdx = currentPadX - boatPos.x;
        const bdz = currentPadZ - boatPos.z;

        const fwd = bdx * Math.sin(heading) + bdz * Math.cos(heading);
        const lat = bdx * Math.cos(heading) - bdz * Math.sin(heading);

        // Within active stern wake cone (behind boat up to 8.5m)
        if (fwd < -0.6 && fwd > -8.5) {
          const distBehind = -fwd;
          const wakeHalfWidth = 0.85 + distBehind * 0.42;
          const armDist = Math.abs(Math.abs(lat) - wakeHalfWidth);

          if (armDist < 2.0) {
            const wakeProximity = (1.0 - distBehind / 8.5) * (1.0 - armDist / 2.0) * speedRatio;
            const side = lat >= 0 ? 1.0 : -1.0;

            // Lateral wake surge
            const latDirX = Math.cos(heading) * side;
            const latDirZ = -Math.sin(heading) * side;

            pad.velX += latDirX * wakeProximity * 2.2 * dt;
            pad.velZ += latDirZ * wakeProximity * 2.2 * dt;

            // Roll wobble rocking side-to-side
            const wobbleFreq = 11.0;
            pad.tiltVelX += Math.sin(time * wobbleFreq + pad.bobPhase) * wakeProximity * 5.0 * dt;
            pad.tiltVelZ += Math.cos(time * wobbleFreq + pad.bobPhase) * wakeProximity * 5.0 * dt;

            // Buoyant wave bobbing
            pad.heaveVelY += Math.sin(time * 13.0) * wakeProximity * 3.0 * dt;
          }
        }
      }

      // 3. Physics Integration & Water Drag / Restoring Springs
      pad.velX += (-pad.offsetX * 2.8) * dt;
      pad.velZ += (-pad.offsetZ * 2.8) * dt;
      pad.velX *= Math.pow(0.18, dt);
      pad.velZ *= Math.pow(0.18, dt);

      pad.offsetX += pad.velX * dt;
      pad.offsetZ += pad.velZ * dt;

      // Clamp maximum displacement so pads remain in their zones
      const dispDist = Math.sqrt(pad.offsetX * pad.offsetX + pad.offsetZ * pad.offsetZ);
      if (dispDist > 1.6) {
        pad.offsetX = (pad.offsetX / dispDist) * 1.6;
        pad.offsetZ = (pad.offsetZ / dispDist) * 1.6;
      }

      // Tilt springs & damping
      pad.tiltVelX += (-pad.tiltX * 14.0) * dt;
      pad.tiltVelZ += (-pad.tiltZ * 14.0) * dt;
      pad.tiltVelX *= Math.pow(0.12, dt);
      pad.tiltVelZ *= Math.pow(0.12, dt);

      pad.tiltX += pad.tiltVelX * dt;
      pad.tiltZ += pad.tiltVelZ * dt;

      // Heave spring & damping
      pad.heaveVelY += (-pad.heaveY * 16.0) * dt;
      pad.heaveVelY *= Math.pow(0.15, dt);
      pad.heaveY += pad.heaveVelY * dt;

      // 4. Update 3D Transform
      const currentX = pad.x + pad.offsetX;
      const currentZ = pad.z + pad.offsetZ;
      const waveY = getWaterSurfaceHeight(currentX, currentZ, time);

      pad.group.position.x = currentX;
      pad.group.position.z = currentZ;
      pad.group.position.y = waveY + pad.baseY + pad.heaveY + Math.sin(time * 1.8 + pad.bobPhase) * 0.02;

      pad.group.rotation.x = -Math.cos(currentZ * 0.2 + time * 1.4) * 0.03 + pad.tiltX;
      pad.group.rotation.z = Math.sin(currentX * 0.2 + time * 1.4) * 0.03 + pad.tiltZ;

      pad.position.set(currentX, pad.group.position.y, currentZ);
    }
  }
}
