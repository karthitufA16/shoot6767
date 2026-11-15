import { RotateCcw, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

export type CrosshairStyle = 'cross' | 'dot' | 't_shape' | 'circle' | 'x_mark';

export interface CrosshairConfig {
  style: CrosshairStyle;
  color: string;
  size: number;
  thickness: number;
  gap: number;
  opacity: number;
  centerDot: boolean;
  dotSize: number;
  outline: boolean;
  dynamicSpread: boolean;
}

const STORAGE_KEY = 'rivals_crosshair_v1';

export const DEFAULT_CROSSHAIR: CrosshairConfig = {
  style: 'cross',
  color: '#ffffff',
  size: 9,
  thickness: 2,
  gap: 4,
  opacity: 0.95,
  centerDot: true,
  dotSize: 3,
  outline: true,
  dynamicSpread: true,
};

export const CROSSHAIR_SWATCHES = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Toxic Green', hex: '#22c55e' },
  { name: 'Cyan Pulse', hex: '#38bdf8' },
  { name: 'Amber Gold', hex: '#fbbf24' },
  { name: 'Crimson Red', hex: '#f43f5e' },
  { name: 'Violet Neon', hex: '#a855f7' },
  { name: 'Blaze Orange', hex: '#f97316' },
];

export const CROSSHAIR_PRESETS: Array<{ id: string; label: string; config: CrosshairConfig }> = [
  {
    id: 'tactical',
    label: 'Tactical Cross',
    config: { ...DEFAULT_CROSSHAIR },
  },
  {
    id: 'pro_dot',
    label: 'Pro Green Dot',
    config: {
      style: 'dot',
      color: '#22c55e',
      size: 6,
      thickness: 2,
      gap: 3,
      opacity: 1,
      centerDot: true,
      dotSize: 4,
      outline: true,
      dynamicSpread: false,
    },
  },
  {
    id: 't_bar',
    label: 'Precision T-Bar',
    config: {
      style: 't_shape',
      color: '#38bdf8',
      size: 8,
      thickness: 2,
      gap: 3,
      opacity: 0.95,
      centerDot: true,
      dotSize: 2,
      outline: true,
      dynamicSpread: true,
    },
  },
  {
    id: 'ring_dot',
    label: 'Ring & Dot',
    config: {
      style: 'circle',
      color: '#fbbf24',
      size: 10,
      thickness: 2,
      gap: 6,
      opacity: 0.92,
      centerDot: true,
      dotSize: 3,
      outline: true,
      dynamicSpread: true,
    },
  },
  {
    id: 'x_mark',
    label: 'X-Reticle',
    config: {
      style: 'x_mark',
      color: '#f43f5e',
      size: 8,
      thickness: 2,
      gap: 4,
      opacity: 0.95,
      centerDot: false,
      dotSize: 2,
      outline: true,
      dynamicSpread: true,
    },
  },
  {
    id: 'rivals_cyan',
    label: 'Rivals Cyan',
    config: {
      style: 'cross',
      color: '#38bdf8',
      size: 7,
      thickness: 2,
      gap: 3,
      opacity: 0.95,
      centerDot: false,
      dotSize: 2,
      outline: true,
      dynamicSpread: true,
    },
  },
];

export function loadCrosshairConfig(): CrosshairConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CROSSHAIR };
    const parsed = JSON.parse(raw) as Partial<CrosshairConfig>;
    return {
      ...DEFAULT_CROSSHAIR,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_CROSSHAIR };
  }
}

export function saveCrosshairConfig(cfg: CrosshairConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore storage failures
  }
}

interface CrosshairReticleProps {
  config: CrosshairConfig;
  ads?: boolean;
  sliding?: boolean;
  reloading?: boolean;
  hitMarker?: 'none' | 'hit' | 'headshot';
}

export function CrosshairReticle({
  config,
  ads = false,
  sliding = false,
  reloading = false,
  hitMarker = 'none',
}: CrosshairReticleProps) {
  const c = 40;
  const dynamicOffset = config.dynamicSpread
    ? (sliding ? 5 : 0) - (ads ? 2 : 0)
    : 0;
  const g = Math.max(0, config.gap + dynamicOffset);
  const s = config.size;
  const activeColor = reloading
    ? '#fbbf24'
    : hitMarker === 'headshot'
    ? '#fde047'
    : hitMarker === 'hit'
    ? '#f43f5e'
    : config.color;
  const strokeOut = 'rgba(2, 6, 23, 0.88)';
  const showDot = config.centerDot || config.style === 'dot';
  const dotR = Math.max(1, config.dotSize / 2);

  const renderLines = (isOutline: boolean) => {
    const sw = isOutline ? config.thickness + 2 : config.thickness;
    const stroke = isOutline ? strokeOut : activeColor;

    if (config.style === 'cross') {
      return (
        <>
          <line x1={c} y1={c - g - s} x2={c} y2={c - g} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={c} y1={c + g} x2={c} y2={c + g + s} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={c - g - s} y1={c} x2={c - g} y2={c} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={c + g} y1={c} x2={c + g + s} y2={c} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      );
    }
    if (config.style === 't_shape') {
      return (
        <>
          <line x1={c} y1={c + g} x2={c} y2={c + g + s} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={c - g - s} y1={c} x2={c - g} y2={c} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={c + g} y1={c} x2={c + g + s} y2={c} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      );
    }
    if (config.style === 'x_mark') {
      const d1 = (g + 1) * 0.707;
      const d2 = (g + s) * 0.707;
      return (
        <>
          <line x1={c - d2} y1={c - d2} x2={c - d1} y2={c - d1} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={c + d1} y1={c - d1} x2={c + d2} y2={c - d2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={c - d2} y1={c + d2} x2={c - d1} y2={c + d1} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1={c + d1} y1={c + d1} x2={c + d2} y2={c + d2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      );
    }
    if (config.style === 'circle') {
      const r = Math.max(4, g + s * 0.58);
      return <circle cx={c} cy={c} r={r} fill="none" stroke={stroke} strokeWidth={sw} />;
    }
    return null;
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        className={`transition-transform duration-75 ${
          reloading
            ? 'rotate-45 opacity-80'
            : hitMarker === 'headshot'
            ? 'scale-125'
            : hitMarker === 'hit'
            ? 'scale-110'
            : ''
        }`}
        style={{ opacity: config.opacity }}
      >
        {config.outline && renderLines(true)}
        {renderLines(false)}

        {showDot && (
          <>
            {config.outline && <circle cx={c} cy={c} r={dotR + 1} fill={strokeOut} />}
            <circle cx={c} cy={c} r={dotR} fill={activeColor} />
          </>
        )}

        {hitMarker !== 'none' && (
          <g stroke={hitMarker === 'headshot' ? '#fde047' : '#f43f5e'} strokeWidth={2.2} strokeLinecap="round">
            <line x1={c - 12} y1={c - 12} x2={c - 6} y2={c - 6} />
            <line x1={c + 6} y1={c - 6} x2={c + 12} y2={c - 12} />
            <line x1={c - 12} y1={c + 12} x2={c - 6} y2={c + 6} />
            <line x1={c + 6} y1={c + 6} x2={c + 12} y2={c + 12} />
          </g>
        )}
      </svg>

      {hitMarker === 'headshot' && (
        <span className="absolute -top-3 font-mono text-[11px] font-bold text-amber-300 drop-shadow">
          HEADSHOT
        </span>
      )}
    </div>
  );
}

interface CrosshairCustomizerModalProps {
  config: CrosshairConfig;
  onChange: (next: CrosshairConfig) => void;
  onClose: () => void;
}

export function CrosshairCustomizerModal({
  config,
  onChange,
  onClose,
}: CrosshairCustomizerModalProps) {
  const [previewMode, setPreviewMode] = useState<'normal' | 'ads' | 'hit' | 'headshot'>('normal');

  const update = <K extends keyof CrosshairConfig>(key: K, val: CrosshairConfig[K]) => {
    onChange({ ...config, [key]: val });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border border-cyan-500/45 bg-slate-950 p-5 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.2)]">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide text-white">
              OPTIC RETICLE CUSTOMIZER
            </h2>
            <p className="text-xs text-slate-400">
              Design your cyber-optic shape, color, thickness, gap, outline, and dynamic reaction
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-cyan-500/35 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Interactive Preview Box */}
        <div className="mt-4 relative h-36 w-full overflow-hidden rounded-xl border border-cyan-500/35">
          <div className="absolute inset-0 grid grid-cols-2">
            <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-end p-2">
              <span className="font-mono text-[10px] text-cyan-400/80">OBSIDIAN SECTOR</span>
            </div>
            <div className="bg-gradient-to-b from-cyan-200 via-sky-100 to-slate-700/70 flex items-end justify-end p-2">
              <span className="font-mono text-[10px] font-bold text-slate-900">HOLO GLARE</span>
            </div>
          </div>

          <div className="relative z-10 flex h-full w-full items-center justify-center">
            <CrosshairReticle
              config={config}
              ads={previewMode === 'ads'}
              hitMarker={previewMode === 'hit' ? 'hit' : previewMode === 'headshot' ? 'headshot' : 'none'}
            />
          </div>

          <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
            {(
              [
                { id: 'normal', label: 'Hipfire' },
                { id: 'ads', label: 'ADS' },
                { id: 'hit', label: 'Hit' },
                { id: 'headshot', label: 'Crit' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPreviewMode(m.id)}
                className={`rounded px-2 py-1 text-[10px] font-semibold cursor-pointer ${
                  previewMode === m.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-950/90 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Presets */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            PRO OPTIC PRESETS
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {CROSSHAIR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange({ ...preset.config })}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-center text-[11px] font-semibold text-slate-200 hover:border-cyan-400 hover:bg-slate-800 cursor-pointer"
              >
                <span
                  className="mx-auto mb-1 block h-2.5 w-2.5 rounded-xs border border-white/40"
                  style={{ backgroundColor: preset.config.color }}
                />
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style & Color */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 font-mono text-[11px] font-semibold tracking-wider text-slate-400">
              RETICLE SHAPE
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {(
                [
                  { id: 'cross', label: 'Cross' },
                  { id: 'dot', label: 'Dot' },
                  { id: 't_shape', label: 'T-Bar' },
                  { id: 'circle', label: 'Circle' },
                  { id: 'x_mark', label: 'X-Mark' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => update('style', st.id)}
                  className={`rounded-lg border py-2 text-[11px] font-semibold cursor-pointer ${
                    config.style === st.id
                      ? 'border-cyan-400 bg-cyan-600 text-white'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[11px] font-semibold tracking-wider text-slate-400">
              RETICLE COLOR
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {CROSSHAIR_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  title={sw.name}
                  onClick={() => update('color', sw.hex)}
                  className={`h-7 w-7 rounded-lg border-2 cursor-pointer transition-transform ${
                    config.color.toLowerCase() === sw.hex.toLowerCase()
                      ? 'scale-110 border-white'
                      : 'border-slate-700'
                  }`}
                  style={{ backgroundColor: sw.hex }}
                />
              ))}
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-300 cursor-pointer">
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => update('color', e.target.value)}
                  className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
                />
                Custom
              </label>
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div className="mt-4 grid gap-3 rounded-lg border border-cyan-500/25 bg-slate-900/90 p-4 sm:grid-cols-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Line Length</span>
              <span className="font-mono text-cyan-400">{config.size}px</span>
            </div>
            <input
              type="range"
              min={3}
              max={22}
              step={1}
              value={config.size}
              onChange={(e) => update('size', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Line Thickness</span>
              <span className="font-mono text-cyan-400">{config.thickness}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={config.thickness}
              onChange={(e) => update('thickness', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Center Gap</span>
              <span className="font-mono text-cyan-400">{config.gap}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={14}
              step={1}
              value={config.gap}
              onChange={(e) => update('gap', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Center Dot Size</span>
              <span className="font-mono text-cyan-400">{config.dotSize}px</span>
            </div>
            <input
              type="range"
              min={2}
              max={7}
              step={0.5}
              value={config.dotSize}
              onChange={(e) => update('dotSize', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Opacity</span>
              <span className="font-mono text-cyan-400">{Math.round(config.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={config.opacity}
              onChange={(e) => update('opacity', Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Behavior Toggles */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => update('centerDot', !config.centerDot)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer ${
              config.centerDot
                ? 'border-cyan-500/60 bg-cyan-950/60 text-cyan-300'
                : 'border-slate-700 bg-slate-900 text-slate-400'
            }`}
          >
            Center Dot: {config.centerDot ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => update('outline', !config.outline)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer ${
              config.outline
                ? 'border-cyan-500/60 bg-cyan-950/60 text-cyan-300'
                : 'border-slate-700 bg-slate-900 text-slate-400'
            }`}
          >
            Dark Outline: {config.outline ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => update('dynamicSpread', !config.dynamicSpread)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer ${
              config.dynamicSpread
                ? 'border-cyan-500/60 bg-cyan-950/60 text-cyan-300'
                : 'border-slate-700 bg-slate-900 text-slate-400'
            }`}
          >
            Dynamic Gap: {config.dynamicSpread ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-cyan-500/20 pt-4">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_CROSSHAIR })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-cyan-600 px-5 py-2 font-display text-xs font-bold tracking-wide text-white hover:bg-cyan-500 cursor-pointer"
          >
            SAVE &amp; APPLY
          </button>
        </div>
      </div>
    </div>
  );
}
