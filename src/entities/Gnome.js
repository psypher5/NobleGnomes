import * as THREE from 'three';

/**
 * High-fidelity stylized miniature Garden Gnome character.
 * Features:
 * - Multi-tiered fluffy lock beard and big bulbous nose with blushing cheeks
 * - Floppy curved felt hat with bobbing tip
 * - Chunky boots with golden buckle plates
 * - Detailed smock, leather belt, and role-specific handheld props
 */
export class Gnome {
  constructor(options = {}) {
    this.name = options.name || 'Gnome';
    this.role = options.role || 'Crew';
    this.hatColor = options.hatColor || 0xd62828; // Vibrant classic red
    this.smockColor = options.smockColor || 0x2b6cb0; // Warm cobalt blue
    this.isCaptain = options.isCaptain || false;
    this.isSitting = false;

    this.group = new THREE.Group();
    this.createModel();
  }

  createModel() {
    // 1. Smock / Body (chubby torso with rounded shoulders)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.smockColor,
      roughness: 0.72,
      metalness: 0.04,
      flatShading: false
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.54, 18), bodyMat);
    body.position.y = 0.36;
    body.castShadow = true;
    this.group.add(body);

    // Smock collar / hem trim
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.035, 8, 18), collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.63, 0);
    this.group.add(collar);

    // Brass buttons down the front placket
    const buttonMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.85, roughness: 0.25 });
    [0.34, 0.44, 0.54].forEach(by => {
      const button = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.015, 8), buttonMat);
      button.rotation.x = Math.PI / 2;
      button.position.set(0, by, 0.30);
      this.group.add(button);
    });

    // 2. Leather Belt & Golden Buckle
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.7 });
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 18), beltMat);
    belt.position.y = 0.28;
    this.group.add(belt);

    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.25, metalness: 0.85 });
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.05), buckleMat);
    buckle.position.set(0, 0.28, 0.31);
    this.group.add(buckle);

    // 3. Round Head & Expressive Storybook Face
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcdb2, roughness: 0.55 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), skinMat);
    head.position.y = 0.73;
    this.group.add(head);

    // Prominent round bulbous button nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), skinMat);
    nose.position.set(0, 0.72, 0.23);
    this.group.add(nose);

    // Rosy blushing cheeks
    const blushMat = new THREE.MeshStandardMaterial({
      color: 0xf28482,
      roughness: 0.8,
      transparent: true,
      opacity: 0.65
    });
    const blushGeo = new THREE.SphereGeometry(0.055, 8, 8);
    blushGeo.scale(1.2, 0.8, 0.4);

    [-0.13, 0.13].forEach(bx => {
      const blush = new THREE.Mesh(blushGeo, blushMat);
      blush.position.set(bx, 0.68, 0.19);
      this.group.add(blush);
    });

    // Pointed Garden Gnome Ears
    const earGeo = new THREE.ConeGeometry(0.055, 0.12, 8);
    earGeo.rotateZ(-Math.PI / 2);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.21, 0.71, 0.02);
    earL.rotation.y = 0.25;
    this.group.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.21, 0.71, 0.02);
    earR.rotation.y = -0.25;
    earR.rotation.z = Math.PI;
    this.group.add(earR);

    // Expressive Cartoon Eyes (Sclera + Iris + Pupil + Specular Catchlights)
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.25 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x181822, roughness: 0.15 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.25 }); // Cheerful sea-green
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    [-0.075, 0.075].forEach(ex => {
      // Sclera
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), eyeWhiteMat);
      eyeWhite.scale.set(1.0, 1.15, 0.75);
      eyeWhite.position.set(ex, 0.78, 0.215);
      this.group.add(eyeWhite);

      // Iris ring
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), irisMat);
      iris.position.set(ex, 0.78, 0.242);
      this.group.add(iris);

      // Pupil
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), pupilMat);
      pupil.position.set(ex, 0.78, 0.252);
      this.group.add(pupil);

      // Primary Specular Catchlight (upper-right)
      const glint1 = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), glintMat);
      glint1.position.set(ex + 0.012, 0.792, 0.263);
      this.group.add(glint1);

      // Secondary Catchlight (lower-left)
      const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), glintMat);
      glint2.position.set(ex - 0.008, 0.772, 0.263);
      this.group.add(glint2);
    });

    // Sculpted Bushy White Eyebrows
    const browMat = new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 0.85 });
    [-0.08, 0.08].forEach((bx, idx) => {
      const browGeo = new THREE.BoxGeometry(0.09, 0.038, 0.05);
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(bx, 0.835, 0.215);
      brow.rotation.z = idx === 0 ? 0.18 : -0.18; // Friendly inquisitive arch
      this.group.add(brow);
    });

    // 4. Multi-Layered Fluffy White Beard with Curled Locks & Handlebar Mustache
    const beardMat = new THREE.MeshStandardMaterial({
      color: 0xfdfdfd,
      roughness: 0.85,
      flatShading: false
    });

    // Central tapered full beard
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.54, 18), beardMat);
    beard.rotation.x = 0.22;
    beard.position.set(0, 0.50, 0.16);
    this.group.add(beard);

    // Sculpted lock curls cascading down chest
    const lockGeo = new THREE.SphereGeometry(0.075, 10, 8);
    lockGeo.scale(1.2, 0.9, 0.8);

    [
      { x: -0.09, y: 0.44, z: 0.21, rz: -0.2 },
      { x: 0.09, y: 0.44, z: 0.21, rz: 0.2 },
      { x: 0.0, y: 0.32, z: 0.22, rz: 0.0 },
      { x: -0.06, y: 0.24, z: 0.18, rz: -0.15 },
      { x: 0.06, y: 0.24, z: 0.18, rz: 0.15 }
    ].forEach(lp => {
      const lock = new THREE.Mesh(lockGeo, beardMat);
      lock.position.set(lp.x, lp.y, lp.z);
      lock.rotation.z = lp.rz;
      this.group.add(lock);
    });

    // Prominent curled handlebar mustache
    const stacheGeo = new THREE.CylinderGeometry(0.045, 0.07, 0.24, 10);
    stacheGeo.rotateZ(Math.PI / 2);
    stacheGeo.scale(1.0, 0.8, 1.2);

    const stacheL = new THREE.Mesh(stacheGeo, beardMat);
    stacheL.position.set(-0.10, 0.67, 0.22);
    stacheL.rotation.z = -0.32;
    stacheL.rotation.y = 0.20;
    this.group.add(stacheL);

    const stacheR = new THREE.Mesh(stacheGeo, beardMat);
    stacheR.position.set(0.10, 0.67, 0.22);
    stacheR.rotation.z = 0.32;
    stacheR.rotation.y = -0.20;
    this.group.add(stacheR);

    // 5. Classic Pointy Gnome Felt Hat with Sculpted S-Curve & Floppy Jingle Tip
    const hatMat = new THREE.MeshStandardMaterial({
      color: this.hatColor,
      roughness: 0.68,
      metalness: 0.05,
      flatShading: false
    });

    // A. Thick rolled felt cuff brim with stitch piping
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.055, 12, 24), hatMat);
    brim.rotation.x = Math.PI / 2 + 0.12;
    brim.position.set(0, 0.84, -0.01);
    brim.castShadow = true;
    this.group.add(brim);

    // Decorative hatband with golden buckle
    const hatBandMat = new THREE.MeshStandardMaterial({ color: 0x2b1e16, roughness: 0.7 });
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.285, 0.05, 24), hatBandMat);
    hatBand.rotation.x = 0.12;
    hatBand.position.set(0, 0.88, -0.01);
    this.group.add(hatBand);

    const hatBuckleMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.25, metalness: 0.85 });
    const hatBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.03), hatBuckleMat);
    hatBuckle.rotation.x = 0.12;
    hatBuckle.position.set(0, 0.88, 0.27);
    this.group.add(hatBuckle);

    // B. Main Continuous Hat (Single seamless cone with smooth organic slouch curve)
    // 24 radial segments, 24 height segments for seamless shading with zero cracks or seams
    const hatHeight = 0.86;
    const hatGeo = new THREE.CylinderGeometry(0.018, 0.275, hatHeight, 24, 24);
    hatGeo.translate(0, hatHeight * 0.5, 0); // Base at y=0, tip at y=hatHeight

    const bodyPos = hatGeo.attributes.position;
    for (let i = 0; i < bodyPos.count; i++) {
      const y = bodyPos.getY(i);
      const t = Math.max(0.0, Math.min(1.0, y / hatHeight)); // 0 (base) to 1 (tip)

      // Smooth, natural backward slouch curve
      const slouchZ = -Math.pow(t, 1.7) * 0.25;
      bodyPos.setZ(i, bodyPos.getZ(i) + slouchZ);

      // Floppy tip curl downward near apex
      if (t > 0.65) {
        const curlT = (t - 0.65) / 0.35;
        const curlDown = Math.pow(curlT, 1.8) * 0.09;
        bodyPos.setY(i, bodyPos.getY(i) - curlDown);
        bodyPos.setZ(i, bodyPos.getZ(i) - curlT * 0.08);
      }

      // Gentle soft felt wrinkles
      const wrinkle = Math.sin(t * Math.PI * 3.5) * 0.008 * (1.0 - t);
      bodyPos.setX(i, bodyPos.getX(i) * (1.0 + wrinkle));
    }
    hatGeo.computeVertexNormals();

    this.hatBody = new THREE.Mesh(hatGeo, hatMat);
    this.hatBody.position.set(0, 0.85, -0.01);
    this.hatBody.rotation.x = -0.08;
    this.hatBody.castShadow = true;
    this.group.add(this.hatBody);

    // C. Miniature Brass Jingle Bell at Tip
    this.hatTip = new THREE.Group();
    // Tip coordinates after slouch: y ≈ 0.85 + 0.86 - 0.09 = 1.62, z ≈ -0.01 - 0.25 - 0.08 = -0.34
    this.hatTip.position.set(0, 1.61, -0.34);

    const bellMat = new THREE.MeshStandardMaterial({
      color: 0xf5b738,
      roughness: 0.25,
      metalness: 0.85
    });
    const jingleBell = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), bellMat);
    this.hatTip.add(jingleBell);

    const bellRing = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 6, 12), bellMat);
    bellRing.position.set(0, 0.04, 0.01);
    this.hatTip.add(bellRing);

    this.group.add(this.hatTip);

    // 6. Articulated Legs & Chunky Dwarf Boots with Golden Buckles
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x2b1e16, roughness: 0.8, flatShading: false });
    const bootSoleMat = new THREE.MeshStandardMaterial({ color: 0x160f0b, roughness: 0.9 });
    const bootBuckleMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.85, roughness: 0.25 });
    const pantsMat = bodyMat;

    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.14, 0.22, 0.02);

    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.14, 0.22, 0.02);

    [this.leftLegGroup, this.rightLegGroup].forEach(legGroup => {
      // Upper leg / pants
      const pants = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.16, 10), pantsMat);
      pants.position.y = -0.06;
      legGroup.add(pants);

      // Boot body
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.22), bootMat);
      boot.position.set(0, -0.14, 0.04);
      legGroup.add(boot);

      // Upturned curved dwarf toe cap
      const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), bootMat);
      toeCap.scale.set(1.0, 0.8, 1.3);
      toeCap.position.set(0, -0.15, 0.16);
      legGroup.add(toeCap);

      // Thick boot sole
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.26), bootSoleMat);
      sole.position.set(0, -0.20, 0.05);
      legGroup.add(sole);

      // Golden buckle plate
      const bBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.03), bootBuckleMat);
      bBuckle.position.set(0, -0.11, 0.15);
      legGroup.add(bBuckle);
    });

    this.group.add(this.leftLegGroup);
    this.group.add(this.rightLegGroup);

    // 7. Arms / Hands & Role Props
    this.armPivot = new THREE.Group();
    this.armPivot.position.set(0.30, 0.55, 0);

    const armGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.28, 8);
    armGeo.translate(0, -0.14, 0);
    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    this.armPivot.add(rightArm);

    // Turned-up cuff
    const cuffGeo = new THREE.TorusGeometry(0.075, 0.018, 6, 12);
    const cuffR = new THREE.Mesh(cuffGeo, collarMat);
    cuffR.rotation.x = Math.PI / 2;
    cuffR.position.y = -0.22;
    this.armPivot.add(cuffR);

    const mitten = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), skinMat);
    mitten.position.y = -0.28;
    this.armPivot.add(mitten);

    this.group.add(this.armPivot);

    // Left Arm / Hand
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.30, 0.55, 0);

    const leftArmGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.28, 8);
    leftArmGeo.translate(0, -0.14, 0);
    const leftArm = new THREE.Mesh(leftArmGeo, bodyMat);
    this.leftArmPivot.add(leftArm);

    const cuffL = new THREE.Mesh(cuffGeo, collarMat);
    cuffL.rotation.x = Math.PI / 2;
    cuffL.position.y = -0.22;
    this.leftArmPivot.add(cuffL);

    const leftMitten = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), skinMat);
    leftMitten.position.y = -0.28;
    this.leftArmPivot.add(leftMitten);

    this.group.add(this.leftArmPivot);

    // Role-specific handheld prop
    if (this.isCaptain) {
      // Ornate brass-headed hammer for striking the bell
      const hammerGroup = new THREE.Group();
      hammerGroup.position.set(0, -0.32, 0.06);

      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 })
      );
      handle.position.y = 0.04;
      hammerGroup.add(handle);

      const hammerHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.10, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xf5b738, roughness: 0.35, metalness: 0.85 })
      );
      hammerHead.position.y = 0.15;
      hammerGroup.add(hammerHead);

      this.armPivot.add(hammerGroup);
    }
  }

  setSitting(isSitting) {
    this.isSitting = isSitting;
    if (isSitting) {
      // Hips hinge forward ~86 degrees so boots stick out forward over the seat edge
      this.leftLegGroup.rotation.x = -Math.PI * 0.48;
      this.rightLegGroup.rotation.x = -Math.PI * 0.48;
      // Arms rest comfortably on knees / bench
      this.armPivot.rotation.set(-0.35, 0, 0.22);
      if (this.leftArmPivot) {
        this.leftArmPivot.rotation.set(-0.35, 0, -0.22);
      }
    } else {
      // Reset to standing pose
      this.leftLegGroup.rotation.set(0, 0, 0);
      this.rightLegGroup.rotation.set(0, 0, 0);
      this.armPivot.rotation.set(0, 0, 0);
      if (this.leftArmPivot) {
        this.leftArmPivot.rotation.set(0, 0, 0);
      }
    }
  }

  animateSitting(time, index = 0, boatSpeed = 0) {
    if (!this.isSitting) return;

    // Playful alternating kicking of boots over the edge of the bench
    const kickSpeed = 3.5 + (Math.abs(boatSpeed) / 8.8) * 2.2;
    const kickAmp = 0.15 + (Math.abs(boatSpeed) / 8.8) * 0.10;
    const phase = index * 1.6;

    this.leftLegGroup.rotation.x = -Math.PI * 0.48 + Math.sin(time * kickSpeed + phase) * kickAmp;
    this.rightLegGroup.rotation.x = -Math.PI * 0.48 - Math.sin(time * kickSpeed + phase) * kickAmp;

    // Floppy hat tip swaying gently in the boat's wind
    if (this.hatTip) {
      const windPush = (Math.abs(boatSpeed) / 8.8) * 0.25;
      this.hatTip.rotation.z = Math.sin(time * 3.8 + phase) * 0.20;
      this.hatTip.rotation.x = -0.18 - windPush + Math.cos(time * 3.2 + phase) * 0.12;
    }

    // Gentle torso sway with the boat roll
    this.group.rotation.z = Math.sin(time * 2.2 + phase) * 0.05;

    // Arms behavior: resting on knees, or waving excitedly at higher speed
    if (Math.abs(boatSpeed) > 3.0) {
      // Excited waving / cheering while cruising!
      const cheer = Math.sin(time * 5.5 + phase);
      this.armPivot.rotation.x = -Math.PI * 0.65 + cheer * 0.25;
      this.armPivot.rotation.z = 0.35;
      if (this.leftArmPivot) {
        this.leftArmPivot.rotation.x = -0.35 + Math.cos(time * 4.0 + phase) * 0.12;
      }
    } else {
      // Relaxed idle on bench
      this.armPivot.rotation.x = -0.35 + Math.sin(time * 2.5 + phase) * 0.06;
      this.armPivot.rotation.z = 0.22;
      if (this.leftArmPivot) {
        this.leftArmPivot.rotation.x = -0.35 - Math.sin(time * 2.5 + phase) * 0.06;
        this.leftArmPivot.rotation.z = -0.22;
      }
    }
  }

  animateWiggle(time, speed = 1.0) {
    if (this.isSitting) return;

    // Joyful idle breathing & slight side-to-side bob
    if (this.hatTip) {
      this.hatTip.rotation.z = Math.sin(time * 2.5 * speed) * 0.12;
      this.hatTip.rotation.x = Math.cos(time * 2.0 * speed) * 0.08;
    }

    // Arm swing
    this.armPivot.rotation.x = Math.sin(time * 2.8 * speed) * 0.25;
    if (this.leftArmPivot) {
      this.leftArmPivot.rotation.x = -Math.sin(time * 2.8 * speed) * 0.25;
    }
  }

  animateTrapped(time) {
    if (this.isSitting) this.setSitting(false);

    // Frantic struggling & calling for help while mired in algae
    this.group.rotation.y = Math.sin(time * 7.0) * 0.14;

    if (this.hatTip) {
      this.hatTip.rotation.z = Math.sin(time * 9.0) * 0.22;
      this.hatTip.rotation.x = Math.cos(time * 8.0) * 0.18;
    }

    // Both arms raised high, waving frantically in distress!
    this.armPivot.rotation.x = -Math.PI * 0.65 + Math.sin(time * 8.5) * 0.35;
    this.armPivot.rotation.z = 0.3 + Math.cos(time * 7.0) * 0.2;

    if (this.leftArmPivot) {
      this.leftArmPivot.rotation.x = -Math.PI * 0.65 - Math.sin(time * 8.5) * 0.35;
      this.leftArmPivot.rotation.z = -0.3 - Math.cos(time * 7.0) * 0.2;
    }
  }

  animateFreed(time) {
    if (this.isSitting) this.setSitting(false);

    // Joyful cheering and celebration!
    if (this.hatTip) {
      this.hatTip.rotation.z = Math.sin(time * 5.0) * 0.3;
      this.hatTip.rotation.x = Math.abs(Math.sin(time * 5.0)) * 0.2;
    }

    // Arms raised triumphantly in celebration!
    this.armPivot.rotation.x = -Math.PI * 0.75 + Math.sin(time * 4.0) * 0.18;
    this.armPivot.rotation.z = 0.4 + Math.sin(time * 5.0) * 0.15;

    if (this.leftArmPivot) {
      this.leftArmPivot.rotation.x = -Math.PI * 0.75 + Math.sin(time * 4.0) * 0.18;
      this.leftArmPivot.rotation.z = -0.4 - Math.sin(time * 5.0) * 0.15;
    }
  }

  animatePierBumble(time, baseX, baseY, baseZ, phase = 0) {
    if (this.isSitting) this.setSitting(false);

    // 1. Grounded Footing & Cute Rhythmic Hops
    // Strictly bounded to [baseY, baseY + 0.08] so gnomes never float into the sky
    const hopSpeed = 4.2;
    const hop = Math.max(0, Math.sin(time * hopSpeed + phase)) * 0.08;
    this.group.position.y = baseY + hop;

    // 2. Bumbling Meander along Pier Planks
    // Organic, gentle wandering that keeps them safely within plank boundaries
    const walkT = time * 0.75 + phase;
    const wanderX = Math.sin(walkT) * 0.32 + Math.cos(walkT * 1.7) * 0.12;
    const wanderZ = Math.cos(walkT * 0.8) * 0.40 + Math.sin(walkT * 1.4) * 0.12;
    this.group.position.x = baseX + wanderX;
    this.group.position.z = baseZ + wanderZ;

    // 3. Waddling Gait (side-to-side body roll & subtle forward pitch)
    this.group.rotation.z = Math.sin(time * hopSpeed + phase) * 0.12;
    this.group.rotation.x = Math.sin(time * hopSpeed * 0.5 + phase) * 0.04;

    // Leg stepping
    this.leftLegGroup.rotation.x = Math.sin(time * hopSpeed + phase) * 0.28;
    this.rightLegGroup.rotation.x = -Math.sin(time * hopSpeed + phase) * 0.28;

    // 4. Cheerful Facing & Occasional Celebratory 360 Spin!
    const spinCycle = (time * 0.35 + phase * 0.7) % 8.0;
    let yaw = Math.PI + Math.sin(time * 1.1 + phase) * 0.35;
    if (spinCycle < 1.0) {
      const t = spinCycle / 1.0;
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      yaw += ease * Math.PI * 2;
    }
    this.group.rotation.y = yaw;

    // 5. Floppy Hat Tip Bobbing
    if (this.hatTip) {
      this.hatTip.rotation.z = Math.sin(time * hopSpeed + phase) * 0.32;
      this.hatTip.rotation.x = -0.15 + Math.abs(Math.sin(time * hopSpeed + phase)) * 0.28;
    }

    // 6. Celebratory Arms (pumping fists/props and waving in joy)
    const cheerRight = Math.sin(time * 4.8 + phase);
    this.armPivot.rotation.x = -Math.PI * 0.72 + cheerRight * 0.32;
    this.armPivot.rotation.z = 0.35 + Math.cos(time * 3.8 + phase) * 0.22;

    if (this.leftArmPivot) {
      const cheerLeft = Math.sin(time * 4.8 + phase + 1.2);
      this.leftArmPivot.rotation.x = -Math.PI * 0.72 - cheerLeft * 0.32;
      this.leftArmPivot.rotation.z = -0.35 - Math.cos(time * 3.8 + phase + 1.2) * 0.22;
    }
  }

  animateTrot(time, speed = 1.0) {
    if (this.isSitting) this.setSitting(false);

    // Rhythmic waddling trot cycle (body roll, arm pumping, leg stepping, hat spring)
    const stride = time * 9.0 * speed;
    this.group.rotation.z = Math.sin(stride) * 0.14;
    this.group.rotation.x = 0.08 + Math.sin(stride * 2.0) * 0.03;

    // Leg stride
    this.leftLegGroup.rotation.x = Math.sin(stride) * 0.45;
    this.rightLegGroup.rotation.x = -Math.sin(stride) * 0.45;

    // Trot arm swing
    this.armPivot.rotation.x = Math.sin(stride) * 0.55;
    this.armPivot.rotation.z = 0.25;
    if (this.leftArmPivot) {
      this.leftArmPivot.rotation.x = -Math.sin(stride) * 0.55;
      this.leftArmPivot.rotation.z = -0.25;
    }

    // Floppy hat tip spring
    if (this.hatTip) {
      this.hatTip.rotation.z = Math.sin(stride) * 0.28;
      this.hatTip.rotation.x = Math.abs(Math.sin(stride)) * 0.22 - 0.1;
    }
  }

  animateHammerStrike(progress) {
    if (this.isSitting) this.setSitting(false);

    // Striking brass bell: windup, snap impact, recoil, rest
    if (progress < 0.45) {
      const p = progress / 0.45;
      this.armPivot.rotation.x = -Math.PI * 0.6 - p * (Math.PI * 0.45);
      this.armPivot.rotation.z = 0.2 + p * 0.15;
      if (this.leftArmPivot) {
        this.leftArmPivot.rotation.x = -Math.PI * 0.5 - p * 0.3;
        this.leftArmPivot.rotation.z = -0.3;
      }
      this.group.rotation.x = -p * 0.12;
      if (this.hatTip) this.hatTip.rotation.x = -0.35 * p;
    } else if (progress < 0.60) {
      const p = (progress - 0.45) / 0.15;
      this.armPivot.rotation.x = -Math.PI * 1.05 + p * (Math.PI * 0.85);
      this.armPivot.rotation.z = 0.35 - p * 0.2;
      this.group.rotation.x = 0.18 * p;
      if (this.hatTip) this.hatTip.rotation.x = 0.30 * p;
    } else if (progress < 0.80) {
      const p = (progress - 0.60) / 0.20;
      const recoil = Math.sin(p * Math.PI);
      this.armPivot.rotation.x = -Math.PI * 0.20 - recoil * 0.40;
      this.group.rotation.x = 0.18 * (1 - p);
      if (this.leftArmPivot) {
        this.leftArmPivot.rotation.x = -Math.PI * 0.75 + recoil * 0.25;
      }
    } else {
      const p = (progress - 0.80) / 0.20;
      this.armPivot.rotation.x = -Math.PI * 0.35 * (1 - p);
      this.armPivot.rotation.z = 0.15;
      this.group.rotation.x = 0;
      if (this.leftArmPivot) {
        this.leftArmPivot.rotation.x = 0;
      }
    }
  }

  dispose() {
    if (this.beaconMesh) {
      if (this.beaconMesh.geometry) this.beaconMesh.geometry.dispose();
      if (this.beaconMesh.material) this.beaconMesh.material.dispose();
    }
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    this.group.traverse(child => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}

