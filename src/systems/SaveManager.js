/**
 * SaveManager.js
 * Multi-slot client-side persistence system for Noble Gnomes.
 * Supports up to 3 independent adventure logs, save exports/imports, and legacy migration.
 */

const STORAGE_PREFIX = 'noble_gnomes_slot_';
const ACTIVE_SLOT_KEY = 'noble_gnomes_active_slot';
const LEGACY_SAVE_KEY = 'noble_gnomes_save_v1';
const LEGACY_MAP_KEY = 'noble_gnomes_map_v1';

export class SaveManager {
  constructor() {
    this.activeSlotId = this.readActiveSlotId();
    this.migrateLegacySaveIfNeeded();
  }

  readActiveSlotId() {
    try {
      const saved = localStorage.getItem(ACTIVE_SLOT_KEY);
      const parsed = parseInt(saved, 10);
      if (parsed === 1 || parsed === 2 || parsed === 3) {
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read active slot id:', e);
    }
    return 1;
  }

  setActiveSlotId(slotId) {
    if (slotId < 1 || slotId > 3) return;
    this.activeSlotId = slotId;
    try {
      localStorage.setItem(ACTIVE_SLOT_KEY, slotId.toString());
    } catch (e) {
      console.warn('Could not write active slot id:', e);
    }
  }

  getSlotKey(slotId) {
    return `${STORAGE_PREFIX}${slotId}`;
  }

  getDefaultSlotData(slotId) {
    return {
      slotId,
      name: `Expedition ${slotId}`,
      createdAt: new Date().toISOString(),
      lastPlayed: new Date().toISOString(),
      salvageDebris: 45,
      upgrades: {
        hullPlating: 1,
        bellAlloy: 1,
        steamBoiler: 1,
        scupperBrush: 1
      },
      mapNodes: [
        { id: 'node-shallows', unlocked: true, cleared: false, stars: 0 },
        { id: 'node-lagoon', unlocked: false, cleared: false, stars: 0 },
        { id: 'node-shop', unlocked: false, cleared: false, stars: 0 },
        { id: 'node-murk', unlocked: false, cleared: false, stars: 0 },
        { id: 'node-boss-fen', unlocked: false, cleared: false, stars: 0 },
        { id: 'node-whispering-lake', unlocked: false, cleared: false, stars: 0 },
        { id: 'node-river-rapids', unlocked: false, cleared: false, stars: 0 },
        { id: 'node-ocean-horizon', unlocked: false, cleared: false, stars: 0 }
      ],
      tokens: [],
      settings: {
        masterVolume: 1.0,
        sfxVolume: 1.0,
        particles: true,
        skipIntro: false
      }
    };
  }

  migrateLegacySaveIfNeeded() {
    try {
      const slot1Exists = localStorage.getItem(this.getSlotKey(1));
      if (!slot1Exists) {
        const legacyUserData = localStorage.getItem(LEGACY_SAVE_KEY);
        const legacyMapData = localStorage.getItem(LEGACY_MAP_KEY);

        if (legacyUserData || legacyMapData) {
          const slot1 = this.getDefaultSlotData(1);
          slot1.name = 'Captain Bramble (Legacy)';

          if (legacyUserData) {
            const parsedUser = JSON.parse(legacyUserData);
            if (typeof parsedUser.salvageDebris === 'number') slot1.salvageDebris = parsedUser.salvageDebris;
            if (parsedUser.upgrades) slot1.upgrades = { ...slot1.upgrades, ...parsedUser.upgrades };
          }

          if (legacyMapData) {
            const parsedMap = JSON.parse(legacyMapData);
            if (Array.isArray(parsedMap.nodes)) {
              slot1.mapNodes = parsedMap.nodes;
            }
          }

          localStorage.setItem(this.getSlotKey(1), JSON.stringify(slot1));
          console.log('Successfully migrated legacy save data into Slot 1!');
        }
      }
    } catch (e) {
      console.warn('Error during legacy save migration:', e);
    }
  }

  loadActiveSlot() {
    return this.loadSlot(this.activeSlotId);
  }

  loadSlot(slotId) {
    try {
      const raw = localStorage.getItem(this.getSlotKey(slotId));
      if (raw) {
        const data = JSON.parse(raw);
        // Merge with defaults in case of missing keys
        const defaults = this.getDefaultSlotData(slotId);
        return {
          ...defaults,
          ...data,
          tokens: Array.isArray(data.tokens) ? data.tokens : (defaults.tokens || []),
          upgrades: { ...defaults.upgrades, ...(data.upgrades || {}) },
          settings: { ...defaults.settings, ...(data.settings || {}) }
        };
      }
    } catch (e) {
      console.warn(`Error loading slot ${slotId}:`, e);
    }
    return null;
  }

  saveActiveSlot(data) {
    return this.saveSlot(this.activeSlotId, data);
  }

  saveSlot(slotId, data) {
    if (slotId < 1 || slotId > 3) return false;
    try {
      const existing = this.loadSlot(slotId) || this.getDefaultSlotData(slotId);
      const updated = {
        ...existing,
        ...data,
        slotId,
        lastPlayed: new Date().toISOString()
      };
      localStorage.setItem(this.getSlotKey(slotId), JSON.stringify(updated));
      return true;
    } catch (e) {
      console.warn(`Error saving slot ${slotId}:`, e);
      return false;
    }
  }

  hasToken(tokenId, slotId = this.activeSlotId) {
    const slot = this.loadSlot(slotId);
    return Boolean(slot && Array.isArray(slot.tokens) && slot.tokens.includes(tokenId));
  }

  addToken(tokenId, slotId = this.activeSlotId) {
    const slot = this.loadSlot(slotId) || this.getDefaultSlotData(slotId);
    const tokens = Array.isArray(slot.tokens) ? [...slot.tokens] : [];
    if (!tokens.includes(tokenId)) {
      tokens.push(tokenId);
      return this.saveSlot(slotId, { tokens });
    }
    return true;
  }

  getTokens(slotId = this.activeSlotId) {
    const slot = this.loadSlot(slotId);
    return (slot && Array.isArray(slot.tokens)) ? slot.tokens : [];
  }

  createSlot(slotId, name = null) {
    const newSlot = this.getDefaultSlotData(slotId);
    if (name) newSlot.name = name;
    try {
      localStorage.setItem(this.getSlotKey(slotId), JSON.stringify(newSlot));
      this.setActiveSlotId(slotId);
      return newSlot;
    } catch (e) {
      console.warn(`Error creating slot ${slotId}:`, e);
      return null;
    }
  }

  deleteSlot(slotId) {
    try {
      localStorage.removeItem(this.getSlotKey(slotId));
      return true;
    } catch (e) {
      console.warn(`Error deleting slot ${slotId}:`, e);
      return false;
    }
  }

  hasAnySave() {
    for (let i = 1; i <= 3; i++) {
      if (localStorage.getItem(this.getSlotKey(i))) {
        return true;
      }
    }
    return false;
  }

  getSlotSummaries() {
    const summaries = [];
    for (let i = 1; i <= 3; i++) {
      const data = this.loadSlot(i);
      if (data) {
        let stars = 0;
        let clearedCount = 0;
        if (Array.isArray(data.mapNodes)) {
          data.mapNodes.forEach(n => {
            if (n.stars) stars += n.stars;
            if (n.cleared) clearedCount++;
          });
        }
        summaries.push({
          slotId: i,
          exists: true,
          name: data.name || `Expedition ${i}`,
          debris: data.salvageDebris || 0,
          stars,
          clearedCount,
          lastPlayed: data.lastPlayed || data.createdAt,
          isActive: i === this.activeSlotId
        });
      } else {
        summaries.push({
          slotId: i,
          exists: false,
          name: `Empty Log ${i}`,
          debris: 0,
          stars: 0,
          clearedCount: 0,
          lastPlayed: null,
          isActive: i === this.activeSlotId
        });
      }
    }
    return summaries;
  }

  exportSaveJson() {
    const allData = {
      version: 'noble_gnomes_v2',
      exportDate: new Date().toISOString(),
      activeSlotId: this.activeSlotId,
      slots: {
        slot1: this.loadSlot(1),
        slot2: this.loadSlot(2),
        slot3: this.loadSlot(3)
      }
    };
    return JSON.stringify(allData, null, 2);
  }

  importSaveJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.slots) {
        if (parsed.slots.slot1) localStorage.setItem(this.getSlotKey(1), JSON.stringify(parsed.slots.slot1));
        if (parsed.slots.slot2) localStorage.setItem(this.getSlotKey(2), JSON.stringify(parsed.slots.slot2));
        if (parsed.slots.slot3) localStorage.setItem(this.getSlotKey(3), JSON.stringify(parsed.slots.slot3));
        if (parsed.activeSlotId) this.setActiveSlotId(parsed.activeSlotId);
        return { success: true };
      }
      return { success: false, error: 'Invalid save file structure' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}
