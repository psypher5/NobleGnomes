import * as THREE from 'three';
import { Gnome } from '../entities/Gnome.js';
import { LilyPadAlgae } from '../entities/PondAlgaeCoating.js';
import { sounds } from '../audio/SoundSynthesizer.js';

/**
 * Manages stranded garden gnomes waiting for rescue on algae-covered lily pads.
 * Players must clear the algae with bell shockwaves before rescuing each gnome.
 */
export class CrewManager {
  constructor(scene, tugboat, lilyPads) {
    this.scene = scene;
    this.tugboat = tugboat;
    this.lilyPads = lilyPads;
    this.strandedGnomes = [];
    this.rescuedGnomes = [];
    this.droppedOffGnomes = [];

    this.initStrandedGnomes();
  }

  initStrandedGnomes() {
    // Defensive check: ensure no stranded gnomes or algae leak into scene
    if (this.strandedGnomes && this.strandedGnomes.length > 0) {
      for (const g of this.strandedGnomes) {
        if (g.gnome && typeof g.gnome.dispose === 'function') g.gnome.dispose();
        if (g.algae && typeof g.algae.dispose === 'function') g.algae.dispose();
      }
      this.strandedGnomes = [];
    }

    const candidates = [
      {
        name: 'Pip',
        role: 'Lookout',
        hatColor: 0xffb703,  // Bright yellow
        smockColor: 0x219ebc, // Turquoise
        buffText: '+30% Bell Ripple Radius'
      },
      {
        name: 'Barnaby',
        role: 'Engineer',
        hatColor: 0x38b000,  // Vivid grass green
        smockColor: 0x6b705c, // Earthy olive
        buffText: '+35% Tugboat Engine Speed'
      },
      {
        name: 'Clover',
        role: 'Bell Tuner',
        hatColor: 0x7209b7,  // Rich royal violet
        smockColor: 0xf72585, // Rose magenta
        buffText: '-40% Bell Strike Cooldown'
      }
    ];

    candidates.forEach((c, idx) => {
      // Bind to dedicated lily pad
      const pad = this.lilyPads && this.lilyPads.pads ? this.lilyPads.pads[idx] : null;
      const initialPos = pad ? new THREE.Vector3(pad.x, pad.baseY + 0.08, pad.z) : new THREE.Vector3(14 + idx * 4, 0.35, -16 + idx * 8);

      c.position = initialPos;
      const gnome = new Gnome(c);
      gnome.group.position.copy(initialPos);

      // Distressed SOS beacon ring above gnome (turns golden when freed)
      const beaconGeo = new THREE.TorusGeometry(0.55, 0.06, 6, 16);
      beaconGeo.rotateX(Math.PI / 2);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b, // Amber distress alert
        transparent: true,
        opacity: 0.85
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = 1.6;
      gnome.group.add(beaconMesh);
      gnome.beaconMesh = beaconMesh;

      this.scene.add(gnome.group);

      // Create slimy algae covering the lily pad and entrapping the gnome
      let algae = null;
      if (pad) {
        algae = new LilyPadAlgae(this.scene, pad);
        algae.setPosition(initialPos.x, initialPos.y, initialPos.z);
      }

      this.strandedGnomes.push({
        data: c,
        gnome: gnome,
        pad: pad,
        algae: algae,
        position: initialPos.clone(),
        isAlgaeCleared: false,
        isRescued: false,
        promptCooldown: 0
      });
    });
  }

  update(dt, time, ripples, onRescueCallback, onHintCallback) {
    const boatPos = this.tugboat.position;

    for (let i = this.strandedGnomes.length - 1; i >= 0; i--) {
      const stranded = this.strandedGnomes[i];

      // If already rescued, keep updating remaining particles until they fade & pop
      if (stranded.isRescued) {
        if (stranded.algae && stranded.algae.hasActiveParticles()) {
          stranded.algae.update(dt, time);
        }
        continue;
      }

      // 1. Synchronize position with floating, bobbing lily pad
      if (stranded.pad) {
        const padPos = stranded.pad.group.position;
        stranded.position.copy(padPos);
        const hop = stranded.isAlgaeCleared ? Math.abs(Math.sin(time * 5.0)) * 0.12 : 0;
        stranded.gnome.group.position.set(padPos.x, padPos.y + 0.08 + hop, padPos.z);
        stranded.gnome.group.rotation.x = stranded.pad.group.rotation.x;
        stranded.gnome.group.rotation.z = stranded.pad.group.rotation.z;

        if (stranded.algae && !stranded.isAlgaeCleared) {
          stranded.algae.setPosition(padPos.x, padPos.y + 0.08, padPos.z);
          stranded.algae.setRotation(stranded.pad.group.rotation.x, stranded.pad.group.rotation.y, stranded.pad.group.rotation.z);
        }
      }

      // 2. Trapped vs Freed Behaviors
      if (!stranded.isAlgaeCleared) {
        // Frantic struggle animation while trapped
        stranded.gnome.animateTrapped(time);

        if (stranded.algae) {
          stranded.algae.update(dt, time);
        }

        // Bob distressed SOS beacon
        if (stranded.gnome.beaconMesh) {
          stranded.gnome.beaconMesh.rotation.z = time * 3.0;
          stranded.gnome.beaconMesh.scale.setScalar(1.0 + Math.sin(time * 6.0) * 0.18);
        }

        // Test bell acoustic shockwave collisions
        if (ripples && ripples.length > 0) {
          for (const rip of ripples) {
            if (rip.damageAppliedSet.has(stranded)) continue;

            const distToWave = rip.origin.distanceTo(new THREE.Vector2(stranded.position.x, stranded.position.z));
            if (distToWave >= rip.currentRadius - rip.speed * dt - 1.6 && distToWave <= rip.currentRadius + 1.6) {
              rip.damageAppliedSet.add(stranded);

              if (stranded.algae) {
                const cleared = stranded.algae.hit(1);
                if (cleared) {
                  stranded.isAlgaeCleared = true;
                  sounds.playBubblePop(1.2);

                  // Upgrade beacon to joyful radiant gold
                  if (stranded.gnome.beaconMesh) {
                    stranded.gnome.beaconMesh.material.color.setHex(0xfde047);
                    stranded.gnome.beaconMesh.scale.setScalar(1.5);
                  }

                  if (onHintCallback) {
                    onHintCallback(`🎉 ${stranded.data.name} is freed from the algae! Steer close to welcome them aboard!`, '#facc15');
                  }
                } else {
                  sounds.playSlimeSplat();
                  if (onHintCallback) {
                    onHintCallback(`💥 Algae cracked! Ring your bell again to free ${stranded.data.name}!`, '#86efac');
                  }
                }
              }
            }
          }
        }

        // Proximity warning if boat approaches while still trapped in algae
        const distToBoat = boatPos.distanceTo(stranded.position);
        if (distToBoat < 2.6 && this.tugboat) {
          this.tugboat.addAlgae(dt * 0.30);
        }
        if (distToBoat < 4.8) {
          stranded.promptCooldown = (stranded.promptCooldown || 0) - dt;
          if (stranded.promptCooldown <= 0) {
            stranded.promptCooldown = 2.8;
            if (onHintCallback) {
              onHintCallback(`🔔 ${stranded.data.name} is trapped in algae! Strike your brass bell (Space) to clear it!`, '#fbbf24');
            }
          }
        }
      } else {
        // Algae is cleared! Gnome celebrates triumphantly!
        stranded.gnome.animateFreed(time);

        if (stranded.algae) {
          stranded.algae.update(dt, time);
        }

        // Radiant golden celebration beacon
        if (stranded.gnome.beaconMesh) {
          stranded.gnome.beaconMesh.rotation.z = time * 1.5;
          stranded.gnome.beaconMesh.scale.setScalar(1.2 + Math.sin(time * 4.0) * 0.15);
        }

        // Ready for boarding!
        const distToBoat = boatPos.distanceTo(stranded.position);
        if (distToBoat < 3.8) {
          // RESCUE!
          stranded.isRescued = true;
          this.scene.remove(stranded.gnome.group);
          sounds.playGnomeRescue();

          // Accelerate any remaining bubbles into a celebratory pop so they never retain on screen
          if (stranded.algae) {
            stranded.algae.accelerateCollectionPop();
          }

          const boarded = this.tugboat.addCrewMember(stranded.data);
          if (boarded) {
            this.rescuedGnomes.push(stranded.data);
            this.applyPerk(stranded.data.role);

            if (onRescueCallback) {
              onRescueCallback(stranded.data);
            }
          }
        }
      }
    }
  }

  rescueAll() {
    for (const stranded of this.strandedGnomes) {
      if (!stranded.isRescued) {
        stranded.isRescued = true;
        if (stranded.gnome && stranded.gnome.group) {
          this.scene.remove(stranded.gnome.group);
        }
        if (stranded.algae) {
          stranded.algae.accelerateCollectionPop();
        }
        const boarded = this.tugboat.addCrewMember(stranded.data);
        if (boarded) {
          this.rescuedGnomes.push(stranded.data);
          this.applyPerk(stranded.data.role);
        }
      }
    }
  }

  applyPerk(role) {
    if (role === 'Lookout') {
      // Larger shockwave radius
      if (this.tugboat.bell) {
        this.tugboat.shockwaveRadiusBonus = 1.35;
      }
    } else if (role === 'Engineer') {
      // Faster tugboat
      this.tugboat.maxSpeed *= 1.35;
      this.tugboat.acceleration *= 1.3;
    } else if (role === 'Bell Tuner') {
      // Quicker bell chime
      if (this.tugboat.bell) {
        this.tugboat.bell.cooldownDuration *= 0.6;
      }
    }
  }

  getCrewCount() {
    // 1 captain + rescued gnomes
    return 1 + this.rescuedGnomes.length;
  }

  getOnboardCount() {
    return this.rescuedGnomes.length - (this.droppedOffGnomes ? this.droppedOffGnomes.length : 0);
  }

  allRescued() {
    return this.strandedGnomes.length > 0 && this.rescuedGnomes.length >= this.strandedGnomes.length;
  }

  checkPierDropOff(pier, isMapCleared = false) {
    if (!pier) return null;
    const onboardCount = this.getOnboardCount();
    if (onboardCount <= 0) return null;

    // Rescued gnomes ride aboard the tugboat to fight alongside the Captain!
    // They only disembark once the entire pond is cleansed!
    if (!isMapCleared) {
      return null;
    }

    if (pier.checkDropOffProximity(this.tugboat.position)) {
      const newlyDocked = pier.offloadGnomeCrew(this.rescuedGnomes);
      if (newlyDocked && newlyDocked.length > 0) {
        this.tugboat.offloadCrew();
        this.droppedOffGnomes = [...this.rescuedGnomes];
        const allRescuedAndSafe = (this.droppedOffGnomes.length >= this.strandedGnomes.length);
        sounds.playGnomeRescue();
        return {
          newlyDocked,
          totalDroppedOff: this.droppedOffGnomes.length,
          allRescuedAndSafe
        };
      }
    }
    return null;
  }

  resetLevel() {
    // 1. Remove and dispose all stranded gnomes and their algae cocoons
    for (const g of this.strandedGnomes) {
      if (g.gnome) {
        if (typeof g.gnome.dispose === 'function') {
          g.gnome.dispose();
        } else if (g.gnome.group && g.gnome.group.parent) {
          g.gnome.group.parent.remove(g.gnome.group);
        }
      }
      if (g.algae) {
        if (typeof g.algae.dispose === 'function') {
          g.algae.dispose();
        } else if (g.algae.group && g.algae.group.parent) {
          g.algae.group.parent.remove(g.algae.group);
        }
      }
    }
    this.strandedGnomes = [];
    this.rescuedGnomes = [];
    this.droppedOffGnomes = [];

    // 2. Clear crew seated on tugboat and reset perks
    if (this.tugboat) {
      this.tugboat.resetCrew();
      this.tugboat.shockwaveRadiusBonus = 1.0;
    }

    // 3. Re-spawn clean gnomes on lily pads
    this.initStrandedGnomes();
  }
}

