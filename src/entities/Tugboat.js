import * as THREE from 'three';
import { Bell } from './Bell.js';
import { Gnome } from './Gnome.js';
import { sounds } from '../audio/SoundSynthesizer.js';
import { getWaterSurfaceHeight } from '../environment/PondWater.js';

let steamGeoCache = null;

function getSteamGeometries() {
  if (!steamGeoCache) {
    steamGeoCache = {
      main: new THREE.SphereGeometry(0.24, 8, 6),
      sub1: new THREE.SphereGeometry(0.16, 7, 5),
      sub2: new THREE.SphereGeometry(0.14, 7, 5),
      sub3: new THREE.SphereGeometry(0.12, 6, 4)
    };
  }
  return steamGeoCache;
}

function createSteamPuffMesh(isMurky = false) {
  const geos = getSteamGeometries();
  const group = new THREE.Group();

  // High-tactile volumetric steam with soft ambient shading and warm sun catching
  // If boat engine is fouled by algae, steam is murky olive/soot green
  const mat = new THREE.MeshStandardMaterial({
    color: isMurky ? 0x688252 : 0xffffff,
    emissive: isMurky ? 0x273618 : 0xffffff,
    emissiveIntensity: isMurky ? 0.28 : 0.42,
    roughness: 0.35,
    metalness: 0.0,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    flatShading: false
  });

  const m0 = new THREE.Mesh(geos.main, mat);
  group.add(m0);

  const m1 = new THREE.Mesh(geos.sub1, mat);
  m1.position.set(0.10, 0.05, 0.07);
  group.add(m1);

  const m2 = new THREE.Mesh(geos.sub2, mat);
  m2.position.set(-0.09, -0.03, -0.06);
  group.add(m2);

  const m3 = new THREE.Mesh(geos.sub3, mat);
  m3.position.set(-0.02, 0.09, 0.05);
  group.add(m3);

  group.userData = { material: mat };
  return group;
}

/**
 * Toy Tugboat with high-fidelity wooden details:
 * - Rubber tire bumpers, lifebuoys, brass lantern, coiled rope, and spoked ship's wheel
 * - Volumetric-style soft puffy chimney smoke particles with curl expansion
 * - Responsive steering, water buoyancy, and prop churn
 */
export class Tugboat {
  constructor() {
    this.group = new THREE.Group();

    // Physics & Movement state
    // Spawns docked alongside Port Bramble Pier (South bank, pointed North into open pond)
    this.position = this.group.position;
    this.position.set(3.2, 0.1, 30.5);

    this.heading = Math.PI;  // Radians (Math.PI = facing North toward center of pond)
    this.speed = 0;          // Current forward/backward velocity
    this.rudderAngle = 0;    // Visual steering angle

    this.maxSpeed = 8.8;
    this.maxReverseSpeed = -3.8;
    this.acceleration = 6.2;
    this.deceleration = 3.6;
    this.turnSpeed = 2.4;

    // Crew management - Rescued gnomes sit side-by-side on the aft stern bench!
    this.crewMembers = [];
    this.crewSlots = [
      { pos: new THREE.Vector3(-0.38, 0.48, -1.40), yaw: Math.PI - 0.20, taken: false },  // Port aft bench
      { pos: new THREE.Vector3(0.0, 0.48, -1.48),   yaw: Math.PI,        taken: false },  // Center aft bench
      { pos: new THREE.Vector3(0.38, 0.48, -1.40),  yaw: Math.PI + 0.20, taken: false }   // Starboard aft bench
    ];

    // Visual effect states
    this.foamTimer = 0;
    this.smokeTimer = 0;
    this.whistleTimer = 0;
    this.foamParticles = [];
    this.smokeParticles = [];

    // Algae Fouling & Cleaning State
    this.algaeLevel = 0.0; // 0.0 = clean, 1.0 = heavily fouled
    this.algaePatches = [];
    this.slimeDripTimer = 0;
    this.slimeDripParticles = [];
    this.cleanWaterParticles = [];
    this.isCleaning = false;
    this.cleanTimer = 0;

    // Hull Integrity & Capsizing State
    this.maxHealth = 100;
    this.health = 100;
    this.isCapsized = false;
    this.capsizeProgress = 0; // 0.0 to 1.0
    this.onCapsizedCallback = null;

    // Algae Scum Cargo Hold (transport collected scum back to pier compost vat)
    this.scumCargo = 0;
    this.maxScumCargo = 30;

    this.createModel();
  }

  createModel() {
    // Parent group for all boat parts (hull, deck, cabin, crew) to pitch & roll synchronously
    this.boatVisuals = new THREE.Group();
    this.group.add(this.boatVisuals);

    // 1. Hull (toy wooden boat with rounded bow)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, 2.0); // Bow tip
    hullShape.bezierCurveTo(1.1, 1.4, 1.2, 0.2, 1.1, -1.4); // Right side
    hullShape.bezierCurveTo(1.0, -1.9, 0.6, -2.1, 0, -2.1); // Transom right
    hullShape.bezierCurveTo(-0.6, -2.1, -1.0, -1.9, -1.1, -1.4); // Transom left
    hullShape.bezierCurveTo(-1.2, 0.2, -1.1, 1.4, 0, 2.0); // Left side

    const extrudeSettings = {
      depth: 0.8,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 2,
      bevelSize: 0.12,
      bevelThickness: 0.12
    };

    const hullGeo = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
    hullGeo.rotateX(Math.PI / 2);

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xc13a28, // Bright toy fire-engine red hull
      roughness: 0.42,
      metalness: 0.12,
      flatShading: true
    });

    this.hullMesh = new THREE.Mesh(hullGeo, hullMat);
    this.hullMesh.position.y = 0.4;
    this.hullMesh.castShadow = true;
    this.hullMesh.receiveShadow = true;
    this.boatVisuals.add(this.hullMesh);

    // Dark stained mahogany gunwale rubbing strake
    const strakeMat = new THREE.MeshStandardMaterial({ color: 0x3d2013, roughness: 0.7, flatShading: true });
    const strakeGeo = new THREE.TorusGeometry(1.4, 0.08, 6, 24);
    strakeGeo.rotateX(Math.PI / 2);
    strakeGeo.scale(0.85, 1.0, 1.45);
    const gunwaleStrake = new THREE.Mesh(strakeGeo, strakeMat);
    gunwaleStrake.position.set(0, 0.44, -0.05);
    this.boatVisuals.add(gunwaleStrake);

    // 2. Wooden deck planking with warm trim
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0xdfb479,
      roughness: 0.65,
      flatShading: true
    });
    const deckPlate = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 3.1), deckMat);
    deckPlate.position.set(0, 0.38, -0.05);
    this.boatVisuals.add(deckPlate);

    // Plank groove lines on deck
    const grooveMat = new THREE.MeshBasicMaterial({ color: 0xaa834f });
    for (let g = -0.6; g <= 0.6; g += 0.3) {
      const plankLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 2.95), grooveMat);
      plankLine.position.set(g, 0.385, -0.05);
      this.boatVisuals.add(plankLine);
    }

    // 3. Toy Tugboat Walk-Through Wheelhouse (Open Rear Archway into Aft Deck)
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1de,
      roughness: 0.55,
      flatShading: false
    });
    const woodTrimMat = new THREE.MeshStandardMaterial({ color: 0x6e4e37, roughness: 0.65 });

    // Front Bulkhead with window framing
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.92, 0.10), cabinMat);
    frontWall.position.set(0, 0.95, 0.85);
    frontWall.castShadow = true;
    this.boatVisuals.add(frontWall);

    // Port and Starboard Side Walls with porthole cutouts
    const sideWallGeo = new THREE.BoxGeometry(0.10, 0.92, 1.30);
    const wallLeft = new THREE.Mesh(sideWallGeo, cabinMat);
    wallLeft.position.set(-0.55, 0.95, 0.25);
    wallLeft.castShadow = true;
    this.boatVisuals.add(wallLeft);

    const wallRight = new THREE.Mesh(sideWallGeo, cabinMat);
    wallRight.position.set(0.55, 0.95, 0.25);
    wallRight.castShadow = true;
    this.boatVisuals.add(wallRight);

    // Rear Archway Framing (pillars + lintel leaving a 0.64m wide walk-through doorway)
    const rearPillarGeo = new THREE.BoxGeometry(0.28, 0.92, 0.10);
    const pillarL = new THREE.Mesh(rearPillarGeo, cabinMat);
    pillarL.position.set(-0.46, 0.95, -0.35);
    pillarL.castShadow = true;
    this.boatVisuals.add(pillarL);

    const pillarR = new THREE.Mesh(rearPillarGeo, cabinMat);
    pillarR.position.set(0.46, 0.95, -0.35);
    pillarR.castShadow = true;
    this.boatVisuals.add(pillarR);

    // Archway top lintel
    const archLintel = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.24, 0.10), cabinMat);
    archLintel.position.set(0, 1.29, -0.35);
    archLintel.castShadow = true;
    this.boatVisuals.add(archLintel);

    // Decorative mahogany archway doorway trim
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.12), woodTrimMat);
    doorFrame.position.set(0, 1.18, -0.35);
    this.boatVisuals.add(doorFrame);

    // Cabin Roof (green trim with roof overhang)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.4 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.12, 1.55), roofMat);
    roof.position.set(0, 1.45, 0.25);
    roof.castShadow = true;
    this.boatVisuals.add(roof);

    // Portholes
    const portholeMat = new THREE.MeshStandardMaterial({ color: 0xf5b738, roughness: 0.25, metalness: 0.85 });
    const portGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16);
    portGeo.rotateZ(Math.PI / 2);

    const portLeft = new THREE.Mesh(portGeo, portholeMat);
    portLeft.position.set(-0.55, 1.0, 0.35);
    this.boatVisuals.add(portLeft);

    const portRight = new THREE.Mesh(portGeo, portholeMat);
    portRight.position.set(0.55, 1.0, 0.35);
    this.boatVisuals.add(portRight);

    // Front windshield window
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.42, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x5fa8d3, roughness: 0.15, metalness: 0.8 })
    );
    windshield.position.set(0, 1.06, 0.91);
    this.boatVisuals.add(windshield);

    // Spoked Wooden Ship's Wheel (mounted at the helm inside the wheelhouse)
    this.shipWheel = new THREE.Group();
    this.shipWheel.position.set(0, 0.92, 0.76);

    const rimMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.6 });
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 16), rimMat);
    this.shipWheel.add(wheelRim);

    const spokeMat = new THREE.MeshStandardMaterial({ color: 0xdfb479, roughness: 0.4 });
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 6), spokeMat);
      spoke.rotation.z = (s / 4) * Math.PI;
      this.shipWheel.add(spoke);
    }
    this.boatVisuals.add(this.shipWheel);

    // Rustic Teak Crew Bench across the Aft Deck (Z = -1.35 to -1.55)
    // Provides cozy seating for the rescued gnome crew looking out at the wake
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x7a5035, roughness: 0.72, flatShading: false });
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.38), benchMat);
    benchSeat.position.set(0, 0.44, -1.45);
    benchSeat.castShadow = true;
    benchSeat.receiveShadow = true;
    this.boatVisuals.add(benchSeat);

    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.24, 0.05), benchMat);
    benchBack.position.set(0, 0.58, -1.63);
    benchBack.castShadow = true;
    this.boatVisuals.add(benchBack);

    // Bench side supports
    [-0.52, 0.52].forEach(bx => {
      const bLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.34), benchMat);
      bLeg.position.set(bx, 0.36, -1.45);
      this.boatVisuals.add(bLeg);
    });

    // 4. Smokestack / Chimney with Brass Bands
    const stackMat = new THREE.MeshStandardMaterial({
      color: 0x264653,
      roughness: 0.6,
      metalness: 0.3
    });
    const smokestack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 10), stackMat);
    smokestack.position.set(0, 1.85, -0.15);
    smokestack.castShadow = true;
    this.boatVisuals.add(smokestack);

    // Brass accent bands on smokestack
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf5b738, roughness: 0.3, metalness: 0.85 });
    const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.025, 6, 12), brassMat);
    band1.rotation.x = Math.PI / 2;
    band1.position.set(0, 1.68, -0.15);
    this.boatVisuals.add(band1);

    const stackRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.04, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0xe76f51, roughness: 0.4 })
    );
    stackRim.rotation.x = Math.PI / 2;
    stackRim.position.set(0, 2.27, -0.15);
    this.boatVisuals.add(stackRim);
    this.chimneyTip = new THREE.Vector3(0, 2.32, -0.15);

    // 5. Steam Whistle on cabin roof
    const whistleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), brassMat);
    whistleBase.position.set(0.35, 1.68, 0.1);
    this.boatVisuals.add(whistleBase);
    this.whistleTip = new THREE.Vector3(0.35, 1.85, 0.1);

    // 6. Foredeck Bell Mount
    this.bell = new Bell();
    this.bell.group.position.set(0, 0.5, 1.15);
    this.boatVisuals.add(this.bell.group);

    // 7. Engine Order Telegraph (beside helm wheel)
    const telegraphGroup = new THREE.Group();
    telegraphGroup.position.set(0.38, 0.72, 0.68);
    const telePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.44, 8), brassMat);
    telePedestal.position.y = 0.22;
    telegraphGroup.add(telePedestal);

    const teleHead = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), brassMat);
    teleHead.rotation.x = Math.PI / 2;
    teleHead.position.y = 0.44;
    telegraphGroup.add(teleHead);

    const teleDial = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    teleDial.position.set(0, 0.44, -0.032);
    teleDial.rotation.y = Math.PI;
    telegraphGroup.add(teleDial);

    const teleLever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), brassMat);
    teleLever.position.set(0, 0.50, 0);
    teleLever.rotation.z = 0.35;
    telegraphGroup.add(teleLever);
    this.boatVisuals.add(telegraphGroup);

    // Port (Red) and Starboard (Green) Navigation Running Lights
    const lightHousingMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6 });
    const portLightGroup = new THREE.Group();
    portLightGroup.position.set(-0.62, 1.35, 0.35);
    const portHousing = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.16, 0.12), lightHousingMat);
    portLightGroup.add(portHousing);
    const redLensMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.9, roughness: 0.2 });
    const portLens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), redLensMat);
    portLens.rotation.z = Math.PI / 2;
    portLens.position.x = -0.04;
    portLightGroup.add(portLens);
    this.boatVisuals.add(portLightGroup);

    const stbdLightGroup = new THREE.Group();
    stbdLightGroup.position.set(0.62, 1.35, 0.35);
    const stbdHousing = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.16, 0.12), lightHousingMat);
    stbdLightGroup.add(stbdHousing);
    const greenLensMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.9, roughness: 0.2 });
    const stbdLens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), greenLensMat);
    stbdLens.rotation.z = Math.PI / 2;
    stbdLens.position.x = 0.04;
    stbdLightGroup.add(stbdLens);
    this.boatVisuals.add(stbdLightGroup);

    // Copper boiler steam pipe & round brass steam pressure gauge
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.75, roughness: 0.35 });
    const steamPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), copperMat);
    steamPipe.position.set(-0.25, 1.65, 0.12);
    this.boatVisuals.add(steamPipe);

    const gaugeGroup = new THREE.Group();
    gaugeGroup.position.set(0, 1.85, 0.08);
    const gaugeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), brassMat);
    gaugeBody.rotation.x = Math.PI / 2;
    gaugeGroup.add(gaugeBody);
    const gaugeFace = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.4 }));
    gaugeFace.position.z = 0.022;
    gaugeGroup.add(gaugeFace);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.005), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    needle.position.set(0, 0.02, 0.025);
    gaugeGroup.add(needle);
    this.boatVisuals.add(gaugeGroup);

    // Cozy wooden captain's stool behind the helm
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x7c492b, roughness: 0.75 });
    const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12), stoolMat);
    stoolSeat.position.set(0, 0.38, 0.05);
    this.boatVisuals.add(stoolSeat);
    for (let leg = 0; leg < 3; leg++) {
      const legAngle = (leg / 3) * Math.PI * 2;
      const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6), stoolMat);
      sLeg.position.set(Math.cos(legAngle) * 0.12, 0.24, 0.05 + Math.sin(legAngle) * 0.12);
      this.boatVisuals.add(sLeg);
    }

    // 8. Captain Gnome Bramble (at the wheel inside the wheelhouse)
    this.captain = new Gnome({ name: 'Bramble', role: 'Captain', isCaptain: true });
    this.isBoarding = false; // Standing at the helm inside wheelhouse!
    this.captain.group.scale.setScalar(0.85);
    this.captain.group.position.set(0, 0.40, 0.42);
    this.captain.group.rotation.set(0, 0, 0);
    if (this.captain.armPivot) this.captain.armPivot.rotation.set(-0.9, -0.2, 0.1);
    if (this.captain.leftArmPivot) this.captain.leftArmPivot.rotation.set(-0.9, 0.2, -0.1);
    this.boatVisuals.add(this.captain.group);

    // 8. Rubber Tire Bumpers along gunwales
    const tireGeo = new THREE.TorusGeometry(0.22, 0.08, 6, 12);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, roughness: 0.85 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc4a47c, roughness: 0.9 });
    const ropeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);

    const tirePositions = [
      { x: -1.05, z: 0.65, rotY: 0 },
      { x: -1.05, z: -0.65, rotY: 0 },
      { x: 1.05, z: 0.65, rotY: Math.PI },
      { x: 1.05, z: -0.65, rotY: Math.PI }
    ];

    tirePositions.forEach(tp => {
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.position.set(tp.x, 0.35, tp.z);
      tire.rotation.y = Math.PI / 2;
      this.boatVisuals.add(tire);

      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.position.set(tp.x, 0.50, tp.z);
      this.boatVisuals.add(rope);
    });

    // 9. Red & White Lifebuoys on Cabin Sides
    const buoyGeo = new THREE.TorusGeometry(0.24, 0.07, 8, 16);
    const buoyWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const buoyRedMat = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.4 });

    [-0.64, 0.64].forEach(bx => {
      const buoy = new THREE.Mesh(buoyGeo, buoyWhiteMat);
      buoy.position.set(bx, 1.0, -0.2);
      buoy.rotation.y = Math.PI / 2;
      this.boatVisuals.add(buoy);

      // Red quadrant stripes
      for (let s = 0; s < 4; s++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.04), buoyRedMat);
        const a = (s / 4) * Math.PI * 2;
        stripe.position.set(bx + (bx > 0 ? 0.02 : -0.02), 1.0 + Math.sin(a) * 0.24, -0.2 + Math.cos(a) * 0.24);
        stripe.rotation.y = Math.PI / 2;
        this.boatVisuals.add(stripe);
      }
    });

    // 10. Bow Navigation Lantern (with warm forward point light)
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(0, 0.68, 1.9);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 6), brassMat);
    lanternGroup.add(post);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffe8a3,
      emissive: 0xffb703,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const lanternHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), glassMat);
    lanternHead.position.y = 0.24;
    lanternGroup.add(lanternHead);

    const lanternLight = new THREE.PointLight(0xffbe3b, 1.2, 8.0, 1.5);
    lanternLight.position.set(0, 0.25, 0.1);
    lanternGroup.add(lanternLight);

    this.boatVisuals.add(lanternGroup);

    // 11. Coiled Rope neatly stowed in port aft transom corner
    const ropeCoil = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.05, 6, 12),
      ropeMat
    );
    ropeCoil.rotation.x = Math.PI / 2;
    ropeCoil.position.set(-0.68, 0.44, -1.88);
    this.boatVisuals.add(ropeCoil);

    // 11b. Deck Scum Hopper (stores collected algae scum clots before delivering to pier)
    this.scumHopperGroup = new THREE.Group();
    this.scumHopperGroup.position.set(0.68, 0.44, -1.88); // Starboard aft transom

    const hopperCrate = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.28, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 0.85, flatShading: true })
    );
    hopperCrate.position.y = 0.14;
    this.scumHopperGroup.add(hopperCrate);

    // Green organic sludge fill that rises as scum is collected
    const sludgeGeo = new THREE.BoxGeometry(0.34, 0.24, 0.34);
    sludgeGeo.translate(0, 0.12, 0); // Scale up from floor
    this.scumHopperFill = new THREE.Mesh(
      sludgeGeo,
      new THREE.MeshStandardMaterial({
        color: 0x4aa81a,
        emissive: 0x1f540b,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        transparent: true,
        opacity: 0.92
      })
    );
    this.scumHopperFill.position.y = 0.02;
    this.scumHopperFill.scale.set(1, 0.02, 1);
    this.scumHopperGroup.add(this.scumHopperFill);

    this.boatVisuals.add(this.scumHopperGroup);

    // 12. Stern Propeller & Rudder
    this.propeller = new THREE.Group();
    this.propeller.position.set(0, 0.05, -2.15);

    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf4a261, metalness: 0.7, roughness: 0.3 });
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.04), bladeMat);
      blade.rotation.z = (b / 3) * Math.PI * 2;
      this.propeller.add(blade);
    }
    this.boatVisuals.add(this.propeller);

    // Brass Rudder blade
    this.rudderPivot = new THREE.Group();
    this.rudderPivot.position.set(0, -0.1, -2.3);
    const rudderBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.45, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xd4a373, metalness: 0.6, roughness: 0.4 })
    );
    rudderBlade.position.set(0, -0.15, -0.2);
    this.rudderPivot.add(rudderBlade);
    this.boatVisuals.add(this.rudderPivot);

    // 13. Algae Fouling Goop & Tendril Visuals
    this.createAlgaeFoulingVisuals();
  }

  createAlgaeFoulingVisuals() {
    this.algaeFoulingGroup = new THREE.Group();
    this.boatVisuals.add(this.algaeFoulingGroup);

    // High-viscosity translucent slimy algae material
    this.algaeSlimeMat = new THREE.MeshStandardMaterial({
      color: 0x48a816,
      emissive: 0x225508,
      emissiveIntensity: 0.58,
      roughness: 0.15,
      metalness: 0.08,
      transparent: true,
      opacity: 0.94,
      flatShading: false
    });

    // Positions around the hull and gunwales
    const patchConfigs = [
      { pos: new THREE.Vector3(0, 0.38, 1.95),   rot: new THREE.Euler(0.25, 0, 0),        scale: 1.25, seed: 0 },    // Bow nose
      { pos: new THREE.Vector3(-0.92, 0.44, 1.2),  rot: new THREE.Euler(0, 0.35, -0.32),   scale: 1.05, seed: 1.5 },  // Port bow strake
      { pos: new THREE.Vector3(0.92, 0.44, 1.2),   rot: new THREE.Euler(0, -0.35, 0.32),   scale: 1.05, seed: 3.1 },  // Starboard bow strake
      { pos: new THREE.Vector3(-1.18, 0.46, 0.0),  rot: new THREE.Euler(0, 0, -0.42),      scale: 1.15, seed: 4.6 },  // Port midship
      { pos: new THREE.Vector3(1.18, 0.46, 0.0),   rot: new THREE.Euler(0, 0, 0.42),       scale: 1.15, seed: 6.2 },  // Starboard midship
      { pos: new THREE.Vector3(-1.02, 0.42, -1.3), rot: new THREE.Euler(0, -0.25, -0.35),  scale: 1.08, seed: 7.8 },  // Port aft quarter
      { pos: new THREE.Vector3(1.02, 0.42, -1.3),  rot: new THREE.Euler(0, 0.25, 0.35),   scale: 1.08, seed: 9.3 },  // Starboard aft quarter
      { pos: new THREE.Vector3(0, 0.32, -2.08),  rot: new THREE.Euler(-0.35, 0, 0),       scale: 1.30, seed: 10.9 }  // Stern transom
    ];

    const mainGeo = new THREE.SphereGeometry(0.26, 12, 10);
    mainGeo.scale(1.25, 0.65, 0.95);

    const tendrilGeo = new THREE.ConeGeometry(0.07, 0.32, 8);
    tendrilGeo.rotateX(Math.PI); // Point downwards

    const satelliteGeo = new THREE.SphereGeometry(0.11, 8, 6);

    this.algaePatches = patchConfigs.map(cfg => {
      const patchGroup = new THREE.Group();
      patchGroup.position.copy(cfg.pos);
      patchGroup.rotation.copy(cfg.rot);
      patchGroup.scale.setScalar(0.0001); // Hidden when clean

      // 1. Central lumpy slime mound
      const mound = new THREE.Mesh(mainGeo, this.algaeSlimeMat);
      patchGroup.add(mound);

      // 2. Dripping tendrils hanging down into water
      const tendril1 = new THREE.Mesh(tendrilGeo, this.algaeSlimeMat);
      tendril1.position.set(-0.10, -0.16, 0.04);
      patchGroup.add(tendril1);

      const tendril2 = new THREE.Mesh(tendrilGeo, this.algaeSlimeMat);
      tendril2.position.set(0.11, -0.18, -0.03);
      tendril2.scale.set(0.85, 1.15, 0.85);
      patchGroup.add(tendril2);

      // 3. Shiny satellite goop bubble
      const bubble = new THREE.Mesh(satelliteGeo, this.algaeSlimeMat);
      bubble.position.set(0.06, 0.12, 0.05);
      patchGroup.add(bubble);

      this.algaeFoulingGroup.add(patchGroup);

      return {
        group: patchGroup,
        baseScale: cfg.scale,
        seed: cfg.seed,
        pos: cfg.pos
      };
    });
  }

  addAlgae(amount) {
    if (this.algaeLevel >= 1.0) return;
    const oldLevel = this.algaeLevel;
    this.algaeLevel = Math.min(1.0, this.algaeLevel + amount);
    if (oldLevel === 0 && this.algaeLevel > 0) {
      sounds.playAlgaeSplattered();
    }
  }

  cleanBoat() {
    if (this.algaeLevel <= 0.001) {
      return { cleaned: false, wasFouled: false };
    }
    const previousLevel = this.algaeLevel;
    this.algaeLevel = 0.0;
    this.isCleaning = true;
    this.cleanTimer = 0.65;

    // Refreshing wash audio
    sounds.playWaterCleanse();

    // Spawn 28 sparkling water spray and bubble particles
    this.spawnWaterCleanseParticles();

    return { cleaned: true, wasFouled: true, previousLevel };
  }

  spawnWaterCleanseParticles() {
    const geo = new THREE.SphereGeometry(0.16, 8, 6);
    const count = 30;

    for (let i = 0; i < count; i++) {
      const isCyan = Math.random() > 0.4;
      const mat = new THREE.MeshBasicMaterial({
        color: isCyan ? 0x67e8f9 : 0xffffff,
        transparent: true,
        opacity: 0.92
      });

      const p = new THREE.Mesh(geo, mat);

      // Distribute outward along hull boundary
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const dist = 0.8 + Math.random() * 0.6;
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * (dist * 1.5);

      const localPos = new THREE.Vector3(px, 0.4 + Math.random() * 0.3, pz);
      localPos.applyEuler(this.boatVisuals.rotation);
      localPos.applyEuler(this.group.rotation);
      localPos.add(this.group.position);

      p.position.copy(localPos);

      const speed = 2.4 + Math.random() * 3.2;
      const dirX = Math.cos(angle);
      const dirZ = Math.sin(angle);

      p.userData = {
        life: 0,
        maxLife: 0.65 + Math.random() * 0.35,
        vx: dirX * speed,
        vy: 1.8 + Math.random() * 2.2,
        vz: dirZ * speed,
        baseScale: 0.7 + Math.random() * 0.5
      };

      if (this.group.parent) {
        this.group.parent.add(p);
        this.cleanWaterParticles.push(p);
      }
    }
  }

  updateCleanseParticles(dt) {
    if (this.isCleaning) {
      this.cleanTimer -= dt;
      if (this.cleanTimer <= 0) {
        this.isCleaning = false;
      }
    }

    for (let i = this.cleanWaterParticles.length - 1; i >= 0; i--) {
      const p = this.cleanWaterParticles[i];
      p.userData.life += dt;
      const progress = p.userData.life / p.userData.maxLife;

      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      p.userData.vy -= 7.5 * dt; // Gravity

      p.scale.setScalar(p.userData.baseScale * (1.0 + progress * 0.6));
      p.material.opacity = 0.92 * (1.0 - progress);

      if (progress >= 1.0) {
        if (p.parent) p.parent.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.cleanWaterParticles.splice(i, 1);
      }
    }
  }

  updateSlimeDrips(dt, elapsedTime) {
    if (this.algaeLevel > 0.05 && Math.abs(this.speed) > 0.4) {
      this.slimeDripTimer += dt * (1.0 + this.algaeLevel * 1.5);
      if (this.slimeDripTimer > 0.18) {
        this.slimeDripTimer = 0;

        const dripGeo = new THREE.SphereGeometry(0.09, 6, 6);
        const dripMat = new THREE.MeshBasicMaterial({
          color: 0x5ab816,
          transparent: true,
          opacity: 0.85
        });
        const drip = new THREE.Mesh(dripGeo, dripMat);

        // Pick a random patch
        const randPatch = this.algaePatches[Math.floor(Math.random() * this.algaePatches.length)];
        const worldPos = randPatch.pos.clone();
        worldPos.applyEuler(this.boatVisuals.rotation);
        worldPos.applyEuler(this.group.rotation);
        worldPos.add(this.group.position);

        drip.position.copy(worldPos);
        drip.userData = {
          life: 0,
          maxLife: 0.45 + Math.random() * 0.25,
          vy: -1.8 - Math.random() * 1.2
        };

        if (this.group.parent) {
          this.group.parent.add(drip);
          this.slimeDripParticles.push(drip);
        }
      }
    }

    for (let i = this.slimeDripParticles.length - 1; i >= 0; i--) {
      const d = this.slimeDripParticles[i];
      d.userData.life += dt;
      d.position.y += d.userData.vy * dt;
      const progress = d.userData.life / d.userData.maxLife;
      d.scale.setScalar(Math.max(0.01, 1.0 - progress * 0.7));
      d.material.opacity = 0.85 * (1.0 - progress);

      if (progress >= 1.0 || d.position.y < 0.05) {
        if (d.parent) d.parent.remove(d);
        d.geometry.dispose();
        d.material.dispose();
        this.slimeDripParticles.splice(i, 1);
      }
    }
  }

  tootWhistle() {
    sounds.playWhistle();
    this.whistleTimer = 0.6;
  }

  /**
   * Triggers the "Big Bell Hit" Squad Combo Strike:
   * Unleashes the massive bronze gong, triple whistle fanfare, and gnome team cheer.
   */
  triggerBigBellHit() {
    const struck = this.bell.strikeBigBell();
    if (struck) {
      // Acoustic blast clears all clinging algae instantly!
      this.algaeLevel = 0;

      // Animate onboard gnomes cheering
      if (this.crewMembers) {
        for (const m of this.crewMembers) {
          if (m && m.group) {
            m.cheerTimer = 1.0;
          }
        }
      }
      return true;
    }
    return false;
  }

  addCrewMember(gnomeData) {
    if (this.crewMembers.length >= this.crewSlots.length) return false;

    const availableSlot = this.crewSlots.find(s => !s.taken);
    if (!availableSlot) return false;

    availableSlot.taken = true;

    const crewGnome = new Gnome({
      name: gnomeData.name,
      role: gnomeData.role,
      hatColor: gnomeData.hatColor,
      smockColor: gnomeData.smockColor,
      isCaptain: false
    });

    // Rescued gnomes sit comfortably on the aft bench facing the wake!
    crewGnome.setSitting(true);
    crewGnome.group.scale.set(0.86, 0.86, 0.86);
    crewGnome.group.position.copy(availableSlot.pos);
    crewGnome.group.rotation.y = (availableSlot.yaw !== undefined) ? availableSlot.yaw : Math.PI;
    this.boatVisuals.add(crewGnome.group);
    this.crewMembers.push(crewGnome);

    return true;
  }

  offloadCrew() {
    for (const member of this.crewMembers) {
      if (member && typeof member.dispose === 'function') {
        member.dispose();
      } else if (member && member.group && member.group.parent) {
        member.group.parent.remove(member.group);
      }
    }
    this.crewMembers = [];
    for (const slot of this.crewSlots) {
      slot.taken = false;
    }
  }

  getBellWorldPosition() {
    const worldPos = new THREE.Vector3();
    if (this.bell && this.bell.group) {
      this.bell.group.getWorldPosition(worldPos);
    } else {
      worldPos.copy(this.position);
    }
    return worldPos;
  }

  takeDamage(amount, source = 'impact') {
    if (this.isCapsized) return;
    this.health = Math.max(0, this.health - amount);

    // Dynamic hull shudder & roll
    this.boatVisuals.rotation.z += (Math.random() - 0.5) * 0.35;
    this.boatVisuals.rotation.x += (Math.random() - 0.5) * 0.25;

    if (this.health <= 0) {
      this.capsize();
    }
  }

  repair(amount) {
    if (this.isCapsized) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  capsize() {
    if (this.isCapsized) return;
    this.isCapsized = true;
    this.capsizeProgress = 0;
    this.speed = 0;
    sounds.playCapsizeGroan();

    if (this.onCapsizedCallback) {
      this.onCapsizedCallback();
    }
  }

  addScumCargo(amount = 1) {
    const prev = this.scumCargo;
    this.scumCargo = Math.min(this.maxScumCargo, this.scumCargo + amount);
    if (this.scumHopperFill) {
      const fillRatio = this.scumCargo / this.maxScumCargo;
      this.scumHopperFill.scale.set(1, Math.max(0.04, fillRatio), 1);
    }
    return this.scumCargo - prev;
  }

  unloadScumCargo() {
    const amount = this.scumCargo;
    this.scumCargo = 0;
    if (this.scumHopperFill) {
      this.scumHopperFill.scale.set(1, 0.02, 1);
    }
    return amount;
  }


  resetBoat(x = 3.2, z = 30.5, heading = Math.PI) {
    this.health = this.maxHealth;
    this.isCapsized = false;
    this.capsizeProgress = 0;
    this.speed = 0;
    this.algaeLevel = 0.0;
    this.scumCargo = 0;
    this.shockwaveRadiusBonus = 1.0;
    if (this.scumHopperFill) {
      this.scumHopperFill.scale.set(1, 0.02, 1);
    }
    if (this.captain && this.captain.group) {
      this.captain.group.visible = true;
    }
    this.position.set(x, 0.1, z);
    this.heading = heading;
    this.group.rotation.y = heading;
    this.boatVisuals.rotation.set(0, 0, 0);
    this.boatVisuals.position.set(0, 0, 0);
    this.finishBoarding();
  }

  resetCrew() {
    for (const c of this.crewMembers) {
      if (c && typeof c.dispose === 'function') {
        c.dispose();
      } else if (c && c.group && c.group.parent) {
        c.group.parent.remove(c.group);
      }
    }
    this.crewMembers = [];
    this.crewSlots.forEach((slot) => {
      slot.taken = false;
    });
  }

  update(dt, input, elapsedTime) {
    // If capsized, play dramatic roll onto beam ends and sink into water
    if (this.isCapsized) {
      this.capsizeProgress = Math.min(1.0, this.capsizeProgress + dt * 0.7);
      this.speed = THREE.MathUtils.lerp(this.speed, 0, dt * 5.0);

      // Roll 100 degrees onto port beam ends, tip bow slightly, and settle deeper
      const targetRoll = -1.75;
      const targetPitch = 0.22;
      const targetSink = -0.42 * this.capsizeProgress;

      this.boatVisuals.rotation.z = THREE.MathUtils.lerp(this.boatVisuals.rotation.z, targetRoll, dt * 3.5);
      this.boatVisuals.rotation.x = THREE.MathUtils.lerp(this.boatVisuals.rotation.x, targetPitch, dt * 3.5);
      this.boatVisuals.position.y = THREE.MathUtils.lerp(this.boatVisuals.position.y, targetSink, dt * 3.5);

      const baseWaterY = getWaterSurfaceHeight(this.position.x, this.position.z, elapsedTime);
      this.position.y = baseWaterY + 0.10 + Math.sin(elapsedTime * 2.0) * 0.015;

      this.updateSmoke(dt);
      this.updatePropellerChurn(dt);
      this.updateSlimeDrips(dt, elapsedTime);
      this.updateCleanseParticles(dt);
      return;
    }

    // Algae fouling speed, acceleration, and steering drag penalties
    const foulingPenalty = Math.max(0, Math.min(1.0, this.algaeLevel));
    const fuelBonus = this.fuelSpeedBonus || 1.0;
    const effectiveMaxSpeed = this.maxSpeed * fuelBonus * (1.0 - foulingPenalty * 0.55);
    const effectiveMaxReverse = this.maxReverseSpeed * (1.0 - foulingPenalty * 0.40);
    const effectiveAccel = this.acceleration * fuelBonus * (1.0 - foulingPenalty * 0.45);
    const effectiveTurn = this.turnSpeed * (1.0 - foulingPenalty * 0.30);

    // 1. Acceleration & Braking (W = Forward, S = Reverse)
    if (input.forward) {
      this.speed += effectiveAccel * dt;
    } else if (input.backward) {
      this.speed -= effectiveAccel * dt;
    } else {
      // Hydrodynamic water drag (increased when fouled with algae)
      const drag = this.deceleration * (1.0 + foulingPenalty * 0.35);
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - drag * dt);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + drag * dt);
      }
    }

    this.speed = THREE.MathUtils.clamp(this.speed, effectiveMaxReverse, effectiveMaxSpeed);

    // 2. Steering & Rudder (A = Left, D = Right)
    // Pressing D / Right turns boat clockwise to the right
    // Pressing A / Left turns boat counter-clockwise to the left
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const speedRatio = this.speed / this.maxSpeed;

    if (steer !== 0) {
      // Full turn rate when cruising, 85% pivot turn rate when stationary
      const turnRate = Math.abs(this.speed) > 0.1 ? 1.0 : 0.85;
      this.heading -= steer * effectiveTurn * dt * turnRate;
    }

    // Rudder and ship wheel angle
    const targetRudder = -steer * 0.55;
    this.rudderAngle = THREE.MathUtils.lerp(this.rudderAngle, targetRudder, dt * 8.0);
    this.rudderPivot.rotation.y = this.rudderAngle;
    if (this.shipWheel) {
      this.shipWheel.rotation.z = this.rudderAngle * 2.5;
    }

    // Propeller spinning
    this.propeller.rotation.z += this.speed * dt * 15.0;

    // 3. World Position Update (Forward is along boat heading)
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;

    // Constrain to pond boundaries (radius ~ 37, extended to 41.5 at Port Bramble Pier channel so boat can travel through!)
    const isNearPierChannel = Math.abs(this.position.x) < 4.8 && this.position.z > 28.0 && this.position.z < 41.5;
    const maxRadius = isNearPierChannel ? 41.5 : 37.0;
    const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
    if (distFromCenter > maxRadius) {
      const angle = Math.atan2(this.position.z, this.position.x);
      this.position.x = Math.cos(angle) * maxRadius;
      this.position.z = Math.sin(angle) * maxRadius;
      this.speed *= 0.4;
    }

    // 4. Dynamic Water Buoyancy & Wave Pitch/Roll (4-point Gerstner sampling)
    this.group.rotation.y = this.heading;

    const baseWaterY = getWaterSurfaceHeight(this.position.x, this.position.z, elapsedTime);
    this.position.y = baseWaterY + 0.10;

    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);

    // Bow & Stern points (length = 3.2m)
    const bowX = this.position.x + sinH * 1.6;
    const bowZ = this.position.z + cosH * 1.6;
    const sternX = this.position.x - sinH * 1.6;
    const sternZ = this.position.z - cosH * 1.6;

    // Port & Starboard points (width = 1.7m)
    const portX = this.position.x - cosH * 0.85;
    const portZ = this.position.z + sinH * 0.85;
    const starX = this.position.x + cosH * 0.85;
    const starZ = this.position.z - sinH * 0.85;

    const bowY = getWaterSurfaceHeight(bowX, bowZ, elapsedTime);
    const sternY = getWaterSurfaceHeight(sternX, sternZ, elapsedTime);
    const portY = getWaterSurfaceHeight(portX, portZ, elapsedTime);
    const starY = getWaterSurfaceHeight(starX, starZ, elapsedTime);

    const wavePitch = Math.atan2(bowY - sternY, 3.2);
    const waveRoll = Math.atan2(portY - starY, 1.7);

    const accelPitch = (this.speed / this.maxSpeed) * 0.06;
    const steerRoll = this.rudderAngle * speedRatio * -0.22;

    this.boatVisuals.rotation.x = THREE.MathUtils.lerp(this.boatVisuals.rotation.x, -wavePitch + accelPitch, dt * 6.0);
    this.boatVisuals.rotation.z = THREE.MathUtils.lerp(this.boatVisuals.rotation.z, waveRoll + steerRoll, dt * 6.0);

    // 5. Update Characters
    if (this.captain && !this.isBoarding) {
      this.captain.animateWiggle(elapsedTime, 1.0 + Math.abs(speedRatio) * 0.5);
    }
    // Rescued crew members sit on the aft bench and kick their legs playfully in the wake
    this.crewMembers.forEach((c, idx) => c.animateSitting(elapsedTime, idx, this.speed));

    // 6. Update Bell striker & cooldown
    if (this.bell) {
      this.bell.update(dt);
    }

    // 7. Propeller Churn Foam & Volumetric Smoke
    this.updatePropellerChurn(dt);
    this.updateSmoke(dt);

    // 8. Update Algae Fouling visual scale & organic fluid wobble
    const targetScale = this.algaeLevel;
    for (let i = 0; i < this.algaePatches.length; i++) {
      const p = this.algaePatches[i];
      if (targetScale <= 0.001) {
        p.group.scale.setScalar(0.0001);
      } else {
        const wobble = Math.sin(elapsedTime * 6.5 + p.seed) * 0.07 * targetScale;
        const currentScale = p.baseScale * targetScale;
        p.group.scale.set(
          currentScale * (1.0 + wobble),
          currentScale * (1.0 - wobble * 0.7),
          currentScale * (1.0 + wobble)
        );
      }
    }

    // 9. Dripping Slime & Cleaning Wash Particles
    this.updateSlimeDrips(dt, elapsedTime);
    this.updateCleanseParticles(dt);

    // 10. Update Scum Hopper visual fill level
    if (this.scumHopperFill) {
      const targetScale = this.scumCargo === 0 ? 0.02 : Math.min(1.0, 0.12 + (this.scumCargo / this.maxScumCargo) * 0.88);
      this.scumHopperFill.scale.y = THREE.MathUtils.lerp(this.scumHopperFill.scale.y, targetScale, dt * 6.0);
    }
  }

  updatePropellerChurn(dt) {
    // Coarse polygon discs removed — the water shader renders continuous,
    // buttery-smooth per-pixel propeller wash and V-wake directly on the surface.
    for (let i = this.foamParticles.length - 1; i >= 0; i--) {
      const b = this.foamParticles[i];
      if (b.parent) b.parent.remove(b);
      b.geometry.dispose();
      b.material.dispose();
      this.foamParticles.splice(i, 1);
    }
  }

  updateSmoke(dt) {
    if (!this.smokeTimer) this.smokeTimer = 0;

    // Emission frequency scales with boat speed (chug rhythm: 0.26s idling -> 0.11s at full speed)
    const speedRatio = Math.abs(this.speed) / this.maxSpeed;
    const spawnInterval = THREE.MathUtils.lerp(0.26, 0.11, speedRatio);
    this.smokeTimer += dt;

    // Whistle steam puff stream when active
    if (this.whistleTimer > 0) {
      this.whistleTimer -= dt;
      if (!this.whistlePuffTimer) this.whistlePuffTimer = 0;
      this.whistlePuffTimer += dt;
      if (this.whistlePuffTimer > 0.08) {
        this.whistlePuffTimer = 0;
        this.spawnWhistleSteam();
      }
    }

    // Volumetric-style 3D steam puffs emerging from chimney stack
    if (this.smokeTimer >= spawnInterval) {
      this.smokeTimer = 0;

      const isMurky = this.algaeLevel > 0.28 && (Math.random() < this.algaeLevel * 0.75);
      const puff = createSteamPuffMesh(isMurky);

      const worldTip = this.chimneyTip.clone();
      worldTip.applyEuler(this.boatVisuals.rotation);
      worldTip.applyEuler(this.group.rotation);
      worldTip.add(this.group.position);

      puff.position.copy(worldTip);
      puff.scale.setScalar(0.18); // Starts compact inside chimney rim

      // Inherit partial horizontal velocity from boat for natural plume curvature
      const fwdX = Math.sin(this.heading) * this.speed;
      const fwdZ = Math.cos(this.heading) * this.speed;

      puff.userData = {
        ...puff.userData,
        life: 0,
        maxLife: 1.5 + Math.random() * 0.35,
        targetScale: 0.65 + Math.random() * 0.3,
        vy: 1.25 + Math.random() * 0.35,
        vx: fwdX * 0.28 + (Math.random() - 0.5) * 0.15,
        vz: fwdZ * 0.28 + (Math.random() - 0.5) * 0.15,
        rotSpeedY: (Math.random() - 0.5) * 1.5,
        rotSpeedZ: (Math.random() - 0.5) * 1.5
      };

      if (this.group.parent) {
        this.group.parent.add(puff);
        this.smokeParticles.push(puff);
      }
    }

    // Animate & billow existing steam puffs
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.userData.life += dt;
      const progress = p.userData.life / p.userData.maxLife;

      p.position.y += p.userData.vy * dt;
      p.position.x += p.userData.vx * dt;
      p.position.z += p.userData.vz * dt;

      // Air drag slows down horizontal drift
      p.userData.vx *= Math.max(0, 1.0 - dt * 2.2);
      p.userData.vz *= Math.max(0, 1.0 - dt * 2.2);

      // Gentle organic tumbling
      p.rotation.y += p.userData.rotSpeedY * dt;
      p.rotation.z += p.userData.rotSpeedZ * dt;

      // Volumetric billowing scale progression
      let currentScale;
      if (progress < 0.22) {
        const t = progress / 0.22;
        currentScale = THREE.MathUtils.lerp(0.18, p.userData.targetScale, t * (2.0 - t));
      } else if (progress < 0.70) {
        const t = (progress - 0.22) / 0.48;
        currentScale = p.userData.targetScale * (1.0 + t * 0.42);
      } else {
        const t = (progress - 0.70) / 0.30;
        currentScale = p.userData.targetScale * 1.42 * (1.0 - t * 0.22);
      }
      p.scale.setScalar(currentScale);

      // Opacity and emissive fade
      const mat = p.userData.material;
      if (mat) {
        if (progress < 0.60) {
          mat.opacity = 0.95;
          mat.emissiveIntensity = 0.42;
        } else {
          const fade = 1.0 - (progress - 0.60) / 0.40;
          mat.opacity = 0.95 * Math.sin(fade * Math.PI * 0.5);
          mat.emissiveIntensity = 0.42 * fade;
        }
      }

      if (progress >= 1.0) {
        if (p.parent) p.parent.remove(p);
        if (p.userData.material) p.userData.material.dispose();
        this.smokeParticles.splice(i, 1);
      }
    }
  }

  spawnWhistleSteam() {
    const puff = createSteamPuffMesh();

    const worldTip = this.whistleTip.clone();
    worldTip.applyEuler(this.boatVisuals.rotation);
    worldTip.applyEuler(this.group.rotation);
    worldTip.add(this.group.position);

    puff.position.copy(worldTip);
    puff.scale.setScalar(0.12);

    puff.userData = {
      ...puff.userData,
      life: 0,
      maxLife: 0.65,
      targetScale: 0.32 + Math.random() * 0.12,
      vy: 3.2 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 0.25,
      vz: (Math.random() - 0.5) * 0.25,
      rotSpeedY: (Math.random() - 0.5) * 3.0,
      rotSpeedZ: (Math.random() - 0.5) * 3.0
    };

    if (this.group.parent) {
      this.group.parent.add(puff);
      this.smokeParticles.push(puff);
    }
  }

  updateBoarding(progress, elapsedTime) {
    if (!this.isBoarding || !this.captain) return;

    // Stage 1: Trotting along pier to gangplank (progress: 0.0 -> 0.42)
    if (progress < 0.42) {
      const p = progress / 0.42;
      // Interpolate from pier deck (2.4, -0.4) to gangplank entrance (1.5, 0.0)
      const x = THREE.MathUtils.lerp(2.4, 1.5, p);
      const z = THREE.MathUtils.lerp(-0.4, 0.0, p);
      const hop = Math.max(0, Math.sin(elapsedTime * 10.0)) * 0.06;
      this.captain.group.position.set(x, 0.32 + hop, z);
      this.captain.group.rotation.set(0, -Math.PI / 2 - 0.15, 0); // Facing boat
      this.captain.animateTrot(elapsedTime, 1.15);
    }
    // Stage 2: Walking across gangplank & stepping onto deck (progress: 0.42 -> 0.66)
    else if (progress < 0.66) {
      const p = (progress - 0.42) / 0.24;
      // Cross gangplank and walk to front of brass bell (x: 1.5 -> 0.0, z: 0.0 -> 0.65)
      const x = THREE.MathUtils.lerp(1.5, 0.0, p);
      const z = THREE.MathUtils.lerp(0.0, 0.65, p);
      // Cute hop over the gunwale around p = 0.45
      const gunwaleHop = Math.sin(p * Math.PI) * 0.12;
      this.captain.group.position.set(x, 0.42 + gunwaleHop, z);
      // Turn smoothly toward the bow / bell
      this.captain.group.rotation.set(0, THREE.MathUtils.lerp(-Math.PI / 2, 0, p), 0);
      this.captain.animateTrot(elapsedTime, 1.25);
    }
    // Stage 3: Striking the brass bell with hammer! (progress: 0.66 -> 0.84)
    else if (progress < 0.84) {
      const p = (progress - 0.66) / 0.18;
      this.captain.group.position.set(0.0, 0.45, 0.65);
      this.captain.group.rotation.set(0, 0, 0); // Facing bell directly
      this.captain.animateHammerStrike(p);
    }
    // Stage 4: Victorious waddle to ship's wheel & helm (progress: 0.84 -> 1.0)
    else {
      const p = (progress - 0.84) / 0.16;
      // Waddle into the wheelhouse right behind the helm wheel (z = 0.35)
      const z = THREE.MathUtils.lerp(0.65, 0.35, p);
      const hop = Math.max(0, Math.sin(elapsedTime * 9.0)) * 0.04;
      this.captain.group.position.set(0.0, 0.42 + hop, z);
      this.captain.group.rotation.set(0, THREE.MathUtils.lerp(Math.PI * 0.4, 0, p), 0);
      // Cheerful wave with hammer
      this.captain.armPivot.rotation.x = -Math.PI * 0.75 + Math.sin(elapsedTime * 7.0) * 0.3;
      this.captain.armPivot.rotation.z = 0.35;
      if (this.captain.leftArmPivot) {
        this.captain.leftArmPivot.rotation.x = Math.sin(elapsedTime * 8.0) * 0.4;
      }
    }
  }

  finishBoarding() {
    this.isBoarding = false;
    if (this.captain) {
      this.captain.group.scale.setScalar(0.85);
      this.captain.group.position.set(0, 0.40, 0.42);
      this.captain.group.rotation.set(0, 0, 0);
      if (this.captain.armPivot) this.captain.armPivot.rotation.set(-0.9, -0.2, 0.1);
      if (this.captain.leftArmPivot) this.captain.leftArmPivot.rotation.set(-0.9, 0.2, -0.1);
    }
  }
}
