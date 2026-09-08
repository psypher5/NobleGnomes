/**
 * MusicDirector.js
 * 
 * Interactive dynamic music director for Noble Gnomes.
 * Streams studio-grade MP3 audio tracks generated from Gemini Lyra3:
 * 1. 'MENU': Salt_Stained_Morning - Tranquil maritime acoustic guitar & ocean air
 * 2. 'EXPLORATION': Cathedral_at_Speed - Uplifting, soaring melodic Liquid Drum & Bass
 * 3. 'BOSS_SHIELDED': Arrival_at_the_Maw - Epic choral brass & tense monster stomps
 * 4. 'BOSS_SPEEDBASS': Gravity_s_Last_Stand - High-octane Mandidextrous Speedbass rave!
 * 5. 'THREAT': Quantum_Entanglement - Dark rolling technical breakbeat
 * 
 * Features:
 * - Dual-channel equal-power crossfading for seamless transitions
 * - Routes into Web Audio API masterCompressor & respects game mute button
 * - State machine hysteresis to prevent rapid track flipping
 */

const TRACK_PATHS = {
  MENU: '/audio/music/menu_ambient.mp3',
  EXPLORATION: '/audio/music/liquid_dnb_pond.mp3',
  BOSS_SHIELDED: '/audio/music/boss_behemoth.mp3',
  BOSS_SPEEDBASS: '/audio/music/speedbass_rave.mp3',
  THREAT: '/audio/music/threat_roller.mp3'
};

const BASE_TRACK_VOLUMES = {
  MENU: 0.32,
  EXPLORATION: 0.28,
  BOSS_SHIELDED: 0.34,
  BOSS_SPEEDBASS: 0.36,
  THREAT: 0.30
};

export class MusicDirector {
  constructor(soundSynthesizer) {
    this.synth = soundSynthesizer;
    this.isInitialized = false;

    // Dual audio channel system for smooth crossfading
    this.channelA = null;
    this.channelB = null;
    this.activeChannel = 'A'; // 'A' or 'B'
    this.currentTrackKey = null;
    this.targetTrackKey = null;

    // Volume parameters
    this.masterMusicVolume = 1.0;
    this.isMuted = false;

    // State machine smoothing / hysteresis timer
    this.stateCooldown = 0;
    this.currentMusicMode = null;
  }

  init() {
    if (this.isInitialized || !this.synth || !this.synth.ctx) return;

    try {
      this.channelA = this.createChannel('channelA');
      this.channelB = this.createChannel('channelB');
      this.isInitialized = true;

      // Start initial menu music if ready
      if (this.targetTrackKey) {
        this.playTrack(this.targetTrackKey, 1.0);
      }
    } catch (e) {
      console.warn('[MusicDirector] AudioContext channel creation error:', e);
    }
  }

  createChannel(name) {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';

    let gainNode = null;
    let sourceNode = null;

    if (this.synth.ctx) {
      gainNode = this.synth.ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, this.synth.ctx.currentTime);

      try {
        sourceNode = this.synth.ctx.createMediaElementSource(audio);
        sourceNode.connect(gainNode);

        // Connect directly into SoundSynthesizer masterCompressor so sound effects sit on top
        if (this.synth.masterCompressor) {
          gainNode.connect(this.synth.masterCompressor);
        } else if (this.synth.masterGain) {
          gainNode.connect(this.synth.masterGain);
        } else {
          gainNode.connect(this.synth.ctx.destination);
        }
      } catch (e) {
        console.warn(`[MusicDirector] Could not create MediaElementSource for ${name}:`, e);
      }
    }

    return {
      name,
      audio,
      gainNode,
      sourceNode,
      trackKey: null,
      isPlaying: false
    };
  }

  playTrack(trackKey, fadeDuration = 1.5) {
    this.targetTrackKey = trackKey;
    if (!this.isInitialized) {
      this.init();
      if (!this.isInitialized) return;
    }

    if (this.currentTrackKey === trackKey) return;

    const outgoing = this.activeChannel === 'A' ? this.channelA : this.channelB;
    const incoming = this.activeChannel === 'A' ? this.channelB : this.channelA;
    this.activeChannel = this.activeChannel === 'A' ? 'B' : 'A';
    this.currentTrackKey = trackKey;

    const path = TRACK_PATHS[trackKey];
    if (!path) return;

    const targetVol = (BASE_TRACK_VOLUMES[trackKey] || 0.3) * this.masterMusicVolume * (this.isMuted ? 0 : 1);
    const t = this.synth.ctx ? this.synth.ctx.currentTime : 0;

    // 1. Fade out outgoing channel
    if (outgoing && outgoing.isPlaying) {
      if (outgoing.gainNode && this.synth.ctx) {
        outgoing.gainNode.gain.setValueAtTime(outgoing.gainNode.gain.value, t);
        outgoing.gainNode.gain.linearRampToValueAtTime(0.0001, t + fadeDuration);
      }
      setTimeout(() => {
        try {
          outgoing.audio.pause();
          outgoing.audio.currentTime = 0;
          outgoing.isPlaying = false;
        } catch (e) {}
      }, fadeDuration * 1000 + 100);
    }

    // 2. Load & Fade in incoming channel
    if (incoming) {
      incoming.trackKey = trackKey;
      incoming.audio.src = path;
      incoming.audio.currentTime = 0;

      if (incoming.gainNode && this.synth.ctx) {
        incoming.gainNode.gain.setValueAtTime(0.0001, t);
        incoming.gainNode.gain.linearRampToValueAtTime(targetVol, t + fadeDuration);
      }

      const playPromise = incoming.audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          incoming.isPlaying = true;
        }).catch(err => {
          // Autoplay policy awaiting user gesture
          console.log('[MusicDirector] Autoplay waiting for interaction:', err.message);
        });
      }
    }
  }

  updateGameState({ gameState, isBossAlive = false, isBossShielded = true, bossPhase = 1, slimeRatio = 0.5, dt = 0.016 }) {
    if (this.stateCooldown > 0) {
      this.stateCooldown -= dt;
    }

    let desiredMode = 'EXPLORATION';

    if (gameState === 'MENU' || gameState === 'MAP' || gameState === 'OUTRO') {
      desiredMode = 'MENU';
    } else if (gameState === 'PLAYING') {
      if (isBossAlive) {
        if (!isBossShielded || bossPhase >= 3) {
          // Boss shield is down or Phase 3 Enrage -> Mandidextrous Speedbass drop!
          desiredMode = 'BOSS_SPEEDBASS';
        } else {
          // Boss alive with shield -> Epic choral monster march
          desiredMode = 'BOSS_SHIELDED';
        }
      } else if (slimeRatio > 0.75) {
        desiredMode = 'THREAT';
      } else {
        // Melodic liquid drum & bass sailing
        desiredMode = 'EXPLORATION';
      }
    }

    if (desiredMode !== this.currentMusicMode && this.stateCooldown <= 0) {
      this.currentMusicMode = desiredMode;
      this.stateCooldown = 2.0; // 2s hysteresis to prevent rapid mode oscillation
      const fadeTime = desiredMode === 'BOSS_SPEEDBASS' ? 0.6 : 1.6; // Snappier drop on speedbass!
      this.playTrack(desiredMode, fadeTime);
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    const currentChannel = this.activeChannel === 'A' ? this.channelA : this.channelB;
    if (currentChannel && currentChannel.gainNode && this.synth.ctx) {
      const t = this.synth.ctx.currentTime;
      if (this.isMuted) {
        currentChannel.gainNode.gain.setValueAtTime(currentChannel.gainNode.gain.value, t);
        currentChannel.gainNode.gain.linearRampToValueAtTime(0.0001, t + 0.15);
      } else if (this.currentTrackKey) {
        const targetVol = (BASE_TRACK_VOLUMES[this.currentTrackKey] || 0.3) * this.masterMusicVolume;
        currentChannel.gainNode.gain.setValueAtTime(0.0001, t);
        currentChannel.gainNode.gain.linearRampToValueAtTime(targetVol, t + 0.3);
      }
    }
  }

  setMasterVolume(vol) {
    this.masterMusicVolume = Math.max(0, Math.min(1, vol));
    const currentChannel = this.activeChannel === 'A' ? this.channelA : this.channelB;
    if (currentChannel && currentChannel.gainNode && this.synth.ctx && !this.isMuted && this.currentTrackKey) {
      const targetVol = (BASE_TRACK_VOLUMES[this.currentTrackKey] || 0.3) * this.masterMusicVolume;
      currentChannel.gainNode.gain.setTargetAtTime(targetVol, this.synth.ctx.currentTime, 0.05);
    }
  }

  stopAll() {
    [this.channelA, this.channelB].forEach(ch => {
      if (ch && ch.audio) {
        try {
          ch.audio.pause();
          ch.audio.currentTime = 0;
          ch.isPlaying = false;
        } catch (e) {}
      }
    });
    this.currentTrackKey = null;
    this.currentMusicMode = null;
  }
}
