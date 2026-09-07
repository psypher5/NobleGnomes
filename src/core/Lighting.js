import * as THREE from 'three';

/**
 * Atmospheric garden pond lighting with warm sun and soft shadows.
 */
export class Lighting {
  constructor(scene) {
    this.scene = scene;
    this.setupLights();
    this.setupAtmosphere();
  }

  setupLights() {
    // 1. Hemisphere Light: sky cyan + garden ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xd9f0ff, 0x2d4f26, 0.75);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // 2. Main Directional Sun (afternoon warm sunlight)
    this.sunLight = new THREE.DirectionalLight(0xfff3d6, 1.4);
    this.sunLight.position.set(32, 45, 24);
    this.sunLight.castShadow = true;

    // Mobile & Chromebook friendly shadow map resolution
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 140;

    const d = 46;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;

    this.scene.add(this.sunLight);

    // 3. Subtle water fill light
    this.fillLight = new THREE.DirectionalLight(0x70c1b3, 0.45);
    this.fillLight.position.set(-25, 20, -25);
    this.scene.add(this.fillLight);
  }

  setupAtmosphere() {
    this.scene.fog = new THREE.FogExp2(0xcde8db, 0.0078);
  }

  applyLightingProfile(profile) {
    if (!profile) return;

    if (profile.sunColor !== undefined) this.sunLight.color.setHex(profile.sunColor);
    if (profile.sunIntensity !== undefined) this.sunLight.intensity = profile.sunIntensity;
    if (profile.sunPos !== undefined) this.sunLight.position.copy(profile.sunPos);

    if (profile.hemiSkyColor !== undefined) this.hemiLight.color.setHex(profile.hemiSkyColor);
    if (profile.hemiGroundColor !== undefined) this.hemiLight.groundColor.setHex(profile.hemiGroundColor);
    if (profile.hemiIntensity !== undefined) this.hemiLight.intensity = profile.hemiIntensity;

    if (profile.fillColor !== undefined && this.fillLight) this.fillLight.color.setHex(profile.fillColor);
    if (profile.fillIntensity !== undefined && this.fillLight) this.fillLight.intensity = profile.fillIntensity;

    if (profile.fogColor !== undefined) {
      if (!this.scene.fog) {
        this.scene.fog = new THREE.FogExp2(profile.fogColor, profile.fogDensity || 0.0078);
      } else {
        this.scene.fog.color.setHex(profile.fogColor);
        if (profile.fogDensity !== undefined) this.scene.fog.density = profile.fogDensity;
      }
    }
  }
}
