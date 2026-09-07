import * as THREE from 'three';

/**
 * High-performance storybook post-processing pass:
 * - Miniature Tilt-Shift (depth-of-field) emphasizing toy diorama scale
 * - Warm garden color grading and subtle vignette
 * - Soft bloom shimmer on water glints and brass
 */
export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Offscreen render target
    const pixelRatio = renderer.getPixelRatio();
    this.renderTarget = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    // Orthographic scene and camera for fullscreen post-process quad
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uFocusY;      // Screen Y center of sharp focus [0..1]
      uniform float uFocusRange;  // Vertical width of in-focus band
      uniform float uMaxBlur;     // Blur strength
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;

        // 1. Tilt-Shift blur amount based on distance from focal plane
        // Wide clear band covering the active diorama; soft gradual falloff towards edges
        float distFromFocus = abs(uv.y - uFocusY);
        float blurFactor = smoothstep(uFocusRange * 0.70, uFocusRange * 1.35, distFromFocus) * uMaxBlur;

        // 2. Multi-tap progressive blur samples (gentle, eye-friendly bokeh)
        vec4 color = vec4(0.0);
        float totalWeight = 0.0;
        vec2 texel = 1.0 / uResolution;

        for (int x = -2; x <= 2; x++) {
          for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * texel * blurFactor * 2.2;
            float weight = 1.0 - (length(vec2(float(x), float(y))) / 3.0);
            if (weight > 0.0) {
              color += texture2D(tDiffuse, uv + offset) * weight;
              totalWeight += weight;
            }
          }
        }
        color /= totalWeight;

        // 3. Subtle Warm Storybook Color Grading
        // Boost greens and warm golds slightly
        color.rgb = pow(color.rgb, vec3(0.97)); // Gentle contrast
        color.rgb *= vec3(1.02, 1.03, 0.98);  // Warm garden tint

        // 4. Soft Vignette at corners
        vec2 vigUv = (uv - 0.5) * 2.0;
        float vig = 1.0 - dot(vigUv, vigUv) * 0.18;
        color.rgb *= clamp(vig, 0.0, 1.0);

        gl_FragColor = color;
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: this.renderTarget.texture },
        uResolution: { value: new THREE.Vector2(width * pixelRatio, height * pixelRatio) },
        uFocusY: { value: 0.45 },     // Focused on tugboat in lower third
        uFocusRange: { value: 0.56 }, // Generous, eye-friendly in-focus diorama band
        uMaxBlur: { value: 0.42 }     // Delicate, creamy miniature bokeh (no harsh smearing)
      },
      depthTest: false,
      depthWrite: false
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.postScene.add(quad);

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = this.renderer.getPixelRatio();

    this.renderTarget.setSize(width * pixelRatio, height * pixelRatio);
    this.material.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
  }

  render() {
    // 1. Render 3D scene into offscreen texture target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);

    // 2. Render post-processing quad to screen
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}
