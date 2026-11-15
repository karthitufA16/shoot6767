export type GameId = 'hub' | 'orbital' | 'harmonic' | 'grid';

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'ROUND_SUMMARY' | 'GAME_OVER';

export interface OrbitalSectorRecord {
  stars: number;
  bestLaunches: number;
}

export interface HarmonicLevelRecord {
  accuracy: number;
  completed: boolean;
}

export interface GridScenarioRecord {
  cleanPercent: number;
  stabilityScore: number;
  blackouts: number;
}

export interface PlayerProgress {
  orbital: Record<number, OrbitalSectorRecord>;
  harmonic: Record<number, HarmonicLevelRecord>;
  grid: Record<string, GridScenarioRecord>;
}

export const DEFAULT_PROGRESS: PlayerProgress = {
  orbital: {},
  harmonic: {},
  grid: {},
};

const STORAGE_KEY = 'atelier_play_progress_v1';

export function loadProgress(): PlayerProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      orbital: parsed.orbital ?? {},
      harmonic: parsed.harmonic ?? {},
      grid: parsed.grid ?? {},
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors in restricted sandboxes
  }
}
