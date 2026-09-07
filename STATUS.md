# Noble Gnomes: Pond Patrol — Project Status & Session Log

**Current Date / Timestamp**: September 5, 2026  
**Version**: `0.3.0` (Alpha Prototype)  
**Live LAN URL (Chromebook)**: [`http://192.168.1.225:5174/`](http://192.168.1.225:5174/)  
**Localhost URL**: [`http://localhost:5174/`](http://localhost:5174/)  
**Engine & Tech**: Three.js r182, WebGL custom GLSL shaders, Web Audio API, Vite 6  

---

## 🎮 Controls Reference

| Action | Primary Key | Secondary / Mobile | Behavior |
| :--- | :--- | :--- | :--- |
| **Drive Forward** | <kbd>W</kbd> | <kbd>▲ Up Arrow</kbd> | Propels the tugboat forward into the pond (away from camera) |
| **Reverse / Brake**| <kbd>S</kbd> | <kbd>▼ Down Arrow</kbd> | Reverses the tugboat backwards |
| **Steer Left** | <kbd>A</kbd> | <kbd>◄ Left Arrow</kbd> | Steers the tugboat to port (left) |
| **Steer Right** | <kbd>D</kbd> | <kbd>► Right Arrow</kbd> | Steers the tugboat to starboard (right) |
| **Strike Bell** | <kbd>Space</kbd> | **Ring Bell Button** / Click Water | Swings hammer, rings resonant brass bell, emits cleansing acoustic shockwave |
| **Toot Whistle** | <kbd>H</kbd> | — | Dual-tone brass steam whistle with chimney steam puffs |
| **Mute Audio** | Audio Button | — | Toggles synthesizer engine putter and chimes |

---

## ✅ Completed Features & Polish

### 1. Water & Underwater Environment
- **Multi-Octave Gerstner Waves**: 3 interacting wave octaves with sharp peaked crests, rounded troughs, and analytical surface normals. CPU height matching allows boat and lily pads to float synchronously.
- **True Optical Transparency & Depth**: Inverted depth factor fixed; steep view angles drop to `0.24` alpha in shallows and `0.50` in deep water. Submerged boat hull, propeller, rudder, lily pad stems, and river pebbles are clearly visible beneath the surface.
- **Wave-Interference Caustics**: Smooth, undulating ribbons of golden sunlight (`#fff8de`) dance through the water, with zero polygonal Voronoi tiling.
- **Contoured Radial Basin**: Seamless 30-ring contoured pond bowl with a per-vertex color gradient from sunlit golden sand (`#8a8a65`) in the shallows to deep teal silt (`#384a3c`) in the center.
- **130 Submerged River Stones**: Granite, sandstone, and quartz pebbles resting securely on the silt bed beneath wave troughs.
- **Lily Pad V-Notch Foam Fix**: Polar angle evaluated in the fragment shader; contact foam hugs the leaf perimeter and cleanly tapers off at the V-notch cut, completely suppressing foam across the open-water cutout gap (no white circles bridging across the notch).
- **Localized Bell Acoustic Ripples & Lily Pad Push**:
  - Initial bell shockwave starts small and compact (radius `10.5m`, speed `13.0m/s`) requiring closer tactical positioning before rescuing Pip (+30% bonus).
  - Passing shockwave physically pushes lily pads outward, tilting them with wave crest angles and vertical heave, before resting springs return them to anchor.
- **Soft Diffused Boat Wake & Physics Wobble**:
  - Replaced long solid white wake line with a soft, feathering froth wake that naturally broadens, breaks up with procedural noise, and dissipates rapidly within 7.5m.
  - Active boat wake dynamically rocks and rolls lily pads side to side, while causing nearby slimes and monsters to jiggle and wobble like jello.
- **Atmospheric Low-Altitude Pond Mist**: Soft, rolling horizontal mist blanket hovering 0.38m above the water with sun backscattering.

### 2. Algae & Slime Ecosystem
- **Organic Droplet Sculpting**: Replaced faceted low-poly spheres with procedurally sculpted fluid droplet geometry (`createOrganicDropletGeometry`) featuring natural surface tension pooling, smooth vertex normals, high gloss (`roughness: 0.14`), translucent subsurface scattering (`emissiveIntensity: 0.48`), and harmonic squish-and-stretch breathing.
- **Under-Blob Surface Scum Films**: Stage 1 films, Stage 2 Blobs, and Stage 3 Monsters all sit in organic multi-lobed scum film beds with satellite puddle droplets floating flush with the water surface.
- **Surface Film Bubble System**: Film beds continuously spawn rising, wobbling fluid bubbles. Normal bubbles burst with micro-splatters and procedural soft bubble pops (`playSoftBubblePop()`).
- **Autonomous Bubble Propagation Lifecycle**: Fertile spore bubbles swell, detach, and plop down onto the pond surface, hatching into new Stage 1 films which feed on sunlight and grow into Stage 2 Blobs, which eventually mature into Stage 3 Monsters.
- **Ballistic Glob Throwing**: Mature monsters wind up and hurl projectile globs across the pond to plant new algae colonies.
- **Noxious Stink Vapors**: Soft chartreuse vapor plumes continuously drift upwards from active algae beds.
- **Acoustic Cleansing**: Bell acoustic shockwaves dissolve slime colonies into floating jewel bubbles.

### 3. Toy Tugboat & Physics
- **Wooden Hull Detailing**: Carved deck plank lines, dark mahogany gunwale rubbing strake, and transom rivet studs.
- **Rubber Tire Bumpers**: 4 miniature rubber tire bumpers hanging on rope cords along port and starboard gunwales.
- **Wheelhouse & Cabin**: Red-and-white lifebuoys mounted on cabin walls, bow post with brass navigation lantern casting a warm golden spotlight forward, and an animated spoked wooden ship's wheel that visibly rotates with steering.
- **Aft Deck**: Coiled hemp rope ring and cleat fittings.
- **Volumetric 3D Tactile Chimney Steam**: Multi-sphere 3D cluster steam puffs with smooth normals, bright emissive translucency, and warm sun catching. Rhythmic chug emission emerging right from the smokestack opening (0.26s idling, 0.11s cruising) with natural velocity inheritance, billowy expansion, and gentle dissipation. Whistle blasts on bell strikes.
- **Stern Dynamics**: Animated brass rudder, 3-bladed brass propeller spinning with speed, and propeller churn foam trailing behind.
- **Buoyancy & Wave Pitching**: Bow and stern sample wave heights to dynamically pitch and roll over passing swells.

### 4. Port Bramble Pier & Garden Perimeter
- **Port Bramble Wooden Pier**: Rustic timber jetty with deep-set pilings, transverse oak deck planks, mooring bollards with coiled rope rings, carved signpost with rescue life ring, and a glowing brass nautical lantern on a tall wooden post casting warm golden light onto the planks and water.
- **Starting Berth & Mooring**: Tugboat begins docked alongside the pier head at `(x = 3.2, z = 30.5)` facing North into the pond (`heading = π`). Floating pulsating mooring beacon guides players back.
- **Gnome Offloading Loop**: Navigating back to the dock with rescued gnomes offloads them safely onto the pier planks, where they turn to the water, hopping and celebrating their homecoming with celebratory fanfare.
- **High-Detail Perimeter Garden Banks**:
  - 22 weeping willows with cascading tendril fronds and English garden oak trees with multi-tiered cloud canopies, swaying gently in the breeze.
  - 52 wildflower patches hugging the shoreline: bright buttercups (`#ffd000`), sky-blue bluebells (`#38bdf8`), garden daisies (`#ffffff` petals with `#f59e0b` eye), and pastel pink mallows (`#f472b6`).
  - 56 stylized grass blade clumps and moss pads lining the water's edge.
  - 20 multi-stone boulder formations with velvet moss caps.
- **Eye-Friendly Tilt-Shift Post-Processing**:
  - In-focus diorama band widened to 0.56 (covering 60% of the screen).
  - Blur intensity reduced from 1.2 to 0.42 with sample spread lowered to 2.2 texels and smooth gradient falloff, completely eliminating eye strain and harsh halos while maintaining miniature diorama charm.

### 5. Garden Gnomes & Crew
- **Captain Bramble**: Multi-tiered fluffy white beard with curly lock strands, prominent round bulbous nose with rosy blushing cheeks, floppy pointed felt hat with a bobbing tip, chunky boots with golden buckle plates, and seam-stitched smock.
- **Stranded Crew Members on Infested Lily Pads**: Pip (Lookout), Barnaby (Engineer), and Clover (Bell Tuner) are situated on dedicated buoyant lily pads around the pond.
- **Algae Entrapment & 2-Strike Cleansing**:
  - Each rescue pad is covered in a slimy, bubbling toxic algae crust (`LilyPadAlgae`) with a central entrapment mound, satellite blisters, noxious stink vapors, and an amber distress beacon.
  - Trapped gnomes struggle and wave both arms frantically for help; the tugboat cannot pick them up while mired in algae (proximity triggers a HUD guidance prompt).
  - Bell acoustic shockwaves hit the algae: Strike 1 cracks and shrinks the goop by 40% with splatter bursts; Strike 2 shatters the algae into sparkling jewel bubbles, restores the clean green lily pad, turns the beacon golden, and prompts the gnome into a cheerful celebration dance.
- **Rescue Boarding & Crew Buffs**: Steering close (< 3.8m) to a freed gnome welcomes them aboard the deck to grant passive perks (+30% bell ripple radius, +35% engine speed, -40% bell cooldown).

### 6. Sound Synthesizer (Zero External Audio Assets)
- Procedural Web Audio API engine: multi-harmonic brass bell strike with resonant overtones, engine putter with speed throttling, steam whistle chime, squishy slime splats, gooey projectile throws, and bubble pops.

---

## 📋 Next Session Roadmap & Backlog

When you return, here are the ready-to-tackle features prioritized by impact:

### Priority 1: Pond Wildlife, Bugs & Insects
- [ ] **Dragonflies**: Iridescent dual-winged dragonflies darting and hovering above lily pads.
- [ ] **Water Striders**: Tiny spindly insects skating across the water surface with micro-dimple water surface indentation.
- [ ] **Fish Boids**: Tiny koi or minnows swimming under the clear surface in schooling formations, scattering when the boat or bell passes.
- [ ] **Pollen Motes & Fireflies**: Floating warm evening motes drifting over the perimeter reeds.

### Priority 2: Slime Gameplay Depth
- [ ] **Boat Slime Splatter Debuff**: Getting hit directly by a thrown slime glob splatters green goop on the screen/windshield and temporarily slows the boat until washed off with the bell.
- [ ] **Slime Varieties**: Golden Algae (bonus score/speed buff) and Spiky Bramble Slime (requires multiple bell hits).

### Priority 3: Surrounding Garden Area & Environment
- [ ] **Terracotta Flowerpots**: Weathered mossy flowerpots along the perimeter bank (some cracked with gnomes sheltering inside).
- [x] **Miniature Wooden Dock**: Port Bramble Pier complete with starting berth, lantern post, and gnome drop-off.
- [ ] **Sunken Garden Relics**: Overturned porcelain teacup sanctuary, submerged pocket watch, and rusted garden spade on the pond floor.
- [ ] **Sunken Garden Relics**: Overturned porcelain teacup sanctuary, submerged pocket watch, and rusted garden spade on the pond floor.

### Priority 4: Gnome Expressions & Voice Chirps
- [ ] **Unique Crew Handheld Props**: Pip with a brass spyglass, Barnaby with an oil can/wrench, Clover with tuning forks.
- [ ] **Cute Gnome Voice Chirps**: Procedural squeaks/chirps on rescue and bell strikes.

---

## 🛠️ Build & Dev Commands

To resume development or test:
```bash
cd c:/Projects/01_Game_Development/NobleGnomes

# Rebuild project bundle
npm run build

# Preview on LAN (port 5174)
npx vite preview --host 0.0.0.0 --port 5174
```
