import * as THREE from 'three';

/**
 * High-fidelity stylized pond water shader featuring:
 * - 4-Harmonic physical Gerstner wave displacement with sharp crests and wide troughs
 * - Exact analytical tangent/binormal derivations with upward surface normals
 * - Animated dual-layer capillary micro-ripple perturbation for dancing specular facets
 * - Subsurface scattering (sunlight transmitting through translucent wave crests)
 * - Flowing aquatic caustic web ribbons with optical depth extinction
 * - Razor-smooth, anti-aliased boat wake, propeller foam, and wave-crest seafoam
 * - Crystal clear view-dependent Fresnel transparency and depth gradient
 * - Refractive acoustic bell shockwaves
 */

/**
 * Calculates the exact analytical surface height of the 4-harmonic Gerstner waves
 * matching the vertex shader for CPU physics (boat buoyancy, lily pad floating).
 * Calibrated for deep rolling garden pond swells with calm, slow rhythm.
 */
export function getWaterSurfaceHeight(x, z, time) {
  // 4 organically directed, non-orthogonal Gerstner waves (18°, 64°, -42°, -118°)
  const f1 = 0.2417 * (0.9511 * x + 0.3090 * z) - 0.5847 * time;
  const f2 = 0.3808 * (0.4384 * x + 0.8988 * z) - 0.7342 * time;
  const f3 = 0.6411 * (0.7431 * x - 0.6691 * z) - 0.9526 * time;
  const f4 = 1.2083 * (-0.4695 * x - 0.8829 * z) - 1.3078 * time;

  const rawDisp = 0.200 * Math.cos(f1) + 0.125 * Math.cos(f2) + 0.065 * Math.cos(f3) + 0.025 * Math.cos(f4);

  // Shore wave attenuation matching vertex shader
  const r = Math.hypot(x, z);
  let atten = Math.max(0, Math.min(1, (38.0 - r) / 9.0));
  atten = atten * atten * (3.0 - 2.0 * atten);

  if (z > 25.0 && Math.abs(x) < 8.0) {
    let pierAtten = Math.max(0, Math.min(1, (32.5 - z) / 6.5));
    pierAtten = pierAtten * pierAtten * (3.0 - 2.0 * pierAtten);
    atten = Math.min(atten, pierAtten);
  }

  return rawDisp * atten;
}

export class PondWater {
  constructor(size = 92, segments = 180) {
    this.size = size;
    this.maxRipples = 8;
    this.maxLilyPads = 18;

    // Buffer for ripple shockwaves [x, z, radius, strength]
    this.rippleData = new Float32Array(this.maxRipples * 4);
    this.activeRipples = [];

    // Buffer for lily pad contact foam [x, z, radius, rotationY]
    this.lilyPadData = new Float32Array(this.maxLilyPads * 4);

    this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.geometry.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime: { value: 0 },
      uShallowColor: { value: new THREE.Color(0x38e1d2) }, // Sparkling crystal turquoise shallows
      uDeepColor: { value: new THREE.Color(0x063d2e) },    // Lush, rich storybook pond emerald
      uFoamColor: { value: new THREE.Color(0xdcfce7) },    // Soft translucent water froth
      uSunDirection: { value: new THREE.Vector3(0.55, 0.8, 0.35).normalize() },
      uPondRadius: { value: 39.5 },
      uRipples: { value: this.rippleData },

      // Boat interaction uniforms
      uBoatPos: { value: new THREE.Vector3(0, 0, 0) },
      uBoatHeading: { value: 0 },
      uBoatSpeed: { value: 0 }
    };

    const vertexShader = `
      uniform float uTime;
      uniform vec3 uBoatPos;
      uniform float uBoatHeading;
      uniform float uBoatSpeed;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vWaveHeight;
      varying float vWaveCrest;
      varying float vWakeIntensity;

      // GPU Gems Gerstner Wave with analytical tangent/binormal derivatives
      vec3 gerstnerWave(vec2 dir, float amp, float steepness, float wavelength, vec3 p, inout vec3 tangent, inout vec3 binormal) {
        float k = 6.2831853 / wavelength;
        float c = sqrt(9.8 / k);
        vec2 d = normalize(dir);
        float omega = k * c * 0.38; // Slower, tranquil swell speed
        float f = k * dot(d, p.xz) - omega * uTime;
        float wa = k * amp;

        // Tangent = dP/dx
        tangent += vec3(
          -d.x * d.x * (steepness * wa * cos(f)),
          -d.x * wa * sin(f),
          -d.x * d.y * (steepness * wa * cos(f))
        );

        // Binormal = dP/dz
        binormal += vec3(
          -d.x * d.y * (steepness * wa * cos(f)),
          -d.y * wa * sin(f),
          -d.y * d.y * (steepness * wa * cos(f))
        );

        return vec3(
          -d.x * (steepness * amp * sin(f)),
          amp * cos(f),
          -d.y * (steepness * amp * sin(f))
        );
      }

      void main() {
        vUv = uv;
        vec3 gridPos = position;

        vec3 tangent = vec3(1.0, 0.0, 0.0);
        vec3 binormal = vec3(0.0, 0.0, 1.0);
        vec3 p = gridPos;

        // 4 organically directed, non-orthogonal Gerstner waves (18°, 64°, -42°, -118°)
        // Eliminates the tiled diamond grid pattern
        vec3 disp = vec3(0.0);
        disp += gerstnerWave(vec2(0.9511, 0.3090),   0.200, 0.20, 26.0, gridPos, tangent, binormal);
        disp += gerstnerWave(vec2(0.4384, 0.8988),   0.125, 0.16, 16.5, gridPos, tangent, binormal);
        disp += gerstnerWave(vec2(0.7431, -0.6691),  0.065, 0.12, 9.8,  gridPos, tangent, binormal);
        disp += gerstnerWave(vec2(-0.4695, -0.8829), 0.025, 0.08, 5.2,  gridPos, tangent, binormal);

        // Shoreline wave shoaling & attenuation: full swell in open water, gracefully flattening at shallow shore banks
        float distFromCenter = length(gridPos.xz);
        float shoreWaveAtten = clamp((38.0 - distFromCenter) / 9.0, 0.0, 1.0);
        shoreWaveAtten = shoreWaveAtten * shoreWaveAtten * (3.0 - 2.0 * shoreWaveAtten);

        // Attenuation near south pier landing and boardwalk ramp (z > 25, |x| < 8)
        if (gridPos.z > 25.0 && abs(gridPos.x) < 8.0) {
          float pierAtten = clamp((32.5 - gridPos.z) / 6.5, 0.0, 1.0);
          shoreWaveAtten = min(shoreWaveAtten, pierAtten * pierAtten * (3.0 - 2.0 * pierAtten));
        }

        disp *= shoreWaveAtten;
        p += disp;

        // Dynamic V-wake height displacement behind boat
        float wakeIntensity = 0.0;
        if (uBoatSpeed > 0.4) {
          float dx = p.x - uBoatPos.x;
          float dz = p.z - uBoatPos.z;

          float fwd = dx * sin(uBoatHeading) + dz * cos(uBoatHeading);
          float lat = dx * cos(uBoatHeading) - dz * sin(uBoatHeading);

          if (fwd < -0.8 && fwd > -16.0) {
            float distBehind = -fwd;
            float wakeHalfWidth = 0.9 + distBehind * 0.44;
            float distToArm = abs(abs(lat) - wakeHalfWidth);

            if (distToArm < 1.3) {
              float wakeFade = clamp(1.0 - (distBehind / 16.0), 0.0, 1.0);
              float speedRatio = clamp(uBoatSpeed / 8.0, 0.0, 1.0);
              float crest = sin((distToArm / 1.3) * 3.14159265) * 0.08 * wakeFade * speedRatio;
              p.y += crest;
              wakeIntensity = wakeFade * speedRatio * smoothstep(0.9, 0.1, distToArm);
            }
          }
        }

        vWaveHeight = p.y;
        vWaveCrest = clamp((p.y + 0.08) / 0.48, 0.0, 1.0);
        vWakeIntensity = wakeIntensity;

        vec4 worldPos = modelMatrix * vec4(p, 1.0);
        vWorldPosition = worldPos.xyz;

        // Analytical upward normal from Gerstner cross product
        vec3 normal = normalize(cross(binormal, tangent));
        vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;
      uniform vec3 uSunDirection;
      uniform float uPondRadius;
      uniform vec4 uRipples[8];
      uniform vec3 uBoatPos;
      uniform float uBoatHeading;
      uniform float uBoatSpeed;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vWaveHeight;
      varying float vWaveCrest;
      varying float vWakeIntensity;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 normal = normalize(vNormal);

        // 1. Refractive Bell Shockwaves
        vec3 rippleNormalOffset = vec3(0.0);
        float rippleGlint = 0.0;
        float rippleFoam = 0.0;

        for (int i = 0; i < 8; i++) {
          vec4 rip = uRipples[i];
          float ripStrength = rip.w;

          if (ripStrength > 0.001) {
            vec2 ripCenter = rip.xy;
            float ripRadius = rip.z;

            float dist = distance(vWorldPosition.xz, ripCenter);
            float ringDist = abs(dist - ripRadius);

            if (ringDist < 2.0) {
              float phase = ringDist / 2.0;
              float waveRing = cos(phase * 3.14159265) * ripStrength;
              vec2 pushDir = normalize(vWorldPosition.xz - ripCenter + vec2(0.0001));

              rippleNormalOffset.xz += pushDir * waveRing * 0.36;
              rippleGlint += pow(max(0.0, waveRing), 3.0) * ripStrength * 1.0;
              rippleFoam += smoothstep(0.15, 0.02, ringDist) * ripStrength * 0.45;
            }
          }
        }

        // 2. High-Frequency Animated Capillary Normal Facets (distance-attenuated to eliminate high-angle moire/crosshatch)
        float distToCam = length(cameraPosition - vWorldPosition);
        float microFade = clamp((26.0 - distToCam) / 16.0, 0.0, 1.0);

        vec2 microUv1 = vWorldPosition.xz * 0.75 + vec2(uTime * 0.35, -uTime * 0.28);
        vec2 microUv2 = vWorldPosition.xz * 1.10 + vec2(-uTime * 0.26, uTime * 0.36);
        vec2 microRipple = vec2(
          sin(microUv1.x * 1.8 + microUv1.y * 1.3) * 0.5 + cos(microUv2.x * 1.9 - microUv2.y * 1.4) * 0.5,
          cos(microUv1.x * 1.4 - microUv1.y * 1.7) * 0.5 + sin(microUv2.x * 1.6 + microUv2.y * 1.8) * 0.5
        ) * (0.040 * microFade);

        normal = normalize(normal + rippleNormalOffset + vec3(microRipple.x, 0.0, microRipple.y));

        // 3. Saturated Watercolor Depth Gradient: lush emerald abyss to crystal turquoise shallows
        float distFromCenter = length(vWorldPosition.xz);
        float depthFactor = clamp(distFromCenter / 40.0, 0.0, 1.0);
        depthFactor = 1.0 - pow(1.0 - depthFactor, 2.4);

        vec3 waterColor = mix(uDeepColor, uShallowColor, 1.0 - depthFactor * 0.72);

        // 4. Soft Organic Underwater Caustics (natural flowing sunbeams on submerged floor, no axis-aligned grid)
        mat2 rot1 = mat2(0.866, -0.500, 0.500, 0.866);
        mat2 rot2 = mat2(0.707, 0.707, -0.707, 0.707);

        vec2 cUv1 = rot1 * (vWorldPosition.xz * 0.10) + vec2(uTime * 0.038, uTime * 0.025);
        vec2 cUv2 = rot2 * (vWorldPosition.xz * 0.12) + vec2(-uTime * 0.030, uTime * 0.042);

        float caust1 = 1.0 - abs(sin(cUv1.x * 2.4 + sin(cUv1.y * 1.8)));
        float caust2 = 1.0 - abs(cos(cUv2.x * 2.1 + cos(cUv2.y * 1.9)));
        float causticPattern = smoothstep(0.35, 0.94, (caust1 + caust2) * 0.5);
        causticPattern = pow(causticPattern, 1.6) * (1.0 - depthFactor * 0.65);

        vec3 causticColor = mix(vec3(0.22, 0.86, 0.74), vec3(0.58, 0.96, 0.90), clamp(causticPattern * 0.65, 0.0, 1.0));
        waterColor += causticColor * causticPattern * 0.11; // Soft tranquil luminous sunbeams

        // 5. Subsurface Scattering (Sun transmitting through wave crests)
        float sss = pow(clamp(dot(viewDir, -uSunDirection), 0.0, 1.0), 2.8) * clamp((vWaveHeight + 0.10) * 2.2, 0.0, 1.0);
        vec3 sssColor = vec3(0.18, 0.92, 0.74) * sss * 0.55;
        waterColor += sssColor;

        // 6. Shoreline Bank Foam (gentle lap against perimeter bank)
        float shoreFoam = 0.0;
        if (distFromCenter > 37.5 && distFromCenter < 41.5) {
          float lap = sin(uTime * 1.8 + distFromCenter * 2.5) * 0.5 + 0.5;
          shoreFoam = smoothstep(37.5, 39.5, distFromCenter) * (0.25 + 0.25 * lap) * smoothstep(41.2, 39.8, distFromCenter);
        }

        // 7. Razor-Smooth, Anti-Aliased Boat Wake & Propeller Wash
        float wakeFoam = 0.0;
        if (uBoatSpeed > 0.4) {
          float bdx = vWorldPosition.x - uBoatPos.x;
          float bdz = vWorldPosition.z - uBoatPos.z;

          float fwd = bdx * sin(uBoatHeading) + bdz * cos(uBoatHeading);
          float lat = bdx * cos(uBoatHeading) - bdz * sin(uBoatHeading);

          if (fwd < -0.8 && fwd > -18.0) {
            float distBehind = -fwd;
            float wakeHalfWidth = 0.88 + distBehind * 0.44;
            float armDist = abs(abs(lat) - wakeHalfWidth);

            float speedRatio = clamp(uBoatSpeed / 7.5, 0.0, 1.0);
            float lengthFade = pow(clamp(1.0 - (distBehind / 18.0), 0.0, 1.0), 1.2);

            // Silky smooth, feathered translucent V-wake arms
            float armFoam = smoothstep(0.95, 0.04, armDist) * lengthFade * 0.55;

            // Silky smooth central propeller wash behind stern
            float washFoam = smoothstep(0.85, 0.06, abs(lat)) * smoothstep(7.0, 0.8, distBehind) * lengthFade * 0.45;

            wakeFoam = max(armFoam, washFoam) * speedRatio;
          }
        }

        // 8. Total Foam Blend (peaceful pond: soft wake, ripples, and shore lapping - no ocean crest whitecaps)
        float totalFoam = clamp(wakeFoam + vWakeIntensity * 0.35 + rippleFoam + shoreFoam, 0.0, 1.0);

        // 9. Sun Specular Highlights & Liquid Glints
        vec3 halfVec = normalize(uSunDirection + viewDir);
        float specBase = max(0.0, dot(normal, halfVec));
        float sharpGlint = pow(specBase, 180.0) * 1.6;
        float warmSpread = pow(specBase, 64.0) * 0.18;
        vec3 specular = vec3(1.0, 0.98, 0.90) * sharpGlint + vec3(1.0, 0.92, 0.76) * warmSpread;

        // 10. Fresnel Skybox Reflection
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.5);
        vec3 skyReflection = vec3(0.88, 0.96, 1.0);
        vec3 waterWithReflect = mix(waterColor, skyReflection, fresnel * 0.38);

        // 11. Final Composition
        vec3 finalColor = mix(waterWithReflect, uFoamColor, totalFoam * 0.60);
        finalColor += specular + vec3(0.35, 0.65, 0.55) * rippleGlint;

        // 12. Translucent Glassy Water (allows viewing submerged bed, pebbles & swimming fish)
        float baseAlpha = mix(0.56, 0.76, depthFactor);
        float finalAlpha = clamp(mix(baseAlpha, 0.86, totalFoam), 0.50, 0.92);

        // Shoreline clipping guard: smoothly fades out water before it intersects grassy perimeter lawn
        float bankAlpha = smoothstep(41.2, 38.8, distFromCenter);
        if (vWorldPosition.z > 35.0 && abs(vWorldPosition.x) < 7.5) {
          bankAlpha *= smoothstep(38.0, 35.0, vWorldPosition.z);
        }
        finalAlpha *= bankAlpha;
        if (finalAlpha <= 0.01) discard;

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 2;
    this.mesh.position.y = 0;
  }

  setLilyPads(pads) {
    // Retained for API compatibility
  }

  addRipple(x, z, strength = 1.0, speed = 15.0, maxRadius = 26.0) {
    this.activeRipples.push({
      x,
      z,
      radius: 0.1,
      speed,
      maxRadius,
      strength,
      initialStrength: strength
    });
  }

  setBiomeColors(shallowHex, deepHex, foamHex, radius = 39.5) {
    if (shallowHex !== undefined) this.uniforms.uShallowColor.value.setHex(shallowHex);
    if (deepHex !== undefined) this.uniforms.uDeepColor.value.setHex(deepHex);
    if (foamHex !== undefined) this.uniforms.uFoamColor.value.setHex(foamHex);
    if (radius !== undefined) this.uniforms.uPondRadius.value = radius;
  }

  update(dt, elapsedTime, boat) {
    this.uniforms.uTime.value = elapsedTime;

    // Update boat interaction uniforms
    if (boat) {
      this.uniforms.uBoatPos.value.copy(boat.position);
      this.uniforms.uBoatHeading.value = boat.heading;
      this.uniforms.uBoatSpeed.value = Math.abs(boat.speed);
    }

    // Advance and prune active ripples
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const rip = this.activeRipples[i];
      rip.radius += rip.speed * dt;
      const progress = rip.radius / rip.maxRadius;
      rip.strength = rip.initialStrength * (1.0 - progress);

      if (rip.radius >= rip.maxRadius || rip.strength <= 0.005) {
        this.activeRipples.splice(i, 1);
      }
    }

    // Populate ripple uniform array
    const count = Math.min(this.activeRipples.length, this.maxRipples);

    for (let i = 0; i < this.maxRipples; i++) {
      const baseIdx = i * 4;
      if (i < count) {
        const rip = this.activeRipples[i];
        this.rippleData[baseIdx] = rip.x;
        this.rippleData[baseIdx + 1] = rip.z;
        this.rippleData[baseIdx + 2] = rip.radius;
        this.rippleData[baseIdx + 3] = rip.strength;
      } else {
        this.rippleData[baseIdx] = 0;
        this.rippleData[baseIdx + 1] = 0;
        this.rippleData[baseIdx + 2] = 0;
        this.rippleData[baseIdx + 3] = 0;
      }
    }
  }
}
