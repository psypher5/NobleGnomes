import * as THREE from 'three';
import { Gnome } from '../entities/Gnome.js';
import { sounds } from '../audio/SoundSynthesizer.js';

/**
 * Port Bramble Pier — Rustic wooden garden dock:
 * - Starting berth where Captain Bramble's tugboat begins its voyage
 * - Destination jetty where the player returns to safely offload rescued gnomes
 * - Animated gnomes on deck celebrating on arrival
 * - Luminous docking beacon ring and glowing brass lantern post
 */
export class Pier {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Center coordinates for pier placement (South bank jutting into water)
    this.anchorX = 0;
    this.anchorZ = 38.5; // Bank connection
    this.headZ = 30.5;   // Dock head in water
    this.deckY = 2.45;   // Elevated boardwalk deck height (tugboat sails directly underneath!)
    this.lowerDeckY = 0.35; // Lower berth floating dock landing height

    // Mooring berth coordinates (where boat spawns and docks)
    this.berthPosition = new THREE.Vector3(3.2, 0.1, 30.5);
    this.dockRadius = 5.2; // Trigger distance for drop-off

    this.dockedGnomes = [];
    this.isDropOffActive = false;
    this.compostParticles = [];
    this.flyingGlobules = [];

    this.createMaterials();
    this.createStructure();
    this.createMooringZone();
    this.createDecorations();

    this.scene.add(this.group);
  }


  createMaterials() {
    this.timberMat = new THREE.MeshStandardMaterial({
      color: 0x6e5239, // Weathered oak
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true
    });

    this.darkTimberMat = new THREE.MeshStandardMaterial({
      color: 0x4d3824, // Saturated wet piling wood
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true
    });

    this.ropeMat = new THREE.MeshStandardMaterial({
      color: 0xc4a476, // Hemp rope
      roughness: 0.85,
      flatShading: true
    });

    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4a359,
      roughness: 0.35,
      metalness: 0.82
    });

    this.lanternGlassMat = new THREE.MeshStandardMaterial({
      color: 0xffe899,
      emissive: 0xffa500,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    });
  }

  createStructure() {
    // 1. Elevated Pilings (spaced wide at X = +/- 1.95m for 3.9m boat navigation clearance!)
    const pilingGeo = new THREE.CylinderGeometry(0.18, 0.22, 4.4, 8);
    pilingGeo.translate(0, 0, 0);

    const pilingPositions = [
      // Bank pair (South)
      { x: -1.95, z: 38.0 }, { x: 1.95, z: 38.0 },
      // Mid-South pair
      { x: -1.95, z: 35.8 }, { x: 1.95, z: 35.8 },
      // Mid-North pair (leaves 3.6m open water archway between 32.2 and 35.8 to sail under east-west!)
      { x: -1.95, z: 32.2 }, { x: 1.95, z: 32.2 },
      // Pier head pair (North)
      { x: -1.95, z: 30.2 }, { x: 1.95, z: 30.2 }
    ];

    const crossBeamGeo = new THREE.BoxGeometry(4.2, 0.16, 0.22);
    pilingPositions.forEach((pos, idx) => {
      const piling = new THREE.Mesh(pilingGeo, this.darkTimberMat);
      piling.position.set(pos.x, 0.25, pos.z);
      piling.castShadow = true;
      piling.receiveShadow = true;
      this.group.add(piling);

      // Add high overhead cross beam every pair (Y = 2.35m overhead clearance)
      if (idx % 2 === 0) {
        const beam = new THREE.Mesh(crossBeamGeo, this.timberMat);
        beam.position.set(0, this.deckY - 0.10, pos.z);
        beam.castShadow = true;
        this.group.add(beam);
      }
    });

    // 2. Elevated Promenade Transverse Planks
    const plankGeo = new THREE.BoxGeometry(2.80, 0.08, 0.34);
    const plankTones = [
      new THREE.MeshStandardMaterial({ color: 0x75593e, roughness: 0.86, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x664c33, roughness: 0.88, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x826447, roughness: 0.84, flatShading: true })
    ];

    const plankCount = 26;
    const startZ = this.anchorZ;
    const endZ = this.headZ - 0.25;
    for (let i = 0; i < plankCount; i++) {
      const t = i / (plankCount - 1);
      const z = startZ + t * (endZ - startZ);
      const mat = plankTones[i % plankTones.length];

      const plank = new THREE.Mesh(plankGeo, mat);
      const rotY = (Math.sin(i * 3.1) * 0.015);
      const yOffset = (Math.cos(i * 2.7) * 0.008);
      plank.position.set(0, this.deckY + yOffset, z);
      plank.rotation.y = rotY;
      plank.castShadow = true;
      plank.receiveShadow = true;
      this.group.add(plank);
    }

    // 3. Elevated Handrails & Hemp Rope along boardwalk sides
    const stanchionGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.85, 6);
    stanchionGeo.translate(0, 0.42, 0);

    [-1.35, 1.35].forEach((sideX) => {
      for (let sz = 30.4; sz <= 38.2; sz += 1.3) {
        const stanchion = new THREE.Mesh(stanchionGeo, this.timberMat);
        stanchion.position.set(sideX, this.deckY, sz);
        stanchion.castShadow = true;
        this.group.add(stanchion);
      }

      // Top rope rail
      const railGeo = new THREE.CylinderGeometry(0.025, 0.025, 8.0, 6);
      railGeo.rotateX(Math.PI / 2);
      const rail = new THREE.Mesh(railGeo, this.ropeMat);
      rail.position.set(sideX, this.deckY + 0.78, 34.3);
      this.group.add(rail);
    });

    // 4. Pier Head Bollards on elevated boardwalk
    const bollardGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.48, 7);
    const ropeRingGeo = new THREE.TorusGeometry(0.24, 0.05, 6, 12);
    ropeRingGeo.rotateX(Math.PI / 2);

    [-1.0, 1.0].forEach(x => {
      const bollard = new THREE.Mesh(bollardGeo, this.timberMat);
      bollard.position.set(x, this.deckY + 0.24, this.headZ + 0.05);
      bollard.castShadow = true;
      this.group.add(bollard);

      const rope = new THREE.Mesh(ropeRingGeo, this.ropeMat);
      rope.position.set(x, this.deckY + 0.18, this.headZ + 0.05);
      this.group.add(rope);
    });

    // 5. Shore Ramp connecting elevated boardwalk down to grassy bank
    const rampLength = 2.6;
    const rampGeo = new THREE.BoxGeometry(2.9, 0.14, rampLength);
    const ramp = new THREE.Mesh(rampGeo, this.timberMat);
    // Slope from deckY=2.45 at Z=38.5 down to ground level on bank at Z=41.0
    ramp.position.set(0, this.deckY - 0.75, this.anchorZ + 1.25);
    ramp.rotation.x = 0.58; // Downward ramp angle
    ramp.receiveShadow = true;
    ramp.castShadow = true;
    this.group.add(ramp);

    // 6. Lower Berth Floating Dock Landing & Gangplank
    // Lower platform at Y = 0.35 where the boat docks and drops off scum
    const lowerDockGeo = new THREE.BoxGeometry(1.6, 0.16, 3.4);
    const lowerDock = new THREE.Mesh(lowerDockGeo, this.timberMat);
    lowerDock.position.set(2.2, this.lowerDeckY, this.headZ + 0.9);
    lowerDock.receiveShadow = true;
    lowerDock.castShadow = true;
    this.group.add(lowerDock);

    // Wooden stairs connecting elevated boardwalk down to lower landing
    const stepCount = 7;
    const stepGeo = new THREE.BoxGeometry(0.9, 0.10, 0.38);
    for (let s = 0; s < stepCount; s++) {
      const st = s / (stepCount - 1);
      const step = new THREE.Mesh(stepGeo, this.timberMat);
      step.position.set(1.75, this.deckY - st * (this.deckY - this.lowerDeckY), this.headZ + 0.2 + st * 1.8);
      step.castShadow = true;
      step.receiveShadow = true;
      this.group.add(step);
    }

    // Boarding Gangplank connecting Lower Dock Landing to Tugboat Berth
    const gangplankGroup = new THREE.Group();
    gangplankGroup.position.set(2.70, this.lowerDeckY + 0.05, this.headZ + 0.0);

    const gpGeo = new THREE.BoxGeometry(1.10, 0.06, 0.68);
    const gpMesh = new THREE.Mesh(gpGeo, this.timberMat);
    gpMesh.castShadow = true;
    gpMesh.receiveShadow = true;
    gangplankGroup.add(gpMesh);

    // Grip cleats
    const cleatGeo = new THREE.BoxGeometry(0.04, 0.025, 0.62);
    [-0.35, -0.12, 0.12, 0.35].forEach(cx => {
      const cleat = new THREE.Mesh(cleatGeo, this.darkTimberMat);
      cleat.position.set(cx, 0.035, 0);
      cleat.receiveShadow = true;
      gangplankGroup.add(cleat);
    });

    this.group.add(gangplankGroup);
  }

  createDecorations() {
    // 1. Rustic Lamppost at Pierhead
    const postGeo = new THREE.CylinderGeometry(0.08, 0.10, 2.2, 6);
    postGeo.translate(0, 1.1, 0);
    const post = new THREE.Mesh(postGeo, this.timberMat);
    post.position.set(-1.15, this.deckY, this.headZ + 0.2);
    post.castShadow = true;
    this.group.add(post);

    // Brass arm & Lantern
    const armGeo = new THREE.BoxGeometry(0.4, 0.06, 0.06);
    const arm = new THREE.Mesh(armGeo, this.brassMat);
    arm.position.set(-0.95, this.deckY + 2.05, this.headZ + 0.2);
    this.group.add(arm);

    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(-0.8, this.deckY + 1.85, this.headZ + 0.2);

    const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.28, 6), this.lanternGlassMat);
    lanternGroup.add(lanternGlass);

    const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 6), this.brassMat);
    lanternCap.position.y = 0.2;
    lanternGroup.add(lanternCap);

    // Warm golden point light
    this.lampLight = new THREE.PointLight(0xffb703, 14, 16, 1.8);
    this.lampLight.position.set(-0.8, this.deckY + 1.85, this.headZ + 0.2);
    this.group.add(this.lampLight);
    this.group.add(lanternGroup);

    // 2. Carved Signpost at Shore Ramp
    const signGroup = new THREE.Group();
    signGroup.position.set(1.65, this.deckY, this.anchorZ);

    const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 6), this.timberMat);
    signPole.position.y = 0.8;
    signPole.castShadow = true;
    signGroup.add(signPole);

    // Main sign board
    const boardGeo = new THREE.BoxGeometry(1.2, 0.35, 0.06);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x5e452e, roughness: 0.85, flatShading: true });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 1.35, 0);
    board.rotation.y = -0.25;
    board.castShadow = true;
    signGroup.add(board);

    // Decorative life ring hanging on sign pole
    const buoyRingGeo = new THREE.TorusGeometry(0.22, 0.06, 8, 16);
    const buoyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const buoy = new THREE.Mesh(buoyRingGeo, buoyMat);
    buoy.position.set(0, 0.85, 0.08);
    signGroup.add(buoy);

    this.group.add(signGroup);

    // 3. Wooden Crate & Terracotta Pot
    const crateGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const crate = new THREE.Mesh(crateGeo, this.timberMat);
    crate.position.set(0.85, this.deckY + 0.22, this.anchorZ - 1.2);
    crate.rotation.y = 0.3;
    crate.castShadow = true;
    this.group.add(crate);

    const potGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.28, 7);
    const potMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 }); // Terracotta
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(0.85, this.deckY + 0.58, this.anchorZ - 1.2);
    this.group.add(pot);
    // 4. Compost Vat / Algae Hopper (where player offloads collected scum)
    this.createCompostVat();
  }

  createCompostVat() {
    this.vatGroup = new THREE.Group();
    // Position on lower floating dock next to mooring berth
    this.vatGroup.position.set(1.60, this.lowerDeckY, this.headZ + 1.1);

    // Wooden vat tub
    const vatOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.48, 0.75, 14),
      this.timberMat
    );
    vatOuter.position.y = 0.38;
    vatOuter.castShadow = true;
    this.vatGroup.add(vatOuter);

    // Brass reinforcing bands
    [-0.18, 0.18].forEach(by => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.02, 6, 16), this.brassMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.38 + by;
      this.vatGroup.add(band);
    });

    // Funnel hopper chute extending out toward water
    const chuteGeo = new THREE.ConeGeometry(0.35, 0.38, 8, 1, true);
    chuteGeo.rotateZ(-0.4);
    const chute = new THREE.Mesh(chuteGeo, this.brassMat);
    chute.position.set(0.35, 0.72, -0.15);
    this.vatGroup.add(chute);

    // Internal organic compost sludge level (scales up Y as scum is deposited)
    this.sludgeMat = new THREE.MeshStandardMaterial({
      color: 0x38b000,
      emissive: 0x134604,
      emissiveIntensity: 0.65,
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.94
    });

    const sludgeGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.65, 12);
    sludgeGeo.translate(0, 0.325, 0); // Scale up from bottom
    this.compostSludgeMesh = new THREE.Mesh(sludgeGeo, this.sludgeMat);
    this.compostSludgeMesh.position.y = 0.08;
    this.compostSludgeMesh.scale.set(1, 0.08, 1);
    this.vatGroup.add(this.compostSludgeMesh);

    // Cute carved wooden compost sign
    const vSignGeo = new THREE.BoxGeometry(0.55, 0.22, 0.04);
    const vSignMat = new THREE.MeshStandardMaterial({ color: 0x4d3824, roughness: 0.8 });
    const vSign = new THREE.Mesh(vSignGeo, vSignMat);
    vSign.position.set(-0.52, 0.52, 0);
    vSign.rotation.y = Math.PI / 2;
    this.vatGroup.add(vSign);

    this.group.add(this.vatGroup);
  }

  createMooringZone() {
    // 1. Primary mooring beacon ring at east berth
    const ringGeo = new THREE.RingGeometry(2.8, 3.2, 32);
    ringGeo.rotateX(-Math.PI / 2);

    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });

    this.mooringRing = new THREE.Mesh(ringGeo, this.ringMat);
    this.mooringRing.position.copy(this.berthPosition);
    this.mooringRing.position.y = 0.06;
    this.group.add(this.mooringRing);

    // Inner pulsating drop-off glyph
    const innerRingGeo = new THREE.RingGeometry(0.7, 0.9, 24);
    innerRingGeo.rotateX(-Math.PI / 2);
    this.innerRing = new THREE.Mesh(innerRingGeo, this.ringMat);
    this.innerRing.position.copy(this.berthPosition);
    this.innerRing.position.y = 0.07;
    this.group.add(this.innerRing);

    // 2. Compost Vat Chute Mooring Beacon (directly in front of vat funnel on the water)
    const vatRingGeo = new THREE.RingGeometry(1.4, 1.7, 24);
    vatRingGeo.rotateX(-Math.PI / 2);
    this.vatRingMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    this.vatMooringRing = new THREE.Mesh(vatRingGeo, this.vatRingMat);
    this.vatMooringRing.position.set(2.6, 0.06, this.headZ + 1.1);
    this.group.add(this.vatMooringRing);
  }

  checkDropOffProximity(boatPos) {
    if (!boatPos) return false;
    // 1. Distance to East mooring berth
    const distToBerth = boatPos.distanceTo(this.berthPosition);
    if (distToBerth < 8.5) return true;

    // 2. Distance to Compost Vat funnel
    const distToVat = Math.hypot(boatPos.x - 1.60, boatPos.z - (this.headZ + 1.1));
    if (distToVat < 7.8) return true;

    // 3. Distance to pier canal centerline segment (covers under pier, west side & pier head from Z: 28.5 to 41.0)
    const clampedZ = Math.max(this.headZ - 1.5, Math.min(this.anchorZ + 2.0, boatPos.z));
    const distToPier = Math.hypot(boatPos.x - this.anchorX, boatPos.z - clampedZ);
    return distToPier < 7.5;
  }

  depositFromBoat(amount, boatPos) {
    if (amount <= 0) return 0;
    this.depositedScum = (this.depositedScum || 0) + amount;
    this.targetCompostScale = Math.min(1.0, 0.08 + (this.depositedScum / 22) * 0.92);

    sounds.playWaterCleanse();

    // Spawn flying arc globules from boat into vat chute
    const vatTarget = new THREE.Vector3(1.60, this.lowerDeckY + 0.72, this.headZ + 1.1);
    const origin = boatPos ? boatPos.clone() : new THREE.Vector3(3.2, 0.5, 30.5);
    origin.y += 0.4;

    const globCount = Math.min(10, Math.max(3, amount));
    const globGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const globMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      emissive: 0x22c55e,
      emissiveIntensity: 1.1,
      roughness: 0.15
    });

    for (let i = 0; i < globCount; i++) {
      const mesh = new THREE.Mesh(globGeo, globMat);
      mesh.position.copy(origin);
      this.scene.add(mesh);

      this.flyingGlobules.push({
        mesh,
        startPos: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.3, (Math.random() - 0.5) * 0.5)),
        targetPos: vatTarget.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2)),
        progress: -i * 0.09, // Staggered stream
        speed: 2.4 + Math.random() * 0.5,
        arcHeight: 1.8 + Math.random() * 0.6
      });
    }

    this.spawnCompostParticles(amount * 2);
    return amount;
  }

  depositScum(amount) {
    return this.depositFromBoat(amount, null);
  }

  spawnCompostParticles(count = 8) {
    const geo = new THREE.SphereGeometry(0.14, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < Math.min(22, count * 3); i++) {
      const p = new THREE.Mesh(geo, mat);
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.45;
      p.position.set(
        1.60 + Math.cos(angle) * r,
        this.lowerDeckY + 0.75,
        this.headZ + 1.1 + Math.sin(angle) * r
      );

      p.userData = {
        vy: 1.4 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.5,
        vz: (Math.random() - 0.5) * 0.5,
        life: 0,
        maxLife: 0.85 + Math.random() * 0.4
      };

      this.scene.add(p);
      this.compostParticles.push(p);
    }
  }


  offloadGnomeCrew(rescuedGnomesData) {
    if (!rescuedGnomesData || rescuedGnomesData.length === 0) return [];

    const newArrivals = [];
    const plankSpacing = 1.35;

    rescuedGnomesData.forEach((data, idx) => {
      // Check if already docked
      if (this.dockedGnomes.some(dg => dg.name === data.name)) return;

      const gnome = new Gnome(data);
      // Place gnomes along center of pier deck facing toward water
      // Plank top surface sits at this.deckY + 0.04
      const gx = (idx % 2 === 0 ? -0.45 : 0.45);
      const gz = this.headZ + 1.6 + idx * plankSpacing;
      const baseY = this.deckY + 0.04;
      gnome.group.position.set(gx, baseY, gz);
      gnome.group.rotation.y = Math.PI; // Face north toward the water/tugboat

      this.group.add(gnome.group);
      this.dockedGnomes.push({
        data,
        name: data.name,
        gnome,
        isMarching: false,
        baseX: gx,
        baseY: baseY,
        baseZ: gz,
        hopPhase: idx * 1.57
      });
      newArrivals.push(data);
    });

    return newArrivals;
  }

  startCinematicDisembark(rescuedGnomesData) {
    if (!rescuedGnomesData || rescuedGnomesData.length === 0) return;

    // Clear any existing docked gnomes to avoid duplicates
    for (const dg of this.dockedGnomes) {
      if (dg.gnome && typeof dg.gnome.dispose === 'function') {
        dg.gnome.dispose();
      } else if (dg.gnome && dg.gnome.group) {
        this.group.remove(dg.gnome.group);
      }
    }
    this.dockedGnomes = [];

    const plankSpacing = 1.35;
    rescuedGnomesData.forEach((data, idx) => {
      const gnome = new Gnome(data);
      const startPos = new THREE.Vector3(2.8, 0.40, 30.5 - idx * 0.7);
      gnome.group.position.copy(startPos);
      gnome.group.visible = false;
      this.group.add(gnome.group);

      const finalX = (idx % 2 === 0 ? -0.45 : 0.45);
      const finalZ = this.headZ + 1.6 + idx * plankSpacing;
      const finalY = this.deckY + 0.04;

      const waypoints = [
        new THREE.Vector3(2.8, 0.40, 30.5),                    // Gangplank edge from boat
        new THREE.Vector3(2.2, this.lowerDeckY + 0.04, 31.4),  // Lower landing dock
        new THREE.Vector3(1.75, this.lowerDeckY + 0.04, 32.2), // Base of stairs
        new THREE.Vector3(1.75, 1.40, 31.3),                   // Mid stairs
        new THREE.Vector3(1.75, this.deckY + 0.04, 30.5),      // Top of stairs
        new THREE.Vector3(0.0, this.deckY + 0.04, 31.5),       // Elevated promenade
        new THREE.Vector3(finalX, finalY, finalZ)              // Destination spot
      ];

      this.dockedGnomes.push({
        data,
        name: data.name,
        gnome,
        isMarching: true,
        progress: -idx * 0.16, // Staggered march
        marchSpeed: 0.34,
        waypoints,
        baseX: finalX,
        baseY: finalY,
        baseZ: finalZ,
        hopPhase: idx * 1.57
      });
    });
  }

  finishCinematicDisembark() {
    for (const dg of this.dockedGnomes) {
      dg.isMarching = false;
      dg.progress = 1.0;
      dg.gnome.group.visible = true;
      dg.gnome.group.position.set(dg.baseX, dg.baseY, dg.baseZ);
      dg.gnome.group.rotation.set(0, Math.PI, 0);
    }
  }

  resetLevel() {
    // 1. Remove all celebrating gnomes from pier deck and dispose resources
    for (const dg of this.dockedGnomes) {
      if (dg.gnome && typeof dg.gnome.dispose === 'function') {
        dg.gnome.dispose();
      } else if (dg.gnome && dg.gnome.group) {
        this.group.remove(dg.gnome.group);
      }
    }
    this.dockedGnomes = [];

    // 2. Reset compost vat
    this.depositedScum = 0;
    this.targetCompostScale = 0.08;
    if (this.compostSludgeMesh) {
      this.compostSludgeMesh.scale.set(1, 0.08, 1);
    }

    // 3. Clear lingering particles & flying globules
    if (this.compostParticles) {
      for (const p of this.compostParticles) {
        this.scene.remove(p);
        if (p.geometry) p.geometry.dispose();
        if (p.material) p.material.dispose();
      }
      this.compostParticles = [];
    }

    if (this.flyingGlobules) {
      for (const g of this.flyingGlobules) {
        this.scene.remove(g.mesh);
        if (g.mesh.geometry) g.mesh.geometry.dispose();
        if (g.mesh.material) g.mesh.material.dispose();
      }
      this.flyingGlobules = [];
    }
  }

  update(dt, time, boatPos, rescuedCount, boatScumCargo = 0) {
    // 1. Lamp flickering warmth
    if (this.lampLight) {
      this.lampLight.intensity = 13.5 + Math.sin(time * 8.0) * 1.2 + Math.cos(time * 19.0) * 0.6;
    }

    // 2. Mooring ring beacon animation
    const hasCargoToDrop = (rescuedCount > 0 || boatScumCargo > 0);
    if (this.mooringRing && this.innerRing) {
      const targetOpacity = hasCargoToDrop ? 0.85 : 0.35;
      this.ringMat.opacity = targetOpacity + Math.sin(time * 3.5) * 0.2;

      const scale = 1.0 + Math.sin(time * 2.0) * 0.08;
      this.mooringRing.scale.set(scale, 1, scale);
      this.innerRing.scale.set(1.0 + Math.sin(time * 4.0) * 0.15, 1, 1.0 + Math.sin(time * 4.0) * 0.15);

      // Color shift to bright emerald gold when gnomes or scum ready to unload
      if (hasCargoToDrop) {
        this.ringMat.color.setHex(0x34d399); // Inviting mint emerald
      } else {
        this.ringMat.color.setHex(0xfacc15); // Golden amber
      }
    }

    // 2b. Compost Vat chute beacon ring
    if (this.vatMooringRing && this.vatRingMat) {
      const vatScale = 1.0 + Math.sin(time * 4.5) * 0.14;
      this.vatMooringRing.scale.set(vatScale, 1, vatScale);
      this.vatRingMat.opacity = (boatScumCargo > 0 ? 0.85 : 0.45) + Math.sin(time * 4.0) * 0.2;
    }

    // 3. Smoothly animate compost sludge rising in the vat
    if (this.compostSludgeMesh && typeof this.targetCompostScale === 'number') {
      this.compostSludgeMesh.scale.y = THREE.MathUtils.lerp(
        this.compostSludgeMesh.scale.y,
        this.targetCompostScale,
        dt * 4.0
      );
    }

    // 4. Update flying scum globules arcing from boat into vat
    if (this.flyingGlobules && this.flyingGlobules.length > 0) {
      for (let i = this.flyingGlobules.length - 1; i >= 0; i--) {
        const glob = this.flyingGlobules[i];
        glob.progress += glob.speed * dt;

        if (glob.progress <= 0) {
          glob.mesh.visible = false;
          continue;
        }
        glob.mesh.visible = true;

        const t = Math.min(1.0, glob.progress);
        const arc = Math.sin(t * Math.PI) * glob.arcHeight;

        glob.mesh.position.x = THREE.MathUtils.lerp(glob.startPos.x, glob.targetPos.x, t);
        glob.mesh.position.y = THREE.MathUtils.lerp(glob.startPos.y, glob.targetPos.y, t) + arc;
        glob.mesh.position.z = THREE.MathUtils.lerp(glob.startPos.z, glob.targetPos.z, t);

        const s = (1.0 - t * 0.4);
        glob.mesh.scale.setScalar(s);

        if (t >= 1.0) {
          // Splashed into vat!
          this.scene.remove(glob.mesh);
          if (glob.mesh.geometry) glob.mesh.geometry.dispose();
          if (glob.mesh.material) glob.mesh.material.dispose();
          this.flyingGlobules.splice(i, 1);
        }
      }
    }

    // 5. Update compost sparkle particles
    if (this.compostParticles) {
      for (let i = this.compostParticles.length - 1; i >= 0; i--) {
        const p = this.compostParticles[i];
        p.userData.life += dt;
        p.position.x += p.userData.vx * dt;
        p.position.y += p.userData.vy * dt;
        p.position.z += p.userData.vz * dt;
        p.scale.setScalar(1.0 - (p.userData.life / p.userData.maxLife) * 0.7);

        if (p.userData.life >= p.userData.maxLife) {
          this.scene.remove(p);
          if (p.geometry) p.geometry.dispose();
          if (p.material) p.material.dispose();
          this.compostParticles.splice(i, 1);
        }
      }
    }

    // 6. Animate docked gnomes: marching up steps or celebrating on deck
    for (const dg of this.dockedGnomes) {
      if (dg.isMarching) {
        dg.progress += dg.marchSpeed * dt;
        if (dg.progress <= 0) {
          dg.gnome.group.visible = false;
          continue;
        }
        dg.gnome.group.visible = true;

        if (dg.progress >= 1.0) {
          dg.isMarching = false;
          dg.gnome.group.position.set(dg.baseX, dg.baseY, dg.baseZ);
          dg.gnome.group.rotation.set(0, Math.PI, 0);
        } else {
          // Spline walk along waypoints
          const pts = dg.waypoints;
          const totalSegments = pts.length - 1;
          const segmentProgress = dg.progress * totalSegments;
          const segIdx = Math.min(totalSegments - 1, Math.floor(segmentProgress));
          const subT = segmentProgress - segIdx;

          const p0 = pts[segIdx];
          const p1 = pts[segIdx + 1];

          // Linear interpolation between waypoints with hop bounce
          const curX = THREE.MathUtils.lerp(p0.x, p1.x, subT);
          const curY = THREE.MathUtils.lerp(p0.y, p1.y, subT);
          const curZ = THREE.MathUtils.lerp(p0.z, p1.z, subT);

          dg.gnome.group.position.set(curX, curY, curZ);

          // Face direction of travel
          const dx = p1.x - p0.x;
          const dz = p1.z - p0.z;
          if (Math.hypot(dx, dz) > 0.01) {
            dg.gnome.group.rotation.y = Math.atan2(dx, dz);
          }

          dg.gnome.animateTrot(time, 1.4);
        }
      } else {
        dg.gnome.animatePierBumble(time, dg.baseX, dg.baseY, dg.baseZ, dg.hopPhase);
      }
    }
  }
}

