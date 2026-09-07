import * as THREE from 'three';

/**
 * Analytical profile function for the pond bed depth.
 * Used by PondBed to shape the contoured basin mesh and place submerged pebbles.
 *
 * r <= 14: Deep center basin (-1.9m)
 * 14 < r <= 34: Smooth gentle slope from -1.9m up to -0.38m
 * 34 < r <= 39.5: Shallow sunlit gravel shelf (-0.38m to -0.06m)
 * 39.5 < r <= 42: Shoreline rising to grassy bank (+0.25m)
 * r > 42: Surrounding garden lawn (+0.25m)
 */
export function getPondBedHeight(r) {
  if (r <= 14) return -1.9;
  if (r >= 42) return 0.25;
  if (r > 39.5) {
    const t = (r - 39.5) / 2.5;
    return -0.06 + t * 0.31;
  }
  if (r > 34) {
    const t = (r - 34) / 5.5;
    return -0.38 + t * 0.32;
  }
  const t = (r - 14) / 20.0;
  const smooth = t * t * (3.0 - 2.0 * t);
  return -1.9 + smooth * 1.52;
}

/**
 * Analytical elevation function for the surrounding rolling hills landscape.
 * Evaluates smooth natural terrain heights from the pond shoreline (r = 41.5m)
 * out to the distant horizon (r = 135m).
 */
export function getRollingHillHeight(x, z) {
  const r = Math.hypot(x, z);
  if (r <= 41.5) return 0.25;

  // Preserve clearway for Port Bramble Pier and gangplank at South bank
  const isNearPier = (Math.abs(x) < 8.0 && z > 28.0);
  if (isNearPier) {
    // Gentle shoreline slope matching the pier deck
    const t = Math.min(1.0, (z - 28.0) / 10.0);
    return 0.25 + t * 0.15;
  }

  // Smooth blending transition from flat shoreline bank (r = 41.5 -> 48m)
  const blend = Math.min(1.0, (r - 41.5) / 6.5);
  const smoothBlend = blend * blend * (3.0 - 2.0 * blend);

  // Primary rolling countryside hills (broad harmonic swells)
  const h1 = 3.8 * Math.sin(x * 0.038 + 0.5) * Math.cos(z * 0.035 - 0.3);

  // Secondary undulating meadow ridges & knolls
  const h2 = 2.4 * Math.cos(x * 0.065 - 0.4) * Math.sin(z * 0.060 + 0.6);

  // Gentle tertiary mounds & hollows
  const h3 = 1.2 * Math.sin(x * 0.095) * Math.cos(z * 0.095);

  // Distant horizon elevation lift (cups the pond like a lush natural basin)
  const horizonDist = Math.max(0.0, r - 52.0);
  const horizonLift = Math.pow(horizonDist / 48.0, 1.35) * 8.5;

  const elevation = 0.25 + smoothBlend * (1.2 + h1 + h2 + h3 + horizonLift);
  return Math.max(0.25, elevation);
}

/**
 * Creates the underwater pond bed, contoured sloping basin with natural vertex colors,
 * perimeter river boulders, and sunlit submerged pebbles visible through clear water.
 */
export class PondBed {
  constructor(radius = 42) {
    this.radius = radius;
    this.group = new THREE.Group();
    this.rocks = [];

    this.createContouredBasin();
    // Legacy perimeter stones replaced by high-detail PerimeterFoliage
    this.createSubmergedPebbles();
  }

  createContouredBasin() {
    // Build a seamless, smoothly contoured radial basin mesh
    const rings = 30;
    const radialSegments = 56;
    const positions = [];
    const uvs = [];
    const colors = [];
    const indices = [];

    // Realistic riverbed color palette:
    const colDeep = new THREE.Color(0x384a3c);    // Deep lagoon silt & loam
    const colMid = new THREE.Color(0x566d54);     // River silt & mossy gravel
    const colShallow = new THREE.Color(0x8a8a65); // Sunlit golden sand & river gravel
    const colBank = new THREE.Color(0x42732d);    // Lush English garden lawn

    // Helper to evaluate natural bed color by radius
    const getBedColor = (r) => {
      const c = new THREE.Color();
      if (r <= 14) {
        c.copy(colDeep);
      } else if (r <= 33) {
        const t = (r - 14) / 19;
        c.lerpColors(colDeep, colMid, t);
      } else if (r <= 39.5) {
        const t = (r - 33) / 6.5;
        c.lerpColors(colMid, colShallow, t);
      } else {
        const t = Math.min(1.0, (r - 39.5) / 2.5);
        c.lerpColors(colShallow, colBank, t);
      }
      return c;
    };

    // Center vertex at (0, bedHeight(0), 0)
    positions.push(0, getPondBedHeight(0), 0);
    uvs.push(0.5, 0.5);
    const centerCol = getBedColor(0);
    colors.push(centerCol.r, centerCol.g, centerCol.b);

    // Concentric ring vertices from center out to bank edge (r = 42)
    for (let ring = 1; ring <= rings; ring++) {
      const r = (ring / rings) * this.radius;
      const y = getPondBedHeight(r);
      const ringCol = getBedColor(r);

      for (let s = 0; s < radialSegments; s++) {
        const theta = (s / radialSegments) * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;

        positions.push(x, y, z);
        uvs.push((x / (this.radius * 2)) + 0.5, (z / (this.radius * 2)) + 0.5);

        // Add subtle natural color variation per vertex
        const noise = (Math.sin(x * 0.8) + Math.cos(z * 0.8)) * 0.03;
        colors.push(
          Math.min(1.0, Math.max(0.0, ringCol.r + noise)),
          Math.min(1.0, Math.max(0.0, ringCol.g + noise)),
          Math.min(1.0, Math.max(0.0, ringCol.b + noise))
        );
      }
    }

    // Indices for center fan (counter-clockwise upward facing)
    for (let s = 0; s < radialSegments; s++) {
      const nextS = (s + 1) % radialSegments;
      indices.push(0, 1 + nextS, 1 + s);
    }

    // Indices for concentric quad strips
    for (let ring = 1; ring < rings; ring++) {
      const currentRingStart = 1 + (ring - 1) * radialSegments;
      const nextRingStart = 1 + ring * radialSegments;

      for (let s = 0; s < radialSegments; s++) {
        const nextS = (s + 1) % radialSegments;
        const i0 = currentRingStart + s;
        const i1 = currentRingStart + nextS;
        const i2 = nextRingStart + s;
        const i3 = nextRingStart + nextS;

        indices.push(i0, i1, i2);
        indices.push(i1, i3, i2);
      }
    }

    const basinGeo = new THREE.BufferGeometry();
    basinGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    basinGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    basinGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    basinGeo.setIndex(indices);
    basinGeo.computeVertexNormals();

    this.bedMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.04,
      flatShading: false,
      side: THREE.DoubleSide
    });

    const basinMesh = new THREE.Mesh(basinGeo, this.bedMaterial);
    basinMesh.name = 'PondBasin';
    basinMesh.receiveShadow = true;
    this.group.add(basinMesh);

    // Surrounding rolling hills countryside terrain mesh (r = 41.5m to 135m)
    const hillRings = 24;
    const hillRadialSegments = 64;
    const innerRadius = this.radius - 0.5; // 41.5m
    const outerRadius = 135.0;

    const hillPositions = [];
    const hillUvs = [];
    const hillColors = [];
    const hillIndices = [];

    // Painterly English countryside terrain palette:
    const colShore = new THREE.Color(0x3e6f2c);   // Lush bank lawn
    const colMeadow = new THREE.Color(0x4ea836);  // Vibrant sunny meadow grass
    const colCrest = new THREE.Color(0x72ba44);   // Sunlit hilltop highlight
    const colForest = new THREE.Color(0x274a1f);  // Shaded deep forest loam
    const colHeath = new THREE.Color(0x5a8a38);   // Heather upland tone

    for (let ring = 0; ring <= hillRings; ring++) {
      const ringT = ring / hillRings;
      // Exponential radial spacing for higher density near pond, broader out to horizon
      const r = innerRadius + Math.pow(ringT, 1.15) * (outerRadius - innerRadius);

      for (let s = 0; s < hillRadialSegments; s++) {
        const theta = (s / hillRadialSegments) * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = getRollingHillHeight(x, z);

        hillPositions.push(x, y, z);
        hillUvs.push((x / (outerRadius * 2)) + 0.5, (z / (outerRadius * 2)) + 0.5);

        // Calculate vertex color based on elevation and slope/features
        const vertexCol = new THREE.Color();
        if (r < 46.0) {
          const t = (r - innerRadius) / 4.5;
          vertexCol.lerpColors(colShore, colMeadow, t);
        } else {
          // Height-based blending: higher hilltops are sunnier, valleys are deeper green
          const heightFactor = Math.min(1.0, Math.max(0.0, (y - 0.5) / 7.0));
          vertexCol.lerpColors(colMeadow, colCrest, heightFactor);

          // Deep forest undertone on northern and eastern slopes
          const forestFactor = Math.sin(x * 0.05 + 1.0) * Math.cos(z * 0.05);
          if (forestFactor > 0.3) {
            vertexCol.lerp(colForest, (forestFactor - 0.3) * 0.6);
          }
        }

        // Subtle organic noise variation
        const noise = (Math.sin(x * 0.6) + Math.cos(z * 0.6)) * 0.025;
        hillColors.push(
          Math.min(1.0, Math.max(0.0, vertexCol.r + noise)),
          Math.min(1.0, Math.max(0.0, vertexCol.g + noise)),
          Math.min(1.0, Math.max(0.0, vertexCol.b + noise))
        );
      }
    }

    // Quad indices for concentric strips (counter-clockwise upward facing)
    for (let ring = 0; ring < hillRings; ring++) {
      const currentRingStart = ring * hillRadialSegments;
      const nextRingStart = (ring + 1) * hillRadialSegments;

      for (let s = 0; s < hillRadialSegments; s++) {
        const nextS = (s + 1) % hillRadialSegments;
        const i0 = currentRingStart + s;
        const i1 = currentRingStart + nextS;
        const i2 = nextRingStart + s;
        const i3 = nextRingStart + nextS;

        hillIndices.push(i0, i1, i2);
        hillIndices.push(i1, i3, i2);
      }
    }

    const hillGeo = new THREE.BufferGeometry();
    hillGeo.setAttribute('position', new THREE.Float32BufferAttribute(hillPositions, 3));
    hillGeo.setAttribute('uv', new THREE.Float32BufferAttribute(hillUvs, 2));
    hillGeo.setAttribute('color', new THREE.Float32BufferAttribute(hillColors, 3));
    hillGeo.setIndex(hillIndices);
    hillGeo.computeVertexNormals();

    this.hillMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.04,
      flatShading: false,
      side: THREE.DoubleSide
    });

    const hillMesh = new THREE.Mesh(hillGeo, this.hillMaterial);
    hillMesh.name = 'RollingHills';
    hillMesh.receiveShadow = true;
    this.group.add(hillMesh);
  }

  applyBiomeColors(palette) {
    if (!palette) return;
    if (palette.bedTint !== undefined && this.bedMaterial) {
      this.bedMaterial.color.setHex(palette.bedTint);
    }
    if (palette.hillTint !== undefined && this.hillMaterial) {
      this.hillMaterial.color.setHex(palette.hillTint);
    }
  }

  createPerimeterStones() {
    // Weathered river boulders bordering the pond edge
    const rockGeo = new THREE.DodecahedronGeometry(1.6, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5a635b,
      roughness: 0.85,
      flatShading: true
    });

    const stoneCount = 44;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
      const dist = this.radius + (Math.random() - 0.5) * 2.2;

      const rock = new THREE.Mesh(rockGeo, rockMat);
      const s = 1.0 + Math.random() * 1.8;
      rock.scale.set(s * (0.8 + Math.random() * 0.4), s * 0.7, s * (0.8 + Math.random() * 0.4));
      rock.position.set(
        Math.cos(angle) * dist,
        0.2 + (Math.random() - 0.3) * 0.4,
        Math.sin(angle) * dist
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.group.add(rock);
      this.rocks.push({ position: rock.position, radius: s * 1.4 });
    }
  }

  createSubmergedPebbles() {
    // Beautiful submerged river stones, smooth pebbles, and quartz gravel
    // nestled on the contoured bed and visible through clear water
    const pebbleGeo = new THREE.DodecahedronGeometry(0.65, 1);

    const materials = [
      new THREE.MeshStandardMaterial({ color: 0x9c8a66, roughness: 0.76, flatShading: true }), // Sunlit golden sandstone
      new THREE.MeshStandardMaterial({ color: 0x728078, roughness: 0.74, flatShading: true }), // River granite
      new THREE.MeshStandardMaterial({ color: 0xc2ba9f, roughness: 0.82, flatShading: true }), // Cream quartz pebble
      new THREE.MeshStandardMaterial({ color: 0x4a5c4e, roughness: 0.88, flatShading: true }), // Deep mossy stone
      new THREE.MeshStandardMaterial({ color: 0xa89477, roughness: 0.72, flatShading: true })  // Sun-bleached river rock
    ];

    // 130 pebbles scattered from shallow shores to deep basin
    for (let i = 0; i < 130; i++) {
      const mat = materials[i % materials.length];
      const pebble = new THREE.Mesh(pebbleGeo, mat);

      // Distribute radially, keeping within water basin
      const r = 3.5 + Math.random() * 34.5;
      const theta = Math.random() * Math.PI * 2;
      const s = 0.35 + Math.random() * 0.95;

      // Perfectly rests on the contoured silt bed
      const bedY = getPondBedHeight(r);
      // Ensure top of pebble stays submerged beneath Gerstner wave troughs
      const targetY = Math.min(bedY + s * 0.18, -0.16);

      pebble.scale.set(s * (0.8 + Math.random() * 0.5), s * 0.40, s * (0.8 + Math.random() * 0.5));
      pebble.position.set(
        Math.cos(theta) * r,
        targetY,
        Math.sin(theta) * r
      );
      pebble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      pebble.receiveShadow = true;
      this.group.add(pebble);
    }
  }
}
