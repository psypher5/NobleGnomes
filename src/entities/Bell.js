import * as THREE from 'three';
import { sounds } from '../audio/SoundSynthesizer.js';

/**
 * Massive brass bell mounted on the toy tugboat deck with hammer striker.
 */
export class Bell {
  constructor() {
    this.group = new THREE.Group();
    this.isStriking = false;
    this.strikeTime = 0;
    this.cooldown = 0;
    this.cooldownDuration = 0.55; // Quick satisfying cadence
    this.bigBellCooldown = 0;
    this.bigBellCooldownDuration = 4.5; // Strategic squad special recharge
    this.isBigBellStriking = false;

    this.createBellModel();
  }

  createBellModel() {
    // 1. Bell Mount Stand / Arch (dark wrought iron or wooden frame)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3a332a,
      roughness: 0.6,
      metalness: 0.4
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf5b738, // Rich gleaming brass
      roughness: 0.28,
      metalness: 0.85,
      flatShading: false
    });

    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), frameMat);
    leftPost.position.set(-0.55, 0.65, 0);
    this.group.add(leftPost);

    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), frameMat);
    rightPost.position.set(0.55, 0.65, 0);
    this.group.add(rightPost);

    const crossBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.25, 8), frameMat);
    crossBeam.rotation.z = Math.PI / 2;
    crossBeam.position.set(0, 1.25, 0);
    this.group.add(crossBeam);

    // Decorative golden acorn finial spire on top of crossbeam
    const finialBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.12, 8), brassMat);
    finialBase.position.set(0, 1.35, 0);
    this.group.add(finialBase);

    const finialSphere = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), brassMat);
    finialSphere.position.set(0, 1.44, 0);
    this.group.add(finialSphere);

    const finialTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 8), brassMat);
    finialTip.position.set(0, 1.55, 0);
    this.group.add(finialTip);

    // 2. Resonant Bell Body (polished reflective brass)
    this.bellPivot = new THREE.Group();
    this.bellPivot.position.set(0, 1.2, 0);

    // Bell shape: dome top + flaring lip
    const bellTop = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), brassMat);
    bellTop.position.y = -0.15;
    this.bellPivot.add(bellTop);

    const bellLip = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 0.55, 16, 1, true), brassMat);
    bellLip.position.y = -0.42;
    this.bellPivot.add(bellLip);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.06, 8, 18), brassMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.7;
    this.bellPivot.add(rim);

    // Decorative brass studs / rivets around the flared rim
    const studGeo = new THREE.SphereGeometry(0.024, 6, 6);
    const studCount = 12;
    for (let s = 0; s < studCount; s++) {
      const angle = (s / studCount) * Math.PI * 2;
      const stud = new THREE.Mesh(studGeo, frameMat);
      stud.position.set(Math.cos(angle) * 0.53, -0.70, Math.sin(angle) * 0.53);
      this.bellPivot.add(stud);
    }

    // Brass clapper hanging inside with swinging pivot
    this.clapperPivot = new THREE.Group();
    this.clapperPivot.position.set(0, -0.2, 0);
    const clapperStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), frameMat);
    clapperStem.position.y = -0.22;
    this.clapperPivot.add(clapperStem);

    const clapperBall = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), brassMat);
    clapperBall.position.y = -0.46;
    this.clapperPivot.add(clapperBall);
    this.bellPivot.add(this.clapperPivot);

    this.group.add(this.bellPivot);

    // 3. Striker Mallet (chunky cartoon wooden mallet with brass ferrule bands)
    this.malletPivot = new THREE.Group();
    this.malletPivot.position.set(0.7, 0.7, 0);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x824d28, roughness: 0.75 });
    const malletHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.72, 8), woodMat);
    malletHandle.position.y = 0.36;
    this.malletPivot.add(malletHandle);

    const malletHead = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.28, 12), frameMat);
    malletHead.rotation.z = Math.PI / 2;
    malletHead.position.set(0, 0.72, 0);
    this.malletPivot.add(malletHead);

    // Brass reinforcing rings on mallet head
    [-0.10, 0.10].forEach((ox) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.015, 6, 12), brassMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(ox, 0.72, 0);
      this.malletPivot.add(ring);
    });

    this.group.add(this.malletPivot);
  }

  /**
   * Triggers the hammer swing and bell chime
   */
  strike() {
    if (this.cooldown > 0) return false;

    this.isStriking = true;
    this.isBigBellStriking = false;
    this.strikeTime = 0;
    this.cooldown = this.cooldownDuration;

    sounds.playBellStrike(1.0);
    return true;
  }

  /**
   * Colossal "Big Bell Hit" Squad Strike:
   * Heavier mallet arc, intense acoustic vibrations, and deep resonant bronze gong.
   */
  strikeBigBell() {
    if (this.bigBellCooldown > 0) return false;

    this.isStriking = true;
    this.isBigBellStriking = true;
    this.strikeTime = 0;
    this.cooldown = 1.1; // Temporarily lock standard chime during mega strike
    this.bigBellCooldown = this.bigBellCooldownDuration;

    sounds.playBigBellHit(1.2);
    return true;
  }

  update(dt) {
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - dt);
    }
    if (this.bigBellCooldown > 0) {
      this.bigBellCooldown = Math.max(0, this.bigBellCooldown - dt);
    }

    if (this.isStriking) {
      const speed = this.isBigBellStriking ? 7.5 : 9.0;
      this.strikeTime += dt * speed;

      const malletSwingPower = this.isBigBellStriking ? 1.35 : 0.90;
      const bellWobblePower = this.isBigBellStriking ? 0.46 : 0.22;

      // Mallet windup and hit arc
      if (this.strikeTime < 1.0) {
        // Swing forward towards bell
        this.malletPivot.rotation.z = Math.sin(this.strikeTime * Math.PI) * malletSwingPower;
        this.bellPivot.rotation.z = 0;
      } else if (this.strikeTime < 2.5) {
        // Bell wobble rebound
        const ringTime = this.strikeTime - 1.0;
        this.bellPivot.rotation.z = Math.sin(ringTime * 14.0) * Math.exp(-ringTime * 2.0) * bellWobblePower;
        if (this.clapperPivot) {
          this.clapperPivot.rotation.z = -Math.sin(ringTime * 14.0) * Math.exp(-ringTime * 1.8) * (bellWobblePower * 1.6);
        }
        this.malletPivot.rotation.z = Math.max(0, malletSwingPower * Math.exp(-ringTime * 3.5));
      } else {
        this.isStriking = false;
        this.isBigBellStriking = false;
        this.bellPivot.rotation.z = 0;
        if (this.clapperPivot) this.clapperPivot.rotation.z = 0;
        this.malletPivot.rotation.z = 0;
      }
    }
  }

  getCooldownRatio() {
    return 1.0 - (this.cooldown / this.cooldownDuration);
  }

  getBigBellCooldownRatio() {
    return 1.0 - (this.bigBellCooldown / this.bigBellCooldownDuration);
  }
}
