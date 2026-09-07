import * as THREE from 'three';

/**
 * Smooth 3rd-person follow camera with velocity lookahead and gentle dampening.
 */
export class CameraManager {
  constructor(camera) {
    this.camera = camera;
    this.currentPosition = new THREE.Vector3(0, 14, -16);
    this.currentTarget = new THREE.Vector3();

    // Offset relative to boat heading
    this.distance = 15.0;
    this.height = 10.5;
    this.dampening = 4.5;
  }

  update(dt, targetPosition, targetHeading, targetSpeed = 0) {
    // Calculate ideal camera position behind the boat
    const backAngle = targetHeading + Math.PI;
    const speedZoom = (targetSpeed / 8.5) * 2.5;

    const idealX = targetPosition.x + Math.sin(backAngle) * (this.distance + speedZoom);
    const idealZ = targetPosition.z + Math.cos(backAngle) * (this.distance + speedZoom);
    const idealY = targetPosition.y + this.height;

    const idealPosition = new THREE.Vector3(idealX, idealY, idealZ);

    // Smooth lerp camera position
    this.currentPosition.lerp(idealPosition, Math.min(1.0, dt * this.dampening));
    this.camera.position.copy(this.currentPosition);

    // Look slightly ahead of boat for navigation comfort
    const forwardX = Math.sin(targetHeading);
    const forwardZ = Math.cos(targetHeading);
    const lookAhead = 3.5;

    const lookTarget = new THREE.Vector3(
      targetPosition.x + forwardX * lookAhead,
      targetPosition.y + 1.2,
      targetPosition.z + forwardZ * lookAhead
    );

    this.currentTarget.lerp(lookTarget, Math.min(1.0, dt * (this.dampening * 1.5)));
    this.camera.lookAt(this.currentTarget);
  }

  /**
   * Smooth cinematic camera flyby for the game intro sequence
   * Keyframe 0: High scenic diagonal overview of pond, willows, and pier
   * Keyframe 1: Low dynamic close-up framing the gangplank and brass bell
   * Keyframe 2: Standard third-person gameplay follow-cam pose
   */
  updateIntro(progress, targetPosition, targetHeading) {
    // 1. Calculate final gameplay pose (Keyframe 2)
    const backAngle = targetHeading + Math.PI;
    const idealX = targetPosition.x + Math.sin(backAngle) * this.distance;
    const idealZ = targetPosition.z + Math.cos(backAngle) * this.distance;
    const idealY = targetPosition.y + this.height;
    const pos2 = new THREE.Vector3(idealX, idealY, idealZ);

    const forwardX = Math.sin(targetHeading);
    const forwardZ = Math.cos(targetHeading);
    const target2 = new THREE.Vector3(
      targetPosition.x + forwardX * 3.5,
      targetPosition.y + 1.2,
      targetPosition.z + forwardZ * 3.5
    );

    // 2. Keyframe 0: High scenic overview looking across pond towards Port Bramble Pier
    const pos0 = new THREE.Vector3(targetPosition.x - 7.5, 9.5, targetPosition.z - 12.5);
    const target0 = new THREE.Vector3(targetPosition.x - 1.2, 1.0, targetPosition.z);

    // 3. Keyframe 1: Dynamic low-angle close-up facing bow, gangplank, and bell strike
    const pos1 = new THREE.Vector3(targetPosition.x - 2.8, 2.2, targetPosition.z - 2.6);
    const target1 = new THREE.Vector3(targetPosition.x - 0.2, 0.85, targetPosition.z + 0.2);

    // 4. Piecewise Hermite / Cubic spline interpolation
    const curPos = new THREE.Vector3();
    const curLook = new THREE.Vector3();

    if (progress < 0.65) {
      const u = progress / 0.65;
      const t = u * u * (3 - 2 * u); // Smoothstep
      curPos.lerpVectors(pos0, pos1, t);
      curLook.lerpVectors(target0, target1, t);
    } else {
      const u = (progress - 0.65) / 0.35;
      const t = u * u * (3 - 2 * u); // Smoothstep
      curPos.lerpVectors(pos1, pos2, t);
      curLook.lerpVectors(target1, target2, t);
    }

    this.currentPosition.copy(curPos);
    this.currentTarget.copy(curLook);
    this.camera.position.copy(curPos);
    this.camera.lookAt(curLook);
  }

  finishIntro(targetPosition, targetHeading) {
    const backAngle = targetHeading + Math.PI;
    const idealX = targetPosition.x + Math.sin(backAngle) * this.distance;
    const idealZ = targetPosition.z + Math.cos(backAngle) * this.distance;
    const idealY = targetPosition.y + this.height;

    this.currentPosition.set(idealX, idealY, idealZ);
    this.currentTarget.set(
      targetPosition.x + Math.sin(targetHeading) * 3.5,
      targetPosition.y + 1.2,
      targetPosition.z + Math.cos(targetHeading) * 3.5
    );

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }

  /**
   * Smooth cinematic camera choreography for the level completion outro:
   * Phase 1 (0.00 - 0.35): Mooring close-up — boat lining up at dock & gnomes starting out
   * Phase 2 (0.35 - 0.65): Tracking shot along pier steps as gnomes climb to top deck
   * Phase 3 (0.65 - 1.00): Grand sweeping pan out to panoramic view of the clean pond & returning wildlife
   */
  updateOutro(progress) {
    const pos1 = new THREE.Vector3(7.2, 3.8, 33.2);   // Close-up dock landing
    const look1 = new THREE.Vector3(2.2, 0.9, 30.8);

    const pos2 = new THREE.Vector3(4.8, 5.2, 34.6);   // Mid shot tracking up stairs
    const look2 = new THREE.Vector3(1.2, 2.1, 31.6);

    const pos3 = new THREE.Vector3(0.0, 26.0, 16.0);  // Panoramic aerial pond overview
    const look3 = new THREE.Vector3(0.0, 0.0, 0.0);

    const curPos = new THREE.Vector3();
    const curLook = new THREE.Vector3();

    if (progress < 0.35) {
      const u = progress / 0.35;
      const t = u * u * (3 - 2 * u);
      curPos.lerpVectors(pos1, pos2, t * 0.4);
      curLook.lerpVectors(look1, look2, t * 0.4);
    } else if (progress < 0.65) {
      const u = (progress - 0.35) / 0.30;
      const t = u * u * (3 - 2 * u);
      curPos.lerpVectors(pos1.clone().lerp(pos2, 0.4), pos2, t);
      curLook.lerpVectors(look1.clone().lerp(look2, 0.4), look2, t);
    } else {
      const u = (progress - 0.65) / 0.35;
      const t = u * u * (3 - 2 * u);
      curPos.lerpVectors(pos2, pos3, t);
      curLook.lerpVectors(look2, look3, t);
    }

    this.currentPosition.copy(curPos);
    this.currentTarget.copy(curLook);
    this.camera.position.copy(curPos);
    this.camera.lookAt(curLook);
  }
}
