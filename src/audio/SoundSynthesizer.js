import { ProceduralMusicSystem } from './ProceduralMusicSystem.js';

/**
 * Procedural audio synthesizer using Web Audio API.
 * Generates rich acoustic bell chimes, liquid splashes, bubble pops, and engine putters without external assets.
 */
export class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.engineOsc = null;
    this.engineLfo = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.isEngineRunning = false;

    // Musical bell chime parameters
    this.bellNoteIndex = 0;
    this.lastBellTime = 0;
    this.masterCompressor = null;
    this.masterGain = null;

    // Procedural Music Engine (Liquid DnB to Speedbass)
    this.music = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Warm master limiter compressor to prevent distortion or clipping on rapid sound spam
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.masterCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.20, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.masterCompressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Initialize Procedural Music feeding into master compressor
      this.music = new ProceduralMusicSystem(this.ctx, this.masterCompressor);
      if (!this.isMuted) {
        this.music.start();
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.isEngineRunning) this.stopEngine();
      if (this.music) this.music.stop();
    } else {
      if (this.music) this.music.start();
    }
    return this.isMuted;
  }

  /**
   * Warm, melodic ship's brass bell chime.
   * Features:
   * - Consonant, warm harmonic overtone series (hum, fundamental, major third, fifth, octave)
   * - Biquad low-pass filter to eliminate harsh, tinny, piercing high frequencies
   * - Soft rounded felt/wood mallet transient instead of harsh abrasive triangle clicks
   * - Harmonious pentatonic scale cycling on rapid strikes (G4 -> A4 -> B4 -> D5 -> E5)
   *   so spamming creates an enchanting, relaxing garden chime melody instead of an annoying alarm!
   */
  playBellStrike(power = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Harmonious pentatonic scale progression when ringing in succession
    // G4 (392Hz), A4 (440Hz), B4 (493.88Hz), D5 (587.33Hz), E5 (659.25Hz)
    const scale = [392.00, 440.00, 493.88, 587.33, 523.25];
    if (t - this.lastBellTime < 1.35) {
      this.bellNoteIndex = (this.bellNoteIndex + 1) % scale.length;
    } else {
      this.bellNoteIndex = 0;
    }
    this.lastBellTime = t;

    const baseFreq = scale[this.bellNoteIndex];

    // 1. Warm Acoustic Low-Pass Filter (strips all harsh glass/tin scratchiness)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(1150, t + 0.9);
    filter.Q.setValueAtTime(1.6, t);

    // 2. Bell output gain stage with comfortable headroom
    const bellGain = this.ctx.createGain();
    bellGain.gain.setValueAtTime(0.28 * power, t);
    filter.connect(bellGain);
    bellGain.connect(this.masterCompressor || this.ctx.destination);

    // 3. Warm consonant harmonic partials
    const partials = [
      { ratio: 0.5, gain: 0.22, decay: 2.4 },   // Deep warm sub hum
      { ratio: 1.0, gain: 0.85, decay: 2.6 },   // Warm singing fundamental
      { ratio: 1.004, gain: 0.42, decay: 2.1 }, // Lush acoustic chorus beating
      { ratio: 1.25, gain: 0.30, decay: 1.6 },  // Sweet consonant major third
      { ratio: 1.5, gain: 0.26, decay: 1.4 },   // Singing fifth
      { ratio: 2.0, gain: 0.16, decay: 1.0 },   // Clean soft octave
      { ratio: 2.5, gain: 0.05, decay: 0.6 }    // Subtle silky chime shimmer
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * p.ratio, t);

      // Fast, click-free attack + smooth natural exponential decay
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(p.gain, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(t);
      osc.stop(t + p.decay);
    });

    // 4. Soft Rounded Felt/Wood Mallet Transient (replaces abrasive 120Hz triangle click)
    const malletOsc = this.ctx.createOscillator();
    const malletGain = this.ctx.createGain();
    malletOsc.type = 'sine';
    malletOsc.frequency.setValueAtTime(240, t);
    malletOsc.frequency.exponentialRampToValueAtTime(75, t + 0.045);

    malletGain.gain.setValueAtTime(0.0001, t);
    malletGain.gain.linearRampToValueAtTime(0.12 * power, t + 0.004);
    malletGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

    malletOsc.connect(malletGain);
    malletGain.connect(filter);
    malletOsc.start(t);
    malletOsc.stop(t + 0.045);
  }

  /**
   * Colossal "Big Bell Hit" Squad Resonant Gong Strike.
   * Authentic, thunderous, shimmering bronze temple gong / orchestral Chau gong.
   * Features:
   * - Punchy, clearly audible 110Hz & 147Hz acoustic bronze fundamentals (crisp on laptops and desktop speakers)
   * - Inharmonic metallic partial series replicating a 36-inch hand-hammered bronze gong dish
   * - Acoustic tremolo / vibrato LFO modulation (3.2Hz) producing the iconic undulating metal shimmer
   * - Heavy padded wooden mallet strike transient with crisp metallic attack
   * - 5.5s reverberant decay that reverberates across the entire pond
   */
  playBigBellHit(power = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseFreq = 110.0; // Audible A2 bronze gong foundation (clear on all speakers)

    // 1. Resonant Master Biquad Lowpass Filter with gentle high-end roll-off
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.exponentialRampToValueAtTime(340, t + 4.8);
    filter.Q.setValueAtTime(2.2, t);

    // 2. Tremolo / Acoustic Plate Modulation: creates undulating metallic gong shimmer
    const tremoloOsc = this.ctx.createOscillator();
    tremoloOsc.type = 'sine';
    tremoloOsc.frequency.setValueAtTime(3.2, t); // 3.2Hz slow beating
    // (tremoloGain was orphaned — tremolo connects directly to filterTremoloGain below)

    // 3. Master Gong Gain — reduced from 0.68 to avoid digital clipping on loud hits
    const gongMasterGain = this.ctx.createGain();
    gongMasterGain.gain.setValueAtTime(0.42 * power, t);

    filter.connect(gongMasterGain);
    gongMasterGain.connect(this.masterCompressor || this.ctx.destination);

    // Connect tremolo to filter frequency for breathing shimmer
    const filterTremoloGain = this.ctx.createGain();
    filterTremoloGain.gain.setValueAtTime(140, t);
    filterTremoloGain.gain.exponentialRampToValueAtTime(10, t + 4.0);
    tremoloOsc.connect(filterTremoloGain);
    filterTremoloGain.connect(filter.frequency);

    // 4. Inharmonic Bronze Gong Harmonic Spectrum (classic Chau Gong / Tam-Tam ratios)
    const partials = [
      { ratio: 0.50, gain: 0.70, decay: 5.5, type: 'sine' },      // 55Hz Sub foundation
      { ratio: 0.667, gain: 0.75, decay: 5.2, type: 'sine' },     // 73.4Hz Deep bronze belly
      { ratio: 1.00, gain: 1.00, decay: 5.0, type: 'triangle' },  // 110Hz Bronze fundamental
      { ratio: 1.006, gain: 0.85, decay: 4.8, type: 'sine' },     // Detuned chorus beating
      { ratio: 1.336, gain: 0.65, decay: 4.2, type: 'triangle' }, // 147Hz Metallic fourth
      { ratio: 1.685, gain: 0.50, decay: 3.8, type: 'sine' },     // 185Hz Inharmonic bell tone
      { ratio: 2.144, gain: 0.38, decay: 3.2, type: 'triangle' }, // 236Hz Rim resonance
      { ratio: 2.762, gain: 0.28, decay: 2.6, type: 'sine' },     // 304Hz Shimmer overtone
      { ratio: 3.488, gain: 0.20, decay: 2.0, type: 'triangle' }, // 384Hz High bronze sheen
      { ratio: 4.415, gain: 0.14, decay: 1.5, type: 'sine' }      // 485Hz Brilliant sparkle
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = p.type;
      osc.frequency.setValueAtTime(baseFreq * p.ratio, t);

      // Attack: fast rising bloom (not instant click)
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(p.gain * 0.45, t + 0.024);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(t);
      osc.stop(t + p.decay + 0.1);
    });

    tremoloOsc.start(t);
    tremoloOsc.stop(t + 5.5);

    // 5. Heavy Padded Wooden Mallet Strike Impact
    // Low thud (220Hz -> 65Hz) combined with metallic strike ping
    const malletOsc = this.ctx.createOscillator();
    const malletGain = this.ctx.createGain();
    malletOsc.type = 'triangle';
    malletOsc.frequency.setValueAtTime(220, t);
    malletOsc.frequency.exponentialRampToValueAtTime(65, t + 0.16);

    malletGain.gain.setValueAtTime(0.0001, t);
    malletGain.gain.linearRampToValueAtTime(0.40 * power, t + 0.008);
    malletGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);

    malletOsc.connect(malletGain);
    malletGain.connect(filter);
    malletOsc.start(t);
    malletOsc.stop(t + 0.22);

    // Initial metallic strike crash burst (filtered noise)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(580, t);
    noiseFilter.Q.setValueAtTime(3.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28 * power, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(gongMasterGain);
    noiseSource.start(t);
    noiseSource.stop(t + 0.13);
  }

  /**
   * Cheerful bubble pop sound when algae dissolves
   */
  playBubblePop(pitch = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = (380 + Math.random() * 150) * pitch;
    const endFreq = (750 + Math.random() * 250) * pitch;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.09);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Soft ambient bubble pop for surface film bubbles
   */
  playSoftBubblePop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = 620 + Math.random() * 250;
    const endFreq = 1100 + Math.random() * 350;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.045);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.045);
  }

  /**
   * Squishy splat sound for slime blob impact
   */
  playSlimeSplat() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(180, t + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Gooey fling / whip sound when monster or blob launches a glob
   */
  playSlimeThrow() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(460, t + 0.14);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Uplifting gnome rescue jingle
   */
  playGnomeRescue() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.35);
    });
  }

  /**
   * Soft engine putter loop for toy tugboat
   */
  startEngine() {
    if (this.isEngineRunning || this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      this.engineOsc = this.ctx.createOscillator();
      this.engineLfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      // Warm acoustic low-pass filter: removes harsh electrical triangle buzz/hum
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(260, t);
      this.engineFilter.Q.setValueAtTime(1.1, t);

      // Low wooden/brass steam chug fundamental (48Hz idle)
      this.engineOsc.type = 'triangle';
      this.engineOsc.frequency.setValueAtTime(48, t);

      // Rhythm modulation: gentle 3.8Hz steam chug
      this.engineLfo.frequency.setValueAtTime(3.8, t);
      lfoGain.gain.setValueAtTime(14, t);
      this.engineLfo.connect(this.engineOsc.frequency);

      // Start silent (gain = 0.0001); volume ramps up only when boat actively moves
      this.engineGain.gain.setValueAtTime(0.0001, t);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterCompressor || this.ctx.destination);

      this.engineLfo.start(t);
      this.engineOsc.start(t);
      this.isEngineRunning = true;
    } catch (e) {
      console.warn('Audio engine start failed:', e);
    }
  }

  stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      const t = this.ctx ? this.ctx.currentTime : 0;
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0.0001, t, 0.08);
      }
      const osc = this.engineOsc;
      const lfo = this.engineLfo;
      this.engineOsc = null;
      this.engineLfo = null;
      this.isEngineRunning = false;

      setTimeout(() => {
        try {
          if (osc) { osc.stop(); osc.disconnect(); }
          if (lfo) { lfo.stop(); lfo.disconnect(); }
        } catch (e) {}
      }, 120);
    } catch (e) {
      this.isEngineRunning = false;
    }
  }

  updateEngineSpeed(speedRatio, isThrottling = false, algaeFouledRatio = 0) {
    if (this.isMuted) {
      if (this.isEngineRunning) this.stopEngine();
      return;
    }

    // If boat is stopped/stationary and not throttling, silence the engine
    if (speedRatio < 0.04 && !isThrottling) {
      if (this.isEngineRunning && this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      }
      return;
    }

    // Lazily start engine sound only when the tugboat is underway
    if (!this.isEngineRunning) {
      this.startEngine();
      if (!this.isEngineRunning) return;
    }

    if (!this.ctx || !this.engineOsc || !this.engineGain) return;

    const t = this.ctx.currentTime;
    const bogFactor = Math.max(0.7, 1.0 - algaeFouledRatio * 0.3);
    const clampedSpeed = Math.min(1.0, Math.max(0.0, speedRatio));

    // Dynamic pitch: 48Hz slow chug to 74Hz cruising putter
    const targetPitch = (48 + clampedSpeed * 26) * bogFactor;
    this.engineOsc.frequency.setTargetAtTime(targetPitch, t, 0.12);

    // Dynamic rhythm: 3.8Hz to 6.8Hz chug rate
    if (this.engineLfo) {
      const targetLfo = 3.8 + clampedSpeed * 3.0;
      this.engineLfo.frequency.setTargetAtTime(targetLfo, t, 0.12);
    }

    // Filter frequency opens slightly as boat accelerates
    if (this.engineFilter) {
      this.engineFilter.frequency.setTargetAtTime(240 + clampedSpeed * 110, t, 0.15);
    }

    // Gentle cozy volume: 0 when stopped, scaling up to ~0.022 when moving
    const targetGain = isThrottling
      ? Math.max(0.010, clampedSpeed * 0.022)
      : clampedSpeed * 0.018;
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.12);
  }

  /**
   * Toy steam tugboat whistle (dual-tone nostalgic toot)
   */
  playWhistle() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [660, 880]; // E5, A5 dual chime

    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      // Slight steam vibrato
      const vibrato = this.ctx.createOscillator();
      const vibGain = this.ctx.createGain();
      vibrato.frequency.setValueAtTime(6.0, t);
      vibGain.gain.setValueAtTime(8.0, t);
      vibrato.connect(osc.frequency);
      vibrato.start(t);
      vibrato.stop(t + 0.65);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  playWhistleToot() {
    this.playWhistle();
  }

  /**
   * Miniature steam engine chug-puff sound for map navigation
   */
  playPawnChug() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110 + Math.random() * 20, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Refreshing water washdown & sparkling scrub sound when cleaning the boat
   */
  playWaterCleanse() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Rushing water spray (filtered white noise sweep)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.55);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(2800, t + 0.35);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.55);
    filter.Q.setValueAtTime(3.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(0.22, t + 0.08);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterCompressor || this.ctx.destination);

    whiteNoise.start(t);
    whiteNoise.stop(t + 0.55);

    // 2. Sparkling crystalline bubble sweep (3 cheerful ascending notes: E5 -> G5 -> C6)
    const sparkleNotes = [659.25, 783.99, 1046.50];
    sparkleNotes.forEach((freq, idx) => {
      const noteTime = t + 0.08 + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, noteTime + 0.18);

      gain.gain.setValueAtTime(0.12, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

      osc.connect(gain);
      gain.connect(this.masterCompressor || this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.18);
    });
  }

  /**
   * Heavy, wet goop splat sound when algae hits the boat hull
   */
  playAlgaeSplattered() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Deep squishy thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.22);

    gain.gain.setValueAtTime(0.20, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.linearRampToValueAtTime(120, t + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);

    // Wet slap noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(500, t);
    noiseFilter.Q.setValueAtTime(2.0, t);

    const slapGain = this.ctx.createGain();
    slapGain.gain.setValueAtTime(0.18, t);
    slapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(noiseFilter);
    noiseFilter.connect(slapGain);
    slapGain.connect(this.masterCompressor || this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.12);
  }

  /**
   * Heavy stone heave / windup whoosh when Bog Behemoth hurls a boulder
   */
  playRockThrow() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Guttural monster roar / rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.38);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.38);

    // Stone whoosh through air
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.28);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(350, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(950, t + 0.15);
    noiseFilter.frequency.exponentialRampToValueAtTime(250, t + 0.28);
    noiseFilter.Q.setValueAtTime(2.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterCompressor || this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.28);
  }

  /**
   * Resonant water crash and stone impact
   */
  playRockCrash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Heavy low sub impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.35);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);

    // High energy explosive water crash splash
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1600, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(300, t + 0.45);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.30, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterCompressor || this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.45);
  }

  /**
   * Crunchy wooden hull splintering and distress thud
   */
  playHullDamage() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Wooden stress groan
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.28);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t);
    filter.Q.setValueAtTime(1.8, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.28);
  }

  /**
   * Cheerful salvage clink and repair hammer chime
   */
  playTrashCollect() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Metallic gear clink (two high sine pings)
    const freqs = [880, 1318.5]; // A5, E6
    freqs.forEach((f, idx) => {
      const pingTime = t + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, pingTime);

      gain.gain.setValueAtTime(0.22, pingTime);
      gain.gain.exponentialRampToValueAtTime(0.001, pingTime + 0.22);

      osc.connect(gain);
      gain.connect(this.masterCompressor || this.ctx.destination);

      osc.start(pingTime);
      osc.stop(pingTime + 0.22);
    });

    // Warm wooden tap
    const tapOsc = this.ctx.createOscillator();
    const tapGain = this.ctx.createGain();
    tapOsc.type = 'triangle';
    tapOsc.frequency.setValueAtTime(320, t);
    tapOsc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

    tapGain.gain.setValueAtTime(0.18, t);
    tapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    tapOsc.connect(tapGain);
    tapGain.connect(this.masterCompressor || this.ctx.destination);

    tapOsc.start(t);
    tapOsc.stop(t + 0.08);
  }

  /**
   * Dramatic creaking wood and steam hiss when boat capsizes
   */
  playCapsizeGroan() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Low wooden structural failure creak
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.linearRampToValueAtTime(35, t + 1.2);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 1.2);

    // Violent steam pressure blowout hiss
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2200, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(800, t + 1.5);
    noiseFilter.Q.setValueAtTime(2.2, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(0.32, t + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterCompressor || this.ctx.destination);

    noise.start(t);
    noise.stop(t + 1.5);
  }

  /**
   * Snappy wooden UI button click with soft acoustic marimba resonance
   */
  playButton() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.08);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Massive subterranean ground pound / belly flop water slam
   */
  playGroundPound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Heavy low impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.7);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.75);

    // 2. White noise tidal water splash surge
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(180, t + 0.85);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.42, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterCompressor || this.ctx.destination);

    whiteNoise.start(t);
    whiteNoise.stop(t + 0.9);
  }

  /**
   * Warm wooden marimba click & water pop when selecting map nodes
   */
  playMapNodeClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.12);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Radiant ascending chime flourish when a new map node/branch unlocks
   */
  playMapNodeUnlock() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.masterCompressor || this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.35);
    });
  }

  /**
   * Crisp brass coin clink and anvil hammer ping for shop upgrades
   */
  playShopBuy() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Coin clink ping
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1480, t);
    gain1.gain.setValueAtTime(0.22, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc1.connect(gain1);
    gain1.connect(this.masterCompressor || this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.28);

    // Hammer anvil strike
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, t + 0.04);
    gain2.gain.setValueAtTime(0.25, t + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc2.connect(gain2);
    gain2.connect(this.masterCompressor || this.ctx.destination);
    osc2.start(t + 0.04);
    osc2.stop(t + 0.32);
  }

  /**
   * Cheerful, crisp water droplet / jewel clink when collecting algae scum or pond salvage debris
   */
  playDebrisCollected() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterCompressor || this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Alias for pond salvage debris collection
   */
  playTrashCollect() {
    this.playDebrisCollected();
  }

  /**
   * Heroic, bright brass fanfare for boss damage hits and shield breaks
   */
  playFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [392.00, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);

      // Lowpass filter for warm brass body
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 2.8, noteTime);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.2, noteTime + 0.35);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterCompressor || this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.40);
    });
  }

  /**
   * Grand triumphant victory fanfare for boss defeat and token unlocks
   */
  playTokenFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [
      { notes: [261.63, 329.63, 392.00], duration: 0.16 }, // C maj
      { notes: [293.66, 369.99, 440.00], duration: 0.16 }, // D maj
      { notes: [329.63, 415.30, 493.88], duration: 0.20 }, // E maj
      { notes: [523.25, 659.25, 783.99, 1046.50], duration: 0.70 } // C high grand chord
    ];

    let chordOffset = 0;
    chords.forEach((chord) => {
      const chordStart = t + chordOffset;
      chord.notes.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, chordStart);

        gain.gain.setValueAtTime(0.001, chordStart);
        gain.gain.linearRampToValueAtTime(0.16, chordStart + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStart + chord.duration + 0.25);

        osc.connect(gain);
        gain.connect(this.masterCompressor || this.ctx.destination);

        osc.start(chordStart);
        osc.stop(chordStart + chord.duration + 0.30);
      });
      chordOffset += chord.duration;
    });
  }

  /**
   * Joyful chorus of cheerful gnome cheers and whistle pipes when safely reaching Port Bramble Pier
   */
  playGnomeCheer() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Playful ascending whistle pipe (E5 -> G5 -> C6 -> E6)
    const notes = [659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const noteStart = t + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, noteStart + 0.14);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.22);

      osc.connect(gain);
      gain.connect(this.masterCompressor || this.ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + 0.24);
    });

    // 2. Choral "Hooray!" chord (warm cheerful bell harmonizer)
    const chordTime = t + 0.38;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, chordTime);

      gain.gain.setValueAtTime(0.001, chordTime);
      gain.gain.linearRampToValueAtTime(0.14, chordTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.65);

      osc.connect(gain);
      gain.connect(this.masterCompressor || this.ctx.destination);
      osc.start(chordTime);
      osc.stop(chordTime + 0.68);
    });
  }
}

export const sounds = new SoundSynthesizer();

