import { useState } from 'react';
import { ChevronRight, Compass, Radio, Zap } from 'lucide-react';
import { GameId, PlayerProgress } from '../types/games';

type PillarFilter = 'all' | 'entertain' | 'educate' | 'challenge';

interface GameCardMeta {
  id: Exclude<GameId, 'hub'>;
  pillar: Exclude<PillarFilter, 'all'>;
  pillarLabel: string;
  discipline: string;
  scope: string;
  title: string;
  summary: string;
  imageSrc: string;
  imageAlt: string;
  ctaLabel: string;
}

const GAMES: GameCardMeta[] = [
  {
    id: 'orbital',
    pillar: 'entertain',
    pillarLabel: 'Entertain',
    discipline: 'Gravity Physics Arcade',
    scope: '6 Sectors + Procedural',
    title: 'Orbital Slingshot',
    summary:
      'Bend probe trajectories around blue planetary attractors and amber repulsor cores to gather resonance stars and thread the warp gate.',
    imageSrc: '/src/assets/images/game_orbital_slingshot_1794637019972.jpg',
    imageAlt:
      'Geometric illustration of a space probe curving around an indigo planet along a golden trajectory toward a teal warp ring',
    ctaLabel: 'Play Orbital Slingshot',
  },
  {
    id: 'harmonic',
    pillar: 'educate',
    pillarLabel: 'Educate',
    discipline: 'Wave Superposition Lab',
    scope: '6 Interactive Signals',
    title: 'Harmonic Match',
    summary:
      'Explore amplitude, frequency, and phase shift on a live oscilloscope. Layer oscillators to reconstruct waveforms or cancel cabin noise flat to zero.',
    imageSrc: '/src/assets/images/game_harmonic_match_1794637020781.jpg',
    imageAlt:
      'Oscilloscope trace showing cyan and amber sine waves interfering harmoniously beside brass tuning dials',
    ctaLabel: 'Open Wave Lab',
  },
  {
    id: 'grid',
    pillar: 'challenge',
    pillarLabel: 'Solve Challenge',
    discipline: 'Clean Energy Microgrid',
    scope: '3 City Shifts',
    title: 'Grid Dispatch',
    summary:
      'Navigate the solar Duck Curve over a 24-hour shift. Charge grid batteries at noon, manage hydro reserves, and keep frequency locked at 60.0 Hz.',
    imageSrc: '/src/assets/images/game_grid_dispatch_1794637021525.jpg',
    imageAlt:
      'Isometric coastal city microgrid with wind turbines, rooftop solar panels, and an emerald battery station at twilight',
    ctaLabel: 'Manage Grid',
  },
];

interface StudioHubProps {
  progress: PlayerProgress;
  onSelectGame: (id: Exclude<GameId, 'hub'>) => void;
  onResetProgress: () => void;
}

export function StudioHub({ progress, onSelectGame, onResetProgress }: StudioHubProps) {
  const [filter, setFilter] = useState<PillarFilter>('all');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [confirmReset, setConfirmReset] = useState(false);

  const visibleGames =
    filter === 'all' ? GAMES : GAMES.filter((g) => g.pillar === filter);

  const orbitalStars = Object.values(progress.orbital).reduce(
    (sum, r) => sum + r.stars,
    0
  );
  const orbitalCleared = Object.keys(progress.orbital).length;
  const harmonicCleared = Object.values(progress.harmonic).filter(
    (r) => r.completed
  ).length;
  const gridRecords = Object.values(progress.grid);
  const bestCleanGrid =
    gridRecords.length > 0
      ? Math.max(...gridRecords.map((r) => r.cleanPercent))
      : null;

  const getProgressLine = (id: Exclude<GameId, 'hub'>): string => {
    if (id === 'orbital') {
      return orbitalCleared > 0
        ? `${orbitalCleared}/6 sectors cleared · ${orbitalStars} stars`
        : 'Ready for first launch';
    }
    if (id === 'harmonic') {
      return harmonicCleared > 0
        ? `${harmonicCleared}/6 signals verified`
        : 'Ready for first signal';
    }
    return gridRecords.length > 0
      ? `${gridRecords.length}/3 cities completed · Best ${bestCleanGrid}% clean`
      : 'Ready for 24-hour shift';
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-12">
      {/* Hero Section */}
      <section className="grid gap-8 lg:grid-cols-12 lg:items-end border-b border-slate-200 pb-10">
        <div className="lg:col-span-8">
          <p className="text-xs font-semibold tracking-wide text-sky-700">
            Interactive Game Studio · Entertain · Educate · Solve
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Three interactive games built for curiosity and mastery.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            Plot gravitational slingshots across deep space, tune live acoustic waveforms through
            Fourier superposition, and balance a coastal city’s renewable electricity grid across a
            24-hour shift.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectGame('orbital')}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Launch Orbital Slingshot
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectGame('grid')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Try Grid Dispatch
            </button>
          </div>
        </div>

        {/* Clean Progress Summary */}
        <div className="lg:col-span-4 grid grid-cols-3 gap-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-8">
          <div>
            <div className="text-xs text-slate-500">Orbital Stars</div>
            <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {orbitalStars}
              <span className="text-sm font-normal text-slate-400">/18</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Signals</div>
            <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {harmonicCleared}
              <span className="text-sm font-normal text-slate-400">/6</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Clean Grid</div>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
              {bestCleanGrid !== null ? `${bestCleanGrid}%` : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar & Game Catalog */}
      <section aria-labelledby="catalog-heading" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="catalog-heading" className="font-display text-2xl font-bold text-slate-900">
            Playable Experiences
          </h2>

          {/* Interactive segmented filter tabs */}
          <div
            role="tablist"
            aria-label="Filter games by purpose"
            className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 overflow-x-auto"
          >
            {(
              [
                { id: 'all', label: 'All Games' },
                { id: 'entertain', label: 'Entertain' },
                { id: 'educate', label: 'Educate' },
                { id: 'challenge', label: 'Solve Challenge' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {visibleGames.map((game) => {
            const hasImageError = failedImages[game.id];
            return (
              <article
                key={game.id}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow duration-150 hover:shadow-md"
              >
                {/* 4:3 Cover Artwork with Resilient Fallback */}
                <button
                  type="button"
                  onClick={() => onSelectGame(game.id)}
                  className="group relative block w-full aspect-[4/3] overflow-hidden bg-slate-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600"
                  aria-label={`Open ${game.title}`}
                >
                  {!hasImageError ? (
                    <img
                      src={game.imageSrc}
                      alt={game.imageAlt}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [game.id]: true }))
                      }
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-slate-300">
                      {game.id === 'orbital' && <Compass className="h-8 w-8 text-sky-400" />}
                      {game.id === 'harmonic' && <Radio className="h-8 w-8 text-amber-400" />}
                      {game.id === 'grid' && <Zap className="h-8 w-8 text-emerald-400" />}
                      <span className="mt-2 font-display text-sm font-semibold text-white">
                        {game.title}
                      </span>
                    </div>
                  )}
                </button>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    {/* Zero-pill unboxed metadata line */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{game.pillarLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{game.discipline}</span>
                      <span aria-hidden="true">·</span>
                      <span>{game.scope}</span>
                    </div>

                    <h3 className="mt-2 font-display text-xl font-bold text-slate-900">
                      {game.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {game.summary}
                    </p>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-slate-500 truncate">
                      {getProgressLine(game.id)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectGame(game.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Play
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Craft & Mechanics Overview */}
      <section className="grid gap-8 border-t border-slate-200 pt-10 md:grid-cols-3">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">
            01. Newtonian Gravity Engine
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Orbital Slingshot integrates inverse-square gravitational acceleration in real time,
            computing a live predictive arc so you feel how periapsis speed shapes orbital curves.
          </p>
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">
            02. Audible Wave Superposition
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Harmonic Match pairs visual oscilloscope traces with live Web Audio harmonic synthesis,
            letting you both see and hear constructive and destructive interference.
          </p>
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">
            03. Real-World Grid Balancing
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Grid Dispatch models the solar Duck Curve and frequency inertia (`60.0 Hz`), showing
            why utility-scale storage and demand flexibility unlock zero-carbon reliability.
          </p>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500">
        <span>Atelier Play — Interactive Games for Discovery & Strategy</span>
        <div className="flex items-center gap-4">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-slate-500 hover:text-slate-800 cursor-pointer whitespace-nowrap"
            >
              Reset Saved Progress
            </button>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="text-slate-700 font-medium">Clear local scores?</span>
              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  setConfirmReset(false);
                }}
                className="font-semibold text-red-600 hover:text-red-700 cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
      </footer>
    </main>
  );
}
