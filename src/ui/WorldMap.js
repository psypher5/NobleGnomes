import { sounds } from '../audio/SoundSynthesizer.js';

export const MAP_NODES = [
  {
    id: 'node-shallows',
    name: 'Port Bramble Shallows',
    subtitle: 'Pond Basin • Calm Waters',
    type: 'POND',
    icon: '🌿',
    x: 16,
    y: 78,
    unlocked: true,
    cleared: true,
    stars: 3,
    description: 'The tranquil starting shallows around Port Bramble Pier. Test your tugboat rudder and clear the shoreline scum.',
    threat: 'Low (Spore pods & baby films)',
    rewards: '30 Debris • Captain Badge',
    levelConfig: {
      biome: 'GARDEN_POND',
      slimeCount: 12,
      hasBoss: false,
      rescueTarget: 'Barnaby'
    }
  },
  {
    id: 'node-lagoon',
    name: 'Lilypad Lagoon',
    subtitle: 'Pond Basin • Trapped Gnomes',
    type: 'POND',
    icon: '🌸',
    x: 32,
    y: 64,
    unlocked: true,
    cleared: false,
    stars: 0,
    description: 'A cluster of overgrown lily pads where Pip and Clover are trapped in sticky algae cocoons! Cleanse the pads to welcome them aboard.',
    threat: 'Medium (Algae spitting globs)',
    rewards: '45 Debris • Pip & Clover',
    levelConfig: {
      biome: 'TROPICAL_LAGOON',
      slimeCount: 18,
      hasBoss: false,
      rescueTarget: 'Pip'
    }
  },
  {
    id: 'node-shop',
    name: "Barnaby's Tinkering Shed",
    subtitle: 'Workshop Branch • Ship Upgrades',
    type: 'SHOP',
    icon: '🛠️',
    x: 26,
    y: 42,
    unlocked: false,
    cleared: false,
    stars: 0,
    description: "Barnaby's lakeside drydock. Exchange your salvaged pond debris for reinforced oak plating, acoustic brass bell rims, and steam engine upgrades!",
    threat: 'Safe Harbor ✨',
    rewards: 'Permanent Ship Upgrades',
    isBranch: true
  },
  {
    id: 'node-murk',
    name: 'The Murk Hollow',
    subtitle: 'Pond Basin • Rich Salvage',
    type: 'POND',
    icon: '🪵',
    x: 48,
    y: 48,
    unlocked: true,
    cleared: false,
    stars: 0,
    description: 'A secluded muddy cove rich with weathered driftwood planks, brass gears, and sealed message bottles. Ideal for salvage scavenging!',
    threat: 'Medium (Mud monsters & dense scum)',
    rewards: '60 Debris • Dense Salvage',
    levelConfig: {
      biome: 'AUTUMN_BOG',
      slimeCount: 20,
      hasBoss: false,
      rescueTarget: 'Clover'
    }
  },
  {
    id: 'node-boss-fen',
    name: 'The Boss Fen',
    subtitle: 'Lair of the Bog Behemoth',
    type: 'BOSS',
    icon: '👹',
    x: 64,
    y: 35,
    unlocked: false,
    cleared: false,
    stars: 0,
    description: 'A colossal, stone-horned Bog Behemoth rules this deep fen, hurling ballistic river boulders at your tugboat! Keep your hull patched with pond trash!',
    threat: 'HIGH (Bullet Barrages • 10 HP Boss)',
    rewards: '100 Debris • 🔱 Bog Master Compass',
    levelConfig: {
      biome: 'DARK_FEN',
      slimeCount: 24,
      hasBoss: true,
      rescueTarget: 'All'
    }
  },
  {
    id: 'node-whispering-lake',
    name: 'Whispering Lake',
    subtitle: 'Open Waters • Deeper Currents',
    type: 'LAKE',
    icon: '🌊',
    x: 75,
    y: 54,
    unlocked: false,
    cleared: false,
    stars: 0,
    description: 'The journey expands past the garden pond into a vast freshwater lake with deeper swells and wandering algae shoals.',
    threat: 'High (Rolling lake swells)',
    rewards: 'Lake Navigator Crest',
    levelConfig: {
      biome: 'TWILIGHT_LAKE',
      slimeCount: 28,
      hasBoss: true,
      rescueTarget: 'None'
    }
  },
  {
    id: 'node-river-rapids',
    name: 'Misty River Rapids',
    subtitle: 'River Passage • Rocky Sluice',
    type: 'RIVER',
    icon: '🏞️',
    x: 84,
    y: 36,
    unlocked: false,
    cleared: false,
    stars: 0,
    description: 'Narrow cascading rapids weaving past granite river boulders toward the coastal estuary. Requires clipper steam power!',
    threat: 'Extreme (Fast currents & rocks)',
    rewards: 'River Pilot Pennant',
    levelConfig: {
      biome: 'RIVER_RAPIDS',
      slimeCount: 24,
      hasBoss: false,
      rescueTarget: 'None'
    }
  },
  {
    id: 'node-ocean-horizon',
    name: 'The Great Ocean Horizon',
    subtitle: 'The High Seas • Grand Adventure!',
    type: 'OCEAN',
    icon: '⛵',
    x: 92,
    y: 18,
    unlocked: false,
    cleared: false,
    stars: 0,
    description: 'The boundless ocean horizon! Where brave garden gnomes and their noble tugboat venture out into the great wide world.',
    threat: 'Legendary (Open ocean swells)',
    rewards: 'Master of the High Seas 👑',
    levelConfig: {
      biome: 'OCEAN_HORIZON',
      slimeCount: 30,
      hasBoss: true,
      rescueTarget: 'All'
    }
  }
];

export const MAP_CONNECTIONS = [
  { from: 'node-shallows', to: 'node-lagoon' },
  { from: 'node-lagoon', to: 'node-shop' },
  { from: 'node-lagoon', to: 'node-murk' },
  { from: 'node-shop', to: 'node-boss-fen' },
  { from: 'node-murk', to: 'node-boss-fen' },
  { from: 'node-boss-fen', to: 'node-whispering-lake' },
  { from: 'node-whispering-lake', to: 'node-river-rapids' },
  { from: 'node-river-rapids', to: 'node-ocean-horizon' }
];

export class WorldMap {
  constructor(onSailToNodeFn, onOpenShopFn, getDebrisFn, onMainMenuFn = null, saveManager = null) {
    this.onSailToNode = onSailToNodeFn;
    this.onOpenShop = onOpenShopFn;
    this.getDebris = getDebrisFn;
    this.onMainMenu = onMainMenuFn;
    this.saveManager = saveManager;

    this.nodes = JSON.parse(JSON.stringify(MAP_NODES));
    this.connections = MAP_CONNECTIONS;
    this.currentNodeId = 'node-lagoon';
    this.selectedNodeId = 'node-lagoon';

    this.loadProgress();

    this.root = document.createElement('div');
    this.root.id = 'world-map-container';
    this.root.className = 'world-map-container';
    document.body.appendChild(this.root);

    this.createUI();
  }

  loadProgress() {
    if (this.saveManager) {
      const slot = this.saveManager.loadActiveSlot();
      if (slot && Array.isArray(slot.mapNodes)) {
        slot.mapNodes.forEach((savedNode) => {
          const match = this.nodes.find((n) => n.id === savedNode.id);
          if (match) {
            match.unlocked = savedNode.unlocked;
            match.cleared = savedNode.cleared;
            match.stars = savedNode.stars;
          }
        });
        if (slot.currentNodeId) this.currentNodeId = slot.currentNodeId;
        this.selectedNodeId = this.currentNodeId;
        return;
      }
    }

    try {
      const saved = localStorage.getItem('noble_gnomes_map_v1');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.nodes) {
          data.nodes.forEach((savedNode) => {
            const match = this.nodes.find((n) => n.id === savedNode.id);
            if (match) {
              match.unlocked = savedNode.unlocked;
              match.cleared = savedNode.cleared;
              match.stars = savedNode.stars;
            }
          });
        }
        if (data.currentNodeId) this.currentNodeId = data.currentNodeId;
        this.selectedNodeId = this.currentNodeId;
      }
    } catch (e) {
      console.warn('Could not load map progress:', e);
    }
  }

  saveProgress() {
    const nodesData = this.nodes.map((n) => ({
      id: n.id,
      unlocked: n.unlocked,
      cleared: n.cleared,
      stars: n.stars
    }));

    if (this.saveManager) {
      this.saveManager.saveActiveSlot({
        mapNodes: nodesData,
        currentNodeId: this.currentNodeId
      });
    }

    try {
      const data = {
        nodes: nodesData,
        currentNodeId: this.currentNodeId
      };
      localStorage.setItem('noble_gnomes_map_v1', JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save map progress:', e);
    }
  }

  reloadProgress() {
    this.nodes = JSON.parse(JSON.stringify(MAP_NODES));
    this.loadProgress();
    this.render();
  }

  createUI() {
    this.root.innerHTML = `
      <!-- Top Expedition Banner -->
      <div class="map-topbar">
        <div class="map-title-wrap">
          <button id="map-menu-btn" class="map-nav-menu-btn" title="Return to Main Menu" style="margin-right: 12px;">
            <span style="font-size: 16px;">🏠</span> <span>MENU</span>
          </button>
          <span class="map-compass">🧭</span>
          <div>
            <h1 class="map-title">Noble Gnomes</h1>
            <p class="map-subtitle">Chart your course from Port Bramble Pier all the way to the Great Ocean!</p>
          </div>
        </div>

        <div class="map-stats-wrap">
          <div class="map-stat-pill tokens-pill" title="Area Progression Tokens">
            <span class="stat-icon">🔱</span>
            <span id="map-total-tokens" class="stat-value">0</span>
            <span class="stat-label">Tokens</span>
          </div>

          <div class="map-stat-pill stars-pill">
            <span class="stat-icon">⭐</span>
            <span id="map-total-stars" class="stat-value">3 / 24</span>
            <span class="stat-label">Stars</span>
          </div>

          <div id="map-debris-pill" class="map-stat-pill debris-pill" title="Click to open Barnaby's Tinkering Shed">
            <span class="stat-icon">🪵</span>
            <span id="map-total-debris" class="stat-value">45</span>
            <span class="stat-label">Salvage Debris</span>
            <span class="shop-badge-hint">SHOP 🛠️</span>
          </div>

          <button id="map-sound-btn" class="map-icon-btn" title="Toggle Sound">🔊</button>
        </div>
      </div>

      <!-- Main Parchment Map Canvas & SVG Trails -->
      <div class="map-canvas-viewport">
        <div class="map-canvas" id="map-canvas">
          <!-- Background Illustrations (Pond, Lake, River, Sea) -->
          <div class="map-bg-art">
            <div class="region-label r1">PORT BRAMBLE POND</div>
            <div class="region-label r2">THE SHADOW FENS</div>
            <div class="region-label r3">WHISPERING LAKE</div>
            <div class="region-label r4">THE GREAT SEA ⚓</div>
            <div class="compass-rose"></div>
          </div>

          <!-- SVG Dotted Connections -->
          <svg class="map-svg" id="map-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none"></svg>

          <!-- Nodes Layer -->
          <div class="map-nodes-layer" id="map-nodes-layer"></div>

          <!-- Animated Tugboat Marker Pawn -->
          <div class="map-boat-pawn" id="map-boat-pawn">
            <div class="boat-steam-puff"></div>
            <div class="boat-icon">⛵</div>
          </div>
        </div>
      </div>

      <!-- Bottom / Floating Level Briefing Modal -->
      <div id="level-briefing-modal" class="briefing-modal hidden">
        <div class="briefing-card">
          <button id="btn-close-briefing" class="briefing-close">✕</button>
          <div class="briefing-badge" id="briefing-type-badge">EXPEDITION NODE</div>
          <h2 class="briefing-title" id="briefing-title">Port Bramble Shallows</h2>
          <div class="briefing-subtitle" id="briefing-subtitle">Pond Basin • Calm Waters</div>
          <p class="briefing-desc" id="briefing-desc">Pond description goes here.</p>

          <div class="briefing-meta-grid">
            <div class="meta-item">
              <span class="meta-label">Pond Hazards</span>
              <strong class="meta-val" id="briefing-threat">Low</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">Pond Rewards</span>
              <strong class="meta-val" id="briefing-rewards">Salvage Debris</strong>
            </div>
          </div>

          <div class="briefing-stars-preview" id="briefing-stars-preview">
            <span class="star-slot">★</span>
            <span class="star-slot">★</span>
            <span class="star-slot">★</span>
          </div>

          <button id="btn-sail-forth" class="sail-forth-btn">
            <span>SAIL FORTH! ⚓</span>
          </button>
        </div>
      </div>
    `;

    // Hook events
    const menuBtn = document.getElementById('map-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        sounds.playButton();
        if (this.onMainMenu) this.onMainMenu();
      });
    }

    document.getElementById('map-debris-pill').addEventListener('click', () => {
      const shopNode = this.nodes.find((n) => n.id === 'node-shop');
      if (shopNode && !shopNode.unlocked) {
        sounds.playButton();
        this.selectNode(shopNode);
        return;
      }
      if (this.onOpenShop) this.onOpenShop();
    });

    document.getElementById('btn-close-briefing').addEventListener('click', () => {
      this.hideBriefing();
    });

    document.getElementById('btn-sail-forth').addEventListener('click', () => {
      const node = this.nodes.find((n) => n.id === this.selectedNodeId);
      if (!node || !node.unlocked) return;

      if (node.type === 'SHOP') {
        if (this.onOpenShop) this.onOpenShop();
        return;
      }

      sounds.playWhistle();
      const sailBtn = document.getElementById('btn-sail-forth');
      if (sailBtn) {
        sailBtn.disabled = true;
        sailBtn.innerHTML = `<span>SAILING FORTH... 💨</span>`;
      }

      this.hideBriefing();

      const proceedToLaunch = () => {
        this.sailFlourish(() => {
          this.hide();
          if (this.onSailToNode) this.onSailToNode(node);
        });
      };

      if (this.currentNodeId !== node.id) {
        this.sailAlongRoute(this.currentNodeId, node.id, proceedToLaunch);
      } else {
        proceedToLaunch();
      }
    });

    const soundBtn = document.getElementById('map-sound-btn');
    soundBtn.addEventListener('click', () => {
      const isMuted = sounds.toggleMute();
      soundBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    this.render();
  }

  render() {
    this.updateStatsBar();
    this.renderSvgPaths();
    this.renderNodes();
    this.updateBoatPawnPosition(false);
  }

  updateStatsBar() {
    const totalStars = this.nodes.reduce((sum, n) => sum + (n.stars || 0), 0);
    const maxStars = this.nodes.filter((n) => n.type !== 'SHOP').length * 3;
    const starsEl = document.getElementById('map-total-stars');
    if (starsEl) starsEl.textContent = `${totalStars} / ${maxStars}`;

    const debrisEl = document.getElementById('map-total-debris');
    if (debrisEl) debrisEl.textContent = this.getDebris();

    const tokensEl = document.getElementById('map-total-tokens');
    if (tokensEl) {
      const tokenCount = (this.saveManager && typeof this.saveManager.getTokens === 'function')
        ? this.saveManager.getTokens().length
        : 0;
      tokensEl.textContent = tokenCount;
    }

    // Update shop badge hint based on unlock state
    const shopNode = this.nodes.find((n) => n.id === 'node-shop');
    const isShopUnlocked = shopNode ? Boolean(shopNode.unlocked) : false;
    const shopBadge = this.root.querySelector('.shop-badge-hint');
    if (shopBadge) {
      if (isShopUnlocked) {
        shopBadge.textContent = 'SHOP 🛠️';
        shopBadge.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        shopBadge.style.color = '#fff';
      } else {
        shopBadge.textContent = 'LOCKED 🔒';
        shopBadge.style.background = 'rgba(100, 116, 139, 0.45)';
        shopBadge.style.color = '#94a3b8';
      }
    }
  }

  renderSvgPaths() {
    const svg = document.getElementById('map-svg');
    if (!svg) return;
    svg.innerHTML = '';

    this.connections.forEach((conn) => {
      const fromNode = this.nodes.find((n) => n.id === conn.from);
      const toNode = this.nodes.find((n) => n.id === conn.to);
      if (!fromNode || !toNode) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const x1 = fromNode.x * 10;
      const y1 = fromNode.y * 10;
      const x2 = toNode.x * 10;
      const y2 = toNode.y * 10;

      // Gentle curved cubic spline between nodes
      const dx = x2 - x1;
      const dy = y2 - y1;
      const cx1 = x1 + dx * 0.45;
      const cy1 = y1 + (Math.abs(dx) > Math.abs(dy) ? -40 : 40);
      const cx2 = x2 - dx * 0.45;
      const cy2 = y2 + (Math.abs(dx) > Math.abs(dy) ? 40 : -40);

      const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
      path.setAttribute('d', d);

      const isCleared = fromNode.cleared && (toNode.cleared || toNode.unlocked);
      const isUnlockedPath = fromNode.cleared || fromNode.unlocked;
      path.setAttribute('class', `map-connection-line ${isCleared ? 'cleared' : (isUnlockedPath ? 'unlocked' : 'locked')}`);

      svg.appendChild(path);
    });
  }

  renderNodes() {
    const container = document.getElementById('map-nodes-layer');
    if (!container) return;
    container.innerHTML = '';

    // Identify next voyage node to guide the player
    const nextReadyNode = this.nodes.find((n) => n.unlocked && !n.cleared && n.type !== 'SHOP');

    this.nodes.forEach((node) => {
      const isNextVoyage = nextReadyNode && node.id === nextReadyNode.id;
      const el = document.createElement('div');
      el.className = `map-node ${node.type.toLowerCase()}-node ${node.unlocked ? 'unlocked' : 'locked'} ${
        node.cleared ? 'cleared' : ''
      } ${node.id === this.selectedNodeId ? 'selected' : ''}`;
      el.style.left = `${node.x}%`;
      el.style.top = `${node.y}%`;

      // Next Voyage guide banner
      let nextBadgeHtml = '';
      if (isNextVoyage) {
        nextBadgeHtml = `<div class="node-next-badge">NEXT ⚓</div>`;
      }

      // Cleared checkmark badge on disc
      let clearedBadgeHtml = '';
      if (node.cleared) {
        clearedBadgeHtml = `<div class="node-cleared-badge" title="Pond Cleansed & Restored!">✔</div>`;
      }

      // Stars pill under node
      let starsHtml = '';
      if (node.type !== 'SHOP') {
        starsHtml = `
          <div class="node-stars">
            <span class="${node.stars >= 1 ? 'filled' : ''}">★</span>
            <span class="${node.stars >= 2 ? 'filled' : ''}">★</span>
            <span class="${node.stars >= 3 ? 'filled' : ''}">★</span>
          </div>
        `;
      }

      el.innerHTML = `
        ${nextBadgeHtml}
        <div class="node-disc">
          <div class="node-ring"></div>
          <span class="node-icon">${node.unlocked ? node.icon : '🔒'}</span>
          ${clearedBadgeHtml}
        </div>
        <div class="node-label-pill">
          <span class="node-name">${node.name}</span>
          ${starsHtml}
        </div>
      `;

      el.addEventListener('click', () => {
        sounds.playMapNodeClick();
        this.selectNode(node);
      });

      container.appendChild(el);
    });
  }

  selectNode(nodeOrId) {
    const node = typeof nodeOrId === 'string' ? this.nodes.find((n) => n.id === nodeOrId) : nodeOrId;
    if (!node) return;
    this.selectedNodeId = node.id;

    // Update active class on DOM
    const all = this.root.querySelectorAll('.map-node');
    all.forEach((n) => n.classList.remove('selected'));
    const target = this.root.querySelector(`.map-node[style*="left: ${node.x}%"]`);
    if (target) target.classList.add('selected');

    if (node.type === 'SHOP') {
      if (!node.unlocked) {
        // Shop is locked! Show briefing explaining it's locked so player understands requirement
        this.showBriefing(node);
        return;
      }
      if (this.onOpenShop) this.onOpenShop();
      this.hideBriefing();
    } else {
      this.showBriefing(node);
    }

    // Animate boat along route lines to this node if not already at destination
    if (this.currentNodeId !== node.id && node.unlocked) {
      this.sailAlongRoute(this.currentNodeId, node.id);
    }
  }

  showBriefing(node) {
    const modal = document.getElementById('level-briefing-modal');
    if (!modal) return;

    document.getElementById('briefing-type-badge').textContent = `${node.type} EXPEDITION`;
    document.getElementById('briefing-title').textContent = node.name;
    document.getElementById('briefing-subtitle').textContent = node.subtitle;
    document.getElementById('briefing-desc').textContent = node.description;
    document.getElementById('briefing-threat').textContent = node.threat;
    document.getElementById('briefing-rewards').textContent = node.rewards;

    const starsContainer = document.getElementById('briefing-stars-preview');
    if (starsContainer) {
      starsContainer.innerHTML = `
        <span class="star-slot ${node.stars >= 1 ? 'earned' : ''}">★</span>
        <span class="star-slot ${node.stars >= 2 ? 'earned' : ''}">★</span>
        <span class="star-slot ${node.stars >= 3 ? 'earned' : ''}">★</span>
      `;
    }

    const sailBtn = document.getElementById('btn-sail-forth');
    if (sailBtn) {
      if (node.unlocked) {
        sailBtn.disabled = false;
        sailBtn.innerHTML = `<span>SAIL FORTH! ⚓</span>`;
        sailBtn.className = 'sail-forth-btn ready';
      } else {
        sailBtn.disabled = true;
        sailBtn.innerHTML = `<span>🔒 LOCKED (Clear earlier waters)</span>`;
        sailBtn.className = 'sail-forth-btn disabled';
      }
    }

    modal.classList.remove('hidden');
  }

  hideBriefing() {
    const modal = document.getElementById('level-briefing-modal');
    if (modal) modal.classList.add('hidden');
  }

  findPath(startId, endId) {
    if (startId === endId) return [startId];
    const queue = [[startId]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      const neighbors = [];
      this.connections.forEach((c) => {
        if (c.from === current && !visited.has(c.to)) neighbors.push(c.to);
        if (c.to === current && !visited.has(c.from)) neighbors.push(c.from);
      });

      for (const next of neighbors) {
        if (next === endId) return [...path, next];
        visited.add(next);
        queue.push([...path, next]);
      }
    }
    return [startId, endId];
  }

  getBezierCurve(fromNode, toNode) {
    const isForward = this.connections.some((c) => c.from === fromNode.id && c.to === toNode.id);
    const n1 = isForward ? fromNode : toNode;
    const n2 = isForward ? toNode : fromNode;

    const x1 = n1.x;
    const y1 = n1.y;
    const x2 = n2.x;
    const y2 = n2.y;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const cx1 = x1 + dx * 0.45;
    const cy1 = y1 + (Math.abs(dx) > Math.abs(dy) ? -4 : 4);
    const cx2 = x2 - dx * 0.45;
    const cy2 = y2 + (Math.abs(dx) > Math.abs(dy) ? 4 : -4);

    if (isForward) {
      return {
        p0: { x: x1, y: y1 },
        p1: { x: cx1, y: cy1 },
        p2: { x: cx2, y: cy2 },
        p3: { x: x2, y: y2 }
      };
    } else {
      return {
        p0: { x: x2, y: y2 },
        p1: { x: cx2, y: cy2 },
        p2: { x: cx1, y: cy1 },
        p3: { x: x1, y: y1 }
      };
    }
  }

  getCubicBezierPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;

    const x = mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x;
    const y = mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y;

    const dx = 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x);
    const dy = 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y);

    return { x, y, dx, dy };
  }

  spawnMapWake(x, y) {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;

    const wake = document.createElement('div');
    wake.className = 'map-wake-drop';
    wake.style.left = `${x}%`;
    wake.style.top = `${y}%`;
    canvas.appendChild(wake);
    setTimeout(() => {
      if (wake.parentNode) wake.parentNode.removeChild(wake);
    }, 750);
  }

  sailAlongRoute(fromId, toId, onComplete = null) {
    if (this.currentAnimationId) {
      cancelAnimationFrame(this.currentAnimationId);
      this.currentAnimationId = null;
    }

    const path = this.findPath(fromId, toId);
    if (path.length <= 1) {
      this.currentNodeId = toId;
      this.updateBoatPawnPosition();
      if (onComplete) onComplete();
      return;
    }

    const pawn = document.getElementById('map-boat-pawn');
    if (!pawn) {
      this.currentNodeId = toId;
      if (onComplete) onComplete();
      return;
    }

    pawn.style.transition = 'none';
    this.isSailing = true;

    let currentSegmentIndex = 0;

    const runSegment = () => {
      if (currentSegmentIndex >= path.length - 1) {
        this.isSailing = false;
        this.currentNodeId = toId;
        this.saveProgress();
        this.updateBoatPawnPosition();
        if (onComplete) onComplete();
        return;
      }

      const segStartId = path[currentSegmentIndex];
      const segEndId = path[currentSegmentIndex + 1];
      const segStartNode = this.nodes.find((n) => n.id === segStartId);
      const segEndNode = this.nodes.find((n) => n.id === segEndId);

      if (!segStartNode || !segEndNode) {
        currentSegmentIndex++;
        runSegment();
        return;
      }

      const curve = this.getBezierCurve(segStartNode, segEndNode);
      const segmentDuration = 520;
      let startTime = null;
      let lastWakeTime = 0;
      let lastChugTime = 0;

      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const t = Math.min(1.0, elapsed / segmentDuration);

        // Smooth cubic ease-in-out
        const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const pt = this.getCubicBezierPoint(curve.p0, curve.p1, curve.p2, curve.p3, easeT);
        pawn.style.left = `${pt.x}%`;
        pawn.style.top = `${pt.y - 4.5}%`;

        // Rolling tilt & direction facing
        const roll = Math.sin(t * Math.PI * 3.5) * 8;
        const flip = pt.dx < 0 ? -1 : 1;
        pawn.style.transform = `translate(-50%, -50%) scaleX(${flip}) rotate(${roll}deg)`;

        // Spurt wake bubbles
        if (timestamp - lastWakeTime > 110) {
          lastWakeTime = timestamp;
          this.spawnMapWake(pt.x, pt.y - 2.5);
        }

        // Chug sound rhythm
        if (timestamp - lastChugTime > 180) {
          lastChugTime = timestamp;
          sounds.playPawnChug();
        }

        if (t < 1.0) {
          this.currentAnimationId = requestAnimationFrame(step);
        } else {
          currentSegmentIndex++;
          this.currentAnimationId = null;
          runSegment();
        }
      };

      this.currentAnimationId = requestAnimationFrame(step);
    };

    runSegment();
  }

  sailFlourish(onDone = null) {
    const pawn = document.getElementById('map-boat-pawn');
    if (!pawn) {
      if (onDone) onDone();
      return;
    }

    pawn.classList.add('sailing-flourish');
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const node = this.nodes.find((n) => n.id === this.currentNodeId);
        if (node) {
          this.spawnMapWake(node.x, node.y - 2.5);
        }
        sounds.playPawnChug();
      }, i * 90);
    }

    setTimeout(() => {
      pawn.classList.remove('sailing-flourish');
      if (onDone) onDone();
    }, 450);
  }

  updateBoatPawnPosition() {
    const pawn = document.getElementById('map-boat-pawn');
    if (!pawn) return;

    const node = this.nodes.find((n) => n.id === this.currentNodeId) || this.nodes[0];
    pawn.style.transition = 'none';
    pawn.style.left = `${node.x}%`;
    pawn.style.top = `${node.y - 4.5}%`;
    pawn.style.transform = `translate(-50%, -50%)`;
  }

  markNodeCompleted(nodeId, stars = 3) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.cleared = true;
      node.stars = Math.max(node.stars || 0, stars);

      // Unlock next nodes along connections
      this.connections.forEach((conn) => {
        if (conn.from === nodeId) {
          const next = this.nodes.find((n) => n.id === conn.to);
          if (next && !next.unlocked) {
            next.unlocked = true;
            sounds.playMapNodeUnlock();
          }
        }
      });

      this.saveProgress();
      this.render();
    }
  }

  show() {
    this.updateStatsBar();
    this.render();
    this.root.classList.remove('hidden');
    sounds.playMapNodeClick();
  }

  hide() {
    this.hideBriefing();
    this.root.classList.add('hidden');
  }
}
