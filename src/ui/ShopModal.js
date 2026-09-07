import { sounds } from '../audio/SoundSynthesizer.js';

export const SHOP_UPGRADES = {
  hullPlating: {
    id: 'hullPlating',
    name: 'Reinforced Oak Plating',
    icon: '🛡️',
    description: 'Toughens hull with laminated bog oak. Increases max hull integrity against rocks & collisions.',
    tiers: [
      { tier: 1, value: 100, cost: 0, label: '100 HP (Standard Hull)' },
      { tier: 2, value: 125, cost: 25, label: '125 HP (+25% Durability)' },
      { tier: 3, value: 155, cost: 55, label: '155 HP (+55% Heavy Timber)' },
      { tier: 4, value: 195, cost: 95, label: '195 HP (Ironbound Keel)' }
    ]
  },
  bellAlloy: {
    id: 'bellAlloy',
    name: 'Resonant Brass Alloy',
    icon: '🔔',
    description: 'Hand-lathed acoustic rim tuning. Expands bell cleansing shockwave radius across the pond.',
    tiers: [
      { tier: 1, value: 1.0, cost: 0, label: '10.5m (Standard Range)' },
      { tier: 2, value: 1.25, cost: 30, label: '13.1m (+25% Shockwave)' },
      { tier: 3, value: 1.55, cost: 65, label: '16.3m (+55% Great Echo)' },
      { tier: 4, value: 1.90, cost: 110, label: '20.0m (Tidal Gong)' }
    ]
  },
  steamBoiler: {
    id: 'steamBoiler',
    name: 'Dual-Draft Steam Boiler',
    icon: '💨',
    description: 'High-compression brass pistons. Boosts top cruising velocity and tightens rudder response.',
    tiers: [
      { tier: 1, value: 8.8, cost: 0, label: '8.8 m/s (Standard Chug)' },
      { tier: 2, value: 10.6, cost: 35, label: '10.6 m/s (+20% Engine Churn)' },
      { tier: 3, value: 12.6, cost: 75, label: '12.6 m/s (+43% Twin Flue)' },
      { tier: 4, value: 15.0, cost: 125, label: '15.0 m/s (Clipper Speed)' }
    ]
  },
  scupperBrush: {
    id: 'scupperBrush',
    name: 'Copper Scupper Scrapers',
    icon: '🧽',
    description: 'Spring-loaded waterline scrapers that reduce algae drag penalty and scrub hull clean faster.',
    tiers: [
      { tier: 1, value: 1.0, cost: 0, label: 'Standard Deck Scrub' },
      { tier: 2, value: 0.75, cost: 20, label: '-25% Algae Drag' },
      { tier: 3, value: 0.50, cost: 50, label: '-50% Drag & Instant Clean' },
      { tier: 4, value: 0.25, cost: 85, label: 'Hydrophobic Wax Slick' }
    ]
  }
};

export class ShopModal {
  constructor(getDebrisFn, spendDebrisFn, getUpgradesFn, onUpgradePurchasedFn) {
    this.getDebris = getDebrisFn;
    this.spendDebris = spendDebrisFn;
    this.getUpgrades = getUpgradesFn;
    this.onUpgradePurchased = onUpgradePurchasedFn;

    this.root = document.createElement('div');
    this.root.id = 'shop-modal-container';
    this.root.className = 'shop-modal-overlay hidden';
    document.body.appendChild(this.root);

    this.createUI();
  }

  createUI() {
    this.root.innerHTML = `
      <div class="shop-backdrop"></div>
      <div class="shop-window">
        <!-- Shop Header -->
        <div class="shop-header">
          <div class="shop-badge">⚓ PORT BRAMBLE EXPEDITIONS</div>
          <div class="shop-title-row">
            <div class="shop-avatar">👨‍🔧</div>
            <div>
              <h2 class="shop-title">Barnaby's Tinkering Shed</h2>
              <p class="shop-subtitle">"Bring me pond salvage, Cap'n! I'll tune your tugboat to cross the wildest waters!"</p>
            </div>
            <div class="shop-currency-pill">
              <span class="currency-icon">🪵</span>
              <span id="shop-debris-count" class="currency-value">0</span>
              <span class="currency-label">Salvage Debris</span>
            </div>
          </div>
          <button id="btn-close-shop" class="shop-close-btn" title="Return to Map">✕</button>
        </div>

        <!-- Shop Grid -->
        <div id="shop-cards-grid" class="shop-cards-grid"></div>

        <!-- Shop Footer -->
        <div class="shop-footer">
          <div class="shop-hint">💡 Tip: Scoop up driftwood planks, tins, corks, and message bottles during pond runs to earn Salvage Debris!</div>
          <button id="btn-shop-return-map" class="shop-return-btn">🗺️ RETURN TO MAP</button>
        </div>
      </div>
    `;

    document.getElementById('btn-close-shop').addEventListener('click', () => this.hide());
    document.getElementById('btn-shop-return-map').addEventListener('click', () => this.hide());
    this.root.querySelector('.shop-backdrop').addEventListener('click', () => this.hide());
  }

  renderCards() {
    const grid = document.getElementById('shop-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const currentUpgrades = this.getUpgrades();
    const debris = this.getDebris();

    const debrisCountEl = document.getElementById('shop-debris-count');
    if (debrisCountEl) debrisCountEl.textContent = debris;

    Object.values(SHOP_UPGRADES).forEach((upg) => {
      const currentTierIndex = (currentUpgrades[upg.id] || 1) - 1;
      const currentTier = upg.tiers[currentTierIndex];
      const nextTier = upg.tiers[currentTierIndex + 1];
      const isMaxed = !nextTier;

      const card = document.createElement('div');
      card.className = `shop-card ${isMaxed ? 'maxed' : ''}`;

      // Pip dots
      let pipsHtml = '';
      for (let i = 0; i < upg.tiers.length; i++) {
        pipsHtml += `<span class="pip ${i <= currentTierIndex ? 'active' : ''}"></span>`;
      }

      card.innerHTML = `
        <div class="card-head">
          <span class="upg-icon">${upg.icon}</span>
          <div class="card-head-text">
            <h3 class="upg-title">${upg.name}</h3>
            <div class="upg-pips">${pipsHtml} <span class="tier-label">Tier ${currentTierIndex + 1} / ${upg.tiers.length}</span></div>
          </div>
        </div>
        <p class="upg-desc">${upg.description}</p>
        <div class="current-stat"><strong>Current:</strong> ${currentTier.label}</div>
        <div class="card-action">
          ${
            isMaxed
              ? `<div class="maxed-badge">✨ MAXIMUM TIER ✨</div>`
              : `
                <div class="next-stat"><strong>Next:</strong> ${nextTier.label}</div>
                <button class="buy-btn ${debris >= nextTier.cost ? 'can-afford' : 'cannot-afford'}" data-upg-id="${upg.id}">
                  <span>Upgrade</span>
                  <span class="cost-tag">🪵 ${nextTier.cost}</span>
                </button>
              `
          }
        </div>
      `;

      if (!isMaxed) {
        const buyBtn = card.querySelector('.buy-btn');
        buyBtn.addEventListener('click', () => {
          if (debris >= nextTier.cost) {
            const success = this.spendDebris(nextTier.cost);
            if (success) {
              sounds.playShopBuy();
              this.onUpgradePurchased(upg.id, nextTier.tier);
              this.renderCards();
            }
          } else {
            sounds.playSlimeSplat();
            buyBtn.classList.add('shake');
            setTimeout(() => buyBtn.classList.remove('shake'), 400);
          }
        });
      }

      grid.appendChild(card);
    });
  }

  show() {
    this.renderCards();
    this.root.classList.remove('hidden');
    sounds.playMapNodeClick();
  }

  open() {
    this.show();
  }

  hide() {
    this.root.classList.add('hidden');
    sounds.playMapNodeClick();
  }

  close() {
    this.hide();
  }
}
