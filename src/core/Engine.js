import * as THREE from 'three';

/**
 * Three.js Engine initialization and lifecycle runner.
 */
export class Engine {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    if (window.__gnomeLog) window.__gnomeLog('⚙️ Starting Three.js Engine...');

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd6ede1); // Soft morning garden sky

    // 2. Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 300);
    this.camera.position.set(0, 16, -18);

    // 3. Renderer with hardware compatibility fallback
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false
      });
    } catch (e) {
      if (window.__gnomeLog) window.__gnomeLog('❌ WebGL not supported: ' + e.message, true);
      throw e;
    }

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.container.appendChild(this.renderer.domElement);

    if (window.__gnomeLog) window.__gnomeLog('✅ WebGL Renderer created');

    // 4. Timer / Clock
    this.clock = new THREE.Clock();

    // 5. Resize Event
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
