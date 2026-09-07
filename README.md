# Noble Gnomes: Bramble's Tide & The Garden Sanctuaries ⚓🪷

> Pilot a handcrafted toy tugboat as Captain Bramble across forgotten garden waters, strike your resonant brass bell to soothe troubled algae blooms, rescue stranded gnomes, and restore neglected ponds into thriving, cozy wildlife sanctuaries.

---

## 🎮 Features

- **Cozy Nautical Physics**: Responsive rudder steering, buoyant water swells, bow foam churning, and soft volumetric chimney smoke.
- **Acoustic Cleansing**: Strike your resonant brass bell to emit concentric acoustic shockwaves that gently pop algae blooms and clear garden ponds without violence.
- **Stranded Gnome Crew**: Free trapped gnomes (Pip the Lookout, Clover the Bell Tuner, Barnaby the Engineer) from overgrown lily pads and welcome them aboard your aft bench.
- **The Bog Behemoth**: Awaken the slumbering guardian of the fens in a multi-phase boss encounter requiring coordinated squad chime attacks and Big Bell strikes.
- **Tome of the Lilypad (Roguelite Draft)**: Level up by scooping scum and composting at Port Bramble Pier to draft arcane gnome spells (Steam Surge, Verdant Flare, Resonant Harmonic, Tidal Whirlpool, Chrono Chime) and passive boat boons.
- **Barnaby's Tinkering Shed**: Spend reclaimed salvage debris (driftwood, corks, message bottles) on hull plating, boiler compression, and resonant brass rim tuning.
- **Storybook Aesthetics**: Low-poly handcrafted diorama styling, procedural dynamic skybox, mist, rain weather states, and Web Audio synthesized soundscapes.

---

## 🕹️ Controls

| Action | Primary Key | Secondary / Controller |
| :--- | :--- | :--- |
| **Steer & Throttle** | <kbd>W</kbd> / <kbd>S</kbd> or <kbd>↑</kbd> / <kbd>↓</kbd> | Rudder / Engine |
| **Turn Rudder** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Port / Starboard |
| **Strike Brass Bell** | <kbd>Space</kbd> | Bell Cleansing Shockwave |
| **Big Bell Hit (Squad Special)** | <kbd>E</kbd> (or <kbd>Space</kbd> + <kbd>C</kbd>) | 22m Colossal Shockwave |
| **Scrub Hull Algae** | <kbd>C</kbd> | Manual Scrubbing |
| **Toot Steam Whistle** | <kbd>H</kbd> | Whistle Chime |
| **Cast Wizard Spells** | <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>, <kbd>4</kbd> | Equipped Spell Slots |
| **Camera Orbit** | Left Click + Drag | Rotate View |
| **Camera Zoom** | Mouse Wheel | Zoom In / Out |

---

## 🛠️ Tech Stack

- **Engine**: [Three.js](https://threejs.org/) (r185+)
- **Build Tool**: [Vite](https://vite.dev/)
- **Audio**: Web Audio API (100% procedural synthesized audio)
- **Deployment**: Cloudflare Pages / Static CDN

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation
```bash
# Clone the repository
git clone https://github.com/psypher5/noble-gnomes.git

# Navigate into project directory
cd noble-gnomes

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build
```bash
# Build optimized static bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

---

## 📜 Credits

- **Game Design & Direction**: Tom Woodward (Psypher5)
- **Programming & Architecture**: Gemini 3.8
