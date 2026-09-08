import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { Lighting } from './core/Lighting.js';
import { CameraManager } from './core/CameraManager.js';
import { PostProcessing } from './core/PostProcessing.js';
import { PondWater, getWaterSurfaceHeight } from './environment/PondWater.js';
import { PondBed } from './environment/PondBed.js';
import { LilyPads } from './environment/WaterFlora.js';
import { Reeds } from './environment/Reeds.js';
import { PerimeterFoliage } from './environment/PerimeterFoliage.js';
import { Pier } from './environment/Pier.js';
import { WildlifeManager } from './environment/WildlifeManager.js';
import { PondMist } from './environment/PondMist.js';
import { WeatherSystem } from './environment/WeatherSystem.js';
import { BiomeManager } from './environment/BiomeManager.js';
import { Tugboat } from './entities/Tugboat.js';
import { SLIME_STAGE } from './entities/SlimeBlob.js';
import { RippleSystem } from './systems/RippleSystem.js';
import { SlimeManager } from './systems/SlimeManager.js';
import { CrewManager } from './systems/CrewManager.js';
import { PondTrashManager } from './systems/PondTrashManager.js';
import { SaveManager } from './systems/SaveManager.js';
import { UpgradeSystem } from './systems/UpgradeSystem.js';
import { MainMenu } from './ui/MainMenu.js';
import { WorldMap } from './ui/WorldMap.js';
import { ShopModal, SHOP_UPGRADES } from './ui/ShopModal.js';
import { HUD } from './ui/HUD.js';
import { sounds } from './audio/SoundSynthesizer.js';

class NobleGnomesGame {
  constructor() {
    this.container = document.getElementById('app-container');

    // Central Save Manager for multi-slot persistence
    this.saveManager = new SaveManager();

    // User Currency & Upgrades State (loaded from active save slot)
    this.salvageDebris = 45;
    this.upgrades = {
      hullPlating: 1,
      bellAlloy: 1,
      steamBoiler: 1,
      scupperBrush: 1
    };
    this.loadUserData();

    // Game state: 'MENU' (title screen), 'MAP' (world map), or 'PLAYING' (active 3D pond expedition)
    this.state = 'MENU';
    this.currentNode = null;

    this.sounds = sounds;
    window.game = this;

    // 1. Core Engine & Scene
    this.engine = new Engine(this.container);
    this.lighting = new Lighting(this.engine.scene);
    this.cameraManager = new CameraManager(this.engine.camera);

    // 2. Environment
    if (window.__gnomeLog) window.__gnomeLog('🌿 Planting pond bed, reeds & lily pads...');
    this.pondBed = new PondBed(42);
    this.engine.scene.add(this.pondBed.group);

    // 180 segments for high-fidelity Gerstner wave and ripple displacement
    this.pondWater = new PondWater(92, 180);
    this.engine.scene.add(this.pondWater.mesh);

    this.lilyPads = new LilyPads(18, 36);
    this.engine.scene.add(this.lilyPads.group);
    this.pondWater.setLilyPads(this.lilyPads.pads);

    this.reeds = new Reeds(41, 24);
    this.engine.scene.add(this.reeds.group);

    // High-detail garden perimeter: weeping willows, wildflowers, grass tufts, mossy boulders
    this.perimeterFoliage = new PerimeterFoliage(42);
    this.engine.scene.add(this.perimeterFoliage.group);

    // Port Bramble Pier (rustic wooden starting dock & gnome drop-off jetty)
    this.pier = new Pier(this.engine.scene);

    // 2b. Living Pond Wildlife (Koi fish, dragonflies, restoration motes)
    this.wildlifeManager = new WildlifeManager(this.engine.scene, this.pondWater);

    // Atmospheric low-altitude pond mist
    this.pondMist = new PondMist(38);
    this.engine.scene.add(this.pondMist.group);

    // Weather particles & dynamic biome environment manager
    this.weatherSystem = new WeatherSystem(this.engine.scene);
    this.biomeManager = new BiomeManager(
      this.pondWater,
      this.lighting,
      this.perimeterFoliage,
      this.pondBed,
      this.weatherSystem
    );

    // 3. Player Tugboat & Systems
    if (window.__gnomeLog) window.__gnomeLog('🚤 Rigging toy tugboat, whistle & brass bell...');
    this.tugboat = new Tugboat();
    this.engine.scene.add(this.tugboat.group);

    this.rippleSystem = new RippleSystem(this.pondWater);

    if (window.__gnomeLog) window.__gnomeLog('🦠 Spawning slime blobs & monsters...');
    this.slimeManager = new SlimeManager(this.engine.scene, 35);

    if (window.__gnomeLog) window.__gnomeLog('🍄 Placing stranded garden gnomes on algae-covered lily pads...');
    this.crewManager = new CrewManager(this.engine.scene, this.tugboat, this.lilyPads);

    if (window.__gnomeLog) window.__gnomeLog('🪵 Spawning floating pond trash for ship repairs...');
    this.pondTrashManager = new PondTrashManager(this.engine.scene, 35);

    // Wire Capsized Game Over Callback
    this.tugboat.onCapsizedCallback = () => {
      const purity = this.slimeManager.getPondPurityPercentage();
      const rescued = this.crewManager.droppedOffGnomes.length + this.crewManager.getOnboardCount();
      this.hud.showGameOver(
        { purity, rescuedGnomes: rescued },
        () => this.restartGame()
      );
    };

    // 4. Post-Processing (Tilt-Shift Miniature DoF & Storybook Grading)
    this.postProcessing = new PostProcessing(this.engine.renderer, this.engine.scene, this.engine.camera);

    // 5. Shop Modal Component
    this.shopModal = new ShopModal(
      () => this.salvageDebris,
      (cost) => this.spendDebris(cost),
      () => this.upgrades,
      (upgId, newTier) => this.applyUpgrade(upgId, newTier)
    );

    // 6. Overworld Progression Map Component
    this.worldMap = new WorldMap(
      (node) => this.sailToNode(node),
      () => this.shopModal.show(),
      () => this.salvageDebris,
      () => this.returnToMenu(),
      this.saveManager
    );
    this.worldMap.hide();

    // 7. Storybook Main Menu Title Screen Overlay
    this.mainMenu = new MainMenu(this.container, this.saveManager, {
      onPlay: () => this.startExpeditionFromMenu(),
      onSwitchSlot: (slotId) => this.switchSaveSlot(slotId),
      onSettingsChange: (settings) => this.applySettings(settings)
    });
    this.mainMenu.show();

    // 8. Gameplay HUD (hidden while in menu/map)
    this.hud = new HUD(
      () => this.triggerBell(),
      () => this.cleanBoat(),
      () => this.returnToMap(false),
      () => this.triggerBigBellHit(),
      (slotIdx) => this.triggerSpell(slotIdx)
    );
    this.hud.hide();

    // 9. Roguelite Upgrade & Spellcasting System
    this.upgradeSystem = new UpgradeSystem(this);
    this.isDrafting = false;

    this.applyAllUpgrades();

    // 8. Input State
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    this.isVictoryAnnounced = false;
    this.hasRenderedFirstFrame = false;

    // Cinematic Intro Sequence state
    this.isIntro = false;
    this.introElapsed = 0;
    this.introDuration = 3.8;
    this.introBellStruck = false;

    // Cinematic Outro Sequence state
    this.isOutro = false;
    this.outroTimer = 0;
    this.outroDuration = 6.8;

    // Expedition Progression & EXP System
    this.playerExp = 0;
    this.playerLevel = 1;
    this.expToNextLevel = 50;

    this.setupInput();
    window.game = this;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  triggerSpell(slotIdx) {
    if (this.upgradeSystem) {
      return this.upgradeSystem.castSpell(slotIdx);
    }
    return false;
  }

  gainExp(amount, sourceLabel = '') {
    if (amount <= 0) return;
    this.playerExp += amount;

    let leveledUp = false;
    while (this.playerExp >= this.expToNextLevel) {
      this.playerExp -= this.expToNextLevel;
      this.playerLevel++;
      this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5 + 25);
      leveledUp = true;
    }

    if (leveledUp) {
      // Passive Rank Upgrades
      this.tugboat.maxHealth += 10;
      this.tugboat.health = Math.min(this.tugboat.maxHealth, this.tugboat.health + 20);
      this.tugboat.maxSpeed = Math.min(10.5, this.tugboat.maxSpeed + 0.35);

      try { sounds.playTokenFanfare(); } catch (e) { sounds.playFanfare(); }
      this.hud.showHint(
        `⭐ EXPEDITION RANK UP! Rank ${this.playerLevel} Achieved! (+10 Max Hull, Engine Speed Boost 💨)`,
        '#facc15'
      );

      // Tome of the Lilypad: 3-Card Roguelite Draft Modal
      if (this.upgradeSystem) {
        const choices = this.upgradeSystem.getDraftChoices(3);
        if (choices && choices.length > 0) {
          this.isDrafting = true;
          this.input.forward = false;
          this.input.backward = false;
          this.input.left = false;
          this.input.right = false;
          this.tugboat.speed = 0;
          this.hud.showLevelUpDraft(choices, (chosen) => {
            this.upgradeSystem.applyChoice(chosen);
            this.isDrafting = false;
          });
        }
      }
    }
  }

  skipIntro() {
    if (!this.isIntro) return;
    this.isIntro = false;

    // Ensure bell is struck if not yet triggered
    if (!this.introBellStruck) {
      this.introBellStruck = true;
      this.triggerBell();
    }

    this.tugboat.finishBoarding();
    this.cameraManager.finishIntro(this.tugboat.position, this.tugboat.heading);
    this.hud.hideIntro();
  }

  startOutroCinematic() {
    if (this.isOutro || this.isVictoryAnnounced) return;
    this.isOutro = true;
    this.outroTimer = 0;
    this.outroDuration = 7.0;

    // 1. Offload remaining scum cargo into the pier compost vat
    if (this.tugboat.scumCargo > 0) {
      const dep = this.tugboat.scumCargo;
      this.tugboat.scumCargo = 0;
      this.slimeManager.addScumDeposited(dep);
      this.earnDebris(dep * 4);
      this.gainExp(dep * 15, 'Compost Deposit');
      this.pier.depositFromBoat(dep, this.tugboat.position);
    }

    // 2. Start gnomes marching from boat up the stairs (Captain Bramble leads the squad ashore)
    const rescuedData = (this.crewManager.rescuedGnomes && this.crewManager.rescuedGnomes.length > 0)
      ? this.crewManager.rescuedGnomes
      : this.crewManager.strandedGnomes.map(g => g.data);

    const captainData = {
      name: 'Bramble',
      role: 'Captain',
      hatColor: 0xd62828,
      smockColor: 0x1d3557,
      isCaptain: true
    };
    const allDisembarkingGnomes = [captainData, ...rescuedData];

    this.pier.startCinematicDisembark(allDisembarkingGnomes);
    this.crewManager.droppedOffGnomes = [...rescuedData];

    // Remove all onboard crew visuals from boat as they disembark so NO duplicate gnomes remain on boat
    this.tugboat.offloadCrew();
    if (this.tugboat.captain && this.tugboat.captain.group) {
      this.tugboat.captain.group.visible = false;
    }

    // 3. Cheerful audio sequence: whistle toot and joyful gnome chorus
    try {
      this.tugboat.tootWhistle();
      setTimeout(() => sounds.playGnomeCheer(), 450);
    } catch (e) {}

    // 4. Wildlife returning celebration
    if (this.wildlifeManager) {
      this.wildlifeManager.triggerAllFishLeapCelebration();
    }

    // 5. Narrative hint toast
    this.hud.showHint('🎉 Port Bramble Pier reached! Gnome crew safely ashore! (Press Space to skip)', '#4ade80');
  }

  finishOutroCinematic() {
    if (!this.isOutro && this.isVictoryAnnounced) return;
    this.isOutro = false;
    this.isVictoryAnnounced = true;

    // Instantly complete gnome disembark
    this.pier.finishCinematicDisembark();

    // Tugboat docked
    this.tugboat.position.set(3.2, 0.0, 30.5);
    this.tugboat.heading = Math.PI;
    this.tugboat.speed = 0;

    // Show Storybook Victory Modal
    const requiredGnomes = this.crewManager.strandedGnomes.length;
    const droppedOffCount = this.crewManager.droppedOffGnomes.length + requiredGnomes;
    const scumDeposited = this.slimeManager.getScumDeposited();
    const totalScum = this.slimeManager.getTotalScumSpawned();
    const bossSlime = this.slimeManager.getBossSlime();
    const bossDefeated = !bossSlime || bossSlime.isDead;
    const tokenName = (this.currentNode && this.currentNode.id === 'node-boss-fen') ? 'Ancient Fen Compass' : null;

    this.hud.showVictoryModal({
      nodeName: this.currentNode ? this.currentNode.name : 'Port Bramble Lily Pond',
      bossDefeated,
      rescuedGnomes: Math.max(droppedOffCount, requiredGnomes),
      totalGnomes: Math.max(requiredGnomes, 1),
      scumDeposited,
      totalScum: Math.max(totalScum, scumDeposited),
      debrisEarned: 45 + (scumDeposited * 4),
      tokenUnlocked: tokenName,
      onRetry: () => this.restartCurrentMap(),
      onContinue: () => this.returnToMap(true)
    });
  }

  setupInput() {
    this.activeKeys = new Set();

    window.addEventListener('keydown', (e) => {
      sounds.init();
      this.activeKeys.add(e.code);

      // Any navigation or action key skips intro immediately
      if (this.isIntro) {
        if (e.code === 'Space' || e.code === ' ' || e.code === 'Enter' || e.code === 'KeyW' || e.code === 'ArrowUp') {
          e.preventDefault();
          this.skipIntro();
          return;
        }
      }

      // Action key skips outro immediately to victory modal
      if (this.isOutro) {
        if (e.code === 'Space' || e.code === ' ' || e.code === 'Enter') {
          e.preventDefault();
          this.finishOutroCinematic();
          return;
        }
      }

      // When drafting, allow Keys 1, 2, 3 to pick draft cards, and ignore boat controls
      if (this.isDrafting) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          const cards = document.querySelectorAll('.draft-card');
          if (cards[0]) cards[0].click();
        } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
          const cards = document.querySelectorAll('.draft-card');
          if (cards[1]) cards[1].click();
        } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
          const cards = document.querySelectorAll('.draft-card');
          if (cards[2]) cards[2].click();
        }
        return;
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.input.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.input.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.input.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.input.right = true;
          break;
        case 'KeyE':
        case 'Keye':
        case 'KeyQ':
        case 'Keyq':
          e.preventDefault();
          this.triggerBigBellHit();
          break;
        case 'Digit1':
        case 'Numpad1':
          this.triggerSpell(0);
          break;
        case 'Digit2':
        case 'Numpad2':
          this.triggerSpell(1);
          break;
        case 'Digit3':
        case 'Numpad3':
          this.triggerSpell(2);
          break;
        case 'Digit4':
        case 'Numpad4':
          this.triggerSpell(3);
          break;
        case 'Space':
        case ' ':
          e.preventDefault();
          if (this.activeKeys.has('KeyC')) {
            this.triggerBigBellHit();
          } else {
            this.triggerBell();
          }
          break;
        case 'KeyH':
        case 'Keyh':
          this.tugboat.tootWhistle();
          break;
        case 'KeyC':
        case 'Keyc':
          if (this.activeKeys.has('Space')) {
            this.triggerBigBellHit();
          } else {
            this.cleanBoat();
          }
          break;
        case 'KeyM':
        case 'Keym':
          if (this.state === 'PLAYING') {
            this.returnToMap(false);
          } else if (this.state === 'MAP') {
            const node = this.worldMap.nodes.find((n) => n.id === this.worldMap.selectedNodeId);
            if (node && node.unlocked && node.type !== 'SHOP') {
              this.sailToNode(node);
            }
          }
          break;
        case 'KeyR':
        case 'Keyr':
          if (this.tugboat.isCapsized) {
            this.restartGame();
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.activeKeys.delete(e.code);
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.input.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.input.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.input.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.input.right = false;
          break;
      }
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.state === 'PLAYING') {
        e.preventDefault();
      }
    });

    window.addEventListener('pointerdown', (e) => {
      sounds.init();

      if (this.state === 'PLAYING') {
        if (this.isIntro) {
          if (e.target && !e.target.closest('#btn-sound')) {
            this.skipIntro();
            return;
          }
        }

        if (this.isOutro) {
          if (e.target && !e.target.closest('#btn-sound')) {
            this.finishOutroCinematic();
            return;
          }
        }

        if (this.isDrafting) return;

        // Right-Click triggers Spell Slot 0 (Steam Surge or primary spell)
        if (e.button === 2) {
          e.preventDefault();
          this.triggerSpell(0);
          return;
        }

        if (e.target && !e.target.closest('button') && !e.target.closest('.glass-card') && !e.target.closest('.gameover-card') && !e.target.closest('.victory-card') && !e.target.closest('.spell-slot') && !e.target.closest('#levelup-draft-modal')) {
          this.triggerBell();
        }
      }
    });
  }

  sailToNode(node) {
    sounds.init();

    this.currentNode = node;
    this.state = 'PLAYING';
    this.worldMap.hide();
    this.hud.show();

    // Reset tugboat and apply upgrade bonuses
    this.tugboat.resetBoat(3.2, 30.5, Math.PI);
    this.applyAllUpgrades();

    // Camera follow setup
    this.cameraManager.finishIntro(this.tugboat.position, this.tugboat.heading);

    // Fresh level instance: clear old slimes, rescued crew, pond debris, pier vat, and banners!
    this.slimeManager.resetLevel(node.levelConfig || {});
    this.crewManager.resetLevel();
    this.pondTrashManager.resetLevel();
    this.pier.resetLevel();
    if (this.wildlifeManager) this.wildlifeManager.resetLevel();
    this.hud.clearBanners();
    this.isVictoryAnnounced = false;
    this.isOutro = false;
    this.outroTimer = 0;

    // Apply destination node's custom environmental biome (water, lighting, foliage, terrain, weather)
    const biomeKey = (node.levelConfig && node.levelConfig.biome) ? node.levelConfig.biome : 'GARDEN_POND';
    this.biomeManager.applyBiome(biomeKey);

    // Dismiss intro if sailing from map
    this.isIntro = false;
    this.hud.hideIntro(true);

    this.hud.showHint(`⚓ Arrived at ${node.name}! Cleanse the pond & deposit scum at pier!`, '#38bdf8');
  }

  returnToMap(isVictory = false) {
    sounds.stopEngine();
    this.state = 'MAP';
    this.hud.hide();
    this.hud.clearBanners();
    this.pier.resetLevel();
    this.crewManager.resetLevel();
    if (this.wildlifeManager) this.wildlifeManager.resetLevel();
    this.isOutro = false;
    if (this.tugboat.isCapsized) {
      this.tugboat.resetBoat(3.2, 30.5, Math.PI);
    }
    if (isVictory && this.currentNode) {
      this.earnDebris(45);
      this.worldMap.markNodeCompleted(this.currentNode.id, 3);
      if (this.currentNode.id === 'node-boss-fen' && this.saveManager) {
        this.saveManager.addToken('token-fen-compass');
      }
    }
    // Restore calm daylight Garden Pond diorama for the world map
    this.biomeManager.applyBiome('GARDEN_POND');
    this.worldMap.show();
  }

  restartCurrentMap() {
    this.hud.clearBanners();
    this.hud.hideVictoryModal();
    if (this.currentNode) {
      this.sailToNode(this.currentNode);
    } else {
      const defaultNode = (this.worldMap && this.worldMap.nodes && this.worldMap.nodes[0])
        ? this.worldMap.nodes[0]
        : { id: 'node-home-pond', name: 'Port Bramble Lily Pond' };
      this.sailToNode(defaultNode);
    }
  }

  startExpeditionFromMenu() {
    this.state = 'MAP';
    this.mainMenu.hide();
    this.worldMap.show();
    sounds.init();
  }

  returnToMenu() {
    sounds.stopEngine();
    this.state = 'MENU';
    this.worldMap.hide();
    this.hud.hide();
    this.biomeManager.applyBiome('GARDEN_POND');
    this.mainMenu.show();
  }

  switchSaveSlot(slotId) {
    this.saveManager.setActiveSlotId(slotId);
    this.loadUserData();
    this.applyAllUpgrades();
    if (this.worldMap) {
      this.worldMap.reloadProgress();
    }
  }

  applySettings(settings) {
    if (!settings) return;
    if (typeof settings.particles === 'boolean' && this.weatherSystem) {
      this.weatherSystem.group.visible = settings.particles;
    }
  }

  earnDebris(amount) {
    this.salvageDebris += amount;
    this.saveUserData();
    if (this.worldMap) this.worldMap.updateStatsBar();
  }

  spendDebris(amount) {
    if (this.salvageDebris >= amount) {
      this.salvageDebris -= amount;
      this.saveUserData();
      if (this.worldMap) this.worldMap.updateStatsBar();
      return true;
    }
    return false;
  }

  loadUserData() {
    if (this.saveManager) {
      const slot = this.saveManager.loadActiveSlot();
      if (slot) {
        if (typeof slot.salvageDebris === 'number') this.salvageDebris = slot.salvageDebris;
        if (slot.upgrades) this.upgrades = { ...this.upgrades, ...slot.upgrades };
        if (typeof slot.playerLevel === 'number') this.playerLevel = slot.playerLevel;
        if (typeof slot.playerExp === 'number') this.playerExp = slot.playerExp;
        if (typeof slot.expToNextLevel === 'number') this.expToNextLevel = slot.expToNextLevel;
        return;
      }
    }

    try {
      const raw = localStorage.getItem('noble_gnomes_save_v1');
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.salvageDebris === 'number') this.salvageDebris = data.salvageDebris;
        if (data.upgrades) this.upgrades = { ...this.upgrades, ...data.upgrades };
        if (typeof data.playerLevel === 'number') this.playerLevel = data.playerLevel;
        if (typeof data.playerExp === 'number') this.playerExp = data.playerExp;
        if (typeof data.expToNextLevel === 'number') this.expToNextLevel = data.expToNextLevel;
      }
    } catch (e) {
      console.warn('Could not load user save:', e);
    }
  }

  saveUserData() {
    if (this.saveManager) {
      this.saveManager.saveActiveSlot({
        salvageDebris: this.salvageDebris,
        upgrades: this.upgrades,
        playerLevel: this.playerLevel,
        playerExp: this.playerExp,
        expToNextLevel: this.expToNextLevel
      });
    }

    try {
      localStorage.setItem(
        'noble_gnomes_save_v1',
        JSON.stringify({
          salvageDebris: this.salvageDebris,
          upgrades: this.upgrades,
          playerLevel: this.playerLevel,
          playerExp: this.playerExp,
          expToNextLevel: this.expToNextLevel
        })
      );
    } catch (e) {
      console.warn('Could not save user data:', e);
    }
  }

  applyUpgrade(upgId, tier) {
    this.upgrades[upgId] = tier;
    this.saveUserData();
    this.applyAllUpgrades();
    this.hud.showHint(`✨ Upgraded ${SHOP_UPGRADES[upgId].name} to Tier ${tier}!`, '#38bdf8');
  }

  applyAllUpgrades() {
    // Hull Plating
    const hpTier = SHOP_UPGRADES.hullPlating.tiers[this.upgrades.hullPlating - 1];
    if (hpTier) {
      this.tugboat.maxHealth = hpTier.value;
      if (!this.tugboat.isCapsized && this.tugboat.health > 0) {
        this.tugboat.health = Math.min(this.tugboat.maxHealth, this.tugboat.health);
      }
    }

    // Bell Alloy
    const bellTier = SHOP_UPGRADES.bellAlloy.tiers[this.upgrades.bellAlloy - 1];
    if (bellTier) {
      this.tugboat.shockwaveRadiusBonus = bellTier.value;
    }

    // Steam Boiler
    const boilerTier = SHOP_UPGRADES.steamBoiler.tiers[this.upgrades.steamBoiler - 1];
    if (boilerTier) {
      this.tugboat.maxSpeed = boilerTier.value;
    }

    // Scupper Scrapers
    const mopTier = SHOP_UPGRADES.scupperBrush.tiers[this.upgrades.scupperBrush - 1];
    if (mopTier) {
      this.tugboat.algaeDragMultiplier = mopTier.value;
    }
  }

  restartGame() {
    this.tugboat.resetBoat(3.2, 30.5, Math.PI);
    this.slimeManager.resetBossPosition();
    this.cameraManager.finishIntro(this.tugboat.position, this.tugboat.heading);
    this.hud.hideGameOver();
    this.hud.showHint('⚓ Tugboat refloated at Port Bramble! Bog Behemoth retreated to The Boss Fen!', '#38bdf8');
  }

  cleanBoat() {
    sounds.init();

    const res = this.tugboat.cleanBoat();
    if (res.cleaned) {
      this.hud.showHint('🧽 Boat Scrubbed Clean! Full engine speed restored! 💨', '#38bdf8');
    } else {
      this.hud.showHint('✨ Hull is already sparkling clean!', '#facc15');
    }
  }

  triggerBell() {
    sounds.init();

    const struck = this.tugboat.bell.strike();
    if (struck) {
      const bellWorldPos = this.tugboat.getBellWorldPosition();
      const radiusBonus = this.tugboat.shockwaveRadiusBonus || 1.0;
      this.rippleSystem.triggerBellShockwave(bellWorldPos, 10.5 * radiusBonus, 13.0, 0.85, false);
      this.tugboat.tootWhistle();

      // Acoustic vibration shakes off loose surface algae
      if (this.tugboat.algaeLevel > 0) {
        this.tugboat.algaeLevel = Math.max(0, this.tugboat.algaeLevel - 0.15);
      }
    }
  }

  /**
   * Triggers the "Big Bell Hit" Squad Combo Chime:
   * Unleashed only when the full Gnome Crew is safely aboard Captain Bramble's deck!
   * Pierces the armored Bog Behemoth and delivers heavy concussive damage.
   */
  triggerBigBellHit() {
    sounds.init();

    // 1. Crew check
    if (!this.crewManager.allRescued()) {
      const rescued = this.crewManager.rescuedGnomes.length;
      const total = this.crewManager.strandedGnomes.length;
      this.hud.showHint(`🔒 Big Bell Hit requires the full Gnome Crew! (${rescued}/${total} aboard)`, '#fbbf24');
      return;
    }

    // 2. Trigger Big Bell strike on tugboat
    const struck = this.tugboat.triggerBigBellHit();
    if (struck) {
      const bellWorldPos = this.tugboat.getBellWorldPosition();
      const radiusBonus = this.tugboat.shockwaveRadiusBonus || 1.0;
      // Colossal shockwave: 22m radius, 17.0 speed, 2.4 strength, isBigBell: true
      this.rippleSystem.triggerBellShockwave(bellWorldPos, 22.0 * radiusBonus, 17.0, 2.4, true);

      this.hud.showHint('💥 SQUAD RESONANCE! Colossal Big Bell Shockwave unleashed!', '#facc15');
    } else {
      this.hud.showHint('⏳ Big Bell is recharging...', '#94a3b8');
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.engine.clock.getDelta(), 0.1);
    const elapsedTime = this.engine.clock.getElapsedTime();

    // 0. MENU / MAP OVERWORLD STATE: Orbit camera around lush pond diorama in background
    if (this.state === 'MENU' || this.state === 'MAP') {
      sounds.stopEngine();
      const orbitSpeed = this.state === 'MENU' ? 0.035 : 0.05;
      const angle = elapsedTime * orbitSpeed;
      this.engine.camera.position.set(Math.cos(angle) * 32, 16, Math.sin(angle) * 32);
      this.engine.camera.lookAt(0, 1.0, 0);

      this.pondWater.update(dt, elapsedTime, this.tugboat);
      this.lilyPads.update(dt, elapsedTime, this.tugboat, this.rippleSystem.ripples);
      this.reeds.update(elapsedTime);
      this.perimeterFoliage.update(elapsedTime);
      this.pondMist.update(dt, elapsedTime);
      this.weatherSystem.update(dt, elapsedTime, null);

      this.postProcessing.render();

      if (!this.hasRenderedFirstFrame) {
        this.hasRenderedFirstFrame = true;
        if (window.__gnomeLog) window.__gnomeLog('🎉 Noble Gnomes Ready! Welcome aboard.');
        const loader = document.getElementById('loading-screen');
        if (loader) {
          loader.style.transition = 'opacity 0.4s ease';
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 450);
        }
      }
      return;
    }

    // 0b. DRAFTING PAUSE STATE: Tome of the Lilypad Card Selection
    // Fully pauses all gameplay simulation (slimes, boss attacks, rock projectiles, boat damage)
    if (this.isDrafting) {
      sounds.stopEngine();
      this.tugboat.speed = 0;
      this.cameraManager.update(0, this.tugboat.position, this.tugboat.heading, 0);

      // Render aesthetic background diorama (water, foliage, weather, mist)
      this.pondWater.update(dt, elapsedTime, this.tugboat);
      this.lilyPads.update(dt, elapsedTime, this.tugboat, this.rippleSystem.ripples);
      this.reeds.update(elapsedTime);
      this.perimeterFoliage.update(elapsedTime);
      this.pondMist.update(dt, elapsedTime);
      this.weatherSystem.update(dt, elapsedTime, this.tugboat.position);

      this.postProcessing.render();
      return;
    }

    // 1. Handle Intro Cinematic or standard Player Control & Camera Follow
    if (this.isIntro) {
      sounds.stopEngine();
      this.introElapsed += dt;
      const progress = Math.min(1.0, this.introElapsed / this.introDuration);

      if (progress >= 0.72 && !this.introBellStruck) {
        this.introBellStruck = true;
        this.triggerBell();
      }

      this.tugboat.updateBoarding(progress, elapsedTime);
      this.cameraManager.updateIntro(progress, this.tugboat.position, this.tugboat.heading);

      if (progress >= 1.0) {
        this.skipIntro();
      }
    } else if (this.isOutro) {
      sounds.stopEngine();
      this.outroTimer += dt;
      const progress = Math.min(1.0, this.outroTimer / this.outroDuration);

      // Smoothly steer boat into lower landing berth (3.2, 0.0, 30.5)
      const targetPos = new THREE.Vector3(3.2, 0.0, 30.5);
      this.tugboat.position.lerp(targetPos, dt * 2.4);
      this.tugboat.position.y = getWaterSurfaceHeight(this.tugboat.position.x, this.tugboat.position.z, elapsedTime);
      this.tugboat.heading = THREE.MathUtils.lerp(this.tugboat.heading, Math.PI, dt * 2.8);
      this.tugboat.speed = THREE.MathUtils.lerp(this.tugboat.speed, 0, dt * 3.5);
      this.tugboat.group.position.copy(this.tugboat.position);
      this.tugboat.group.rotation.y = this.tugboat.heading;

      // Update cinematic outro camera
      this.cameraManager.updateOutro(progress);

      if (progress >= 1.0) {
        this.finishOutroCinematic();
      }
    } else {
      this.tugboat.update(dt, this.input, elapsedTime);
      this.cameraManager.update(dt, this.tugboat.position, this.tugboat.heading, this.tugboat.speed);

      // Dynamic engine audio: only putters when boat is moving or player is throttling
      if (!this.isDrafting && this.state === 'PLAYING') {
        const isThrottling = Boolean(this.input.forward || this.input.backward);
        const speedRatio = Math.abs(this.tugboat.speed) / (this.tugboat.maxSpeed || 8.8);
        sounds.updateEngineSpeed(speedRatio, isThrottling, this.tugboat.algaeLevel || 0);
      } else {
        sounds.stopEngine();
      }
    }

    // 3. Update Environment with boat dynamics & wake interaction
    this.pondWater.update(dt, elapsedTime, this.tugboat);
    this.lilyPads.update(dt, elapsedTime, this.tugboat, this.rippleSystem.ripples);
    this.reeds.update(elapsedTime);
    this.perimeterFoliage.update(elapsedTime);
    this.pier.update(dt, elapsedTime, this.tugboat.position, this.crewManager.getOnboardCount(), this.tugboat.scumCargo || 0);
    this.pondMist.update(dt, elapsedTime);
    this.weatherSystem.update(dt, elapsedTime, this.tugboat.position);
    if (this.wildlifeManager) {
      this.wildlifeManager.update(dt, elapsedTime, this.slimeManager.getRemainingCount() === 0, this.isOutro);
    }

    // 4. Update Slime Ecosystem & Ripple Cleansing (supports Chrono Chime time-dilation)
    const slimeDt = dt * (this.upgradeSystem ? this.upgradeSystem.getTimeSlowFactor() : 1.0);
    this.slimeManager.update(
      slimeDt,
      elapsedTime,
      this.tugboat.position,
      this.pondWater,
      this.tugboat.heading,
      this.tugboat.speed,
      this.tugboat,
      (hintText, hintColor) => {
        this.hud.showHint(hintText, hintColor);
      },
      this.rippleSystem,
      (scumValue, expEarned) => {
        const mult = (this.upgradeSystem ? this.upgradeSystem.getScumYieldMultiplier() : 1);
        this.gainExp(expEarned * mult, 'Algae Scum');
      }
    );

    // 4b. Update Active Gnome Wizard Spells & Roguelite System
    if (this.upgradeSystem) {
      this.upgradeSystem.update(dt, elapsedTime);
      this.hud.updateSpells(this.upgradeSystem.equippedSpells);
    }

    this.rippleSystem.update(dt, this.slimeManager.slimes, (slime, isDestroyed, isShielded, hitResult, isBigBell) => {
      if (isShielded) {
        this.hud.showHint(
          `🛡️ Bog Behemoth is SHIELDED! Rescue all Gnome friends to break its shield! (${this.crewManager.rescuedGnomes.length}/${this.crewManager.strandedGnomes.length})`,
          '#38bdf8'
        );
      } else if (hitResult && hitResult.immuneToNormalBell) {
        this.hud.showHint(
          '🛡️ Bog Behemoth armor deflects standard chimes! Unleash the BIG BELL HIT [Key E / Space+C]!',
          '#fbbf24'
        );
      } else {
        if (isBigBell && slime.stage === SLIME_STAGE.BOSS) {
          if (isDestroyed) {
            this.hud.showHint('👑 BOG BEHEMOTH VANQUISHED! 🔱 Bog Master Compass Unlocked!', '#facc15');
            try { sounds.playTokenFanfare(); } catch (e) { sounds.playFanfare(); }
            if (this.saveManager) {
              this.saveManager.addToken('token-fen-compass');
            }
          } else {
            const phase = (typeof slime.getBossPhase === 'function') ? slime.getBossPhase() : 1;
            const enrageText = phase === 3 ? ' 🔥 ENRAGED!' : (phase === 2 ? ' ⚡ AGITATED!' : '');
            this.hud.showHint(`💥 DIRECT HIT ON BEHEMOTH! (-2 HP, ${slime.health}/10 HP left!)${enrageText}`, '#f87171');
            try { sounds.playFanfare(); } catch (e) { /* audio fallback safe */ }
          }
        }
        this.slimeManager.handleSlimeCleansed(slime, isDestroyed);
      }
    });

    // 5. Update Gnome Crew Rescues & Algae Cleansing
    this.crewManager.update(
      dt,
      elapsedTime,
      this.rippleSystem.ripples,
      (gnomeData) => {
        this.hud.showRescueBanner(gnomeData);
      },
      (hintText, hintColor) => {
        this.hud.showHint(hintText, hintColor);
      }
    );

    // Check Boss Shield Break: when all gnomes are rescued, shatter boss shield!
    const boss = this.slimeManager.getBossSlime();
    const allGnomesRescued = this.crewManager.allRescued();
    if (boss && boss.isShielded && allGnomesRescued) {
      boss.breakShield();
      this.hud.showHint('⚡ SQUAD ASSEMBLED! The Gnome Crew shatters the Bog Behemoth\'s shield! ATTACK NOW!', '#facc15');
      try { sounds.playFanfare(); } catch (e) { /* audio fallback safe */ }
    }

    // Check Map Clearance Status:
    // Map is cleared when all slimes & miniboss are defeated AND all gnomes have been rescued!
    const remaining = this.slimeManager.getRemainingCount();
    const allSlimesCleared = remaining === 0;
    const isMapCleared = allSlimesCleared && allGnomesRescued;

    // Check Port Bramble Pier drop-offs (Gnomes & Scum)
    const isAtPier = this.pier.checkDropOffProximity(this.tugboat.position);

    // 5a. Disembark rescued gnomes onto the pier deck (handled via outro cinematic when map is cleared)
    if (!this.isOutro && !isMapCleared) {
      const dropOffResult = this.crewManager.checkPierDropOff(this.pier, isMapCleared);
      if (dropOffResult) {
        this.hud.showDropOffBanner(dropOffResult);
      }
    }

    // 5b. Unload collected algae scum into the pier compost vat (ANY TIME AT THE PIER!)
    if (isAtPier && this.tugboat.scumCargo > 0) {
      const scumToUnload = this.tugboat.unloadScumCargo();
      this.pier.depositFromBoat(scumToUnload, this.tugboat.position);
      this.slimeManager.addScumDeposited(scumToUnload);
      const earnedDebris = scumToUnload * 4;
      const expEarned = scumToUnload * 15;
      this.earnDebris(earnedDebris);
      this.gainExp(expEarned, 'Compost Deposit');
      this.hud.showHint(`🌿 Composted ${scumToUnload} Algae Scum into Vat! (+${earnedDebris} Salvage Debris ✨, +${expEarned} EXP ⭐)`, '#4ade80');
    } else if (isAtPier && !isMapCleared && this.tugboat.scumCargo === 0) {
      // Docking at pier before map is cleared: show helpful radio reminder
      this.pierBlockedTimer = (this.pierBlockedTimer || 0) + dt;
      if (this.pierBlockedTimer > 4.5) {
        this.pierBlockedTimer = 0;
        if (!allGnomesRescued) {
          this.hud.showHint(`⚓ Port Bramble Pier: "Rescue your stranded Gnome friends! (${this.crewManager.rescuedGnomes.length}/${this.crewManager.strandedGnomes.length} aboard)"`, '#fbbf24');
        } else if (!allSlimesCleared) {
          this.hud.showHint('⚓ Port Bramble Pier: "The pond is still infested! Defeat the Bog Behemoth with the BIG BELL [E]!"', '#f87171');
        }
      }
    }

    // 5c. Update Floating Pond Trash Debris for Ship Repairs & Shop Currency
    this.pondTrashManager.update(
      dt,
      elapsedTime,
      this.tugboat,
      (toastText, toastColor) => {
        this.earnDebris(8);
        this.hud.showHint(toastText, toastColor);
      }
    );

    // 6. Update HUD with multi-objective metrics
    const purity = this.slimeManager.getPondPurityPercentage();
    const crewCount = this.crewManager.getCrewCount();
    const bellCooldownRatio = this.tugboat.bell.getCooldownRatio();
    const onboardCount = this.crewManager.getOnboardCount();
    const droppedOffCount = this.crewManager.droppedOffGnomes.length;
    const scumOnboard = this.tugboat.scumCargo || 0;
    const scumDeposited = this.slimeManager.getScumDeposited();
    const totalScum = this.slimeManager.getTotalScumSpawned();

    const bossInfo = (boss && !boss.isDead) ? {
      health: boss.health,
      maxHealth: boss.maxHealth,
      isShielded: boss.isShielded,
      isAlive: true,
      gnomesRescued: this.crewManager.rescuedGnomes.length,
      gnomesRequired: this.crewManager.strandedGnomes.length
    } : null;

    const bigBellCooldownRatio = this.tugboat.bell.getBigBellCooldownRatio();
    const hasAllGnomes = allGnomesRescued;

    this.hud.update(
      purity,
      remaining,
      crewCount,
      this.crewManager.rescuedGnomes,
      bellCooldownRatio,
      onboardCount,
      droppedOffCount,
      this.tugboat.algaeLevel,
      this.tugboat.health,
      this.tugboat.maxHealth,
      scumOnboard,
      scumDeposited,
      totalScum,
      bossInfo,
      bigBellCooldownRatio,
      hasAllGnomes,
      this.playerLevel,
      this.playerExp,
      this.expToNextLevel
    );

    // 7. Multi-Objective Expedition Victory & Outro Cinematic Trigger:
    // When pond is cleared (all slimes defeated & gnomes rescued), docking at the pier triggers the cinematic outro!
    const requiredGnomes = this.crewManager.strandedGnomes.length;

    if (isMapCleared && !this.isOutro && !this.isVictoryAnnounced) {
      if (isAtPier || !this.pier) {
        this.startOutroCinematic();
      } else {
        this.pierReturnPromptTimer = (this.pierReturnPromptTimer || 0) + dt;
        if (this.pierReturnPromptTimer > 3.5) {
          this.pierReturnPromptTimer = 0;
          this.hud.showHint('🏆 POND PURGED! Sail back to Port Bramble Pier to dock your boat & celebrate!', '#38bdf8');
        }
      }
    } else if (allSlimesCleared && !allGnomesRescued && !this.isOutro && !this.isVictoryAnnounced) {
      this.rescueReturnPromptTimer = (this.rescueReturnPromptTimer || 0) + dt;
      if (this.rescueReturnPromptTimer > 4.0) {
        this.rescueReturnPromptTimer = 0;
        this.hud.showHint(`🏆 SLIMES PURGED! Rescue your stranded Gnome friends! (${this.crewManager.rescuedGnomes.length}/${requiredGnomes} aboard)`, '#fbbf24');
      }
    }

    // 7. Render with Tilt-Shift Post-Processing
    this.postProcessing.render();

    // Dismiss loading screen on first rendered frame
    if (!this.hasRenderedFirstFrame) {
      this.hasRenderedFirstFrame = true;
      if (window.__gnomeLog) window.__gnomeLog('🎉 First frame rendered! Ready to play.');
      const loader = document.getElementById('loading-screen');
      if (loader) {
        loader.style.transition = 'opacity 0.4s ease';
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 450);
      }
    }
  }
}

function launchGame() {
  try {
    if (window.__gnomeLog) window.__gnomeLog('🚀 Launching Noble Gnomes game instance...');
    window.__gameInstance = new NobleGnomesGame();
  } catch (err) {
    console.error('Failed to initialize Noble Gnomes:', err);
    if (window.__gnomeLog) window.__gnomeLog('❌ Exception: ' + err.message + '\n' + err.stack, true);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', launchGame);
} else {
  launchGame();
}
