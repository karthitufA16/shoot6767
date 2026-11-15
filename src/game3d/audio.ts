import { FinisherId } from './types';

// Realistic procedural Web Audio sound synthesis for 3D arena gunplay, finishers & 80s funk lobby music

class RivalsAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicEnabled = true;
  private musicPlaying = false;
  private musicWantPlay = false;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private nextNoteTime = 0;
  private gestureBound = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopMusicLoop();
    } else if (this.musicWantPlay && this.musicEnabled) {
      this.startLobbyMusic();
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusicLoop();
    } else if (this.musicWantPlay && !this.muted) {
      this.startLobbyMusic();
    }
  }

  public startLobbyMusic(): void {
    this.musicWantPlay = true;
    if (this.muted || !this.musicEnabled || typeof window === 'undefined') return;
    if (this.musicPlaying) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      if (!this.gestureBound) {
        this.gestureBound = true;
        const unlock = () => {
          this.gestureBound = false;
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('keydown', unlock);
          if (this.musicWantPlay && !this.muted && this.musicEnabled) {
            this.ctx?.resume().then(() => this.beginMusicLoop()).catch(() => {});
          }
        };
        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
      }
      ctx.resume().then(() => {
        if (this.musicWantPlay && !this.muted && this.musicEnabled && !this.musicPlaying) {
          this.beginMusicLoop();
        }
      }).catch(() => {});
      return;
    }

    this.beginMusicLoop();
  }

  public stopLobbyMusic(): void {
    this.musicWantPlay = false;
    this.stopMusicLoop();
  }

  private beginMusicLoop(): void {
    const ctx = this.ctx;
    if (!ctx || this.musicPlaying || this.muted || !this.musicEnabled || !this.musicWantPlay) {
      return;
    }
    this.musicPlaying = true;
    this.musicStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.04;

    if (!this.musicGain) {
      this.musicGain = ctx.createGain();
      this.musicGain.connect(ctx.destination);
    }
    this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
    this.musicGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(0.48, ctx.currentTime + 0.18);

    const stepDur = 60 / 117 / 4; // 117 BPM 16th-note groove (80s King of Pop synth-funk tempo)
    const scheduleAhead = 0.16;

    const scheduler = () => {
      if (!this.musicPlaying || !this.ctx || this.muted || !this.musicEnabled) return;
      while (this.nextNoteTime < this.ctx.currentTime + scheduleAhead) {
        this.scheduleFunkStep(this.musicStep, this.nextNoteTime, stepDur);
        this.nextNoteTime += stepDur;
        this.musicStep = (this.musicStep + 1) % 64;
      }
    };

    scheduler();
    this.musicTimer = window.setInterval(scheduler, 45);
  }

  private stopMusicLoop(): void {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ctx && this.musicGain) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.06);
    }
  }

  private scheduleFunkStep(step: number, time: number, stepDur: number): void {
    const ctx = this.ctx;
    const out = this.musicGain;
    if (!ctx || !out) return;

    const stepInBar = step % 16;

    // 1. Tight four-on-the-floor 80s pop kick
    if (stepInBar % 4 === 0) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(128, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
      g.gain.setValueAtTime(0.32, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
      osc.connect(g);
      g.connect(out);
      osc.start(time);
      osc.stop(time + 0.14);
    }

    // 2. Crisp gated 80s snare/clap on beats 2 & 4
    if (stepInBar === 4 || stepInBar === 12) {
      this.scheduleNoiseHit(ctx, out, time, 0.14, 1950, 'bandpass', 0.17);
      const body = ctx.createOscillator();
      const bg = ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(215, time);
      body.frequency.exponentialRampToValueAtTime(110, time + 0.07);
      bg.gain.setValueAtTime(0.14, time);
      bg.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
      body.connect(bg);
      bg.connect(out);
      body.start(time);
      body.stop(time + 0.1);
    }

    // 3. 16th-note shaker/hi-hat disco pocket
    const hatVol = stepInBar % 4 === 2 ? 0.065 : stepInBar % 2 === 0 ? 0.036 : 0.022;
    this.scheduleNoiseHit(ctx, out, time, 0.04, 6800, 'highpass', hatVol);

    // 4. Iconic bouncing F#m synth slap bassline (Billie Jean / Thriller groove)
    const bassPattern = [
      92.5, 0, 138.59, 0, 164.81, 0, 185.0, 0,
      164.81, 0, 138.59, 0, 110.0, 0, 123.47, 0,
    ];
    const bassFreq = bassPattern[stepInBar];
    if (bassFreq > 0) {
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassFreq, time);
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(bassFreq * 0.5, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1450, time);
      filter.frequency.exponentialRampToValueAtTime(340, time + stepDur * 1.6);
      filter.Q.value = 3.2;

      g.gain.setValueAtTime(0.16, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 1.75);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(g);
      g.connect(out);
      osc.start(time);
      sub.start(time);
      osc.stop(time + stepDur * 1.85);
      sub.stop(time + stepDur * 1.85);
    }

    // 5. Shimmering 80s poly-synth chord stabs (F#m7 -> G#m7/F# -> A/F# -> G#m7)
    const chordBar = Math.floor(step / 16);
    const chords: number[][] = [
      [369.99, 440.0, 554.37, 659.25], // F#m7
      [415.3, 493.88, 622.25, 739.99], // G#m7
      [440.0, 554.37, 659.25, 830.61], // Amaj7
      [415.3, 493.88, 554.37, 659.25], // G#m/E
    ];
    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 12) {
      const chord = chords[chordBar % chords.length];
      const dur = stepInBar === 6 ? stepDur * 2.2 : stepDur * 3.1;
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const filt = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(2400, time);
        filt.frequency.exponentialRampToValueAtTime(950, time + dur);
        g.gain.setValueAtTime(0.032, time);
        g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
        osc.connect(filt);
        filt.connect(g);
        g.connect(out);
        osc.start(time);
        osc.stop(time + dur + 0.02);
      });
    }

    // 6. Bright 80s brass/bell lead hook on bars 2 & 4
    const leadMap: Record<number, number> = {
      16: 739.99,
      19: 659.25,
      22: 554.37,
      26: 659.25,
      30: 739.99,
      48: 880.0,
      51: 830.61,
      54: 739.99,
      58: 659.25,
      61: 739.99,
    };
    const leadFreq = leadMap[step];
    if (leadFreq) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(leadFreq, time);
      g.gain.setValueAtTime(0.036, time);
      g.gain.exponentialRampToValueAtTime(0.0008, time + stepDur * 2.4);
      osc.connect(g);
      g.connect(out);
      osc.start(time);
      osc.stop(time + stepDur * 2.5);
    }
  }

  private scheduleNoiseHit(
    ctx: AudioContext,
    out: GainNode,
    time: number,
    dur: number,
    freq: number,
    filterType: BiquadFilterType,
    vol: number
  ): void {
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filt = ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0005, time + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(out);
    src.start(time);
  }

  public playGunshot(kind: string, distanceScale = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const att = Math.max(0.18, Math.min(1, distanceScale));

    if (kind === 'rpg') {
      // Rocket launcher ignition whoosh + deep tube thump + propellant hiss
      this.playBandNoise(0.36, 950, 0.55, 0.28 * att);
      this.playBandNoise(0.28, 2800, 0.85, 0.16 * att);
      this.playPunchOsc(ctx, now, 130, 32, 0.28, 0.28 * att, 'sawtooth');
      this.playMechanicalClick(ctx, now + 0.04, 720, 0.05 * att);
    } else if (kind === 'sniper') {
      // Heavy supersonic crack + deep sub punch + metallic bolt echo
      this.playBandNoise(0.28, 1200, 0.7, 0.28 * att);
      this.playBandNoise(0.045, 3600, 1.4, 0.24 * att);
      this.playPunchOsc(ctx, now, 165, 38, 0.22, 0.24 * att, 'triangle');
      this.playMechanicalClick(ctx, now + 0.28, 1350, 0.045 * att);
    } else if (kind === 'shotgun') {
      // Wide low-mid boom + heavy scatter crack + pump rack
      this.playBandNoise(0.24, 780, 0.65, 0.3 * att);
      this.playBandNoise(0.08, 2200, 1.1, 0.2 * att);
      this.playPunchOsc(ctx, now, 140, 34, 0.2, 0.25 * att, 'sawtooth');
      this.playMechanicalClick(ctx, now + 0.19, 980, 0.04 * att);
    } else if (kind === 'revolver') {
      // Sharp magnum crack + brass ring
      this.playBandNoise(0.14, 1550, 0.9, 0.2 * att);
      this.playPunchOsc(ctx, now, 280, 62, 0.14, 0.17 * att, 'triangle');
      this.playMechanicalClick(ctx, now + 0.03, 2400, 0.03 * att);
    } else if (kind === 'uzi') {
      // Rapid high-cyclic submachine snap
      this.playBandNoise(0.05, 2400, 1.1, 0.12 * att);
      this.playPunchOsc(ctx, now, 320, 95, 0.055, 0.1 * att, 'triangle');
    } else {
      // Assault Rifle / Burst / Handgun crisp tactical report + bolt clack
      this.playBandNoise(0.075, 1950, 0.95, 0.14 * att);
      this.playPunchOsc(ctx, now, 260, 72, 0.075, 0.13 * att, 'triangle');
      this.playMechanicalClick(ctx, now + 0.025, 2900, 0.024 * att);
    }
  }

  public playShellDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = 3600 + Math.random() * 900;
    [0, 0.065].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * (1 - i * 0.08), now + offset);
      gain.gain.setValueAtTime(0.018, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.045);
    });
  }

  public playFootstep(sprinting: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const vol = sprinting ? 0.06 : 0.038;
    const cutoff = sprinting ? 520 + Math.random() * 140 : 380 + Math.random() * 100;
    this.playBandNoise(0.065, cutoff, 1.2, vol);
    this.playPunchOsc(ctx, ctx.currentTime, 92, 42, 0.055, vol * 0.8, 'sine');
  }

  public playLand(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.playBandNoise(0.11, 340, 0.9, 0.1);
    this.playPunchOsc(ctx, ctx.currentTime, 110, 36, 0.11, 0.11, 'sine');
  }

  public playWaterStep(sprinting: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const vol = sprinting ? 0.085 : 0.055;
    const now = ctx.currentTime;
    this.playBandNoise(0.11, 1450 + Math.random() * 450, 0.85, vol);
    this.playPunchOsc(ctx, now, 320 + Math.random() * 80, 140, 0.08, vol * 0.6, 'sine');
  }

  public playWaterSplash(intensity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const att = Math.max(0.25, Math.min(1.6, intensity));
    const now = ctx.currentTime;
    this.playBandNoise(0.24 * att, 1850, 0.7, 0.14 * att);
    this.playBandNoise(0.14 * att, 3400, 1.0, 0.07 * att);
    this.playPunchOsc(ctx, now, 210, 75, 0.14, 0.11 * att, 'sine');
  }

  public playHitmarker(headshot: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (headshot) {
      // Sharp helmet crack + crisp metallic ding
      this.playBandNoise(0.04, 3200, 1.2, 0.11);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1780, now);
      osc.frequency.exponentialRampToValueAtTime(2340, now + 0.09);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1020, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.035);
      gain.gain.setValueAtTime(0.095, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.046);
    }
  }

  public playMeleeSlash(): void {
    this.playBandNoise(0.14, 2400, 1.1, 0.13);
  }

  public playSlide(): void {
    this.playBandNoise(0.24, 720, 0.8, 0.11);
  }

  public playExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.playBandNoise(0.45, 460, 0.6, 0.28);
    this.playBandNoise(0.22, 1400, 0.8, 0.14);
    const now = ctx.currentTime;
    this.playPunchOsc(ctx, now, 118, 26, 0.42, 0.26, 'sine');
  }

  public playFinisher(finisher: FinisherId): void {
    const ctx = this.ensureContext();
    if (!ctx || finisher === 'standard') return;
    const now = ctx.currentTime;
    if (finisher === 'orbital_beam') {
      this.playPunchOsc(ctx, now, 1800, 140, 0.48, 0.22, 'sawtooth');
      this.playBandNoise(0.38, 2200, 0.9, 0.16);
    } else if (finisher === 'vortex_implosion') {
      this.playPunchOsc(ctx, now, 95, 420, 0.35, 0.2, 'sine');
      this.playPunchOsc(ctx, now + 0.26, 260, 32, 0.28, 0.24, 'triangle');
    } else if (finisher === 'lightning_strike') {
      this.playBandNoise(0.24, 4200, 1.4, 0.22);
      this.playPunchOsc(ctx, now, 960, 180, 0.22, 0.18, 'square');
    } else if (finisher === 'cyber_shatter') {
      [880, 1174, 1568].forEach((hz, i) => {
        this.playMechanicalClick(ctx, now + i * 0.055, hz, 0.09);
      });
    } else if (finisher === 'supernova_blast') {
      this.playBandNoise(0.55, 620, 0.5, 0.28);
      this.playPunchOsc(ctx, now, 150, 28, 0.55, 0.28, 'sawtooth');
    } else {
      // plasma_burst
      this.playPunchOsc(ctx, now, 620, 140, 0.26, 0.16, 'triangle');
    }
  }

  public playHeal(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.09, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.15);
    });
  }

  public playReload(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Mag release click -> mag seat -> slide rack
    this.playMechanicalClick(ctx, now, 1150, 0.06);
    this.playMechanicalClick(ctx, now + 0.24, 880, 0.07);
    this.playMechanicalClick(ctx, now + 0.48, 1680, 0.075);
  }

  public playRoundEnd(won: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = won ? [523.25, 659.25, 783.99, 1046.5] : [392.0, 349.23, 293.66];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.11, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  }

  public playBouncePad(power = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const clamped = Math.min(1.5, Math.max(0.6, power));

    // Elastic spring boing sweep + harmonic overtone + pneumatic air release
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165 * clamped, now);
    osc.frequency.exponentialRampToValueAtTime(590 * clamped, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(340 * clamped, now + 0.28);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(310 * clamped, now);
    osc2.frequency.exponentialRampToValueAtTime(860 * clamped, now + 0.12);
    gain2.gain.setValueAtTime(0.09, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.2);

    this.playBandNoise(0.16, 1800, 0.9, 0.085);
  }

  public playPlayerHit(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playBandNoise(0.07, 1100, 0.9, 0.12);
    this.playPunchOsc(ctx, now, 155, 58, 0.11, 0.13, 'sawtooth');
  }

  private playPunchOsc(
    ctx: AudioContext,
    startTime: number,
    startHz: number,
    endHz: number,
    dur: number,
    vol: number,
    type: OscillatorType
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startHz, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), startTime + dur);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.01);
  }

  private playMechanicalClick(
    ctx: AudioContext,
    startTime: number,
    hz: number,
    vol: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(hz, startTime);
    osc.frequency.exponentialRampToValueAtTime(hz * 0.55, startTime + 0.032);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.04);
  }

  private playBandNoise(
    duration: number,
    cutoffHz: number,
    q: number,
    volume: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, 1.35);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoffHz;
    filter.Q.value = q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }
}

export const shooterAudio = new RivalsAudioEngine();
