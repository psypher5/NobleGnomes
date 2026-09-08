/**
 * ProceduralMusicSystem.js
 * 
 * In-engine procedural music sequencer and synthesizer using Web Audio API.
 * Synthesizes dynamic, reactive music without external audio files:
 * 1. Ambient / Map Mode (168 BPM): Lush liquid pads, deep sub, gentle percussion
 * 2. Liquid DnB Exploration Mode (174 BPM): Rolling breaks, Reese basslines, jazzy Rhodes chords
 * 3. Threat Mode (178 BPM): Driving syncopation, opening filter, rolling percussion fills
 * 4. Mandidextrous Speedbass Mode (188 BPM): 4x4 speedcore/donk kicks, distorted bouncy offbeat bass womps, laser zaps!
 */

export class ProceduralMusicSystem {
  constructor(audioCtx, destinationNode) {
    this.ctx = audioCtx;
    this.dest = destinationNode;

    this.isPlaying = false;
    this.bpm = 174;
    this.targetBpm = 174;
    this.threatLevel = 0.0; // 0.0 (peaceful) -> 1.0 (climax / boss vulnerable)
    this.mode = 'AMBIENT'; // 'AMBIENT', 'LIQUID_DNB', 'THREAT', 'SPEEDBASS'

    // Master Music Bus
    this.musicGain = null;
    this.filterNode = null;

    // Lookahead Scheduler parameters
    this.lookahead = 25.0; // ms between schedule ticks
    this.scheduleAheadTime = 0.1; // seconds to schedule ahead
    this.nextNoteTime = 0.0;
    this.current16thStep = 0;
    this.timerID = null;

    // Harmonic Chord Progressions (Deep atmospheric liquid chords: Fmaj9, Dm9, Am9, Gsus4)
    this.chordProgression = [
      [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9 (dreamy, floating)
      [146.83, 174.61, 220.00, 261.63, 329.63], // Dm9
      [110.00, 164.81, 220.00, 261.63, 329.63], // Am9 (warm, introspective)
      [98.00, 146.83, 196.00, 246.94, 293.66]   // Gsus4 / Gmaj9
    ];
    this.currentBar = 0;

    // Distortion curve for Speedbass overdrive
    this.distortionCurve = this.makeDistortionCurve(18);

    this.initNodes();
  }

  initNodes() {
    if (!this.ctx) return;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.38, this.ctx.currentTime);

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(14000, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(1.0, this.ctx.currentTime);

    this.musicGain.connect(this.filterNode);
    if (this.dest) {
      this.filterNode.connect(this.dest);
    } else {
      this.filterNode.connect(this.ctx.destination);
    }

    // Warm vintage vinyl / water tape noise bed for deep atmospheric depth
    this.initAtmosphericHiss();
  }

  initAtmosphericHiss() {
    if (!this.ctx) return;
    const bufSize = this.ctx.sampleRate * 2.0;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const out = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      out[i] = (Math.random() * 2 - 1) * 0.008;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.015, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start();
  }

  makeDistortionCurve(amount = 20) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  start() {
    if (this.isPlaying || !this.ctx) return;
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.current16thStep = 0;
    this.currentBar = 0;

    this.timerID = setInterval(() => this.scheduler(), this.lookahead);
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
  }

  setVolume(vol) {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.08);
    }
  }

  updateGameState({ gameState, slimeCount = 20, maxSlimes = 20, bossAlive = false, bossShielded = true, bossPhase = 1 }) {
    if (!this.isPlaying) return;

    if (gameState === 'MENU' || gameState === 'MAP') {
      this.mode = 'AMBIENT';
      this.targetBpm = 168;
      this.threatLevel = 0.0;
    } else if (gameState === 'PLAYING') {
      if (bossAlive && !bossShielded) {
        // CLIMAX: Boss shield is down! Full Mandidextrous Speedbass rave!
        this.mode = 'SPEEDBASS';
        this.targetBpm = bossPhase === 3 ? 192 : 186;
        this.threatLevel = 1.0;
      } else if (bossAlive) {
        // Boss fight with active shield
        this.mode = 'THREAT';
        this.targetBpm = 178;
        this.threatLevel = 0.75;
      } else {
        // Standard pond clearing
        const slimeRatio = Math.min(1.0, slimeCount / Math.max(1, maxSlimes));
        if (slimeRatio > 0.6) {
          this.mode = 'THREAT';
          this.targetBpm = 176;
          this.threatLevel = 0.5 + (slimeRatio - 0.6) * 0.5;
        } else {
          this.mode = 'LIQUID_DNB';
          this.targetBpm = 174;
          this.threatLevel = Math.max(0.15, slimeRatio * 0.5);
        }
      }
    } else if (gameState === 'OUTRO') {
      this.mode = 'AMBIENT';
      this.targetBpm = 168;
      this.threatLevel = 0.0;
    }

    // Dynamic BPM ramping (gradual acceleration / deceleration)
    if (Math.abs(this.bpm - this.targetBpm) > 0.1) {
      this.bpm += (this.targetBpm - this.bpm) * 0.04;
    } else {
      this.bpm = this.targetBpm;
    }
  }

  scheduler() {
    if (!this.ctx) return;

    const secondsPer16th = 60.0 / this.bpm / 4.0;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.current16thStep, this.nextNoteTime);
      this.nextNoteTime += secondsPer16th;
      this.current16thStep = (this.current16thStep + 1) % 64; // 4-bar loop of 16ths
      if (this.current16thStep % 16 === 0) {
        this.currentBar = (this.currentBar + 1) % this.chordProgression.length;
      }
    }
  }

  scheduleStep(step, time) {
    const stepInBar = step % 16;
    const isDownbeat = stepInBar === 0;

    // 1. Chords & Atmospheric Pads (sustained every bar)
    if (isDownbeat) {
      this.playChordPad(this.chordProgression[this.currentBar], time, 60.0 / this.bpm * 4.0);
    }

    // 2. Drums & Bass per mode
    if (this.mode === 'SPEEDBASS') {
      this.scheduleSpeedbassStep(stepInBar, time);
    } else if (this.mode === 'THREAT' || this.mode === 'LIQUID_DNB') {
      this.scheduleLiquidDnbStep(stepInBar, time);
    } else {
      this.scheduleAmbientStep(stepInBar, time);
    }
  }

  // --- AMBIENT MODE ---
  scheduleAmbientStep(step, time) {
    // Soft marimba / chime accent on 1 and 9
    if (step === 0 || step === 8) {
      const chord = this.chordProgression[this.currentBar];
      const note = chord[(step === 0 ? 0 : 2) % chord.length] * 2.0;
      this.playMarimbaPing(note, time, 0.12);
    }
    // Very gentle sub foundation on beat 1
    if (step === 0) {
      const rootFreq = this.chordProgression[this.currentBar][0] * 0.5;
      this.playSubBass(rootFreq, time, 60.0 / this.bpm * 3.5, 0.25);
    }
  }

  // --- LIQUID DNB / THREAT MODE ---
  scheduleLiquidDnbStep(step, time) {
    const root = this.chordProgression[this.currentBar][0];

    // 1. Soft rounded Liquid Kick (steps 0, 10)
    if (step === 0 || step === 10) {
      this.playLiquidKick(time, 0.38);
    }

    // 2. Brushed Liquid Snare on beats 4 & 12
    if (step === 4 || step === 12) {
      this.playBrushedSnare(time, 0.35, false);
    }

    // 3. Shuffling Ghost Snares (steps 7, 14, and 15)
    if (step === 7 || step === 14 || step === 15) {
      this.playBrushedSnare(time, 0.12, true);
    }

    // 4. Silky continuous 16th-note Shaker / Ride shuffle
    const isAccent = step % 4 === 2;
    this.playLiquidShaker(time, isAccent ? 0.14 : 0.08, isAccent);

    // 5. Deep Floating Liquid Sub-Glide & Warm Reese
    if (step === 0) {
      this.playDeepLiquidBass(root * 0.5, time, 60.0 / this.bpm * 1.6, 0.28, this.threatLevel);
    } else if (step === 6) {
      this.playDeepLiquidBass(root * 0.56, time, 60.0 / this.bpm * 1.2, 0.26, this.threatLevel);
    } else if (step === 10) {
      this.playDeepLiquidBass(root * 0.5, time, 60.0 / this.bpm * 1.4, 0.28, this.threatLevel);
    }

    // 6. Floating Rhodes / Electric Piano arpeggio echo
    if (step === 2 || step === 8 || step === 13) {
      const chord = this.chordProgression[this.currentBar];
      const note = chord[(step % chord.length)] * 2.0;
      this.playRhodesPing(note, time, 0.12);
    }
  }

  // --- MANDIDEXTROUS SPEEDBASS MODE ---
  scheduleSpeedbassStep(step, time) {
    const root = this.chordProgression[this.currentBar][0];

    // 1. Driving 4x4 Kick (Pounding on 0, 4, 8, 12)
    if (step % 4 === 0) {
      this.playSpeedbassKick(time, 0.55);
    }

    // 2. Aggressive Snare layer on beats 4 and 12
    if (step === 4 || step === 12) {
      this.playSnare(time, 0.48, false);
    }

    // 3. Fast rolling rave hi-hats (every 16th with open hat on the offbeat &)
    const isOffbeat = step % 4 === 2;
    this.playHiHat(time, isOffbeat ? 0.22 : 0.12, isOffbeat);

    // 4. BOUNCY OFFBEAT SPEEDBASS WOMP (Steps 2, 6, 10, 14)
    if (isOffbeat) {
      const pitches = [root * 0.5, root * 0.75, root * 0.6, root * 1.0];
      const wompPitch = pitches[(step / 2) % pitches.length];
      this.playSpeedbassWomp(wompPitch, time, 0.35);
    }

    // 5. Laser Zap Arpeggio / Rave stab on step 15
    if (step === 15) {
      this.playLaserZap(root * 4.0, time);
    }
  }

  // --- INSTRUMENT SYNTHESIS VOICES ---

  // --- LIQUID DNB CUSTOM VOICES (Atmospheric Sound Territory Style) ---

  // Soft rounded liquid kick (gentle thud, non-intrusive)
  playLiquidKick(time, gainVal = 0.35) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  // Brushed liquid snare (warm tone + soft high noise tail)
  playBrushedSnare(time, gainVal = 0.30, isGhost = false) {
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(175, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + (isGhost ? 0.04 : 0.08));

    oscGain.gain.setValueAtTime(gainVal * 0.45, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + (isGhost ? 0.05 : 0.10));

    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + (isGhost ? 0.06 : 0.11));

    // Brushed snare noise
    const bufSize = Math.floor(this.ctx.sampleRate * (isGhost ? 0.05 : 0.14));
    const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isGhost ? 2800 : 2200, time);
    filter.Q.setValueAtTime(1.4, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(gainVal * 0.65, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + (isGhost ? 0.05 : 0.14));

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + (isGhost ? 0.06 : 0.15));
  }

  // Silky 16th shaker / ride shuffle
  playLiquidShaker(time, gainVal = 0.08, isAccent = false) {
    const dur = isAccent ? 0.06 : 0.035;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  // Deep floating sub-glide bass with subtle warm saturated Reese undertone
  playDeepLiquidBass(freq, time, duration, gainVal = 0.28, threat = 0.1) {
    // Pure round sub oscillator
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq, time);
    // Gentle liquid pitch glide down 2Hz over duration
    subOsc.frequency.linearRampToValueAtTime(freq * 0.98, time + duration);

    subGain.gain.setValueAtTime(0.001, time);
    subGain.gain.linearRampToValueAtTime(gainVal * 0.85, time + 0.06);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    subOsc.connect(subGain);
    subGain.connect(this.musicGain);
    subOsc.start(time);
    subOsc.stop(time + duration + 0.05);

    // Subtle warm stereo chorused layer
    const sawOsc = this.ctx.createOscillator();
    const sawFilter = this.ctx.createBiquadFilter();
    const sawGain = this.ctx.createGain();

    sawOsc.type = 'sawtooth';
    sawOsc.frequency.setValueAtTime(freq + 1.2, time);

    sawFilter.type = 'lowpass';
    sawFilter.frequency.setValueAtTime(180 + threat * 260, time);
    sawFilter.Q.setValueAtTime(1.8, time);

    sawGain.gain.setValueAtTime(0.001, time);
    sawGain.gain.linearRampToValueAtTime(gainVal * 0.25, time + 0.08);
    sawGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    sawOsc.connect(sawFilter);
    sawFilter.connect(sawGain);
    sawGain.connect(this.musicGain);

    sawOsc.start(time);
    sawOsc.stop(time + duration + 0.05);
  }

  // Floating Rhodes Electric Piano echo
  playRhodesPing(freq, time, gainVal = 0.12) {
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    // Bell chime harmonic ratio (octave + minor third overtone)
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.756, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.linearRampToValueAtTime(600, time + 0.45);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.48);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.50);
    osc2.stop(time + 0.50);
  }

  playKick(time, gainVal = 0.4) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.11);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.20);
  }

  playSpeedbassKick(time, gainVal = 0.5) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.09);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  playSnare(time, gainVal = 0.35, isGhost = false) {
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, time);
    osc.frequency.exponentialRampToValueAtTime(95, time + (isGhost ? 0.05 : 0.09));

    oscGain.gain.setValueAtTime(gainVal * 0.7, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + (isGhost ? 0.06 : 0.12));

    osc.connect(oscGain);
    oscGain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + (isGhost ? 0.07 : 0.13));

    const bufSize = Math.floor(this.ctx.sampleRate * (isGhost ? 0.06 : 0.15));
    const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(isGhost ? 2200 : 1600, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(gainVal, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + (isGhost ? 0.06 : 0.15));

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + (isGhost ? 0.07 : 0.16));
  }

  playHiHat(time, gainVal = 0.12, isOpen = false) {
    const dur = isOpen ? 0.12 : 0.035;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8500, time);
    filter.Q.setValueAtTime(3.5, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }

  playReeseBass(freq, time, duration, gainVal = 0.25, threat = 0.2) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq + 3.2, time);

    filter.type = 'lowpass';
    const baseCutoff = 320 + threat * 850;
    filter.frequency.setValueAtTime(baseCutoff, time);
    filter.frequency.linearRampToValueAtTime(baseCutoff * 0.7, time + duration);
    filter.Q.setValueAtTime(3.0 + threat * 3.0, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
  }

  playSpeedbassWomp(freq, time, gainVal = 0.32) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const shaper = this.ctx.createWaveShaper();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, time);
    filter.frequency.exponentialRampToValueAtTime(260, time + 0.16);
    filter.Q.setValueAtTime(7.5, time);

    shaper.curve = this.distortionCurve;
    shaper.oversample = '2x';

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(filter);
    filter.connect(shaper);
    shaper.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.20);
  }

  playSubBass(freq, time, duration, gainVal = 0.25) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  playChordPad(frequencies, time, duration) {
    frequencies.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + idx * 80, time);
      filter.frequency.linearRampToValueAtTime(450, time + duration);

      const maxGain = 0.038 / frequencies.length;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(maxGain, time + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + duration + 0.1);
    });
  }

  playMarimbaPing(freq, time, gainVal = 0.10) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.38);
  }

  playLaserZap(startFreq, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(220, time + 0.18);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.20);
  }
}
