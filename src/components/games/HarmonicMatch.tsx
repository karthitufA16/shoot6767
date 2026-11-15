import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameState, HarmonicLevelRecord } from '../../types/games';
import { soundEngine } from '../../utils/sound';

interface WaveComponent {
  amplitude: number;
  frequency: number;
  phaseDeg: number;
}

interface HarmonicLevel {
  id: number;
  title: string;
  concept: string;
  insight: string;
  mode: 'match' | 'cancel';
  oscillatorCount: number;
  target: WaveComponent[];
  initial: WaveComponent[];
}

interface HarmonicMatchProps {
  records: Record<number, HarmonicLevelRecord>;
  onRecordUpdate: (levelId: number, accuracy: number, completed: boolean) => void;
  onBackToHub: () => void;
  soundMuted: boolean;
  onToggleMute: () => void;
}

const LEVELS: HarmonicLevel[] = [
  {
    id: 1,
    title: 'Fundamental Tone',
    concept: 'Amplitude & Frequency',
    insight:
      'Amplitude scales wave height (loudness), while Frequency sets how many complete cycles occur per second.',
    mode: 'match',
    oscillatorCount: 1,
    target: [{ amplitude: 1.0, frequency: 2, phaseDeg: 0 }],
    initial: [{ amplitude: 0.5, frequency: 1, phaseDeg: 0 }],
  },
  {
    id: 2,
    title: 'Phase Shift',
    concept: 'Temporal Offset (φ)',
    insight:
      'Changing phase slides the entire wave horizontally without altering its pitch or height. At 180°, peaks become troughs.',
    mode: 'match',
    oscillatorCount: 1,
    target: [{ amplitude: 0.9, frequency: 2, phaseDeg: 90 }],
    initial: [{ amplitude: 0.9, frequency: 2, phaseDeg: 0 }],
  },
  {
    id: 3,
    title: 'Harmonic Octave',
    concept: 'Wave Superposition',
    insight:
      'When two waves overlap, their vertical displacements add together point-by-point: y(t) = y₁(t) + y₂(t).',
    mode: 'match',
    oscillatorCount: 2,
    target: [
      { amplitude: 0.8, frequency: 1, phaseDeg: 0 },
      { amplitude: 0.5, frequency: 2, phaseDeg: 0 },
    ],
    initial: [
      { amplitude: 0.8, frequency: 1, phaseDeg: 0 },
      { amplitude: 0.2, frequency: 3, phaseDeg: 0 },
    ],
  },
  {
    id: 4,
    title: 'Beat Envelope',
    concept: 'Constructive Interference',
    insight:
      'Combining non-octave frequencies creates periodic crests and quiet valleys known as beat patterns.',
    mode: 'match',
    oscillatorCount: 2,
    target: [
      { amplitude: 0.7, frequency: 2, phaseDeg: 0 },
      { amplitude: 0.6, frequency: 3, phaseDeg: 90 },
    ],
    initial: [
      { amplitude: 0.5, frequency: 2, phaseDeg: 45 },
      { amplitude: 0.4, frequency: 2, phaseDeg: 0 },
    ],
  },
  {
    id: 5,
    title: 'Active Noise Cancellation',
    concept: 'Destructive Interference',
    insight:
      'Noise-cancelling headphones emit an anti-wave identical in frequency and amplitude, shifted 180° out of phase so the sum flattens to silence.',
    mode: 'cancel',
    oscillatorCount: 1,
    target: [{ amplitude: 1.0, frequency: 2, phaseDeg: 45 }],
    initial: [{ amplitude: 0.6, frequency: 2, phaseDeg: 45 }],
  },
  {
    id: 6,
    title: 'Fourier Telemetry',
    concept: 'Three-Component Synthesis',
    insight:
      'Any complex periodic signal—from human speech to radio telemetry—can be decomposed into simple weighted sine waves.',
    mode: 'match',
    oscillatorCount: 3,
    target: [
      { amplitude: 0.8, frequency: 1, phaseDeg: 0 },
      { amplitude: 0.5, frequency: 3, phaseDeg: 90 },
      { amplitude: 0.3, frequency: 5, phaseDeg: 180 },
    ],
    initial: [
      { amplitude: 0.8, frequency: 1, phaseDeg: 0 },
      { amplitude: 0.3, frequency: 2, phaseDeg: 0 },
      { amplitude: 0.3, frequency: 4, phaseDeg: 0 },
    ],
  },
];

function evaluateWave(components: WaveComponent[], xNorm: number, timeOffset = 0): number {
  let sum = 0;
  for (const c of components) {
    const phaseRad = (c.phaseDeg * Math.PI) / 180;
    sum += c.amplitude * Math.sin(2 * Math.PI * c.frequency * xNorm + phaseRad - timeOffset);
  }
  return sum;
}

function computeAccuracy(level: HarmonicLevel, userWaves: WaveComponent[]): number {
  const samples = 160;
  let errorSqSum = 0;
  let refEnergySum = 0;

  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const targetY = evaluateWave(level.target, t);
    const userY = evaluateWave(userWaves, t);

    if (level.mode === 'cancel') {
      // Goal: targetY + userY = 0 everywhere
      const residual = targetY + userY;
      errorSqSum += residual * residual;
      refEnergySum += targetY * targetY;
    } else {
      const diff = targetY - userY;
      errorSqSum += diff * diff;
      refEnergySum += targetY * targetY;
    }
  }

  const rmseRatio = Math.sqrt(errorSqSum / Math.max(0.001, refEnergySum));
  const rawScore = Math.max(0, Math.min(100, (1 - rmseRatio) * 100));
  return Number(rawScore.toFixed(1));
}

export function HarmonicMatch({
  records,
  onRecordUpdate,
  onBackToHub,
  soundMuted,
  onToggleMute,
}: HarmonicMatchProps) {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];

  const [oscillators, setOscillators] = useState<WaveComponent[]>(() =>
    level.initial.map((w) => ({ ...w }))
  );
  const [animatePhase, setAnimatePhase] = useState(true);
  const [lastCompletedAccuracy, setLastCompletedAccuracy] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);

  const accuracy = useMemo(() => computeAccuracy(level, oscillators), [level, oscillators]);
  const isResonant = accuracy >= 96.0;

  const statusDescriptor = useMemo(() => {
    if (accuracy >= 96) return { label: 'RESONANCE LOCKED', tone: 'text-emerald-700' };
    if (accuracy >= 75) return { label: 'CONVERGING', tone: 'text-amber-700' };
    return { label: 'OUT OF PHASE', tone: 'text-slate-600' };
  }, [accuracy]);

  const startLevel = useCallback((idx: number) => {
    const targetLevel = LEVELS[idx];
    setLevelIndex(idx);
    setOscillators(targetLevel.initial.map((w) => ({ ...w })));
    setGameState('PLAYING');
  }, []);

  const resetCurrentLevel = useCallback(() => {
    setOscillators(level.initial.map((w) => ({ ...w })));
    soundEngine.playTick();
  }, [level]);

  const updateOscillator = (idx: number, field: keyof WaveComponent, value: number) => {
    setOscillators((prev) =>
      prev.map((osc, i) => (i === idx ? { ...osc, [field]: value } : osc))
    );
  };

  const handleLockSignal = () => {
    if (!isResonant) return;
    setLastCompletedAccuracy(accuracy);
    onRecordUpdate(level.id, accuracy, true);
    soundEngine.playSuccess();
    setGameState('ROUND_SUMMARY');
  };

  const auditionWave = (components: WaveComponent[]) => {
    soundEngine.playHarmonicPreview(
      components.map((c) => ({
        amplitude: c.amplitude,
        frequency: c.frequency,
        phase: (c.phaseDeg * Math.PI) / 180,
      }))
    );
  };

  // Oscilloscope render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const width = 720;
    const height = 380;

    const render = () => {
      if (animatePhase && gameState === 'PLAYING') {
        timeRef.current += 0.025;
      }

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep oscilloscope slate
      ctx.fillStyle = '#0b1324';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 30; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Zero axis baseline
      const midY = height / 2;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      const ampScale = 74;
      const tShift = timeRef.current;

      // Component ghost waves (educational superposition cue)
      if (oscillators.length > 1) {
        oscillators.forEach((comp, idx) => {
          ctx.strokeStyle =
            idx === 0
              ? 'rgba(56, 189, 248, 0.22)'
              : idx === 1
              ? 'rgba(167, 139, 250, 0.22)'
              : 'rgba(52, 211, 153, 0.22)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let px = 0; px <= width; px += 3) {
            const xNorm = px / width;
            const yVal = evaluateWave([comp], xNorm, tShift);
            const py = midY - yVal * ampScale;
            if (px === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        });
      }

      // Target wave (or Incoming Noise in cancel mode)
      ctx.strokeStyle = level.mode === 'cancel' ? '#f87171' : '#fbbf24';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      for (let px = 0; px <= width; px += 3) {
        const xNorm = px / width;
        const yVal = evaluateWave(level.target, xNorm, tShift);
        const py = midY - yVal * ampScale;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // User combined wave
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let px = 0; px <= width; px += 3) {
        const xNorm = px / width;
        const yVal = evaluateWave(oscillators, xNorm, tShift);
        const py = midY - yVal * ampScale;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // In cancel mode, render the resulting Net Sum wave in bright emerald!
      if (level.mode === 'cancel') {
        ctx.strokeStyle = isResonant ? '#34d399' : '#e2e8f0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let px = 0; px <= width; px += 3) {
          const xNorm = px / width;
          const netY =
            evaluateWave(level.target, xNorm, tShift) + evaluateWave(oscillators, xNorm, tShift);
          const py = midY - netY * ampScale;
          if (px === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      ctx.restore();
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [animatePhase, gameState, isResonant, level, oscillators]);

  const equationString = useMemo(() => {
    return oscillators
      .map((o, i) => {
        const phasePart = o.phaseDeg === 0 ? '' : ` + ${o.phaseDeg}°`;
        return `${o.amplitude.toFixed(1)}·sin(${o.frequency}·2πt${phasePart})${
          i < oscillators.length - 1 ? ' + ' : ''
        }`;
      })
      .join('');
  }, [oscillators]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      {/* Header strip */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <button
              type="button"
              onClick={onBackToHub}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Games
            </button>
            <span aria-hidden="true">·</span>
            <span>Educate</span>
            <span aria-hidden="true">·</span>
            <span>Wave Superposition & Acoustics</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            Harmonic Match
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            {soundMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {soundMuted ? 'Sound Off' : 'Sound On'}
          </button>

          {gameState === 'PLAYING' && (
            <button
              type="button"
              onClick={() => setGameState('TITLE_MENU')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              Signal List
            </button>
          )}
        </div>
      </div>

      {/* TITLE MENU */}
      {gameState === 'TITLE_MENU' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <p className="text-xs font-medium text-sky-700">
                Interactive Physics Lab · 6 Guided Signals
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">
                Sculpt complex waveforms through superposition.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Tune amplitude, frequency, and phase shift across multiple oscillators to match
                target telemetry curves—or invert phase by 180° to cancel acoustic cabin noise
                flat to zero. Preview any waveform aloud using live harmonic synthesis.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => startLevel(0)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Start Lab
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="text-xs font-semibold text-slate-500 mb-3">Select Lesson Signal</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LEVELS.map((lvl, idx) => {
                  const rec = records[lvl.id];
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => startLevel(idx)}
                      className="flex flex-col items-start rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 text-left hover:border-sky-500 hover:bg-white transition-colors cursor-pointer"
                    >
                      <div className="flex w-full items-center justify-between text-xs">
                        <span className="font-mono text-slate-500">0{lvl.id}</span>
                        <span
                          className={`font-mono ${
                            rec?.completed ? 'text-emerald-700 font-semibold' : 'text-slate-500'
                          }`}
                        >
                          {rec?.completed ? `${rec.accuracy}% Match` : `${lvl.oscillatorCount} Osc`}
                        </span>
                      </div>
                      <span className="mt-1 font-display text-sm font-semibold text-slate-900">
                        {lvl.title}
                      </span>
                      <span className="mt-0.5 text-xs text-slate-500">{lvl.concept}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TWO-ZONE EDUCATIONAL SANDBOX */}
      {gameState !== 'TITLE_MENU' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Stage: Oscilloscope & Concept Insight (60-65%) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500">
                    Signal 0{level.id} · {level.concept}
                  </div>
                  <h2 className="font-display text-lg font-bold text-slate-900">{level.title}</h2>
                </div>

                <div className="text-right">
                  <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                    {accuracy.toFixed(1)}%
                  </div>
                  <div className={`font-mono text-xs font-semibold ${statusDescriptor.tone}`}>
                    {statusDescriptor.label}
                  </div>
                </div>
              </div>

              {/* Oscilloscope Viewport */}
              <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                <canvas ref={canvasRef} className="block w-full aspect-[720/380]" />

                {gameState === 'ROUND_SUMMARY' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-6">
                    <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 text-white">
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Signal Verified
                      </div>
                      <h3 className="mt-1 font-display text-xl font-bold">{level.title} Cleared</h3>
                      <p className="mt-2 font-mono text-sm text-slate-300 tabular-nums">
                        Accuracy: {lastCompletedAccuracy.toFixed(1)}%
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        {levelIndex < LEVELS.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => startLevel(levelIndex + 1)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer whitespace-nowrap"
                          >
                            Next Signal
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setGameState('TITLE_MENU')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer whitespace-nowrap"
                          >
                            Complete Curriculum
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startLevel(levelIndex)}
                          className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          Replay
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend & Equation Readout */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={`inline-block h-0.5 w-4 ${
                        level.mode === 'cancel' ? 'bg-red-400' : 'bg-amber-400'
                      }`}
                    />
                    {level.mode === 'cancel' ? 'Incoming Noise' : 'Target Signal'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-sky-400" />
                    Your Wave
                  </span>
                  {level.mode === 'cancel' && (
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-emerald-400" />
                      Net Sum (Goal: Flat 0)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setAnimatePhase((p) => !p)}
                  className="font-medium text-sky-700 hover:text-sky-900 cursor-pointer whitespace-nowrap"
                >
                  {animatePhase ? 'Freeze Motion' : 'Resume Motion'}
                </button>
              </div>

              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 overflow-x-auto whitespace-nowrap">
                y(t) = {equationString}
              </div>
            </div>

            {/* Bite-sized Conceptual Annotation */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-900">Physics Principle</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{level.insight}</p>
            </div>
          </div>

          {/* Right Deck: Oscillator Controls (35-40%) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Oscillator Bank
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => auditionWave(level.target)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                  >
                    <Play className="h-3 w-3" />
                    Hear Target
                  </button>
                  <button
                    type="button"
                    onClick={() => auditionWave(oscillators)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                  >
                    <Volume2 className="h-3 w-3" />
                    Hear Yours
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {oscillators.map((osc, idx) => (
                  <div key={idx} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Oscillator {idx + 1}
                    </div>

                    {/* Amplitude */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <label htmlFor={`osc-${idx}-amp`}>Amplitude (A)</label>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {osc.amplitude.toFixed(1)} V
                        </span>
                      </div>
                      <input
                        id={`osc-${idx}-amp`}
                        type="range"
                        min={0}
                        max={1.5}
                        step={0.1}
                        value={osc.amplitude}
                        onChange={(e) => updateOscillator(idx, 'amplitude', Number(e.target.value))}
                        className="atelier-slider w-full"
                      />
                    </div>

                    {/* Frequency */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <label htmlFor={`osc-${idx}-freq`}>Frequency (f)</label>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {osc.frequency} Hz
                        </span>
                      </div>
                      <input
                        id={`osc-${idx}-freq`}
                        type="range"
                        min={1}
                        max={6}
                        step={1}
                        value={osc.frequency}
                        onChange={(e) =>
                          updateOscillator(idx, 'frequency', Number(e.target.value))
                        }
                        className="atelier-slider w-full"
                      />
                    </div>

                    {/* Phase */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <label htmlFor={`osc-${idx}-phase`}>Phase Shift (φ)</label>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {osc.phaseDeg}°
                        </span>
                      </div>
                      <input
                        id={`osc-${idx}-phase`}
                        type="range"
                        min={0}
                        max={345}
                        step={15}
                        value={osc.phaseDeg}
                        onChange={(e) =>
                          updateOscillator(idx, 'phaseDeg', Number(e.target.value))
                        }
                        className="atelier-slider w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={resetCurrentLevel}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleLockSignal}
                  disabled={!isResonant}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isResonant ? 'Lock Signal' : 'Reach 96% Match'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
