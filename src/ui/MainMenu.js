import { sounds } from '../audio/SoundSynthesizer.js';

/**
 * MainMenu.js
 * Storybook Title Screen & Expedition Headquarters for Noble Gnomes.
 * Provides Start/Continue, Multi-Slot Adventure Logs, Captain's Guide, Settings, and Credits.
 */
export class MainMenu {
  constructor(container, saveManager, callbacks = {}) {
    this.container = container;
    this.saveManager = saveManager;
    this.callbacks = callbacks; // { onPlay, onSwitchSlot, onSettingsChange }

    this.activeModal = null;
    this.createDOM();
    this.updateActiveSlotDisplay();
  }

  createDOM() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'main-menu-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 40px 24px 28px 24px;
      box-sizing: border-box;
      background: radial-gradient(circle at center, rgba(15, 23, 42, 0.45) 0%, rgba(10, 15, 29, 0.82) 100%);
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #f8fafc;
      user-select: none;
      z-index: 2000;
      pointer-events: auto;
      transition: opacity 0.5s ease;
    `;

    // 1. Top Header & Title Signboard (fills top 1/3rd with commanding presence)
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-top: clamp(12px, 3vh, 32px);
      width: 100%;
      max-width: 1200px;
    `;

    header.innerHTML = `
      <h1 style="
        margin: 0;
        font-size: clamp(68px, 11.5vw, 136px);
        font-weight: 950;
        letter-spacing: clamp(5px, 1.2vw, 12px);
        background: linear-gradient(180deg, #ffffff 0%, #fffbeb 18%, #fde047 44%, #f59e0b 74%, #92400e 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 8px 26px rgba(0, 0, 0, 0.92)) drop-shadow(0 0 45px rgba(245, 158, 11, 0.50));
        line-height: 1.0;
        text-transform: uppercase;
        padding: 4px 16px 8px 16px;
      ">
        Noble Gnomes
      </h1>

      <!-- Active Profile Pill -->
      <div id="menu-active-slot-pill" style="
        margin-top: clamp(12px, 2vh, 22px);
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: rgba(15, 23, 42, 0.82);
        border: 1.5px solid rgba(56, 189, 248, 0.55);
        border-radius: 999px;
        padding: 8px 24px;
        font-size: 13.5px;
        color: #bae6fd;
        box-shadow: 0 4px 18px rgba(0,0,0,0.45);
        backdrop-filter: blur(8px);
      ">
        <span>📜 Loading save...</span>
      </div>
    `;
    this.overlay.appendChild(header);

    // 2. Center Menu Button Stack
    const menuCenter = document.createElement('div');
    menuCenter.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      width: min(380px, 90vw);
      margin: 20px 0;
    `;

    // Primary Continue Button
    this.btnContinue = document.createElement('button');
    this.btnContinue.id = 'menu-btn-continue';
    this.btnContinue.style.cssText = `
      width: 100%;
      padding: 16px 24px;
      border: 2px solid #facc15;
      border-radius: 14px;
      background: linear-gradient(180deg, #f59e0b 0%, #b45309 100%);
      color: #ffffff;
      font-size: 19px;
      font-weight: 800;
      letter-spacing: 1.2px;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.45), inset 0 1px 0 rgba(255,255,255,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transition: all 0.18s ease;
    `;
    this.btnContinue.innerHTML = `<span>⛵</span> <span>Continue Expedition</span>`;
    this.btnContinue.onmouseenter = () => {
      this.btnContinue.style.transform = 'translateY(-2px) scale(1.02)';
      this.btnContinue.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.6), inset 0 1px 0 rgba(255,255,255,0.5)';
    };
    this.btnContinue.onmouseleave = () => {
      this.btnContinue.style.transform = 'translateY(0) scale(1)';
      this.btnContinue.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.45), inset 0 1px 0 rgba(255,255,255,0.4)';
    };
    this.btnContinue.onclick = () => {
      try { sounds.playButton(); } catch (e) {}
      if (this.callbacks.onPlay) this.callbacks.onPlay();
    };
    menuCenter.appendChild(this.btnContinue);

    // Secondary Menu Buttons helper
    const createMenuBtn = (icon, label, onClick, highlight = false) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 100%;
        padding: 12px 20px;
        border: 1.5px solid ${highlight ? 'rgba(56, 189, 248, 0.6)' : 'rgba(255, 255, 255, 0.15)'};
        border-radius: 12px;
        background: ${highlight ? 'rgba(14, 116, 144, 0.5)' : 'rgba(30, 41, 59, 0.72)'};
        color: #f1f5f9;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.8px;
        cursor: pointer;
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transition: all 0.18s ease;
      `;
      btn.innerHTML = `<span style="font-size: 18px;">${icon}</span> <span>${label}</span>`;
      btn.onmouseenter = () => {
        btn.style.transform = 'translateY(-1.5px)';
        btn.style.background = highlight ? 'rgba(14, 116, 144, 0.8)' : 'rgba(51, 65, 85, 0.85)';
        btn.style.borderColor = '#38bdf8';
      };
      btn.onmouseleave = () => {
        btn.style.transform = 'translateY(0)';
        btn.style.background = highlight ? 'rgba(14, 116, 144, 0.5)' : 'rgba(30, 41, 59, 0.72)';
        btn.style.borderColor = highlight ? 'rgba(56, 189, 248, 0.6)' : 'rgba(255, 255, 255, 0.15)';
      };
      btn.onclick = () => {
        try { sounds.playButton(); } catch (e) {}
        onClick();
      };
      return btn;
    };

    menuCenter.appendChild(createMenuBtn('💾', 'Expedition Logs (Save Slots)', () => this.showSlotsModal()));
    menuCenter.appendChild(createMenuBtn('📖', "Captain's Guide (How to Play)", () => this.showGuideModal()));
    menuCenter.appendChild(createMenuBtn('⚙️', 'Settings & Audio', () => this.showSettingsModal()));
    menuCenter.appendChild(createMenuBtn('📜', 'Credits', () => this.showCreditsModal()));

    this.overlay.appendChild(menuCenter);

    // 3. Bottom Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: min(880px, 94vw);
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 12px;
    `;
    footer.innerHTML = `
      <div>v0.2.0 • PC Edition</div>
      <div>⛵ Designed for PC Standalone & WebGL</div>
      <div>© 2026 Psyko Studios</div>
    `;
    this.overlay.appendChild(footer);
    document.body.appendChild(this.overlay);
  }

  updateActiveSlotDisplay() {
    const pill = document.getElementById('menu-active-slot-pill');
    if (!pill) return;

    const slot = this.saveManager.loadActiveSlot();
    const hasAny = this.saveManager.hasAnySave();

    if (slot && hasAny) {
      let stars = 0;
      if (Array.isArray(slot.mapNodes)) {
        slot.mapNodes.forEach(n => { if (n.stars) stars += n.stars; });
      }
      pill.innerHTML = `
        <span style="color: #38bdf8; font-weight: bold;">⚓ ${slot.name}</span>
        <span style="color: #64748b;">•</span>
        <span style="color: #facc15;">⭐ ${stars} Stars</span>
        <span style="color: #64748b;">•</span>
        <span style="color: #f59e0b;">🪵 ${slot.salvageDebris || 0} Debris</span>
      `;
      this.btnContinue.innerHTML = `<span>⛵</span> <span>Continue Expedition</span>`;
    } else {
      pill.innerHTML = `
        <span style="color: #a7f3d0; font-weight: bold;">🌱 Fresh Expedition</span>
        <span style="color: #64748b;">•</span>
        <span style="color: #94a3b8;">Slot ${this.saveManager.activeSlotId} Ready</span>
      `;
      this.btnContinue.innerHTML = `<span>⛵</span> <span>Start New Expedition</span>`;
    }
  }

  // --- MODAL SYSTEM ---

  showModal(title, contentElem, width = '580px') {
    this.closeModal();

    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 15, 29, 0.78);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1300;
      animation: fadeIn 0.2s ease;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      width: min(${width}, 92vw);
      max-height: 85vh;
      overflow-y: auto;
      background: #0f172a;
      border: 2px solid rgba(56, 189, 248, 0.5);
      border-radius: 18px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.75), 0 0 20px rgba(56, 189, 248, 0.2);
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      padding: 24px;
    `;

    // Modal Header
    const mHeader = document.createElement('div');
    mHeader.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      padding-bottom: 14px;
      margin-bottom: 18px;
    `;
    mHeader.innerHTML = `
      <h2 style="margin: 0; font-size: 21px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
        ${title}
      </h2>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 16px;
      padding: 6px 12px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.15s ease;
    `;
    closeBtn.innerText = '✕ Close';
    closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(239, 68, 68, 0.4)';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.08)';
    closeBtn.onclick = () => {
      sounds.playButton();
      this.closeModal();
    };
    mHeader.appendChild(closeBtn);
    box.appendChild(mHeader);

    box.appendChild(contentElem);
    backdrop.appendChild(box);
    this.overlay.appendChild(backdrop);
    this.activeModal = backdrop;
  }

  closeModal() {
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }
  }

  // --- 1. SAVE SLOTS MODAL ---
  showSlotsModal() {
    const wrap = document.createElement('div');
    wrap.style.cssText = `display: flex; flex-direction: column; gap: 14px;`;

    const summaries = this.saveManager.getSlotSummaries();

    summaries.forEach(s => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: ${s.isActive ? 'rgba(14, 116, 144, 0.28)' : 'rgba(30, 41, 59, 0.65)'};
        border: 1.5px solid ${s.isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)'};
        border-radius: 14px;
        padding: 16px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        transition: all 0.18s ease;
      `;

      const info = document.createElement('div');
      info.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;

      if (s.exists) {
        const dateStr = s.lastPlayed ? new Date(s.lastPlayed).toLocaleDateString() : 'Recent';
        info.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px; font-weight: 800; color: #f8fafc;">${s.name}</span>
            ${s.isActive ? '<span style="font-size: 10px; background: #0284c7; padding: 2px 8px; border-radius: 999px; font-weight: 800; color: #fff;">ACTIVE LOG</span>' : ''}
          </div>
          <div style="font-size: 13px; color: #cbd5e1; display: flex; gap: 12px; margin-top: 2px;">
            <span>⭐ <b style="color: #facc15;">${s.stars}</b> Stars</span>
            <span>🪵 <b style="color: #f59e0b;">${s.debris}</b> Debris</span>
            <span>📅 ${dateStr}</span>
          </div>
        `;
      } else {
        info.innerHTML = `
          <div style="font-size: 15px; font-weight: 700; color: #94a3b8;">${s.name}</div>
          <div style="font-size: 12px; color: #64748b;">No expedition records found. Ready for a new voyage!</div>
        `;
      }
      card.appendChild(info);

      const btnGroup = document.createElement('div');
      btnGroup.style.cssText = `display: flex; gap: 8px; align-items: center;`;

      // Select / Play button
      const playBtn = document.createElement('button');
      playBtn.style.cssText = `
        padding: 8px 14px;
        border-radius: 8px;
        border: none;
        background: ${s.exists ? '#0284c7' : '#059669'};
        color: #fff;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
      `;
      playBtn.innerText = s.exists ? (s.isActive ? 'Play Active' : 'Switch & Play') : 'New Game';
      playBtn.onclick = () => {
        sounds.playButton();
        if (!s.exists) {
          this.saveManager.createSlot(s.slotId);
        } else {
          this.saveManager.setActiveSlotId(s.slotId);
        }
        if (this.callbacks.onSwitchSlot) this.callbacks.onSwitchSlot(s.slotId);
        this.updateActiveSlotDisplay();
        this.closeModal();
        if (this.callbacks.onPlay) this.callbacks.onPlay();
      };
      btnGroup.appendChild(playBtn);

      // Delete / Reset button (only if exists)
      if (s.exists) {
        const delBtn = document.createElement('button');
        delBtn.style.cssText = `
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
        `;
        delBtn.innerText = '🗑️ Delete';
        delBtn.onclick = () => {
          if (confirm(`Are you sure you want to delete "${s.name}"? This cannot be undone.`)) {
            sounds.playButton();
            this.saveManager.deleteSlot(s.slotId);
            this.updateActiveSlotDisplay();
            this.showSlotsModal(); // Refresh modal
          }
        };
        btnGroup.appendChild(delBtn);
      }

      card.appendChild(btnGroup);
      wrap.appendChild(card);
    });

    // Backup & Restore Bar
    const backupBar = document.createElement('div');
    backupBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const expBtn = document.createElement('button');
    expBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
    `;
    expBtn.innerHTML = '📤 Export Save (JSON)';
    expBtn.onclick = () => {
      const json = this.saveManager.exportSaveJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noble_gnomes_save_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const impBtn = document.createElement('button');
    impBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
    `;
    impBtn.innerHTML = '📥 Import Save (JSON)';
    impBtn.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const res = this.saveManager.importSaveJson(evt.target.result);
            if (res.success) {
              alert('Save data restored successfully!');
              this.updateActiveSlotDisplay();
              this.showSlotsModal();
              if (this.callbacks.onSwitchSlot) this.callbacks.onSwitchSlot(this.saveManager.activeSlotId);
            } else {
              alert(`Import failed: ${res.error}`);
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    };

    backupBar.appendChild(expBtn);
    backupBar.appendChild(impBtn);
    wrap.appendChild(backupBar);

    this.showModal('💾 Expedition Logs (Save Slots)', wrap, '620px');
  }

  // --- 2. HOW TO PLAY / CAPTAIN'S GUIDE ---
  showGuideModal() {
    const wrap = document.createElement('div');
    wrap.style.cssText = `display: flex; flex-direction: column; gap: 14px; font-size: 14px; line-height: 1.5;`;

    const cards = [
      {
        icon: '🕹️',
        title: 'Steering & Hull Scrubber',
        desc: 'Use <b>WASD</b> or <b>Arrow Keys</b> to pilot Captain Bramble\'s toy tugboat. Forward throttles your engine while A/D turns the rudder. If algae sticks to your hull, press <b>[C]</b> to scrub it clean!'
      },
      {
        icon: '🔔',
        title: "The Brass Ship's Bell",
        desc: 'Press <b>[Spacebar]</b> to swing the mallet and strike the brass bell! Acoustic shockwaves travel across the pond surface, cleansing green algae film and stunning bouncy slime blobs.'
      },
      {
        icon: '💥',
        title: 'Gnome Crew & The "Big Bell Hit"',
        desc: 'Rescue all 3 stranded garden gnomes across the lily pads! Once your brave squad is united aboard, strike <b>[E]</b> or press <b>[Space + C]</b> to unleash the thunderous <b>Big Bell Hit</b> — a colossal 22-meter gong shockwave that shatters the Bog Behemoth\'s armored hide!'
      },
      {
        icon: '🧪',
        title: 'Scum Cargo & Port Bramble Pier',
        desc: 'Purge slime blooms to produce floating scum clots, then sail over them to collect cargo. Once the entire pond is purified and all gnomes are saved, return to Port Bramble Pier to deposit your scum into the compost vat and claim your stars!'
      },
      {
        icon: '🛠️',
        title: "Barnaby's Tinkering Shed",
        desc: 'Spend collected <b>Salvage Debris</b> at Barnaby\'s workshop to reinforce your tugboat\'s Hull Plating, extend Bell Alloy acoustic radius, boost Steam Boiler speed, and sharpen Scupper Brushes.'
      }
    ];

    cards.forEach(c => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(56, 189, 248, 0.25);
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        gap: 14px;
        align-items: flex-start;
      `;
      card.innerHTML = `
        <div style="font-size: 28px; line-height: 1;">${c.icon}</div>
        <div>
          <div style="font-weight: 800; color: #38bdf8; font-size: 15px; margin-bottom: 3px;">${c.title}</div>
          <div style="color: #cbd5e1;">${c.desc}</div>
        </div>
      `;
      wrap.appendChild(card);
    });

    this.showModal("📖 Captain's Field Manual (How to Play)", wrap, '640px');
  }

  // --- 3. SETTINGS & AUDIO MODAL ---
  showSettingsModal() {
    const wrap = document.createElement('div');
    wrap.style.cssText = `display: flex; flex-direction: column; gap: 18px; font-size: 14px;`;

    const slot = this.saveManager.loadActiveSlot();
    const settings = slot ? slot.settings : { masterVolume: 1.0, sfxVolume: 1.0, particles: true, skipIntro: false };

    wrap.innerHTML = `
      <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>🔊 Master Volume</span>
          <input type="range" id="setting-vol-master" min="0" max="100" value="${Math.round((settings.masterVolume || 1.0) * 100)}" style="width: 140px; cursor: pointer;">
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>🌧️ Atmospheric Weather Particles</span>
          <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="setting-opt-particles" ${settings.particles !== false ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;">
            <span style="color: #94a3b8;">Enabled</span>
          </label>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>⏭️ Skip Intro Boarding Cinematic</span>
          <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="setting-opt-skipintro" ${settings.skipIntro ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;">
            <span style="color: #94a3b8;">Skip</span>
          </label>
        </div>
      </div>
    `;

    const saveBtn = document.createElement('button');
    saveBtn.style.cssText = `
      padding: 10px 18px;
      border: none;
      border-radius: 10px;
      background: #0284c7;
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      align-self: flex-end;
    `;
    saveBtn.innerText = '💾 Save Settings';
    saveBtn.onclick = () => {
      sounds.playButton();
      const vol = parseInt(document.getElementById('setting-vol-master').value, 10) / 100;
      const part = document.getElementById('setting-opt-particles').checked;
      const skip = document.getElementById('setting-opt-skipintro').checked;

      const newSettings = { masterVolume: vol, sfxVolume: vol, particles: part, skipIntro: skip };
      this.saveManager.saveActiveSlot({ settings: newSettings });

      if (this.callbacks.onSettingsChange) {
        this.callbacks.onSettingsChange(newSettings);
      }
      this.closeModal();
    };
    wrap.appendChild(saveBtn);

    this.showModal('⚙️ Settings & Audio', wrap, '480px');
  }

  // --- 4. CREDITS MODAL ---
  showCreditsModal() {
    const wrap = document.createElement('div');
    wrap.style.cssText = `display: flex; flex-direction: column; gap: 14px; text-align: center; color: #cbd5e1; font-size: 14px; line-height: 1.6;`;

    wrap.innerHTML = `
      <div style="font-size: 40px; margin-bottom: 4px;">🍄 ⚓ 🌸</div>
      <div style="font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #facc15; text-transform: uppercase;">Noble Gnomes</div>
      <div style="font-style: italic; color: #94a3b8; font-size: 13px;">A Cozy Storybook 3D Naval Micro-Adventure</div>

      <div style="background: rgba(30, 41, 59, 0.6); border-radius: 12px; padding: 16px; margin-top: 10px; display: flex; flex-direction: column; gap: 10px; border: 1px solid rgba(255,255,255,0.08);">
        <div><b style="color: #38bdf8;">Game Design:</b> Tom Woodward (Psypher5)</div>
        <div><b style="color: #38bdf8;">Code:</b> Gemini 3.8</div>
        <div><b style="color: #cbd5e1;">Studio:</b> Psyko Studios</div>
        <div><b style="color: #94a3b8;">Engine & Shaders:</b> Three.js & WebGL 2.0</div>
        <div><b style="color: #94a3b8;">Audio:</b> Procedural Web Audio API</div>
      </div>

      <div style="margin-top: 8px; color: #64748b; font-size: 12px;">
        Dedicated to all brave toy tugboats and bearded garden gnomes setting sail for the great unknown.
      </div>
    `;

    this.showModal('📜 Credits', wrap, '460px');
  }

  show() {
    this.updateActiveSlotDisplay();
    this.overlay.style.display = 'flex';
    this.overlay.style.pointerEvents = 'auto';
    setTimeout(() => {
      this.overlay.style.opacity = '1';
    }, 10);
  }

  hide() {
    this.closeModal();
    this.overlay.style.opacity = '0';
    this.overlay.style.pointerEvents = 'none';
    setTimeout(() => {
      this.overlay.style.display = 'none';
    }, 450);
  }
}
