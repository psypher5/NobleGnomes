import * as THREE from 'three';
import { getRollingHillHeight } from './PondBed.js';

/**
 * High-detail storybook perimeter foliage framing the pond diorama:
 * - Garden Trees, Weeping Willows, Woodland Oaks, and Horizon Evergreen Pines
 * - Multi-color Wildflower Patches (Buttercups, Daisies, Bluebells, Mallows, Heather, Poppies)
 * - Stylized Grass Blade Tufts and velvet moss clumps
 * - Layered Moss-Capped Boulder Formations
 *
 * Grounded dynamically on the rolling countryside hills landscape.
 * Leaves an open clearway at the South bank for Port Bramble Pier.
 */
export class PerimeterFoliage {
  constructor(pondRadius = 42) {
    this.pondRadius = pondRadius;
    this.group = new THREE.Group();

    this.swayingElements = [];

    this.initSharedResources();

    this.createTrees();
    this.createWildflowers();
    this.createGrassTufts();
    this.createMossyBoulders();
  }

  initSharedResources() {
    // Tree Bark & Woods
    this.trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c4632, // Warm chestnut cedar
      roughness: 0.85,
      metalness: 0.02,
      flatShading: true
    });
    this.birchTrunkMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8, // Silver birch trunk
      roughness: 0.80,
      metalness: 0.02,
      flatShading: true
    });

    // Layered Foliage Greens & Conifer Tones
    this.leafMatDeep = new THREE.MeshStandardMaterial({
      color: 0x275926,
      roughness: 0.76,
      flatShading: true
    });
    this.leafMatMid = new THREE.MeshStandardMaterial({
      color: 0x3e8a34,
      roughness: 0.70,
      flatShading: true
    });
    this.leafMatBright = new THREE.MeshStandardMaterial({
      color: 0x5eb844,
      roughness: 0.65,
      flatShading: true
    });
    this.pineMat = new THREE.MeshStandardMaterial({
      color: 0x184223, // Deep evergreen spruce
      roughness: 0.80,
      flatShading: true
    });
    this.goldenCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x76ad36, // Sunlit hilltop oak
      roughness: 0.68,
      flatShading: true
    });
    this.willowMat = new THREE.MeshStandardMaterial({
      color: 0x6ca34e,
      roughness: 0.72,
      flatShading: true
    });

    // Vibrant Wildflowers (bright, readable from diorama distance)
    this.stemMat = new THREE.MeshStandardMaterial({
      color: 0x427d32,
      roughness: 0.75,
      flatShading: true
    });
    this.buttercupMat = new THREE.MeshStandardMaterial({
      color: 0xffd000,
      emissive: 0xffaa00,
      emissiveIntensity: 0.15,
      roughness: 0.42
    });
    this.bluebellMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.12,
      roughness: 0.45
    });
    this.daisyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.18,
      roughness: 0.38
    });
    this.flowerCenterMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.2,
      roughness: 0.5
    });
    this.pinkMallowMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xdb2777,
      emissiveIntensity: 0.15,
      roughness: 0.45
    });

    // Grass & Velvet Moss
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x56a33b,
      roughness: 0.8,
      flatShading: true
    });
    this.mossMat = new THREE.MeshStandardMaterial({
      color: 0x4e8a32,
      roughness: 0.85,
      flatShading: true
    });

    // Warm Sunlit Rocks
    this.rockMat = new THREE.MeshStandardMaterial({
      color: 0x768579, // River granite
      roughness: 0.82,
      flatShading: true
    });
    this.rockSandstoneMat = new THREE.MeshStandardMaterial({
      color: 0x9c8e76, // Golden sandstone
      roughness: 0.80,
      flatShading: true
    });
    this.heatherMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc, // Purple upland heather
      emissive: 0x9333ea,
      emissiveIntensity: 0.16,
      roughness: 0.42
    });
    this.poppyMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Scarlet field poppy
      emissive: 0xdc2626,
      emissiveIntensity: 0.18,
      roughness: 0.40
    });

    // High-Detail Botanical Materials
    this.poppyCenterMat = new THREE.MeshStandardMaterial({
      color: 0x221329, // Blackberry purple-black center
      roughness: 0.6
    });
    this.wheatSeedheadMat = new THREE.MeshStandardMaterial({
      color: 0xd4be8d, // Golden straw grain
      roughness: 0.72,
      flatShading: true
    });
    this.calyxMat = new THREE.MeshStandardMaterial({
      color: 0x366827,
      roughness: 0.8
    });
    this.branchMat = new THREE.MeshStandardMaterial({
      color: 0x4a3726,
      roughness: 0.86,
      flatShading: true
    });
    this.birchNotchMat = new THREE.MeshStandardMaterial({
      color: 0x262626,
      roughness: 0.9
    });
    this.sunlitLeafMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16, // Golden-lime sunlit crown
      roughness: 0.62,
      flatShading: true
    });
    this.shadowLeafMat = new THREE.MeshStandardMaterial({
      color: 0x1a3818, // Deep underside shadow foliage
      roughness: 0.82,
      flatShading: true
    });
  }


  isNearPierClearway(x, z) {
    // Port Bramble Pier is at South bank (x ≈ 0, z ≈ 38.5)
    return Math.abs(x) < 7.8 && z > 27.5;
  }

  createTrees() {
    // Shared Geometries for memory & performance efficiency
    const trunkGeoOak = new THREE.CylinderGeometry(0.38, 0.72, 4.6, 7);
    trunkGeoOak.translate(0, 2.3, 0);

    const trunkGeoPine = new THREE.CylinderGeometry(0.22, 0.54, 6.2, 6);
    trunkGeoPine.translate(0, 3.1, 0);

    const trunkGeoBirch = new THREE.CylinderGeometry(0.24, 0.42, 5.0, 6);
    trunkGeoBirch.translate(0, 2.5, 0);

    const rootFlareGeo = new THREE.ConeGeometry(0.26, 1.3, 5);
    rootFlareGeo.rotateX(-Math.PI / 2.7);
    rootFlareGeo.translate(0, 0.18, 0.52);

    const branchGeo = new THREE.CylinderGeometry(0.12, 0.24, 1.9, 5);
    branchGeo.translate(0, 0.95, 0);

    const canopyGeoMain = new THREE.DodecahedronGeometry(2.3, 1);
    const canopyGeoSub = new THREE.DodecahedronGeometry(1.65, 1);
    const canopyGeoHighlight = new THREE.DodecahedronGeometry(1.35, 1);

    const willowFrondGeo = new THREE.ConeGeometry(0.95, 3.6, 6);
    willowFrondGeo.rotateX(Math.PI);
    willowFrondGeo.translate(0, -1.8, 0);

    const pineConeGeos = [
      new THREE.ConeGeometry(2.8, 3.4, 7),
      new THREE.ConeGeometry(2.3, 2.9, 7),
      new THREE.ConeGeometry(1.7, 2.4, 6),
      new THREE.ConeGeometry(1.1, 1.9, 6)
    ];

    // Tree definitions across 3 depth tiers:
    // Tier 1: Shoreline Groves (r ≈ 43 - 52m, 28 trees) - Willows & riverside alders
    // Tier 2: Mid-Distance Woodland (r ≈ 53 - 80m, 54 trees) - Oaks, birches, chestnuts
    // Tier 3: Horizon Ridge Forest (r ≈ 80 - 128m, 72 trees) - Evergreen spruces & ridge pines
    const treeTiers = [
      { count: 28, rMin: 43.0, rMax: 52.0, type: 'shoreline' },
      { count: 54, rMin: 53.0, rMax: 80.0, type: 'woodland' },
      { count: 72, rMin: 81.0, rMax: 126.0, type: 'ridge' }
    ];

    let treeId = 0;
    treeTiers.forEach((tier) => {
      for (let i = 0; i < tier.count; i++) {
        treeId++;
        const baseAngle = (i / tier.count) * Math.PI * 2;
        const angleJitter = (Math.sin(treeId * 3.7) + Math.cos(treeId * 5.1)) * 0.14;
        const angle = baseAngle + angleJitter;

        const radialJitter = (Math.sin(treeId * 2.3) * 0.5 + 0.5);
        const dist = tier.rMin + radialJitter * (tier.rMax - tier.rMin);

        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        if (this.isNearPierClearway(x, z)) continue;

        const groundY = getRollingHillHeight(x, z);
        const treeGroup = new THREE.Group();
        treeGroup.userData = { isTree: true };
        treeGroup.position.set(x, groundY, z);

        const scale = 0.9 + Math.abs(Math.sin(treeId * 1.7)) * 0.55;
        treeGroup.scale.set(scale, scale, scale);

        const canopyGroup = new THREE.Group();

        if (tier.type === 'shoreline') {
          // Shoreline: Weeping Willows (1 in 2) or Riverside Fruit Trees
          const isWillow = (i % 2 === 0);
          const trunk = new THREE.Mesh(trunkGeoOak, this.trunkMat);
          trunk.rotation.z = Math.sin(treeId * 1.3) * 0.08;
          trunk.rotation.x = Math.cos(treeId * 1.9) * 0.08;
          trunk.castShadow = true;
          trunk.receiveShadow = true;
          treeGroup.add(trunk);

          // Root spurs anchoring to the riverbank
          for (let r = 0; r < 3; r++) {
            const root = new THREE.Mesh(rootFlareGeo, this.trunkMat);
            root.rotation.y = (r / 3) * Math.PI * 2 + treeId;
            root.castShadow = true;
            treeGroup.add(root);
          }

          canopyGroup.position.set(0, 4.4, 0);

          if (isWillow) {
            const crown = new THREE.Mesh(canopyGeoMain, this.willowMat);
            crown.scale.set(1.5, 0.85, 1.5);
            crown.castShadow = true;
            canopyGroup.add(crown);

            // 12 cascading weeping fronds
            const frondCount = 12;
            for (let f = 0; f < frondCount; f++) {
              const fAngle = (f / frondCount) * Math.PI * 2 + f * 0.25;
              const fDist = 1.3 + Math.sin(f * 2.1) * 0.55;
              const frond = new THREE.Mesh(willowFrondGeo, this.willowMat);
              frond.position.set(Math.cos(fAngle) * fDist, -0.2, Math.sin(fAngle) * fDist);
              frond.scale.set(0.92, 1.25 + Math.sin(f * 1.7) * 0.35, 0.92);
              frond.castShadow = true;
              canopyGroup.add(frond);
            }
          } else {
            // Scaffold boughs reaching into the foliage
            [-0.45, 0.45].forEach((bx, bIdx) => {
              const branch = new THREE.Mesh(branchGeo, this.branchMat);
              branch.position.set(bx * 0.7, 3.8, 0);
              branch.rotation.z = (bIdx === 0 ? 0.42 : -0.42);
              branch.rotation.y = bIdx * 1.4;
              treeGroup.add(branch);
            });

            // 5-puff volumetric cloud with 3-tone lighting
            const puffs = [
              { x: 0, y: 0.2, z: 0, s: 1.35, m: this.shadowLeafMat },
              { x: -0.9, y: 0.6, z: 0.5, s: 1.05, m: this.leafMatMid },
              { x: 0.85, y: 0.5, z: -0.6, s: 1.15, m: this.leafMatDeep },
              { x: 0.35, y: 0.7, z: 0.85, s: 0.95, m: this.leafMatBright },
              { x: 0.15, y: 1.25, z: -0.15, s: 1.1, m: this.sunlitLeafMat } // Golden sunlit crest
            ];
            puffs.forEach(po => {
              const puff = new THREE.Mesh(canopyGeoSub, po.m);
              puff.position.set(po.x, po.y, po.z);
              puff.scale.setScalar(po.s);
              puff.castShadow = true;
              puff.receiveShadow = true;
              canopyGroup.add(puff);
            });
          }
        } else if (tier.type === 'woodland') {
          // Mid-distance: Sturdy Oaks & Silver Birches
          const isBirch = (i % 3 === 0);
          const trunkMat = isBirch ? this.birchTrunkMat : this.trunkMat;
          const trunkGeo = isBirch ? trunkGeoBirch : trunkGeoOak;

          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.rotation.z = Math.sin(treeId * 1.5) * 0.07;
          trunk.castShadow = true;
          trunk.receiveShadow = true;
          treeGroup.add(trunk);

          // Root spurs
          for (let r = 0; r < 3; r++) {
            const root = new THREE.Mesh(rootFlareGeo, trunkMat);
            root.rotation.y = (r / 3) * Math.PI * 2 + treeId * 0.5;
            root.castShadow = true;
            treeGroup.add(root);
          }

          // Birch horizontal bark lenticels
          if (isBirch) {
            const ringGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 7);
            [1.2, 2.2, 3.4].forEach(ry => {
              const ring = new THREE.Mesh(ringGeo, this.birchNotchMat);
              ring.position.y = ry;
              treeGroup.add(ring);
            });
          }

          canopyGroup.position.set(0, isBirch ? 4.8 : 4.5, 0);

          // Scaffold boughs
          [-0.5, 0.5].forEach((bx, bIdx) => {
            const branch = new THREE.Mesh(branchGeo, this.branchMat);
            branch.position.set(bx * 0.6, isBirch ? 4.2 : 3.8, 0);
            branch.rotation.z = (bIdx === 0 ? 0.38 : -0.38);
            treeGroup.add(branch);
          });

          const primaryLeafMat = isBirch ? this.goldenCanopyMat : this.leafMatMid;
          [
            { x: 0, y: 0.1, z: 0, s: 1.45, m: this.shadowLeafMat },
            { x: -0.9, y: 0.5, z: 0.6, s: 1.15, m: primaryLeafMat },
            { x: 0.85, y: 0.4, z: -0.7, s: 1.20, m: this.leafMatDeep },
            { x: 0.45, y: 0.7, z: 0.65, s: 1.05, m: this.leafMatBright },
            { x: 0.0, y: 1.35, z: 0.1, s: 1.15, m: this.sunlitLeafMat } // Golden sunlit top
          ].forEach(po => {
            const puff = new THREE.Mesh(canopyGeoSub, po.m);
            puff.position.set(po.x, po.y, po.z);
            puff.scale.setScalar(po.s);
            puff.castShadow = true;
            puff.receiveShadow = true;
            canopyGroup.add(puff);
          });
        } else {
          // Ridge: Evergreen Conifers & Giant Oaks
          const isConifer = (i % 3 !== 0);
          if (isConifer) {
            const trunk = new THREE.Mesh(trunkGeoPine, this.trunkMat);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            treeGroup.add(trunk);

            canopyGroup.position.set(0, 3.2, 0);

            // 4 tiered pagoda conical evergreen needle skirts
            const tierHeights = [0.0, 1.6, 3.0, 4.3];
            pineConeGeos.forEach((coneGeo, cIdx) => {
              const cone = new THREE.Mesh(coneGeo, this.pineMat);
              cone.position.y = tierHeights[cIdx];
              cone.castShadow = true;
              cone.receiveShadow = true;
              canopyGroup.add(cone);
            });
          } else {
            // Giant Ridge Oak
            const trunk = new THREE.Mesh(trunkGeoOak, this.trunkMat);
            trunk.scale.set(1.2, 1.3, 1.2);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            treeGroup.add(trunk);

            for (let r = 0; r < 4; r++) {
              const root = new THREE.Mesh(rootFlareGeo, this.trunkMat);
              root.rotation.y = (r / 4) * Math.PI * 2;
              treeGroup.add(root);
            }

            canopyGroup.position.set(0, 5.2, 0);
            const mainCrown = new THREE.Mesh(canopyGeoMain, this.leafMatDeep);
            mainCrown.scale.set(1.8, 1.3, 1.8);
            mainCrown.castShadow = true;
            canopyGroup.add(mainCrown);

            const crest = new THREE.Mesh(canopyGeoSub, this.sunlitLeafMat);
            crest.position.set(0, 1.6, 0);
            crest.scale.set(1.2, 0.9, 1.2);
            canopyGroup.add(crest);
          }
        }

        treeGroup.add(canopyGroup);
        this.group.add(treeGroup);

        // Wind sway
        this.swayingElements.push({
          group: canopyGroup,
          baseRotZ: 0,
          baseRotX: 0,
          freq: 1.1 + Math.sin(treeId) * 0.3,
          phase: treeId * 0.7,
          amplitude: (tier.type === 'shoreline') ? 0.035 : 0.018
        });
      }
    });
  }

  createWildflowers() {
    const patchCount = 115;

    // High-Detail Botanical Flower Geometries
    const stemGeo = new THREE.CylinderGeometry(0.025, 0.045, 1.0, 5);
    stemGeo.translate(0, 0.5, 0);

    const daisyPetalGeo = new THREE.SphereGeometry(0.14, 6, 5);
    daisyPetalGeo.scale(0.35, 0.10, 1.15);

    const buttercupPetalGeo = new THREE.SphereGeometry(0.16, 6, 5);
    buttercupPetalGeo.scale(0.65, 0.20, 0.95);

    const poppyPetalGeo = new THREE.SphereGeometry(0.22, 6, 5);
    poppyPetalGeo.scale(0.85, 0.22, 1.1);

    const centerDomeGeo = new THREE.SphereGeometry(0.16, 8, 6);
    centerDomeGeo.scale(1.0, 0.6, 1.0);

    const bellFluteGeo = new THREE.ConeGeometry(0.18, 0.35, 6);
    bellFluteGeo.rotateX(Math.PI);

    const calyxGeo = new THREE.ConeGeometry(0.18, 0.12, 5);

    const varietyPalettes = [
      { name: 'Buttercup', petalMat: this.buttercupMat, type: 'buttercup' },
      { name: 'Bluebell', petalMat: this.bluebellMat, type: 'bluebell' },
      { name: 'Daisy', petalMat: this.daisyMat, type: 'daisy' },
      { name: 'PinkMallow', petalMat: this.pinkMallowMat, type: 'buttercup' },
      { name: 'Heather', petalMat: this.heatherMat, type: 'heather' },
      { name: 'Poppy', petalMat: this.poppyMat, type: 'poppy' }
    ];

    for (let p = 0; p < patchCount; p++) {
      const angle = (p / patchCount) * Math.PI * 2 + (Math.sin(p * 2.9) * 0.16);

      // Distribute patches: 40 near shoreline (r ≈ 39.5 - 43m), 75 in rolling meadows (r ≈ 44 - 76m)
      const isShoreline = (p < 40);
      const dist = isShoreline
        ? (this.pondRadius - 1.2 + (Math.sin(p * 3.7) * 1.8))
        : (44.0 + Math.abs(Math.sin(p * 4.1)) * 32.0);

      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;

      if (this.isNearPierClearway(px, pz)) continue;

      const py = getRollingHillHeight(px, pz);
      const variety = varietyPalettes[p % varietyPalettes.length];
      const patchGroup = new THREE.Group();
      patchGroup.userData = { isFlowerPatch: true };
      patchGroup.position.set(px, py + 0.02, pz);

      const flowersInPatch = 6 + Math.floor(Math.abs(Math.sin(p * 3.3)) * 7);
      for (let f = 0; f < flowersInPatch; f++) {
        const flower = new THREE.Group();
        const ox = (Math.sin(f * 2.1) + Math.cos(f * 3.7)) * 0.65;
        const oz = (Math.cos(f * 1.9) + Math.sin(f * 4.3)) * 0.65;
        flower.position.set(ox, 0, oz);

        const scale = 0.85 + Math.abs(Math.sin(f * 1.3)) * 0.5;
        flower.scale.set(scale, scale, scale);

        // Slender curved stem
        const stem = new THREE.Mesh(stemGeo, this.stemMat);
        stem.rotation.z = Math.sin(f * 1.5) * 0.14;
        stem.rotation.x = Math.cos(f * 2.2) * 0.14;
        flower.add(stem);

        // Blossom Head
        const blossom = new THREE.Group();
        blossom.position.set(0, 0.98, 0);

        if (variety.type === 'daisy') {
          // 10 radiating oval petals around golden honeycomb dome
          const petalCount = 10;
          for (let pt = 0; pt < petalCount; pt++) {
            const pAngle = (pt / petalCount) * Math.PI * 2;
            const petal = new THREE.Mesh(daisyPetalGeo, variety.petalMat);
            petal.position.set(Math.cos(pAngle) * 0.22, 0.02, Math.sin(pAngle) * 0.22);
            petal.rotation.y = -pAngle + Math.PI / 2;
            petal.rotation.x = 0.12;
            blossom.add(petal);
          }
          const center = new THREE.Mesh(centerDomeGeo, this.flowerCenterMat);
          center.position.y = 0.04;
          blossom.add(center);

        } else if (variety.type === 'poppy') {
          // 5 wide overlapping cupped petals + blackberry center
          const petalCount = 5;
          for (let pt = 0; pt < petalCount; pt++) {
            const pAngle = (pt / petalCount) * Math.PI * 2;
            const petal = new THREE.Mesh(poppyPetalGeo, variety.petalMat);
            petal.position.set(Math.cos(pAngle) * 0.18, 0.06, Math.sin(pAngle) * 0.18);
            petal.rotation.y = -pAngle + Math.PI / 2;
            petal.rotation.x = 0.45; // Cupped bowl
            blossom.add(petal);
          }
          const darkCenter = new THREE.Mesh(centerDomeGeo, this.poppyCenterMat);
          darkCenter.scale.setScalar(0.8);
          darkCenter.position.y = 0.06;
          blossom.add(darkCenter);

        } else if (variety.type === 'buttercup') {
          // 5 cupped golden petals + green calyx
          const calyx = new THREE.Mesh(calyxGeo, this.calyxMat);
          calyx.position.y = -0.04;
          blossom.add(calyx);

          const petalCount = 5;
          for (let pt = 0; pt < petalCount; pt++) {
            const pAngle = (pt / petalCount) * Math.PI * 2;
            const petal = new THREE.Mesh(buttercupPetalGeo, variety.petalMat);
            petal.position.set(Math.cos(pAngle) * 0.16, 0.05, Math.sin(pAngle) * 0.16);
            petal.rotation.y = -pAngle + Math.PI / 2;
            petal.rotation.x = 0.50; // Delicate cup
            blossom.add(petal);
          }
          const center = new THREE.Mesh(centerDomeGeo, this.flowerCenterMat);
          center.scale.setScalar(0.7);
          center.position.y = 0.04;
          blossom.add(center);

        } else if (variety.type === 'bluebell') {
          // 3 nodding bell florets drooping gracefully along stem
          for (let b = 0; b < 3; b++) {
            const bell = new THREE.Mesh(bellFluteGeo, variety.petalMat);
            bell.position.set(0.12 * (b % 2 === 0 ? 1 : -1), -b * 0.16, 0.1);
            bell.rotation.z = (b % 2 === 0 ? 0.35 : -0.35);
            bell.rotation.x = 0.4; // Drooping nod
            blossom.add(bell);
          }

        } else if (variety.type === 'heather') {
          // Tiered floral spire
          for (let h = 0; h < 4; h++) {
            const whorl = new THREE.Mesh(centerDomeGeo, variety.petalMat);
            whorl.position.y = h * 0.12 - 0.15;
            whorl.scale.set(0.9 - h * 0.15, 0.6, 0.9 - h * 0.15);
            blossom.add(whorl);
          }
        }

        blossom.rotation.y = Math.sin(f * 2.7) * Math.PI;
        flower.add(blossom);
        patchGroup.add(flower);
      }

      this.group.add(patchGroup);

      this.swayingElements.push({
        group: patchGroup,
        baseRotZ: 0,
        baseRotX: 0,
        freq: 2.2 + Math.sin(p) * 0.6,
        phase: p * 1.1,
        amplitude: 0.04
      });
    }
  }

  createGrassTufts() {
    const tuftCount = 140;

    // Sculpted curved blade ribbon geometry (tapering blade)
    const bladeGeo = new THREE.ConeGeometry(0.08, 1.35, 4);
    bladeGeo.scale(1.3, 1.0, 0.4); // Flat ribbon blade
    bladeGeo.translate(0, 0.67, 0);

    // Flowering Wheat / Foxtail seedhead plume
    const seedStemGeo = new THREE.CylinderGeometry(0.018, 0.025, 1.5, 4);
    seedStemGeo.translate(0, 0.75, 0);
    const plumeGeo = new THREE.SphereGeometry(0.07, 6, 5);
    plumeGeo.scale(0.8, 2.6, 0.8);
    plumeGeo.translate(0, 1.45, 0);

    for (let t = 0; t < tuftCount; t++) {
      const angle = (t / tuftCount) * Math.PI * 2 + (Math.sin(t * 3.3) * 0.14);
      // Scattered between shoreline and meadow slopes (r ≈ 40 to 75m)
      const dist = 40.5 + Math.abs(Math.cos(t * 2.7)) * 34.0;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;

      if (this.isNearPierClearway(tx, tz)) continue;

      const ty = getRollingHillHeight(tx, tz);
      const tuft = new THREE.Group();
      tuft.userData = { isGrassTuft: true };
      tuft.position.set(tx, ty - 0.02, tz);

      // Clump of 6-8 fanning arching blades
      const blades = 6 + Math.floor(Math.abs(Math.sin(t * 4.1)) * 3);
      for (let b = 0; b < blades; b++) {
        const blade = new THREE.Mesh(bladeGeo, this.grassMat);
        const bAngle = (b / blades) * Math.PI * 2 + (Math.sin(b * 1.7) * 0.2);
        const lean = 0.22 + (b * 0.04);
        blade.rotation.y = bAngle;
        blade.rotation.z = Math.sin(bAngle) * lean;
        blade.rotation.x = Math.cos(bAngle) * lean;

        const bScale = 0.8 + (Math.sin(b * 1.9) * 0.35);
        blade.scale.set(bScale, bScale * 1.15, bScale);
        blade.castShadow = true;
        tuft.add(blade);
      }

      // 1-2 Nodding wheat / foxtail seedhead plumes in the clump
      const plumes = 1 + (t % 2);
      for (let pm = 0; pm < plumes; pm++) {
        const seedHead = new THREE.Group();
        const stem = new THREE.Mesh(seedStemGeo, this.stemMat);
        const plume = new THREE.Mesh(plumeGeo, this.wheatSeedheadMat);
        seedHead.add(stem);
        seedHead.add(plume);

        const pmAngle = (pm * Math.PI) + (Math.sin(t) * 0.5);
        seedHead.rotation.y = pmAngle;
        seedHead.rotation.z = (Math.sin(t * 2.1) * 0.15) + 0.12;
        seedHead.rotation.x = (Math.cos(t * 1.7) * 0.12);
        tuft.add(seedHead);
      }

      this.group.add(tuft);
    }
  }


  createMossyBoulders() {
    const clusterCount = 42;
    const boulderGeo = new THREE.DodecahedronGeometry(1.5, 1);
    const mossCapGeo = new THREE.CylinderGeometry(1.3, 1.45, 0.26, 7);

    for (let c = 0; c < clusterCount; c++) {
      const angle = (c / clusterCount) * Math.PI * 2 + (Math.sin(c * 2.5) * 0.2);
      // Clustered along shoreline banks and lower hill contours (r ≈ 41 to 72m)
      const dist = 41.5 + Math.abs(Math.cos(c * 3.1)) * 30.0;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;

      if (this.isNearPierClearway(cx, cz)) continue;

      const cy = getRollingHillHeight(cx, cz);
      const cluster = new THREE.Group();
      cluster.userData = { isMossyBoulder: true };
      cluster.position.set(cx, cy - 0.15, cz);

      // Primary mossy boulder
      const mainMat = (c % 2 === 0) ? this.rockSandstoneMat : this.rockMat;
      const mainRock = new THREE.Mesh(boulderGeo, mainMat);
      const s = 1.2 + Math.abs(Math.sin(c * 1.9)) * 0.7;
      mainRock.scale.set(s * 1.1, s * 0.72, s * 1.0);
      mainRock.rotation.set(c * 0.5, c * 0.9, c * 0.3);
      mainRock.castShadow = true;
      mainRock.receiveShadow = true;
      cluster.add(mainRock);

      // Velvet moss cap on top
      const mossCap = new THREE.Mesh(mossCapGeo, this.mossMat);
      mossCap.position.set(0, s * 0.55, 0);
      mossCap.scale.set(s * 0.75, 1.0, s * 0.75);
      mossCap.rotation.y = c * 0.8;
      mossCap.receiveShadow = true;
      cluster.add(mossCap);

      // Secondary companion rock
      const subRock = new THREE.Mesh(boulderGeo, this.rockSandstoneMat);
      const subS = s * 0.52;
      subRock.scale.set(subS, subS * 0.65, subS);
      subRock.position.set(s * 0.85, -0.12, s * 0.3);
      subRock.rotation.set(c * 1.1, c * 0.4, 0);
      subRock.castShadow = true;
      subRock.receiveShadow = true;
      cluster.add(subRock);

      this.group.add(cluster);
    }
  }

  update(elapsedTime) {
    // Gentle natural wind swaying
    for (const elem of this.swayingElements) {
      const swayZ = Math.sin(elapsedTime * elem.freq + elem.phase) * elem.amplitude;
      const swayX = Math.cos(elapsedTime * (elem.freq * 0.85) + elem.phase) * (elem.amplitude * 0.7);

      elem.group.rotation.z = elem.baseRotZ + swayZ;
      elem.group.rotation.x = elem.baseRotX + swayX;
    }
  }

  applyBiomeColors(palette) {
    if (!palette) return;

    if (palette.leafDeep !== undefined) this.leafMatDeep.color.setHex(palette.leafDeep);
    if (palette.leafMid !== undefined) this.leafMatMid.color.setHex(palette.leafMid);
    if (palette.leafBright !== undefined) this.leafMatBright.color.setHex(palette.leafBright);
    if (palette.pine !== undefined) this.pineMat.color.setHex(palette.pine);
    if (palette.goldenCanopy !== undefined) this.goldenCanopyMat.color.setHex(palette.goldenCanopy);
    if (palette.willow !== undefined) this.willowMat.color.setHex(palette.willow);
    if (palette.trunk !== undefined) this.trunkMat.color.setHex(palette.trunk);
  }
}
