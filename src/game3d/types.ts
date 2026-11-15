export type ShooterState =
  | 'TITLE_MENU'
  | 'ROUND_QUIZ'
  | 'PLAYING'
  | 'ROUND_END'
  | 'PAUSED'
  | 'GAME_OVER';

export type MapId = 'arena' | 'construction' | 'hydro' | 'splash' | 'docks';

export interface ArenaMapSpec {
  id: MapId;
  name: string;
  tagline: string;
  halfX: number;
  halfZ: number;
  spawnZ: number;
  skyColor: number;
  fogDensity: number;
  hemiSky: number;
  hemiGround: number;
  sunColor: number;
  sunIntensity: number;
  floorBaseHex: string;
  floorAltHex: string;
  floorLineHex: string;
  containerA: [string, string];
  containerB: [string, string];
  containerNeutral: [string, string];
}

export const ARENA_MAPS: Record<MapId, ArenaMapSpec> = {
  arena: {
    id: 'arena',
    name: 'Cyber Core',
    tagline: 'Orbital Bridge · Energy Ramps',
    halfX: 28,
    halfZ: 34,
    spawnZ: 29,
    skyColor: 0x0b162c,
    fogDensity: 0.0021,
    hemiSky: 0x7dd3fc,
    hemiGround: 0x1e293b,
    sunColor: 0xe0f2fe,
    sunIntensity: 1.55,
    floorBaseHex: '#1e293b',
    floorAltHex: '#273549',
    floorLineHex: 'rgba(56, 189, 248, 0.34)',
    containerA: ['#075985', '#38bdf8'],
    containerB: ['#9f1239', '#fb7185'],
    containerNeutral: ['#1e293b', '#22d3ee'],
  },
  construction: {
    id: 'construction',
    name: 'Orbital Foundry',
    tagline: 'Titan Gantries · Sky Catwalk',
    halfX: 28,
    halfZ: 34,
    spawnZ: 29,
    skyColor: 0x1c192b,
    fogDensity: 0.0019,
    hemiSky: 0xfde68a,
    hemiGround: 0x292524,
    sunColor: 0xfef08a,
    sunIntensity: 1.5,
    floorBaseHex: '#27272a',
    floorAltHex: '#323238',
    floorLineHex: 'rgba(251, 191, 36, 0.34)',
    containerA: ['#b45309', '#fbbf24'],
    containerB: ['#be123c', '#fb923c'],
    containerNeutral: ['#3f3f46', '#facc15'],
  },
  hydro: {
    id: 'hydro',
    name: 'Hydro Dome',
    tagline: 'Flooded Basin · Geodesic Bio-Dome',
    halfX: 29,
    halfZ: 33,
    spawnZ: 28,
    skyColor: 0x0b3954,
    fogDensity: 0.0015,
    hemiSky: 0xbae6fd,
    hemiGround: 0x0284c7,
    sunColor: 0xfef9c3,
    sunIntensity: 1.75,
    floorBaseHex: '#67e8f9',
    floorAltHex: '#a5f3fc',
    floorLineHex: 'rgba(8, 145, 178, 0.45)',
    containerA: ['#0e7490', '#22d3ee'],
    containerB: ['#be123c', '#f472b6'],
    containerNeutral: ['#115e59', '#2dd4bf'],
  },
  splash: {
    id: 'splash',
    name: 'Splash',
    tagline: 'All-Water Lagoon · Mega Bouncers & Floats',
    halfX: 30,
    halfZ: 34,
    spawnZ: 29,
    skyColor: 0x0c4a6e,
    fogDensity: 0.0012,
    hemiSky: 0xe0f2fe,
    hemiGround: 0x06b6d4,
    sunColor: 0xfef9c3,
    sunIntensity: 1.85,
    floorBaseHex: '#22d3ee',
    floorAltHex: '#67e8f9',
    floorLineHex: 'rgba(255, 255, 255, 0.5)',
    containerA: ['#0284c7', '#38bdf8'],
    containerB: ['#e11d48', '#fb7185'],
    containerNeutral: ['#d97706', '#facc15'],
  },
  docks: {
    id: 'docks',
    name: 'Neo Harbor',
    tagline: 'Night Port · Maglev Gantry',
    halfX: 30,
    halfZ: 35,
    spawnZ: 30,
    skyColor: 0x050b18,
    fogDensity: 0.0024,
    hemiSky: 0x38bdf8,
    hemiGround: 0x0f172a,
    sunColor: 0xbae6fd,
    sunIntensity: 1.4,
    floorBaseHex: '#182235',
    floorAltHex: '#212e45',
    floorLineHex: 'rgba(56, 189, 248, 0.3)',
    containerA: ['#1d4ed8', '#38bdf8'],
    containerB: ['#9f1239', '#fb7185'],
    containerNeutral: ['#1e293b', '#22d3ee'],
  },
};

export type PrimaryId = 'assault_rifle' | 'burst_rifle' | 'sniper' | 'shotgun' | 'rpg';
export type SecondaryId = 'revolver' | 'handgun' | 'uzi';
export type MeleeId = 'katana' | 'scythe' | 'knife';
export type UtilityId = 'grenade' | 'medkit' | 'flashbang';
export type WeaponId = PrimaryId | SecondaryId | MeleeId | UtilityId;
export type SlotIndex = 0 | 1 | 2 | 3;

export type FinisherId =
  | 'standard'
  | 'plasma_burst'
  | 'orbital_beam'
  | 'vortex_implosion'
  | 'cyber_shatter'
  | 'lightning_strike'
  | 'supernova_blast';

export type DifficultyId = 'rookie' | 'ranked' | 'nemesis';

export interface GunSpec {
  id: string;
  name: string;
  category: 'primary' | 'secondary';
  damage: number;
  headshotMult: number;
  fireInterval: number;
  magSize: number;
  reloadTime: number;
  pellets: number;
  spread: number;
  adsSpread: number;
  adsFov: number;
  auto: boolean;
  burstCount?: number;
  projectileSpeed?: number;
  splashRadius?: number;
  color: number;
  recoilKick: number;
}

export interface MeleeSpec {
  id: MeleeId;
  name: string;
  damage: number;
  cooldown: number;
  range: number;
  speedBonus: number;
  dashImpulse: number;
  color: number;
}

export interface UtilitySpec {
  id: UtilityId;
  name: string;
  cooldown: number;
  charges: number;
  description: string;
  color: number;
}

export const PRIMARY_WEAPONS: Record<PrimaryId, GunSpec> = {
  assault_rifle: {
    id: 'assault_rifle',
    name: 'Assault Rifle',
    category: 'primary',
    damage: 16,
    headshotMult: 1.75,
    fireInterval: 0.11,
    magSize: 25,
    reloadTime: 1.15,
    pellets: 1,
    spread: 0.014,
    adsSpread: 0.004,
    adsFov: 60,
    auto: true,
    color: 0x38bdf8,
    recoilKick: 0.045,
  },
  burst_rifle: {
    id: 'burst_rifle',
    name: 'Burst Rifle',
    category: 'primary',
    damage: 19,
    headshotMult: 1.8,
    fireInterval: 0.36,
    magSize: 24,
    reloadTime: 1.2,
    pellets: 1,
    spread: 0.01,
    adsSpread: 0.002,
    adsFov: 56,
    auto: false,
    burstCount: 3,
    color: 0x818cf8,
    recoilKick: 0.06,
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    category: 'primary',
    damage: 78,
    headshotMult: 2.0,
    fireInterval: 1.05,
    magSize: 5,
    reloadTime: 1.55,
    pellets: 1,
    spread: 0.035,
    adsSpread: 0.0005,
    adsFov: 34,
    auto: false,
    color: 0x34d399,
    recoilKick: 0.18,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    category: 'primary',
    damage: 12,
    headshotMult: 1.5,
    fireInterval: 0.68,
    magSize: 6,
    reloadTime: 1.35,
    pellets: 8,
    spread: 0.072,
    adsSpread: 0.048,
    adsFov: 64,
    auto: false,
    color: 0xf59e0b,
    recoilKick: 0.15,
  },
  rpg: {
    id: 'rpg',
    name: 'RPG Launcher',
    category: 'primary',
    damage: 94,
    headshotMult: 1.25,
    fireInterval: 1.3,
    magSize: 3,
    reloadTime: 1.65,
    pellets: 1,
    spread: 0.008,
    adsSpread: 0.002,
    adsFov: 58,
    auto: false,
    projectileSpeed: 42,
    splashRadius: 6.5,
    color: 0xf97316,
    recoilKick: 0.22,
  },
};

export const SECONDARY_WEAPONS: Record<SecondaryId, GunSpec> = {
  revolver: {
    id: 'revolver',
    name: 'Revolver',
    category: 'secondary',
    damage: 38,
    headshotMult: 1.9,
    fireInterval: 0.42,
    magSize: 6,
    reloadTime: 1.1,
    pellets: 1,
    spread: 0.008,
    adsSpread: 0.001,
    adsFov: 58,
    auto: false,
    color: 0xfbbf24,
    recoilKick: 0.12,
  },
  handgun: {
    id: 'handgun',
    name: 'Handgun',
    category: 'secondary',
    damage: 18,
    headshotMult: 1.75,
    fireInterval: 0.18,
    magSize: 12,
    reloadTime: 0.95,
    pellets: 1,
    spread: 0.012,
    adsSpread: 0.003,
    adsFov: 62,
    auto: false,
    color: 0x94a3b8,
    recoilKick: 0.05,
  },
  uzi: {
    id: 'uzi',
    name: 'Uzi',
    category: 'secondary',
    damage: 11,
    headshotMult: 1.6,
    fireInterval: 0.07,
    magSize: 28,
    reloadTime: 1.1,
    pellets: 1,
    spread: 0.032,
    adsSpread: 0.016,
    adsFov: 64,
    auto: true,
    color: 0x38bdf8,
    recoilKick: 0.035,
  },
};

export const MELEE_WEAPONS: Record<MeleeId, MeleeSpec> = {
  katana: {
    id: 'katana',
    name: 'Katana',
    damage: 45,
    cooldown: 0.45,
    range: 3.4,
    speedBonus: 1.24,
    dashImpulse: 13.5,
    color: 0x38bdf8,
  },
  scythe: {
    id: 'scythe',
    name: 'Scythe',
    damage: 55,
    cooldown: 0.58,
    range: 3.9,
    speedBonus: 1.18,
    dashImpulse: 16.0,
    color: 0xa855f7,
  },
  knife: {
    id: 'knife',
    name: 'Knife',
    damage: 38,
    cooldown: 0.3,
    range: 2.8,
    speedBonus: 1.32,
    dashImpulse: 11.5,
    color: 0xe2e8f0,
  },
};

export const UTILITY_ITEMS: Record<UtilityId, UtilitySpec> = {
  grenade: {
    id: 'grenade',
    name: 'Grenade',
    cooldown: 4.0,
    charges: 2,
    description: 'Bouncing explosive dealing up to 75 blast damage.',
    color: 0xf97316,
  },
  medkit: {
    id: 'medkit',
    name: 'Medkit',
    cooldown: 6.0,
    charges: 2,
    description: 'Instantly restores +55 HP during a duel.',
    color: 0x10b981,
  },
  flashbang: {
    id: 'flashbang',
    name: 'Flashbang',
    cooldown: 5.0,
    charges: 2,
    description: 'Stuns & scrambles Rival aim for 2.4 seconds.',
    color: 0xfef08a,
  },
};

export interface LoadoutConfig {
  primary: PrimaryId;
  secondary: SecondaryId;
  melee: MeleeId;
  utility: UtilityId;
}

export interface DifficultySpec {
  id: DifficultyId;
  label: string;
  subtitle: string;
  accuracy: number;
  reactionSec: number;
  moveSpeed: number;
  damageScale: number;
  headshotChance: number;
  useCover: boolean;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultySpec> = {
  rookie: {
    id: 'rookie',
    label: 'Rookie',
    subtitle: '20% Aim · Relaxed',
    accuracy: 0.2,
    reactionSec: 1.05,
    moveSpeed: 6.4,
    damageScale: 0.55,
    headshotChance: 0.05,
    useCover: false,
  },
  ranked: {
    id: 'ranked',
    label: 'Ranked',
    subtitle: '36% Aim · Casual',
    accuracy: 0.36,
    reactionSec: 0.68,
    moveSpeed: 8.2,
    damageScale: 0.72,
    headshotChance: 0.08,
    useCover: true,
  },
  nemesis: {
    id: 'nemesis',
    label: 'Nemesis',
    subtitle: '52% Aim · Tactical',
    accuracy: 0.52,
    reactionSec: 0.44,
    moveSpeed: 9.8,
    damageScale: 0.85,
    headshotChance: 0.12,
    useCover: true,
  },
};

export type TeamSize = 1 | 2 | 3 | 4 | 5;
export type TeamSide = 'ally' | 'enemy';

export const TEAM_SIZES: TeamSize[] = [1, 2, 3, 4, 5];

export interface TeamRosterStatus {
  id: string;
  name: string;
  team: TeamSide;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface OverheadMarker {
  id: string;
  name: string;
  team: TeamSide;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  visible: boolean;
}

export interface KillFeedEntry {
  id: number;
  killerName: string;
  killerTeam: TeamSide;
  victimName: string;
  victimTeam: TeamSide;
  headshot: boolean;
}

export interface DamagePopup {
  id: number;
  amount: number;
  crit: boolean;
  x: number;
  y: number;
}

export interface TutorialHudState {
  active: boolean;
  step: number;
  totalSteps: number;
  completed: boolean;
  moveDist: number;
  hits: number;
}

export interface RivalsHudSnapshot {
  teamSize: TeamSize;
  playerHp: number;
  maxHp: number;
  playerAlive: boolean;
  rivalHp: number;
  alliesAlive: number;
  enemiesAlive: number;
  allyRoster: TeamRosterStatus[];
  enemyRoster: TeamRosterStatus[];
  playerRounds: number;
  rivalRounds: number;
  roundNumber: number;
  roundsToWin: number;
  roundTimer: number;
  activeSlot: SlotIndex;
  primaryAmmo: number;
  secondaryAmmo: number;
  utilityCharges: number;
  reloading: boolean;
  reloadProgress: number;
  sliding: boolean;
  ads: boolean;
  dashReady: boolean;
  pointerLocked: boolean;
  roundBanner: string | null;
  damageFlash: number;
  hitMarker: 'none' | 'hit' | 'headshot';
  overheadMarkers: OverheadMarker[];
  damagePopups: DamagePopup[];
  killFeed: KillFeedEntry[];
  totalDamageDealt: number;
  kills: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  activePerkLabel: string | null;
  factToast: { subjectLabel: string; fact: string } | null;
  tutorial: TutorialHudState;
  fps: number;
}

export type WeaponSkinId =
  | 'standard'
  | 'carbon_hex'
  | 'cobalt_anodized'
  | 'emerald_circuit'
  | 'crimson_damascus'
  | 'solar_amber'
  | 'auric_prestige'
  | 'quantum_nebula';

export interface WeaponSkinSpec {
  id: WeaponSkinId;
  name: string;
  subtitle: string;
  unlockLevel: number;
  previewGradient: string;
  accentHex: string;
}

export const WEAPON_SKINS: WeaponSkinSpec[] = [
  {
    id: 'standard',
    name: 'Factory Matte',
    subtitle: 'Brushed tactical titanium slate',
    unlockLevel: 1,
    previewGradient: 'linear-gradient(135deg, #1e293b 0%, #475569 55%, #0f172a 100%)',
    accentHex: '#94a3b8',
  },
  {
    id: 'carbon_hex',
    name: 'Carbon Hexweave',
    subtitle: 'Reinforced ballistic honeycomb weave',
    unlockLevel: 2,
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #334155 45%, #020617 100%)',
    accentHex: '#cbd5e1',
  },
  {
    id: 'cobalt_anodized',
    name: 'Cobalt Anodized',
    subtitle: 'Cryo-anodized cyber cobalt alloy',
    unlockLevel: 3,
    previewGradient: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)',
    accentHex: '#38bdf8',
  },
  {
    id: 'emerald_circuit',
    name: 'Emerald Circuit',
    subtitle: 'Etched emerald PCB trace matrix',
    unlockLevel: 5,
    previewGradient: 'linear-gradient(135deg, #022c22 0%, #059669 52%, #34d399 100%)',
    accentHex: '#10b981',
  },
  {
    id: 'crimson_damascus',
    name: 'Crimson Damascus',
    subtitle: 'Folded crimson & obsidian wave steel',
    unlockLevel: 7,
    previewGradient: 'linear-gradient(135deg, #4c0519 0%, #be123c 50%, #fb7185 100%)',
    accentHex: '#f43f5e',
  },
  {
    id: 'solar_amber',
    name: 'Solar Forge',
    subtitle: 'Industrial tungsten & molten amber chevrons',
    unlockLevel: 9,
    previewGradient: 'linear-gradient(135deg, #431407 0%, #d97706 52%, #fbbf24 100%)',
    accentHex: '#f59e0b',
  },
  {
    id: 'auric_prestige',
    name: 'Auric Prestige',
    subtitle: 'Clearcoated 24K brushed gold & onyx inlay',
    unlockLevel: 12,
    previewGradient: 'linear-gradient(135deg, #713f12 0%, #eab308 48%, #fef08a 100%)',
    accentHex: '#facc15',
  },
  {
    id: 'quantum_nebula',
    name: 'Quantum Nebula',
    subtitle: 'Iridescent cosmic plasma alloy',
    unlockLevel: 15,
    previewGradient: 'linear-gradient(135deg, #3b0764 0%, #9333ea 45%, #22d3ee 100%)',
    accentHex: '#c084fc',
  },
];

export function isSkinUnlocked(skinId: WeaponSkinId, playerLevel: number): boolean {
  const spec = WEAPON_SKINS.find((s) => s.id === skinId);
  return playerLevel >= (spec?.unlockLevel ?? 1);
}

export interface PlayerTierSpec {
  id: string;
  title: string;
  minLevel: number;
  colorHex: string;
}

export const PLAYER_TIERS: PlayerTierSpec[] = [
  { id: 'initiate', title: 'Initiate', minLevel: 1, colorHex: '#94a3b8' },
  { id: 'operative', title: 'Operative', minLevel: 3, colorHex: '#38bdf8' },
  { id: 'vanguard', title: 'Vanguard', minLevel: 5, colorHex: '#10b981' },
  { id: 'apex', title: 'Apex Striker', minLevel: 7, colorHex: '#f43f5e' },
  { id: 'solar', title: 'Solar Warden', minLevel: 9, colorHex: '#f59e0b' },
  { id: 'auric', title: 'Auric Legend', minLevel: 12, colorHex: '#facc15' },
  { id: 'quantum', title: 'Quantum Ascendant', minLevel: 15, colorHex: '#c084fc' },
];

export function getXpRequiredForLevel(level: number): number {
  const lvl = Math.max(1, Math.floor(level));
  return 120 + (lvl - 1) * 65;
}

export function getTierForLevel(level: number): PlayerTierSpec {
  let chosen = PLAYER_TIERS[0];
  for (const tier of PLAYER_TIERS) {
    if (level >= tier.minLevel) chosen = tier;
  }
  return chosen;
}

export interface XpProgressInfo {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPct: number;
  tier: PlayerTierSpec;
}

export function getXpProgress(totalXp: number): XpProgressInfo {
  let remaining = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (level < 99) {
    const req = getXpRequiredForLevel(level);
    if (remaining < req) {
      return {
        level,
        totalXp: Math.max(0, Math.floor(totalXp)),
        currentLevelXp: remaining,
        nextLevelXp: req,
        progressPct: Math.min(100, Math.round((remaining / req) * 100)),
        tier: getTierForLevel(level),
      };
    }
    remaining -= req;
    level += 1;
  }
  const capReq = getXpRequiredForLevel(level);
  return {
    level,
    totalXp: Math.max(0, Math.floor(totalXp)),
    currentLevelXp: Math.min(remaining, capReq),
    nextLevelXp: capReq,
    progressPct: 100,
    tier: getTierForLevel(level),
  };
}

const CAREER_KEY = 'rivals_duel_career_v1';

export interface CareerStats {
  wins: number;
  losses: number;
  winStreak: number;
  bestStreak: number;
  xp: number;
  level: number;
  totalMatches: number;
  totalRoundsWon: number;
  totalKills: number;
  totalHeadshots: number;
  totalDamage: number;
  totalShotsFired: number;
  totalShotsHit: number;
  totalQuizCorrect: number;
  totalQuizAnswered: number;
}

const DEFAULT_CAREER_STATS: CareerStats = {
  wins: 0,
  losses: 0,
  winStreak: 0,
  bestStreak: 0,
  xp: 0,
  level: 1,
  totalMatches: 0,
  totalRoundsWon: 0,
  totalKills: 0,
  totalHeadshots: 0,
  totalDamage: 0,
  totalShotsFired: 0,
  totalShotsHit: 0,
  totalQuizCorrect: 0,
  totalQuizAnswered: 0,
};

export function loadCareerStats(): CareerStats {
  try {
    const raw = window.localStorage.getItem(CAREER_KEY);
    if (!raw) return { ...DEFAULT_CAREER_STATS };
    const p = JSON.parse(raw) as Partial<CareerStats>;
    const wins = p.wins ?? 0;
    const losses = p.losses ?? 0;
    const winStreak = p.winStreak ?? 0;
    const xp = typeof p.xp === 'number' ? Math.max(0, p.xp) : wins * 140 + losses * 55;
    const progress = getXpProgress(xp);
    return {
      wins,
      losses,
      winStreak,
      bestStreak: Math.max(p.bestStreak ?? 0, winStreak),
      xp,
      level: progress.level,
      totalMatches: p.totalMatches ?? wins + losses,
      totalRoundsWon: p.totalRoundsWon ?? wins * 5,
      totalKills: p.totalKills ?? 0,
      totalHeadshots: p.totalHeadshots ?? 0,
      totalDamage: p.totalDamage ?? 0,
      totalShotsFired: p.totalShotsFired ?? 0,
      totalShotsHit: p.totalShotsHit ?? 0,
      totalQuizCorrect: p.totalQuizCorrect ?? 0,
      totalQuizAnswered: p.totalQuizAnswered ?? 0,
    };
  } catch {
    return { ...DEFAULT_CAREER_STATS };
  }
}

export interface MatchPerformanceInput {
  won: boolean;
  difficulty: DifficultyId;
  roundsWon: number;
  kills: number;
  headshots: number;
  damageDealt: number;
  shotsFired: number;
  shotsHit: number;
  quizCorrect: number;
  quizTotal: number;
}

export interface MatchXpBreakdown {
  outcomeXp: number;
  roundsXp: number;
  killsXp: number;
  headshotsXp: number;
  damageXp: number;
  accuracyXp: number;
  quizXp: number;
  difficultyMult: number;
  totalEarnedXp: number;
  prevLevel: number;
  nextLevel: number;
  leveledUp: boolean;
  prevTier: PlayerTierSpec;
  nextTier: PlayerTierSpec;
  newlyUnlockedSkins: WeaponSkinSpec[];
}

export interface RecordedMatchOutcome {
  career: CareerStats;
  breakdown: MatchXpBreakdown;
}

export function recordMatchPerformance(input: MatchPerformanceInput): RecordedMatchOutcome {
  const cur = loadCareerStats();
  const prevProgress = getXpProgress(cur.xp);

  const difficultyMult =
    input.difficulty === 'nemesis' ? 1.45 : input.difficulty === 'ranked' ? 1.2 : 1.0;

  const baseOutcome = input.won ? 130 : 50;
  const outcomeXp = Math.round(baseOutcome * difficultyMult);
  const roundsXp = Math.round(input.roundsWon * 22 * difficultyMult);
  const killsXp = Math.round(input.kills * 28 * difficultyMult);
  const headshotsXp = Math.round(input.headshots * 16 * difficultyMult);
  const damageXp = Math.round(input.damageDealt * 0.08);
  const accPct =
    input.shotsFired > 0 ? Math.round((input.shotsHit / input.shotsFired) * 100) : 0;
  const accuracyXp =
    input.shotsFired === 0 ? 0 : accPct >= 50 ? 40 : accPct >= 30 ? 22 : 10;
  const quizXp = input.quizCorrect * 20;

  const totalEarnedXp =
    outcomeXp + roundsXp + killsXp + headshotsXp + damageXp + accuracyXp + quizXp;

  const nextXp = cur.xp + totalEarnedXp;
  const nextProgress = getXpProgress(nextXp);
  const nextStreak = input.won ? cur.winStreak + 1 : 0;

  const next: CareerStats = {
    wins: cur.wins + (input.won ? 1 : 0),
    losses: cur.losses + (input.won ? 0 : 1),
    winStreak: nextStreak,
    bestStreak: Math.max(cur.bestStreak, nextStreak),
    xp: nextXp,
    level: nextProgress.level,
    totalMatches: cur.totalMatches + 1,
    totalRoundsWon: cur.totalRoundsWon + input.roundsWon,
    totalKills: cur.totalKills + input.kills,
    totalHeadshots: cur.totalHeadshots + input.headshots,
    totalDamage: cur.totalDamage + input.damageDealt,
    totalShotsFired: cur.totalShotsFired + input.shotsFired,
    totalShotsHit: cur.totalShotsHit + input.shotsHit,
    totalQuizCorrect: cur.totalQuizCorrect + input.quizCorrect,
    totalQuizAnswered: cur.totalQuizAnswered + input.quizTotal,
  };

  try {
    window.localStorage.setItem(CAREER_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota errors
  }

  const newlyUnlockedSkins = WEAPON_SKINS.filter(
    (skin) => skin.unlockLevel > prevProgress.level && skin.unlockLevel <= nextProgress.level
  );

  return {
    career: next,
    breakdown: {
      outcomeXp,
      roundsXp,
      killsXp,
      headshotsXp,
      damageXp,
      accuracyXp,
      quizXp,
      difficultyMult,
      totalEarnedXp,
      prevLevel: prevProgress.level,
      nextLevel: nextProgress.level,
      leveledUp: nextProgress.level > prevProgress.level,
      prevTier: prevProgress.tier,
      nextTier: nextProgress.tier,
      newlyUnlockedSkins,
    },
  };
}

export function recordMatchResult(won: boolean): CareerStats {
  return recordMatchPerformance({
    won,
    difficulty: 'ranked',
    roundsWon: won ? 5 : 2,
    kills: 0,
    headshots: 0,
    damageDealt: 0,
    shotsFired: 0,
    shotsHit: 0,
    quizCorrect: 0,
    quizTotal: 0,
  }).career;
}

