import * as THREE from 'three';

export const WEATHER_TYPE = {
  CLEAR_SUNNY: 'CLEAR_SUNNY',
  TROPICAL_BREEZE: 'TROPICAL_BREEZE',
  AUTUMN_RAIN: 'AUTUMN_RAIN',
  THUNDER_MIST: 'THUNDER_MIST',
  TWILIGHT_FIREFLIES: 'TWILIGHT_FIREFLIES',
  ALPINE_SPRAY: 'ALPINE_SPRAY',
  OCEAN_SWELL: 'OCEAN_SWELL'
};

/**
 * High-performance particle weather system for Noble Gnomes:
 * Delivers distinct atmospheric visual effects matching each expedition biome.
 */
export class WeatherSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentWeather = WEATHER_TYPE.CLEAR_SUNNY;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initParticles();
    this.setWeather(WEATHER_TYPE.CLEAR_SUNNY);
  }

  initParticles() {
    // 1. Rain System (for Autumn Bog & Thunder Fen)
    const rainCount = 350;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3 + 0] = (Math.random() - 0.5) * 80;
      rainPositions[i * 3 + 1] = Math.random() * 32;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      rainVelocities[i] = 18.0 + Math.random() * 12.0;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.28,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.rainPoints = new THREE.Points(rainGeo, rainMat);
    this.rainPoints.userData = { velocities: rainVelocities };
    this.rainPoints.visible = false;
    this.group.add(this.rainPoints);

    // 2. Autumn Leaves System (for The Murk Hollow)
    const leafCount = 75;
    const leafGroup = new THREE.Group();
    const leafColors = [0xd97706, 0xb45309, 0xdc2626, 0xf59e0b];
    this.leaves = [];

    const leafGeo = new THREE.PlaneGeometry(0.32, 0.22);
    leafGeo.rotateX(-Math.PI / 4);

    for (let i = 0; i < leafCount; i++) {
      const col = leafColors[Math.floor(Math.random() * leafColors.length)];
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.8,
        side: THREE.DoubleSide
      });
      const leaf = new THREE.Mesh(leafGeo, mat);
      leaf.position.set(
        (Math.random() - 0.5) * 75,
        1.5 + Math.random() * 14,
        (Math.random() - 0.5) * 75
      );
      leaf.userData = {
        fallSpeed: 0.8 + Math.random() * 1.2,
        swaySpeed: 1.5 + Math.random() * 2.0,
        rotSpeedX: (Math.random() - 0.5) * 3.0,
        rotSpeedY: (Math.random() - 0.5) * 2.5,
        phase: Math.random() * Math.PI * 2
      };
      leafGroup.add(leaf);
      this.leaves.push(leaf);
    }
    leafGroup.visible = false;
    this.leafGroup = leafGroup;
    this.group.add(leafGroup);

    // 3. Fireflies & Will-o'-the-Wisps (for Whispering Lake)
    const fireflyCount = 90;
    const fireflyGeo = new THREE.BufferGeometry();
    const fireflyPos = new Float32Array(fireflyCount * 3);
    const fireflyData = [];

    for (let i = 0; i < fireflyCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 32;
      fireflyPos[i * 3 + 0] = Math.cos(angle) * radius;
      fireflyPos[i * 3 + 1] = 0.4 + Math.random() * 2.8;
      fireflyPos[i * 3 + 2] = Math.sin(angle) * radius;

      fireflyData.push({
        baseX: fireflyPos[i * 3 + 0],
        baseY: fireflyPos[i * 3 + 1],
        baseZ: fireflyPos[i * 3 + 2],
        speed: 0.8 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        driftRadius: 1.2 + Math.random() * 2.0
      });
    }

    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));

    const fireflyMat = new THREE.PointsMaterial({
      color: 0x86efac,
      size: 0.65,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.fireflyPoints = new THREE.Points(fireflyGeo, fireflyMat);
    this.fireflyPoints.userData = { list: fireflyData };
    this.fireflyPoints.visible = false;
    this.group.add(this.fireflyPoints);

    // 4. Sun Motes & Pollen (for Shallows & Tropical Lagoon)
    const moteCount = 120;
    const moteGeo = new THREE.BufferGeometry();
    const motePos = new Float32Array(moteCount * 3);
    const moteData = [];

    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3 + 0] = (Math.random() - 0.5) * 65;
      motePos[i * 3 + 1] = 0.5 + Math.random() * 6.5;
      motePos[i * 3 + 2] = (Math.random() - 0.5) * 65;

      moteData.push({
        speed: 0.4 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2
      });
    }

    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));

    const moteMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.35,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.motePoints = new THREE.Points(moteGeo, moteMat);
    this.motePoints.userData = { list: moteData };
    this.motePoints.visible = true;
    this.group.add(this.motePoints);
  }

  setWeather(weatherType) {
    this.currentWeather = weatherType;

    // Reset visibility
    this.rainPoints.visible = false;
    this.leafGroup.visible = false;
    this.fireflyPoints.visible = false;
    this.motePoints.visible = false;

    switch (weatherType) {
      case WEATHER_TYPE.CLEAR_SUNNY:
      case WEATHER_TYPE.TROPICAL_BREEZE:
        this.motePoints.visible = true;
        this.motePoints.material.color.setHex(weatherType === WEATHER_TYPE.TROPICAL_BREEZE ? 0x6ee7b7 : 0xfef08a);
        break;

      case WEATHER_TYPE.AUTUMN_RAIN:
        this.rainPoints.visible = true;
        this.rainPoints.material.opacity = 0.45;
        this.leafGroup.visible = true;
        break;

      case WEATHER_TYPE.THUNDER_MIST:
        this.rainPoints.visible = true;
        this.rainPoints.material.opacity = 0.75;
        break;

      case WEATHER_TYPE.TWILIGHT_FIREFLIES:
        this.fireflyPoints.visible = true;
        break;

      case WEATHER_TYPE.ALPINE_SPRAY:
      case WEATHER_TYPE.OCEAN_SWELL:
        this.motePoints.visible = true;
        this.motePoints.material.color.setHex(0xe0f2fe);
        break;
    }
  }

  update(dt, time, boatPosition) {
    // 1. Update Rain
    if (this.rainPoints && this.rainPoints.visible) {
      const posAttr = this.rainPoints.geometry.attributes.position;
      const vels = this.rainPoints.userData.velocities;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) - vels[i] * dt;
        if (y < 0) {
          y = 28 + Math.random() * 4;
        }
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    // 2. Update Autumn Leaves
    if (this.leafGroup && this.leafGroup.visible) {
      for (const leaf of this.leaves) {
        const u = leaf.userData;
        leaf.position.y -= u.fallSpeed * dt;
        leaf.position.x += Math.sin(time * u.swaySpeed + u.phase) * dt * 1.5;
        leaf.position.z += Math.cos(time * u.swaySpeed * 0.7 + u.phase) * dt * 0.8;

        leaf.rotation.x += u.rotSpeedX * dt;
        leaf.rotation.y += u.rotSpeedY * dt;

        if (leaf.position.y < 0.1) {
          leaf.position.y = 12 + Math.random() * 5;
          leaf.position.x = (Math.random() - 0.5) * 70;
          leaf.position.z = (Math.random() - 0.5) * 70;
        }
      }
    }

    // 3. Update Fireflies
    if (this.fireflyPoints && this.fireflyPoints.visible) {
      const posAttr = this.fireflyPoints.geometry.attributes.position;
      const list = this.fireflyPoints.userData.list;
      for (let i = 0; i < posAttr.count; i++) {
        const f = list[i];
        const nx = f.baseX + Math.sin(time * f.speed + f.phase) * f.driftRadius;
        const ny = Math.max(0.25, f.baseY + Math.sin(time * f.speed * 1.8 + f.phase) * 0.45);
        const nz = f.baseZ + Math.cos(time * f.speed * 0.8 + f.phase) * f.driftRadius;

        posAttr.setXYZ(i, nx, ny, nz);
      }
      posAttr.needsUpdate = true;

      // Gentle pulsing brightness
      this.fireflyPoints.material.opacity = 0.65 + Math.sin(time * 3.2) * 0.28;
    }

    // 4. Update Sun Motes
    if (this.motePoints && this.motePoints.visible) {
      const posAttr = this.motePoints.geometry.attributes.position;
      const list = this.motePoints.userData.list;
      for (let i = 0; i < posAttr.count; i++) {
        const m = list[i];
        let y = posAttr.getY(i) + Math.sin(time * m.speed + m.phase) * dt * 0.35;
        let x = posAttr.getX(i) + Math.cos(time * 0.4 + m.phase) * dt * 0.25;
        posAttr.setX(i, x);
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }
  }
}
