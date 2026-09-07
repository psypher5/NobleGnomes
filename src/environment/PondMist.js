import * as THREE from 'three';

/**
 * Atmospheric low-altitude pond mist system:
 * - Floating horizontal mist blanket sitting 0.35m above the water
 * - Animated scrolling wave noise with soft radial fading
 * - Golden sunlight backscattering creating a storybook morning pond feel
 * - Drifting soft volumetric mist puffs along the reed perimeter
 */
export class PondMist {
  constructor(radius = 38) {
    this.radius = radius;
    this.group = new THREE.Group();
    // Removed floating mist blanket and 16 dodecahedron puff meshes which created
    // large pale circular disc artifacts and hazy milky fog over the pond water.
  }

  createMistBlanket() {
    const mistGeo = new THREE.PlaneGeometry(this.radius * 2.1, this.radius * 2.1, 32, 32);
    mistGeo.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime: { value: 0 },
      uMistColor: { value: new THREE.Color(0xd6ece5) },     // Pale garden mist
      uSunColor: { value: new THREE.Color(0xfff3db) },      // Warm golden morning sun
      uSunDirection: { value: new THREE.Vector3(0.55, 0.8, 0.35).normalize() },
      uPondRadius: { value: this.radius }
    };

    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uMistColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDirection;
      uniform float uPondRadius;

      varying vec2 vUv;
      varying vec3 vWorldPosition;

      // Soft scrolling noise
      float mistNoise(vec2 p, float time) {
        vec2 q = p * 0.08 + vec2(time * 0.025, time * 0.015);
        float n1 = sin(q.x * 3.0 + sin(q.y * 2.0)) * cos(q.y * 3.0);
        vec2 q2 = p * 0.14 - vec2(time * 0.035, -time * 0.02);
        float n2 = sin(q2.x * 2.5) * cos(q2.y * 2.5 + sin(q2.x * 1.8));
        return (n1 + n2) * 0.25 + 0.5;
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);

        // Radial falloff from pond center
        float dist = length(vWorldPosition.xz);
        float radialMask = smoothstep(uPondRadius * 0.98, uPondRadius * 0.45, dist);
        // Soft hole in the immediate boat center
        float centerFade = smoothstep(1.5, 6.0, dist);

        // Animated layered mist texture
        float noise = mistNoise(vWorldPosition.xz, uTime);
        float density = smoothstep(0.32, 0.72, noise) * radialMask * centerFade;

        // Sunlight forward scattering (warm golden glow toward sun)
        float sunScatter = pow(max(0.0, dot(viewDir, -uSunDirection)), 2.2);
        vec3 finalColor = mix(uMistColor, uSunColor, sunScatter * 0.65);

        // Very soft, translucent ambient mist opacity (0.18 max)
        float alpha = density * 0.22;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    const mistMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.blanketMesh = new THREE.Mesh(mistGeo, mistMat);
    this.blanketMesh.position.y = 0.38;
    this.blanketMesh.renderOrder = 3; // Render right above water
    this.group.add(this.blanketMesh);
  }

  createDriftingPuffs() {
    // 16 soft volumetric mist cloud puffs hovering around perimeter reeds
    this.puffs = [];

    const puffMat = new THREE.MeshBasicMaterial({
      color: 0xe5f2ed,
      transparent: true,
      opacity: 0.14,
      depthWrite: false
    });
    const puffGeo = new THREE.DodecahedronGeometry(2.2, 1);

    for (let i = 0; i < 16; i++) {
      const puff = new THREE.Mesh(puffGeo, puffMat);
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const r = 24.0 + Math.random() * (this.radius - 26.0);

      puff.position.set(
        Math.cos(angle) * r,
        0.45 + (Math.random() - 0.5) * 0.25,
        Math.sin(angle) * r
      );
      puff.scale.set(
        1.2 + Math.random() * 0.8,
        0.35 + Math.random() * 0.25,
        1.2 + Math.random() * 0.8
      );
      puff.renderOrder = 3;

      puff.userData = {
        baseX: puff.position.x,
        baseZ: puff.position.z,
        driftSpeed: 0.15 + Math.random() * 0.15,
        driftPhase: Math.random() * Math.PI * 2
      };

      this.group.add(puff);
      this.puffs.push(puff);
    }
  }

  update(dt, elapsedTime) {
    if (this.uniforms) {
      this.uniforms.uTime.value = elapsedTime;
    }

    if (this.puffs) {
      for (const p of this.puffs) {
        p.position.x = p.userData.baseX + Math.sin(elapsedTime * p.userData.driftSpeed + p.userData.driftPhase) * 2.0;
        p.position.z = p.userData.baseZ + Math.cos(elapsedTime * p.userData.driftSpeed + p.userData.driftPhase) * 2.0;
        p.rotation.y = elapsedTime * 0.04;
      }
    }
  }
}
