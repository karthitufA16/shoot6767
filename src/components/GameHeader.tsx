import { GameId } from '../types/games';

interface GameHeaderProps {
  activeGame: GameId;
  onSelectGame: (id: GameId) => void;
  onQuickPlay: () => void;
}

const NAV_ITEMS: Array<{ id: GameId; label: string }> = [
  { id: 'hub', label: 'Overview' },
  { id: 'orbital', label: 'Orbital Slingshot' },
  { id: 'harmonic', label: 'Harmonic Match' },
  { id: 'grid', label: 'Grid Dispatch' },
];

export function GameHeader({ activeGame, onSelectGame, onQuickPlay }: GameHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectGame('hub')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 rounded"
        >
          Atelier Play
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary games navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeGame === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectGame(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 rounded ${
                  isActive
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-sky-600 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onQuickPlay}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-sky-700 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            {activeGame === 'hub' ? 'Play Featured' : 'Switch Game'}
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile games navigation"
        className="flex md:hidden items-center gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 text-xs font-medium text-slate-600"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeGame === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectGame(item.id)}
              className={`py-1 whitespace-nowrap shrink-0 cursor-pointer ${
                isActive ? 'text-sky-700 font-semibold' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
