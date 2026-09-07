import { sounds } from '../audio/SoundSynthesizer.js';

/**
 * Polished, storybook-style DOM HUD overlay for Noble Gnomes.
 */
export class HUD {
  constructor(onBellStrikeTrigger, onCleanBoatTrigger, onReturnToMapTrigger = null, onBigBellTrigger = null, onSpellTrigger = null) {
    this.onBellStrikeTrigger = onBellStrikeTrigger;
    this.onCleanBoatTrigger = onCleanBoatTrigger;
    this.onReturnToMapTrigger = onReturnToMapTrigger;
    this.onBigBellTrigger = onBigBellTrigger;
    this.onSpellTrigger = onSpellTrigger;
    this.root = document.createElement('div');
    this.root.id = 'hud-container';
    document.body.appendChild(this.root);

    this.createUI();
  }

  createUI() {
    this.root.innerHTML = `
      <!-- Cinematic Intro Letterboxing & Storybook Title Card -->
      <div id="intro-letterbox-top" class="intro-letterbox top"></div>
      <div id="intro-letterbox-bottom" class="intro-letterbox bottom"></div>

      <div id="intro-card" class="intro-card">
        <div class="intro-harbor-badge">⚓ PORT BRAMBLE HARBOR</div>
        <h1 class="intro-title">Noble Gnomes</h1>
        <p class="intro-subtitle">All aboard Captain Bramble's tugboat! Cleanse the lily pads and rescue your crew!</p>
        <div class="intro-prompt"><kbd>SPACE</kbd> or <kbd>CLICK</kbd> to Skip</div>
      </div>

      <!-- Top Bar: Pond Purity & Status -->
      <div class="hud-top">
        <button id="btn-return-map" class="hud-map-btn" title="Return to Expedition Map (Key M)">
          <span>🗺️ MAP</span>
        </button>

        <div class="glass-card purity-card">
          <div class="card-title">
            <span class="icon">🌿</span>
            <span class="label">POND PURITY</span>
            <span id="purity-percent" class="value">0%</span>
          </div>
          <div class="progress-track">
            <div id="purity-bar" class="progress-fill"></div>
          </div>
          <div class="card-subtitle">
            <span id="slimes-remaining">24</span> algae & slime blobs left
          </div>
        </div>

        <div class="glass-card scum-card">
          <div class="card-title">
            <span class="icon">🧪</span>
            <span class="label">SCUM AT PIER</span>
            <span id="scum-status-val" class="value">0 / 0</span>
          </div>
          <div class="progress-track scum-track">
            <div id="scum-bar" class="progress-fill scum-fill" style="width: 0%;"></div>
          </div>
          <div class="card-subtitle">
            <span id="scum-onboard-sub">🎒 Onboard: 0</span> • <span id="scum-pier-sub">Pier: 0</span>
          </div>
        </div>

        <div class="glass-card hull-card">
          <div class="card-title">
            <span class="icon">🛡️</span>
            <span class="label">HULL INTEGRITY</span>
            <span id="hull-percent" class="value">100 HP</span>
          </div>
          <div class="progress-track hull-track">
            <div id="hull-bar" class="progress-fill hull-fill" style="width: 100%;"></div>
          </div>
          <div class="card-subtitle">
            <span id="hull-status">Solid Oak Hull ✨</span>
          </div>
        </div>

        <div class="glass-card exp-card">
          <div class="card-title" style="color: #facc15;">
            <span class="icon">⭐</span>
            <span class="label">RANK</span>
            <span id="player-rank-val" class="value" style="color: #fef08a; font-size: 15px;">LV. 1</span>
          </div>
          <div class="progress-track">
            <div id="player-exp-bar" class="progress-fill exp-fill" style="width: 0%;"></div>
          </div>
          <div class="card-subtitle">
            <span id="player-exp-sub">0 / 50 EXP</span>
          </div>
        </div>

        <div id="boss-card" class="glass-card boss-card hidden">
          <div class="card-title">
            <span class="icon">👹</span>
            <span class="label">BOG BEHEMOTH</span>
            <span id="boss-hp-val" class="value">8 / 8 HP</span>
          </div>
          <div class="progress-track boss-track">
            <div id="boss-hp-bar" class="progress-fill boss-fill shielded" style="width: 100%;"></div>
          </div>
          <div class="card-subtitle">
            <span id="boss-status-text">🛡️ Shielded (Rescue All Gnomes)</span>
          </div>
        </div>

        <div class="glass-card crew-card">
          <div class="card-title">
            <span class="icon">🍄</span>
            <span class="label">GNOME CREW</span>
            <span id="crew-count" class="value">1 / 4</span>
          </div>
          <div class="crew-icons">
            <div class="crew-slot active" title="Captain Bramble (mallet)">🔴</div>
            <div id="slot-pip" class="crew-slot" title="Pip the Lookout">⚪</div>
            <div id="slot-barnaby" class="crew-slot" title="Barnaby the Engineer">⚪</div>
            <div id="slot-clover" class="crew-slot" title="Clover the Bell Tuner">⚪</div>
          </div>
          <div id="active-perks" class="crew-perks">Solo patrol</div>
        </div>
      </div>

      <!-- Center Banner Notifications (for rescues & victory) -->
      <div id="banner-container" class="banner-container"></div>

      <!-- Bottom Controls & Action Bar -->
      <div class="hud-bottom">
        <div class="glass-card controls-card">
          <div class="key-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Steer | <kbd>SPACE</kbd> Bell | <kbd>C</kbd> Scrub Hull</div>
          <div class="key-hint" id="big-bell-key-hint"><kbd>E</kbd> or <kbd>SPACE+C</kbd> <strong style="color: #fde047;">BIG BELL HIT</strong> (Requires Full Crew)</div>
        </div>

        <div class="actions-container">
          <div class="bell-action-wrap">
            <button id="btn-bell" class="bell-button">
              <div id="bell-cooldown-ring" class="cooldown-overlay"></div>
              <span class="bell-icon">🔔</span>
              <span class="bell-label">RING BELL</span>
            </button>
          </div>

          <div class="big-bell-action-wrap">
            <button id="btn-big-bell" class="big-bell-button locked" title="Big Bell Hit Squad Combo (Key E) - Unlocked with Full Gnome Crew">
              <div id="big-bell-cooldown-ring" class="cooldown-overlay"></div>
              <span class="big-bell-icon">🔔💥</span>
              <div class="big-bell-text-wrap">
                <span class="big-bell-label">BIG BELL HIT</span>
                <span id="big-bell-sub" class="big-bell-sub">🔒 NEED FULL SQUAD</span>
              </div>
            </button>
          </div>

          <div class="clean-action-wrap">
            <button id="btn-clean" class="clean-button" title="Clean boat and remove speed penalties (Key C)">
              <span class="clean-icon">🧽</span>
              <div class="clean-text-wrap">
                <span class="clean-label">CLEAN BOAT</span>
                <span id="clean-penalty" class="clean-sub">HULL CLEAN ✨</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Active Gnome Wizard Spell Hotbar -->
        <div id="spell-hotbar" class="spell-hotbar">
          <div class="spell-slots-row">
            <div id="spell-slot-0" class="spell-slot empty" data-slot="0" title="Spell Slot 1 [Key 1 or Right-Click]">
              <div class="spell-key-badge">1</div>
              <div class="spell-icon-wrap"><span class="spell-icon">✨</span></div>
              <div class="spell-cooldown-overlay"></div>
              <div class="spell-cooldown-text"></div>
            </div>
            <div id="spell-slot-1" class="spell-slot empty" data-slot="1" title="Spell Slot 2 [Key 2]">
              <div class="spell-key-badge">2</div>
              <div class="spell-icon-wrap"><span class="spell-icon">✨</span></div>
              <div class="spell-cooldown-overlay"></div>
              <div class="spell-cooldown-text"></div>
            </div>
            <div id="spell-slot-2" class="spell-slot empty" data-slot="2" title="Spell Slot 3 [Key 3]">
              <div class="spell-key-badge">3</div>
              <div class="spell-icon-wrap"><span class="spell-icon">✨</span></div>
              <div class="spell-cooldown-overlay"></div>
              <div class="spell-cooldown-text"></div>
            </div>
            <div id="spell-slot-3" class="spell-slot empty" data-slot="3" title="Spell Slot 4 [Key 4]">
              <div class="spell-key-badge">4</div>
              <div class="spell-icon-wrap"><span class="spell-icon">✨</span></div>
              <div class="spell-cooldown-overlay"></div>
              <div class="spell-cooldown-text"></div>
            </div>
          </div>
        </div>

        <div class="glass-card sound-card">
          <button id="btn-sound" class="icon-btn" title="Toggle Sound">🔊</button>
        </div>
      </div>

      <!-- Game Over / Capsized Modal -->
      <div id="gameover-modal" class="gameover-overlay hidden">
        <div class="gameover-card">
          <div class="gameover-skull">💥 ⚓ 💥</div>
          <h2 class="gameover-title">TUGBOAT CAPSIZED!</h2>
          <p class="gameover-desc">Your hull was overwhelmed and rolled onto its beam ends! Collect driftwood, corks, and cans in the pond to keep your hull patched.</p>
          <div class="gameover-stats">
            <div class="stat-row"><span>Gnomes Rescued:</span> <strong id="go-gnomes">0 / 3</strong></div>
            <div class="stat-row"><span>Pond Purity:</span> <strong id="go-purity">0%</strong></div>
          </div>
          <button id="btn-restart" class="restart-btn">🔄 RE-FLOAT TUGBOAT (<kbd>R</kbd>)</button>
        </div>
      </div>

      <!-- Storybook Expedition Victory Modal -->
      <div id="victory-modal" class="victory-modal-overlay hidden">
        <div class="victory-card">
          <div class="victory-laurel">🌿 🏆 🌿</div>
          <h2 class="victory-heading">EXPEDITION VICTORIOUS!</h2>
          <p class="victory-subheading" id="vic-subheading">Lily Pond Purged &amp; Flora Restored!</p>

          <div class="victory-stars" id="vic-stars">
            <span class="vic-star" id="vic-star-1">★</span>
            <span class="vic-star" id="vic-star-2">★</span>
            <span class="vic-star" id="vic-star-3">★</span>
          </div>

          <div class="victory-stats-box">
            <div class="vic-stat-row">
              <span class="vic-stat-label">🦠 Bog Behemoth:</span>
              <strong class="vic-stat-val status-cleared" id="vic-boss-status">DEFEATED</strong>
            </div>
            <div class="vic-stat-row">
              <span class="vic-stat-label">🍄 Gnomes Brought Ashore:</span>
              <strong class="vic-stat-val" id="vic-gnomes-val">3 / 3</strong>
            </div>
            <div class="vic-stat-row">
              <span class="vic-stat-label">🧪 Scum Harvest Composted:</span>
              <strong class="vic-stat-val" id="vic-scum-val">0 / 0</strong>
            </div>
            <div class="vic-stat-row highlight">
              <span class="vic-stat-label">🪵 Debris Salvaged:</span>
              <strong class="vic-stat-val gold" id="vic-debris-val">+45 🪵</strong>
            </div>
            <div class="vic-token-row hidden" id="vic-token-row">
              <span class="vic-token-icon">🧭</span>
              <span class="vic-token-text" id="vic-token-text">Awarded Ancient Compass Token!</span>
            </div>
          </div>

          <div class="victory-actions">
            <button id="btn-victory-retry" class="victory-action-btn retry">
              🔄 RETRY EXPEDITION
            </button>
            <button id="btn-victory-continue" class="victory-action-btn continue">
              🗺️ CONTINUE TO WORLD MAP
            </button>
          </div>
        </div>
      </div>

      <!-- Tome of the Lilypad: Level-Up 3-Card Draft Modal -->
      <div id="levelup-draft-modal" class="levelup-modal-overlay hidden">
        <div class="levelup-draft-card-wrapper">
          <div class="levelup-header">
            <div class="levelup-badge">⭐ EXPEDITION RANK UP! ⭐</div>
            <h2 class="levelup-title">Tome of the Lilypad</h2>
            <p class="levelup-subtitle">Choose an ancient Gnome Wizard spell or a passive Tugboat boon to attune:</p>
          </div>
          <div id="draft-cards-container" class="draft-cards-container">
            <!-- 3 cards dynamically injected -->
          </div>
        </div>
      </div>
    `;

    const mapBtn = document.getElementById('btn-return-map');
    if (mapBtn) {
      mapBtn.addEventListener('click', () => {
        if (this.onReturnToMapTrigger) this.onReturnToMapTrigger();
      });
    }

    // Button interactions
    const bellBtn = document.getElementById('btn-bell');
    bellBtn.addEventListener('click', () => {
      if (this.onBellStrikeTrigger) this.onBellStrikeTrigger();
    });

    const bigBellBtn = document.getElementById('btn-big-bell');
    if (bigBellBtn) {
      bigBellBtn.addEventListener('click', () => {
        if (this.onBigBellTrigger) this.onBigBellTrigger();
      });
    }

    const cleanBtn = document.getElementById('btn-clean');
    if (cleanBtn) {
      cleanBtn.addEventListener('click', () => {
        if (this.onCleanBoatTrigger) this.onCleanBoatTrigger();
      });
    }

    // Active Spell Hotbar button interactions
    for (let i = 0; i < 4; i++) {
      const slotEl = document.getElementById(`spell-slot-${i}`);
      if (slotEl) {
        slotEl.addEventListener('click', () => {
          if (this.onSpellTrigger) this.onSpellTrigger(i);
        });
      }
    }

    const soundBtn = document.getElementById('btn-sound');
    soundBtn.addEventListener('click', () => {
      const isMuted = sounds.toggleMute();
      soundBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    // Ensure levelup draft modal is a direct child of document.body so pointer events are never blocked
    const draftModal = document.getElementById('levelup-draft-modal');
    if (draftModal && draftModal.parentElement) {
      document.body.appendChild(draftModal);
    }
  }

  update(purityPercent, slimesRemaining, crewCount, rescuedGnomes, bellCooldownRatio, onboardCount = 0, droppedOffCount = 0, algaeLevel = 0, hullHealth = 100, maxHullHealth = 100, scumOnboard = 0, scumDeposited = 0, totalScum = 0, bossInfo = null, bigBellCooldownRatio = 1.0, hasAllGnomes = false, playerLevel = 1, playerExp = 0, expToNextLevel = 50) {
    // 1. Purity Meter
    const purityVal = document.getElementById('purity-percent');
    const purityBar = document.getElementById('purity-bar');
    const slimesCount = document.getElementById('slimes-remaining');

    if (purityVal) purityVal.textContent = `${purityPercent}%`;
    if (purityBar) purityBar.style.width = `${purityPercent}%`;
    if (slimesCount) slimesCount.textContent = slimesRemaining;

    // 1a. Expedition Rank & EXP Meter
    const rankVal = document.getElementById('player-rank-val');
    const expBar = document.getElementById('player-exp-bar');
    const expSub = document.getElementById('player-exp-sub');

    if (rankVal) rankVal.textContent = `LV. ${playerLevel}`;
    if (expBar) {
      const expPct = expToNextLevel > 0 ? Math.min(100, Math.max(0, (playerExp / expToNextLevel) * 100)) : 0;
      expBar.style.width = `${expPct}%`;
    }
    if (expSub) {
      expSub.textContent = `${playerExp} / ${expToNextLevel} EXP`;
    }

    // 1b. Scum Compost Meter
    const scumStatusVal = document.getElementById('scum-status-val');
    const scumBar = document.getElementById('scum-bar');
    const scumOnboardSub = document.getElementById('scum-onboard-sub');
    const scumPierSub = document.getElementById('scum-pier-sub');

    if (scumStatusVal) scumStatusVal.textContent = `${scumDeposited} / ${totalScum}`;
    if (scumBar) {
      const pct = totalScum > 0 ? Math.min(100, Math.round((scumDeposited / totalScum) * 100)) : (slimesRemaining === 0 ? 100 : 0);
      scumBar.style.width = `${pct}%`;
    }
    if (scumOnboardSub) {
      scumOnboardSub.textContent = `🎒 Onboard: ${scumOnboard}`;
      scumOnboardSub.style.color = scumOnboard > 0 ? '#4ade80' : '#cbd5e1';
    }
    if (scumPierSub) {
      scumPierSub.textContent = `Pier: ${scumDeposited}`;
    }

    // 1c. Hull Integrity Bar
    const hullVal = document.getElementById('hull-percent');
    const hullBar = document.getElementById('hull-bar');
    const hullStatus = document.getElementById('hull-status');

    if (hullVal) hullVal.textContent = `${Math.round(hullHealth)} HP`;
    if (hullBar) {
      const pct = Math.max(0, Math.min(100, (hullHealth / maxHullHealth) * 100));
      hullBar.style.width = `${pct}%`;
      hullBar.className = 'progress-fill hull-fill';
      if (hullHealth <= 25) {
        hullBar.classList.add('danger');
        if (hullStatus) {
          hullStatus.textContent = '🚨 CRITICAL! Taking on water!';
          hullStatus.style.color = '#f87171';
        }
      } else if (hullHealth <= 55) {
        hullBar.classList.add('warning');
        if (hullStatus) {
          hullStatus.textContent = '⚠️ Hull Battered! Salvage debris!';
          hullStatus.style.color = '#fbbf24';
        }
      } else {
        if (hullStatus) {
          if (algaeLevel > 0.05) {
            const dragPct = Math.round(algaeLevel * 50);
            hullStatus.textContent = `⚠️ Scum Drag (-${dragPct}% Speed)`;
            hullStatus.style.color = '#fed7aa';
          } else {
            hullStatus.textContent = 'Solid Oak Hull ✨';
            hullStatus.style.color = '#94a3b8';
          }
        }
      }
    }

    // 1d. Bog Behemoth Boss Status & Shield Card
    const bossCard = document.getElementById('boss-card');
    if (bossCard) {
      if (bossInfo && bossInfo.isAlive) {
        bossCard.classList.remove('hidden');
        const hpVal = document.getElementById('boss-hp-val');
        const hpBar = document.getElementById('boss-hp-bar');
        const statusText = document.getElementById('boss-status-text');

        const hpPct = Math.max(0, Math.min(100, Math.round((bossInfo.health / bossInfo.maxHealth) * 100)));
        if (hpVal) hpVal.textContent = `${bossInfo.health} / ${bossInfo.maxHealth} HP`;
        if (hpBar) {
          hpBar.style.width = `${hpPct}%`;
          if (bossInfo.isShielded) {
            hpBar.className = 'progress-fill boss-fill shielded';
          } else {
            hpBar.className = 'progress-fill boss-fill vulnerable';
          }
        }

        if (statusText) {
          if (bossInfo.isShielded) {
            statusText.textContent = `🛡️ SHIELDED (Rescue ${bossInfo.gnomesRescued}/${bossInfo.gnomesRequired} Gnomes)`;
            statusText.style.color = '#fde047';
          } else {
            statusText.textContent = hasAllGnomes
              ? '⚔️ VULNERABLE to BIG BELL HIT [Key E]!'
              : '⚔️ VULNERABLE — Rescue gnomes for Big Bell Hit!';
            statusText.style.color = '#4ade80';
          }
        }
      } else {
        bossCard.classList.add('hidden');
      }
    }

    // 1e. Big Bell Hit Button State
    const bigBellBtn = document.getElementById('btn-big-bell');
    const bigBellRing = document.getElementById('big-bell-cooldown-ring');
    const bigBellSub = document.getElementById('big-bell-sub');
    if (bigBellBtn && bigBellRing && bigBellSub) {
      if (!hasAllGnomes) {
        bigBellBtn.classList.add('locked');
        bigBellBtn.classList.remove('ready');
        bigBellSub.textContent = '🔒 NEED FULL SQUAD';
        bigBellRing.style.height = '0%';
      } else {
        bigBellBtn.classList.remove('locked');
        if (bigBellCooldownRatio >= 1.0) {
          bigBellBtn.classList.add('ready');
          bigBellSub.textContent = '[E] READY TO STRIKE! ✨';
          bigBellRing.style.height = '0%';
        } else {
          bigBellBtn.classList.remove('ready');
          const pct = Math.round((1.0 - bigBellCooldownRatio) * 100);
          bigBellSub.textContent = `RECHARGING (${pct}%)`;
          bigBellRing.style.height = `${pct}%`;
        }
      }
    }

    // 2. Crew Slots & Perks
    const crewVal = document.getElementById('crew-count');
    if (crewVal) crewVal.textContent = `${crewCount} / 4`;

    const slotPip = document.getElementById('slot-pip');
    const slotBarnaby = document.getElementById('slot-barnaby');
    const slotClover = document.getElementById('slot-clover');
    const perksText = document.getElementById('active-perks');

    let perksList = [];
    for (const g of rescuedGnomes) {
      if (g.name === 'Pip' && slotPip) {
        slotPip.textContent = '🟡';
        slotPip.classList.add('active');
        perksList.push('Lookout Range');
      }
      if (g.name === 'Barnaby' && slotBarnaby) {
        slotBarnaby.textContent = '🟢';
        slotBarnaby.classList.add('active');
        perksList.push('Engine Boost');
      }
      if (g.name === 'Clover' && slotClover) {
        slotClover.textContent = '🟣';
        slotClover.classList.add('active');
        perksList.push('Quick Chime');
      }
    }

    if (perksText) {
      if (onboardCount > 0) {
        perksText.textContent = `⚓ Return to Pier to offload crew (${onboardCount} onboard)`;
        perksText.style.color = '#34d399';
      } else if (perksList.length > 0) {
        perksText.textContent = `Perks: ${perksList.join(' • ')}`;
        perksText.style.color = '';
      } else {
        perksText.textContent = 'Rescue stranded gnomes!';
        perksText.style.color = '';
      }
    }

    // 3. Bell Cooldown Ring
    const bellRing = document.getElementById('bell-cooldown-ring');
    const bellBtn = document.getElementById('btn-bell');
    if (bellRing && bellBtn) {
      if (bellCooldownRatio >= 1.0) {
        bellRing.style.height = '0%';
        bellBtn.classList.add('ready');
      } else {
        bellRing.style.height = `${(1.0 - bellCooldownRatio) * 100}%`;
        bellBtn.classList.remove('ready');
      }
    }

    // 4. Clean Boat Button State
    const cleanBtn = document.getElementById('btn-clean');
    const cleanSub = document.getElementById('clean-penalty');
    if (cleanBtn && cleanSub) {
      if (algaeLevel > 0.02) {
        const penaltyPercent = Math.round(algaeLevel * 55);
        cleanBtn.classList.add('fouled');
        cleanSub.textContent = `FOULED: -${penaltyPercent}% SPEED`;
        cleanSub.style.color = '#fecaca';
      } else {
        cleanBtn.classList.remove('fouled');
        cleanSub.textContent = 'HULL CLEAN ✨';
        cleanSub.style.color = '#bae6fd';
      }
    }
  }

  showDropOffBanner(dropOffResult) {
    const container = document.getElementById('banner-container');
    if (!container) return;

    const banner = document.createElement('div');
    banner.className = 'victory-banner pop-in';

    if (dropOffResult.allRescuedAndSafe) {
      banner.innerHTML = `
        <div class="victory-title">🏆 ALL GNOMES SAFELY HOME! ⚓</div>
        <div class="victory-desc">Every brave garden gnome has returned to Port Bramble Pier! You are the true Heroes of the Pond!</div>
      `;
    } else {
      const names = dropOffResult.newlyDocked.map(g => g.name).join(' & ');
      banner.innerHTML = `
        <div class="banner-title" style="color: #34d399;">⚓ SAFELY ASHORE AT PORT BRAMBLE!</div>
        <div class="banner-name">${names} welcomed home onto the pier! (${dropOffResult.totalDroppedOff} / 3 safe)</div>
      `;
    }

    container.appendChild(banner);

    setTimeout(() => {
      banner.classList.add('fade-out');
      setTimeout(() => banner.remove(), 600);
    }, 4500);
  }

  showRescueBanner(gnomeData) {
    const container = document.getElementById('banner-container');
    if (!container) return;

    const banner = document.createElement('div');
    banner.className = 'rescue-banner pop-in';
    banner.innerHTML = `
      <div class="banner-title">🎉 GNOME RESCUED!</div>
      <div class="banner-name">${gnomeData.name} the ${gnomeData.role} joined the crew!</div>
      <div class="banner-buff">✨ Perk Unlocked: ${gnomeData.buffText}</div>
    `;

    container.appendChild(banner);

    setTimeout(() => {
      banner.classList.add('fade-out');
      setTimeout(() => banner.remove(), 600);
    }, 3800);
  }

  clearBanners() {
    const container = document.getElementById('banner-container');
    if (container) {
      container.innerHTML = '';
    }
    this.hideVictoryModal();
  }

  showVictoryBanner(onReturnToMap = null, stats = {}) {
    const container = document.getElementById('banner-container');
    if (!container) return;

    // Remove any previous banners to prevent multiple stacked banners
    this.clearBanners();

    const banner = document.createElement('div');
    banner.className = 'victory-banner pop-in';
    banner.innerHTML = `
      <div class="victory-title">👑 POND RESTORED & COMPOSTED! 🌸</div>
      <div class="victory-desc">All slimes purged, scum safely composted at the pier, and gnomes returned home!</div>
      <div class="victory-stats-chip" style="margin-top: 10px; font-size: 13px; color: #86efac; font-weight: 700;">
        🌿 Purity 100% • 🧪 ${stats.scumDeposited || 0} Scum Delivered • 🍄 ${stats.rescuedGnomes || 3} Gnomes Ashore
      </div>
      <button id="btn-victory-map" class="sail-forth-btn ready" style="margin-top: 16px; padding: 12px 24px; font-size: 15px; cursor: pointer; pointer-events: auto;">
        🗺️ RETURN TO EXPEDITION MAP
      </button>
    `;
    container.appendChild(banner);

    const mapBtn = banner.querySelector('#btn-victory-map');
    if (mapBtn) {
      mapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        banner.remove();
        if (onReturnToMap) onReturnToMap();
      });
    }
  }

  show() {
    this.root.style.display = 'flex';
  }

  hide() {
    this.root.style.display = 'none';
  }

  showHint(text, color = '#fde047') {
    let hintEl = document.getElementById('hud-hint-pill');
    if (!hintEl) {
      hintEl = document.createElement('div');
      hintEl.id = 'hud-hint-pill';
      hintEl.className = 'hud-hint-pill';
      document.body.appendChild(hintEl);
    }

    hintEl.textContent = text;
    hintEl.style.borderColor = color;
    hintEl.style.opacity = '1';
    hintEl.style.transform = 'translate(-50%, 0) scale(1)';

    if (this.hintTimeout) clearTimeout(this.hintTimeout);
    this.hintTimeout = setTimeout(() => {
      if (hintEl) {
        hintEl.style.opacity = '0';
        hintEl.style.transform = 'translate(-50%, -8px) scale(0.96)';
      }
    }, 2600);
  }

  hideIntro(immediate = false) {
    const card = document.getElementById('intro-card');
    const topBar = document.getElementById('intro-letterbox-top');
    const bottomBar = document.getElementById('intro-letterbox-bottom');

    if (immediate) {
      if (card) {
        card.style.display = 'none';
        if (card.parentNode) card.parentNode.removeChild(card);
      }
      if (topBar) topBar.style.display = 'none';
      if (bottomBar) bottomBar.style.display = 'none';
      return;
    }

    if (card) {
      card.classList.add('fade-out-intro');
      setTimeout(() => {
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 700);
    }
    if (topBar) topBar.classList.add('retracted');
    if (bottomBar) bottomBar.classList.add('retracted');
  }

  showGameOver(stats, onRestart) {
    const modal = document.getElementById('gameover-modal');
    if (!modal) return;

    const gnomesVal = document.getElementById('go-gnomes');
    const purityVal = document.getElementById('go-purity');
    if (gnomesVal) gnomesVal.textContent = `${stats.rescuedGnomes || 0} / 3`;
    if (purityVal) purityVal.textContent = `${stats.purity || 0}%`;

    modal.classList.remove('hidden');

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.onclick = () => {
        this.hideGameOver();
        if (onRestart) onRestart();
      };
    }
  }

  hideGameOver() {
    const modal = document.getElementById('gameover-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  showVictoryModal({
    nodeName = 'Port Bramble Lily Pond',
    bossDefeated = true,
    rescuedGnomes = 3,
    totalGnomes = 3,
    scumDeposited = 0,
    totalScum = 0,
    debrisEarned = 45,
    tokenUnlocked = null,
    onRetry = null,
    onContinue = null
  } = {}) {
    const modal = document.getElementById('victory-modal');
    if (!modal) return;

    // Dismiss any active hint pills
    const hintEl = document.getElementById('hud-hint-pill');
    if (hintEl) hintEl.style.opacity = '0';

    // Subtitle
    const subEl = document.getElementById('vic-subheading');
    if (subEl) subEl.textContent = `${nodeName} Purged & Flora Restored!`;

    // Calculate 1 to 3 stars
    // Star 1: Pond cleared & Behemoth defeated
    // Star 2: All gnomes safely ashore
    // Star 3: >= 75% of spawned scum composted at pier
    let starsEarned = 1;
    if (rescuedGnomes >= totalGnomes && totalGnomes > 0) starsEarned++;
    const scumThreshold = totalScum > 0 ? Math.floor(totalScum * 0.75) : 0;
    if (scumDeposited >= Math.max(1, scumThreshold)) starsEarned++;

    for (let s = 1; s <= 3; s++) {
      const starEl = document.getElementById(`vic-star-${s}`);
      if (starEl) {
        if (s <= starsEarned) {
          starEl.classList.add('lit');
        } else {
          starEl.classList.remove('lit');
        }
      }
    }

    // Stats
    const bossStatus = document.getElementById('vic-boss-status');
    if (bossStatus) bossStatus.textContent = bossDefeated ? 'DEFEATED' : 'PURGED';

    const gnomesVal = document.getElementById('vic-gnomes-val');
    if (gnomesVal) gnomesVal.textContent = `${rescuedGnomes} / ${totalGnomes}`;

    const scumVal = document.getElementById('vic-scum-val');
    if (scumVal) scumVal.textContent = `${scumDeposited} / ${totalScum || scumDeposited}`;

    const debrisVal = document.getElementById('vic-debris-val');
    if (debrisVal) debrisVal.textContent = `+${debrisEarned} 🪵`;

    // Token
    const tokenRow = document.getElementById('vic-token-row');
    const tokenText = document.getElementById('vic-token-text');
    if (tokenRow && tokenText) {
      if (tokenUnlocked) {
        tokenText.textContent = `Awarded ${tokenUnlocked}!`;
        tokenRow.classList.remove('hidden');
      } else {
        tokenRow.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');

    try {
      sounds.playTokenFanfare();
    } catch (e) {}

    // Actions
    const retryBtn = document.getElementById('btn-victory-retry');
    if (retryBtn) {
      retryBtn.onclick = (e) => {
        e.stopPropagation();
        this.hideVictoryModal();
        if (onRetry) onRetry();
      };
    }

    const continueBtn = document.getElementById('btn-victory-continue');
    if (continueBtn) {
      continueBtn.onclick = (e) => {
        e.stopPropagation();
        this.hideVictoryModal();
        if (onContinue) onContinue();
      };
    }
  }

  hideVictoryModal() {
    const modal = document.getElementById('victory-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  updateSpells(equippedSpells = []) {
    for (let i = 0; i < 4; i++) {
      const slotEl = document.getElementById(`spell-slot-${i}`);
      if (!slotEl) continue;

      const spell = equippedSpells[i];
      const iconEl = slotEl.querySelector('.spell-icon');
      const cdOverlay = slotEl.querySelector('.spell-cooldown-overlay');
      const cdText = slotEl.querySelector('.spell-cooldown-text');

      if (spell) {
        slotEl.classList.remove('empty');
        slotEl.title = `${spell.name} [Key ${i + 1}${i === 0 ? ' or Right-Click' : ''}]\n${spell.description}`;
        if (iconEl) iconEl.textContent = spell.icon;

        if (spell.currentCooldown > 0) {
          slotEl.classList.add('on-cooldown');
          slotEl.classList.remove('ready');
          const pct = Math.min(100, Math.round((spell.currentCooldown / spell.cooldown) * 100));
          if (cdOverlay) cdOverlay.style.height = `${pct}%`;
          if (cdText) cdText.textContent = `${spell.currentCooldown.toFixed(1)}s`;
        } else {
          slotEl.classList.remove('on-cooldown');
          slotEl.classList.add('ready');
          if (cdOverlay) cdOverlay.style.height = '0%';
          if (cdText) cdText.textContent = '';
        }
      } else {
        slotEl.classList.add('empty');
        slotEl.classList.remove('on-cooldown', 'ready');
        slotEl.title = `Spell Slot ${i + 1} (Empty - Attune in Rank-Up draft)`;
        if (iconEl) iconEl.textContent = '🔒';
        if (cdOverlay) cdOverlay.style.height = '0%';
        if (cdText) cdText.textContent = '';
      }
    }
  }

  showLevelUpDraft(choices, onSelect) {
    const modal = document.getElementById('levelup-draft-modal');
    const container = document.getElementById('draft-cards-container');
    if (!modal || !container) return;

    // Dismiss active hint pill so it doesn't overlay
    const hintEl = document.getElementById('hud-hint-pill');
    if (hintEl) {
      hintEl.style.opacity = '0';
      hintEl.style.pointerEvents = 'none';
    }

    container.innerHTML = '';

    choices.forEach((choice, idx) => {
      const card = document.createElement('div');
      card.className = `draft-card rarity-${choice.rarity.toLowerCase()} pop-in`;
      card.style.animationDelay = `${idx * 0.1}s`;

      const isSpell = choice.type === 'SPELL';
      const typeBadge = isSpell ? '🧙‍♂️ ACTIVE SPELL' : '⚓ PASSIVE BOON';
      const patronText = choice.patron ? `<div class="card-patron">Patron: ${choice.patron}</div>` : '';
      const cdBadge = choice.cooldown ? `<div class="card-cd">⏱️ ${choice.cooldown}s Cooldown</div>` : '';

      card.innerHTML = `
        <div class="card-glow-aura"></div>
        <div class="card-header">
          <span class="card-type-badge ${isSpell ? 'badge-spell' : 'badge-passive'}">${typeBadge}</span>
          <span class="card-rarity-badge">${choice.rarity}</span>
        </div>
        <div class="card-icon-hero">${choice.icon}</div>
        <h3 class="card-name">${choice.name}</h3>
        ${patronText}
        <p class="card-desc">${choice.description}</p>
        ${cdBadge}
        <button class="attune-btn" type="button">
          <span>ATTUNE BOON</span> ✨
        </button>
      `;

      const pickChoice = (e) => {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        this.hideLevelUpDraft();
        if (onSelect) onSelect(choice);
      };

      card.addEventListener('click', pickChoice);
      card.addEventListener('pointerdown', (e) => e.stopPropagation());

      const btn = card.querySelector('.attune-btn');
      if (btn) {
        btn.addEventListener('click', pickChoice);
        btn.addEventListener('pointerdown', (e) => e.stopPropagation());
      }

      container.appendChild(card);
    });

    modal.classList.remove('hidden');
    try { sounds.playFanfare(); } catch (e) {}
  }

  hideLevelUpDraft() {
    const modal = document.getElementById('levelup-draft-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
}

