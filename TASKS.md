# Noble Gnomes — Development Task List & Roadmap

Status Legend:
- [ ] Todo
- [/] In Progress
- [x] Completed

---

## 1. Pond & Water
- [x] Initial water surface plane with depth color gradient (turquoise to deep emerald)
- [x] Sub-pixel silky smooth circular ripples evaluated in fragment shader (zero pixelation)
- [x] Correctly oriented V-shaped wake trailing strictly behind boat heading in vertex & fragment shader
- [x] Multi-octave Gerstner (trochoidal) waves with analytical normals matching CPU physics
- [x] Organic wave-interference sunbeam caustics (flowing ribbons of sunlight, no cellular tiling)
- [x] True view-dependent Fresnel transparency & optical depth absorption (alpha 0.24 shallows to 0.50 deep)
- [x] Contoured radial pond basin with smooth vertex colors (golden sand shallows to deep teal silt)
- [x] 130 submerged river stones, sandstone & quartz pebbles visible beneath clear water
- [x] Buoyant wave-riding lily pads with deep submerged stems and blooming lotus flowers
- [x] Refractive acoustic bell shockwaves with delicate crest sparkle
- [x] Lily pad contact foam accounting for V-notch cutouts (zero foam across empty gap)
- [x] Atmospheric low-altitude rolling pond mist layer with golden sunlight scattering

## 2. Algae & Slime Ecosystem
- [x] 3 basic stages: Film, Blob, Expressive Slime Monster
- [x] Organic multi-lobed algae splatters and multi-bubble gelatinous mounds
- [x] Sculpted monster faces: grumpy furrowed brow, glowing cartoon eyes, jagged goop teeth, and jiggling antennae
- [x] Soft noxious yellow-green stink vapor motes rising from algae beds
- [x] Dynamic algae propagation: ballistic glob throwing by monsters and mature blob burping
- [x] Ripple shockwave cleansing & bright jewel bubble pop effects
- [ ] **Further Slime Mechanics & Varieties**:
  - [ ] Boat Slime Debuff: Getting hit directly with a thrown glob slows boat speed until bell rings
  - [ ] Slime varieties: Golden Algae (bonus score/speed buff), Spiky Bramble Slime (needs multiple bell hits)

## 3. Pond Wildlife, Bugs & Insects
- [ ] **Dragonflies**: Stylized iridescent dual-winged dragonflies darting and hovering above lily pads
- [ ] **Water Striders**: Tiny spindly insects skating across the water surface with micro-indentation dimples in the water shader
- [ ] **Fish Boids**: Tiny koi or minnows swimming under the surface in schooling boid formations (using spatial partitioning), scattering when the boat or bell passes
- [ ] **Ambient Motes & Fireflies**: Gentle floating pollen motes and evening glow fireflies drifting over the reeds

## 4. Surrounding Garden Area & Environment
- [x] Perimeter river rocks and sloping silt basin
- [x] Contoured radial pond bowl with vertex color depth gradient
- [x] Basic notched lily pads and cattail clusters
- [ ] **Cozy English Garden Pond Edging**:
  - [ ] Weathered mossy terracotta flowerpots placed near the banks (some cracked with gnomes sheltering inside)
  - [ ] Old wooden dock / miniature toy jetty where your voyage begins
  - [ ] Overhanging garden flora: weeping willow leafy branches dipping into the water, flowering forget-me-nots, and ferns
  - [ ] Sunken garden relics: an old submerged pocket watch, a rusted garden spade, an overturned teacup sanctuary

## 5. Toy Tugboat & Boat Physics
- [x] Basic hull, wheelhouse, smokestack, and bell stand
- [x] Wooden hull plank grooves, dark mahogany gunwale rubbing strake, and deck plank lines
- [x] 4 rubber tire bumpers hanging on rope cords along port and starboard gunwales
- [x] Red & white lifebuoy rings mounted on wheelhouse sides
- [x] Brass bow navigation lantern casting warm golden light forward
- [x] Animated spoked wooden ship's wheel that rotates with steering
- [x] Coiled rope ring on aft deck
- [x] Volumetric-style soft expanding chimney smoke and whistle steam puffs
- [x] Floating buoyancy, steering physics, and chimney smoke puffs
- [x] Stern propeller rotation & animated brass rudder
- [x] Propeller churn foam discs trailing stern
- [x] Toy steam whistle (press <kbd>H</kbd> to toot with dual-tone chime and steam puff)

## 6. Gnomes & Crew Roster
- [x] Detailed Captain Bramble model: multi-tiered lock beard, round bulbous nose, blushing cheeks, floppy hat tip, and boot buckles
- [x] Stranded gnomes with rescue proximity trigger and boarding
- [x] 3 Crew Roles with passive buffs (Pip, Barnaby, Clover)
- [ ] **Character Expression & Crew Interactions**:
  - [ ] Unique 3D props for crew members: Pip holds a brass spyglass, Barnaby holds an oil can/wrench, Clover holds tuning forks
  - [ ] Idle crew routines: scanning the horizon, cheering when bell strikes, waving at floating bugs
  - [ ] Gnome voice chirps / cute vocalizations on rescue and victory
  - [ ] Additional crew member: **Bramble Jr.** or **Fisherman Finley** with a toy magnetic fishing rod to scoop floating debris

## 7. Visual Fidelity, Post-Processing & Atmosphere
- [x] Soft cascaded directional sunlight and sky/ground hemisphere bounce
- [x] ACESFilmic tone mapping and warm golden lighting
- [x] **Tilt-Shift / Depth of Field (DoF)**: Miniature macro lens blur emphasizing the toy "Borrowers" scale
- [x] **Warm Storybook Color Grading & Vignette**: Rich English garden watercolor palette
- [ ] Bloom on water sun glints and gleaming brass bell
- [ ] Dynamic Day-Night / Golden Hour lighting shifts as pond purity improves

