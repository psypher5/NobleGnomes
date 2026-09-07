import * as THREE from 'three';
import { sounds } from '../audio/SoundSynthesizer.js';
import { getWaterSurfaceHeight } from '../environment/PondWater.js';

export const SLIME_STAGE = {
  FILM: 1,      // Flat organic algae scum
  BLOB: 2,      // Swelling multi-bubble gelatinous mound
  MONSTER: 3,   // Sculpted cartoon slime monster with expressive scowl & arms
  BOSS: 4       // The Bog Behemoth colossal mini-boss with stone horns & rock-throwing arms
};

let sharedStinkTexture = null;

function getStinkVaporTexture() {
  if (!sharedStinkTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(218, 248, 48, 0.72)');
    grad.addColorStop(0.35, 'rgba(142, 224, 32, 0.45)');
    grad.addColorStop(0.70, 'rgba(95, 192, 22, 0.18)');
    grad.addColorStop(1, 'rgba(80, 180, 20, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    sharedStinkTexture = new THREE.CanvasTexture(canvas);
  }
  return sharedStinkTexture;
}

/**
 * Procedurally sculpts an organic fluid droplet geometry with drooping pooled base,
 * smooth surface tension contours, and gentle asymmetrical fluid lobes.
 */
function createOrganicDropletGeometry(radius, widthSegments = 24, heightSegments = 18, seed = 0) {
  const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const v = y / radius;

    // Natural fluid pooling: bottom expands outward to rest heavily on water; top rounds into fluid crest
    const droop = v < 0
      ? 1.0 + Math.pow(-v, 1.2) * 0.42
      : 1.0 - Math.pow(v, 1.5) * 0.22;

    // Asymmetrical fluid lobes & organic surface tension waves
    const angle = Math.atan2(z, x);
    const lobe1 = Math.sin(angle * 3.0 + seed) * 0.08;
    const lobe2 = Math.cos(angle * 2.0 - seed * 1.5) * 0.06;
    const verticalRipples = Math.sin(v * 5.0 + seed * 2.0) * 0.04;

    const perturb = 1.0 + lobe1 + lobe2 + verticalRipples;

    // Flatten bottom slightly so it seats securely on the surface scum film
    if (v < -0.55) {
      const bottomT = (-v - 0.55) / 0.45;
      y = THREE.MathUtils.lerp(y, -radius * 0.62, bottomT * 0.55);
    }

    pos.setXYZ(i, x * droop * perturb, y, z * droop * perturb);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates an organic multi-lobed splatter surface film with satellite droplets
 */
function createSurfaceFilmMesh(baseRadius, seed, mat) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  const points = 24;

  for (let p = 0; p < points; p++) {
    const a = (p / points) * Math.PI * 2;
    const r = baseRadius * (0.80 + Math.sin(a * 4.0 + seed) * 0.16 + Math.cos(a * 3.0 - seed * 1.2) * 0.12 + Math.sin(a * 7.0 + seed) * 0.05);
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    if (p === 0) shape.moveTo(px, pz);
    else shape.lineTo(px, pz);
  }
  shape.closePath();

  const filmGeo = new THREE.ShapeGeometry(shape);
  filmGeo.rotateX(-Math.PI / 2);

  const filmMesh = new THREE.Mesh(filmGeo, mat);
  filmMesh.position.y = 0.02;
  filmMesh.receiveShadow = true;
  group.add(filmMesh);

  // Satellite puddle droplets with references for dynamic floating
  const dropGeo = new THREE.SphereGeometry(0.22, 8, 6);
  dropGeo.scale(1.2, 0.32, 1.2);
  const numDrops = 4 + Math.floor(baseRadius * 1.2);
  const drops = [];

  for (let i = 0; i < numDrops; i++) {
    const dropAngle = (i / numDrops) * Math.PI * 2 + (Math.sin(i * 1.7 + seed) * 0.4);
    const dropDist = baseRadius * (1.08 + Math.sin(i * 2.3 + seed) * 0.28);
    const drop = new THREE.Mesh(dropGeo, mat);
    drop.position.set(Math.cos(dropAngle) * dropDist, 0.025, Math.sin(dropAngle) * dropDist);
    group.add(drop);
    drops.push({ mesh: drop, phase: i * 1.3 + seed, baseDist: dropDist });
  }

  return { group, filmMesh, drops };
}

/**
 * Individual Slime entity supporting multi-stage growth:
 * Film -> Blob -> Expressive Slime Monster with throwing attack & stink fumes.
 */
export class SlimeBlob {
  constructor(x, z, stage = SLIME_STAGE.FILM) {
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(x, 0.04, z);
    this.group.position.copy(this.position);

    // Decouple surface film from animated wobbling body
    this.filmGroup = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.group.add(this.filmGroup);
    this.group.add(this.bodyGroup);

    this.stage = stage;
    this.seed = Math.random() * 100.0;
    this.growthTimer = 0;
    this.growthThreshold = 14.0 + Math.random() * 8.0;
    this.health = stage === SLIME_STAGE.BOSS ? 10 : (stage === SLIME_STAGE.MONSTER ? 3 : (stage === SLIME_STAGE.BLOB ? 2 : 1));
    this.maxHealth = this.health;

    this.isDead = false;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.scale = 1.0;
    this.hitStun = 0;

    // Miniboss Gnome-Crew Shield System
    this.isShielded = stage === SLIME_STAGE.BOSS;
    this.shieldGroup = null;
    this.shieldFlashTimer = 0;
    this.shieldShatterParticles = [];

    // Propagation & Throw AI parameters
    this.throwTimer = stage === SLIME_STAGE.BOSS ? (4.0 + Math.random() * 3.0) : (6.0 + Math.random() * 6.0);
    this.isWindingUp = false;
    this.windupTime = 0;
    this.targetPos = new THREE.Vector3();

    // Boss Multi-Phase Enrage System
    this.bossPhase = 1;
    this.bossAttackIndex = 0; // Cycles through attack types
    this.isGroundPounding = false;
    this.groundPoundTimer = 0;
    this.groundPoundStage = 0; // 0=idle, 1=telegraph, 2=airborne, 3=impact
    this.enrageColorLerp = 0;
    this.originalBodyColor = null; // Captured on first phase update

    // Eye blinking
    this.blinkTimer = 2.0 + Math.random() * 3.0;
    this.isBlinking = false;

    // Stink vapors
    this.stinkParticles = [];
    this.stinkSpawnTimer = 0;

    // Surface film bubbles & hatching propagation
    this.bubbles = [];
    this.bubbleSpawnTimer = 0;
    this.hatchTimer = 16.0 + Math.random() * 8.0;
    this.filmMesh = null;
    this.filmRadius = 1.8;

    // Dynamic boat wake wobble & jello jiggle
    this.wakeWobble = 0;
    this.wakeWobbleVel = 0;

    this.buildMeshForStage();
  }

  buildMeshForStage() {
    // Clear film and body groups
    const clearGrp = (g) => {
      while (g.children.length > 0) {
        const c = g.children[0];
        g.remove(c);
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      }
    };
    clearGrp(this.filmGroup);
    clearGrp(this.bodyGroup);
    this.bubbles = [];

    // Shared high-specular goop material settings
    const goopGreen = 0x48bb1b;
    const goopDark = 0x245708;

    const filmMat = new THREE.MeshStandardMaterial({
      color: 0x42b318,
      roughness: 0.16,
      metalness: 0.08,
      emissive: 0x1f540a,
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    if (this.stage === SLIME_STAGE.FILM) {
      // Stage 1: Organic Multi-Lobed Splatter Film
      this.filmRadius = 1.8;
      const { group: filmGroup, filmMesh, drops } = createSurfaceFilmMesh(this.filmRadius, this.seed, filmMat);
      this.filmMesh = filmMesh;
      this.filmDrops = drops;
      this.coreMesh = filmMesh;
      this.filmGroup.add(filmGroup);
      this.radius = 1.9;

    } else if (this.stage === SLIME_STAGE.BLOB) {
      // Stage 2: Natural Viscous Gelatinous Mound on Surface Film Pool
      this.filmRadius = 2.4;

      // 1. Sprawling organic surface film base (floating flush on water in filmGroup)
      const { group: filmGroup, filmMesh, drops } = createSurfaceFilmMesh(this.filmRadius, this.seed, filmMat);
      this.filmMesh = filmMesh;
      this.filmDrops = drops;
      this.filmGroup.add(filmGroup);

      // 2. Translucent smooth jelly mound
      const blobMat = new THREE.MeshStandardMaterial({
        color: goopGreen,
        roughness: 0.14,
        metalness: 0.06,
        emissive: 0x22660a,
        emissiveIntensity: 0.48,
        transparent: true,
        opacity: 0.92,
        flatShading: false
      });

      // Main central fluid droplet dome with drooping pooled base
      const mainDomeGeo = createOrganicDropletGeometry(1.22, 24, 18, this.seed);
      mainDomeGeo.scale(1.15, 0.76, 1.15);
      this.coreMesh = new THREE.Mesh(mainDomeGeo, blobMat);
      this.coreMesh.position.y = 0.46;
      this.coreMesh.castShadow = true;
      this.bodyGroup.add(this.coreMesh);

      // Clustered organic fluid blisters along base
      for (let b = 0; b < 5; b++) {
        const bAngle = (b / 5) * Math.PI * 2 + 0.35;
        const bDist = 0.85 + Math.sin(b * 3.0 + this.seed) * 0.12;
        const blisterGeo = createOrganicDropletGeometry(0.44, 14, 10, this.seed + b * 7.0);
        blisterGeo.scale(1.1, 0.65, 1.1);
        const blister = new THREE.Mesh(blisterGeo, blobMat);
        blister.position.set(Math.cos(bAngle) * bDist, 0.22, Math.sin(bAngle) * bDist);
        this.bodyGroup.add(blister);
      }

      // Internal glistening floating nucleus
      const innerBubbleMat = new THREE.MeshStandardMaterial({
        color: 0xa4f542,
        roughness: 0.1,
        emissive: 0x76db20,
        emissiveIntensity: 0.85
      });
      const innerBubbleGeo = new THREE.SphereGeometry(0.28, 12, 10);
      const ibMesh = new THREE.Mesh(innerBubbleGeo, innerBubbleMat);
      ibMesh.position.set(0, 0.42, 0);
      this.bodyGroup.add(ibMesh);

      // Cute Sculpted Cartoon Eyes for Stage 2 Blob
      this.faceGroup = new THREE.Group();
      this.faceGroup.position.set(0, 0.46, 0);

      const blobEyeL = this.createCartoonEye(0.22, false, false);
      blobEyeL.eyeGroup.position.set(-0.34, 0.24, 1.38);
      blobEyeL.eyeGroup.rotation.y = -0.16;
      blobEyeL.eyeGroup.rotation.x = -0.14;
      this.eyeL = blobEyeL.eyeball;
      this.faceGroup.add(blobEyeL.eyeGroup);

      const blobEyeR = this.createCartoonEye(0.22, true, false);
      blobEyeR.eyeGroup.position.set(0.34, 0.24, 1.38);
      blobEyeR.eyeGroup.rotation.y = 0.16;
      blobEyeR.eyeGroup.rotation.x = -0.14;
      this.eyeR = blobEyeR.eyeball;
      this.faceGroup.add(blobEyeR.eyeGroup);

      this.bodyGroup.add(this.faceGroup);

      this.radius = 2.2;

    } else if (this.stage === SLIME_STAGE.MONSTER) {
      // Stage 3: Expressive Cartoon Slime Monster with Surface Film Pool
      this.filmRadius = 3.0;

      // 1. Sprawling active surface scum film base (floating on water in filmGroup)
      const { group: filmGroup, filmMesh, drops } = createSurfaceFilmMesh(this.filmRadius, this.seed, filmMat);
      this.filmMesh = filmMesh;
      this.filmDrops = drops;
      this.filmGroup.add(filmGroup);

      const monsterMat = new THREE.MeshStandardMaterial({
        color: 0x48bb1b,
        roughness: 0.16,
        metalness: 0.08,
        emissive: 0x1f540a,
        emissiveIntensity: 0.44,
        transparent: true,
        opacity: 0.94,
        flatShading: false
      });

      // 1. Organic Drooping Slime Torso with Natural Fluid Contours
      const bodyGeo = createOrganicDropletGeometry(1.36, 26, 20, this.seed + 15.0);
      bodyGeo.scale(1.05, 1.05, 1.0);
      this.coreMesh = new THREE.Mesh(bodyGeo, monsterMat);
      this.coreMesh.position.y = 1.12;
      this.coreMesh.castShadow = true;
      this.bodyGroup.add(this.coreMesh);

      // Antennae removed per design feedback (cleaner organic slime silhouette)
      this.antennaeGroup = null;

      // 3. Sculpted Expressive Face Rig (Anchored to faceGroup, completely free of mesh clipping)
      this.faceGroup = new THREE.Group();
      this.faceGroup.position.set(0, 1.12, 0);

      // A. Bulging Cartoon Eyes with Protruding Goop Sockets
      const eyeLData = this.createCartoonEye(0.34, false, true);
      eyeLData.eyeGroup.position.set(-0.46, 0.42, 1.44);
      eyeLData.eyeGroup.rotation.y = -0.14;
      eyeLData.eyeGroup.rotation.x = -0.04;
      this.eyeL = eyeLData.eyeball;
      this.faceGroup.add(eyeLData.eyeGroup);

      const eyeRData = this.createCartoonEye(0.34, true, true);
      eyeRData.eyeGroup.position.set(0.46, 0.42, 1.44);
      eyeRData.eyeGroup.rotation.y = 0.14;
      eyeRData.eyeGroup.rotation.x = -0.04;
      this.eyeR = eyeRData.eyeball;
      this.faceGroup.add(eyeRData.eyeGroup);

      // B. Sculpted Grumpy Cartoon Brow Arches
      const { browGroup, browL, browR } = this.createSculptedBrows();
      this.browL = browL;
      this.browR = browR;
      this.faceGroup.add(browGroup);

      // C. Sculpted Protruding Gummy Snout, Deep Cavity & Chunky Fangs
      const mouthGroup = this.createSculptedMouth();
      this.faceGroup.add(mouthGroup);

      this.bodyGroup.add(this.faceGroup);

      // 4. Flailing Goop Arms with smooth shading
      this.leftArm = this.createArm(-1.15, 1.1, 0, false);
      this.rightArm = this.createArm(1.15, 1.1, 0, true);
      this.bodyGroup.add(this.leftArm);
      this.bodyGroup.add(this.rightArm);

      this.radius = 2.6;

    } else if (this.stage === SLIME_STAGE.BOSS) {
      // Stage 4: The Bog Behemoth (Colossal Mini-Boss with Stone Horns & Rock-Throwing Arms)
      this.filmRadius = 5.2;

      // Surface scum pool
      const { group: filmGroup, filmMesh, drops } = createSurfaceFilmMesh(this.filmRadius, this.seed, filmMat);
      this.filmMesh = filmMesh;
      this.filmDrops = drops;
      this.filmGroup.add(filmGroup);

      const bossMat = new THREE.MeshStandardMaterial({
        color: 0x245410, // Dark ancient bog moss
        roughness: 0.24,
        metalness: 0.12,
        emissive: 0x103004,
        emissiveIntensity: 0.52,
        transparent: true,
        opacity: 0.96,
        flatShading: false
      });

      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x4f493d,
        roughness: 0.88,
        metalness: 0.15,
        flatShading: true
      });

      // 1. Massive Colossal Body (2.4x scale)
      const bossGeo = createOrganicDropletGeometry(2.35, 28, 22, this.seed + 30.0);
      bossGeo.scale(1.18, 1.15, 1.1);
      this.coreMesh = new THREE.Mesh(bossGeo, bossMat);
      this.coreMesh.position.y = 1.75;
      this.coreMesh.castShadow = true;
      this.bodyGroup.add(this.coreMesh);

      // 2. Crown of 5 Jagged Stone Horns / Spires
      this.hornsGroup = new THREE.Group();
      this.hornsGroup.position.set(0, 3.4, 0);

      const hornOffsets = [
        { x: -0.75, y: 0, z: 0.2, rotZ: 0.35, rotX: -0.1, s: 1.1 },
        { x: -0.35, y: 0.25, z: 0.35, rotZ: 0.18, rotX: -0.15, s: 1.35 },
        { x: 0, y: 0.38, z: 0.42, rotZ: 0, rotX: -0.22, s: 1.55 }, // Center crest
        { x: 0.35, y: 0.25, z: 0.35, rotZ: -0.18, rotX: -0.15, s: 1.35 },
        { x: 0.75, y: 0, z: 0.2, rotZ: -0.35, rotX: -0.1, s: 1.1 }
      ];

      const hornGeo = new THREE.ConeGeometry(0.24, 1.35, 6);
      hornGeo.translate(0, 0.65, 0);

      hornOffsets.forEach(h => {
        const horn = new THREE.Mesh(hornGeo, rockMat);
        horn.position.set(h.x, h.y, h.z);
        horn.rotation.set(h.rotX, 0, h.rotZ);
        horn.scale.setScalar(h.s);
        this.hornsGroup.add(horn);

        // Glowing moss blister on horn
        const sporeGeo = new THREE.SphereGeometry(0.14, 8, 6);
        const sporeMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 0.9,
          roughness: 0.2
        });
        const spore = new THREE.Mesh(sporeGeo, sporeMat);
        spore.position.set(h.x, h.y + 0.6 * h.s, h.z + 0.1);
        this.hornsGroup.add(spore);
      });

      this.bodyGroup.add(this.hornsGroup);

      // 3. Huge Scowling Face with Glowing Amber/Lime Eyes & Rocky Jaw
      this.faceGroup = new THREE.Group();
      this.faceGroup.position.set(0, 1.75, 0);

      const bossEyeL = this.createCartoonEye(0.50, false, true);
      bossEyeL.eyeGroup.position.set(-0.78, 0.65, 2.3);
      bossEyeL.eyeGroup.rotation.y = -0.16;
      bossEyeL.eyeGroup.rotation.x = -0.06;
      this.eyeL = bossEyeL.eyeball;
      this.faceGroup.add(bossEyeL.eyeGroup);

      const bossEyeR = this.createCartoonEye(0.50, true, true);
      bossEyeR.eyeGroup.position.set(0.78, 0.65, 2.3);
      bossEyeR.eyeGroup.rotation.y = 0.16;
      bossEyeR.eyeGroup.rotation.x = -0.06;
      this.eyeR = bossEyeR.eyeball;
      this.faceGroup.add(bossEyeR.eyeGroup);

      // Brow arches
      const { browGroup, browL, browR } = this.createSculptedBrows();
      browGroup.scale.setScalar(1.65);
      browGroup.position.set(0, 0.35, 0.5);
      this.browL = browL;
      this.browR = browR;
      this.faceGroup.add(browGroup);

      // Massive gaping mouth with jagged teeth
      const mouthGroup = this.createSculptedMouth();
      mouthGroup.scale.setScalar(1.65);
      mouthGroup.position.set(0, -0.45, 0.45);
      this.faceGroup.add(mouthGroup);

      this.bodyGroup.add(this.faceGroup);

      // 4. Heavy Gnarled Rocky Arms
      this.leftArm = this.createRockArm(-2.0, 1.8, 0, false);
      this.rightArm = this.createRockArm(2.0, 1.8, 0, true);
      this.bodyGroup.add(this.leftArm);
      this.bodyGroup.add(this.rightArm);

      this.radius = 4.6;

      // 5. Impenetrable Algae Energy Shield (body-fitted iridescent shader, active until all gnomes are rescued)
      this.isShielded = true;

      this.shieldUniforms = {
        uTime: { value: 0 },
        uHitFlash: { value: 0.0 }
      };

      this.shieldMat = new THREE.ShaderMaterial({
        uniforms: this.shieldUniforms,
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          varying vec3 vPosition;

          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uHitFlash;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          varying vec3 vPosition;

          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            vec3 norm = normalize(vNormal);
            float fresnel = pow(1.0 - max(dot(viewDir, norm), 0.0), 2.2);

            // Flowing energetic hexagonal rune wave ripples across boss body
            float wave1 = sin(vPosition.y * 4.2 - uTime * 4.5);
            float wave2 = cos(vPosition.x * 3.8 + vPosition.z * 3.8 + uTime * 3.0);
            float ripple = pow(clamp(wave1 * 0.5 + wave2 * 0.5 + 0.5, 0.0, 1.0), 3.0);

            // Emerald core with radiant cyan-aqua rim energy
            vec3 energyColor = mix(vec3(0.15, 0.92, 0.40), vec3(0.30, 0.96, 0.98), fresnel);
            // Flash intense white-cyan on impact deflection
            energyColor = mix(energyColor, vec3(0.95, 1.0, 1.0), uHitFlash);

            float alpha = (fresnel * 0.75 + ripple * 0.40 + uHitFlash * 0.6) * 0.92;
            gl_FragColor = vec4(energyColor, clamp(alpha, 0.0, 1.0));
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.FrontSide
      });

      // Body-fitting energetic armor mesh precisely tracing boss geometry
      const shieldSkinGeo = bossGeo.clone();
      shieldSkinGeo.scale(1.04, 1.04, 1.04);
      this.shieldMesh = new THREE.Mesh(shieldSkinGeo, this.shieldMat);
      this.shieldMesh.position.y = 1.75;
      this.bodyGroup.add(this.shieldMesh);

      // Golden Gnome Lock Badge floating atop central horn
      const lockGroup = new THREE.Group();
      lockGroup.position.set(0, 4.4, 0.4);
      const lockBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.52, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.65, roughness: 0.3 })
      );
      const lockShackle = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.065, 6, 14, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 0.7, roughness: 0.25 })
      );
      lockShackle.rotation.z = Math.PI;
      lockShackle.position.y = 0.32;
      lockGroup.add(lockBody);
      lockGroup.add(lockShackle);
      this.shieldLock = lockGroup;
      this.bodyGroup.add(this.shieldLock);
    }
  }

  /**
   * Builds an expressive cartoon eye with a protruding fleshy socket mound,
   * glossy off-white sclera, vibrant lime iris, obsidian pupil, double specular glints,
   * and an arched sculpted eyelid hood.
   */
  createCartoonEye(radius = 0.28, isRight = false, isMonster = true) {
    const eyeGroup = new THREE.Group();

    // 1. Protruding Fleshy Socket Mound (ensures eye sits proudly outside the droplet surface)
    const socketGeo = new THREE.SphereGeometry(radius * 1.35, 14, 10);
    socketGeo.scale(1.15, 1.0, 0.85);
    const socketMat = new THREE.MeshStandardMaterial({
      color: isMonster ? 0x3ea813 : 0x40a312,
      roughness: 0.18,
      metalness: 0.06,
      emissive: 0x1b4a08,
      emissiveIntensity: 0.42
    });
    const socketMesh = new THREE.Mesh(socketGeo, socketMat);
    socketMesh.position.set(0, 0, -radius * 0.22);
    eyeGroup.add(socketMesh);

    // 2. Eyeball Rig (Sclera + Iris + Pupil + Catchlight Sparkles - all scale together during blinks)
    const eyeball = new THREE.Group();
    eyeball.position.set(0, 0, radius * 0.42);
    eyeGroup.add(eyeball);

    // Sclera: Off-white ivory sphere with gentle emissive glow so it's brilliant against green slime
    const scleraGeo = new THREE.SphereGeometry(radius, 16, 12);
    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.10,
      metalness: 0.02,
      emissive: 0xffffff,
      emissiveIntensity: 0.22
    });
    const scleraMesh = new THREE.Mesh(scleraGeo, scleraMat);
    scleraMesh.renderOrder = 3;
    eyeball.add(scleraMesh);

    // Iris: Radiant toxic lime ring
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      roughness: 0.18,
      emissive: 0x65a30d,
      emissiveIntensity: 0.65
    });
    const irisGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, 0.06, 16);
    irisGeo.rotateX(Math.PI / 2);
    const irisMesh = new THREE.Mesh(irisGeo, irisMat);
    irisMesh.position.set(0, 0, radius * 0.94);
    irisMesh.renderOrder = 4;
    eyeball.add(irisMesh);

    // Pupil: Deep dark obsidian
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x051201,
      roughness: 0.25
    });
    const pupilGeo = new THREE.CylinderGeometry(radius * 0.42, radius * 0.42, 0.08, 14);
    pupilGeo.rotateX(Math.PI / 2);
    const pupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
    pupilMesh.position.set(0, 0, radius * 0.96);
    pupilMesh.renderOrder = 5;
    eyeball.add(pupilMesh);

    // Double Specular Catchlights (Classic cartoon glints that bring the character to life)
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Primary bright glint (top corner)
    const glintMainGeo = new THREE.SphereGeometry(radius * 0.16, 8, 8);
    const glintMain = new THREE.Mesh(glintMainGeo, glintMat);
    const glintX = isRight ? radius * 0.16 : -radius * 0.16;
    glintMain.position.set(glintX, radius * 0.18, radius * 1.02);
    glintMain.renderOrder = 6;
    eyeball.add(glintMain);

    // Secondary cute mini-glint (opposite bottom corner)
    const glintSubGeo = new THREE.SphereGeometry(radius * 0.08, 6, 6);
    const glintSub = new THREE.Mesh(glintSubGeo, glintMat);
    glintSub.position.set(-glintX * 0.75, -radius * 0.16, radius * 1.02);
    glintSub.renderOrder = 6;
    eyeball.add(glintSub);

    // 3. Sculpted Upper Eyelid Hood (gives grumpy/mischievous cartoon attitude)
    if (isMonster) {
      const lidGeo = new THREE.SphereGeometry(radius * 1.08, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.44);
      const lidMat = new THREE.MeshStandardMaterial({
        color: 0x338f11,
        roughness: 0.22,
        emissive: 0x194507,
        emissiveIntensity: 0.38,
        side: THREE.DoubleSide
      });
      const lidMesh = new THREE.Mesh(lidGeo, lidMat);
      lidMesh.rotation.x = 0.22;
      lidMesh.position.set(0, radius * 0.08, 0);
      lidMesh.renderOrder = 4;
      eyeGroup.add(lidMesh);
    }

    return { eyeGroup, eyeball };
  }

  /**
   * Sculpted cartoon brow arches with thick tapered goop ridges
   */
  createSculptedBrows() {
    const browGroup = new THREE.Group();

    const browMat = new THREE.MeshStandardMaterial({
      color: 0x1a4005,
      roughness: 0.32,
      emissive: 0x0d2103,
      emissiveIntensity: 0.30
    });

    const browGeoL = new THREE.CylinderGeometry(0.07, 0.16, 0.65, 8);
    browGeoL.rotateZ(Math.PI / 2);
    const browL = new THREE.Mesh(browGeoL, browMat);
    browL.position.set(-0.46, 0.72, 1.48);
    browL.rotation.z = -0.32;
    browL.rotation.y = -0.16;
    browL.renderOrder = 4;
    browGroup.add(browL);

    const browGeoR = new THREE.CylinderGeometry(0.16, 0.07, 0.65, 8);
    browGeoR.rotateZ(Math.PI / 2);
    const browR = new THREE.Mesh(browGeoR, browMat);
    browR.position.set(0.46, 0.72, 1.48);
    browR.rotation.z = 0.32;
    browR.rotation.y = 0.16;
    browR.renderOrder = 4;
    browGroup.add(browR);

    return { browGroup, browL, browR };
  }

  /**
   * Sculpted cartoon snout with thick gummy lips, dark oral cavity, and prominent ivory fangs
   */
  createSculptedMouth() {
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.16, 1.44);

    // 1. Protruding Gummy Goop Lips Rim
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0x368512,
      roughness: 0.18,
      metalness: 0.06,
      emissive: 0x184207,
      emissiveIntensity: 0.40
    });
    const lipGeo = new THREE.TorusGeometry(0.48, 0.14, 10, 20);
    lipGeo.scale(1.15, 0.72, 1.0);
    const lipMesh = new THREE.Mesh(lipGeo, lipMat);
    lipMesh.rotation.x = 0.08;
    lipMesh.renderOrder = 4;
    mouthGroup.add(lipMesh);

    // 2. Deep Oral Cavity
    const cavityMat = new THREE.MeshBasicMaterial({ color: 0x0a1702 });
    const cavityGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.20, 16);
    cavityGeo.rotateX(Math.PI / 2);
    cavityGeo.scale(1.15, 0.72, 1.0);
    const cavityMesh = new THREE.Mesh(cavityGeo, cavityMat);
    cavityMesh.position.set(0, 0, -0.06);
    cavityMesh.renderOrder = 3;
    mouthGroup.add(cavityMesh);

    // 3. Chunky Cartoon Fangs
    const toothMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3, // Creamy ivory
      roughness: 0.18,
      metalness: 0.08,
      emissive: 0xfef08a,
      emissiveIntensity: 0.30
    });

    // Upper fangs (prominent drooping cartoon fangs)
    const upperFangPositions = [
      { x: -0.28, y: 0.15, z: 0.10, scale: 1.25, rotZ: 0.16 },
      { x: 0.28, y: 0.15, z: 0.10, scale: 1.25, rotZ: -0.16 },
      { x: -0.11, y: 0.20, z: 0.08, scale: 0.85, rotZ: 0.05 },
      { x: 0.11, y: 0.20, z: 0.08, scale: 0.85, rotZ: -0.05 }
    ];

    for (const pos of upperFangPositions) {
      const toothGeo = new THREE.ConeGeometry(0.09 * pos.scale, 0.24 * pos.scale, 8);
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.rotation.x = Math.PI - 0.20; // Angle forward-down
      tooth.rotation.z = pos.rotZ;
      tooth.position.set(pos.x, pos.y, pos.z);
      tooth.renderOrder = 5;
      mouthGroup.add(tooth);
    }

    // Lower fangs (poking up from bottom lip)
    const lowerFangPositions = [
      { x: -0.18, y: -0.17, z: 0.11, scale: 1.05, rotZ: -0.10 },
      { x: 0.18, y: -0.17, z: 0.11, scale: 1.05, rotZ: 0.10 }
    ];

    for (const pos of lowerFangPositions) {
      const toothGeo = new THREE.ConeGeometry(0.085 * pos.scale, 0.20 * pos.scale, 8);
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.rotation.x = 0.24; // Angle forward-up
      tooth.rotation.z = pos.rotZ;
      tooth.position.set(pos.x, pos.y, pos.z);
      tooth.renderOrder = 5;
      mouthGroup.add(tooth);
    }

    return mouthGroup;
  }

  createArm(x, y, z, isRightArm = false) {
    const armPivot = new THREE.Group();
    armPivot.position.set(x, y, z);

    const armGeo = new THREE.CylinderGeometry(0.12, 0.20, 0.85, 10);
    armGeo.translate(0, -0.42, 0);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x48bb1b,
      roughness: 0.22,
      metalness: 0.08,
      emissive: 0x1f540a,
      emissiveIntensity: 0.35,
      flatShading: false
    });
    const arm = new THREE.Mesh(armGeo, armMat);
    armPivot.add(arm);

    // 3-fingered goop hand
    const palmGeo = new THREE.SphereGeometry(0.20, 8, 8);
    const palm = new THREE.Mesh(palmGeo, armMat);
    palm.position.y = -0.85;
    armPivot.add(palm);

    const fingerGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.24, 6);
    for (let f = -1; f <= 1; f++) {
      const finger = new THREE.Mesh(fingerGeo, armMat);
      finger.position.set(f * 0.1, -1.02, 0);
      finger.rotation.z = f * 0.25;
      armPivot.add(finger);
    }

    return armPivot;
  }

  createRockArm(x, y, z, isRightArm = false) {
    const armPivot = new THREE.Group();
    armPivot.position.set(x, y, z);

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x474236,
      roughness: 0.88,
      metalness: 0.12,
      flatShading: true
    });
    const mossMat = new THREE.MeshStandardMaterial({
      color: 0x275e11,
      roughness: 0.28,
      metalness: 0.08,
      emissive: 0x123605,
      emissiveIntensity: 0.4
    });

    // Heavy boulder shoulder pauldron
    const pauldronGeo = new THREE.DodecahedronGeometry(0.65, 1);
    const pauldron = new THREE.Mesh(pauldronGeo, rockMat);
    pauldron.position.set(0, 0.1, 0);
    armPivot.add(pauldron);

    // Gnarled arm segment
    const armGeo = new THREE.CylinderGeometry(0.26, 0.38, 1.45, 8);
    armGeo.translate(0, -0.72, 0);
    const arm = new THREE.Mesh(armGeo, mossMat);
    armPivot.add(arm);

    // Stone elbow spike
    const spikeGeo = new THREE.ConeGeometry(0.18, 0.48, 6);
    spikeGeo.rotateX(Math.PI / 2);
    const spike = new THREE.Mesh(spikeGeo, rockMat);
    spike.position.set(0, -0.72, -0.32);
    armPivot.add(spike);

    // Massive stone fist with 3 heavy claw fingers
    const fistGeo = new THREE.DodecahedronGeometry(0.44, 0);
    const fist = new THREE.Mesh(fistGeo, rockMat);
    fist.position.y = -1.55;
    armPivot.add(fist);

    for (let f = -1; f <= 1; f++) {
      const clawGeo = new THREE.ConeGeometry(0.11, 0.42, 6);
      clawGeo.rotateX(Math.PI);
      const claw = new THREE.Mesh(clawGeo, rockMat);
      claw.position.set(f * 0.22, -1.92, 0.08);
      claw.rotation.z = f * 0.25;
      armPivot.add(claw);
    }

    // Held rock for throwing (visible during windup on right arm)
    if (isRightArm) {
      const heldRockGeo = new THREE.DodecahedronGeometry(0.55, 1);
      const heldRock = new THREE.Mesh(heldRockGeo, rockMat);
      heldRock.position.set(0, -1.95, 0.25);
      heldRock.visible = false;
      armPivot.add(heldRock);
      this.heldRock = heldRock;
    }

    return armPivot;
  }

  breakShield() {
    if (!this.isShielded) return;
    this.isShielded = false;
    sounds.playBubblePop(0.5);
    sounds.playRockCrash();

    // Spawn burst of green energy shards
    this.spawnShieldShatterParticles();

    if (this.shieldMesh) {
      this.bodyGroup.remove(this.shieldMesh);
      this.shieldMesh.geometry.dispose();
      this.shieldMat.dispose();
      this.shieldMesh = null;
    }
    if (this.shieldLock) {
      this.bodyGroup.remove(this.shieldLock);
      this.shieldLock = null;
    }

    // Boss recoil / wince animation
    this.hitStun = 0.8;
    if (this.eyeL) this.eyeL.scale.y = 0.1;
    if (this.eyeR) this.eyeR.scale.y = 0.1;
  }

  spawnShieldShatterParticles() {
    const shardGeo = new THREE.DodecahedronGeometry(0.22, 0);
    const shardMat = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.9
    });

    for (let i = 0; i < 20; i++) {
      const p = new THREE.Mesh(shardGeo, shardMat);
      p.position.copy(this.position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 2.0,
        1.8 + (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 2.0
      ));
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 4.5;
      p.userData = {
        vel: new THREE.Vector3(Math.cos(angle) * speed, 2.0 + Math.random() * 3.0, Math.sin(angle) * speed),
        rotVel: new THREE.Vector3((Math.random() - 0.5) * 8.0, (Math.random() - 0.5) * 8.0, (Math.random() - 0.5) * 8.0),
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4
      };
      if (this.group.parent) {
        this.group.parent.add(p);
        this.shieldShatterParticles.push(p);
      }
    }
  }

  /**
   * Calculate boss enrage phase based on remaining health.
   * Phase 1 (10-8 HP): Standard attacks, standard cooldown
   * Phase 2 (7-5 HP): Faster attacks, radial ring spreads, amber tint
   * Phase 3 (4-1 HP): Furious attacks, ground pounds, toxic ember glow
   */
  getBossPhase() {
    if (this.stage !== SLIME_STAGE.BOSS) return 0;
    if (this.health >= 8) return 1;
    if (this.health >= 5) return 2;
    return 3;
  }

  /** Phase-scaled attack cooldown: Phase 1 = 4.2s, Phase 2 = 2.8s, Phase 3 = 1.8s */
  getBossCooldown() {
    const phase = this.getBossPhase();
    if (phase === 3) return 1.8 + Math.random() * 0.8;
    if (phase === 2) return 2.8 + Math.random() * 1.2;
    return 4.0 + Math.random() * 2.0;
  }

  /**
   * Pick the next boss attack type, cycling through available attacks per phase.
   * Phase 1: algae lob or rock
   * Phase 2: adds radial ring spread
   * Phase 3: adds ground pound tidal wave
   */
  pickBossAttackType() {
    const phase = this.getBossPhase();
    this.bossAttackIndex++;

    if (phase === 1) {
      // Standard attacks: 60% algae, 40% rock
      return Math.random() > 0.4 ? 'algae' : 'rock';
    }

    if (phase === 2) {
      // Cycle: algae → ring → rock → ring → ...
      const cycle = this.bossAttackIndex % 4;
      if (cycle === 1 || cycle === 3) return 'ring';
      return Math.random() > 0.4 ? 'algae' : 'rock';
    }

    // Phase 3: algae → ring → ground_pound → rock → ring → ground_pound → ...
    const cycle = this.bossAttackIndex % 6;
    if (cycle === 2 || cycle === 5) return 'ground_pound';
    if (cycle === 1 || cycle === 4) return 'ring';
    return Math.random() > 0.4 ? 'algae' : 'rock';
  }

  /** Update boss visual enrage indicators (color, breathing, eye glow) */
  updateBossEnrageVisuals(time, dt) {
    if (this.stage !== SLIME_STAGE.BOSS) return;

    const phase = this.getBossPhase();
    if (phase !== this.bossPhase) {
      this.bossPhase = phase;
      // Phase transition flash
      if (this.coreMesh && this.coreMesh.material) {
        this.coreMesh.material.emissiveIntensity = 2.5;
      }
      try { sounds.playBubblePop(0.35); } catch (e) { /* optional */ }
    }

    // Capture original body color on first call
    if (!this.originalBodyColor && this.coreMesh && this.coreMesh.material) {
      this.originalBodyColor = this.coreMesh.material.color.clone();
    }

    // Phase-based color shifting
    const targetLerp = phase === 3 ? 1.0 : (phase === 2 ? 0.4 : 0.0);
    this.enrageColorLerp += (targetLerp - this.enrageColorLerp) * dt * 2.0;

    if (this.coreMesh && this.coreMesh.material && this.originalBodyColor) {
      const enrageColor = phase === 3
        ? new THREE.Color(0.92, 0.27, 0.17)  // Burning toxic ember
        : new THREE.Color(0.85, 0.68, 0.18); // Amber-green
      this.coreMesh.material.color.copy(this.originalBodyColor).lerp(enrageColor, this.enrageColorLerp);

      // Pulsing emissive in phase 2/3
      const emissivePulse = phase >= 2 ? (0.3 + Math.sin(time * (phase === 3 ? 6.0 : 3.5)) * 0.25) : 0.1;
      this.coreMesh.material.emissiveIntensity = Math.max(emissivePulse,
        this.coreMesh.material.emissiveIntensity * (1.0 - dt * 3.0));
    }

    // Red pulsing eyes in phase 3
    if (phase === 3) {
      const eyeGlow = 0.8 + Math.sin(time * 8.0) * 0.2;
      if (this.eyeL && this.eyeL.material) {
        this.eyeL.material.emissive = this.eyeL.material.emissive || new THREE.Color();
        this.eyeL.material.emissive.setRGB(eyeGlow, 0.1, 0.05);
        this.eyeL.material.emissiveIntensity = 1.5;
      }
      if (this.eyeR && this.eyeR.material) {
        this.eyeR.material.emissive = this.eyeR.material.emissive || new THREE.Color();
        this.eyeR.material.emissive.setRGB(eyeGlow, 0.1, 0.05);
        this.eyeR.material.emissiveIntensity = 1.5;
      }
    }
  }

  hit(damage = 1, isBigBell = false) {
    if (this.isShielded) {
      // Impenetrable shield deflection!
      sounds.playSlimeSplat();
      this.shieldFlashTimer = 0.45;
      if (this.shieldMat) {
        this.shieldMat.emissiveIntensity = 1.8;
        this.shieldMat.opacity = 0.78;
      }
      return { shielded: true };
    }

    // Miniboss armored hide: standard 1-dmg bell chimes deflect off its thick rubbery bog bulk!
    // However, heavy gnome spells (Steam Surge, Resonant Harmonic), ramming, and Big Bell penetrate!
    if (this.stage === SLIME_STAGE.BOSS && !isBigBell) {
      if (damage > 1) {
        // Heavy attacks chip boss bulk for balanced damage (1-2 HP max)
        damage = Math.min(2, Math.max(1, Math.floor(damage * 0.5)));
      } else {
        sounds.playSlimeSplat();
        this.hitStun = 0.22;
        // Slight defensive recoil wobble
        this.wakeWobble = 0.6;
        return { immuneToNormalBell: true, health: this.health };
      }
    }

    this.health -= damage;
    this.hitStun = isBigBell ? 0.65 : 0.35;
    sounds.playSlimeSplat();

    // Wince animation on hit
    if (this.eyeL) this.eyeL.scale.y = 0.12;
    if (this.eyeR) this.eyeR.scale.y = 0.12;
    this.isBlinking = true;
    this.blinkTimer = isBigBell ? 0.6 : 0.35;

    // Big Bell impact squish
    if (isBigBell) {
      this.wakeWobble = 1.2;
      sounds.playBubblePop(0.55);
    }

    if (this.health <= 0) {
      this.isDead = true;
      sounds.playBubblePop(this.stage === SLIME_STAGE.BOSS ? 0.45 : (this.stage === SLIME_STAGE.MONSTER ? 0.7 : 1.2));
      return true; // Destroyed
    }

    // Shrink slightly on damage
    this.scale = Math.max(0.65, this.scale * (isBigBell ? 0.88 : 0.92));
    return false;
  }

  applyWakeWobble(intensity, dt) {
    this.wakeWobbleVel += intensity * 18.0 * dt;
    this.wakeWobble = Math.min(1.4, this.wakeWobble + intensity * 0.4);
  }

  update(dt, time, boatPosition, onLaunchProjectile, onBubbleHatch, onLaunchRock = null, onLaunchRing = null, onGroundPound = null, scumClots = null, onBossHealed = null) {
    if (this.isDead) return;

    // 0. Update Miniboss Body Energy Shield & Lock Badge
    if (this.isShielded) {
      if (this.shieldUniforms) {
        this.shieldUniforms.uTime.value = time;
        if (this.shieldFlashTimer > 0) {
          this.shieldFlashTimer -= dt;
          this.shieldUniforms.uHitFlash.value = Math.max(0.0, this.shieldFlashTimer / 0.35);
        } else {
          this.shieldUniforms.uHitFlash.value = 0.0;
        }
      }
      if (this.shieldLock) {
        this.shieldLock.rotation.y = time * 2.2;
        this.shieldLock.position.y = 4.4 + Math.sin(time * 4.5) * 0.18;
      }
    }

    // Update shield shatter particles
    for (let i = this.shieldShatterParticles.length - 1; i >= 0; i--) {
      const p = this.shieldShatterParticles[i];
      p.userData.life += dt;
      const prog = p.userData.life / p.userData.maxLife;
      p.position.addScaledVector(p.userData.vel, dt);
      p.userData.vel.y -= 9.8 * dt;
      p.rotation.x += p.userData.rotVel.x * dt;
      p.rotation.y += p.userData.rotVel.y * dt;
      p.rotation.z += p.userData.rotVel.z * dt;
      p.scale.setScalar((1.0 - prog) * 1.2);
      if (prog >= 1.0) {
        if (p.parent) p.parent.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.shieldShatterParticles.splice(i, 1);
      }
    }

    // Hit stun shudder: shakes the body, not the surface film on water
    if (this.hitStun > 0) {
      this.hitStun -= dt;
      this.bodyGroup.rotation.z = Math.sin(time * 35.0) * 0.16;
    } else {
      this.bodyGroup.rotation.z = 0;
    }

    // Dynamic boat wake wobble physics & jello spring
    if (this.wakeWobble > 0.001 || Math.abs(this.wakeWobbleVel) > 0.001) {
      this.wakeWobbleVel += (-this.wakeWobble * 24.0) * dt;
      this.wakeWobbleVel *= Math.pow(0.12, dt);
      this.wakeWobble += this.wakeWobbleVel * dt;
      this.wakeWobble = Math.max(0, Math.min(1.5, this.wakeWobble));
    } else {
      this.wakeWobble = 0;
      this.wakeWobbleVel = 0;
    }

    if (this.hitStun <= 0) {
      if (this.eyeL) this.eyeL.scale.y = 1.0;
      if (this.eyeR) this.eyeR.scale.y = 1.0;
    }

    // Wake wobble dampening
    if (this.wakeWobble > 0) {
      this.wakeWobble = Math.max(0, this.wakeWobble - dt * 2.8);
    }

    // 1. Fluid Surface Film Breathing & Wake Lapping
    if (this.filmMesh) {
      const swell = Math.sin(time * 2.4 + this.wobblePhase);
      const wakeRipple = Math.sin(time * 12.0) * this.wakeWobble * 0.16;

      const filmExpandX = 1.0 + swell * 0.06 + wakeRipple;
      const filmExpandZ = 1.0 + Math.cos(time * 2.4 + this.wobblePhase) * 0.05 + wakeRipple;
      this.filmMesh.scale.set(filmExpandX, 1.0, filmExpandZ);

      // 3. Satellite droplets floating & bobbing with gentle water lapping
      if (this.filmDrops) {
        for (const drop of this.filmDrops) {
          drop.mesh.position.y = 0.025 + Math.sin(time * 3.0 + drop.phase) * 0.012;
          const dropWobble = 1.0 + Math.sin(time * 4.0 + drop.phase) * 0.08;
          drop.mesh.scale.set(dropWobble, 1.0, dropWobble);
        }
      }
    }

    // Update Stink Fume Vapors
    this.updateStinkVapors(dt, time);

    // Update Organic Surface Film Bubbles & Propagation
    this.updateSurfaceFilmBubbles(dt, time, onBubbleHatch);

    // Lifecycle evolution & natural fluid jello breathing
    if (this.stage === SLIME_STAGE.FILM) {
      this.growthTimer += dt;
      // Gentle surface pulsation + wake jiggle
      const wakeJiggle = Math.sin(time * 12.0) * this.wakeWobble * 0.14;
      const squish = (1.0 + Math.sin(time * 2.0 + this.wobblePhase) * 0.04) * (1.0 + wakeJiggle);
      this.coreMesh.scale.set(squish, squish, squish);

      if (this.growthTimer > this.growthThreshold) {
        this.stage = SLIME_STAGE.BLOB;
        this.health = 2;
        this.maxHealth = 2;
        this.growthTimer = 0;
        this.growthThreshold = 18.0 + Math.random() * 8.0;
        this.buildMeshForStage();
      }

    } else if (this.stage === SLIME_STAGE.BLOB) {
      this.growthTimer += dt;
      this.throwTimer -= dt;

      // Natural jello breathing & volume-preserving fluid squish + wake wobble on body
      const swell = Math.sin(time * 3.2 + this.wobblePhase);
      const wakeSquish = Math.sin(time * 13.0) * this.wakeWobble * 0.22;
      const squishXZ = 1.0 + swell * 0.08 + wakeSquish;
      const squishY = 1.0 - swell * 0.10 - wakeSquish * 0.7;
      this.coreMesh.scale.set(1.15 * squishXZ, 0.76 * squishY, 1.15 * squishXZ);
      this.bodyGroup.rotation.z = Math.sin(time * 11.0) * this.wakeWobble * 0.18;
      this.bodyGroup.position.y = Math.sin(time * 11.0) * this.wakeWobble * 0.06;

      if (this.faceGroup) {
        this.faceGroup.scale.set(squishXZ, squishY, squishXZ);
      }

      // Eye Blinking Animation for Blob
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        if (!this.isBlinking) {
          this.isBlinking = true;
          if (this.eyeL) this.eyeL.scale.y = 0.12;
          if (this.eyeR) this.eyeR.scale.y = 0.12;
        } else {
          this.isBlinking = false;
          if (this.eyeL) this.eyeL.scale.y = 1.0;
          if (this.eyeR) this.eyeR.scale.y = 1.0;
          this.blinkTimer = 2.5 + Math.random() * 3.5;
        }
      }

      // Periodic burp / spore launch to propagate
      if (this.throwTimer <= 0) {
        this.throwTimer = 16.0 + Math.random() * 10.0;
        if (onLaunchProjectile) {
          const throwAngle = Math.random() * Math.PI * 2;
          const throwDist = 6.0 + Math.random() * 12.0;
          const target = new THREE.Vector3(
            this.position.x + Math.cos(throwAngle) * throwDist,
            0.05,
            this.position.z + Math.sin(throwAngle) * throwDist
          );
          sounds.playSlimeThrow();
          onLaunchProjectile(this.position.clone().add(new THREE.Vector3(0, 0.8, 0)), target);
        }
      }

      if (this.growthTimer > this.growthThreshold) {
        // Evolve into expressive monster!
        this.stage = SLIME_STAGE.MONSTER;
        this.health = 3;
        this.maxHealth = 3;
        this.buildMeshForStage();
      }

    } else if (this.stage === SLIME_STAGE.MONSTER || this.stage === SLIME_STAGE.BOSS) {
      // Look towards player tugboat: only rotate bodyGroup, NOT filmGroup!
      const dx = boatPosition.x - this.position.x;
      const dz = boatPosition.z - this.position.z;
      const angleToBoat = Math.atan2(dx, dz);
      this.bodyGroup.rotation.y = angleToBoat;

      // Jiggle antennae stalks / horns
      if (this.antennaeGroup) {
        this.antennaeGroup.rotation.z = Math.sin(time * 4.0 + this.wobblePhase) * 0.12;
        this.antennaeGroup.rotation.x = Math.cos(time * 3.0) * 0.08;
      }
      if (this.hornsGroup) {
        this.hornsGroup.rotation.z = Math.sin(time * 3.0 + this.wobblePhase) * 0.06;
        this.hornsGroup.rotation.x = Math.cos(time * 2.5) * 0.04;
      }

      // Eye Blinking Animation
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        if (!this.isBlinking) {
          this.isBlinking = true;
          if (this.eyeL) this.eyeL.scale.y = 0.12;
          if (this.eyeR) this.eyeR.scale.y = 0.12;
        } else {
          this.isBlinking = false;
          if (this.eyeL) this.eyeL.scale.y = 1.0;
          if (this.eyeR) this.eyeR.scale.y = 1.0;
          this.blinkTimer = 2.5 + Math.random() * 3.5;
        }
      }

      // Boss Enrage Visuals
      if (this.stage === SLIME_STAGE.BOSS) {
        this.updateBossEnrageVisuals(time, dt);

        // 1. Slow Tactical Boss Movement & Scum Ingestion
        if (!this.isGroundPounding && !this.isDead) {
          let targetX = boatPosition.x;
          let targetZ = boatPosition.z;
          let targetType = 'boat';

          // Seek nearest uncollected floating algae scum clot within 24 meters
          if (scumClots && scumClots.length > 0) {
            let closestClot = null;
            let minClotDist = 24.0;
            for (let cIdx = 0; cIdx < scumClots.length; cIdx++) {
              const clot = scumClots[cIdx];
              if (!clot.isCollected) {
                const d = Math.hypot(clot.position.x - this.position.x, clot.position.z - this.position.z);
                if (d < minClotDist) {
                  minClotDist = d;
                  closestClot = clot;
                }
              }
            }
            if (closestClot) {
              targetX = closestClot.position.x;
              targetZ = closestClot.position.z;
              targetType = 'clot';
            }
          }

          // Movement speed scales across boss phases
          const phase = this.getBossPhase ? this.getBossPhase() : 1;
          const speed = phase === 3 ? 1.65 : (phase === 2 ? 1.25 : 0.85);

          const moveDx = targetX - this.position.x;
          const moveDz = targetZ - this.position.z;
          const targetDist = Math.hypot(moveDx, moveDz);

          // Stop at safe buffer from boat so it doesn't clip directly into boat hull
          const minStopDist = targetType === 'boat' ? 5.2 : 0.4;
          if (targetDist > minStopDist) {
            const step = Math.min(targetDist, speed * dt);
            this.position.x += (moveDx / targetDist) * step;
            this.position.z += (moveDz / targetDist) * step;

            // Constrain within pond boundaries (radius ~ 31.0m)
            const distFromCenter = Math.hypot(this.position.x, this.position.z);
            if (distFromCenter > 31.0) {
              const ang = Math.atan2(this.position.z, this.position.x);
              this.position.x = Math.cos(ang) * 31.0;
              this.position.z = Math.sin(ang) * 31.0;
            }

            this.group.position.x = this.position.x;
            this.group.position.z = this.position.z;
          }

          // Water surface height bobbing
          const waterY = getWaterSurfaceHeight(this.position.x, this.position.z, time);
          this.position.y = waterY;
          this.group.position.y = this.position.y;

          // Absorb scum clots & regenerate health
          if (scumClots) {
            for (let cIdx = scumClots.length - 1; cIdx >= 0; cIdx--) {
              const clot = scumClots[cIdx];
              if (!clot.isCollected) {
                const clotDist = Math.hypot(clot.position.x - this.position.x, clot.position.z - this.position.z);
                if (clotDist < 3.4) {
                  clot.isCollected = true;
                  clot.dispose(this.group.parent || null);
                  scumClots.splice(cIdx, 1);

                  this.bossHealCooldown = this.bossHealCooldown || 0;
                  if (this.health < this.maxHealth && this.bossHealCooldown <= 0) {
                    this.health = Math.min(this.maxHealth, this.health + 1);
                    this.bossHealCooldown = 2.5; // Throttle: at most +1 HP per 2.5s
                    this.healFlashTimer = 0.6;
                    if (onBossHealed) {
                      onBossHealed(this, clot.value || 1);
                    }
                    try { sounds.playBubblePop(0.45); } catch (e) {}
                  }
                }
              }
            }
          }
        }

        // Healing cooldown & flash visual update
        if (this.bossHealCooldown > 0) {
          this.bossHealCooldown -= dt;
        }
        if (this.healFlashTimer > 0) {
          this.healFlashTimer -= dt;
          if (this.coreMesh && this.coreMesh.material) {
            this.coreMesh.material.emissive.setHex(0x22c55e);
            this.coreMesh.material.emissiveIntensity = 1.3;
          }
        }
      }

      // === GROUND POUND STATE MACHINE (Boss Phase 3 only) ===
      if (this.isGroundPounding && this.stage === SLIME_STAGE.BOSS) {
        this.groundPoundTimer += dt;

        if (this.groundPoundStage === 1) {
          // Telegraph: boss rears up, arms raise, body lifts
          const telegraphDuration = 1.0;
          const t = Math.min(1.0, this.groundPoundTimer / telegraphDuration);
          const easeUp = t * t; // Quadratic ease-in
          this.bodyGroup.position.y = easeUp * 4.5;
          this.coreMesh.scale.set(1.0 - easeUp * 0.15, 1.0 + easeUp * 0.3, 1.0 - easeUp * 0.15);
          if (this.leftArm) this.leftArm.rotation.z = 0.35 + easeUp * 1.2;
          if (this.rightArm) this.rightArm.rotation.z = -0.35 - easeUp * 1.2;

          if (this.groundPoundTimer >= telegraphDuration) {
            this.groundPoundStage = 2;
            this.groundPoundTimer = 0;
          }
        } else if (this.groundPoundStage === 2) {
          // Airborne hover (brief pause for drama)
          const hoverDuration = 0.3;
          const wobble = Math.sin(this.groundPoundTimer * 30.0) * 0.1;
          this.bodyGroup.position.y = 4.5 + wobble;

          if (this.groundPoundTimer >= hoverDuration) {
            this.groundPoundStage = 3;
            this.groundPoundTimer = 0;
          }
        } else if (this.groundPoundStage === 3) {
          // IMPACT: slam down!
          const impactDuration = 0.2;
          const t = Math.min(1.0, this.groundPoundTimer / impactDuration);
          const easeCrash = 1.0 - (1.0 - t) * (1.0 - t); // Ease-out
          this.bodyGroup.position.y = 4.5 * (1.0 - easeCrash);
          this.coreMesh.scale.set(1.0 + easeCrash * 0.3, 1.0 - easeCrash * 0.25, 1.0 + easeCrash * 0.3);

          if (this.groundPoundTimer >= impactDuration) {
            // Trigger the tidal wave via callback
            if (onGroundPound) {
              onGroundPound(this);
            }
            try { sounds.playGroundPound(); } catch (e) { /* optional */ }

            // Reset
            this.isGroundPounding = false;
            this.groundPoundStage = 0;
            this.groundPoundTimer = 0;
            this.bodyGroup.position.y = 0;
            this.coreMesh.scale.set(1.05, 1.05, 1.05);
            if (this.leftArm) this.leftArm.rotation.z = 0.35;
            if (this.rightArm) this.rightArm.rotation.z = -0.35;
            this.throwTimer = this.getBossCooldown();
            this.wakeWobble = 1.4;
          }
        }
        // Skip normal attack logic during ground pound
      } else {
        // Throw Windup and Attack Cycle
        this.throwTimer -= dt;

        if (!this.isWindingUp && this.throwTimer <= 1.2) {
          this.isWindingUp = true;
          this.windupTime = 0;
          if (this.heldRock) this.heldRock.visible = true;
        }

        if (this.isWindingUp) {
          this.windupTime += dt;
          const windProgress = Math.min(1.0, this.windupTime / 1.2);
          this.coreMesh.rotation.x = -windProgress * 0.35;
          if (this.faceGroup) {
            this.faceGroup.rotation.x = -windProgress * 0.35;
          }
          if (this.rightArm) {
            const armRotX = this.stage === SLIME_STAGE.BOSS ? -windProgress * 2.2 : -windProgress * 1.8;
            this.rightArm.rotation.x = armRotX;
            this.rightArm.rotation.z = -0.4;
          }

          if (this.windupTime >= 1.2) {
            this.isWindingUp = false;

            if (this.heldRock) this.heldRock.visible = false;

            if (this.stage === SLIME_STAGE.BOSS) {
              // === MULTI-PHASE BOSS ATTACK DISPATCH ===
              const attackType = this.pickBossAttackType();
              const bossOrigin = this.position.clone().add(new THREE.Vector3(0, 3.2, 0));

              if (attackType === 'ground_pound') {
                // Initiate ground pound state machine
                this.isGroundPounding = true;
                this.groundPoundStage = 1;
                this.groundPoundTimer = 0;
                try { sounds.playSlimeThrow(); } catch (e) { /* optional */ }

              } else if (attackType === 'ring') {
                // Radial bullet-heaven ring spread
                const ringCount = this.getBossPhase() === 3 ? 12 : 8;
                if (onLaunchRing) {
                  sounds.playSlimeThrow();
                  onLaunchRing(bossOrigin, ringCount, true);
                }
                this.throwTimer = this.getBossCooldown();

              } else if (attackType === 'algae' || this.isShielded) {
                // Standard algae lob
                const target = Math.random() > 0.35
                  ? boatPosition.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3.2, 0, (Math.random() - 0.5) * 3.2))
                  : new THREE.Vector3(
                      this.position.x + (Math.random() - 0.5) * 25, 0.05,
                      this.position.z + (Math.random() - 0.5) * 25
                    );
                if (onLaunchProjectile) {
                  sounds.playSlimeThrow();
                  onLaunchProjectile(bossOrigin, target, true);
                }

                // Phase 2+: rapid mortar burst — fire 2 extra aimed projectiles
                if (this.getBossPhase() >= 2 && onLaunchProjectile) {
                  for (let burst = 0; burst < 2; burst++) {
                    const spreadTarget = boatPosition.clone().add(
                      new THREE.Vector3((Math.random() - 0.5) * 6.0, 0, (Math.random() - 0.5) * 6.0)
                    );
                    setTimeout(() => {
                      if (onLaunchProjectile) {
                        onLaunchProjectile(bossOrigin, spreadTarget, true);
                      }
                    }, (burst + 1) * 200);
                  }
                }
                this.throwTimer = this.getBossCooldown();

              } else {
                // Rock throw
                const target = boatPosition.clone().add(
                  new THREE.Vector3((Math.random() - 0.5) * 4.0, 0, (Math.random() - 0.5) * 4.0)
                );
                if (onLaunchRock) {
                  sounds.playRockThrow();
                  onLaunchRock(bossOrigin, target);
                }
                this.throwTimer = this.getBossCooldown();
              }

            } else {
              // Non-boss monster: simple algae lob
              const target = Math.random() > 0.35
                ? boatPosition.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3.2, 0, (Math.random() - 0.5) * 3.2))
                : new THREE.Vector3(
                    this.position.x + (Math.random() - 0.5) * 25, 0.05,
                    this.position.z + (Math.random() - 0.5) * 25
                  );
              this.throwTimer = 12.0 + Math.random() * 8.0;
              sounds.playSlimeThrow();
              if (onLaunchProjectile) {
                onLaunchProjectile(this.position.clone().add(new THREE.Vector3(0, 1.8, 0)), target, false);
              }
            }
          }
        } else {
          // Natural fluid breathing when idle + wake wobble
          const phase = this.getBossPhase();
          const breatheSpeed = this.stage === SLIME_STAGE.BOSS ? (2.8 + (phase - 1) * 1.5) : 2.8;
          const swell = Math.sin(time * breatheSpeed + this.wobblePhase);
          const wakeSquish = Math.sin(time * 13.0) * this.wakeWobble * 0.18;
          const squishXZ = 1.0 + swell * 0.05 + wakeSquish;
          const squishY = 1.0 - swell * 0.07 - wakeSquish * 0.7;
          this.coreMesh.scale.set(1.05 * squishXZ, 1.05 * squishY, 1.05 * squishXZ);
          this.coreMesh.rotation.x = 0;
          if (this.faceGroup) {
            this.faceGroup.scale.set(squishXZ, squishY, squishXZ);
            this.faceGroup.rotation.x = 0;
          }
          this.bodyGroup.rotation.z = Math.sin(time * 11.0) * this.wakeWobble * 0.18;
          this.bodyGroup.position.y = Math.sin(time * 11.0) * this.wakeWobble * 0.06;

          if (this.antennaeGroup) {
            this.antennaeGroup.rotation.z += Math.sin(time * 15.0) * this.wakeWobble * 0.35;
          }

          if (this.leftArm && this.rightArm) {
            this.leftArm.rotation.x = Math.sin(time * 4.5) * 0.5;
            this.leftArm.rotation.z = 0.35 + Math.cos(time * 3.0) * 0.2;
            this.rightArm.rotation.x = -Math.sin(time * 4.5) * 0.5;
            this.rightArm.rotation.z = -0.35 - Math.cos(time * 3.0) * 0.2;
          }
        }
      }
    }
  }

  updateSurfaceFilmBubbles(dt, time, onBubbleHatch) {
    this.bubbleSpawnTimer += dt;
    // Monsters produce bubbles fastest, then Blobs, then Films
    const spawnRate = this.stage === SLIME_STAGE.MONSTER ? 0.9 : (this.stage === SLIME_STAGE.BLOB ? 1.2 : 1.6);

    if (this.bubbleSpawnTimer >= spawnRate) {
      this.bubbleSpawnTimer = 0;

      // Fertile bubble check
      this.hatchTimer -= spawnRate;
      const isFertile = this.hatchTimer <= 0;
      if (isFertile) {
        this.hatchTimer = 20.0 + Math.random() * 12.0;
      }

      const bubbleGeo = new THREE.SphereGeometry(0.18, 10, 8);
      const bubbleMat = new THREE.MeshStandardMaterial({
        color: isFertile ? 0xc8ff38 : 0x76db20,
        emissive: isFertile ? 0x95f516 : 0x3da012,
        emissiveIntensity: isFertile ? 0.75 : 0.45,
        roughness: 0.12,
        metalness: 0.05,
        transparent: true,
        opacity: 0.92,
        depthWrite: false
      });

      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);

      // Random position distributed along the surface film
      const angle = Math.random() * Math.PI * 2;
      const dist = (0.25 + Math.random() * 0.70) * this.filmRadius;
      const bx = Math.cos(angle) * dist;
      const bz = Math.sin(angle) * dist;

      bubble.position.set(bx, 0.04, bz);
      bubble.scale.setScalar(0.08);

      bubble.userData = {
        life: 0,
        maxLife: isFertile ? 2.6 : (1.5 + Math.random() * 0.5),
        targetScale: isFertile ? (0.50 + Math.random() * 0.15) : (0.30 + Math.random() * 0.14),
        maxHeight: isFertile ? 0.38 : (0.20 + Math.random() * 0.16),
        seed: Math.random() * 20.0,
        isFertile: isFertile,
        bx: bx,
        bz: bz
      };

      this.filmGroup.add(bubble);
      this.bubbles.push(bubble);
    }

    // Update active bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.userData.life += dt;
      const progress = b.userData.life / b.userData.maxLife;

      // Swell and rise curve
      const riseProgress = Math.min(1.0, progress * 1.35);
      b.position.y = 0.04 + Math.sin(riseProgress * Math.PI * 0.5) * b.userData.maxHeight;

      // Surface tension fluid wobble
      let baseScale;
      if (progress < 0.4) {
        baseScale = THREE.MathUtils.lerp(0.08, b.userData.targetScale, progress / 0.4);
      } else {
        baseScale = b.userData.targetScale * (1.0 + Math.sin(progress * Math.PI * 3.0) * 0.08);
      }

      const wobbleX = 1.0 + Math.sin(time * 14.0 + b.userData.seed) * 0.14;
      const wobbleZ = 1.0 - Math.sin(time * 14.0 + b.userData.seed) * 0.14;
      const wobbleY = 1.0 + Math.cos(time * 12.0 + b.userData.seed) * 0.16;

      b.scale.set(baseScale * wobbleX, baseScale * wobbleY, baseScale * wobbleZ);

      // Fertile bubble pulsing glow
      if (b.userData.isFertile) {
        b.material.emissiveIntensity = 0.75 + Math.sin(time * 8.0) * 0.25;
      }

      // End of life: Hatch or Pop!
      if (progress >= 1.0) {
        const worldPos = new THREE.Vector3();
        b.getWorldPosition(worldPos);

        if (b.userData.isFertile) {
          // Coagulate and plop down as a new baby algae film/blob!
          if (onBubbleHatch) {
            onBubbleHatch(worldPos);
          }
        } else {
          // Playful wet pop
          sounds.playSoftBubblePop();
        }

        this.filmGroup.remove(b);
        b.geometry.dispose();
        b.material.dispose();
        this.bubbles.splice(i, 1);
      }
    }
  }

  updateStinkVapors(dt, time) {
    this.stinkSpawnTimer += dt;
    const spawnRate = this.stage === SLIME_STAGE.MONSTER ? 0.35 : (this.stage === SLIME_STAGE.BLOB ? 0.55 : 0.85);

    if (this.stinkSpawnTimer >= spawnRate) {
      this.stinkSpawnTimer = 0;

      // Soft, wispy noxious gas sprite
      const stinkTex = getStinkVaporTexture();
      const pMat = new THREE.SpriteMaterial({
        map: stinkTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      });
      const p = new THREE.Sprite(pMat);

      const spawnY = this.stage === SLIME_STAGE.MONSTER ? 1.4 : (this.stage === SLIME_STAGE.BLOB ? 0.65 : 0.12);
      p.position.set(
        (Math.random() - 0.5) * (this.radius * 0.75),
        spawnY + (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * (this.radius * 0.75)
      );

      const baseScale = 0.45 + Math.random() * 0.25;
      p.scale.set(baseScale, baseScale, 1.0);

      p.userData = {
        life: 0,
        maxLife: 2.0 + Math.random() * 0.8,
        driftY: 0.65 + Math.random() * 0.35,
        driftX: (Math.random() - 0.5) * 0.3,
        driftZ: (Math.random() - 0.5) * 0.3,
        baseScale: baseScale
      };

      this.group.add(p);
      this.stinkParticles.push(p);
    }

    // Update existing stink particles
    for (let i = this.stinkParticles.length - 1; i >= 0; i--) {
      const p = this.stinkParticles[i];
      p.userData.life += dt;
      const progress = p.userData.life / p.userData.maxLife;

      p.position.y += p.userData.driftY * dt;
      p.position.x += Math.sin(time * 2.0 + i) * dt * 0.25;
      p.position.z += Math.cos(time * 2.0 + i) * dt * 0.25;

      // Expand volumetric gas cloud
      const currentScale = p.userData.baseScale * (1.0 + progress * 2.4);
      p.scale.set(currentScale, currentScale, 1.0);

      // Smooth soft fade out
      p.material.opacity = 0.55 * Math.sin((1.0 - progress) * Math.PI * 0.5);

      if (progress >= 1.0) {
        this.group.remove(p);
        p.material.dispose();
        this.stinkParticles.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const p of this.stinkParticles) {
      if (p.parent) p.parent.remove(p);
      p.material.dispose();
    }
    this.stinkParticles = [];

    for (const b of this.bubbles) {
      if (b.parent) b.parent.remove(b);
      b.geometry.dispose();
      b.material.dispose();
    }
    this.bubbles = [];
  }
}
