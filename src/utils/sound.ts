// Synthesized Web Audio feedback for crisp, zero-dependency game audio

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private activeNodes: OscillatorNode[] = [];

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
      this.stopHarmonicPreview();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playTone(freq: number, duration = 0.12, type: OscillatorType = 'sine', volume = 0.12, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playStarCollect(index = 0): void {
    const notes = [587.33, 739.99, 880.0, 1174.66];
    const freq = notes[index % notes.length];
    this.playTone(freq, 0.22, 'sine', 0.14, 0);
    this.playTone(freq * 1.5, 0.18, 'triangle', 0.06, 0.04);
  }

  public playSuccess(): void {
    this.playTone(523.25, 0.16, 'sine', 0.12, 0);
    this.playTone(659.25, 0.16, 'sine', 0.12, 0.08);
    this.playTone(783.99, 0.28, 'triangle', 0.13, 0.16);
    this.playTone(1046.5, 0.36, 'sine', 0.12, 0.24);
  }

  public playFailure(): void {
    this.playTone(240, 0.18, 'sawtooth', 0.08, 0);
    this.playTone(165, 0.28, 'triangle', 0.1, 0.1);
  }

  public playTick(): void {
    this.playTone(440, 0.05, 'sine', 0.05, 0);
  }

  public stopHarmonicPreview(): void {
    for (const osc of this.activeNodes) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Already stopped
      }
    }
    this.activeNodes = [];
  }

  public playHarmonicPreview(
    components: Array<{ amplitude: number; frequency: number; phase: number }>,
    duration = 1.15
  ): void {
    this.stopHarmonicPreview();
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.14, now + 0.05);
    master.gain.setValueAtTime(0.14, now + duration - 0.15);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(ctx.destination);

    // Map abstract level frequency (1..6) to pleasant audible pitches (220 Hz base)
    const totalAmp = Math.max(1, components.reduce((sum, c) => sum + Math.abs(c.amplitude), 0));

    for (const comp of components) {
      if (Math.abs(comp.amplitude) < 0.02) continue;
      const osc = ctx.createOscillator();
      const compGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(165 * comp.frequency, now);
      compGain.gain.setValueAtTime(Math.abs(comp.amplitude) / totalAmp, now);

      osc.connect(compGain);
      compGain.connect(master);

      osc.start(now);
      osc.stop(now + duration + 0.02);
      this.activeNodes.push(osc);
    }
  }
}

export const soundEngine = new SoundEngine();
