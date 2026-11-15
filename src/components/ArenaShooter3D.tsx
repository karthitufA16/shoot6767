import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Crosshair,
  Crown,
  Globe,
  GraduationCap,
  Lock,
  LogOut,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  BouncePadSpec,
  buildMapEnvironment,
  buildRivalCharacter,
  buildRivalsViewmodel,
  createMaterialPalette,
  getElevatedSurfaceAt,
  getMapBouncePads,
  getMapBoxes,
  getMapCeilingHeightAt,
  getMapDeckSlabs,
  getMapFloorHeightAt,
  MaterialPalette,
  RivalCharacterRig,
  ViewmodelRig,
} from '../game3d/models';
import { MultiplayerClient, MpConnectionStatus } from '../game3d/multiplayerClient';
import type {
  MpBotSnapshot,
  MpRoomSnapshot,
  MpRoomSummary,
  MpTeam,
  ServerMessage,
} from '../game3d/multiplayerTypes';
import {
  ContainerTextureSet,
  createArenaFloorMarkingsTexture,
  createBarkTextureSet,
  createBridgeDeckTextureSet,
  createConcreteTextureSet,
  createContactShadowTexture,
  createContainerTextureSet,
  createDomeGlassTexture,
  createFabricTextureSet,
  createGrassDirtTextureSet,
  createGunmetalTextureSet,
  createRockTextureSet,
  createSkyDomeTexture,
  createSoftParticleTexture,
  createTerrainTextureSet,
  TerrainTextureSet,
} from '../game3d/textures';
import { HydroWaterController } from '../game3d/water';
import {
  createGrassBladeClusterGeometry,
  createGrassBladeMaterial,
  populateGrassInstances,
} from '../game3d/grass';
import { shooterAudio } from '../game3d/audio';
import {
  CLASS_LEVELS,
  ClassLevel,
  getCambridgeStageLabel,
  getQuestionsForClassAndSubject,
  loadUsedQuestionKeys,
  pickArenaFact,
  pickQuestion,
  QuizQuestion,
  ROUND_PERKS,
  RoundOverchargePerk,
  SUBJECTS,
  SubjectId,
} from '../game3d/education';
import {
  CrosshairConfig,
  CrosshairCustomizerModal,
  CrosshairReticle,
  loadCrosshairConfig,
  saveCrosshairConfig,
} from './CrosshairSystem';
import {
  ARENA_MAPS,
  DamagePopup,
  DIFFICULTIES,
  DifficultyId,
  FinisherId,
  getXpProgress,
  isSkinUnlocked,
  KillFeedEntry,
  loadCareerStats,
  LoadoutConfig,
  MapId,
  MatchXpBreakdown,
  MELEE_WEAPONS,
  MeleeId,
  OverheadMarker,
  PRIMARY_WEAPONS,
  PrimaryId,
  recordMatchPerformance,
  RivalsHudSnapshot,
  SECONDARY_WEAPONS,
  SecondaryId,
  ShooterState,
  SlotIndex,
  TEAM_SIZES,
  TeamRosterStatus,
  TeamSide,
  TeamSize,
  UTILITY_ITEMS,
  UtilityId,
  WEAPON_SKINS,
} from '../game3d/types';
import {
  ALL_WEAPON_LIST,
  applyTemplateToBuild,
  BarrelAttachment,
  FireModeOverride,
  getDefaultWeaponBuild,
  getTemplatesForWeapon,
  getWeaponCategory,
  loadUserTemplates,
  loadWeaponBuilds,
  MagazineAttachment,
  OpticAttachment,
  resolveGunSpec,
  resolveMeleeSpec,
  resolveUtilitySpec,
  saveUserTemplates,
  saveWeaponBuilds,
  UserSavedTemplate,
  WEAPON_FINISH_SWATCHES,
  WEAPON_FINISHERS,
  WeaponBuildsMap,
  WeaponCustomBuild,
  WeaponId,
} from '../game3d/weaponTemplates';

interface TracerEntity {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface ThrownEntity {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  kind: 'grenade' | 'flashbang';
  powerMult: number;
}

interface SparkEntity {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface ShellEntity {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  bounced: boolean;
}

interface ImpactEntity {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface SmokeEntity {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
  baseOpacity: number;
}

interface ShockwaveEntity {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxScale: number;
}

interface RocketEntity {
  mesh: THREE.Group;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  damage: number;
  splashRadius: number;
  colorHex: number;
  smokeAccum: number;
}

interface FinisherEffectEntity {
  group: THREE.Group;
  kind: FinisherId;
  life: number;
  maxLife: number;
}

function cssHexToNum(hex: string, fallback = 0x38bdf8): number {
  const parsed = Number.parseInt(hex.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const CinematicLensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.08 },
    uAberration: { value: 0.0 },
    uTexelSize: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    uSharpen: { value: 0.28 },
    uTime: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uAberration;
    uniform vec2 uTexelSize;
    uniform float uSharpen;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec2 offset = (vUv - 0.5) * uAberration;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      vec3 col = vec3(r, g, b);

      // Clamped 5-tap micro-contrast unsharp mask for crisp normal-map & edge clarity
      vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, uTexelSize.y)).rgb;
      vec3 s = texture2D(tDiffuse, vUv - vec2(0.0, uTexelSize.y)).rgb;
      vec3 e = texture2D(tDiffuse, vUv + vec2(uTexelSize.x, 0.0)).rgb;
      vec3 w = texture2D(tDiffuse, vUv - vec2(uTexelSize.x, 0.0)).rgb;
      vec3 blur = (n + s + e + w) * 0.25;
      col += clamp(col - blur, -0.085, 0.085) * uSharpen;

      // Filmic S-curve contrast & split-tone shadow/highlight balance
      col = clamp(col, 0.0, 1.0);
      vec3 sCurve = col * col * (3.0 - 2.0 * col);
      col = mix(col, sCurve, 0.22);
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(luma), col, 1.08);
      col += mix(vec3(-0.008, -0.004, 0.012), vec3(0.01, 0.006, -0.004), luma);

      // Subtle organic film grain
      float grain = fract(sin(dot(vUv * (uTime * 0.13 + 1.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      col += grain * 0.014;

      float dist = distance(vUv, vec2(0.5));
      float vig = smoothstep(0.92, 0.24, dist);
      col *= mix(1.0 - uVignette, 1.0, vig);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

// Pre-allocated math helpers (zero per-frame GC)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _rayDir = new THREE.Vector3();
const _ndc = new THREE.Vector2();
const _projVec = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();
const _tintColor = new THREE.Color();

const ROUNDS_TO_WIN = 5;
const MAX_HP = 150;

const DEFAULT_LOADOUT: LoadoutConfig = {
  primary: 'assault_rifle',
  secondary: 'revolver',
  melee: 'katana',
  utility: 'grenade',
};

const TUTORIAL_STEPS = [
  {
    badge: 'MOVEMENT & LOOK',
    title: 'Move & Look Around',
    instruction: 'Use WASD to sprint across the arena and move your mouse (or Arrow keys) to look around.',
  },
  {
    badge: 'SLIDE-JUMP',
    title: 'Momentum Slide-Jump',
    instruction: 'Press C while moving to slide, then press Space mid-slide to launch forward.',
  },
  {
    badge: 'ADS COMBAT',
    title: 'Aim Down Sights & Fire',
    instruction: 'Hold Right-Click (or E) to aim down sights and land 2 shots on the red Training Bot.',
  },
  {
    badge: 'RELOADING',
    title: 'Tactical Reload',
    instruction: 'Press R to reload your magazine and prepare for the next engagement.',
  },
  {
    badge: 'MELEE LUNGE',
    title: 'Melee Speed & Lunge',
    instruction: 'Press 3 to equip your Melee weapon, then Left-Click to dash forward and slash.',
  },
  {
    badge: 'UTILITY',
    title: 'Deploy Tactical Utility',
    instruction: 'Press 4 to select your Utility item, then Left-Click to deploy it in the arena.',
  },
  {
    badge: 'FINAL TEST',
    title: 'Eliminate the Training Bot',
    instruction: 'Switch back to 1 or 2 and defeat the red Training Bot to graduate Boot Camp!',
  },
] as const;

const INITIAL_HUD: RivalsHudSnapshot = {
  teamSize: 1,
  playerHp: MAX_HP,
  maxHp: MAX_HP,
  playerAlive: true,
  rivalHp: MAX_HP,
  alliesAlive: 1,
  enemiesAlive: 1,
  allyRoster: [],
  enemyRoster: [],
  playerRounds: 0,
  rivalRounds: 0,
  roundNumber: 1,
  roundsToWin: ROUNDS_TO_WIN,
  roundTimer: 90,
  activeSlot: 0,
  primaryAmmo: PRIMARY_WEAPONS.assault_rifle.magSize,
  secondaryAmmo: SECONDARY_WEAPONS.revolver.magSize,
  utilityCharges: UTILITY_ITEMS.grenade.charges,
  reloading: false,
  reloadProgress: 0,
  sliding: false,
  ads: false,
  dashReady: true,
  pointerLocked: false,
  roundBanner: null,
  damageFlash: 0,
  hitMarker: 'none',
  overheadMarkers: [],
  damagePopups: [],
  killFeed: [],
  totalDamageDealt: 0,
  kills: 0,
  headshots: 0,
  shotsFired: 0,
  shotsHit: 0,
  activePerkLabel: null,
  factToast: null,
  fps: 60,
  tutorial: {
    active: false,
    step: 0,
    totalSteps: TUTORIAL_STEPS.length,
    completed: false,
    moveDist: 0,
    hits: 0,
  },
};

interface QuizHistoryEntry {
  prompt: string;
  correctAnswer: string;
  explanation: string;
  wasCorrect: boolean;
}

export function ArenaShooter3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [gameState, setGameState] = useState<ShooterState>('TITLE_MENU');
  const [selectedMap, setSelectedMap] = useState<MapId>('splash');
  const [classLevel, setClassLevel] = useState<ClassLevel>(6);
  const [subject, setSubject] = useState<SubjectId>('mixed');
  const [qaModalOpen, setQaModalOpen] = useState(false);
  const [revealedQaIds, setRevealedQaIds] = useState<Record<string, boolean>>({});
  const [difficulty, setDifficulty] = useState<DifficultyId>('ranked');
  const [teamSize, setTeamSize] = useState<TeamSize>(1);
  const [loadout, setLoadout] = useState<LoadoutConfig>(DEFAULT_LOADOUT);
  const [weaponBuilds, setWeaponBuilds] = useState<WeaponBuildsMap>(() => loadWeaponBuilds());
  const [userTemplates, setUserTemplates] = useState<UserSavedTemplate[]>(() => loadUserTemplates());
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [workshopWeaponId, setWorkshopWeaponId] = useState<WeaponId>('assault_rifle');
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [crosshairConfig, setCrosshairConfig] = useState<CrosshairConfig>(() => loadCrosshairConfig());
  const [crosshairModalOpen, setCrosshairModalOpen] = useState(false);
  const [hud, setHud] = useState<RivalsHudSnapshot>(INITIAL_HUD);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [graphicsMode, setGraphicsMode] = useState<'ultra' | 'standard'>('ultra');
  const [webglError, setWebglError] = useState<string | null>(null);
  const [career, setCareer] = useState(() => loadCareerStats());
  const [lastMatchXp, setLastMatchXp] = useState<MatchXpBreakdown | null>(null);
  const fpsRef = useRef<number>(60);

  // Real-time WebSocket Multiplayer state
  const [callsign, setCallsign] = useState<string>(() => {
    try {
      return window.localStorage.getItem('rivals_callsign_v1') || 'STRIKER';
    } catch {
      return 'STRIKER';
    }
  });
  const [mpStatus, setMpStatus] = useState<MpConnectionStatus>('disconnected');
  const [mpPlayerId, setMpPlayerId] = useState<string | null>(null);
  const [mpRooms, setMpRooms] = useState<MpRoomSummary[]>([]);
  const [mpRoom, setMpRoom] = useState<MpRoomSnapshot | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [fillBots, setFillBots] = useState(true);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const mpClientRef = useRef<MultiplayerClient | null>(null);
  const mpRoomRef = useRef<MpRoomSnapshot | null>(null);
  const mpPlayerIdRef = useRef<string | null>(null);
  const mpActiveRoundNumRef = useRef<number>(0);
  const mpQuizRoundNumRef = useRef<number>(0);
  const mpGameOverRecordedRef = useRef<boolean>(false);

  useEffect(() => {
    saveCrosshairConfig(crosshairConfig);
  }, [crosshairConfig]);

  const [quizState, setQuizState] = useState<{
    roundNum: number;
    question: QuizQuestion;
    perk: RoundOverchargePerk;
    hadWrongAttempt: boolean;
    wrongFeedback: {
      chosenAnswer: string;
      correctAnswer: string;
      explanation: string;
    } | null;
    solved: boolean;
  } | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizHistoryEntry[]>([]);
  const [quizStats, setQuizStats] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
  const quizStatsRef = useRef({ correct: 0, total: 0, streak: 0, bestStreak: 0 });

  const quizStateRef = useRef<typeof quizState>(null);
  const gameStateRef = useRef<ShooterState>('TITLE_MENU');
  const mapRef = useRef<MapId>('splash');
  const classLevelRef = useRef<ClassLevel>(6);
  const subjectRef = useRef<SubjectId>('mixed');
  const difficultyRef = useRef<DifficultyId>('ranked');
  const teamSizeRef = useRef<TeamSize>(1);
  const loadoutRef = useRef<LoadoutConfig>(DEFAULT_LOADOUT);
  const weaponBuildsRef = useRef<WeaponBuildsMap>(weaponBuilds);
  const usedQuestionIdsRef = useRef<Set<string>>(loadUsedQuestionKeys());
  const onRequestNextRoundQuizRef = useRef<(roundNum: number) => void>(() => {});

  const apiRef = useRef<{
    prepareMatch: (cfg: LoadoutConfig) => void;
    startTutorial: () => void;
    skipTutorialStep: () => void;
    beginRound: (roundNum: number, perk: RoundOverchargePerk | null) => void;
    beginMpRound: (room: MpRoomSnapshot) => void;
    syncMpRoom: (room: MpRoomSnapshot | null) => void;
    handleMpFireFx: (msg: Extract<ServerMessage, { type: 'fire_fx' }>) => void;
    handleMpMeleeFx: (msg: Extract<ServerMessage, { type: 'melee_fx' }>) => void;
    handleMpWaterRipple: (msg: Extract<ServerMessage, { type: 'water_ripple' }>) => void;
    handleMpBouncePad: (msg: Extract<ServerMessage, { type: 'bounce_pad' }>) => void;
    handleMpPlayerDamaged: (msg: Extract<ServerMessage, { type: 'player_damaged' }>) => void;
    handleMpBotDamaged: (msg: Extract<ServerMessage, { type: 'bot_damaged' }>) => void;
    handleMpEntityKilled: (msg: Extract<ServerMessage, { type: 'entity_killed' }>) => void;
    handleMpOrbCollected: (msg: Extract<ServerMessage, { type: 'orb_collected' }>) => void;
    selectSlot: (slot: SlotIndex) => void;
    triggerReload: () => void;
    lockPointer: () => void;
    rebuildViewmodel: (cfg: LoadoutConfig, builds?: WeaponBuildsMap) => void;
    rebuildMap: (mapId: MapId) => void;
    setGraphicsMode: (mode: 'ultra' | 'standard') => void;
    cancelMatch: () => void;
  } | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    mapRef.current = selectedMap;
    apiRef.current?.rebuildMap(selectedMap);
  }, [selectedMap]);

  useEffect(() => {
    classLevelRef.current = classLevel;
  }, [classLevel]);

  useEffect(() => {
    subjectRef.current = subject;
  }, [subject]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    teamSizeRef.current = teamSize;
  }, [teamSize]);

  useEffect(() => {
    loadoutRef.current = loadout;
    apiRef.current?.rebuildViewmodel(loadout, weaponBuildsRef.current);
    mpClientRef.current?.updateProfile(callsign, loadout.primary, loadout.secondary);
  }, [loadout, callsign]);

  useEffect(() => {
    weaponBuildsRef.current = weaponBuilds;
    saveWeaponBuilds(weaponBuilds);
    apiRef.current?.rebuildViewmodel(loadoutRef.current, weaponBuilds);
  }, [weaponBuilds]);

  useEffect(() => {
    saveUserTemplates(userTemplates);
  }, [userTemplates]);

  const openWorkshopFor = useCallback((wId: WeaponId) => {
    setWorkshopWeaponId(wId);
    setCustomTemplateName('');
    setWorkshopOpen(true);
  }, []);

  const updateWeaponBuild = useCallback(
    (wId: WeaponId, patch: Partial<WeaponCustomBuild>, markCustom = true) => {
      setWeaponBuilds((prev) => ({
        ...prev,
        [wId]: {
          ...prev[wId],
          ...patch,
          templateId: markCustom ? 'custom' : patch.templateId ?? prev[wId].templateId,
          templateName: markCustom ? 'Custom Build' : patch.templateName ?? prev[wId].templateName,
        },
      }));
    },
    []
  );

  const equipWeaponInLoadout = useCallback((wId: WeaponId) => {
    const cat = getWeaponCategory(wId);
    setLoadout((prev) => {
      if (cat === 'primary') return { ...prev, primary: wId as PrimaryId };
      if (cat === 'secondary') return { ...prev, secondary: wId as SecondaryId };
      if (cat === 'melee') return { ...prev, melee: wId as MeleeId };
      return { ...prev, utility: wId as UtilityId };
    });
  }, []);

  const saveCurrentAsUserTemplate = useCallback(() => {
    const label = customTemplateName.trim() || `My ${workshopWeaponId.replace('_', ' ')}`;
    const newTpl: UserSavedTemplate = {
      id: `user_${Date.now()}`,
      weaponId: workshopWeaponId,
      name: label,
      build: {
        ...weaponBuildsRef.current[workshopWeaponId],
        templateId: `user_${Date.now()}`,
        templateName: label,
      },
    };
    setUserTemplates((prev) => [newTpl, ...prev]);
    setWeaponBuilds((prev) => ({
      ...prev,
      [workshopWeaponId]: newTpl.build,
    }));
    setCustomTemplateName('');
  }, [customTemplateName, workshopWeaponId]);

  const toggleMute = useCallback(() => {
    setSoundMuted((prev) => {
      const next = !prev;
      shooterAudio.setMuted(next);
      return next;
    });
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled((prev) => {
      const next = !prev;
      shooterAudio.setMusicEnabled(next);
      return next;
    });
  }, []);

  // Michael Jackson-inspired 80s synth-funk groove plays on home intro / post-match, stops during matches
  useEffect(() => {
    const shouldPlayLobbyMusic =
      (gameState === 'TITLE_MENU' || gameState === 'GAME_OVER') &&
      musicEnabled &&
      !soundMuted;
    if (shouldPlayLobbyMusic) {
      shooterAudio.startLobbyMusic();
    } else {
      shooterAudio.stopLobbyMusic();
    }
  }, [gameState, musicEnabled, soundMuted]);

  useEffect(() => {
    return () => {
      shooterAudio.stopLobbyMusic();
    };
  }, []);

  const toggleGraphicsMode = useCallback(() => {
    setGraphicsMode((prev) => {
      const next = prev === 'ultra' ? 'standard' : 'ultra';
      apiRef.current?.setGraphicsMode(next);
      return next;
    });
  }, []);

  const openRoundQuiz = useCallback((roundNum: number) => {
    if (document.pointerLockElement) document.exitPointerLock?.();
    const question = pickQuestion(
      subjectRef.current,
      classLevelRef.current,
      usedQuestionIdsRef.current
    );
    const perk = ROUND_PERKS[(roundNum - 1) % ROUND_PERKS.length];
    const nextState = {
      roundNum,
      question,
      perk,
      hadWrongAttempt: false,
      wrongFeedback: null,
      solved: false,
    };
    quizStateRef.current = nextState;
    setQuizState(nextState);
    gameStateRef.current = 'ROUND_QUIZ';
    setGameState('ROUND_QUIZ');
  }, []);

  useEffect(() => {
    onRequestNextRoundQuizRef.current = openRoundQuiz;
  }, [openRoundQuiz]);

  // Connect to Authoritative WebSocket Multiplayer Server
  useEffect(() => {
    const client = new MultiplayerClient();
    mpClientRef.current = client;

    const handleRoomUpdate = (room: MpRoomSnapshot, isRoundStart = false) => {
      mpRoomRef.current = room;
      setMpRoom(room);
      setMpError(null);

      // Sync room host configuration locally
      if (mapRef.current !== room.mapId) {
        mapRef.current = room.mapId;
        setSelectedMap(room.mapId);
      }
      if (teamSizeRef.current !== room.teamSize) {
        teamSizeRef.current = room.teamSize;
        setTeamSize(room.teamSize);
      }
      if (difficultyRef.current !== room.difficulty) {
        difficultyRef.current = room.difficulty;
        setDifficulty(room.difficulty);
      }

      apiRef.current?.syncMpRoom(room);

      if (room.phase === 'LOBBY') {
        mpActiveRoundNumRef.current = 0;
        mpQuizRoundNumRef.current = 0;
        mpGameOverRecordedRef.current = false;
        if (gameStateRef.current !== 'TITLE_MENU') {
          if (document.pointerLockElement) document.exitPointerLock?.();
          gameStateRef.current = 'TITLE_MENU';
          setGameState('TITLE_MENU');
        }
      } else if (room.phase === 'ROUND_QUIZ') {
        mpActiveRoundNumRef.current = 0;
        mpGameOverRecordedRef.current = false;
        if (room.roundNumber === 1 && mpQuizRoundNumRef.current !== 1) {
          shooterAudio.stopLobbyMusic();
          setLastMatchXp(null);
          setQuizHistory([]);
          const emptyQuiz = { correct: 0, total: 0, streak: 0, bestStreak: 0 };
          quizStatsRef.current = emptyQuiz;
          setQuizStats(emptyQuiz);
          apiRef.current?.prepareMatch(loadoutRef.current);
        }
        if (mpQuizRoundNumRef.current !== room.roundNumber || gameStateRef.current !== 'ROUND_QUIZ') {
          mpQuizRoundNumRef.current = room.roundNumber;
          openRoundQuiz(room.roundNumber);
        }
      } else if (room.phase === 'PLAYING') {
        if (isRoundStart || mpActiveRoundNumRef.current !== room.roundNumber || gameStateRef.current !== 'PLAYING') {
          mpActiveRoundNumRef.current = room.roundNumber;
          shooterAudio.stopLobbyMusic();
          setWorkshopOpen(false);
          setCrosshairModalOpen(false);
          setQaModalOpen(false);
          apiRef.current?.beginMpRound(room);
          gameStateRef.current = 'PLAYING';
          setGameState('PLAYING');
          apiRef.current?.lockPointer();
        }
      } else if (room.phase === 'ROUND_END') {
        if (gameStateRef.current !== 'ROUND_END') {
          if (document.pointerLockElement) document.exitPointerLock?.();
          const me = room.players.find((p) => p.id === mpPlayerIdRef.current);
          const myTeam: MpTeam = me?.team ?? 'alpha';
          const myRounds = myTeam === 'alpha' ? room.alphaRounds : room.omegaRounds;
          const prevMyRounds = myTeam === 'alpha' ? hud.playerRounds : hud.playerRounds;
          shooterAudio.playRoundEnd(myRounds >= prevMyRounds);
          gameStateRef.current = 'ROUND_END';
          setGameState('ROUND_END');
        }
      } else if (room.phase === 'GAME_OVER') {
        if (!mpGameOverRecordedRef.current) {
          mpGameOverRecordedRef.current = true;
          const me = room.players.find((p) => p.id === mpPlayerIdRef.current);
          const myTeam: MpTeam = me?.team ?? 'alpha';
          const myRounds = myTeam === 'alpha' ? room.alphaRounds : room.omegaRounds;
          const enemyRounds = myTeam === 'alpha' ? room.omegaRounds : room.alphaRounds;
          const wonMatch = myRounds > enemyRounds;
          const outcome = recordMatchPerformance({
            won: wonMatch,
            difficulty: room.difficulty,
            roundsWon: myRounds,
            kills: me?.kills ?? 0,
            headshots: 0,
            damageDealt: me?.damageDealt ?? 0,
            shotsFired: 0,
            shotsHit: 0,
            quizCorrect: quizStatsRef.current.correct,
            quizTotal: quizStatsRef.current.total,
          });
          setCareer(outcome.career);
          setLastMatchXp(outcome.breakdown);
          shooterAudio.playRoundEnd(wonMatch);
        }
        if (document.pointerLockElement) document.exitPointerLock?.();
        if (gameStateRef.current !== 'GAME_OVER') {
          gameStateRef.current = 'GAME_OVER';
          setGameState('GAME_OVER');
        }
      }
    };

    client.setCallbacks({
      onStatusChange: (status) => setMpStatus(status),
      onWelcome: (id, rooms) => {
        mpPlayerIdRef.current = id;
        setMpPlayerId(id);
        setMpRooms(rooms);
      },
      onRoomsList: (rooms) => setMpRooms(rooms),
      onRoomSnapshot: (room) => handleRoomUpdate(room, false),
      onRoundStarted: (_roundNum, room) => handleRoomUpdate(room, true),
      onRoomLeft: () => {
        mpRoomRef.current = null;
        mpActiveRoundNumRef.current = 0;
        mpQuizRoundNumRef.current = 0;
        mpGameOverRecordedRef.current = false;
        setMpRoom(null);
        apiRef.current?.syncMpRoom(null);
      },
      onRoomError: (message) => setMpError(message),
      onFireFx: (msg) => apiRef.current?.handleMpFireFx(msg),
      onMeleeFx: (msg) => apiRef.current?.handleMpMeleeFx(msg),
      onWaterRipple: (msg) => apiRef.current?.handleMpWaterRipple(msg),
      onBouncePad: (msg) => apiRef.current?.handleMpBouncePad(msg),
      onPlayerDamaged: (msg) => apiRef.current?.handleMpPlayerDamaged(msg),
      onBotDamaged: (msg) => apiRef.current?.handleMpBotDamaged(msg),
      onEntityKilled: (msg) => apiRef.current?.handleMpEntityKilled(msg),
      onOrbCollected: (msg) => apiRef.current?.handleMpOrbCollected(msg),
    });

    client.connect({
      name: callsign,
      primary: loadoutRef.current.primary,
      secondary: loadoutRef.current.secondary,
    });

    return () => {
      client.disconnect();
      mpClientRef.current = null;
    };
  }, [openRoundQuiz]);

  const handleCallsignChange = useCallback((nextName: string) => {
    const clean = nextName.toUpperCase().slice(0, 16);
    setCallsign(clean);
    try {
      window.localStorage.setItem('rivals_callsign_v1', clean);
    } catch {
      // ignore storage errors
    }
    mpClientRef.current?.updateProfile(clean || 'STRIKER', loadoutRef.current.primary, loadoutRef.current.secondary);
  }, []);

  const handleMapSelect = useCallback((mapId: MapId) => {
    setSelectedMap(mapId);
    const room = mpRoomRef.current;
    if (room && room.hostId === mpPlayerIdRef.current) {
      mpClientRef.current?.updateRoomSettings({ mapId });
    }
  }, []);

  const handleTeamSizeSelect = useCallback((sz: TeamSize) => {
    setTeamSize(sz);
    const room = mpRoomRef.current;
    if (room && room.hostId === mpPlayerIdRef.current) {
      mpClientRef.current?.updateRoomSettings({ teamSize: sz });
    }
  }, []);

  const handleDifficultySelect = useCallback((diffId: DifficultyId) => {
    setDifficulty(diffId);
    const room = mpRoomRef.current;
    if (room && room.hostId === mpPlayerIdRef.current) {
      mpClientRef.current?.updateRoomSettings({ difficulty: diffId });
    }
  }, []);

  const handleFillBotsToggle = useCallback((next: boolean) => {
    setFillBots(next);
    const room = mpRoomRef.current;
    if (room && room.hostId === mpPlayerIdRef.current) {
      mpClientRef.current?.updateRoomSettings({ fillBots: next });
    }
  }, []);

  const createMpRoom = useCallback(
    (autoStart = false) => {
      setMpError(null);
      mpClientRef.current?.createRoom({
        mapId: mapRef.current,
        teamSize: teamSizeRef.current,
        difficulty: difficultyRef.current,
        fillBots,
        autoStart,
      });
    },
    [fillBots]
  );

  const joinMpRoom = useCallback((code: string) => {
    if (!code.trim()) return;
    setMpError(null);
    mpClientRef.current?.joinRoom(code.trim().toUpperCase());
  }, []);

  const quickJoinMpRoom = useCallback(() => {
    setMpError(null);
    mpClientRef.current?.quickJoin({
      mapId: mapRef.current,
      teamSize: teamSizeRef.current,
      difficulty: difficultyRef.current,
      fillBots,
    });
  }, [fillBots]);

  const copyInviteLink = useCallback((code: string) => {
    const url = `${window.location.origin}?room=${code}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedInvite(true);
    window.setTimeout(() => setCopiedInvite(false), 2000);
  }, []);

  const startDuel = useCallback(() => {
    shooterAudio.stopLobbyMusic();
    setLastMatchXp(null);
    setQuizHistory([]);
    const emptyQuiz = { correct: 0, total: 0, streak: 0, bestStreak: 0 };
    quizStatsRef.current = emptyQuiz;
    setQuizStats(emptyQuiz);

    const activeRoom = mpRoomRef.current;
    if (activeRoom) {
      if (activeRoom.phase === 'GAME_OVER') {
        mpClientRef.current?.requestRematch();
      } else if (activeRoom.hostId === mpPlayerIdRef.current) {
        mpClientRef.current?.startMatch();
      }
      return;
    }

    if (mpClientRef.current && mpStatus === 'connected') {
      mpClientRef.current.createRoom({
        mapId: mapRef.current,
        teamSize: teamSizeRef.current,
        difficulty: difficultyRef.current,
        fillBots,
        autoStart: true,
      });
      return;
    }

    // Offline fallback if WebSocket not yet connected
    apiRef.current?.prepareMatch(loadoutRef.current);
    openRoundQuiz(1);
  }, [fillBots, mpStatus, openRoundQuiz]);

  const startTutorial = useCallback(() => {
    if (mpRoomRef.current) {
      mpClientRef.current?.leaveRoom();
    }
    shooterAudio.stopLobbyMusic();
    setWorkshopOpen(false);
    setCrosshairModalOpen(false);
    setQaModalOpen(false);
    apiRef.current?.startTutorial();
    gameStateRef.current = 'PLAYING';
    setGameState('PLAYING');
    apiRef.current?.lockPointer();
  }, []);

  const skipTutorialStep = useCallback(() => {
    apiRef.current?.skipTutorialStep();
  }, []);

  const swapQuizQuestion = useCallback(() => {
    const prev = quizStateRef.current;
    if (!prev || prev.solved) return;
    const nextQ = pickQuestion(
      subjectRef.current,
      classLevelRef.current,
      usedQuestionIdsRef.current,
      prev.question.prompt
    );
    const nextState = { ...prev, question: nextQ, wrongFeedback: null };
    quizStateRef.current = nextState;
    setQuizState(nextState);
  }, []);

  const answerQuiz = useCallback((choiceIdx: number) => {
    const prev = quizStateRef.current;
    if (!prev || prev.solved) return;
    const isCorrect = choiceIdx === prev.question.correctIndex;
    if (isCorrect) shooterAudio.playHeal();
    else shooterAudio.playPlayerHit();

    setQuizStats((s) => {
      const nextStreak = isCorrect ? s.streak + 1 : 0;
      const nextStats = {
        correct: s.correct + (isCorrect ? 1 : 0),
        total: s.total + 1,
        streak: nextStreak,
        bestStreak: Math.max(s.bestStreak, nextStreak),
      };
      quizStatsRef.current = nextStats;
      return nextStats;
    });

    if (isCorrect) {
      const firstTry = !prev.hadWrongAttempt;
      setQuizHistory((h) => [
        ...h,
        {
          prompt: prev.question.prompt,
          correctAnswer: prev.question.choices[prev.question.correctIndex],
          explanation: prev.question.explanation,
          wasCorrect: firstTry,
        },
      ]);
      const nextState = { ...prev, solved: true, wrongFeedback: null };
      quizStateRef.current = nextState;
      setQuizState(nextState);

      if (mpRoomRef.current) {
        const earnedPerk = firstTry ? prev.perk : null;
        mpClientRef.current?.submitQuizReady(
          earnedPerk?.label ?? null,
          earnedPerk?.bonusHp ?? 0,
          earnedPerk?.damageMult ?? 1
        );
      }
      return;
    }

    // Wrong answer: record missed question and immediately move to a brand-new question
    setQuizHistory((h) => [
      ...h,
      {
        prompt: prev.question.prompt,
        correctAnswer: prev.question.choices[prev.question.correctIndex],
        explanation: prev.question.explanation,
        wasCorrect: false,
      },
    ]);
    const nextQ = pickQuestion(
      subjectRef.current,
      classLevelRef.current,
      usedQuestionIdsRef.current,
      prev.question.prompt
    );
    const nextState = {
      ...prev,
      question: nextQ,
      hadWrongAttempt: true,
      wrongFeedback: {
        chosenAnswer: prev.question.choices[choiceIdx],
        correctAnswer: prev.question.choices[prev.question.correctIndex],
        explanation: prev.question.explanation,
      },
    };
    quizStateRef.current = nextState;
    setQuizState(nextState);
  }, []);

  const deployRoundFromQuiz = useCallback(() => {
    if (!quizState || !quizState.solved) return;
    const earnedPerk = !quizState.hadWrongAttempt ? quizState.perk : null;
    if (mpRoomRef.current) {
      mpClientRef.current?.submitQuizReady(
        earnedPerk?.label ?? null,
        earnedPerk?.bonusHp ?? 0,
        earnedPerk?.damageMult ?? 1
      );
      return;
    }
    apiRef.current?.beginRound(quizState.roundNum, earnedPerk);
    gameStateRef.current = 'PLAYING';
    setGameState('PLAYING');
    apiRef.current?.lockPointer();
  }, [quizState]);

  const pauseDuel = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock?.();
    setGameState('PAUSED');
  }, []);

  const resumeDuel = useCallback(() => {
    setGameState('PLAYING');
    apiRef.current?.lockPointer();
  }, []);

  const exitToLobby = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock?.();
    if (mpRoomRef.current) {
      mpClientRef.current?.leaveRoom();
    }
    apiRef.current?.cancelMatch();
    quizStateRef.current = null;
    setQuizState(null);
    gameStateRef.current = 'TITLE_MENU';
    setGameState('TITLE_MENU');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameStateRef.current === 'ROUND_QUIZ') {
        if (e.code === 'Digit1') answerQuiz(0);
        else if (e.code === 'Digit2') answerQuiz(1);
        else if (e.code === 'Digit3') answerQuiz(2);
        else if (e.code === 'Digit4') answerQuiz(3);
        else if ((e.code === 'Enter' || e.code === 'Space') && quizState?.solved) {
          e.preventDefault();
          deployRoundFromQuiz();
        }
        return;
      }
      if (e.code === 'KeyH') setDockCollapsed((c) => !c);
      else if (e.code === 'KeyP') {
        if (gameStateRef.current === 'PLAYING') pauseDuel();
        else if (gameStateRef.current === 'PAUSED') resumeDuel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answerQuiz, deployRoundFromQuiz, pauseDuel, quizState?.solved, resumeDuel]);

  // Mount Three.js Engine
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param) ?? '');
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL is unavailable on this browser.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('3D context lost. Reload page to continue.');
    };
    const onContextRestored = () => setWebglError(null);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // Map-Driven Sky, Fog & Atmospheric Lighting
    let currentMapId: MapId = mapRef.current;
    const initMapSpec = ARENA_MAPS[currentMapId];

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(initMapSpec.skyColor);
    const fog = new THREE.FogExp2(initMapSpec.skyColor, initMapSpec.fogDensity);
    scene.fog = fog;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      76,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      260
    );
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    const getSkyColorsForMap = (mapId: MapId): [string, string, string, boolean] => {
      if (mapId === 'construction') return ['#0f0b1e', '#2d1c3d', '#fbbf24', true];
      if (mapId === 'hydro' || mapId === 'splash') return ['#075985', '#38bdf8', '#fef3c7', false];
      if (mapId === 'docks') return ['#020617', '#0f172a', '#38bdf8', true];
      return ['#020617', '#0c2344', '#38bdf8', true];
    };

    const [zHex, hHex, sHex, isNightSky] = getSkyColorsForMap(currentMapId);
    let skyTex = createSkyDomeTexture(zHex, hHex, sHex, isNightSky);
    const skyGeo = new THREE.SphereGeometry(185, 28, 18);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    const hemi = new THREE.HemisphereLight(initMapSpec.hemiSky, initMapSpec.hemiGround, 0.96);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(initMapSpec.sunColor, initMapSpec.sunIntensity);
    sun.position.set(28, 46, 22);
    sun.castShadow = !isSoftwareGl;
    sun.shadow.mapSize.set(isSoftwareGl ? 1024 : 2048, isSoftwareGl ? 1024 : 2048);
    sun.shadow.camera.near = 6;
    sun.shadow.camera.far = 145;
    sun.shadow.camera.left = -54;
    sun.shadow.camera.right = 54;
    sun.shadow.camera.top = 54;
    sun.shadow.camera.bottom = -54;
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 2.2;
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x38bdf8, 0.38);
    rim.position.set(-28, 18, -32);
    scene.add(rim);

    const muzzleLight = new THREE.PointLight(0xfbbf24, 0, 12, 2);
    camera.add(muzzleLight);
    muzzleLight.position.set(0.25, -0.15, -1.0);

    const explosionLight = new THREE.PointLight(0xf97316, 0, 26, 2);
    scene.add(explosionLight);

    // GPU Post-Processing Pipeline (4x MSAA HalfFloat target + Crisp Filmic Lens Shader, no shiny bloom)
    let composer: EffectComposer | null = null;
    let composerTarget: THREE.WebGLRenderTarget | null = null;
    let lensPass: ShaderPass | null = null;
    if (!isSoftwareGl) {
      const cw = Math.max(1, container.clientWidth);
      const ch = Math.max(1, container.clientHeight);
      const pr = Math.min(window.devicePixelRatio, 2);
      composerTarget = new THREE.WebGLRenderTarget(
        Math.floor(cw * pr),
        Math.floor(ch * pr),
        {
          type: THREE.HalfFloatType,
          samples: 4,
        }
      );
      composer = new EffectComposer(renderer, composerTarget);
      composer.setPixelRatio(pr);
      composer.setSize(cw, ch);
      composer.addPass(new RenderPass(scene, camera));
      lensPass = new ShaderPass(CinematicLensShader);
      lensPass.uniforms.uTexelSize.value.set(1 / Math.max(1, cw * pr), 1 / Math.max(1, ch * pr));
      composer.addPass(lensPass);
      composer.addPass(new OutputPass());
    }

    // Procedural PBR Texture Sets & Shared Material Palette
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    let floorTexSet: TerrainTextureSet = createTerrainTextureSet(
      maxAniso,
      initMapSpec.floorBaseHex,
      initMapSpec.floorAltHex,
      initMapSpec.floorLineHex,
      26,
      currentMapId
    );
    let floorMarkingsTex = createArenaFloorMarkingsTexture(currentMapId, maxAniso);
    let containerASet: ContainerTextureSet = createContainerTextureSet(
      initMapSpec.containerA[0],
      initMapSpec.containerA[1],
      maxAniso,
      'RVL-A1'
    );
    let containerBSet: ContainerTextureSet = createContainerTextureSet(
      initMapSpec.containerB[0],
      initMapSpec.containerB[1],
      maxAniso,
      'RVL-B2'
    );
    let neutralSet: ContainerTextureSet = createContainerTextureSet(
      initMapSpec.containerNeutral[0],
      initMapSpec.containerNeutral[1],
      maxAniso,
      'SEC-09'
    );
    const shadowTex = createContactShadowTexture();
    const particleTex = createSoftParticleTexture();
    const domeGlassTex = createDomeGlassTexture(maxAniso);
    const grassTexSet = createGrassDirtTextureSet(maxAniso, 68, 'grass');
    const dirtTexSet = createGrassDirtTextureSet(maxAniso, 48, 'dirt');
    const bridgeTexSet = createBridgeDeckTextureSet(maxAniso, 4, 4);
    const gunmetalTexSet = createGunmetalTextureSet(maxAniso);
    const fabricTexSet = createFabricTextureSet(maxAniso);
    const concreteTexSet = createConcreteTextureSet(maxAniso);
    const rockTexSet = createRockTextureSet(maxAniso);
    const barkTexSet = createBarkTextureSet(maxAniso);

    // Atmospheric Dust Motes / Embers / Sea Mist (never obscures target silhouettes)
    const dustCount = 260;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSpeeds = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 64;
      dustPositions[i * 3 + 1] = 0.6 + Math.random() * 14.5;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 64;
      dustSpeeds[i] = 0.22 + Math.random() * 0.5;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const getDustColorForMap = (mapId: MapId) =>
      mapId === 'docks'
        ? 0x38bdf8
        : mapId === 'construction'
        ? 0xfbbf24
        : mapId === 'hydro' || mapId === 'splash'
        ? 0x67e8f9
        : 0x7dd3fc;
    const dustMat = new THREE.PointsMaterial({
      map: particleTex,
      color: getDustColorForMap(currentMapId),
      size: 0.12,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    const mats: MaterialPalette = createMaterialPalette(
      containerASet,
      containerBSet,
      neutralSet,
      bridgeTexSet,
      gunmetalTexSet,
      fabricTexSet,
      concreteTexSet,
      rockTexSet
    );
    const sharedMatSet = new Set<THREE.Material>(Object.values(mats));

    // Continuous Terrain (Flat Arena + Hydro/Splash Pool Dip + Natural Outer Ridges)
    const terrainGeo = new THREE.PlaneGeometry(240, 240, 96, 96);
    terrainGeo.rotateX(-Math.PI / 2);
    const updateTerrainGeometry = (mapId: MapId) => {
      const spec = ARENA_MAPS[mapId];
      const posAttr = terrainGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        const absX = Math.abs(vx);
        const absZ = Math.abs(vz);
        if (mapId === 'hydro') {
          if (absX <= spec.halfX + 1.2 && absZ <= spec.halfZ + 1.2) {
            posAttr.setY(i, absX <= 13.5 && absZ <= 13.5 ? -0.56 : -0.14);
          } else {
            posAttr.setY(i, getMapFloorHeightAt(mapId, vx, vz));
          }
        } else if (mapId === 'splash') {
          if (absX <= spec.halfX + 1.2 && absZ <= spec.halfZ + 1.2) {
            posAttr.setY(i, absX <= 14.0 && absZ <= 14.0 ? -0.58 : -0.22);
          } else {
            posAttr.setY(i, getMapFloorHeightAt(mapId, vx, vz));
          }
        } else if (absX <= spec.halfX + 4 && absZ <= spec.halfZ + 4) {
          posAttr.setY(i, 0);
        } else {
          posAttr.setY(i, getMapFloorHeightAt(mapId, vx, vz));
        }
      }
      posAttr.needsUpdate = true;
      terrainGeo.computeVertexNormals();
    };
    updateTerrainGeometry(currentMapId);

    const getMapShaderMode = (mapId: MapId) =>
      mapId === 'construction'
        ? 1
        : mapId === 'hydro' || mapId === 'splash'
        ? 2
        : mapId === 'docks'
        ? 3
        : 0;

    const getFloorNormalForMap = (mapId: MapId) =>
      mapId === 'hydro' || mapId === 'splash' ? floorTexSet.normalMap : grassTexSet.normalMap;

    const getFloorRoughnessForMap = (mapId: MapId) =>
      mapId === 'hydro' || mapId === 'splash' ? floorTexSet.roughnessMap : grassTexSet.roughnessMap;

    const terrainUniforms = {
      uTerrainHalf: { value: new THREE.Vector2(initMapSpec.halfX, initMapSpec.halfZ) },
      uGrassMap: { value: grassTexSet.map },
      uDirtMap: { value: dirtTexSet.map },
      uRockMap: { value: rockTexSet.map },
      uMapMode: { value: getMapShaderMode(currentMapId) },
      uTerrainWaterTime: { value: 0 },
    };

    const terrainMat = new THREE.MeshStandardMaterial({
      map: floorTexSet.map,
      normalMap: getFloorNormalForMap(currentMapId),
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughnessMap: getFloorRoughnessForMap(currentMapId),
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0.16,
    });
    terrainMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTerrainHalf = terrainUniforms.uTerrainHalf;
      shader.uniforms.uGrassMap = terrainUniforms.uGrassMap;
      shader.uniforms.uDirtMap = terrainUniforms.uDirtMap;
      shader.uniforms.uRockMap = terrainUniforms.uRockMap;
      shader.uniforms.uMapMode = terrainUniforms.uMapMode;
      shader.uniforms.uTerrainWaterTime = terrainUniforms.uTerrainWaterTime;
      shader.vertexShader =
        `varying vec2 vTerrainWorldXZ;\nvarying float vTerrainNormalY;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vTerrainWorldXZ = (modelMatrix * vec4(transformed, 1.0)).xz;
          vTerrainNormalY = normal.y;
          `
        );
      shader.fragmentShader =
        `uniform vec2 uTerrainHalf;\nuniform sampler2D uGrassMap;\nuniform sampler2D uDirtMap;\nuniform sampler2D uRockMap;\nuniform float uMapMode;\nuniform float uTerrainWaterTime;\nvarying vec2 vTerrainWorldXZ;\nvarying float vTerrainNormalY;\n` +
        shader.fragmentShader
          .replace(
            '#include <map_fragment>',
            `
            #include <map_fragment>
            vec2 rotUv = vec2(vTerrainWorldXZ.x * 0.8 - vTerrainWorldXZ.y * 0.6, vTerrainWorldXZ.x * 0.6 + vTerrainWorldXZ.y * 0.8) * 0.095;
            vec2 macroUv = vec2(vTerrainWorldXZ.x * 0.55 + vTerrainWorldXZ.y * 0.83, -vTerrainWorldXZ.x * 0.83 + vTerrainWorldXZ.y * 0.55) * 0.032;
            vec3 grassFine = texture2D(uGrassMap, vTerrainWorldXZ * 0.34).rgb;
            vec3 grassMid = texture2D(uGrassMap, rotUv).rgb;
            vec3 grassMacro = texture2D(uGrassMap, macroUv).rgb;
            vec3 dirtFine = texture2D(uDirtMap, vTerrainWorldXZ * 0.22).rgb;
            vec3 dirtMacro = texture2D(uDirtMap, rotUv * 0.92).rgb;
            vec3 rockCol = texture2D(uRockMap, vTerrainWorldXZ * 0.09).rgb;
            float n1 = sin(vTerrainWorldXZ.x * 0.16) * cos(vTerrainWorldXZ.y * 0.15);
            float n2 = sin((vTerrainWorldXZ.x - vTerrainWorldXZ.y) * 0.085);
            float n3 = cos((vTerrainWorldXZ.x + vTerrainWorldXZ.y) * 0.038);
            float organic = clamp(0.5 + n1 * 0.3 + n2 * 0.22 + n3 * 0.14, 0.0, 1.0);

            // Multi-octave anti-tiled botanical meadow color
            vec3 grassBase = mix(mix(grassFine, grassMid, 0.36), grassMacro, 0.22);
            vec3 lushShade = grassBase * mix(vec3(0.84, 0.94, 0.78), vec3(1.12, 1.06, 0.88), organic);
            vec3 grassCol = mix(lushShade, grassBase * vec3(0.95, 0.92, 0.72), smoothstep(0.68, 0.98, n3 * 0.5 + 0.5) * 0.28);

            vec3 dirtCol = mix(dirtFine, dirtMacro, 0.34);
            float edgeDist = max(abs(vTerrainWorldXZ.x) - (uTerrainHalf.x + 1.0), abs(vTerrainWorldXZ.y) - (uTerrainHalf.y + 1.0));
            float outerMix = smoothstep(0.0, 4.2, edgeDist);
            float slopeRock = smoothstep(0.94, 0.72, vTerrainNormalY) * smoothstep(2.0, 7.0, edgeDist);

            if (uMapMode < 0.5) {
              // Arena: Packed dirt central combat trail & stone spawn pads framed by lush grassy flanks & hills
              vec3 richDirt = dirtCol * mix(0.84, 1.12, organic);
              float flankGrass = smoothstep(5.2, 11.5, abs(vTerrainWorldXZ.x) + (organic - 0.5) * 4.5);
              float spawnPad = step(23.5, abs(vTerrainWorldXZ.y)) * (1.0 - smoothstep(7.5, 9.5, abs(vTerrainWorldXZ.x)));
              vec3 arenaSurface = mix(richDirt, grassCol, flankGrass * (1.0 - spawnPad));
              vec3 arenaCol = mix(arenaSurface, diffuseColor.rgb, spawnPad * 0.74);
              vec3 outerGrass = mix(grassCol, rockCol * 0.92, slopeRock * 0.8);
              diffuseColor.rgb = mix(arenaCol, outerGrass, outerMix);
            } else if (uMapMode < 1.5) {
              // Construction: Lush natural meadow grass ground with worn earth trails, deck pads & slope rock
              float pathMask = smoothstep(0.76, 0.98, organic) * 0.28;
              vec3 grassGround = mix(grassCol, dirtCol, pathMask);
              float deckPad = smoothstep(9.5, 11.5, abs(vTerrainWorldXZ.x)) * (1.0 - smoothstep(17.0, 19.0, abs(vTerrainWorldXZ.x))) * (1.0 - smoothstep(11.5, 14.5, abs(vTerrainWorldXZ.y)));
              vec3 constrCol = mix(grassGround, diffuseColor.rgb, deckPad * 0.75);
              vec3 outerTurf = mix(grassCol, rockCol * 0.92, slopeRock * 0.74);
              diffuseColor.rgb = mix(constrCol, outerTurf, outerMix);
            } else if (uMapMode < 2.5) {
              // Splash (Hydro Dome): Submerged mosaic ceramic tiles with dancing underwater caustics -> lagoon seabed -> coastal tropical hills
              float poolInner = 1.0 - smoothstep(13.2, 14.0, max(abs(vTerrainWorldXZ.x), abs(vTerrainWorldXZ.y)));
              vec2 cUv1 = vTerrainWorldXZ * 0.56 + vec2(uTerrainWaterTime * 0.24, -uTerrainWaterTime * 0.18);
              vec2 cUv2 = vTerrainWorldXZ * 0.72 + vec2(-uTerrainWaterTime * 0.21, uTerrainWaterTime * 0.26);
              float caust = pow(clamp(1.0 - abs(sin(cUv1.x * 2.8 + sin(cUv1.y * 2.5)) + cos(cUv2.y * 3.0 + cos(cUv2.x * 2.7))) * 0.55, 0.0, 1.0), 3.5);
              vec3 tileBed = diffuseColor.rgb * mix(vec3(0.74, 0.95, 1.0), vec3(0.45, 0.82, 0.96), poolInner);
              tileBed += vec3(0.32, 0.68, 0.78) * caust * 0.42;

              float lagoonZone = smoothstep(-0.2, 0.8, edgeDist);
              vec3 sandCoast = dirtCol * vec3(1.12, 1.04, 0.86) * mix(0.88, 1.06, organic);
              vec3 seabed = mix(sandCoast, vec3(0.025, 0.28, 0.44), 0.76);
              float coastGrassMask = smoothstep(16.0, 21.5, edgeDist);
              float wetShoreMask = smoothstep(14.5, 17.5, edgeDist);
              vec3 coastalIsland = mix(sandCoast, mix(grassCol, rockCol * 0.96, slopeRock * 0.72), coastGrassMask);
              vec3 outerWorld = mix(seabed, coastalIsland, wetShoreMask);
              diffuseColor.rgb = mix(tileBed, outerWorld, lagoonZone);
            } else {
              // Docks: Natural meadow grass ground across the pier with subtle worn earth patches
              float wornPatch = smoothstep(0.74, 0.97, organic) * 0.34;
              vec3 dockGround = mix(grassCol, dirtCol, wornPatch);
              diffuseColor.rgb = mix(dockGround, grassCol * 0.86, outerMix);
            }
            `
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `
            #include <roughnessmap_fragment>
            roughnessFactor = clamp(roughnessFactor, 0.74, 0.97);
            `
          );
    };
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Outer sculpted craggy canyon cliff formations + multi-tier pine trees + 3D grass tufts & pebbles
    const spireGeo = new THREE.CylinderGeometry(1.9, 5.6, 22, 10, 6);
    {
      const sPos = spireGeo.attributes.position;
      for (let i = 0; i < sPos.count; i++) {
        const vx = sPos.getX(i);
        const vy = sPos.getY(i);
        const vz = sPos.getZ(i);
        const ang = Math.atan2(vz, vx);
        const j = 1 + Math.sin(ang * 3 + vy * 0.35) * 0.24 + Math.cos(ang * 5 - vy * 0.2) * 0.12;
        sPos.setX(i, vx * j);
        sPos.setZ(i, vz * j);
      }
      spireGeo.computeVertexNormals();
    }
    const spireCount = 38;
    const spireInstanced = new THREE.InstancedMesh(spireGeo, mats.rockMat, spireCount);
    spireInstanced.castShadow = !isSoftwareGl;
    spireInstanced.receiveShadow = true;

    const treeTrunkGeo = new THREE.CylinderGeometry(0.24, 0.42, 4.0, 8);
    const treeTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x7c583c,
      map: barkTexSet.map,
      normalMap: barkTexSet.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughnessMap: barkTexSet.roughnessMap,
      roughness: 0.94,
    });
    // Build realistic 3-tier overlapping pine bough geometry (single draw call via InstancedMesh)
    const treeCrownGeo = new THREE.BufferGeometry();
    {
      const tierSpecs: Array<{ r: number; h: number; y: number }> = [
        { r: 2.35, h: 3.4, y: 0.0 },
        { r: 1.85, h: 3.1, y: 1.75 },
        { r: 1.25, h: 2.6, y: 3.35 },
      ];
      const posChunks: Float32Array[] = [];
      const normChunks: Float32Array[] = [];
      let totalVerts = 0;
      for (const t of tierSpecs) {
        const c = new THREE.ConeGeometry(t.r, t.h, 9, 2).toNonIndexed();
        c.translate(0, t.y, 0);
        const p = c.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < p.count; k++) {
          const px = p.getX(k);
          const py = p.getY(k);
          const pz = p.getZ(k);
          const ang = Math.atan2(pz, px);
          const jag = 1 + Math.sin(ang * 5 + t.y) * 0.12;
          p.setXYZ(k, px * jag, py, pz * jag);
        }
        c.computeVertexNormals();
        posChunks.push(c.attributes.position.array as Float32Array);
        normChunks.push(c.attributes.normal.array as Float32Array);
        totalVerts += p.count;
        c.dispose();
      }
      const mergedPos = new Float32Array(totalVerts * 3);
      const mergedNorm = new Float32Array(totalVerts * 3);
      let off = 0;
      for (let idx = 0; idx < posChunks.length; idx++) {
        mergedPos.set(posChunks[idx], off);
        mergedNorm.set(normChunks[idx], off);
        off += posChunks[idx].length;
      }
      treeCrownGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
      treeCrownGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    }
    const treeCrownMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0,
      flatShading: true,
    });
    const treeCount = 64;
    const treeTrunkInst = new THREE.InstancedMesh(treeTrunkGeo, treeTrunkMat, treeCount);
    const treeCrownInst = new THREE.InstancedMesh(treeCrownGeo, treeCrownMat, treeCount);
    treeTrunkInst.castShadow = !isSoftwareGl;
    treeTrunkInst.receiveShadow = true;
    treeCrownInst.castShadow = !isSoftwareGl;
    treeCrownInst.receiveShadow = true;

    // 3D Curved Botanical Grass Clusters (wind-swaying, subsurface-lit InstancedMesh)
    const grassTuftGeo = createGrassBladeClusterGeometry();
    const grassMatHandle = createGrassBladeMaterial(sun.position, initMapSpec.sunColor);
    const grassTuftMat = grassMatHandle.material;
    const grassTimeUniform = grassMatHandle.timeUniform;
    const grassCount = 7600;
    const grassInstanced = new THREE.InstancedMesh(grassTuftGeo, grassTuftMat, grassCount);
    grassInstanced.receiveShadow = true;

    const pebbleGeo = new THREE.DodecahedronGeometry(0.14, 0);
    const pebbleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.96,
      metalness: 0,
      envMapIntensity: 0,
      flatShading: true,
    });
    const pebbleCount = 190;
    const pebbleInstanced = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleCount);
    pebbleInstanced.receiveShadow = true;

    const isClearGroundSpot = (mapId: MapId, x: number, z: number) => {
      const absX = Math.abs(x);
      const absZ = Math.abs(z);
      if (mapId === 'arena') {
        if (absX < 13.8 && absZ < 6.4) return false;
        if (absZ >= 22.0 && absX <= 9.6) return false;
      }
      if (mapId === 'construction' && ((absX >= 9.6 && absX <= 18.4 && absZ <= 19.8) || (absX <= 11.0 && absZ <= 3.6))) {
        return false;
      }
      if ((mapId === 'hydro' || mapId === 'splash') && absX < 18.2 && absZ < 18.2) return false;
      if (mapId === 'docks' && absX >= 15.2 && absX <= 24.8 && absZ <= 17.4) return false;
      const boxes = getMapBoxes(mapId);
      for (const b of boxes) {
        if ((b.minY ?? 0) > 0.25) continue;
        if (Math.abs(x - b.x) < b.w / 2 + 0.9 && Math.abs(z - b.z) < b.d / 2 + 0.9) return false;
      }
      return true;
    };

    const updateSpires = (mapId: MapId) => {
      const spec = ARENA_MAPS[mapId];
      for (let i = 0; i < spireCount; i++) {
        const a = (i / spireCount) * Math.PI * 2;
        const r = 54 + ((i * 13) % 24);
        const sx = Math.cos(a) * r;
        const sz = Math.sin(a) * r;
        const sy = getMapFloorHeightAt(mapId, sx, sz) + 4.5;
        const scaleXZ = 0.85 + ((i * 17) % 45) / 100;
        const scaleY = 0.65 + ((i * 23) % 90) / 100;
        _scaleVec.set(scaleXZ, scaleY, scaleXZ);
        _quat.setFromEuler(new THREE.Euler(0, a * 1.7, 0));
        _v1.set(sx, sy, sz);
        _mat4.compose(_v1, _quat, _scaleVec);
        spireInstanced.setMatrixAt(i, _mat4);
        const s = 0.82 + ((i * 11) % 24) / 100;
        _tintColor.setRGB(s * 0.88, s * 0.92, s);
        spireInstanced.setColorAt(i, _tintColor);
      }
      spireInstanced.instanceMatrix.needsUpdate = true;
      if (spireInstanced.instanceColor) spireInstanced.instanceColor.needsUpdate = true;
      spireInstanced.computeBoundingSphere();
      spireInstanced.visible = mapId !== 'docks';

      const showTrees = mapId !== 'docks';
      treeTrunkInst.visible = showTrees;
      treeCrownInst.visible = showTrees;
      if (showTrees) {
        for (let i = 0; i < treeCount; i++) {
          const a = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.08;
          const r = ((mapId === 'hydro' || mapId === 'splash') ? 56 : 42) + ((i * 19) % 24);
          const tx = Math.cos(a) * r;
          const tz = Math.sin(a) * r;
          const baseH = getMapFloorHeightAt(mapId, tx, tz);
          const sc = 0.8 + ((i * 13) % 45) / 100;
          _scaleVec.set(sc, sc, sc);
          _quat.setFromEuler(new THREE.Euler(0, a, 0));
          _v1.set(tx, baseH + 1.8 * sc, tz);
          _mat4.compose(_v1, _quat, _scaleVec);
          treeTrunkInst.setMatrixAt(i, _mat4);

          _v1.set(tx, baseH + 5.8 * sc, tz);
          _mat4.compose(_v1, _quat, _scaleVec);
          treeCrownInst.setMatrixAt(i, _mat4);

          const gShade = 0.78 + ((i * 7) % 30) / 100;
          _tintColor.setRGB(gShade * 0.75, gShade, gShade * 0.72);
          treeCrownInst.setColorAt(i, _tintColor);
        }
        treeTrunkInst.instanceMatrix.needsUpdate = true;
        treeCrownInst.instanceMatrix.needsUpdate = true;
        if (treeCrownInst.instanceColor) treeCrownInst.instanceColor.needsUpdate = true;
        treeTrunkInst.computeBoundingSphere();
        treeCrownInst.computeBoundingSphere();
      }

      // Scatter dense 3D curved wind-swaying botanical grass clusters across grassy areas
      grassInstanced.visible = true;
      populateGrassInstances(
        grassInstanced,
        grassCount,
        mapId,
        getMapFloorHeightAt,
        isClearGroundSpot
      );

      // Scatter 3D low-profile pebbles & stones along dirt paths and field edges
      let pPlaced = 0;
      for (let i = 0; i < pebbleCount * 3 && pPlaced < pebbleCount; i++) {
        const h1 = Math.abs(Math.sin(i * 93.17 + 4.2) * 43758.5453) % 1;
        const h2 = Math.abs(Math.sin(i * 31.73 + 8.9) * 43758.5453) % 1;
        const h3 = Math.abs(Math.sin(i * 61.41 + 2.5) * 43758.5453) % 1;
        const outerMargin = mapId === 'docks' ? -0.8 : mapId === 'hydro' || mapId === 'splash' ? 28 : 6;
        const px = (h1 * 2 - 1) * (spec.halfX + outerMargin);
        const pz = (h2 * 2 - 1) * (spec.halfZ + outerMargin);
        const insideWalls = Math.abs(px) <= spec.halfX - 0.8 && Math.abs(pz) <= spec.halfZ - 0.8;
        if (mapId === 'docks' && !insideWalls) continue;
        if ((mapId === 'hydro' || mapId === 'splash') && insideWalls) continue;
        if (insideWalls && !isClearGroundSpot(mapId, px, pz)) continue;
        if (!insideWalls && Math.abs(px) <= spec.halfX + 2.5 && Math.abs(pz) <= spec.halfZ + 2.5) continue;
        const py = getMapFloorHeightAt(mapId, px, pz) + 0.02;
        if ((mapId === 'hydro' || mapId === 'splash') && py < 0.08) continue;
        const pScale = 0.55 + h3 * 0.9;
        _scaleVec.set(pScale, pScale * 0.48, pScale * 0.85);
        _quat.setFromEuler(new THREE.Euler(h1 * 0.5, h2 * Math.PI * 2, h3 * 0.5));
        _v1.set(px, py, pz);
        _mat4.compose(_v1, _quat, _scaleVec);
        pebbleInstanced.setMatrixAt(pPlaced, _mat4);
        const shade = 0.36 + h1 * 0.22;
        _tintColor.setRGB(shade, shade * 0.94, shade * 0.86);
        pebbleInstanced.setColorAt(pPlaced, _tintColor);
        pPlaced += 1;
      }
      for (let k = pPlaced; k < pebbleCount; k++) {
        _scaleVec.set(0, 0, 0);
        _mat4.compose(_v1.set(0, -100, 0), _quat, _scaleVec);
        pebbleInstanced.setMatrixAt(k, _mat4);
      }
      pebbleInstanced.instanceMatrix.needsUpdate = true;
      if (pebbleInstanced.instanceColor) pebbleInstanced.instanceColor.needsUpdate = true;
      pebbleInstanced.computeBoundingSphere();
    };
    updateSpires(currentMapId);
    scene.add(spireInstanced, treeTrunkInst, treeCrownInst, grassInstanced, pebbleInstanced);

    const disposeGroup = (group: THREE.Group) => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (!sharedMatSet.has(m)) m.dispose();
            });
          } else if (obj.material && !sharedMatSet.has(obj.material)) {
            obj.material.dispose();
          }
        }
      });
    };

    const disposeTextureSet = (t: { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture }) => {
      t.map.dispose();
      t.normalMap.dispose();
      t.roughnessMap.dispose();
    };

    // Active Map Structures
    let arenaGroup = buildMapEnvironment(
      currentMapId,
      mats,
      shadowTex,
      floorMarkingsTex,
      domeGlassTex,
      sun.position
    );
    scene.add(arenaGroup);

    const rebuildMap = (mapId: MapId) => {
      if (currentMapId === mapId) return;
      currentMapId = mapId;
      const spec = ARENA_MAPS[mapId];

      (scene.background as THREE.Color).setHex(spec.skyColor);
      fog.color.setHex(spec.skyColor);
      fog.density = spec.fogDensity;
      hemi.color.setHex(spec.hemiSky);
      hemi.groundColor.setHex(spec.hemiGround);
      sun.color.setHex(spec.sunColor);
      sun.intensity = spec.sunIntensity;

      const oldSky = skyTex;
      const [nz, nh, ns, nNight] = getSkyColorsForMap(mapId);
      skyTex = createSkyDomeTexture(nz, nh, ns, nNight);
      skyMat.map = skyTex;
      skyMat.needsUpdate = true;
      oldSky.dispose();

      const oldFloor = floorTexSet;
      const oldMarkings = floorMarkingsTex;
      const oldA = containerASet;
      const oldB = containerBSet;
      const oldN = neutralSet;

      floorTexSet = createTerrainTextureSet(
        maxAniso,
        spec.floorBaseHex,
        spec.floorAltHex,
        spec.floorLineHex,
        26,
        mapId
      );
      floorMarkingsTex = createArenaFloorMarkingsTexture(mapId, maxAniso);
      terrainUniforms.uTerrainHalf.value.set(spec.halfX, spec.halfZ);
      terrainUniforms.uMapMode.value = getMapShaderMode(mapId);
      containerASet = createContainerTextureSet(spec.containerA[0], spec.containerA[1], maxAniso, 'RVL-A1');
      containerBSet = createContainerTextureSet(spec.containerB[0], spec.containerB[1], maxAniso, 'RVL-B2');
      neutralSet = createContainerTextureSet(
        spec.containerNeutral[0],
        spec.containerNeutral[1],
        maxAniso,
        'SEC-09'
      );
      dustMat.color.setHex(getDustColorForMap(mapId));

      terrainMat.map = floorTexSet.map;
      terrainMat.normalMap = getFloorNormalForMap(mapId);
      terrainMat.roughnessMap = getFloorRoughnessForMap(mapId);
      terrainMat.roughness = 0.94;
      terrainMat.metalness = 0;
      terrainMat.envMapIntensity = 0.16;
      terrainMat.needsUpdate = true;
      grassMatHandle.sunColorUniform.value.setHex(spec.sunColor);

      mats.containerA.map = containerASet.map;
      mats.containerA.normalMap = containerASet.normalMap;
      mats.containerA.roughnessMap = containerASet.roughnessMap;
      mats.containerA.needsUpdate = true;

      mats.containerB.map = containerBSet.map;
      mats.containerB.normalMap = containerBSet.normalMap;
      mats.containerB.roughnessMap = containerBSet.roughnessMap;
      mats.containerB.needsUpdate = true;

      mats.containerNeutral.map = neutralSet.map;
      mats.containerNeutral.normalMap = neutralSet.normalMap;
      mats.containerNeutral.roughnessMap = neutralSet.roughnessMap;
      mats.containerNeutral.needsUpdate = true;

      disposeTextureSet(oldFloor);
      oldMarkings.dispose();
      disposeTextureSet(oldA);
      disposeTextureSet(oldB);
      disposeTextureSet(oldN);

      updateTerrainGeometry(mapId);
      updateSpires(mapId);

      scene.remove(arenaGroup);
      disposeGroup(arenaGroup);
      arenaGroup = buildMapEnvironment(
        mapId,
        mats,
        shadowTex,
        floorMarkingsTex,
        domeGlassTex,
        sun.position
      );
      scene.add(arenaGroup);
    };

    // 3D Collectible Knowledge Orb in Center Arena (matte non-shiny crystal)
    const getOrbBaseY = (mapId: MapId) =>
      mapId === 'splash'
        ? 3.55
        : mapId === 'docks'
        ? getMapFloorHeightAt(mapId, 0, 0, 0) + 1.45
        : getMapFloorHeightAt(mapId, 0, 0, 10) + 1.45;
    const orbGeo = new THREE.OctahedronGeometry(0.42, 0);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.2,
      roughness: 0.25,
      metalness: 0.2,
      envMapIntensity: 0.5,
    });
    const orbRingGeo = new THREE.TorusGeometry(0.68, 0.045, 8, 24);
    const orbRingMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.3,
      envMapIntensity: 0.4,
    });
    const orbRing2Geo = new THREE.TorusGeometry(0.86, 0.025, 8, 28);
    const orbRing2Mat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.3,
      envMapIntensity: 0.4,
    });
    const knowledgeOrbGroup = new THREE.Group();
    const orbCoreMesh = new THREE.Mesh(orbGeo, orbMat);
    const orbRingMesh = new THREE.Mesh(orbRingGeo, orbRingMat);
    const orbRing2Mesh = new THREE.Mesh(orbRing2Geo, orbRing2Mat);
    knowledgeOrbGroup.add(orbCoreMesh, orbRingMesh, orbRing2Mesh);
    knowledgeOrbGroup.position.set(0, getOrbBaseY(currentMapId), 0);
    scene.add(knowledgeOrbGroup);

    // Team Bot Pool (up to 4 AI Allies + 5 Enemy Rivals for 1v1 through 5v5)
    interface BotEntity {
      id: string;
      mpId: string;
      name: string;
      team: TeamSide;
      rig: RivalCharacterRig;
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      yaw: number;
      hp: number;
      maxHp: number;
      active: boolean;
      alive: boolean;
      grounded: boolean;
      fireTimer: number;
      strafeTimer: number;
      strafeDir: number;
      flankSign: number;
      jumpTimer: number;
      stunTimer: number;
      walkPhase: number;
      flinchTimer: number;
      muzzleFlashTimer: number;
      knockedDown: boolean;
      knockdownProgress: number;
    }

    const ALLY_BOT_NAMES = ['Vanguard', 'Specter', 'Kestrel', 'Atlas'];
    const ENEMY_BOT_NAMES = ['Rival Prime', 'Viper', 'Phantom', 'Reaper', 'Titan'];
    const bots: BotEntity[] = [];

    ALLY_BOT_NAMES.forEach((name, idx) => {
      const id = `ally-${idx + 1}`;
      const rig = buildRivalCharacter(mats, shadowTex, 'ally', id);
      rig.root.visible = false;
      scene.add(rig.root);
      bots.push({
        id,
        mpId: id,
        name,
        team: 'ally',
        rig,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        yaw: Math.PI,
        hp: MAX_HP,
        maxHp: MAX_HP,
        active: false,
        alive: false,
        grounded: true,
        fireTimer: 0.7 + idx * 0.15,
        strafeTimer: 1.0 + idx * 0.25,
        strafeDir: idx % 2 === 0 ? 1 : -1,
        flankSign: idx % 2 === 0 ? -1 : 1,
        jumpTimer: 2.0 + idx * 0.6,
        stunTimer: 0,
        walkPhase: idx * 0.9,
        flinchTimer: 0,
        muzzleFlashTimer: 0,
        knockedDown: false,
        knockdownProgress: 0,
      });
    });

    ENEMY_BOT_NAMES.forEach((name, idx) => {
      const id = `enemy-${idx}`;
      const rig = buildRivalCharacter(mats, shadowTex, 'enemy', id);
      rig.root.visible = idx === 0;
      scene.add(rig.root);
      bots.push({
        id,
        mpId: id,
        name,
        team: 'enemy',
        rig,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        yaw: 0,
        hp: MAX_HP,
        maxHp: MAX_HP,
        active: idx === 0,
        alive: idx === 0,
        grounded: true,
        fireTimer: 0.8 + idx * 0.16,
        strafeTimer: 1.1 + idx * 0.22,
        strafeDir: idx % 2 === 0 ? 1 : -1,
        flankSign: idx === 0 ? 0 : idx % 2 === 1 ? -1 : 1,
        jumpTimer: 1.8 + idx * 0.5,
        stunTimer: 0,
        walkPhase: idx * 1.1,
        flinchTimer: 0,
        muzzleFlashTimer: 0,
        knockedDown: false,
        knockdownProgress: 0,
      });
    });

    // Remote Multiplayer Human Players
    interface RemotePlayerEntity {
      id: string;
      name: string;
      team: TeamSide;
      rig: RivalCharacterRig;
      pos: THREE.Vector3;
      targetPos: THREE.Vector3;
      yaw: number;
      targetYaw: number;
      alive: boolean;
      sliding: boolean;
      grounded: boolean;
      speed: number;
      walkPhase: number;
      flinchTimer: number;
      muzzleFlashTimer: number;
      knockedDown: boolean;
      knockdownProgress: number;
    }

    const remotePlayers = new Map<string, RemotePlayerEntity>();

    const disposeRemoteRig = (rig: RivalCharacterRig) => {
      scene.remove(rig.root);
      rig.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (!sharedMatSet.has(m)) m.dispose();
            });
          } else if (obj.material && !sharedMatSet.has(obj.material)) {
            obj.material.dispose();
          }
        }
      });
    };

    const clearRemotePlayers = () => {
      for (const rp of remotePlayers.values()) {
        disposeRemoteRig(rp.rig);
      }
      remotePlayers.clear();
    };

    const getMyMpTeam = (room: MpRoomSnapshot | null): MpTeam => {
      if (!room) return 'alpha';
      const me = room.players.find((p) => p.id === mpPlayerIdRef.current);
      return me?.team ?? 'alpha';
    };

    const syncRemotePlayersFromRoom = (room: MpRoomSnapshot | null) => {
      if (!room) {
        clearRemotePlayers();
        return;
      }
      const myId = mpPlayerIdRef.current;
      const myTeam = getMyMpTeam(room);
      const activeIds = new Set<string>();

      for (const p of room.players) {
        if (p.id === myId) continue;
        activeIds.add(p.id);
        const visualTeam: TeamSide = p.team === myTeam ? 'ally' : 'enemy';
        let rp = remotePlayers.get(p.id);
        if (!rp || rp.team !== visualTeam) {
          if (rp) disposeRemoteRig(rp.rig);
          const rig = buildRivalCharacter(mats, shadowTex, visualTeam, p.id);
          rig.root.traverse((child) => {
            child.userData.remotePlayerId = p.id;
          });
          scene.add(rig.root);
          rp = {
            id: p.id,
            name: p.name,
            team: visualTeam,
            rig,
            pos: new THREE.Vector3(p.x, p.y - p.eyeHeight, p.z),
            targetPos: new THREE.Vector3(p.x, p.y - p.eyeHeight, p.z),
            yaw: p.yaw + Math.PI,
            targetYaw: p.yaw + Math.PI,
            alive: p.alive,
            sliding: p.sliding,
            grounded: p.grounded,
            speed: p.speed,
            walkPhase: 0,
            flinchTimer: 0,
            muzzleFlashTimer: 0,
            knockedDown: !p.alive,
            knockdownProgress: p.alive ? 0 : 1,
          };
          rig.root.position.copy(rp.pos);
          rig.root.rotation.y = rp.yaw;
          remotePlayers.set(p.id, rp);
        }
        rp.name = p.name;
        rp.targetPos.set(p.x, p.y - p.eyeHeight, p.z);
        rp.targetYaw = p.yaw + Math.PI;
        rp.alive = p.alive;
        rp.sliding = p.sliding;
        rp.grounded = p.grounded;
        rp.speed = p.speed;
        if (!p.alive) {
          rp.knockedDown = true;
        } else if (rp.knockedDown) {
          rp.knockedDown = false;
          rp.knockdownProgress = 0;
          rp.rig.bodyGroup.rotation.set(0, 0, 0);
          rp.rig.bodyGroup.position.set(0, 0, 0);
        }
        rp.rig.root.visible = room.phase === 'PLAYING' && (p.alive || rp.knockedDown);
      }

      for (const [id, rp] of remotePlayers.entries()) {
        if (!activeIds.has(id)) {
          disposeRemoteRig(rp.rig);
          remotePlayers.delete(id);
        }
      }
    };

    // First-Person Viewmodel Rig
    let viewmodel: ViewmodelRig = buildRivalsViewmodel(
      loadoutRef.current,
      mats,
      weaponBuildsRef.current
    );
    camera.add(viewmodel.root);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // --- MATCH & SIMULATION STATE ---
    const player = {
      pos: new THREE.Vector3(0, 1.75, 29),
      vel: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      grounded: true,
      alive: true,
      hp: MAX_HP,
      eyeHeight: 1.75,
      sliding: false,
      slideTimer: 0,
      slideCooldown: 0,
      slideDir: new THREE.Vector3(),
      ads: false,
      fov: 76,
    };

    const match = {
      playerRounds: 0,
      rivalRounds: 0,
      roundNumber: 1,
      roundTimer: 90,
      roundEndTimer: 0,
      roundBanner: null as string | null,
      playerMaxHp: MAX_HP,
      activePerk: null as RoundOverchargePerk | null,
      orbActive: true,
      orbRespawnTimer: 0,
      factToast: null as { subjectLabel: string; fact: string } | null,
      factToastTimer: 0,
      activeSlot: 0 as SlotIndex,
      primaryAmmo: PRIMARY_WEAPONS[loadoutRef.current.primary].magSize,
      secondaryAmmo: SECONDARY_WEAPONS[loadoutRef.current.secondary].magSize,
      utilityCharges: UTILITY_ITEMS[loadoutRef.current.utility].charges,
      fireCooldown: 0,
      burstQueue: 0,
      burstTimer: 0,
      reloading: false,
      reloadTimer: 0,
      recoil: 0,
      camRecoilPitch: 0,
      camRecoilYaw: 0,
      camTilt: 0,
      swayX: 0,
      swayY: 0,
      landDip: 0,
      muzzleFlashTimer: 0,
      boltKick: 0,
      meleeSwingTimer: 0,
      bobPhase: 0,
      lastStepPhase: 0,
      damageFlash: 0,
      aberrationPulse: 0,
      hitMarker: 'none' as 'none' | 'hit' | 'headshot',
      hitMarkerTimer: 0,
      killFeed: [] as KillFeedEntry[],
      totalDamageDealt: 0,
      kills: 0,
      headshots: 0,
      shotsFired: 0,
      shotsHit: 0,
      pointerLocked: false,
      mouseDown: false,
      rightDown: false,
      nextPopupId: 1,
      tutorial: {
        active: false,
        step: 0,
        completed: false,
        moveDist: 0,
        hits: 0,
      },
    };

    const popups: Array<DamagePopup & { worldPos: THREE.Vector3; age: number }> = [];
    const tracers: TracerEntity[] = [];
    const thrownItems: ThrownEntity[] = [];
    const sparks: SparkEntity[] = [];
    const debrisEntities: Array<{
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      rotVel: THREE.Vector3;
      life: number;
      maxLife: number;
    }> = [];
    const shells: ShellEntity[] = [];
    const impacts: ImpactEntity[] = [];
    const smokes: SmokeEntity[] = [];
    const shockwaves: ShockwaveEntity[] = [];
    const rockets: RocketEntity[] = [];
    const finisherEffects: FinisherEffectEntity[] = [];
    const keys: Record<string, boolean> = {};

    const raycaster = new THREE.Raycaster();
    const worldRaycaster = new THREE.Raycaster();
    const _losOrigin = new THREE.Vector3();
    const _losDir = new THREE.Vector3();
    const _losTargetHead = new THREE.Vector3();
    const _botEyePos = new THREE.Vector3();
    const sparkGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    const debrisGeo = new THREE.BoxGeometry(0.068, 0.044, 0.056);
    const shellGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.048, 6);
    const impactGeo = new THREE.CircleGeometry(0.09, 8);
    const shockwaveGeo = new THREE.RingGeometry(0.35, 0.72, 24);
    shockwaveGeo.rotateX(-Math.PI / 2);
    const impactMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: false,
    });
    const grenadeGeo = new THREE.SphereGeometry(0.18, 10, 10);

    // Tactical ADS laser target dot (projected onto surface when aiming)
    const adsLaserGeo = new THREE.SphereGeometry(0.032, 8, 8);
    const adsLaserMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const adsLaserDot = new THREE.Mesh(adsLaserGeo, adsLaserMat);
    adsLaserDot.visible = false;
    scene.add(adsLaserDot);

    const disposeObjectTree = (rootObj: THREE.Object3D) => {
      rootObj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    };

    const clearDynamicObjects = () => {
      for (const t of tracers) {
        scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        (t.mesh.material as THREE.Material).dispose();
      }
      tracers.length = 0;
      for (const g of thrownItems) {
        scene.remove(g.mesh);
        (g.mesh.material as THREE.Material).dispose();
      }
      thrownItems.length = 0;
      for (const rk of rockets) {
        scene.remove(rk.mesh);
        disposeObjectTree(rk.mesh);
      }
      rockets.length = 0;
      for (const fe of finisherEffects) {
        scene.remove(fe.group);
        disposeObjectTree(fe.group);
      }
      finisherEffects.length = 0;
      for (const s of sparks) {
        scene.remove(s.mesh);
        (s.mesh.material as THREE.Material).dispose();
      }
      sparks.length = 0;
      for (const d of debrisEntities) {
        scene.remove(d.mesh);
      }
      debrisEntities.length = 0;
      for (const sh of shells) {
        scene.remove(sh.mesh);
      }
      shells.length = 0;
      for (const imp of impacts) {
        scene.remove(imp.mesh);
      }
      impacts.length = 0;
      for (const sm of smokes) {
        scene.remove(sm.sprite);
        sm.sprite.material.dispose();
      }
      smokes.length = 0;
      for (const sw of shockwaves) {
        scene.remove(sw.mesh);
        (sw.mesh.material as THREE.Material).dispose();
      }
      shockwaves.length = 0;
      adsLaserDot.visible = false;
      explosionLight.intensity = 0;
      popups.length = 0;
    };

    const spawnSmokePuff = (
      pos: THREE.Vector3,
      colorHex: number,
      startScale: number,
      endScale: number,
      maxLife: number,
      baseOpacity = 0.42,
      upwardSpeed = 1.4
    ) => {
      if (smokes.length > 48) {
        const oldest = smokes.shift()!;
        scene.remove(oldest.sprite);
        oldest.sprite.material.dispose();
      }
      const mat = new THREE.SpriteMaterial({
        map: particleTex,
        color: colorHex,
        transparent: true,
        opacity: baseOpacity,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.setScalar(startScale);
      scene.add(sprite);
      smokes.push({
        sprite,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.1,
          upwardSpeed + Math.random() * 0.9,
          (Math.random() - 0.5) * 1.1
        ),
        life: 0,
        maxLife,
        startScale,
        endScale,
        baseOpacity,
      });
    };

    const spawnShockwave = (pos: THREE.Vector3, colorHex: number, maxScale = 9.5) => {
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(shockwaveGeo, mat);
      mesh.position.copy(pos);
      mesh.position.y += 0.08;
      mesh.scale.setScalar(0.35);
      scene.add(mesh);
      shockwaves.push({ mesh, life: 0, maxLife: 0.38, maxScale });
    };

    const spawnShellCasing = () => {
      if (shells.length > 36) {
        const oldest = shells.shift()!;
        scene.remove(oldest.mesh);
      }
      viewmodel.ejectionPoint.getWorldPosition(_v1);
      const mesh = new THREE.Mesh(shellGeo, mats.brass);
      mesh.position.copy(_v1);
      scene.add(mesh);

      _right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
      const vel = _right
        .clone()
        .multiplyScalar(2.4 + Math.random() * 1.4)
        .add(new THREE.Vector3(0, 2.2 + Math.random() * 1.1, 0))
        .addScaledVector(player.vel, 0.35);

      shells.push({
        mesh,
        vel,
        rotVel: new THREE.Vector3(14 + Math.random() * 10, 12, 18),
        life: 0,
        bounced: false,
      });
    };

    const spawnDebris = (pos: THREE.Vector3, mat: THREE.Material, count: number) => {
      for (let i = 0; i < count; i++) {
        if (debrisEntities.length >= 42) {
          const oldest = debrisEntities.shift()!;
          scene.remove(oldest.mesh);
        }
        const m = new THREE.Mesh(debrisGeo, mat);
        m.position.copy(pos);
        m.scale.setScalar(0.75 + Math.random() * 0.7);
        scene.add(m);
        const th = Math.random() * Math.PI * 2;
        const spd = 2.2 + Math.random() * 4.5;
        debrisEntities.push({
          mesh: m,
          vel: new THREE.Vector3(Math.cos(th) * spd, 2.4 + Math.random() * 3.8, Math.sin(th) * spd),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 18,
            (Math.random() - 0.5) * 18,
            (Math.random() - 0.5) * 18
          ),
          life: 0,
          maxLife: 1.05 + Math.random() * 0.45,
        });
      }
    };

    const spawnImpactMark = (pos: THREE.Vector3, normal: THREE.Vector3) => {
      if (impacts.length > 36) {
        const oldest = impacts.shift()!;
        scene.remove(oldest.mesh);
      }
      const m = new THREE.Mesh(impactGeo, impactMat);
      m.position.copy(pos).addScaledVector(normal, 0.02);
      m.lookAt(_v1.copy(pos).add(normal));
      scene.add(m);
      impacts.push({ mesh: m, life: 0, maxLife: 7.5 });
    };

    const spawnSparks = (pos: THREE.Vector3, colorHex: number, count: number) => {
      for (let i = 0; i < count; i++) {
        if (sparks.length > 110) break;
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: colorHex }));
        m.position.copy(pos);
        scene.add(m);
        const spd = 3 + Math.random() * 8;
        const th = Math.random() * Math.PI * 2;
        const ph = (Math.random() - 0.2) * Math.PI;
        sparks.push({
          mesh: m,
          vel: new THREE.Vector3(
            Math.cos(th) * Math.cos(ph) * spd,
            Math.abs(Math.sin(ph)) * spd + 2,
            Math.sin(th) * Math.cos(ph) * spd
          ),
          life: 0,
          maxLife: 0.35 + Math.random() * 0.2,
        });
      }
    };

    const spawnMeleeSlashArc = (origin: THREE.Vector3, dir: THREE.Vector3, colorHex: number) => {
      const arcGeo = new THREE.RingGeometry(0.65, 1.35, 18, 1, -Math.PI * 0.35, Math.PI * 0.7);
      const arcMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const arcMesh = new THREE.Mesh(arcGeo, arcMat);
      arcMesh.position.copy(origin).addScaledVector(dir, 1.15);
      arcMesh.lookAt(_v2.copy(origin).addScaledVector(dir, 4.0));
      arcMesh.rotateX(Math.PI / 2 - 0.22);
      arcMesh.rotateZ((Math.random() - 0.5) * 0.6);
      scene.add(arcMesh);
      shockwaves.push({ mesh: arcMesh, life: 0, maxLife: 0.24, maxScale: 1.5 });
    };

    const spawnTracer = (from: THREE.Vector3, to: THREE.Vector3, colorHex: number, radius = 0.03) => {
      const dist = from.distanceTo(to);
      if (dist < 0.2) return;
      const geo = new THREE.CylinderGeometry(radius * 0.42, radius * 1.15, dist, 6);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(from).lerp(to, 0.5);
      mesh.lookAt(to);
      scene.add(mesh);
      tracers.push({ mesh, life: 0, maxLife: 0.12 });
    };

    const spawnRocket = (
      origin: THREE.Vector3,
      dir: THREE.Vector3,
      speed: number,
      damage: number,
      splashRadius: number,
      colorHex: number
    ) => {
      const group = new THREE.Group();
      const bodyGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.52, 10);
      bodyGeo.rotateX(Math.PI / 2);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.75,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(bodyMesh);

      const coneGeo = new THREE.ConeGeometry(0.072, 0.22, 10);
      coneGeo.rotateX(Math.PI / 2);
      const coneMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.6,
      });
      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.position.z = 0.35;
      group.add(coneMesh);

      const flameGeo = new THREE.SphereGeometry(0.095, 8, 8);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.92,
      });
      const flameMesh = new THREE.Mesh(flameGeo, flameMat);
      flameMesh.position.z = -0.32;
      group.add(flameMesh);

      group.position.copy(origin);
      _v1.copy(origin).add(dir);
      group.lookAt(_v1);
      scene.add(group);
      spawnSmokePuff(origin, 0xe2e8f0, 0.28, 1.35, 0.55, 0.36, 1.2);

      rockets.push({
        mesh: group,
        vel: dir.clone().multiplyScalar(speed),
        life: 3.4,
        maxLife: 3.4,
        damage,
        splashRadius,
        colorHex,
        smokeAccum: 0,
      });
    };

    const spawnFinisherEffect = (
      pos: THREE.Vector3,
      finisher: FinisherId,
      weaponColorHex: number
    ) => {
      const finSpec = WEAPON_FINISHERS.find((f) => f.id === finisher);
      const finColor =
        finisher === 'standard'
          ? weaponColorHex
          : cssHexToNum(finSpec?.colorHex ?? '#38bdf8', weaponColorHex);

      if (finisher === 'standard') {
        return;
      }

      const group = new THREE.Group();
      group.position.set(pos.x, pos.y + 0.1, pos.z);
      let maxLife = 1.25;

      if (finisher === 'orbital_beam') {
        maxLife = 1.35;
        const beamGeo = new THREE.CylinderGeometry(0.45, 0.85, 32, 16, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
          color: finColor,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 16;
        group.add(beam);

        const coreGeo = new THREE.CylinderGeometry(0.16, 0.28, 32, 12);
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 16;
        group.add(core);

        const ringGeo = new THREE.RingGeometry(0.8, 2.2, 24);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: finColor,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.08;
        group.add(ring);

        spawnShockwave(group.position, finColor, 10.5);
        spawnSparks(_v1.set(pos.x, pos.y + 1.2, pos.z), finColor, 26);
      } else if (finisher === 'vortex_implosion') {
        maxLife = 1.35;
        const sphereGeo = new THREE.SphereGeometry(0.9, 18, 18);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: 0x090418,
          transparent: true,
          opacity: 0.95,
        });
        const core = new THREE.Mesh(sphereGeo, sphereMat);
        core.position.y = 1.35;
        group.add(core);

        for (let i = 0; i < 3; i++) {
          const haloGeo = new THREE.TorusGeometry(1.3 + i * 0.45, 0.055, 8, 28);
          const haloMat = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? finColor : weaponColorHex,
            transparent: true,
            opacity: 0.85,
          });
          const halo = new THREE.Mesh(haloGeo, haloMat);
          halo.position.y = 1.35;
          halo.rotation.set(i * 0.7, i * 0.9, 0.4);
          group.add(halo);
        }
        spawnShockwave(group.position, finColor, 8.8);
      } else if (finisher === 'cyber_shatter') {
        maxLife = 1.2;
        const shardGeo = new THREE.OctahedronGeometry(0.24, 0);
        for (let i = 0; i < 14; i++) {
          const shardMat = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? finColor : weaponColorHex,
            wireframe: i % 3 === 0,
            transparent: true,
            opacity: 0.92,
          });
          const shard = new THREE.Mesh(shardGeo.clone(), shardMat);
          const ang = (i / 14) * Math.PI * 2;
          shard.position.set(Math.cos(ang) * 0.5, 0.8 + (i % 4) * 0.35, Math.sin(ang) * 0.5);
          shard.userData.dir = new THREE.Vector3(Math.cos(ang), 0.7 + (i % 3) * 0.45, Math.sin(ang)).normalize();
          group.add(shard);
        }
        shardGeo.dispose();
        spawnSparks(_v1.set(pos.x, pos.y + 1.3, pos.z), finColor, 22);
      } else if (finisher === 'lightning_strike') {
        maxLife = 1.05;
        for (let i = 0; i < 4; i++) {
          const boltGeo = new THREE.CylinderGeometry(0.08, 0.14, 18, 6);
          const boltMat = new THREE.MeshBasicMaterial({
            color: i === 0 ? 0xffffff : finColor,
            transparent: true,
            opacity: 0.95,
          });
          const bolt = new THREE.Mesh(boltGeo, boltMat);
          bolt.position.set((Math.random() - 0.5) * 0.9, 9, (Math.random() - 0.5) * 0.9);
          bolt.rotation.set((Math.random() - 0.5) * 0.28, 0, (Math.random() - 0.5) * 0.28);
          group.add(bolt);
        }
        spawnShockwave(group.position, finColor, 9.6);
        spawnSparks(_v1.set(pos.x, pos.y + 1.5, pos.z), finColor, 28);
      } else if (finisher === 'supernova_blast') {
        maxLife = 1.45;
        const sunGeo = new THREE.SphereGeometry(1.05, 18, 18);
        const sunMat = new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.92,
        });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.y = 1.4;
        group.add(sun);

        for (let i = 0; i < 3; i++) {
          const coronaGeo = new THREE.TorusGeometry(1.4 + i * 0.55, 0.08, 8, 28);
          const coronaMat = new THREE.MeshBasicMaterial({
            color: i === 1 ? weaponColorHex : finColor,
            transparent: true,
            opacity: 0.85,
          });
          const corona = new THREE.Mesh(coronaGeo, coronaMat);
          corona.position.y = 1.4;
          corona.rotation.set(Math.PI / 2 + (i - 1) * 0.45, i * 0.5, 0);
          group.add(corona);
        }
        spawnShockwave(group.position, finColor, 12.5);
        spawnSparks(_v1.set(pos.x, pos.y + 1.4, pos.z), finColor, 30);
      } else {
        // plasma_burst
        maxLife = 1.1;
        const coreGeo = new THREE.SphereGeometry(0.65, 14, 14);
        const coreMat = new THREE.MeshBasicMaterial({
          color: finColor,
          transparent: true,
          opacity: 0.9,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 1.3;
        group.add(core);
        const ringGeo = new THREE.TorusGeometry(1.25, 0.07, 8, 24);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: weaponColorHex,
          transparent: true,
          opacity: 0.88,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 1.3;
        group.add(ring);
        spawnShockwave(group.position, finColor, 9.2);
        spawnSparks(_v1.set(pos.x, pos.y + 1.3, pos.z), finColor, 24);
      }

      explosionLight.color.setHex(finColor);
      explosionLight.position.set(pos.x, pos.y + 2.1, pos.z);
      explosionLight.intensity = 22;
      scene.add(group);
      finisherEffects.push({ group, kind: finisher, life: 0, maxLife });
    };

    const addDamagePopup = (worldPos: THREE.Vector3, amount: number, crit: boolean) => {
      popups.push({
        id: match.nextPopupId++,
        amount,
        crit,
        x: 0.5,
        y: 0.4,
        worldPos: worldPos.clone(),
        age: 0,
      });
    };

    const pushOutBoxXZ = (
      pos: THREE.Vector3,
      cx: number,
      cz: number,
      halfW: number,
      halfD: number,
      radius: number
    ) => {
      const minX = cx - halfW - radius;
      const maxX = cx + halfW + radius;
      const minZ = cz - halfD - radius;
      const maxZ = cz + halfD + radius;
      if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
        const dL = Math.abs(pos.x - minX);
        const dR = Math.abs(maxX - pos.x);
        const dF = Math.abs(pos.z - minZ);
        const dB = Math.abs(maxZ - pos.z);
        const m = Math.min(dL, dR, dF, dB);
        if (m === dL) pos.x = minX;
        else if (m === dR) pos.x = maxX;
        else if (m === dF) pos.z = minZ;
        else pos.z = maxZ;
      }
    };

    const resolveArenaCollision = (
      pos: THREE.Vector3,
      radius: number,
      footY: number,
      entityHeight = 1.95
    ) => {
      const mapId = mapRef.current;
      const boxes = getMapBoxes(mapId);
      const spec = ARENA_MAPS[mapId];

      for (const box of boxes) {
        const boxMinY = box.minY ?? 0;
        if (box.legs && boxMinY > 0.25 && footY < boxMinY - 0.15) {
          const legOffX = box.w / 2 - 0.28;
          const legOffZ = box.d / 2 - 0.28;
          pushOutBoxXZ(pos, box.x - legOffX, box.z - legOffZ, 0.22, 0.22, radius);
          pushOutBoxXZ(pos, box.x + legOffX, box.z - legOffZ, 0.22, 0.22, radius);
          pushOutBoxXZ(pos, box.x - legOffX, box.z + legOffZ, 0.22, 0.22, radius);
          pushOutBoxXZ(pos, box.x + legOffX, box.z + legOffZ, 0.22, 0.22, radius);
        }
        if (footY < box.h - 0.15 && footY + entityHeight > boxMinY + 0.08) {
          pushOutBoxXZ(pos, box.x, box.z, box.w / 2, box.d / 2, radius);
        }
      }

      // Support pillars for elevated bridges, scaffolding, overwater pavilion & gantry decks
      if (footY < 2.55) {
        if (mapId === 'arena') {
          pushOutBoxXZ(pos, -4.85, -5.05, 0.46, 0.46, radius);
          pushOutBoxXZ(pos, 4.85, -5.05, 0.46, 0.46, radius);
          pushOutBoxXZ(pos, -4.85, 5.05, 0.46, 0.46, radius);
          pushOutBoxXZ(pos, 4.85, 5.05, 0.46, 0.46, radius);
        } else if (mapId === 'construction') {
          const zCols = [-9.5, -3.2, 3.2, 9.5];
          for (const dx of [-14.0, 14.0]) {
            for (const ox of [-3.2, 3.2]) {
              for (const cz of zCols) {
                pushOutBoxXZ(pos, dx + ox, cz, 0.18, 0.18, radius);
              }
            }
          }
        } else if (mapId === 'hydro') {
          pushOutBoxXZ(pos, -6.1, -6.1, 0.42, 0.42, radius);
          pushOutBoxXZ(pos, 6.1, -6.1, 0.42, 0.42, radius);
          pushOutBoxXZ(pos, -6.1, 6.1, 0.42, 0.42, radius);
          pushOutBoxXZ(pos, 6.1, 6.1, 0.42, 0.42, radius);
        } else if (mapId === 'splash') {
          for (const dx of [-11.5, 11.5]) {
            for (const ox of [-2.1, 2.1]) {
              for (const oz of [-3.0, 3.0]) {
                pushOutBoxXZ(pos, dx + ox, oz, 0.34, 0.34, radius);
              }
            }
          }
        } else if (mapId === 'docks') {
          for (const gx of [-20.0, 20.0]) {
            for (const ox of [-3.45, 3.45]) {
              for (const cz of [-7.6, 7.6]) {
                pushOutBoxXZ(pos, gx + ox, cz, 0.28, 0.28, radius);
              }
            }
          }
        }
      }

      // Keep standing entities from clipping laterally into low ramp undersides (sliding still fits mid-ramp!)
      const elev = getElevatedSurfaceAt(mapId, pos.x, pos.z);
      if (elev && elev.isRamp && footY < elev.surfY - 0.95 && elev.underY < entityHeight) {
        if (mapId === 'arena') {
          pos.z = pos.z >= 0 ? 3.4 + radius : -3.4 - radius;
        } else if (mapId === 'construction') {
          const dx = pos.x < 0 ? -14.0 : 14.0;
          pos.x = pos.x >= dx ? dx + 2.5 + radius : dx - 2.5 - radius;
        } else if (mapId === 'hydro') {
          if (Math.abs(pos.x) > Math.abs(pos.z)) {
            pos.z = pos.z >= 0 ? 2.8 + radius : -2.8 - radius;
          } else {
            pos.x = pos.x >= 0 ? 2.8 + radius : -2.8 - radius;
          }
        } else if (mapId === 'splash') {
          const dx = pos.x < 0 ? -11.5 : 11.5;
          pos.x = pos.x >= dx ? dx + 2.5 + radius : dx - 2.5 - radius;
        } else if (mapId === 'docks') {
          const gx = pos.x < 0 ? -20.0 : 20.0;
          pos.x = pos.x >= gx ? gx + 4.0 + radius : gx - 4.0 - radius;
        }
      }

      pos.x = THREE.MathUtils.clamp(pos.x, -spec.halfX + radius, spec.halfX - radius);
      pos.z = THREE.MathUtils.clamp(pos.z, -spec.halfZ + radius, spec.halfZ - radius);
    };

    // Ray-AABB slab test against cover blocks & elevated decks so bullets pass under raised structures
    const testSlabHit = (
      origin: THREE.Vector3,
      invX: number,
      invY: number,
      invZ: number,
      minX: number,
      maxX: number,
      minY: number,
      maxY: number,
      minZ: number,
      maxZ: number,
      closest: number
    ): number => {
      const t1 = (minX - origin.x) * invX;
      const t2 = (maxX - origin.x) * invX;
      const t3 = (minY - origin.y) * invY;
      const t4 = (maxY - origin.y) * invY;
      const t5 = (minZ - origin.z) * invZ;
      const t6 = (maxZ - origin.z) * invZ;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));
      if (tmax >= 0 && tmin <= tmax && tmin < closest) {
        return tmin < 0 ? 0 : tmin;
      }
      return closest;
    };

    const getCoverHitDistance = (origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): number => {
      let closest = maxDist;
      const invX = 1 / (dir.x || 1e-8);
      const invY = 1 / (dir.y || 1e-8);
      const invZ = 1 / (dir.z || 1e-8);

      for (const box of getMapBoxes(mapRef.current)) {
        closest = testSlabHit(
          origin,
          invX,
          invY,
          invZ,
          box.x - box.w / 2,
          box.x + box.w / 2,
          box.minY ?? 0,
          box.h,
          box.z - box.d / 2,
          box.z + box.d / 2,
          closest
        );
      }

      for (const slab of getMapDeckSlabs(mapRef.current)) {
        closest = testSlabHit(
          origin,
          invX,
          invY,
          invZ,
          slab.minX,
          slab.maxX,
          slab.minY,
          slab.maxY,
          slab.minZ,
          slab.maxZ,
          closest
        );
      }

      return closest;
    };

    const isSolidWorldObject = (obj: THREE.Object3D): boolean =>
      !obj.userData?.isWater && !obj.userData?.isDomeGlass && !obj.userData?.isNonSolid;

    const getWorldCoverDistance = (
      origin: THREE.Vector3,
      dir: THREE.Vector3,
      maxDist: number
    ): number => {
      let closest = getCoverHitDistance(origin, dir, maxDist);
      if (closest <= 0.001) return 0;

      worldRaycaster.set(origin, dir);
      worldRaycaster.near = 0;
      worldRaycaster.far = closest;
      const worldHits = worldRaycaster.intersectObjects([arenaGroup, terrainMesh], true);
      for (let i = 0; i < worldHits.length; i++) {
        if (isSolidWorldObject(worldHits[i].object)) {
          if (worldHits[i].distance < closest) {
            closest = worldHits[i].distance;
          }
          break;
        }
      }
      return closest;
    };

    const hasClearWorldLine = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      margin = 0.02
    ): boolean => {
      _losDir.subVectors(to, from);
      const dist = _losDir.length();
      if (dist <= 0.05) return true;
      _losDir.divideScalar(dist);
      const hitDist = getWorldCoverDistance(from, _losDir, dist);
      return hitDist >= dist - margin;
    };

    const syncAdsState = () => {
      const wantAds =
        gameStateRef.current === 'PLAYING' &&
        player.alive &&
        match.activeSlot <= 1 &&
        Boolean(keys['KeyE'] || match.rightDown);
      if (player.ads !== wantAds) {
        player.ads = wantAds;
        pushHud();
      }
    };

    const selectSlot = (slot: SlotIndex) => {
      if (match.activeSlot === slot) return;
      match.activeSlot = slot;
      match.reloading = false;
      match.reloadTimer = 0;
      match.burstQueue = 0;
      if (slot > 1) player.ads = false;
      else player.ads = Boolean(keys['KeyE'] || match.rightDown);
      viewmodel.slotGroups.forEach((g, idx) => {
        g.visible = idx === slot;
      });
      shooterAudio.playReload();
      pushHud();
    };

    const ALLY_SPAWN_OFFSETS: ReadonlyArray<[number, number]> = [
      [-4.2, -1.2],
      [4.2, -1.2],
      [-8.4, -2.4],
      [8.4, -2.4],
    ];
    const ENEMY_SPAWN_OFFSETS: ReadonlyArray<[number, number]> = [
      [0, 0],
      [-4.2, 1.2],
      [4.2, 1.2],
      [-8.4, 2.4],
      [8.4, 2.4],
    ];

    const resetBotPose = (bot: BotEntity, x: number, z: number, yaw: number) => {
      const y = getMapFloorHeightAt(mapRef.current, x, z);
      bot.pos.set(x, y, z);
      bot.vel.set(0, 0, 0);
      bot.yaw = yaw;
      bot.hp = MAX_HP;
      bot.maxHp = MAX_HP;
      bot.grounded = true;
      bot.active = true;
      bot.alive = true;
      bot.fireTimer = 0.65 + Math.random() * 0.45;
      bot.strafeTimer = 0.8 + Math.random() * 0.9;
      bot.stunTimer = 0;
      bot.flinchTimer = 0;
      bot.muzzleFlashTimer = 0;
      bot.knockedDown = false;
      bot.knockdownProgress = 0;
      bot.rig.bodyGroup.rotation.set(0, 0, 0);
      bot.rig.bodyGroup.position.set(0, 0, 0);
      bot.rig.pelvisGroup.rotation.set(0, 0, 0);
      bot.rig.torsoGroup.rotation.set(0, 0, 0);
      bot.rig.leftLeg.rotation.set(0, 0, 0);
      bot.rig.leftKnee.rotation.set(0, 0, 0);
      bot.rig.leftAnkle.rotation.set(0, 0, 0);
      bot.rig.rightLeg.rotation.set(0, 0, 0);
      bot.rig.rightKnee.rotation.set(0, 0, 0);
      bot.rig.rightAnkle.rotation.set(0, 0, 0);
      bot.rig.leftArm.rotation.set(-0.62, 0.18, 0.14);
      bot.rig.leftElbow.rotation.set(-0.78, 0.28, -0.25);
      bot.rig.rightArm.rotation.set(-0.48, -0.1, -0.06);
      bot.rig.rightElbow.rotation.set(-1.02, 0.08, 0);
      bot.rig.headGroup.rotation.set(0, 0, 0);
      bot.rig.muzzleFlash.visible = false;
      bot.rig.root.position.copy(bot.pos);
      bot.rig.root.rotation.y = yaw;
      bot.rig.root.visible = true;
    };

    const mpBotTargets = new Map<string, MpBotSnapshot>();
    const bouncePadTimers: number[] = [];

    const isWaterSurfaceAt = (mapId: MapId, x: number, footY: number, z: number) =>
      (mapId === 'hydro' || mapId === 'splash') &&
      footY < 0.16 &&
      !(mapId === 'splash' && Math.abs(x) <= 9.5 && Math.abs(z) >= 26.8 && Math.abs(z) <= 31.8);

    const triggerBouncePadVisual = (padIndex: number, x: number, z: number) => {
      bouncePadTimers[padIndex] = 0.28;
      const padSpecs = getMapBouncePads(mapRef.current);
      const pad = padSpecs[padIndex];
      const colorHex = pad?.color ?? 0x38bdf8;
      const py = pad?.y ?? 0.25;
      spawnShockwave(_v1.set(x, py + 0.12, z), colorHex, 3.6);
      spawnSparks(_v1.set(x, py + 0.25, z), colorHex, 10);
      shooterAudio.playBouncePad(padIndex === 0 ? 1.25 : 1.0);
    };

    const syncMpBotsFromRoom = (room: MpRoomSnapshot | null, fullReset: boolean) => {
      mpBotTargets.clear();
      if (!room) return;
      const myTeam = getMyMpTeam(room);
      const sameTeamBots = room.bots.filter((b) => b.team === myTeam);
      const oppTeamBots = room.bots.filter((b) => b.team !== myTeam);

      let allyIdx = 0;
      let enemyIdx = 0;
      for (const bot of bots) {
        const snap =
          bot.team === 'ally' ? sameTeamBots[allyIdx++] : oppTeamBots[enemyIdx++];
        if (!snap) {
          bot.active = false;
          bot.alive = false;
          bot.rig.root.visible = false;
          continue;
        }
        mpBotTargets.set(snap.id, snap);
        bot.mpId = snap.id;
        bot.name = snap.name;
        bot.maxHp = snap.maxHp;
        bot.hp = snap.hp;
        bot.alive = snap.alive;
        bot.active = true;
        if (fullReset) {
          resetBotPose(bot, snap.x, snap.z, snap.yaw);
          bot.hp = snap.hp;
          bot.maxHp = snap.maxHp;
          bot.alive = snap.alive;
          bot.knockedDown = snap.knockedDown;
          bot.knockdownProgress = snap.knockedDown ? 1 : 0;
          bot.rig.root.visible = snap.alive || snap.knockedDown;
        } else {
          if (!snap.alive && !bot.knockedDown) {
            bot.knockedDown = true;
            bot.knockdownProgress = 0;
            bot.rig.muzzleFlash.visible = false;
          } else if (snap.alive && bot.knockedDown) {
            bot.knockedDown = false;
            bot.knockdownProgress = 0;
            bot.rig.bodyGroup.rotation.set(0, 0, 0);
            bot.rig.bodyGroup.position.set(0, 0, 0);
          }
          bot.rig.root.visible =
            room.phase === 'PLAYING' && (snap.alive || bot.knockedDown);
        }
      }
    };

    const setupRound = (roundNum: number, perk: RoundOverchargePerk | null = null) => {
      clearDynamicObjects();
      const cfg = loadoutRef.current;
      const tSize = teamSizeRef.current;
      const spawnZ = ARENA_MAPS[mapRef.current].spawnZ;

      match.activePerk = perk;
      match.playerMaxHp = MAX_HP + (perk?.bonusHp ?? 0);
      match.orbActive = true;
      match.orbRespawnTimer = 0;
      match.factToast = null;
      match.factToastTimer = 0;
      match.killFeed = [];
      knowledgeOrbGroup.position.set(0, getOrbBaseY(mapRef.current), 0);
      knowledgeOrbGroup.visible = true;

      const pFloor = getMapFloorHeightAt(mapRef.current, 0, spawnZ, 0);
      player.pos.set(0, pFloor + 1.75, spawnZ);
      player.vel.set(0, 0, 0);
      player.yaw = 0;
      player.pitch = 0;
      player.grounded = true;
      player.alive = true;
      player.hp = match.playerMaxHp;
      player.sliding = false;
      player.slideTimer = 0;
      player.ads = false;

      let allyIdx = 0;
      let enemyIdx = 0;
      for (const bot of bots) {
        if (bot.team === 'ally') {
          bot.mpId = bot.id;
          bot.name = ALLY_BOT_NAMES[allyIdx] ?? bot.name;
          if (allyIdx < tSize - 1) {
            const [ox, oz] = ALLY_SPAWN_OFFSETS[allyIdx];
            resetBotPose(bot, ox, spawnZ + oz, Math.PI);
          } else {
            bot.active = false;
            bot.alive = false;
            bot.rig.root.visible = false;
          }
          allyIdx += 1;
        } else {
          bot.mpId = bot.id;
          bot.name = ENEMY_BOT_NAMES[enemyIdx] ?? bot.name;
          if (enemyIdx < tSize) {
            const [ox, oz] = ENEMY_SPAWN_OFFSETS[enemyIdx];
            resetBotPose(bot, ox, -spawnZ + oz, 0);
          } else {
            bot.active = false;
            bot.alive = false;
            bot.rig.root.visible = false;
          }
          enemyIdx += 1;
        }
      }

      match.roundNumber = roundNum;
      match.roundTimer = 90;
      match.roundBanner =
        tSize === 1 ? `ROUND ${roundNum} — FIGHT` : `ROUND ${roundNum} · ${tSize}v${tSize} — FIGHT`;
      match.primaryAmmo = resolveGunSpec(
        PRIMARY_WEAPONS[cfg.primary],
        weaponBuildsRef.current[cfg.primary]
      ).magSize;
      match.secondaryAmmo = resolveGunSpec(
        SECONDARY_WEAPONS[cfg.secondary],
        weaponBuildsRef.current[cfg.secondary]
      ).magSize;
      match.utilityCharges =
        resolveUtilitySpec(UTILITY_ITEMS[cfg.utility], weaponBuildsRef.current[cfg.utility])
          .charges + (perk?.extraUtility ?? 0);
      match.reloading = false;
      match.burstQueue = 0;
      match.fireCooldown = 0.25;
      match.camRecoilPitch = 0;
      match.camRecoilYaw = 0;
      match.camTilt = 0;
      match.landDip = 0;
      match.muzzleFlashTimer = 0;
      match.boltKick = 0;
      match.damageFlash = 0;
      match.aberrationPulse = 0;
      match.hitMarker = 'none';
      selectSlot(0);
    };

    const setupMpRound = (room: MpRoomSnapshot) => {
      clearDynamicObjects();
      if (mapRef.current !== room.mapId) {
        mapRef.current = room.mapId;
        rebuildMap(room.mapId);
      }
      const cfg = loadoutRef.current;
      const myId = mpPlayerIdRef.current;
      const me = room.players.find((p) => p.id === myId);
      const myTeam = me?.team ?? 'alpha';

      const quizPerk =
        quizStateRef.current &&
        !quizStateRef.current.hadWrongAttempt &&
        quizStateRef.current.perk.label === me?.perkLabel
          ? quizStateRef.current.perk
          : null;

      match.activePerk =
        quizPerk ??
        (me?.perkLabel
          ? {
              id: me.damageMult > 1 ? 'damage' : 'shield',
              label: me.perkLabel,
              bonusHp: me.bonusHp,
              damageMult: me.damageMult,
              speedMult: 1,
              extraUtility: 0,
            }
          : null);
      match.playerMaxHp = me?.maxHp ?? 100 + (me?.bonusHp ?? 0);
      match.orbActive = room.orbActive;
      match.orbRespawnTimer = room.orbRespawnTimer;
      match.factToast = null;
      match.factToastTimer = 0;
      match.killFeed = room.killFeed.map((kf) => ({
        id: kf.id,
        killerName: kf.killerName,
        killerTeam: kf.killerTeam === myTeam ? 'ally' : 'enemy',
        victimName: kf.victimName,
        victimTeam: kf.victimTeam === myTeam ? 'ally' : 'enemy',
        headshot: kf.headshot,
      }));
      knowledgeOrbGroup.position.set(0, getOrbBaseY(room.mapId), 0);
      knowledgeOrbGroup.visible = room.orbActive;

      const sx = me?.x ?? 0;
      const sz = me?.z ?? ARENA_MAPS[room.mapId].spawnZ;
      const pFloor = getMapFloorHeightAt(room.mapId, sx, sz, 0);
      player.pos.set(sx, pFloor + 1.75, sz);
      player.vel.set(0, 0, 0);
      player.yaw = me?.yaw ?? (myTeam === 'alpha' ? 0 : Math.PI);
      player.pitch = 0;
      player.grounded = true;
      player.alive = me?.alive ?? true;
      player.hp = me?.hp ?? match.playerMaxHp;
      player.sliding = false;
      player.slideTimer = 0;
      player.ads = false;

      syncMpBotsFromRoom(room, true);
      syncRemotePlayersFromRoom(room);

      match.playerRounds = myTeam === 'alpha' ? room.alphaRounds : room.omegaRounds;
      match.rivalRounds = myTeam === 'alpha' ? room.omegaRounds : room.alphaRounds;
      match.roundNumber = room.roundNumber;
      match.roundTimer = room.roundTimer;
      match.roundBanner = room.roundBanner;
      match.primaryAmmo = resolveGunSpec(
        PRIMARY_WEAPONS[cfg.primary],
        weaponBuildsRef.current[cfg.primary]
      ).magSize;
      match.secondaryAmmo = resolveGunSpec(
        SECONDARY_WEAPONS[cfg.secondary],
        weaponBuildsRef.current[cfg.secondary]
      ).magSize;
      match.utilityCharges =
        resolveUtilitySpec(UTILITY_ITEMS[cfg.utility], weaponBuildsRef.current[cfg.utility])
          .charges + (match.activePerk?.extraUtility ?? 0);
      match.reloading = false;
      match.burstQueue = 0;
      match.fireCooldown = 0.25;
      match.camRecoilPitch = 0;
      match.camRecoilYaw = 0;
      match.camTilt = 0;
      match.landDip = 0;
      match.muzzleFlashTimer = 0;
      match.boltKick = 0;
      match.damageFlash = 0;
      match.aberrationPulse = 0;
      match.hitMarker = 'none';
      selectSlot(0);
    };

    const finishRound = (playerWon: boolean, reason: string) => {
      if (gameStateRef.current !== 'PLAYING') return;
      if (playerWon) {
        match.playerRounds += 1;
        match.roundBanner = `ROUND WON · ${reason}`;
      } else {
        match.rivalRounds += 1;
        match.roundBanner = `ROUND LOST · ${reason}`;
      }
      shooterAudio.playRoundEnd(playerWon);

      if (match.playerRounds >= ROUNDS_TO_WIN || match.rivalRounds >= ROUNDS_TO_WIN) {
        const wonMatch = match.playerRounds >= ROUNDS_TO_WIN;
        const outcome = recordMatchPerformance({
          won: wonMatch,
          difficulty: difficultyRef.current,
          roundsWon: match.playerRounds,
          kills: match.kills,
          headshots: match.headshots,
          damageDealt: match.totalDamageDealt,
          shotsFired: match.shotsFired,
          shotsHit: match.shotsHit,
          quizCorrect: quizStatsRef.current.correct,
          quizTotal: quizStatsRef.current.total,
        });
        setCareer(outcome.career);
        setLastMatchXp(outcome.breakdown);
        if (document.pointerLockElement) document.exitPointerLock?.();
        setGameState('GAME_OVER');
      } else {
        if (document.pointerLockElement) document.exitPointerLock?.();
        match.roundEndTimer = 3.2;
        setGameState('ROUND_END');
      }
      pushHud();
    };

    const checkTeamEliminationRoundEnd = (lastVictimHeadshot: boolean) => {
      const enemiesRemaining = bots.filter(
        (b) => b.active && b.team === 'enemy' && b.alive
      ).length;
      const alliesRemaining =
        (player.alive ? 1 : 0) +
        bots.filter((b) => b.active && b.team === 'ally' && b.alive).length;

      if (enemiesRemaining === 0) {
        const reason =
          teamSizeRef.current === 1
            ? lastVictimHeadshot
              ? 'Headshot Elimination'
              : 'Rival Eliminated'
            : 'Enemy Squad Eliminated';
        finishRound(true, reason);
      } else if (alliesRemaining === 0) {
        finishRound(
          false,
          teamSizeRef.current === 1 ? 'Eliminated by Rival' : 'Allied Squad Eliminated'
        );
      }
    };

    const completeTutorial = () => {
      if (!match.tutorial.active || match.tutorial.completed) return;
      match.tutorial.completed = true;
      match.tutorial.step = TUTORIAL_STEPS.length - 1;
      match.roundBanner = null;
      match.mouseDown = false;
      match.rightDown = false;
      player.ads = false;
      shooterAudio.playRoundEnd(true);
      if (document.pointerLockElement) document.exitPointerLock?.();
      pushHud();
    };

    const prepareTutorialStepState = (stepIdx: number) => {
      const cfg = loadoutRef.current;
      if (stepIdx === 3) {
        const activeMax =
          match.activeSlot === 1
            ? resolveGunSpec(SECONDARY_WEAPONS[cfg.secondary], weaponBuildsRef.current[cfg.secondary])
                .magSize
            : resolveGunSpec(PRIMARY_WEAPONS[cfg.primary], weaponBuildsRef.current[cfg.primary])
                .magSize;
        if (match.activeSlot === 1 && match.secondaryAmmo >= activeMax) {
          match.secondaryAmmo = Math.max(0, activeMax - 1);
        } else if (match.activeSlot !== 1 && match.primaryAmmo >= activeMax) {
          match.primaryAmmo = Math.max(0, activeMax - 1);
        }
      } else if (stepIdx === 5) {
        match.utilityCharges = Math.max(1, match.utilityCharges);
      } else if (stepIdx === 6) {
        const trainingBot = bots.find((b) => b.active && b.team === 'enemy');
        if (trainingBot) {
          trainingBot.hp = MAX_HP;
          trainingBot.alive = true;
          trainingBot.knockedDown = false;
          trainingBot.knockdownProgress = 0;
          trainingBot.fireTimer = 0.9;
        }
      }
    };

    const advanceTutorialStep = () => {
      if (!match.tutorial.active || match.tutorial.completed) return;
      const nextStep = match.tutorial.step + 1;
      match.tutorial.hits = 0;
      if (nextStep >= TUTORIAL_STEPS.length) {
        completeTutorial();
        return;
      }
      match.tutorial.step = nextStep;
      match.roundBanner = null;
      prepareTutorialStepState(nextStep);
      shooterAudio.playHeal();
      pushHud();
    };

    const damageRemotePlayer = (
      target: RemotePlayerEntity,
      dmg: number,
      headshot: boolean,
      hitPoint: THREE.Vector3,
      weaponId: WeaponId
    ) => {
      if (!target.alive || target.knockedDown || target.team !== 'enemy') return;
      const dealt = Math.round(dmg);
      target.flinchTimer = 0.16;
      match.totalDamageDealt += dealt;
      if (headshot) match.headshots += 1;
      match.hitMarker = headshot ? 'headshot' : 'hit';
      match.hitMarkerTimer = 0.16;
      shooterAudio.playHitmarker(headshot);
      addDamagePopup(hitPoint, dealt, headshot);
      spawnSparks(hitPoint, headshot ? 0xfbbf24 : 0xf43f5e, headshot ? 11 : 6);

      const build = weaponBuildsRef.current[weaponId];
      const finisherId: FinisherId = build?.finisher ?? 'standard';
      mpClientRef.current?.sendHitPlayer({
        targetId: target.id,
        damage: dealt,
        headshot,
        hitPoint: [hitPoint.x, hitPoint.y, hitPoint.z],
        weaponId,
        finisherId,
        colorHex: build?.colorHex ?? '#38bdf8',
      });
    };

    const damageBot = (
      target: BotEntity,
      dmg: number,
      headshot: boolean,
      hitPoint: THREE.Vector3,
      attackerName: string,
      attackerTeam: TeamSide,
      isPlayerAttacker: boolean,
      weaponId?: WeaponId
    ) => {
      if (!target.active || !target.alive || target.knockedDown) return;
      const dealt = Math.round(dmg);
      target.hp = Math.max(0, target.hp - dealt);
      target.flinchTimer = 0.16;

      if (match.tutorial.active && match.tutorial.step < 6 && target.team === 'enemy') {
        if (target.hp < 45) target.hp = MAX_HP;
      }

      if (isPlayerAttacker) {
        match.totalDamageDealt += dealt;
        if (headshot) match.headshots += 1;
        match.hitMarker = headshot ? 'headshot' : 'hit';
        match.hitMarkerTimer = 0.16;
        shooterAudio.playHitmarker(headshot);
        addDamagePopup(hitPoint, dealt, headshot);

        if (
          match.tutorial.active &&
          !match.tutorial.completed &&
          match.tutorial.step === 2 &&
          target.team === 'enemy' &&
          player.ads
        ) {
          match.tutorial.hits += 1;
          if (match.tutorial.hits >= 2) {
            advanceTutorialStep();
          }
        }
      }

      spawnSparks(
        hitPoint,
        headshot ? 0xfbbf24 : target.team === 'enemy' ? 0xf43f5e : 0x38bdf8,
        headshot ? 11 : 6
      );

      if (mpRoomRef.current && isPlayerAttacker) {
        const usedWeapon: WeaponId = weaponId ?? 'assault_rifle';
        const build = weaponBuildsRef.current[usedWeapon];
        const finisherId: FinisherId = build?.finisher ?? 'standard';
        mpClientRef.current?.sendHitBot({
          botId: target.mpId,
          damage: dealt,
          headshot,
          hitPoint: [hitPoint.x, hitPoint.y, hitPoint.z],
          weaponId: usedWeapon,
          finisherId,
          colorHex: build?.colorHex ?? '#38bdf8',
        });
        return;
      }

      if (target.hp <= 0) {
        target.alive = false;
        target.knockedDown = true;
        target.knockdownProgress = 0;
        target.rig.muzzleFlash.visible = false;
        if (isPlayerAttacker && target.team === 'enemy') {
          match.kills += 1;
        }
        match.killFeed = [
          ...match.killFeed.slice(-3),
          {
            id: match.nextPopupId++,
            killerName: attackerName,
            killerTeam: attackerTeam,
            victimName: target.name,
            victimTeam: target.team,
            headshot,
          },
        ];

        _v1.copy(target.pos);
        _v1.y += 1.4;
        spawnSparks(_v1, target.team === 'enemy' ? 0xf43f5e : 0x38bdf8, 22);
        _v2.copy(target.pos);
        _v2.y += 0.15;
        spawnShockwave(
          _v2,
          headshot ? 0xfbbf24 : target.team === 'enemy' ? 0xf43f5e : 0x38bdf8,
          6.8
        );
        explosionLight.color.setHex(headshot ? 0xfbbf24 : 0xf43f5e);
        explosionLight.position.copy(_v1);
        explosionLight.intensity = 14;
        shooterAudio.playExplosion();

        if (isPlayerAttacker && weaponId) {
          const build = weaponBuildsRef.current[weaponId];
          const finisherId: FinisherId = build?.finisher ?? 'standard';
          const wColor = cssHexToNum(build?.colorHex ?? '#38bdf8', 0x38bdf8);
          spawnFinisherEffect(target.pos, finisherId, wColor);
          shooterAudio.playFinisher(finisherId);
        }

        if (match.tutorial.active) {
          if (target.team === 'enemy') completeTutorial();
        } else if (!mpRoomRef.current) {
          checkTeamEliminationRoundEnd(headshot);
        }
      }
    };

    const damagePlayer = (dmg: number, headshot: boolean, killerName: string) => {
      if (!player.alive) return;
      if (mpRoomRef.current) {
        const myId = mpPlayerIdRef.current;
        if (myId) {
          mpClientRef.current?.sendBotDamagePlayer({
            botName: killerName,
            targetPlayerId: myId,
            damage: Math.round(dmg),
            headshot,
          });
        }
        return;
      }
      const appliedDmg = match.tutorial.active ? Math.min(2, Math.round(dmg)) : Math.round(dmg);
      player.hp = match.tutorial.active
        ? Math.max(40, player.hp - appliedDmg)
        : Math.max(0, player.hp - appliedDmg);
      match.damageFlash = 0.75;
      match.camRecoilPitch += 0.025;
      shooterAudio.playPlayerHit();
      if (!match.tutorial.active && player.hp <= 0) {
        player.alive = false;
        player.ads = false;
        match.reloading = false;
        match.burstQueue = 0;
        match.killFeed = [
          ...match.killFeed.slice(-3),
          {
            id: match.nextPopupId++,
            killerName,
            killerTeam: 'enemy',
            victimName: 'YOU',
            victimTeam: 'ally',
            headshot,
          },
        ];
        const alliesRemaining = bots.filter(
          (b) => b.active && b.team === 'ally' && b.alive
        ).length;
        if (alliesRemaining === 0) {
          finishRound(
            false,
            teamSizeRef.current === 1 ? 'Eliminated by Rival' : 'Allied Squad Eliminated'
          );
        } else {
          match.roundBanner = 'ELIMINATED · SPECTATING TEAMMATES';
        }
      }
    };

    const fireGunSpec = (spec: typeof PRIMARY_WEAPONS.assault_rifle, clientX?: number, clientY?: number) => {
      if (!player.alive) return;
      const isPrimary = spec.category === 'primary';
      const ammoCount = isPrimary ? match.primaryAmmo : match.secondaryAmmo;
      if (ammoCount <= 0) {
        triggerReload();
        return;
      }

      if (isPrimary) match.primaryAmmo -= 1;
      else match.secondaryAmmo -= 1;

      match.recoil = Math.min(0.24, match.recoil + spec.recoilKick);
      match.camRecoilPitch += spec.recoilKick * 0.42 * (player.ads ? 0.65 : 1);
      match.camRecoilYaw += (Math.random() - 0.5) * spec.recoilKick * 0.22;
      match.boltKick = 0.055;
      match.muzzleFlashTimer = 0.045;
      viewmodel.muzzleFlash.visible = true;
      viewmodel.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
      const flashScale =
        spec.id === 'sniper' || spec.id === 'shotgun' || spec.id === 'rpg' ? 1.55 : 0.95;
      viewmodel.muzzleFlash.scale.setScalar(flashScale * (0.85 + Math.random() * 0.35));

      match.shotsFired += 1;
      muzzleLight.intensity = 6.5;
      if (spec.id === 'sniper' || spec.id === 'shotgun' || spec.id === 'rpg') {
        match.aberrationPulse = 0.0048;
      }
      shooterAudio.playGunshot(spec.id);
      if (spec.id !== 'revolver' && spec.id !== 'rpg') {
        spawnShellCasing();
      }

      if (!match.pointerLocked && clientX !== undefined && clientY !== undefined) {
        const rect = renderer.domElement.getBoundingClientRect();
        _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      } else {
        _ndc.set(0, 0);
      }

      camera.updateMatrixWorld(true);
      raycaster.setFromCamera(_ndc, camera);
      const baseDir = raycaster.ray.direction.clone().normalize();
      viewmodel.muzzlePoint.getWorldPosition(_v2);
      if (!player.ads) {
        spawnSmokePuff(_v2, 0xcbd5e1, 0.08, 0.24, 0.28, 0.14, 0.7);
      }

      const spread = player.ads ? spec.adsSpread : spec.spread;

      // Projectile Launcher Path (RPG)
      if (spec.projectileSpeed) {
        _rayDir.copy(baseDir);
        if (spread > 0) {
          _rayDir.x += (Math.random() - 0.5) * spread;
          _rayDir.y += (Math.random() - 0.5) * spread;
          _rayDir.z += (Math.random() - 0.5) * spread;
          _rayDir.normalize();
        }
        const aimCoverDist = getWorldCoverDistance(camera.position, _rayDir, 85);
        _v3.copy(camera.position).addScaledVector(_rayDir, Math.min(aimCoverDist, 55));

        _losDir.subVectors(_v2, camera.position);
        const camToMuzzleDist = _losDir.length();
        const rocketSpawn = _v2.clone();
        if (camToMuzzleDist > 0.01) {
          _losDir.divideScalar(camToMuzzleDist);
          const wallToMuzzle = getWorldCoverDistance(
            camera.position,
            _losDir,
            camToMuzzleDist + 0.08
          );
          if (wallToMuzzle < camToMuzzleDist) {
            rocketSpawn
              .copy(camera.position)
              .addScaledVector(_losDir, Math.max(0.05, wallToMuzzle - 0.08));
          }
        }

        const rocketDir = _v3.clone().sub(rocketSpawn).normalize();
        if (rocketDir.lengthSq() < 0.01) rocketDir.copy(_rayDir);
        spawnRocket(
          rocketSpawn,
          rocketDir,
          spec.projectileSpeed,
          spec.damage * (match.activePerk?.damageMult ?? 1),
          spec.splashRadius ?? 6.5,
          spec.color
        );
        const remaining = isPrimary ? match.primaryAmmo : match.secondaryAmmo;
        if (remaining === 0) triggerReload();
        return;
      }

      let hitAny = false;
      const aliveEnemyRoots: THREE.Object3D[] = [
        ...bots
          .filter(
            (b) => b.active && b.team === 'enemy' && b.alive && !b.knockedDown && b.rig.root.visible
          )
          .map((b) => b.rig.root),
      ];
      for (const rp of remotePlayers.values()) {
        if (rp.team === 'enemy' && rp.alive && !rp.knockedDown && rp.rig.root.visible) {
          aliveEnemyRoots.push(rp.rig.root);
        }
      }

      for (let p = 0; p < spec.pellets; p++) {
        _rayDir.copy(baseDir);
        if (spread > 0) {
          _rayDir.x += (Math.random() - 0.5) * spread;
          _rayDir.y += (Math.random() - 0.5) * spread;
          _rayDir.z += (Math.random() - 0.5) * spread;
          _rayDir.normalize();
        }

        const coverDist = getCoverHitDistance(camera.position, _rayDir, 110);
        worldRaycaster.set(camera.position, _rayDir);
        worldRaycaster.near = 0;
        worldRaycaster.far = coverDist;
        const worldHits =
          coverDist > 0.001
            ? worldRaycaster.intersectObjects([arenaGroup, terrainMesh], true)
            : [];
        const firstSolidWorldHit = worldHits.find((h) => isSolidWorldObject(h.object));
        const firstWaterHit = worldHits.find((h) => Boolean(h.object.userData?.isWater));
        const blockDist = firstSolidWorldHit
          ? Math.min(coverDist, firstSolidWorldHit.distance)
          : coverDist;

        let hits: THREE.Intersection<THREE.Object3D>[] = [];
        if (blockDist > 0.005 && aliveEnemyRoots.length > 0) {
          raycaster.set(camera.position, _rayDir);
          raycaster.near = 0;
          raycaster.far = blockDist;
          hits = raycaster.intersectObjects(aliveEnemyRoots, true);
        }

        if (hits.length > 0) {
          const hit = hits[0];
          const isHead = Boolean(hit.object.userData?.isCritZone);
          const dmg =
            spec.damage *
            (isHead ? spec.headshotMult : 1) *
            (match.activePerk?.damageMult ?? 1);
          const hitRemoteId = hit.object.userData?.remotePlayerId as string | undefined;
          const targetRemote = hitRemoteId ? remotePlayers.get(hitRemoteId) : undefined;
          if (targetRemote) {
            damageRemotePlayer(targetRemote, dmg, isHead, hit.point, spec.id as WeaponId);
            spawnTracer(_v2, hit.point, spec.color, spec.id === 'sniper' ? 0.045 : 0.022);
            spawnSparks(hit.point, isHead ? 0xfbbf24 : spec.color, isHead ? 9 : 4);
            hitAny = true;
            if (mpRoomRef.current && p === 0) {
              mpClientRef.current?.sendFireFx({
                weaponId: spec.id,
                from: [_v2.x, _v2.y, _v2.z],
                to: [hit.point.x, hit.point.y, hit.point.z],
                colorHex: spec.color,
              });
            }
          } else {
            const hitBotId = hit.object.userData?.botId as string | undefined;
            const targetBot = bots.find((b) => b.id === hitBotId);
            if (targetBot) {
              damageBot(
                targetBot,
                dmg,
                isHead,
                hit.point,
                'YOU',
                'ally',
                true,
                spec.id as WeaponId
              );
              spawnTracer(_v2, hit.point, spec.color, spec.id === 'sniper' ? 0.045 : 0.022);
              spawnSparks(hit.point, isHead ? 0xfbbf24 : spec.color, isHead ? 9 : 4);
              hitAny = true;
              if (mpRoomRef.current && p === 0) {
                mpClientRef.current?.sendFireFx({
                  weaponId: spec.id,
                  from: [_v2.x, _v2.y, _v2.z],
                  to: [hit.point.x, hit.point.y, hit.point.z],
                  colorHex: spec.color,
                });
              }
            }
          }
        } else {
          // Check world geometry (water surface / floor / platforms / containers / ramps / pillars) for realistic bullet impacts
          if (firstWaterHit && firstWaterHit.distance <= blockDist) {
            const wh = firstWaterHit;
            const wCtrl = arenaGroup.userData.waterController as HydroWaterController | undefined;
            const lCtrl = arenaGroup.userData.lagoonWaterController as
              | HydroWaterController
              | undefined;
            const rippleStrength =
              spec.id === 'sniper' || spec.id === 'shotgun' ? 1.55 : 0.95;
            wCtrl?.addRipple(wh.point.x, wh.point.z, rippleStrength);
            lCtrl?.addRipple(wh.point.x, wh.point.z, rippleStrength);
            spawnTracer(_v2, wh.point, spec.color, spec.id === 'sniper' ? 0.04 : 0.02);
            spawnSparks(wh.point, 0xe0f2fe, 7);
            spawnSmokePuff(wh.point, 0xe0f2fe, 0.2, 0.92, 0.42, 0.36, 2.5);
            spawnShockwave(wh.point, 0x7dd3fc, 1.75);
            shooterAudio.playWaterSplash(0.36);
            if (mpRoomRef.current && p === 0) {
              mpClientRef.current?.sendFireFx({
                weaponId: spec.id,
                from: [_v2.x, _v2.y, _v2.z],
                to: [wh.point.x, wh.point.y, wh.point.z],
                colorHex: spec.color,
                hitWater: true,
              });
              mpClientRef.current?.sendWaterRipple(wh.point.x, wh.point.z, rippleStrength);
            }
          } else if (firstSolidWorldHit) {
            const wh = firstSolidWorldHit;
            const hitTerrain = wh.object === terrainMesh;
            const mapGroundDust =
              mapRef.current === 'arena'
                ? 0xb49674
                : mapRef.current === 'hydro' || mapRef.current === 'splash'
                  ? 0xbae6fd
                  : 0x718061;
            spawnTracer(_v2, wh.point, spec.color, spec.id === 'sniper' ? 0.04 : 0.02);
            spawnSparks(wh.point, hitTerrain ? mapGroundDust : spec.color, hitTerrain ? 3 : 5);
            spawnDebris(wh.point, hitTerrain ? mats.rockMat : mats.concreteMat, hitTerrain ? 4 : 3);
            spawnSmokePuff(
              wh.point,
              hitTerrain ? mapGroundDust : 0xcbd5e1,
              0.24,
              1.05,
              0.45,
              0.3,
              1.6
            );
            if (wh.face) {
              _v1.copy(wh.face.normal).transformDirection(wh.object.matrixWorld);
              spawnImpactMark(wh.point, _v1);
            }
            if (mpRoomRef.current && p === 0) {
              mpClientRef.current?.sendFireFx({
                weaponId: spec.id,
                from: [_v2.x, _v2.y, _v2.z],
                to: [wh.point.x, wh.point.y, wh.point.z],
                colorHex: spec.color,
              });
            }
          } else {
            _v3.copy(camera.position).addScaledVector(_rayDir, Math.min(coverDist, 75));
            spawnTracer(_v2, _v3, spec.color, spec.id === 'sniper' ? 0.04 : 0.02);
            if (coverDist < 105) {
              spawnSparks(_v3, spec.color, 4);
            }
            if (mpRoomRef.current && p === 0) {
              mpClientRef.current?.sendFireFx({
                weaponId: spec.id,
                from: [_v2.x, _v2.y, _v2.z],
                to: [_v3.x, _v3.y, _v3.z],
                colorHex: spec.color,
              });
            }
          }
        }
        raycaster.far = Infinity;
      }

      if (hitAny) match.shotsHit += 1;

      const remaining = isPrimary ? match.primaryAmmo : match.secondaryAmmo;
      if (remaining === 0) triggerReload();
    };

    const triggerReload = () => {
      if (match.reloading || !player.alive) return;
      if (match.tutorial.active && match.tutorial.step === 3 && match.activeSlot > 1) {
        selectSlot(0);
      }
      if (match.activeSlot === 0) {
        const max = resolveGunSpec(
          PRIMARY_WEAPONS[loadoutRef.current.primary],
          weaponBuildsRef.current[loadoutRef.current.primary]
        ).magSize;
        if (match.tutorial.active && match.tutorial.step === 3 && match.primaryAmmo >= max) {
          match.primaryAmmo = Math.max(0, max - 1);
        }
        if (match.primaryAmmo < max) {
          match.reloading = true;
          match.reloadTimer = 0;
          shooterAudio.playReload();
        }
      } else if (match.activeSlot === 1) {
        const max = resolveGunSpec(
          SECONDARY_WEAPONS[loadoutRef.current.secondary],
          weaponBuildsRef.current[loadoutRef.current.secondary]
        ).magSize;
        if (match.tutorial.active && match.tutorial.step === 3 && match.secondaryAmmo >= max) {
          match.secondaryAmmo = Math.max(0, max - 1);
        }
        if (match.secondaryAmmo < max) {
          match.reloading = true;
          match.reloadTimer = 0;
          shooterAudio.playReload();
        }
      }
    };

    const useActiveSlot = (clientX?: number, clientY?: number) => {
      if (
        gameStateRef.current !== 'PLAYING' ||
        !player.alive ||
        match.reloading ||
        match.fireCooldown > 0
      ) {
        return;
      }

      const cfg = loadoutRef.current;
      const builds = weaponBuildsRef.current;

      if (match.activeSlot === 0) {
        const spec = resolveGunSpec(PRIMARY_WEAPONS[cfg.primary], builds[cfg.primary]);
        match.fireCooldown = spec.fireInterval;
        if (spec.burstCount && spec.burstCount > 1 && !spec.auto) {
          fireGunSpec(spec, clientX, clientY);
          match.burstQueue = spec.burstCount - 1;
          match.burstTimer = 0.065;
        } else {
          fireGunSpec(spec, clientX, clientY);
        }
      } else if (match.activeSlot === 1) {
        const spec = resolveGunSpec(SECONDARY_WEAPONS[cfg.secondary], builds[cfg.secondary]);
        match.fireCooldown = spec.fireInterval;
        fireGunSpec(spec, clientX, clientY);
      } else if (match.activeSlot === 2) {
        // Melee Slash + Forward Lunge Dash + Luminous Crescent Arc (cleaves enemies in range)!
        const melee = resolveMeleeSpec(MELEE_WEAPONS[cfg.melee], builds[cfg.melee]);
        match.fireCooldown = melee.cooldown;
        match.meleeSwingTimer = 0.22;
        shooterAudio.playMeleeSlash();

        _forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
        camera.getWorldDirection(_v3);
        spawnMeleeSlashArc(camera.position, _v3, melee.color);
        player.vel.x += _forward.x * melee.dashImpulse;
        player.vel.z += _forward.z * melee.dashImpulse;
        if (mpRoomRef.current) {
          mpClientRef.current?.sendMeleeFx(
            [camera.position.x, camera.position.y, camera.position.z],
            [_v3.x, _v3.y, _v3.z],
            melee.color
          );
        }

        for (const bot of bots) {
          if (!bot.active || bot.team !== 'enemy' || !bot.alive || !bot.rig.root.visible) continue;
          const dist = player.pos.distanceTo(_v1.set(bot.pos.x, bot.pos.y + 1.4, bot.pos.z));
          if (dist <= melee.range) {
            _v2.subVectors(_v1, player.pos).normalize();
            _losTargetHead.set(bot.pos.x, bot.pos.y + 1.72, bot.pos.z);
            if (
              _v2.dot(_v3) > 0.42 &&
              (hasClearWorldLine(camera.position, _v1, 0.05) ||
                hasClearWorldLine(camera.position, _losTargetHead, 0.05))
            ) {
              damageBot(
                bot,
                melee.damage * (match.activePerk?.damageMult ?? 1),
                false,
                _v1,
                'YOU',
                'ally',
                true,
                cfg.melee
              );
              spawnSparks(_v1, melee.color, 10);
            }
          }
        }
        for (const rp of remotePlayers.values()) {
          if (rp.team !== 'enemy' || !rp.alive || rp.knockedDown || !rp.rig.root.visible) continue;
          const dist = player.pos.distanceTo(_v1.set(rp.pos.x, rp.pos.y + 1.4, rp.pos.z));
          if (dist <= melee.range) {
            _v2.subVectors(_v1, player.pos).normalize();
            _losTargetHead.set(rp.pos.x, rp.pos.y + 1.72, rp.pos.z);
            if (
              _v2.dot(_v3) > 0.42 &&
              (hasClearWorldLine(camera.position, _v1, 0.05) ||
                hasClearWorldLine(camera.position, _losTargetHead, 0.05))
            ) {
              damageRemotePlayer(
                rp,
                melee.damage * (match.activePerk?.damageMult ?? 1),
                false,
                _v1,
                cfg.melee
              );
              spawnSparks(_v1, melee.color, 10);
            }
          }
        }
        if (match.tutorial.active && !match.tutorial.completed && match.tutorial.step === 4) {
          advanceTutorialStep();
        }
      } else if (match.activeSlot === 3) {
        if (match.utilityCharges <= 0) return;
        const util = resolveUtilitySpec(UTILITY_ITEMS[cfg.utility], builds[cfg.utility]);
        match.utilityCharges -= 1;
        match.fireCooldown = Math.max(0.35, util.cooldown * 0.14);

        if (cfg.utility === 'medkit') {
          const healAmount = Math.round(55 * util.powerMult);
          player.hp = Math.min(match.playerMaxHp, player.hp + healAmount);
          shooterAudio.playHeal();
          if (mpRoomRef.current) {
            mpClientRef.current?.sendMedkitHeal(healAmount);
          }
        } else {
          // Throw physical bouncing Grenade or Flashbang (prevent spawning inside/past walls)
          camera.getWorldDirection(_v1);
          const wallDist = getWorldCoverDistance(player.pos, _v1, 0.95);
          const throwOffset = Math.max(0.15, Math.min(0.9, wallDist - 0.22));
          const mesh = new THREE.Mesh(
            grenadeGeo,
            new THREE.MeshStandardMaterial({
              color: util.color,
              roughness: 0.9,
              metalness: 0,
              envMapIntensity: 0,
            })
          );
          mesh.position.copy(player.pos).addScaledVector(_v1, throwOffset);
          scene.add(mesh);
          thrownItems.push({
            mesh,
            vel: _v1
              .clone()
              .multiplyScalar(22 * util.throwSpeedMult)
              .add(new THREE.Vector3(0, 5.2, 0)),
            life: cfg.utility === 'flashbang' ? 1.0 : 1.35,
            kind: cfg.utility,
            powerMult: util.powerMult,
          });
          shooterAudio.playMeleeSlash();
        }
        if (match.tutorial.active && !match.tutorial.completed && match.tutorial.step === 5) {
          advanceTutorialStep();
        }
      }
      pushHud();
    };

    const pushHud = () => {
      const mpRoom = mpRoomRef.current;
      const myMpTeam = getMyMpTeam(mpRoom);
      const myMpId = mpPlayerIdRef.current;
      const overheadMarkers: OverheadMarker[] = [];
      const allyRoster: TeamRosterStatus[] = [
        {
          id: 'player',
          name: 'YOU',
          team: 'ally',
          isPlayer: true,
          hp: Math.max(0, Math.round(player.hp)),
          maxHp: match.playerMaxHp,
          alive: player.alive,
        },
      ];
      const enemyRoster: TeamRosterStatus[] = [];

      if (mpRoom) {
        for (const p of mpRoom.players) {
          if (p.id === myMpId) continue;
          const visualTeam: TeamSide = p.team === myMpTeam ? 'ally' : 'enemy';
          const status: TeamRosterStatus = {
            id: p.id,
            name: p.name,
            team: visualTeam,
            isPlayer: true,
            hp: Math.max(0, Math.round(p.hp)),
            maxHp: p.maxHp,
            alive: p.alive,
          };
          if (visualTeam === 'ally') allyRoster.push(status);
          else enemyRoster.push(status);

          const rp = remotePlayers.get(p.id);
          if (p.alive && rp && rp.rig.root.visible) {
            _projVec.set(rp.pos.x, rp.pos.y + 3.05, rp.pos.z);
            _projVec.project(camera);
            const visible =
              _projVec.z < 1 &&
              _projVec.x > -0.95 &&
              _projVec.x < 0.95 &&
              _projVec.y > -0.95 &&
              _projVec.y < 0.95;
            if (visible) {
              overheadMarkers.push({
                id: p.id,
                name: p.name,
                team: visualTeam,
                hp: Math.max(0, Math.round(p.hp)),
                maxHp: p.maxHp,
                x: (_projVec.x + 1) / 2,
                y: (1 - _projVec.y) / 2,
                visible: true,
              });
            }
          }
        }
      }

      for (const bot of bots) {
        if (!bot.active) continue;
        const status: TeamRosterStatus = {
          id: bot.id,
          name: bot.name,
          team: bot.team,
          isPlayer: false,
          hp: Math.max(0, Math.round(bot.hp)),
          maxHp: bot.maxHp,
          alive: bot.alive,
        };
        if (bot.team === 'ally') allyRoster.push(status);
        else enemyRoster.push(status);

        if (bot.alive && bot.rig.root.visible) {
          _projVec.set(bot.pos.x, bot.pos.y + 3.05, bot.pos.z);
          _projVec.project(camera);
          const visible =
            _projVec.z < 1 &&
            _projVec.x > -0.95 &&
            _projVec.x < 0.95 &&
            _projVec.y > -0.95 &&
            _projVec.y < 0.95;
          if (visible) {
            overheadMarkers.push({
              id: bot.id,
              name: bot.name,
              team: bot.team,
              hp: Math.max(0, Math.round(bot.hp)),
              maxHp: bot.maxHp,
              x: (_projVec.x + 1) / 2,
              y: (1 - _projVec.y) / 2,
              visible: true,
            });
          }
        }
      }

      const alliesAlive = allyRoster.filter((m) => m.alive).length;
      const enemiesAlive = enemyRoster.filter((m) => m.alive).length;
      const leadEnemy = enemyRoster.find((m) => m.alive);

      const screenPopups: DamagePopup[] = popups.map((p) => {
        _v1.copy(p.worldPos);
        _v1.y += p.age * 1.4;
        _v1.project(camera);
        return {
          id: p.id,
          amount: p.amount,
          crit: p.crit,
          x: (_v1.x + 1) / 2,
          y: (1 - _v1.y) / 2,
        };
      });

      const reloadDuration =
        match.activeSlot === 0
          ? resolveGunSpec(
              PRIMARY_WEAPONS[loadoutRef.current.primary],
              weaponBuildsRef.current[loadoutRef.current.primary]
            ).reloadTime
          : resolveGunSpec(
              SECONDARY_WEAPONS[loadoutRef.current.secondary],
              weaponBuildsRef.current[loadoutRef.current.secondary]
            ).reloadTime;

      const playerRoundsVal = mpRoom
        ? myMpTeam === 'alpha'
          ? mpRoom.alphaRounds
          : mpRoom.omegaRounds
        : match.playerRounds;
      const rivalRoundsVal = mpRoom
        ? myMpTeam === 'alpha'
          ? mpRoom.omegaRounds
          : mpRoom.alphaRounds
        : match.rivalRounds;
      const roundNumberVal = mpRoom ? mpRoom.roundNumber : match.roundNumber;
      const roundTimerVal = mpRoom ? mpRoom.roundTimer : match.roundTimer;
      const killFeedVal = mpRoom
        ? mpRoom.killFeed.map((kf) => ({
            id: kf.id,
            killerName: kf.killerName,
            killerTeam: (kf.killerTeam === myMpTeam ? 'ally' : 'enemy') as TeamSide,
            victimName: kf.victimName,
            victimTeam: (kf.victimTeam === myMpTeam ? 'ally' : 'enemy') as TeamSide,
            headshot: kf.headshot,
          }))
        : match.killFeed;

      setHud({
        teamSize: teamSizeRef.current,
        playerHp: Math.max(0, Math.round(player.hp)),
        maxHp: match.playerMaxHp,
        playerAlive: player.alive,
        rivalHp: leadEnemy ? leadEnemy.hp : 0,
        alliesAlive,
        enemiesAlive,
        allyRoster,
        enemyRoster,
        playerRounds: playerRoundsVal,
        rivalRounds: rivalRoundsVal,
        roundNumber: roundNumberVal,
        roundsToWin: ROUNDS_TO_WIN,
        roundTimer: Math.max(0, Math.ceil(roundTimerVal)),
        activeSlot: match.activeSlot,
        primaryAmmo: match.primaryAmmo,
        secondaryAmmo: match.secondaryAmmo,
        utilityCharges: match.utilityCharges,
        reloading: match.reloading,
        reloadProgress: match.reloading ? Math.min(1, match.reloadTimer / reloadDuration) : 0,
        sliding: player.sliding,
        ads: player.ads,
        dashReady: player.slideCooldown <= 0,
        pointerLocked: match.pointerLocked,
        roundBanner: match.roundBanner,
        damageFlash: match.damageFlash,
        hitMarker: match.hitMarker,
        overheadMarkers,
        damagePopups: screenPopups,
        killFeed: killFeedVal,
        totalDamageDealt: match.totalDamageDealt,
        kills: match.kills,
        headshots: match.headshots,
        shotsFired: match.shotsFired,
        shotsHit: match.shotsHit,
        activePerkLabel: match.activePerk?.label ?? null,
        factToast: match.factToast,
        fps: fpsRef.current,
        tutorial: {
          active: match.tutorial.active,
          step: match.tutorial.step,
          totalSteps: TUTORIAL_STEPS.length,
          completed: match.tutorial.completed,
          moveDist: match.tutorial.moveDist,
          hits: match.tutorial.hits,
        },
      });
    };

    const rebuildViewmodel = (cfg: LoadoutConfig, builds?: WeaponBuildsMap) => {
      camera.remove(viewmodel.root);
      viewmodel = buildRivalsViewmodel(cfg, mats, builds ?? weaponBuildsRef.current);
      camera.add(viewmodel.root);
      viewmodel.slotGroups.forEach((g, idx) => {
        g.visible = idx === match.activeSlot;
      });
    };

    apiRef.current = {
      prepareMatch: (cfg: LoadoutConfig) => {
        match.tutorial = {
          active: false,
          step: 0,
          completed: false,
          moveDist: 0,
          hits: 0,
        };
        rebuildMap(mapRef.current);
        rebuildViewmodel(cfg);
        match.playerRounds = 0;
        match.rivalRounds = 0;
        match.totalDamageDealt = 0;
        match.kills = 0;
        match.headshots = 0;
        match.shotsFired = 0;
        match.shotsHit = 0;
        setupRound(1, null);
        pushHud();
      },
      startTutorial: () => {
        const cfg = loadoutRef.current;
        rebuildMap(mapRef.current);
        rebuildViewmodel(cfg);
        clearDynamicObjects();
        match.playerRounds = 0;
        match.rivalRounds = 0;
        match.totalDamageDealt = 0;
        match.kills = 0;
        match.headshots = 0;
        match.shotsFired = 0;
        match.shotsHit = 0;
        match.activePerk = null;
        match.playerMaxHp = MAX_HP;
        match.orbActive = true;
        match.orbRespawnTimer = 0;
        match.factToast = null;
        match.factToastTimer = 0;
        match.killFeed = [];
        knowledgeOrbGroup.position.set(0, getOrbBaseY(mapRef.current), 0);
        knowledgeOrbGroup.visible = true;

        const playerSpawnZ = Math.min(22, ARENA_MAPS[mapRef.current].spawnZ - 4);
        const pFloor = getMapFloorHeightAt(mapRef.current, 0, playerSpawnZ, 0);
        player.pos.set(0, pFloor + 1.75, playerSpawnZ);
        player.vel.set(0, 0, 0);
        player.yaw = 0;
        player.pitch = 0;
        player.grounded = true;
        player.alive = true;
        player.hp = MAX_HP;
        player.sliding = false;
        player.slideTimer = 0;
        player.slideCooldown = 0;
        player.ads = false;

        let spawnedTrainingBot = false;
        for (const bot of bots) {
          if (bot.team === 'enemy' && !spawnedTrainingBot) {
            spawnedTrainingBot = true;
            bot.name = 'TRAINING BOT';
            resetBotPose(bot, 0, 7.5, 0);
          } else {
            bot.active = false;
            bot.alive = false;
            bot.rig.root.visible = false;
          }
        }

        match.roundNumber = 1;
        match.roundTimer = 90;
        match.roundBanner = null;
        match.primaryAmmo = resolveGunSpec(
          PRIMARY_WEAPONS[cfg.primary],
          weaponBuildsRef.current[cfg.primary]
        ).magSize;
        match.secondaryAmmo = resolveGunSpec(
          SECONDARY_WEAPONS[cfg.secondary],
          weaponBuildsRef.current[cfg.secondary]
        ).magSize;
        match.utilityCharges = resolveUtilitySpec(
          UTILITY_ITEMS[cfg.utility],
          weaponBuildsRef.current[cfg.utility]
        ).charges;
        match.reloading = false;
        match.burstQueue = 0;
        match.fireCooldown = 0.2;
        match.camRecoilPitch = 0;
        match.camRecoilYaw = 0;
        match.camTilt = 0;
        match.landDip = 0;
        match.muzzleFlashTimer = 0;
        match.boltKick = 0;
        match.damageFlash = 0;
        match.aberrationPulse = 0;
        match.hitMarker = 'none';
        match.tutorial = {
          active: true,
          step: 0,
          completed: false,
          moveDist: 0,
          hits: 0,
        };
        selectSlot(0);
        pushHud();
      },
      skipTutorialStep: () => {
        if (match.tutorial.active && !match.tutorial.completed) {
          advanceTutorialStep();
        }
      },
      beginRound: (roundNum: number, perk: RoundOverchargePerk | null) => {
        setupRound(roundNum, perk);
        pushHud();
      },
      beginMpRound: (room: MpRoomSnapshot) => {
        match.tutorial = {
          active: false,
          step: 0,
          completed: false,
          moveDist: 0,
          hits: 0,
        };
        setupMpRound(room);
        pushHud();
      },
      syncMpRoom: (room: MpRoomSnapshot | null) => {
        if (!room) {
          clearRemotePlayers();
          mpBotTargets.clear();
          return;
        }
        const myId = mpPlayerIdRef.current;
        const myTeam = getMyMpTeam(room);
        const me = room.players.find((p) => p.id === myId);
        if (me && room.phase === 'PLAYING') {
          match.playerMaxHp = me.maxHp;
          player.hp = me.hp;
          if (!me.alive && player.alive) {
            player.alive = false;
            player.ads = false;
            match.reloading = false;
            match.burstQueue = 0;
            match.roundBanner = 'ELIMINATED · SPECTATING SQUAD';
          }
        }
        match.orbActive = room.orbActive;
        match.orbRespawnTimer = room.orbRespawnTimer;
        knowledgeOrbGroup.visible = room.orbActive;
        if (room.roundBanner) match.roundBanner = room.roundBanner;
        else if (room.phase === 'PLAYING' && room.roundTimer < 88.2 && player.alive) {
          match.roundBanner = null;
        }
        match.playerRounds = myTeam === 'alpha' ? room.alphaRounds : room.omegaRounds;
        match.rivalRounds = myTeam === 'alpha' ? room.omegaRounds : room.alphaRounds;
        match.roundNumber = room.roundNumber;
        match.roundTimer = room.roundTimer;
        syncRemotePlayersFromRoom(room);
        syncMpBotsFromRoom(room, false);
      },
      handleMpFireFx: (msg) => {
        _v1.set(msg.from[0], msg.from[1], msg.from[2]);
        _v2.set(msg.to[0], msg.to[1], msg.to[2]);
        const rp = remotePlayers.get(msg.shooterId);
        if (rp) {
          rp.muzzleFlashTimer = 0.055;
          rp.rig.muzzleFlash.visible = true;
          rp.rig.muzzleFlash.rotation.z = Math.random() * Math.PI;
        }
        const dist = _v1.distanceTo(camera.position);
        shooterAudio.playGunshot(
          msg.weaponId as PrimaryId,
          Math.max(0.08, (1 - dist / 70) * 0.75)
        );
        if (msg.explosion) {
          shooterAudio.playExplosion();
          spawnSparks(_v2, msg.colorHex, 24);
          spawnShockwave(_v2, msg.colorHex, (msg.splashRadius ?? 6.5) * 1.35);
          if (isWaterSurfaceAt(mapRef.current, _v2.x, _v2.y - 0.5, _v2.z)) {
            const wCtrl = arenaGroup.userData.waterController as HydroWaterController | undefined;
            wCtrl?.addRipple(_v2.x, _v2.z, 2.4);
            shooterAudio.playWaterSplash(1.2);
            spawnSparks(_v3.set(_v2.x, 0.12, _v2.z), 0xe0f2fe, 14);
          }
          return;
        }
        spawnTracer(_v1, _v2, msg.colorHex, msg.weaponId === 'sniper' ? 0.04 : 0.022);
        if (msg.hitWater) {
          const wCtrl = arenaGroup.userData.waterController as HydroWaterController | undefined;
          wCtrl?.addRipple(_v2.x, _v2.z, 1.0);
          spawnSparks(_v2, 0xe0f2fe, 6);
          spawnShockwave(_v2, 0x7dd3fc, 1.6);
          shooterAudio.playWaterSplash(0.32);
        } else {
          spawnSparks(_v2, msg.colorHex, 4);
        }
      },
      handleMpMeleeFx: (msg) => {
        _v1.set(msg.origin[0], msg.origin[1], msg.origin[2]);
        _v2.set(msg.dir[0], msg.dir[1], msg.dir[2]);
        spawnMeleeSlashArc(_v1, _v2, msg.colorHex);
        shooterAudio.playMeleeSlash();
      },
      handleMpWaterRipple: (msg) => {
        const wCtrl = arenaGroup.userData.waterController as HydroWaterController | undefined;
        wCtrl?.addRipple(msg.x, msg.z, msg.strength);
        spawnSparks(_v1.set(msg.x, 0.08, msg.z), 0xe0f2fe, 6);
        if (msg.strength >= 0.9) {
          spawnShockwave(_v1.set(msg.x, 0.04, msg.z), 0x7dd3fc, 2.1);
        }
      },
      handleMpBouncePad: (msg) => {
        triggerBouncePadVisual(msg.padIndex, msg.x, msg.z);
      },
      handleMpPlayerDamaged: (msg) => {
        if (msg.targetId === mpPlayerIdRef.current) {
          player.hp = msg.newHp;
          match.damageFlash = 0.75;
          match.camRecoilPitch += 0.025;
          shooterAudio.playPlayerHit();
        } else {
          const rp = remotePlayers.get(msg.targetId);
          if (rp) {
            rp.flinchTimer = 0.16;
            spawnSparks(
              _v1.set(msg.hitPoint[0], msg.hitPoint[1], msg.hitPoint[2]),
              msg.headshot ? 0xfbbf24 : 0xf43f5e,
              6
            );
          }
        }
      },
      handleMpBotDamaged: (msg) => {
        const bot = bots.find((b) => b.mpId === msg.botId);
        if (bot) {
          bot.hp = msg.newHp;
          bot.flinchTimer = 0.16;
          spawnSparks(
            _v1.set(msg.hitPoint[0], msg.hitPoint[1], msg.hitPoint[2]),
            msg.headshot ? 0xfbbf24 : bot.team === 'enemy' ? 0xf43f5e : 0x38bdf8,
            6
          );
        }
      },
      handleMpEntityKilled: (msg) => {
        const colorNum = cssHexToNum(msg.colorHex, 0x38bdf8);
        _v1.set(msg.pos[0], msg.pos[1], msg.pos[2]);
        if (msg.killerId === mpPlayerIdRef.current) {
          match.kills += 1;
        }
        if (msg.victimIsBot) {
          const bot = bots.find((b) => b.mpId === msg.victimId);
          if (bot) {
            bot.alive = false;
            bot.hp = 0;
            bot.knockedDown = true;
            bot.knockdownProgress = 0;
            bot.rig.muzzleFlash.visible = false;
          }
        } else if (msg.victimId === mpPlayerIdRef.current) {
          player.alive = false;
          player.hp = 0;
          player.ads = false;
          match.reloading = false;
          match.burstQueue = 0;
          match.roundBanner = 'ELIMINATED · SPECTATING SQUAD';
        } else {
          const rp = remotePlayers.get(msg.victimId);
          if (rp) {
            rp.alive = false;
            rp.knockedDown = true;
            rp.knockdownProgress = 0;
            rp.rig.muzzleFlash.visible = false;
          }
        }
        spawnSparks(_v1, colorNum, 22);
        spawnShockwave(_v1, msg.headshot ? 0xfbbf24 : colorNum, 6.8);
        explosionLight.color.setHex(msg.headshot ? 0xfbbf24 : colorNum);
        explosionLight.position.copy(_v1);
        explosionLight.intensity = 14;
        shooterAudio.playExplosion();
        if (msg.finisherId !== 'standard') {
          spawnFinisherEffect(_v1, msg.finisherId, colorNum);
          shooterAudio.playFinisher(msg.finisherId);
        }
      },
      handleMpOrbCollected: (msg) => {
        match.orbActive = false;
        match.orbRespawnTimer = 16;
        knowledgeOrbGroup.visible = false;
        spawnSparks(knowledgeOrbGroup.position, 0x38bdf8, 18);
        spawnShockwave(knowledgeOrbGroup.position, 0x38bdf8, 4.2);
        shooterAudio.playHeal();
        if (msg.playerId === mpPlayerIdRef.current) {
          const utilSpec = resolveUtilitySpec(
            UTILITY_ITEMS[loadoutRef.current.utility],
            weaponBuildsRef.current[loadoutRef.current.utility]
          );
          const maxCharges = utilSpec.charges + (match.activePerk?.extraUtility ?? 0);
          if (match.utilityCharges < maxCharges) match.utilityCharges += 1;
          match.factToast = pickArenaFact(subjectRef.current, classLevelRef.current);
          match.factToastTimer = 5.0;
        }
        pushHud();
      },
      selectSlot,
      triggerReload,
      rebuildViewmodel,
      rebuildMap,
      setGraphicsMode: (mode: 'ultra' | 'standard') => {
        const isUltra = mode === 'ultra';
        const targetPr = isSoftwareGl
          ? 1
          : isUltra
            ? Math.min(window.devicePixelRatio, 2)
            : 1;
        renderer.setPixelRatio(targetPr);
        renderer.setSize(container.clientWidth, container.clientHeight);
        if (composer) {
          composer.setPixelRatio(targetPr);
          composer.setSize(container.clientWidth, container.clientHeight);
        }
        dustPoints.visible = isUltra;
        sun.castShadow = !isSoftwareGl && isUltra;
      },
      lockPointer: () => {
        try {
          renderer.domElement.requestPointerLock?.();
        } catch {
          // Fallback controls remain active
        }
      },
      cancelMatch: () => {
        clearDynamicObjects();
        clearRemotePlayers();
        mpBotTargets.clear();
        match.roundEndTimer = 0;
        match.mouseDown = false;
        match.rightDown = false;
        match.reloading = false;
        match.burstQueue = 0;
        match.roundBanner = null;
        match.tutorial = {
          active: false,
          step: 0,
          completed: false,
          moveDist: 0,
          hits: 0,
        };
        player.ads = false;
        player.sliding = false;
        pushHud();
      },
    };

    // --- INPUT LISTENERS ---
    const onPointerLockChange = () => {
      match.pointerLocked = document.pointerLockElement === renderer.domElement;
      pushHud();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (gameStateRef.current !== 'PLAYING' || !player.alive) return;
      if (match.pointerLocked || match.rightDown) {
        const sens = player.ads ? 0.0012 : 0.0022;
        player.yaw -= e.movementX * sens;
        player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * sens, -1.35, 1.35);
        const swayAmp = player.ads ? 0.0001 : 0.00028;
        match.swayX = THREE.MathUtils.clamp(match.swayX - e.movementX * swayAmp, -0.028, 0.028);
        match.swayY = THREE.MathUtils.clamp(match.swayY + e.movementY * swayAmp, -0.022, 0.022);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (gameStateRef.current !== 'PLAYING' || !player.alive) return;
      if (e.button === 2) {
        match.rightDown = true;
        syncAdsState();
        return;
      }
      if (e.button === 0) {
        match.mouseDown = true;
        if (!match.pointerLocked) {
          try {
            renderer.domElement.requestPointerLock?.();
          } catch {
            // Safe fallback
          }
        }
        useActiveSlot(e.clientX, e.clientY);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) match.mouseDown = false;
      if (e.button === 2) {
        match.rightDown = false;
        syncAdsState();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (gameStateRef.current === 'PLAYING') e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (gameStateRef.current !== 'PLAYING' || !player.alive) return;

      if (e.code === 'Digit1') selectSlot(0);
      else if (e.code === 'Digit2') selectSlot(1);
      else if (e.code === 'Digit3') selectSlot(2);
      else if (e.code === 'Digit4') selectSlot(3);
      else if (e.code === 'KeyR') triggerReload();
      else if (e.code === 'Backspace' && match.tutorial.active && !match.tutorial.completed) {
        e.preventDefault();
        advanceTutorialStep();
      } else if (e.code === 'KeyE') {
        syncAdsState();
      }
      else if (e.code === 'Space' && player.grounded) {
        // RIVALS Slide-Jump momentum boost!
        if (player.sliding) {
          player.vel.y = 10.6;
          player.vel.x += player.slideDir.x * 6.5;
          player.vel.z += player.slideDir.z * 6.5;
          player.sliding = false;
          if (match.tutorial.active && !match.tutorial.completed && match.tutorial.step === 1) {
            advanceTutorialStep();
          }
        } else {
          player.vel.y = 9.0;
        }
        player.grounded = false;
      } else if ((e.code === 'KeyC' || e.code === 'ControlLeft') && !player.sliding && player.slideCooldown <= 0) {
        // Trigger RIVALS Momentum Slide!
        _forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
        _right.crossVectors(_forward, _up).normalize();
        _v1.set(0, 0, 0);
        if (keys['KeyW']) _v1.add(_forward);
        if (keys['KeyS']) _v1.sub(_forward);
        if (keys['KeyD']) _v1.add(_right);
        if (keys['KeyA']) _v1.sub(_right);
        if (_v1.lengthSq() === 0) _v1.copy(_forward);
        else _v1.normalize();

        player.sliding = true;
        player.slideTimer = 0.55;
        player.slideCooldown = 1.05;
        player.slideDir.copy(_v1);
        player.vel.x = _v1.x * 21.5;
        player.vel.z = _v1.z * 21.5;
        shooterAudio.playSlide();
        if (isWaterSurfaceAt(mapRef.current, player.pos.x, player.pos.y - player.eyeHeight, player.pos.z)) {
          const wCtrl = arenaGroup.userData.waterController as HydroWaterController | undefined;
          wCtrl?.addRipple(player.pos.x, player.pos.z, 1.35);
          shooterAudio.playWaterSplash(0.8);
          spawnSparks(_v1.set(player.pos.x, 0.08, player.pos.z), 0xe0f2fe, 8);
          spawnShockwave(_v1.set(player.pos.x, 0.04, player.pos.z), 0x7dd3fc, 2.2);
          if (mpRoomRef.current) {
            mpClientRef.current?.sendWaterRipple(player.pos.x, player.pos.z, 1.35);
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
      if (e.code === 'KeyE') {
        syncAdsState();
      }
    };

    const onWindowBlur = () => {
      for (const k of Object.keys(keys)) keys[k] = false;
      match.mouseDown = false;
      match.rightDown = false;
      if (player.ads) {
        player.ads = false;
        pushHud();
      }
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      const pr = Math.min(window.devicePixelRatio, 2);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
      if (lensPass) {
        lensPass.uniforms.uTexelSize.value.set(1 / Math.max(1, w * pr), 1 / Math.max(1, h * pr));
      }
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('resize', onResize);

    // --- MAIN RENDER & SIMULATION LOOP ---
    const clock = new THREE.Clock();
    let frameId = 0;
    let hudAccum = 0;
    let nonPlayHudAccum = 0;
    let slideWakeAccum = 0;
    let mpStateAccum = 0;
    let mpBotsAccum = 0;
    let waterStepSyncAccum = 0;
    let fpsFrames = 0;
    let fpsAccum = 0;
    let lastRawTime = performance.now();
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) frameId = window.setTimeout(poll, 5);
        else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const nowMs = performance.now();
      const rawDt = Math.max(0.001, (nowMs - lastRawTime) / 1000);
      lastRawTime = nowMs;
      fpsFrames += 1;
      fpsAccum += rawDt;
      if (fpsAccum >= 0.35) {
        fpsRef.current = Math.max(1, Math.round(fpsFrames / fpsAccum));
        fpsFrames = 0;
        fpsAccum = 0;
      }

      const dt = Math.min(0.05, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      grassTimeUniform.value = elapsed;
      if (gameStateRef.current === 'PLAYING' && player.alive) {
        grassMatHandle.playerPosUniform.value.set(
          player.pos.x,
          player.pos.y - player.eyeHeight,
          player.pos.z
        );
      } else {
        grassMatHandle.playerPosUniform.value.set(0, -100, 0);
      }
      if (lensPass) lensPass.uniforms.uTime.value = elapsed;
      terrainUniforms.uTerrainWaterTime.value = elapsed;

      const activeWaterCtrl = arenaGroup.userData.waterController as HydroWaterController | undefined;
      if (activeWaterCtrl) {
        activeWaterCtrl.update(elapsed);
      } else if (arenaGroup.userData.waterTimeUniform) {
        arenaGroup.userData.waterTimeUniform.value = elapsed;
      }
      const activeLagoonCtrl = arenaGroup.userData.lagoonWaterController as
        | HydroWaterController
        | undefined;
      if (activeLagoonCtrl) {
        activeLagoonCtrl.update(elapsed);
      }
      if (Array.isArray(arenaGroup.userData.animatedSpinners)) {
        for (const spinner of arenaGroup.userData.animatedSpinners as THREE.Object3D[]) {
          spinner.rotation.y = elapsed * 1.15;
        }
      }
      if (Array.isArray(arenaGroup.userData.animatedBobbers)) {
        for (const b of arenaGroup.userData.animatedBobbers as Array<{
          mesh: THREE.Object3D;
          baseY: number;
          phase: number;
        }>) {
          b.mesh.position.y = b.baseY + Math.sin(elapsed * 2.1 + b.phase) * 0.085;
          b.mesh.rotation.z = Math.sin(elapsed * 1.6 + b.phase) * 0.07;
        }
      }
      if (Array.isArray(arenaGroup.userData.animatedSwayers)) {
        for (const sw of arenaGroup.userData.animatedSwayers as Array<{
          mesh: THREE.Object3D;
          phase: number;
        }>) {
          sw.mesh.rotation.z = Math.sin(elapsed * 0.85 + sw.phase) * 0.035;
        }
      }
      if (Array.isArray(arenaGroup.userData.bouncePadMeshes)) {
        const padMeshes = arenaGroup.userData.bouncePadMeshes as THREE.Group[];
        const padSpecs = getMapBouncePads(mapRef.current);
        for (let idx = 0; idx < padMeshes.length; idx++) {
          const padMesh = padMeshes[idx];
          const padSpec = padSpecs[idx];
          const t = Math.max(0, (bouncePadTimers[idx] ?? 0) - dt);
          bouncePadTimers[idx] = t;
          const press = t > 0 ? Math.sin((t / 0.28) * Math.PI) : 0;
          const idleY = Math.sin(elapsed * 3.5 + idx) * 0.03;
          padMesh.scale.set(
            1 + press * 0.14,
            Math.max(0.45, 1 - press * 0.28 + idleY),
            1 + press * 0.14
          );
          if (padSpec) {
            padMesh.position.y = padSpec.y - press * 0.08;
          }
        }
      }

      // Drift atmospheric dust motes / embers smoothly
      const dPos = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dustCount; i++) {
        let py = dPos.getY(i) + dustSpeeds[i] * dt;
        let px = dPos.getX(i) + Math.sin(elapsed * 0.4 + i) * 0.14 * dt;
        if (py > 14.8) py = 0.6;
        if (px > 31) px = -31;
        else if (px < -31) px = 31;
        dPos.setXY(i, px, py);
      }
      dPos.needsUpdate = true;

      match.aberrationPulse = THREE.MathUtils.damp(match.aberrationPulse, 0, 12, dt);
      explosionLight.intensity = THREE.MathUtils.damp(explosionLight.intensity, 0, 9, dt);
      if (lensPass) {
        lensPass.uniforms.uAberration.value =
          match.aberrationPulse + match.damageFlash * 0.0055;
      }

      if (gameStateRef.current !== 'PLAYING') {
        keys['KeyE'] = false;
        match.rightDown = false;
        match.mouseDown = false;
        if (player.ads) {
          player.ads = false;
          pushHud();
        }
      }

      if (gameStateRef.current === 'TITLE_MENU' || gameStateRef.current === 'ROUND_QUIZ') {
        camera.position.set(Math.sin(elapsed * 0.25) * 28, 9.5, Math.cos(elapsed * 0.25) * 28);
        camera.lookAt(0, 1.8, 0);
        camera.rotation.z = 0;
        viewmodel.root.visible = false;
        adsLaserDot.visible = false;
        const previewY =
          mapRef.current === 'docks'
            ? 0
            : getMapFloorHeightAt(mapRef.current, 0, 0, 10);

        const tSize = teamSizeRef.current;
        let aIdx = 0;
        let eIdx = 0;
        for (const bot of bots) {
          const posePreviewBot = (idxOffset: number) => {
            const breathe = Math.sin(elapsed * 2.2 + idxOffset) * 0.015;
            bot.rig.bodyGroup.rotation.set(0, 0, 0);
            bot.rig.bodyGroup.position.y = breathe;
            bot.rig.pelvisGroup.rotation.set(0, 0, 0);
            bot.rig.torsoGroup.rotation.set(0.05 + breathe * 0.5, 0, 0);
            bot.rig.leftLeg.rotation.set(-0.08, 0, 0.04);
            bot.rig.leftKnee.rotation.set(0.14, 0, 0);
            bot.rig.leftAnkle.rotation.set(-0.06, 0, 0);
            bot.rig.rightLeg.rotation.set(0.08, 0, -0.04);
            bot.rig.rightKnee.rotation.set(0.14, 0, 0);
            bot.rig.rightAnkle.rotation.set(-0.06, 0, 0);
            bot.rig.leftArm.rotation.set(-0.62, 0.18, 0.14);
            bot.rig.leftElbow.rotation.set(-0.78 + breathe, 0.28, -0.25);
            bot.rig.rightArm.rotation.set(-0.48, -0.1, -0.06);
            bot.rig.rightElbow.rotation.set(-1.02 + breathe, 0.08, 0);
            bot.rig.headGroup.rotation.set(0, Math.sin(elapsed * 1.1 + idxOffset) * 0.14, 0);
            bot.rig.backRotor.rotation.z += dt * 7;
            const idleFlame = 0.42 + Math.sin(elapsed * 18 + idxOffset) * 0.08;
            bot.rig.leftThrusterFlame.scale.set(0.8, idleFlame, 0.8);
            bot.rig.rightThrusterFlame.scale.set(0.8, idleFlame, 0.8);
          };
          if (bot.team === 'ally') {
            if (aIdx < tSize - 1) {
              const offset = aIdx - (tSize - 2) * 0.5;
              bot.rig.root.position.set(offset * 2.1, previewY, 2.15);
              bot.rig.root.rotation.y = Math.PI + Math.sin(elapsed * 0.5 + aIdx) * 0.25;
              posePreviewBot(aIdx);
              bot.rig.root.visible = true;
            } else {
              bot.rig.root.visible = false;
            }
            aIdx += 1;
          } else {
            if (eIdx < tSize) {
              const offset = eIdx - (tSize - 1) * 0.5;
              const zOff = tSize === 1 ? 0 : -2.15 - Math.abs(offset) * 0.25;
              bot.rig.root.position.set(offset * 2.1, previewY, zOff);
              bot.rig.root.rotation.y =
                tSize === 1 ? elapsed * 0.6 : Math.sin(elapsed * 0.5 + eIdx) * 0.25;
              posePreviewBot(eIdx + 2);
              bot.rig.root.visible = true;
            } else {
              bot.rig.root.visible = false;
            }
            eIdx += 1;
          }
        }

        knowledgeOrbGroup.position.set(
          0,
          getOrbBaseY(mapRef.current) + Math.sin(elapsed * 2.4) * 0.18,
          0
        );
        knowledgeOrbGroup.rotation.y = elapsed * 1.4;
      } else if (gameStateRef.current === 'ROUND_END') {
        adsLaserDot.visible = false;
        for (const bot of bots) {
          if (bot.active && bot.knockedDown && bot.knockdownProgress < 1) {
            bot.knockdownProgress = Math.min(1, bot.knockdownProgress + dt * 3.8);
            bot.rig.bodyGroup.rotation.x = -bot.knockdownProgress * (Math.PI / 2 - 0.12);
            bot.rig.bodyGroup.position.y = -bot.knockdownProgress * 0.35;
          }
        }
        for (const rp of remotePlayers.values()) {
          if (rp.knockedDown && rp.knockdownProgress < 1) {
            rp.knockdownProgress = Math.min(1, rp.knockdownProgress + dt * 3.8);
            rp.rig.bodyGroup.rotation.x = -rp.knockdownProgress * (Math.PI / 2 - 0.12);
            rp.rig.bodyGroup.position.y = -rp.knockdownProgress * 0.35;
          }
        }
        if (!mpRoomRef.current) {
          match.roundEndTimer -= dt;
          if (match.roundEndTimer <= 0) {
            onRequestNextRoundQuizRef.current(match.roundNumber + 1);
          }
        }
      } else if (gameStateRef.current === 'PLAYING') {
        const activePrimarySpec = resolveGunSpec(
          PRIMARY_WEAPONS[loadoutRef.current.primary],
          weaponBuildsRef.current[loadoutRef.current.primary]
        );
        const activeSecondarySpec = resolveGunSpec(
          SECONDARY_WEAPONS[loadoutRef.current.secondary],
          weaponBuildsRef.current[loadoutRef.current.secondary]
        );
        const isScopedSniper =
          player.alive &&
          player.ads &&
          ((match.activeSlot === 0 && activePrimarySpec.optic === 'scope') ||
            (match.activeSlot === 1 && activeSecondarySpec.optic === 'scope'));
        viewmodel.root.visible = player.alive && !isScopedSniper;

        // Round timer countdown (authoritative on server in multiplayer; paused in tutorial)
        if (!match.tutorial.active && !mpRoomRef.current) {
          match.roundTimer -= dt;
          if (match.roundTimer <= 0) {
            const aliveAllies = bots.filter((b) => b.active && b.team === 'ally' && b.alive);
            const aliveEnemies = bots.filter((b) => b.active && b.team === 'enemy' && b.alive);
            const allyCount = (player.alive ? 1 : 0) + aliveAllies.length;
            const enemyCount = aliveEnemies.length;
            const allyHpSum =
              (player.alive ? player.hp : 0) + aliveAllies.reduce((acc, b) => acc + b.hp, 0);
            const enemyHpSum = aliveEnemies.reduce((acc, b) => acc + b.hp, 0);
            const playerSideWins =
              allyCount !== enemyCount ? allyCount > enemyCount : allyHpSum >= enemyHpSum;
            finishRound(playerSideWins, 'Time Expired');
          }
          if (match.roundBanner && player.alive && match.roundTimer < 88.2) {
            match.roundBanner = null;
          }
        } else if (
          mpRoomRef.current &&
          match.roundBanner &&
          player.alive &&
          mpRoomRef.current.roundTimer < 88.2
        ) {
          match.roundBanner = null;
        }

        // Animate knocked-down bots & remote players collapsing to terrain during active round
        for (const bot of bots) {
          if (bot.active && bot.knockedDown && bot.knockdownProgress < 1) {
            bot.knockdownProgress = Math.min(1, bot.knockdownProgress + dt * 3.8);
            bot.rig.bodyGroup.rotation.x = -bot.knockdownProgress * (Math.PI / 2 - 0.12);
            bot.rig.bodyGroup.position.y = -bot.knockdownProgress * 0.35;
          }
        }
        for (const rp of remotePlayers.values()) {
          if (rp.knockedDown && rp.knockdownProgress < 1) {
            rp.knockdownProgress = Math.min(1, rp.knockdownProgress + dt * 3.8);
            rp.rig.bodyGroup.rotation.x = -rp.knockdownProgress * (Math.PI / 2 - 0.12);
            rp.rig.bodyGroup.position.y = -rp.knockdownProgress * 0.35;
          }
        }

        if (player.alive) {
          // Arrow-key look fallback (E is reserved for Aim/ADS)
          if (keys['ArrowLeft'] || keys['KeyQ']) player.yaw += 2.2 * dt;
          if (keys['ArrowRight']) player.yaw -= 2.2 * dt;
          if (keys['ArrowUp']) player.pitch = Math.min(1.25, player.pitch + 1.5 * dt);
          if (keys['ArrowDown']) player.pitch = Math.max(-1.25, player.pitch - 1.5 * dt);

          // Automatic weapon firing while mouse held
          if (match.mouseDown && !match.reloading && match.fireCooldown <= 0) {
            if (
              (match.activeSlot === 0 && activePrimarySpec.auto) ||
              (match.activeSlot === 1 && activeSecondarySpec.auto)
            ) {
              useActiveSlot();
            }
          }

          // Burst rifle follow-up shots
          if (match.burstQueue > 0) {
            match.burstTimer -= dt;
            if (match.burstTimer <= 0) {
              match.burstQueue -= 1;
              match.burstTimer = 0.065;
              fireGunSpec(activePrimarySpec);
            }
          }

          // Cooldowns, muzzle flash, bolt action & reload
          match.fireCooldown = Math.max(0, match.fireCooldown - dt);
          match.damageFlash = Math.max(0, match.damageFlash - dt * 2.5);
          match.meleeSwingTimer = Math.max(0, match.meleeSwingTimer - dt);
          muzzleLight.intensity = THREE.MathUtils.damp(muzzleLight.intensity, 0, 22, dt);

          if (match.muzzleFlashTimer > 0) {
            match.muzzleFlashTimer -= dt;
            if (match.muzzleFlashTimer <= 0) viewmodel.muzzleFlash.visible = false;
          }
          match.boltKick = THREE.MathUtils.damp(match.boltKick, 0, 26, dt);
          viewmodel.primaryBolt.position.z = match.boltKick;
          viewmodel.secondarySlide.position.z = match.boltKick;

          if (match.hitMarkerTimer > 0) {
            match.hitMarkerTimer -= dt;
            if (match.hitMarkerTimer <= 0) match.hitMarker = 'none';
          }

          let reloadMagDrop = 0;
          if (match.reloading) {
            match.reloadTimer += dt;
            const req =
              match.activeSlot === 0
                ? activePrimarySpec.reloadTime
                : activeSecondarySpec.reloadTime;
            const p = Math.min(1, match.reloadTimer / req);
            reloadMagDrop = Math.sin(p * Math.PI) * 0.2;
            if (match.reloadTimer >= req) {
              if (match.activeSlot === 0) {
                match.primaryAmmo = activePrimarySpec.magSize;
              } else {
                match.secondaryAmmo = activeSecondarySpec.magSize;
              }
              match.reloading = false;
              match.reloadTimer = 0;
              if (match.tutorial.active && !match.tutorial.completed && match.tutorial.step === 3) {
                advanceTutorialStep();
              }
            }
          }
          viewmodel.primaryMag.position.y = -reloadMagDrop;
          viewmodel.secondaryMag.position.y = -reloadMagDrop;

          // Slide timers & camera height/FOV
          player.slideCooldown = Math.max(0, player.slideCooldown - dt);
          if (player.sliding) {
            player.slideTimer -= dt;
            if (player.slideTimer <= 0) player.sliding = false;
          }

          const targetEye = player.sliding ? 0.95 : 1.75;
          player.eyeHeight = THREE.MathUtils.damp(player.eyeHeight, targetEye, 16, dt);

          const adsFov =
            match.activeSlot === 0 ? activePrimarySpec.adsFov : activeSecondarySpec.adsFov;
          const targetFov = player.ads ? adsFov : player.sliding ? 84 : 76;
          if (Math.abs(player.fov - targetFov) > 0.05) {
            player.fov = THREE.MathUtils.damp(player.fov, targetFov, 14, dt);
            camera.fov = player.fov;
            camera.updateProjectionMatrix();
          }

          // Movement kinematics
          _forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
          _right.crossVectors(_forward, _up).normalize();
          _v1.set(0, 0, 0);
          if (keys['KeyW']) _v1.add(_forward);
          if (keys['KeyS']) _v1.sub(_forward);
          if (keys['KeyD']) _v1.add(_right);
          if (keys['KeyA']) _v1.sub(_right);
          if (_v1.lengthSq() > 0) _v1.normalize();

          const meleeMult =
            match.activeSlot === 2
              ? resolveMeleeSpec(
                  MELEE_WEAPONS[loadoutRef.current.melee],
                  weaponBuildsRef.current[loadoutRef.current.melee]
                ).speedBonus
              : 1.0;
          const perkSpeedMult = match.activePerk?.speedMult ?? 1.0;
          const sprinting = Boolean(keys['ShiftLeft'] && !player.ads);
          const baseSpeed =
            (sprinting ? 14.5 : 11.2) *
            meleeMult *
            perkSpeedMult *
            (player.ads ? 0.68 : 1);

          if (player.sliding) {
            player.vel.x = THREE.MathUtils.damp(player.vel.x, player.slideDir.x * 13.0, 2.2, dt);
            player.vel.z = THREE.MathUtils.damp(player.vel.z, player.slideDir.z * 13.0, 2.2, dt);
          } else {
            player.vel.x = THREE.MathUtils.damp(player.vel.x, _v1.x * baseSpeed, 14, dt);
            player.vel.z = THREE.MathUtils.damp(player.vel.z, _v1.z * baseSpeed, 14, dt);
          }

          const wasGrounded = player.grounded;
          const impactVelY = player.vel.y;
          const prevPlayerX = player.pos.x;
          const prevPlayerZ = player.pos.z;
          const headHeight = player.sliding ? 1.15 : 1.95;
          const headOffset = headHeight - player.eyeHeight;

          player.vel.y -= 24 * dt;
          player.pos.x += player.vel.x * dt;
          player.pos.z += player.vel.z * dt;
          player.pos.y += player.vel.y * dt;

          resolveArenaCollision(player.pos, 0.55, player.pos.y - player.eyeHeight, headHeight);

          const playerFootY = player.pos.y - player.eyeHeight;
          const floorY =
            getMapFloorHeightAt(mapRef.current, player.pos.x, player.pos.z, playerFootY) +
            player.eyeHeight;

          // Splash bounce pads & trampolines
          const bouncePads = getMapBouncePads(mapRef.current);
          let bouncedThisFrame = false;
          for (const pad of bouncePads) {
            if (
              Math.hypot(player.pos.x - pad.x, player.pos.z - pad.z) <= pad.radius &&
              playerFootY <= pad.y + 0.65 &&
              player.vel.y <= 3.5
            ) {
              player.pos.y = pad.y + 0.35 + player.eyeHeight;
              player.vel.y = pad.impulseY;
              player.grounded = false;
              player.sliding = false;
              bouncedThisFrame = true;
              triggerBouncePadVisual(pad.id, pad.x, pad.z);
              if (mpRoomRef.current) {
                mpClientRef.current?.sendBouncePad(pad.id, pad.x, pad.z);
              }
              break;
            }
          }

          if (!bouncedThisFrame && player.pos.y <= floorY) {
            player.pos.y = floorY;
            if (!wasGrounded && impactVelY < -5.5) {
              match.landDip = Math.min(0.24, Math.abs(impactVelY) * 0.015);
              if (isWaterSurfaceAt(mapRef.current, player.pos.x, playerFootY, player.pos.z)) {
                const intensity = Math.min(1.4, Math.abs(impactVelY) / 14);
                const rippleStrength = Math.min(2.0, intensity * 1.45);
                shooterAudio.playWaterSplash(intensity);
                activeWaterCtrl?.addRipple(player.pos.x, player.pos.z, rippleStrength);
                spawnSparks(_v1.set(player.pos.x, 0.08, player.pos.z), 0xe0f2fe, 9);
                spawnShockwave(_v1.set(player.pos.x, 0.04, player.pos.z), 0x7dd3fc, 2.5);
                if (mpRoomRef.current) {
                  mpClientRef.current?.sendWaterRipple(player.pos.x, player.pos.z, rippleStrength);
                }
              } else {
                shooterAudio.playLand();
              }
            }
            player.vel.y = 0;
            player.grounded = true;
          } else if (!bouncedThisFrame && player.pos.y > floorY + 0.12) {
            player.grounded = false;
          }

          const ceilY = getMapCeilingHeightAt(
            mapRef.current,
            player.pos.x,
            player.pos.z,
            player.pos.y - player.eyeHeight
          );
          if (ceilY < Infinity && player.pos.y + headOffset > ceilY) {
            player.pos.y = Math.max(floorY, ceilY - headOffset);
            if (player.vel.y > 0) player.vel.y = 0;
          }
          if (match.tutorial.active && !match.tutorial.completed && match.tutorial.step === 0) {
            match.tutorial.moveDist += Math.hypot(
              player.pos.x - prevPlayerX,
              player.pos.z - prevPlayerZ
            );
            if (match.tutorial.moveDist >= 4.0) {
              advanceTutorialStep();
            }
          }

          // Camera recoil, landing dip & strafe bank recovery
          match.camRecoilPitch = THREE.MathUtils.damp(match.camRecoilPitch, 0, 14, dt);
          match.camRecoilYaw = THREE.MathUtils.damp(match.camRecoilYaw, 0, 14, dt);
          match.landDip = THREE.MathUtils.damp(match.landDip, 0, 16, dt);

          const strafeInput = (keys['KeyD'] ? -1 : 0) + (keys['KeyA'] ? 1 : 0);
          const targetTilt = (player.sliding ? 0.045 : strafeInput * 0.018) * (player.ads ? 0.4 : 1);
          match.camTilt = THREE.MathUtils.damp(match.camTilt, targetTilt, 12, dt);

          const breathSwayX = Math.sin(elapsed * 1.4) * (player.ads ? 0.001 : 0.003);
          const breathSwayY = Math.cos(elapsed * 2.1) * (player.ads ? 0.001 : 0.0035);

          camera.position.set(player.pos.x, player.pos.y - match.landDip, player.pos.z);
          camera.rotation.y = player.yaw + match.camRecoilYaw + breathSwayX;
          camera.rotation.x = THREE.MathUtils.clamp(
            player.pitch + match.camRecoilPitch + breathSwayY,
            -1.4,
            1.4
          );
          camera.rotation.z = match.camTilt;

          // First-person viewmodel animation & synced footsteps
          const moveMag = Math.hypot(player.vel.x, player.vel.z);
          const playerInWater = isWaterSurfaceAt(
            mapRef.current,
            player.pos.x,
            playerFootY,
            player.pos.z
          );
          if (player.sliding && player.grounded && playerInWater) {
            slideWakeAccum += dt;
            if (slideWakeAccum >= 0.09) {
              slideWakeAccum = 0;
              activeWaterCtrl?.addRipple(player.pos.x, player.pos.z, 0.95);
              spawnSparks(_v1.set(player.pos.x, 0.06, player.pos.z), 0xbae6fd, 3);
              if (mpRoomRef.current) {
                mpClientRef.current?.sendWaterRipple(player.pos.x, player.pos.z, 0.95);
              }
            }
          } else {
            slideWakeAccum = 0;
          }
          if (moveMag > 1.2 && player.grounded && !player.sliding) {
            match.bobPhase += dt * moveMag * 1.05;
            if (Math.floor(match.bobPhase / Math.PI) > match.lastStepPhase) {
              match.lastStepPhase = Math.floor(match.bobPhase / Math.PI);
              if (playerInWater) {
                const stepStr = sprinting ? 0.72 : 0.45;
                shooterAudio.playWaterStep(sprinting);
                activeWaterCtrl?.addRipple(player.pos.x, player.pos.z, stepStr);
                spawnSparks(_v1.set(player.pos.x, 0.05, player.pos.z), 0xbae6fd, 3);
                waterStepSyncAccum += dt;
                if (mpRoomRef.current && waterStepSyncAccum >= 0.14) {
                  waterStepSyncAccum = 0;
                  mpClientRef.current?.sendWaterRipple(player.pos.x, player.pos.z, stepStr);
                }
              } else {
                shooterAudio.playFootstep(sprinting);
              }
            }
          }
          if (playerInWater && moveMag > 1.2 && mpRoomRef.current) {
            waterStepSyncAccum += dt;
          }
          match.recoil = THREE.MathUtils.damp(match.recoil, 0, 16, dt);
          match.swayX = THREE.MathUtils.damp(match.swayX, 0, 11, dt);
          match.swayY = THREE.MathUtils.damp(match.swayY, 0, 11, dt);
          const reloadDip = match.reloading
            ? Math.sin((match.reloadTimer / 1.1) * Math.PI) * 0.14
            : 0;
          const slashProgress = match.meleeSwingTimer > 0 ? 1 - match.meleeSwingTimer / 0.22 : 0;
          const slashYaw = Math.sin(slashProgress * Math.PI) * 1.1;
          const slashPitch = Math.sin(slashProgress * Math.PI) * -0.75;

          const adsHeight = match.activeSlot === 1 ? -0.072 : -0.138;
          const sprintLowReady =
            sprinting && !player.ads && match.fireCooldown <= 0.02 && !match.reloading;
          const vmTargetX = player.ads ? 0 : sprintLowReady ? 0.22 : 0.26;
          const vmTargetY = player.ads ? adsHeight : sprintLowReady ? -0.275 : -0.24;
          const bobScale = player.ads ? 0.18 : sprintLowReady ? 1.35 : 1.0;

          viewmodel.root.position.set(
            THREE.MathUtils.damp(viewmodel.root.position.x, vmTargetX, 20, dt) +
              Math.cos(match.bobPhase * 0.5) * 0.008 * bobScale +
              match.swayX,
            THREE.MathUtils.damp(viewmodel.root.position.y, vmTargetY, 20, dt) +
              Math.sin(match.bobPhase) * 0.009 * bobScale +
              match.swayY -
              reloadDip -
              match.landDip * 0.22,
            -0.4 + match.recoil
          );
          viewmodel.root.rotation.set(
            match.recoil * 1.25 -
              reloadDip * 1.3 +
              slashPitch -
              match.swayY * 1.5 -
              (sprintLowReady ? 0.12 : 0),
            slashYaw + match.swayX * 1.6 + (sprintLowReady ? 0.34 : 0),
            (player.sliding ? 0.14 : 0) +
              match.camTilt * 1.6 -
              match.swayX * 1.8 +
              (sprintLowReady ? 0.18 : 0)
          );

          // Tactical ADS Laser Projection Dot on Target Surface
          const showLaser =
            player.ads &&
            !match.reloading &&
            match.activeSlot <= 1 &&
            !(match.activeSlot === 0 && loadoutRef.current.primary === 'sniper');
          if (showLaser) {
            camera.getWorldDirection(_rayDir);
            raycaster.set(camera.position, _rayDir);
            raycaster.far = 90;
            const laserTargets: THREE.Object3D[] = [
              ...bots
                .filter(
                  (b) =>
                    b.active && b.team === 'enemy' && b.alive && !b.knockedDown && b.rig.root.visible
                )
                .map((b) => b.rig.root),
              ...Array.from(remotePlayers.values())
                .filter(
                  (rp) =>
                    rp.team === 'enemy' && rp.alive && !rp.knockedDown && rp.rig.root.visible
                )
                .map((rp) => rp.rig.root),
              arenaGroup,
              terrainMesh,
            ];
            const lHits = raycaster.intersectObjects(laserTargets, true);
            raycaster.far = Infinity;
            const lh = lHits.find((h) => isSolidWorldObject(h.object));
            if (lh) {
              adsLaserMat.color.setHex(
                match.activeSlot === 0 ? activePrimarySpec.color : activeSecondarySpec.color
              );
              adsLaserDot.position.copy(lh.point).addScaledVector(_rayDir, -0.04);
              adsLaserDot.scale.setScalar(0.65 + lh.distance * 0.024);
              adsLaserDot.visible = true;
            } else {
              adsLaserDot.visible = false;
            }
          } else {
            adsLaserDot.visible = false;
          }
        } else {
          // Tactical Spectator Camera when player eliminated in 2v2-5v5 while allies still fight
          adsLaserDot.visible = false;
          match.damageFlash = Math.max(0, match.damageFlash - dt * 2.5);
          muzzleLight.intensity = 0;
          if (player.fov !== 76) {
            player.fov = THREE.MathUtils.damp(player.fov, 76, 8, dt);
            camera.fov = player.fov;
            camera.updateProjectionMatrix();
          }
          let focusX = 0;
          let focusY = 1.8;
          let focusZ = 0;
          let foundAllyFocus = false;
          for (const rp of remotePlayers.values()) {
            if (rp.team === 'ally' && rp.alive) {
              focusX = rp.pos.x;
              focusY = rp.pos.y + 1.6;
              focusZ = rp.pos.z;
              foundAllyFocus = true;
              break;
            }
          }
          if (!foundAllyFocus) {
            const specAlly = bots.find((b) => b.active && b.team === 'ally' && b.alive);
            if (specAlly) {
              focusX = specAlly.pos.x;
              focusY = specAlly.pos.y + 1.6;
              focusZ = specAlly.pos.z;
            }
          }
          camera.position.set(
            focusX + Math.sin(elapsed * 0.45) * 9.5,
            focusY + 5.2,
            focusZ + Math.cos(elapsed * 0.45) * 9.5
          );
          camera.lookAt(focusX, focusY, focusZ);
          camera.rotation.z = 0;
        }

        // --- MULTIPLAYER NETWORK STATE STREAM & REMOTE PLAYER INTERPOLATION ---
        if (mpRoomRef.current && mpRoomRef.current.phase === 'PLAYING') {
          mpStateAccum += dt;
          if (mpStateAccum >= 0.05) {
            mpStateAccum = 0;
            mpClientRef.current?.sendPlayerState({
              x: player.pos.x,
              y: player.pos.y,
              z: player.pos.z,
              yaw: player.yaw,
              pitch: player.pitch,
              sliding: player.sliding,
              eyeHeight: player.eyeHeight,
              activeSlot: match.activeSlot,
              primary: loadoutRef.current.primary,
              secondary: loadoutRef.current.secondary,
              speed: Math.hypot(player.vel.x, player.vel.z),
              grounded: player.grounded,
            });
          }
        }

        for (const rp of remotePlayers.values()) {
          if (!rp.alive || rp.knockedDown || !rp.rig.root.visible) continue;
          rp.flinchTimer = Math.max(0, rp.flinchTimer - dt);
          if (rp.muzzleFlashTimer > 0) {
            rp.muzzleFlashTimer -= dt;
            if (rp.muzzleFlashTimer <= 0) rp.rig.muzzleFlash.visible = false;
          }

          rp.pos.x = THREE.MathUtils.damp(rp.pos.x, rp.targetPos.x, 16, dt);
          rp.pos.y = THREE.MathUtils.damp(rp.pos.y, rp.targetPos.y, 16, dt);
          rp.pos.z = THREE.MathUtils.damp(rp.pos.z, rp.targetPos.z, 16, dt);
          let diffYaw = rp.targetYaw - rp.yaw;
          while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
          while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
          rp.yaw += diffYaw * Math.min(1, dt * 16);

          rp.rig.root.position.copy(rp.pos);
          rp.rig.root.rotation.y = rp.yaw;

          const flinchPitch =
            rp.flinchTimer > 0 ? -Math.sin((rp.flinchTimer / 0.16) * Math.PI) * 0.24 : 0;
          rp.rig.bodyGroup.rotation.x = flinchPitch;

          const rSpeed = rp.speed;
          const recoilKick = rp.muzzleFlashTimer > 0 ? 0.2 : 0;
          if (!rp.grounded) {
            rp.rig.leftLeg.rotation.x = THREE.MathUtils.damp(rp.rig.leftLeg.rotation.x, -0.72, 12, dt);
            rp.rig.leftKnee.rotation.x = THREE.MathUtils.damp(rp.rig.leftKnee.rotation.x, 1.18, 12, dt);
            rp.rig.leftAnkle.rotation.x = THREE.MathUtils.damp(rp.rig.leftAnkle.rotation.x, 0.28, 12, dt);
            rp.rig.rightLeg.rotation.x = THREE.MathUtils.damp(rp.rig.rightLeg.rotation.x, 0.28, 12, dt);
            rp.rig.rightKnee.rotation.x = THREE.MathUtils.damp(rp.rig.rightKnee.rotation.x, 0.44, 12, dt);
            rp.rig.rightAnkle.rotation.x = THREE.MathUtils.damp(rp.rig.rightAnkle.rotation.x, 0.36, 12, dt);
            rp.rig.torsoGroup.rotation.x = THREE.MathUtils.damp(rp.rig.torsoGroup.rotation.x, 0.24, 10, dt);
            rp.rig.bodyGroup.position.y = THREE.MathUtils.damp(rp.rig.bodyGroup.position.y, 0.04, 10, dt);
            rp.rig.leftArm.rotation.x = THREE.MathUtils.damp(rp.rig.leftArm.rotation.x, -0.78, 12, dt);
            rp.rig.leftElbow.rotation.x = THREE.MathUtils.damp(rp.rig.leftElbow.rotation.x, -0.88, 12, dt);
            rp.rig.rightArm.rotation.x = THREE.MathUtils.damp(
              rp.rig.rightArm.rotation.x,
              -0.52 - recoilKick,
              14,
              dt
            );
            rp.rig.rightElbow.rotation.x = THREE.MathUtils.damp(
              rp.rig.rightElbow.rotation.x,
              -1.02 - recoilKick * 0.6,
              14,
              dt
            );
            rp.rig.headGroup.rotation.set(-0.12, 0, 0);
          } else if (rp.sliding) {
            rp.rig.leftLeg.rotation.x = THREE.MathUtils.damp(rp.rig.leftLeg.rotation.x, -0.95, 14, dt);
            rp.rig.leftKnee.rotation.x = THREE.MathUtils.damp(rp.rig.leftKnee.rotation.x, 0.35, 14, dt);
            rp.rig.rightLeg.rotation.x = THREE.MathUtils.damp(rp.rig.rightLeg.rotation.x, 0.45, 14, dt);
            rp.rig.rightKnee.rotation.x = THREE.MathUtils.damp(rp.rig.rightKnee.rotation.x, 1.1, 14, dt);
            rp.rig.torsoGroup.rotation.x = THREE.MathUtils.damp(rp.rig.torsoGroup.rotation.x, -0.35, 12, dt);
            rp.rig.bodyGroup.position.y = THREE.MathUtils.damp(rp.rig.bodyGroup.position.y, -0.45, 14, dt);
          } else if (rSpeed > 0.45) {
            const strideAmp = THREE.MathUtils.clamp(rSpeed / 10.5, 0.45, 1.18);
            rp.walkPhase += dt * rSpeed * 1.18;
            const pL = rp.walkPhase;
            const pR = rp.walkPhase + Math.PI;
            rp.rig.leftLeg.rotation.x = THREE.MathUtils.damp(
              rp.rig.leftLeg.rotation.x,
              -Math.cos(pL) * 0.86 * strideAmp - 0.08,
              18,
              dt
            );
            rp.rig.rightLeg.rotation.x = THREE.MathUtils.damp(
              rp.rig.rightLeg.rotation.x,
              -Math.cos(pR) * 0.86 * strideAmp - 0.08,
              18,
              dt
            );
            rp.rig.leftKnee.rotation.x = THREE.MathUtils.damp(
              rp.rig.leftKnee.rotation.x,
              0.2 + Math.max(0, -Math.sin(pL)) * 1.12 * strideAmp,
              18,
              dt
            );
            rp.rig.rightKnee.rotation.x = THREE.MathUtils.damp(
              rp.rig.rightKnee.rotation.x,
              0.2 + Math.max(0, -Math.sin(pR)) * 1.12 * strideAmp,
              18,
              dt
            );
            rp.rig.torsoGroup.rotation.x = THREE.MathUtils.damp(
              rp.rig.torsoGroup.rotation.x,
              0.22 * strideAmp,
              14,
              dt
            );
            rp.rig.bodyGroup.position.y = THREE.MathUtils.damp(
              rp.rig.bodyGroup.position.y,
              Math.max(-0.045, -Math.cos(rp.walkPhase * 2 + 0.5) * 0.08 * strideAmp),
              18,
              dt
            );
            rp.rig.leftArm.rotation.x = -0.68 - Math.cos(pL) * 0.28 * strideAmp;
            rp.rig.rightArm.rotation.x = -0.5 + Math.cos(pL) * 0.14 * strideAmp - recoilKick;
          } else {
            const idleBreathe = Math.sin(elapsed * 2.3 + rp.walkPhase * 0.2);
            rp.rig.leftLeg.rotation.x = THREE.MathUtils.damp(rp.rig.leftLeg.rotation.x, -0.06, 12, dt);
            rp.rig.rightLeg.rotation.x = THREE.MathUtils.damp(rp.rig.rightLeg.rotation.x, 0.06, 12, dt);
            rp.rig.leftKnee.rotation.x = THREE.MathUtils.damp(rp.rig.leftKnee.rotation.x, 0.12, 12, dt);
            rp.rig.rightKnee.rotation.x = THREE.MathUtils.damp(rp.rig.rightKnee.rotation.x, 0.12, 12, dt);
            rp.rig.torsoGroup.rotation.x = THREE.MathUtils.damp(
              rp.rig.torsoGroup.rotation.x,
              0.04 + idleBreathe * 0.015,
              10,
              dt
            );
            rp.rig.bodyGroup.position.y = idleBreathe * 0.014;
            rp.rig.leftArm.rotation.x = -0.62 + idleBreathe * 0.02;
            rp.rig.rightArm.rotation.x = -0.48 + idleBreathe * 0.015 - recoilKick;
            rp.rig.headGroup.rotation.set(0, Math.sin(elapsed * 1.2) * 0.06, 0);
          }
          const rpRotor = !rp.grounded ? 26 : rSpeed > 0.45 ? 18 : 5;
          rp.rig.backRotor.rotation.z += dt * rpRotor;
          const rpFlameLen =
            (!rp.grounded ? 1.85 : rSpeed > 0.45 ? 0.95 : 0.3) +
            Math.sin(elapsed * 34 + rp.walkPhase) * 0.14;
          const rpFlameWidth = !rp.grounded ? 1.15 : rSpeed > 0.45 ? 0.92 : 0.68;
          rp.rig.leftThrusterFlame.scale.set(rpFlameWidth, rpFlameLen, rpFlameWidth);
          rp.rig.rightThrusterFlame.scale.set(rpFlameWidth, rpFlameLen, rpFlameWidth);
        }

        // --- MULTI-BOT TEAM COMBAT AI (1v1 - 5v5, Host-Authoritative in MP) ---
        const diff = DIFFICULTIES[difficultyRef.current];
        const activeCount = bots.filter((b) => b.active && b.alive).length;
        const soundMixScale = activeCount > 2 ? 0.55 : 0.85;
        const isMpClientOnly = Boolean(
          mpRoomRef.current && mpRoomRef.current.hostId !== mpPlayerIdRef.current
        );

        for (const bot of bots) {
          if (!bot.active || !bot.alive || bot.knockedDown || !bot.rig.root.visible) continue;

          bot.stunTimer = Math.max(0, bot.stunTimer - dt);
          bot.flinchTimer = Math.max(0, bot.flinchTimer - dt);
          if (bot.muzzleFlashTimer > 0) {
            bot.muzzleFlashTimer -= dt;
            if (bot.muzzleFlashTimer <= 0) bot.rig.muzzleFlash.visible = false;
          }

          if (isMpClientOnly) {
            const snap = mpBotTargets.get(bot.mpId);
            if (snap) {
              const prevBx = bot.pos.x;
              const prevBz = bot.pos.z;
              bot.pos.x = THREE.MathUtils.damp(bot.pos.x, snap.x, 14, dt);
              bot.pos.y = THREE.MathUtils.damp(bot.pos.y, snap.y, 14, dt);
              bot.pos.z = THREE.MathUtils.damp(bot.pos.z, snap.z, 14, dt);
              bot.vel.set((bot.pos.x - prevBx) / Math.max(dt, 0.001), 0, (bot.pos.z - prevBz) / Math.max(dt, 0.001));
              bot.grounded = snap.grounded;
              let dy = snap.yaw - bot.yaw;
              while (dy > Math.PI) dy -= Math.PI * 2;
              while (dy < -Math.PI) dy += Math.PI * 2;
              bot.yaw += dy * Math.min(1, dt * 14);
              bot.rig.root.position.copy(bot.pos);
              bot.rig.root.rotation.y = bot.yaw;
              bot.rig.bodyGroup.rotation.x =
                bot.flinchTimer > 0 ? -Math.sin((bot.flinchTimer / 0.16) * Math.PI) * 0.24 : 0;

              const cSpeed = snap.speed;
              if (!bot.grounded) {
                bot.rig.leftLeg.rotation.x = THREE.MathUtils.damp(bot.rig.leftLeg.rotation.x, -0.72, 12, dt);
                bot.rig.rightLeg.rotation.x = THREE.MathUtils.damp(bot.rig.rightLeg.rotation.x, 0.28, 12, dt);
                bot.rig.torsoGroup.rotation.x = THREE.MathUtils.damp(bot.rig.torsoGroup.rotation.x, 0.24, 10, dt);
                bot.rig.bodyGroup.position.y = THREE.MathUtils.damp(bot.rig.bodyGroup.position.y, 0.04, 10, dt);
              } else if (cSpeed > 0.45) {
                const strideAmp = THREE.MathUtils.clamp(cSpeed / 10.5, 0.45, 1.18);
                bot.walkPhase += dt * cSpeed * 1.18;
                const pL = bot.walkPhase;
                const pR = bot.walkPhase + Math.PI;
                bot.rig.leftLeg.rotation.x = THREE.MathUtils.damp(
                  bot.rig.leftLeg.rotation.x,
                  -Math.cos(pL) * 0.86 * strideAmp - 0.08,
                  18,
                  dt
                );
                bot.rig.rightLeg.rotation.x = THREE.MathUtils.damp(
                  bot.rig.rightLeg.rotation.x,
                  -Math.cos(pR) * 0.86 * strideAmp - 0.08,
                  18,
                  dt
                );
                bot.rig.torsoGroup.rotation.x = THREE.MathUtils.damp(bot.rig.torsoGroup.rotation.x, 0.22 * strideAmp, 14, dt);
              } else {
                const idleBreathe = Math.sin(elapsed * 2.3 + bot.walkPhase * 0.2);
                bot.rig.leftLeg.rotation.x = THREE.MathUtils.damp(bot.rig.leftLeg.rotation.x, -0.06, 12, dt);
                bot.rig.rightLeg.rotation.x = THREE.MathUtils.damp(bot.rig.rightLeg.rotation.x, 0.06, 12, dt);
                bot.rig.bodyGroup.position.y = idleBreathe * 0.014;
              }
              const rotorSpeed = !bot.grounded ? 26 : cSpeed > 0.45 ? 18 : 5;
              bot.rig.backRotor.rotation.z += dt * rotorSpeed;
              const flameLen = (!bot.grounded ? 1.85 : cSpeed > 0.45 ? 0.95 : 0.3) + Math.sin(elapsed * 34 + bot.walkPhase) * 0.14;
              const flameWidth = !bot.grounded ? 1.15 : cSpeed > 0.45 ? 0.92 : 0.68;
              bot.rig.leftThrusterFlame.scale.set(flameWidth, flameLen, flameWidth);
              bot.rig.rightThrusterFlame.scale.set(flameWidth, flameLen, flameWidth);
            }
            continue;
          }

          // Acquire nearest alive opposing combatant (including remote human players in MP)
          let targetPos: THREE.Vector3 | null = null;
          let targetIsPlayer = false;
          let targetBot: BotEntity | null = null;
          let targetRemote: RemotePlayerEntity | null = null;
          let bestDist = Infinity;

          if (bot.team === 'enemy') {
            if (player.alive) {
              const dPlayer = bot.pos.distanceTo(player.pos);
              bestDist = dPlayer;
              targetPos = _v3.set(player.pos.x, player.pos.y - 0.35, player.pos.z);
              targetIsPlayer = true;
            }
            for (const rp of remotePlayers.values()) {
              if (!rp.alive || rp.knockedDown || rp.team !== 'ally') continue;
              const d = bot.pos.distanceTo(rp.pos);
              if (d < bestDist) {
                bestDist = d;
                targetBot = null;
                targetRemote = rp;
                targetIsPlayer = false;
                targetPos = _v3.set(rp.pos.x, rp.pos.y + 1.35, rp.pos.z);
              }
            }
            for (const other of bots) {
              if (!other.active || !other.alive || other.team !== 'ally') continue;
              const d = bot.pos.distanceTo(other.pos);
              if (d < bestDist) {
                bestDist = d;
                targetBot = other;
                targetRemote = null;
                targetIsPlayer = false;
                targetPos = _v3.set(other.pos.x, other.pos.y + 1.35, other.pos.z);
              }
            }
          } else {
            for (const rp of remotePlayers.values()) {
              if (!rp.alive || rp.knockedDown || rp.team !== 'enemy') continue;
              const d = bot.pos.distanceTo(rp.pos);
              if (d < bestDist) {
                bestDist = d;
                targetBot = null;
                targetRemote = rp;
                targetIsPlayer = false;
                targetPos = _v3.set(rp.pos.x, rp.pos.y + 1.35, rp.pos.z);
              }
            }
            for (const other of bots) {
              if (!other.active || !other.alive || other.team !== 'enemy') continue;
              const d = bot.pos.distanceTo(other.pos);
              if (d < bestDist) {
                bestDist = d;
                targetBot = other;
                targetRemote = null;
                targetIsPlayer = false;
                targetPos = _v3.set(other.pos.x, other.pos.y + 1.35, other.pos.z);
              }
            }
          }

          if (!targetPos) continue;
          const targetCenter = targetPos.clone();

          _v1.subVectors(targetCenter, bot.pos);
          _v1.y = 0;
          const distToTarget = Math.max(0.01, _v1.length());
          _v1.divideScalar(distToTarget);

          const desiredYaw = Math.atan2(_v1.x, _v1.z);
          let diffYaw = desiredYaw - bot.yaw;
          while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
          while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
          bot.yaw += diffYaw * Math.min(1, dt * 10);
          bot.rig.root.rotation.y = bot.yaw;

          const flinchPitch =
            bot.flinchTimer > 0 ? -Math.sin((bot.flinchTimer / 0.16) * Math.PI) * 0.24 : 0;
          bot.rig.bodyGroup.rotation.x = flinchPitch;

          bot.strafeTimer -= dt;
          if (bot.strafeTimer <= 0) {
            bot.strafeTimer = 0.7 + Math.random() * 1.1;
            bot.strafeDir = Math.random() > 0.5 ? 1 : -1;
          }

          bot.jumpTimer -= dt;
          if (!match.tutorial.active && bot.jumpTimer <= 0 && bot.grounded && bot.stunTimer <= 0) {
            const baseJumpWait =
              bot.team === 'enemy'
                ? diff.id === 'rookie'
                  ? 4.8
                  : diff.id === 'ranked'
                    ? 3.5
                    : 2.6
                : 2.4;
            bot.jumpTimer = baseJumpWait + Math.random() * 2.8;
            bot.vel.y = 8.4;
            bot.grounded = false;
          }

          const desiredDist = match.tutorial.active
            ? 14
            : bot.hp < 50 && diff.useCover
              ? 19
              : 13;
          const approach =
            distToTarget > desiredDist ? 0.85 : distToTarget < desiredDist - 4 ? -0.6 : 0;
          _v2.set(-_v1.z * bot.strafeDir, 0, _v1.x * bot.strafeDir);

          // Soft separation so teammates and opponents spread organically in 2v2-5v5
          let sepX = 0;
          let sepZ = 0;
          for (const other of bots) {
            if (other === bot || !other.active || !other.alive) continue;
            const dx = bot.pos.x - other.pos.x;
            const dz = bot.pos.z - other.pos.z;
            const dSq = dx * dx + dz * dz;
            if (dSq > 0.0001 && dSq < 4.8) {
              const inv = (2.2 - Math.sqrt(dSq)) / Math.sqrt(dSq);
              sepX += dx * inv * 1.4;
              sepZ += dz * inv * 1.4;
            }
          }

          const tutorialMoveScale = match.tutorial.active
            ? match.tutorial.step < 6
              ? 0.42
              : 0.65
            : 1.0;
          const speedFactor = (bot.stunTimer > 0 ? 0.25 : 1.0) * tutorialMoveScale;
          bot.vel.x =
            (_v1.x * approach + _v2.x * 0.9 + bot.flankSign * _v1.z * -0.22 + sepX) *
            diff.moveSpeed *
            speedFactor;
          bot.vel.z =
            (_v1.z * approach + _v2.z * 0.9 + bot.flankSign * _v1.x * 0.22 + sepZ) *
            diff.moveSpeed *
            speedFactor;
          bot.vel.y -= 24 * dt;

          bot.pos.x += bot.vel.x * dt;
          bot.pos.z += bot.vel.z * dt;
          bot.pos.y += bot.vel.y * dt;

          resolveArenaCollision(bot.pos, 0.6, bot.pos.y, 2.05);

          const botPads = getMapBouncePads(mapRef.current);
          let botBounced = false;
          for (const pad of botPads) {
            if (
              Math.hypot(bot.pos.x - pad.x, bot.pos.z - pad.z) <= pad.radius &&
              bot.pos.y <= pad.y + 0.6 &&
              bot.vel.y <= 3.0
            ) {
              bot.pos.y = pad.y + 0.35;
              bot.vel.y = pad.impulseY;
              bot.grounded = false;
              botBounced = true;
              triggerBouncePadVisual(pad.id, pad.x, pad.z);
              if (mpRoomRef.current) {
                mpClientRef.current?.sendBouncePad(pad.id, pad.x, pad.z);
              }
              break;
            }
          }

          const wasBotGrounded = bot.grounded;
          const botFloor = getMapFloorHeightAt(mapRef.current, bot.pos.x, bot.pos.z, bot.pos.y);
          if (!botBounced && bot.pos.y <= botFloor) {
            if (!wasBotGrounded && isWaterSurfaceAt(mapRef.current, bot.pos.x, botFloor, bot.pos.z)) {
              activeWaterCtrl?.addRipple(bot.pos.x, bot.pos.z, 1.05);
            }
            bot.pos.y = botFloor;
            bot.vel.y = 0;
            bot.grounded = true;
          } else if (!botBounced && bot.pos.y > botFloor + 0.12) {
            bot.grounded = false;
          }

          const botCeil = getMapCeilingHeightAt(mapRef.current, bot.pos.x, bot.pos.z, bot.pos.y);
          if (botCeil < Infinity && bot.pos.y + 2.05 > botCeil) {
            bot.pos.y = Math.max(botFloor, botCeil - 2.05);
            if (bot.vel.y > 0) bot.vel.y = 0;
          }
          bot.rig.root.position.copy(bot.pos);

          const bSpeed = Math.hypot(bot.vel.x, bot.vel.z);
          const sinYaw = Math.sin(bot.yaw);
          const cosYaw = Math.cos(bot.yaw);
          const fwdVel = bot.vel.x * sinYaw + bot.vel.z * cosYaw;
          const strafeVel = bot.vel.x * cosYaw - bot.vel.z * sinYaw;
          const strafeNorm = THREE.MathUtils.clamp(strafeVel / Math.max(1, diff.moveSpeed), -1, 1);
          const recoilKick = bot.muzzleFlashTimer > 0 ? 0.2 : 0;

          if (!bot.grounded) {
            // Airborne Jetpack Jump Pose: tucked lead knee, extended trail leg, flared thrusters
            bot.rig.leftLeg.rotation.x = THREE.MathUtils.damp(bot.rig.leftLeg.rotation.x, -0.72, 12, dt);
            bot.rig.leftKnee.rotation.x = THREE.MathUtils.damp(bot.rig.leftKnee.rotation.x, 1.18, 12, dt);
            bot.rig.leftAnkle.rotation.x = THREE.MathUtils.damp(bot.rig.leftAnkle.rotation.x, 0.28, 12, dt);
            bot.rig.rightLeg.rotation.x = THREE.MathUtils.damp(bot.rig.rightLeg.rotation.x, 0.28, 12, dt);
            bot.rig.rightKnee.rotation.x = THREE.MathUtils.damp(bot.rig.rightKnee.rotation.x, 0.44, 12, dt);
            bot.rig.rightAnkle.rotation.x = THREE.MathUtils.damp(bot.rig.rightAnkle.rotation.x, 0.36, 12, dt);
            bot.rig.leftLeg.rotation.z = THREE.MathUtils.damp(bot.rig.leftLeg.rotation.z, 0.08, 10, dt);
            bot.rig.rightLeg.rotation.z = THREE.MathUtils.damp(bot.rig.rightLeg.rotation.z, -0.08, 10, dt);

            bot.rig.pelvisGroup.rotation.y = THREE.MathUtils.damp(bot.rig.pelvisGroup.rotation.y, 0, 10, dt);
            bot.rig.torsoGroup.rotation.y = THREE.MathUtils.damp(bot.rig.torsoGroup.rotation.y, 0, 10, dt);
            bot.rig.torsoGroup.rotation.x = THREE.MathUtils.damp(bot.rig.torsoGroup.rotation.x, 0.24, 10, dt);
            bot.rig.bodyGroup.position.y = THREE.MathUtils.damp(bot.rig.bodyGroup.position.y, 0.04, 10, dt);
            bot.rig.bodyGroup.rotation.z = THREE.MathUtils.damp(
              bot.rig.bodyGroup.rotation.z,
              -strafeNorm * 0.18,
              10,
              dt
            );
            bot.rig.leftArm.rotation.x = THREE.MathUtils.damp(bot.rig.leftArm.rotation.x, -0.78, 12, dt);
            bot.rig.leftElbow.rotation.x = THREE.MathUtils.damp(bot.rig.leftElbow.rotation.x, -0.88, 12, dt);
            bot.rig.rightArm.rotation.x = THREE.MathUtils.damp(
              bot.rig.rightArm.rotation.x,
              -0.52 - recoilKick,
              14,
              dt
            );
            bot.rig.rightElbow.rotation.x = THREE.MathUtils.damp(
              bot.rig.rightElbow.rotation.x,
              -1.02 - recoilKick * 0.6,
              14,
              dt
            );
            bot.rig.headGroup.rotation.set(-0.12, 0, 0);
          } else if (bSpeed > 0.45) {
            // Dynamic Multi-Joint Athletic Sprint Cycle (Heel Strike -> Stance -> Toe-Off -> High-Knee Tuck)
            const strideDir = fwdVel < -1.5 ? -1 : 1;
            const strideAmp = THREE.MathUtils.clamp(bSpeed / 10.5, 0.45, 1.18);
            bot.walkPhase += dt * bSpeed * 1.18 * strideDir;

            const pL = bot.walkPhase;
            const pR = bot.walkPhase + Math.PI;

            const targetLeftHip = -Math.cos(pL) * 0.86 * strideAmp - 0.08;
            const targetRightHip = -Math.cos(pR) * 0.86 * strideAmp - 0.08;
            const targetLeftKnee =
              0.2 +
              Math.max(0, -Math.sin(pL)) * 1.12 * strideAmp +
              Math.max(0, Math.sin(pL)) * 0.28 * strideAmp;
            const targetRightKnee =
              0.2 +
              Math.max(0, -Math.sin(pR)) * 1.12 * strideAmp +
              Math.max(0, Math.sin(pR)) * 0.28 * strideAmp;
            const targetLeftAnkle = -Math.cos(pL) * 0.34 * strideAmp;
            const targetRightAnkle = -Math.cos(pR) * 0.34 * strideAmp;

            bot.rig.leftLeg.rotation.x = THREE.MathUtils.damp(bot.rig.leftLeg.rotation.x, targetLeftHip, 18, dt);
            bot.rig.rightLeg.rotation.x = THREE.MathUtils.damp(bot.rig.rightLeg.rotation.x, targetRightHip, 18, dt);
            bot.rig.leftKnee.rotation.x = THREE.MathUtils.damp(bot.rig.leftKnee.rotation.x, targetLeftKnee, 18, dt);
            bot.rig.rightKnee.rotation.x = THREE.MathUtils.damp(bot.rig.rightKnee.rotation.x, targetRightKnee, 18, dt);
            bot.rig.leftAnkle.rotation.x = THREE.MathUtils.damp(bot.rig.leftAnkle.rotation.x, targetLeftAnkle, 18, dt);
            bot.rig.rightAnkle.rotation.x = THREE.MathUtils.damp(bot.rig.rightAnkle.rotation.x, targetRightAnkle, 18, dt);
            bot.rig.leftLeg.rotation.z = THREE.MathUtils.damp(bot.rig.leftLeg.rotation.z, strafeNorm * 0.12, 12, dt);
            bot.rig.rightLeg.rotation.z = THREE.MathUtils.damp(bot.rig.rightLeg.rotation.z, strafeNorm * 0.12, 12, dt);

            // Pelvis & Torso Counter-Twist + Forward Sprint Lean + Flight-Phase Spring Bounce
            const hipTwist = -Math.cos(pL) * 0.16 * strideAmp;
            const chestTwist = Math.cos(pL) * 0.24 * strideAmp;
            const sprintLean = (fwdVel < -1.0 ? -0.06 : 0.24) * strideAmp;
            const bounce = Math.max(-0.045, -Math.cos(bot.walkPhase * 2 + 0.5) * 0.08 * strideAmp);

            bot.rig.pelvisGroup.rotation.y = THREE.MathUtils.damp(bot.rig.pelvisGroup.rotation.y, hipTwist, 16, dt);
            bot.rig.torsoGroup.rotation.y = THREE.MathUtils.damp(bot.rig.torsoGroup.rotation.y, chestTwist, 16, dt);
            bot.rig.torsoGroup.rotation.x = THREE.MathUtils.damp(bot.rig.torsoGroup.rotation.x, sprintLean, 14, dt);
            bot.rig.bodyGroup.position.y = THREE.MathUtils.damp(bot.rig.bodyGroup.position.y, bounce, 18, dt);
            bot.rig.bodyGroup.rotation.z = THREE.MathUtils.damp(
              bot.rig.bodyGroup.rotation.z,
              -strafeNorm * 0.15,
              10,
              dt
            );

            // Head Target-Lock Stabilization (compensates for chest twist & lean)
            bot.rig.headGroup.rotation.y =
              -bot.rig.torsoGroup.rotation.y * 0.85 +
              Math.sin(elapsed * 1.8 + bot.walkPhase * 0.15) * 0.05;
            bot.rig.headGroup.rotation.x = -bot.rig.torsoGroup.rotation.x * 0.55;

            // Coordinated Arm & Rifle Pump
            bot.rig.leftArm.rotation.x = -0.68 - Math.cos(pL) * 0.28 * strideAmp;
            bot.rig.leftElbow.rotation.x = -0.82 - Math.max(0, Math.cos(pL)) * 0.26 * strideAmp;
            bot.rig.rightArm.rotation.x = -0.5 + Math.cos(pL) * 0.14 * strideAmp - recoilKick;
            bot.rig.rightElbow.rotation.x = -1.0 - Math.cos(pL) * 0.1 * strideAmp - recoilKick * 0.6;
          } else {
            // Athletic Combat-Ready Idle Stance
            const idleBreathe = Math.sin(elapsed * 2.3 + bot.walkPhase * 0.2);
            bot.rig.leftLeg.rotation.x = THREE.MathUtils.damp(bot.rig.leftLeg.rotation.x, -0.06, 12, dt);
            bot.rig.rightLeg.rotation.x = THREE.MathUtils.damp(bot.rig.rightLeg.rotation.x, 0.06, 12, dt);
            bot.rig.leftKnee.rotation.x = THREE.MathUtils.damp(bot.rig.leftKnee.rotation.x, 0.12, 12, dt);
            bot.rig.rightKnee.rotation.x = THREE.MathUtils.damp(bot.rig.rightKnee.rotation.x, 0.12, 12, dt);
            bot.rig.leftAnkle.rotation.x = THREE.MathUtils.damp(bot.rig.leftAnkle.rotation.x, -0.06, 12, dt);
            bot.rig.rightAnkle.rotation.x = THREE.MathUtils.damp(bot.rig.rightAnkle.rotation.x, -0.06, 12, dt);
            bot.rig.leftLeg.rotation.z = THREE.MathUtils.damp(bot.rig.leftLeg.rotation.z, 0.03, 10, dt);
            bot.rig.rightLeg.rotation.z = THREE.MathUtils.damp(bot.rig.rightLeg.rotation.z, -0.03, 10, dt);

            bot.rig.pelvisGroup.rotation.y = THREE.MathUtils.damp(bot.rig.pelvisGroup.rotation.y, 0, 10, dt);
            bot.rig.torsoGroup.rotation.y = THREE.MathUtils.damp(bot.rig.torsoGroup.rotation.y, 0, 10, dt);
            bot.rig.torsoGroup.rotation.x = THREE.MathUtils.damp(
              bot.rig.torsoGroup.rotation.x,
              0.04 + idleBreathe * 0.015,
              10,
              dt
            );
            bot.rig.bodyGroup.position.y = idleBreathe * 0.014;
            bot.rig.bodyGroup.rotation.z = THREE.MathUtils.damp(bot.rig.bodyGroup.rotation.z, 0, 10, dt);

            bot.rig.leftArm.rotation.x = -0.62 + idleBreathe * 0.02;
            bot.rig.leftElbow.rotation.x = -0.78 + idleBreathe * 0.025;
            bot.rig.rightArm.rotation.x = -0.48 + idleBreathe * 0.015 - recoilKick;
            bot.rig.rightElbow.rotation.x = -1.02 - recoilKick * 0.6;
            bot.rig.headGroup.rotation.y = Math.sin(elapsed * 1.2) * 0.06;
            bot.rig.headGroup.rotation.x = 0;
          }

          // Continuous Mechanical Animations: Dorsal Cooling Turbine & Thruster Exhaust Pulse
          const rotorSpeed = !bot.grounded ? 26 : bSpeed > 0.45 ? 18 : 5;
          bot.rig.backRotor.rotation.z += dt * rotorSpeed;
          const speedRatio = THREE.MathUtils.clamp(bSpeed / 11, 0, 1.2);
          const flameLen =
            (!bot.grounded ? 1.85 : bSpeed > 0.45 ? 0.8 + speedRatio * 0.5 : 0.3) +
            Math.sin(elapsed * 34 + bot.walkPhase) * 0.14;
          const flameWidth = !bot.grounded ? 1.15 : bSpeed > 0.45 ? 0.92 : 0.68;
          bot.rig.leftThrusterFlame.scale.set(flameWidth, flameLen, flameWidth);
          bot.rig.rightThrusterFlame.scale.set(flameWidth, flameLen, flameWidth);

          const canBotFire = !match.tutorial.active || (match.tutorial.step === 6 && !match.tutorial.completed);
          if (bot.stunTimer <= 0 && canBotFire) {
            bot.fireTimer -= dt;
            if (bot.fireTimer <= 0) {
              bot.rig.root.updateMatrixWorld(true);
              bot.rig.muzzlePoint.getWorldPosition(_v2);
              _botEyePos.set(bot.pos.x, bot.pos.y + 1.5, bot.pos.z);

              _v3.subVectors(targetCenter, _v2).normalize();
              const hasClearLos =
                hasClearWorldLine(_botEyePos, _v2, 0.02) &&
                hasClearWorldLine(_botEyePos, targetCenter, 0.02) &&
                hasClearWorldLine(_v2, targetCenter, 0.02);

              if (hasClearLos) {
                const baseCadence = match.tutorial.active
                  ? 0.85
                  : bot.team === 'ally'
                    ? Math.max(0.32, diff.reactionSec * 0.65)
                    : diff.reactionSec;
                bot.fireTimer = baseCadence + Math.random() * (bot.team === 'enemy' ? 0.34 : 0.22);

                bot.muzzleFlashTimer = 0.055;
                bot.rig.muzzleFlash.visible = true;
                bot.rig.muzzleFlash.rotation.z = Math.random() * Math.PI;
                spawnSmokePuff(_v2, 0xcbd5e1, 0.09, 0.28, 0.26, 0.14, 0.8);
                const camDist = _v2.distanceTo(camera.position);
                shooterAudio.playGunshot(
                  'assault_rifle',
                  Math.max(0.12, (1 - camDist / 65) * soundMixScale)
                );

                const tracerCol = bot.team === 'enemy' ? 0xf43f5e : 0x38bdf8;
                const hitRoll = Math.random();
                const slidePenalty =
                  bot.team === 'enemy' && targetIsPlayer && player.sliding ? 0.68 : 1.0;
                const effectiveAcc =
                  bot.team === 'ally'
                    ? Math.max(0.46, diff.accuracy * 1.25)
                    : diff.accuracy * slidePenalty;

                if (hitRoll < effectiveAcc) {
                  const headHit =
                    bot.team === 'ally'
                      ? hitRoll < effectiveAcc * 0.18
                      : hitRoll < effectiveAcc * diff.headshotChance;
                  const baseDmg = headHit ? 20 : 12;
                  const dmg =
                    bot.team === 'ally'
                      ? baseDmg
                      : Math.max(4, Math.round(baseDmg * diff.damageScale));
                  spawnTracer(_v2, targetCenter, tracerCol, 0.025);
                  if (targetIsPlayer) {
                    damagePlayer(dmg, headHit, bot.name);
                  } else if (targetRemote && mpRoomRef.current) {
                    mpClientRef.current?.sendBotDamagePlayer({
                      botName: bot.name,
                      targetPlayerId: targetRemote.id,
                      damage: dmg,
                      headshot: headHit,
                    });
                  } else if (targetBot) {
                    damageBot(targetBot, dmg, headHit, targetCenter, bot.name, bot.team, false);
                  }
                } else {
                  _v3.x += (Math.random() - 0.5) * 0.16;
                  _v3.y += (Math.random() - 0.5) * 0.12;
                  _v3.z += (Math.random() - 0.5) * 0.16;
                  _v3.normalize();
                  const missDist = getWorldCoverDistance(_v2, _v3, 45);
                  _v1.copy(_v2).addScaledVector(_v3, missDist);
                  spawnTracer(_v2, _v1, tracerCol, 0.022);
                }
              } else {
                bot.fireTimer = 0.12;
              }
            }
          }
        }

        // Host broadcasts authoritative bot transforms & health at 15Hz in multiplayer
        if (
          mpRoomRef.current &&
          mpRoomRef.current.phase === 'PLAYING' &&
          mpRoomRef.current.hostId === mpPlayerIdRef.current
        ) {
          mpBotsAccum += dt;
          if (mpBotsAccum >= 0.066) {
            mpBotsAccum = 0;
            const myMpTeam = getMyMpTeam(mpRoomRef.current);
            const oppMpTeam: MpTeam = myMpTeam === 'alpha' ? 'omega' : 'alpha';
            const snaps: MpBotSnapshot[] = bots
              .filter((b) => b.active)
              .map((b) => ({
                id: b.mpId || b.id,
                name: b.name,
                team: b.team === 'ally' ? myMpTeam : oppMpTeam,
                x: b.pos.x,
                y: b.pos.y,
                z: b.pos.z,
                yaw: b.yaw,
                hp: b.hp,
                maxHp: b.maxHp,
                alive: b.alive,
                knockedDown: b.knockedDown,
                grounded: b.grounded,
                speed: Math.hypot(b.vel.x, b.vel.z),
              }));
            if (snaps.length > 0) {
              mpClientRef.current?.sendBotsSync(snaps);
            }
          }
        }

        // Update Thrown Grenades & Flashbangs
        for (let i = thrownItems.length - 1; i >= 0; i--) {
          const item = thrownItems[i];
          item.life -= dt;
          item.vel.y -= 22 * dt;
          _v1.copy(item.mesh.position);
          const stepX = item.vel.x * dt;
          const stepY = item.vel.y * dt;
          const stepZ = item.vel.z * dt;
          const stepLen = Math.hypot(stepX, stepY, stepZ);
          if (stepLen > 0.0001) {
            _v2.set(stepX / stepLen, stepY / stepLen, stepZ / stepLen);
            worldRaycaster.set(_v1, _v2);
            worldRaycaster.near = 0;
            worldRaycaster.far = stepLen + 0.18;
            const gHits = worldRaycaster.intersectObjects([arenaGroup, terrainMesh], true);
            const solidHit = gHits.find((h) => isSolidWorldObject(h.object));
            if (solidHit && solidHit.face) {
              _v3.copy(solidHit.face.normal).transformDirection(solidHit.object.matrixWorld).normalize();
              item.mesh.position.copy(solidHit.point).addScaledVector(_v3, 0.18);
              const vn = item.vel.dot(_v3);
              if (vn < 0) {
                item.vel.addScaledVector(_v3, -1.55 * vn);
                item.vel.multiplyScalar(0.75);
              }
            } else {
              item.mesh.position.set(_v1.x + stepX, _v1.y + stepY, _v1.z + stepZ);
            }
          }
          resolveArenaCollision(item.mesh.position, 0.18, item.mesh.position.y - 0.18, 0.36);
          item.mesh.rotation.x += 6 * dt;
          item.mesh.rotation.z += 4 * dt;

          const fl =
            getMapFloorHeightAt(
              mapRef.current,
              item.mesh.position.x,
              item.mesh.position.z,
              item.mesh.position.y - 0.18
            ) + 0.18;
          if (item.mesh.position.y <= fl) {
            item.mesh.position.y = fl;
            item.vel.y *= -0.52;
            item.vel.x *= 0.75;
            item.vel.z *= 0.75;
          }

          for (const pad of getMapBouncePads(mapRef.current)) {
            if (
              Math.hypot(item.mesh.position.x - pad.x, item.mesh.position.z - pad.z) <= pad.radius &&
              item.mesh.position.y <= pad.y + 0.55 &&
              item.vel.y <= 3.0
            ) {
              item.mesh.position.y = pad.y + 0.45;
              item.vel.y = pad.impulseY * 0.85;
              triggerBouncePadVisual(pad.id, pad.x, pad.z);
              if (mpRoomRef.current) {
                mpClientRef.current?.sendBouncePad(pad.id, pad.x, pad.z);
              }
              break;
            }
          }

          if (item.life <= 0) {
            const expPos = item.mesh.position.clone();
            scene.remove(item.mesh);
            (item.mesh.material as THREE.Material).dispose();
            thrownItems.splice(i, 1);

            if (item.kind === 'grenade') {
              shooterAudio.playExplosion();
              spawnSparks(expPos, 0xf97316, 26);
              spawnDebris(expPos, mats.armorDark, 10);
              spawnShockwave(expPos, 0xf97316, 9.5);
              if (isWaterSurfaceAt(mapRef.current, expPos.x, expPos.y - 0.9, expPos.z)) {
                activeWaterCtrl?.addRipple(expPos.x, expPos.z, 2.5);
                shooterAudio.playWaterSplash(1.3);
                spawnSparks(_v1.set(expPos.x, 0.12, expPos.z), 0xe0f2fe, 16);
                spawnShockwave(_v1.set(expPos.x, 0.05, expPos.z), 0x7dd3fc, 6.2);
                if (mpRoomRef.current) {
                  mpClientRef.current?.sendWaterRipple(expPos.x, expPos.z, 2.5);
                }
              }
              if (mpRoomRef.current) {
                mpClientRef.current?.sendFireFx({
                  weaponId: 'grenade',
                  from: [expPos.x, expPos.y, expPos.z],
                  to: [expPos.x, expPos.y, expPos.z],
                  colorHex: 0xf97316,
                  explosion: true,
                  splashRadius: 7.5,
                });
              }
              explosionLight.color.setHex(0xf97316);
              explosionLight.position.copy(expPos).add(new THREE.Vector3(0, 0.8, 0));
              explosionLight.intensity = 22;
              match.aberrationPulse = 0.0065;
              for (let s = 0; s < 8; s++) {
                _v2.copy(expPos).add(
                  new THREE.Vector3(
                    (Math.random() - 0.5) * 1.4,
                    0.3 + Math.random() * 0.6,
                    (Math.random() - 0.5) * 1.4
                  )
                );
                spawnSmokePuff(
                  _v2,
                  s % 2 === 0 ? 0x334155 : 0xf97316,
                  0.9,
                  3.2,
                  1.15 + Math.random() * 0.4,
                  0.52,
                  2.2
                );
              }
              _losOrigin.set(expPos.x, expPos.y + 0.25, expPos.z);
              for (const bot of bots) {
                if (!bot.active || bot.team !== 'enemy' || !bot.alive) continue;
                const d = expPos.distanceTo(_v1.set(bot.pos.x, bot.pos.y + 1.2, bot.pos.z));
                _losTargetHead.set(bot.pos.x, bot.pos.y + 1.65, bot.pos.z);
                if (
                  d < 7.5 &&
                  (hasClearWorldLine(_losOrigin, _v1, 0.04) ||
                    hasClearWorldLine(_losOrigin, _losTargetHead, 0.04))
                ) {
                  const dmg = Math.round(78 * item.powerMult * (1 - d / 8.5));
                  damageBot(bot, dmg, false, _v1, 'YOU', 'ally', true, 'grenade');
                }
              }
              for (const rp of remotePlayers.values()) {
                if (rp.team !== 'enemy' || !rp.alive || rp.knockedDown) continue;
                const d = expPos.distanceTo(_v1.set(rp.pos.x, rp.pos.y + 1.2, rp.pos.z));
                _losTargetHead.set(rp.pos.x, rp.pos.y + 1.65, rp.pos.z);
                if (
                  d < 7.5 &&
                  (hasClearWorldLine(_losOrigin, _v1, 0.04) ||
                    hasClearWorldLine(_losOrigin, _losTargetHead, 0.04))
                ) {
                  const dmg = Math.round(78 * item.powerMult * (1 - d / 8.5));
                  damageRemotePlayer(rp, dmg, false, _v1, 'grenade');
                }
              }
            } else {
              shooterAudio.playHeal();
              spawnSparks(expPos, 0xfef08a, 18);
              spawnShockwave(expPos, 0xfef08a, 11.5);
              explosionLight.color.setHex(0xfef08a);
              explosionLight.position.copy(expPos).add(new THREE.Vector3(0, 0.8, 0));
              explosionLight.intensity = 26;
              _losOrigin.set(expPos.x, expPos.y + 0.25, expPos.z);
              for (const bot of bots) {
                if (!bot.active || bot.team !== 'enemy' || !bot.alive) continue;
                const d = expPos.distanceTo(_v1.set(bot.pos.x, bot.pos.y + 1.2, bot.pos.z));
                _losTargetHead.set(bot.pos.x, bot.pos.y + 1.65, bot.pos.z);
                if (
                  d < 11 &&
                  (hasClearWorldLine(_losOrigin, _v1, 0.04) ||
                    hasClearWorldLine(_losOrigin, _losTargetHead, 0.04))
                ) {
                  bot.stunTimer = 2.4 * item.powerMult;
                }
              }
            }
          }
        }

        // Update Ejected Brass Shell Casings
        for (let i = shells.length - 1; i >= 0; i--) {
          const sh = shells[i];
          sh.life += dt;
          sh.vel.y -= 20 * dt;
          sh.mesh.position.addScaledVector(sh.vel, dt);
          sh.mesh.rotation.x += sh.rotVel.x * dt;
          sh.mesh.rotation.y += sh.rotVel.y * dt;
          sh.mesh.rotation.z += sh.rotVel.z * dt;

          const fl =
            getMapFloorHeightAt(
              mapRef.current,
              sh.mesh.position.x,
              sh.mesh.position.z,
              sh.mesh.position.y - 0.02
            ) + 0.02;
          if (sh.mesh.position.y <= fl) {
            sh.mesh.position.y = fl;
            if (!sh.bounced) {
              sh.bounced = true;
              shooterAudio.playShellDrop();
            }
            sh.vel.y *= -0.4;
            sh.vel.x *= 0.55;
            sh.vel.z *= 0.55;
            sh.rotVel.multiplyScalar(0.5);
          }

          if (sh.life >= 5.5) {
            scene.remove(sh.mesh);
            shells.splice(i, 1);
          }
        }

        // Update 3D Tumbling Impact Debris Chips
        for (let i = debrisEntities.length - 1; i >= 0; i--) {
          const d = debrisEntities[i];
          d.life += dt;
          d.vel.y -= 22 * dt;
          d.mesh.position.addScaledVector(d.vel, dt);
          d.mesh.rotation.x += d.rotVel.x * dt;
          d.mesh.rotation.y += d.rotVel.y * dt;
          d.mesh.rotation.z += d.rotVel.z * dt;

          const fl =
            getMapFloorHeightAt(
              mapRef.current,
              d.mesh.position.x,
              d.mesh.position.z,
              d.mesh.position.y - 0.025
            ) + 0.025;
          if (d.mesh.position.y <= fl) {
            d.mesh.position.y = fl;
            d.vel.y *= -0.35;
            d.vel.x *= 0.6;
            d.vel.z *= 0.6;
            d.rotVel.multiplyScalar(0.55);
          }
          if (d.life >= d.maxLife) {
            scene.remove(d.mesh);
            debrisEntities.splice(i, 1);
          }
        }

        // Age Bullet Impact Decals
        for (let i = impacts.length - 1; i >= 0; i--) {
          const imp = impacts[i];
          imp.life += dt;
          if (imp.life >= imp.maxLife) {
            scene.remove(imp.mesh);
            impacts.splice(i, 1);
          }
        }

        // Update Tracers
        for (let i = tracers.length - 1; i >= 0; i--) {
          const t = tracers[i];
          t.life += dt;
          (t.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
            0,
            1 - t.life / t.maxLife
          );
          if (t.life >= t.maxLife) {
            scene.remove(t.mesh);
            t.mesh.geometry.dispose();
            (t.mesh.material as THREE.Material).dispose();
            tracers.splice(i, 1);
          }
        }

        // Update Sparks
        for (let i = sparks.length - 1; i >= 0; i--) {
          const sp = sparks[i];
          sp.life += dt;
          sp.vel.y -= 18 * dt;
          sp.mesh.position.addScaledVector(sp.vel, dt);
          sp.mesh.scale.setScalar(Math.max(0.01, 1 - sp.life / sp.maxLife));
          if (sp.life >= sp.maxLife) {
            scene.remove(sp.mesh);
            (sp.mesh.material as THREE.Material).dispose();
            sparks.splice(i, 1);
          }
        }

        // Update Smoke Puffs
        for (let i = smokes.length - 1; i >= 0; i--) {
          const sm = smokes[i];
          sm.life += dt;
          const p = Math.min(1, sm.life / sm.maxLife);
          sm.sprite.position.addScaledVector(sm.vel, dt);
          sm.vel.multiplyScalar(0.96);
          const sc = THREE.MathUtils.lerp(sm.startScale, sm.endScale, p);
          sm.sprite.scale.setScalar(sc);
          sm.sprite.material.opacity = sm.baseOpacity * (1 - p);
          if (sm.life >= sm.maxLife) {
            scene.remove(sm.sprite);
            sm.sprite.material.dispose();
            smokes.splice(i, 1);
          }
        }

        // Update RPG Rockets
        for (let i = rockets.length - 1; i >= 0; i--) {
          const rk = rockets[i];
          rk.life -= dt;
          rk.vel.y -= 1.15 * dt;
          const stepVec = rk.vel.clone().multiplyScalar(dt);
          const stepDist = stepVec.length();
          const prevPos = rk.mesh.position.clone();
          const nextPos = prevPos.clone().add(stepVec);
          const dir = stepVec.clone().normalize();
          rk.mesh.position.copy(nextPos);
          rk.mesh.lookAt(_v1.copy(nextPos).add(dir));

          rk.smokeAccum += dt;
          if (rk.smokeAccum >= 0.028) {
            rk.smokeAccum = 0;
            spawnSmokePuff(prevPos, 0xcbd5e1, 0.2, 0.95, 0.42, 0.34, 0.65);
          }

          let impactPos: THREE.Vector3 | null = null;
          let directBot: BotEntity | null = null;
          let directRemote: RemotePlayerEntity | null = null;

          // Check wall/cover collision first so rockets cannot direct-hit through thin cover
          let wallImpactDist = Infinity;
          if (stepDist > 0.001) {
            const coverHitDist = getWorldCoverDistance(prevPos, dir, stepDist + 0.15);
            if (coverHitDist <= stepDist + 0.12) {
              wallImpactDist = coverHitDist;
            }
          }

          // Check enemy bot & remote player direct hit only along clear segment before any wall hit
          for (const bot of bots) {
            if (!bot.active || bot.team !== 'enemy' || !bot.alive || bot.knockedDown) continue;
            const botCenter = _v1.set(bot.pos.x, bot.pos.y + 1.25, bot.pos.z);
            const toCenter = _losOrigin.subVectors(botCenter, prevPos);
            const proj = THREE.MathUtils.clamp(toCenter.dot(dir), 0, Math.min(stepDist, wallImpactDist));
            _v2.copy(prevPos).addScaledVector(dir, proj);
            if (_v2.distanceTo(botCenter) < 1.05 && hasClearWorldLine(_v2, botCenter, 0.04)) {
              impactPos = _v2.clone();
              directBot = bot;
              break;
            }
          }
          if (!impactPos) {
            for (const rp of remotePlayers.values()) {
              if (rp.team !== 'enemy' || !rp.alive || rp.knockedDown) continue;
              const rpCenter = _v1.set(rp.pos.x, rp.pos.y + 1.25, rp.pos.z);
              const toCenter = _losOrigin.subVectors(rpCenter, prevPos);
              const proj = THREE.MathUtils.clamp(toCenter.dot(dir), 0, Math.min(stepDist, wallImpactDist));
              _v2.copy(prevPos).addScaledVector(dir, proj);
              if (_v2.distanceTo(rpCenter) < 1.05 && hasClearWorldLine(_v2, rpCenter, 0.04)) {
                impactPos = _v2.clone();
                directRemote = rp;
                break;
              }
            }
          }

          if (!impactPos && wallImpactDist < Infinity) {
            impactPos = prevPos.clone().addScaledVector(dir, wallImpactDist);
          }
          if (!impactPos) {
            const fl =
              getMapFloorHeightAt(mapRef.current, nextPos.x, nextPos.z, nextPos.y) + 0.12;
            if (nextPos.y <= fl) {
              impactPos = new THREE.Vector3(nextPos.x, fl, nextPos.z);
            }
          }
          if (!impactPos && rk.life <= 0) {
            impactPos = nextPos.clone();
          }

          if (impactPos) {
            scene.remove(rk.mesh);
            disposeObjectTree(rk.mesh);
            rockets.splice(i, 1);

            shooterAudio.playExplosion();
            spawnSparks(impactPos, rk.colorHex, 28);
            spawnDebris(impactPos, mats.armorDark, 12);
            spawnShockwave(impactPos, rk.colorHex, rk.splashRadius * 1.45);
            if (isWaterSurfaceAt(mapRef.current, impactPos.x, impactPos.y - 0.9, impactPos.z)) {
              activeWaterCtrl?.addRipple(impactPos.x, impactPos.z, 2.5);
              shooterAudio.playWaterSplash(1.4);
              spawnSparks(_v1.set(impactPos.x, 0.12, impactPos.z), 0xe0f2fe, 18);
              spawnShockwave(_v1.set(impactPos.x, 0.05, impactPos.z), 0x7dd3fc, 6.8);
              if (mpRoomRef.current) {
                mpClientRef.current?.sendWaterRipple(impactPos.x, impactPos.z, 2.5);
              }
            }
            if (mpRoomRef.current) {
              mpClientRef.current?.sendFireFx({
                weaponId: 'rpg',
                from: [impactPos.x, impactPos.y, impactPos.z],
                to: [impactPos.x, impactPos.y, impactPos.z],
                colorHex: rk.colorHex,
                explosion: true,
                splashRadius: rk.splashRadius,
              });
            }
            explosionLight.color.setHex(rk.colorHex);
            explosionLight.position.copy(impactPos).add(new THREE.Vector3(0, 0.9, 0));
            explosionLight.intensity = 26;
            match.aberrationPulse = 0.0085;
            for (let s = 0; s < 10; s++) {
              _v2.copy(impactPos).add(
                new THREE.Vector3(
                  (Math.random() - 0.5) * 1.6,
                  0.3 + Math.random() * 0.8,
                  (Math.random() - 0.5) * 1.6
                )
              );
              spawnSmokePuff(
                _v2,
                s % 2 === 0 ? 0x334155 : rk.colorHex,
                0.95,
                3.6,
                1.2 + Math.random() * 0.4,
                0.56,
                2.5
              );
            }

            let damagedAny = false;
            _losOrigin.copy(impactPos).addScaledVector(dir, -0.14);
            _losOrigin.y += 0.22;
            for (const bot of bots) {
              if (!bot.active || bot.team !== 'enemy' || !bot.alive || bot.knockedDown) continue;
              const center = _v1.set(bot.pos.x, bot.pos.y + 1.25, bot.pos.z);
              _losTargetHead.set(bot.pos.x, bot.pos.y + 1.65, bot.pos.z);
              const d = impactPos.distanceTo(center);
              if (
                bot === directBot ||
                (d <= rk.splashRadius &&
                  (hasClearWorldLine(_losOrigin, center, 0.04) ||
                    hasClearWorldLine(_losOrigin, _losTargetHead, 0.04)))
              ) {
                const falloff =
                  bot === directBot ? 1 : Math.max(0.28, 1 - d / (rk.splashRadius + 0.8));
                const dmg = Math.round(rk.damage * falloff);
                damageBot(bot, dmg, false, center, 'YOU', 'ally', true, 'rpg');
                damagedAny = true;
              }
            }
            for (const rp of remotePlayers.values()) {
              if (rp.team !== 'enemy' || !rp.alive || rp.knockedDown) continue;
              const center = _v1.set(rp.pos.x, rp.pos.y + 1.25, rp.pos.z);
              _losTargetHead.set(rp.pos.x, rp.pos.y + 1.65, rp.pos.z);
              const d = impactPos.distanceTo(center);
              if (
                rp === directRemote ||
                (d <= rk.splashRadius &&
                  (hasClearWorldLine(_losOrigin, center, 0.04) ||
                    hasClearWorldLine(_losOrigin, _losTargetHead, 0.04)))
              ) {
                const falloff =
                  rp === directRemote ? 1 : Math.max(0.28, 1 - d / (rk.splashRadius + 0.8));
                const dmg = Math.round(rk.damage * falloff);
                damageRemotePlayer(rp, dmg, false, center, 'rpg');
                damagedAny = true;
              }
            }
            if (damagedAny) match.shotsHit += 1;
          }
        }

        // Update Shockwave Rings
        for (let i = shockwaves.length - 1; i >= 0; i--) {
          const sw = shockwaves[i];
          sw.life += dt;
          const p = Math.min(1, sw.life / sw.maxLife);
          const eased = 1 - Math.pow(1 - p, 2);
          sw.mesh.scale.setScalar(0.35 + eased * sw.maxScale);
          (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.88 * (1 - p);
          if (sw.life >= sw.maxLife) {
            scene.remove(sw.mesh);
            (sw.mesh.material as THREE.Material).dispose();
            shockwaves.splice(i, 1);
          }
        }

        // Age Damage Popups
        for (let i = popups.length - 1; i >= 0; i--) {
          popups[i].age += dt;
          if (popups[i].age > 0.75) popups.splice(i, 1);
        }

        // Update 3D Knowledge Orb & Educational Fact Toast
        const orbBaseY = getOrbBaseY(mapRef.current);
        knowledgeOrbGroup.position.set(0, orbBaseY + Math.sin(elapsed * 2.8) * 0.2, 0);
        orbCoreMesh.rotation.y = elapsed * 1.8;
        orbRingMesh.rotation.x = elapsed * 1.4;
        orbRingMesh.rotation.z = elapsed * 1.1;
        orbRing2Mesh.rotation.y = -elapsed * 1.6;
        orbRing2Mesh.rotation.x = Math.cos(elapsed * 1.2) * 0.8;

        if (match.orbActive && player.alive) {
          const distToOrb = _v1
            .set(player.pos.x, player.pos.y - player.eyeHeight * 0.5, player.pos.z)
            .distanceTo(knowledgeOrbGroup.position);
          if (distToOrb < 2.5) {
            match.orbActive = false;
            match.orbRespawnTimer = 16;
            knowledgeOrbGroup.visible = false;
            if (mpRoomRef.current) {
              mpClientRef.current?.sendOrbPickup();
            } else {
              player.hp = Math.min(match.playerMaxHp, player.hp + 20);
              for (const bot of bots) {
                if (bot.active && bot.team === 'ally' && bot.alive) {
                  bot.hp = Math.min(bot.maxHp, bot.hp + 15);
                }
              }
              const utilSpec = resolveUtilitySpec(
                UTILITY_ITEMS[loadoutRef.current.utility],
                weaponBuildsRef.current[loadoutRef.current.utility]
              );
              const maxCharges = utilSpec.charges + (match.activePerk?.extraUtility ?? 0);
              if (match.utilityCharges < maxCharges) match.utilityCharges += 1;
              match.factToast = pickArenaFact(subjectRef.current, classLevelRef.current);
              match.factToastTimer = 5.0;
              shooterAudio.playHeal();
              spawnSparks(knowledgeOrbGroup.position, 0x38bdf8, 18);
              spawnShockwave(knowledgeOrbGroup.position, 0x38bdf8, 4.2);
            }
            pushHud();
          }
        } else if (!mpRoomRef.current) {
          match.orbRespawnTimer -= dt;
          if (match.orbRespawnTimer <= 0) {
            match.orbActive = true;
            knowledgeOrbGroup.visible = true;
          }
        }

        if (match.factToastTimer > 0) {
          match.factToastTimer -= dt;
          if (match.factToastTimer <= 0) {
            match.factToast = null;
          }
        }

        hudAccum += dt;
        if (hudAccum >= 0.045) {
          hudAccum = 0;
          pushHud();
        }
      } else {
        nonPlayHudAccum += rawDt;
        if (nonPlayHudAccum >= 0.4) {
          nonPlayHudAccum = 0;
          const nextFps = fpsRef.current;
          setHud((prev) => (prev.fps === nextFps ? prev : { ...prev, fps: nextFps }));
        }
      }

      // Animate Weapon Kill Finishers in both active play and round-end slow transitions
      for (let i = finisherEffects.length - 1; i >= 0; i--) {
        const fe = finisherEffects[i];
        fe.life += dt;
        const p = Math.min(1, fe.life / fe.maxLife);
        if (fe.kind === 'orbital_beam') {
          const shrink = p < 0.25 ? 0.6 + p * 2.4 : Math.max(0.05, 1.2 - (p - 0.25) * 1.45);
          fe.group.scale.set(shrink, 1, shrink);
        } else if (fe.kind === 'vortex_implosion') {
          fe.group.rotation.y += dt * 7.5;
          const s = p < 0.68 ? 1.5 - p * 1.65 : 0.35 + (p - 0.68) * 6.5;
          fe.group.scale.setScalar(Math.max(0.1, s));
        } else if (fe.kind === 'cyber_shatter') {
          fe.group.children.forEach((ch) => {
            const d = ch.userData.dir as THREE.Vector3 | undefined;
            if (d) ch.position.addScaledVector(d, dt * 6.5);
            ch.rotation.x += dt * 7;
            ch.rotation.y += dt * 9;
          });
        } else if (fe.kind === 'lightning_strike') {
          fe.group.rotation.y += dt * 14;
          const s = 1 - p * 0.6;
          fe.group.scale.set(s, 1, s);
        } else if (fe.kind === 'supernova_blast') {
          fe.group.rotation.y += dt * 3.8;
          const s = 0.55 + p * 2.9;
          fe.group.scale.setScalar(s);
        } else {
          const s = 0.7 + p * 2.2;
          fe.group.scale.setScalar(s);
        }
        fe.group.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.Material && 'opacity' in child.material) {
            (child.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.92 * (1 - p));
          }
        });
        if (fe.life >= fe.maxLife) {
          scene.remove(fe.group);
          disposeObjectTree(fe.group);
          finisherEffects.splice(i, 1);
        }
      }

      if (composer && !isSoftwareGl) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);

      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      clearDynamicObjects();
      clearRemotePlayers();
      disposeGroup(arenaGroup);
      skyGeo.dispose();
      skyMat.dispose();
      skyTex.dispose();
      orbGeo.dispose();
      orbMat.dispose();
      orbRingGeo.dispose();
      orbRingMat.dispose();
      orbRing2Geo.dispose();
      orbRing2Mat.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      disposeTextureSet(floorTexSet);
      disposeTextureSet(grassTexSet);
      disposeTextureSet(dirtTexSet);
      floorMarkingsTex.dispose();
      disposeTextureSet(bridgeTexSet);
      disposeTextureSet(gunmetalTexSet);
      disposeTextureSet(fabricTexSet);
      disposeTextureSet(concreteTexSet);
      disposeTextureSet(rockTexSet);
      disposeTextureSet(barkTexSet);
      disposeTextureSet(containerASet);
      disposeTextureSet(containerBSet);
      disposeTextureSet(neutralSet);
      shadowTex.dispose();
      particleTex.dispose();
      domeGlassTex.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      spireGeo.dispose();
      treeTrunkGeo.dispose();
      treeTrunkMat.dispose();
      treeCrownGeo.dispose();
      treeCrownMat.dispose();
      grassTuftGeo.dispose();
      grassTuftMat.dispose();
      pebbleGeo.dispose();
      pebbleMat.dispose();
      sparkGeo.dispose();
      debrisGeo.dispose();
      shellGeo.dispose();
      impactGeo.dispose();
      shockwaveGeo.dispose();
      impactMat.dispose();
      grenadeGeo.dispose();
      adsLaserGeo.dispose();
      adsLaserMat.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      envTarget.dispose();
      composerTarget?.dispose();
      composer?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const accuracyPct =
    hud.shotsFired > 0 ? Math.round((hud.shotsHit / hud.shotsFired) * 100) : 0;

  const activeWeaponName =
    hud.activeSlot === 0
      ? PRIMARY_WEAPONS[loadout.primary].name
      : hud.activeSlot === 1
      ? SECONDARY_WEAPONS[loadout.secondary].name
      : hud.activeSlot === 2
      ? MELEE_WEAPONS[loadout.melee].name
      : UTILITY_ITEMS[loadout.utility].name;

  const resolvedPrimary = resolveGunSpec(
    PRIMARY_WEAPONS[loadout.primary],
    weaponBuilds[loadout.primary]
  );
  const resolvedSecondary = resolveGunSpec(
    SECONDARY_WEAPONS[loadout.secondary],
    weaponBuilds[loadout.secondary]
  );

  const activeAmmoText =
    hud.activeSlot === 0
      ? `${hud.primaryAmmo} / ${resolvedPrimary.magSize}`
      : hud.activeSlot === 1
      ? `${hud.secondaryAmmo} / ${resolvedSecondary.magSize}`
      : hud.activeSlot === 2
      ? 'MELEE'
      : `${hud.utilityCharges} LEFT`;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Isolated WebGL Viewport Container */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {webglError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 p-6 text-center">
          <div className="max-w-md rounded-xl border border-cyan-500/40 bg-slate-900 p-6 shadow-2xl">
            <h2 className="font-display text-xl font-bold text-white">3D Viewport Unavailable</h2>
            <p className="mt-2 text-sm text-slate-300">{webglError}</p>
          </div>
        </div>
      )}

      {/* Damage Flash Vignette */}
      {(gameState === 'PLAYING' || gameState === 'ROUND_END') && hud.damageFlash > 0.02 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 border-[18px] border-rose-500/65"
          style={{ opacity: hud.damageFlash }}
        />
      )}

      {/* Top-Right Live FPS Counter (Always Visible) */}
      <div className="pointer-events-none fixed top-3 right-4 z-30 flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-slate-950/90 px-2.5 py-1 font-mono text-xs font-bold tabular-nums shadow-lg">
        <span
          className={`h-2 w-2 rounded-xs ${
            hud.fps >= 50 ? 'bg-emerald-400' : hud.fps >= 30 ? 'bg-amber-400' : 'bg-rose-500'
          }`}
        />
        <span
          className={
            hud.fps >= 50 ? 'text-emerald-300' : hud.fps >= 30 ? 'text-amber-300' : 'text-rose-400'
          }
        >
          {hud.fps} FPS
        </span>
      </div>

      {/* ACTIVE DUEL HUD (Zero backdrop-filter over WebGL!) */}
      {(gameState === 'PLAYING' || gameState === 'ROUND_END') && (
        <>
          {/* Top-Center Scoreboard OR Boot Camp Tutorial Tracker */}
          {hud.tutorial.active && !hud.tutorial.completed ? (
            (() => {
              const stepMeta = TUTORIAL_STEPS[hud.tutorial.step] ?? TUTORIAL_STEPS[0];
              const pct = ((hud.tutorial.step + 1) / hud.tutorial.totalSteps) * 100;
              return (
                <div className="fixed top-4 left-1/2 z-30 -translate-x-1/2 w-[min(580px,92vw)] rounded-xl border border-cyan-500/45 bg-slate-950/95 px-5 py-3.5 shadow-[0_0_24px_rgba(6,182,212,0.16)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-cyan-400">
                      <Target className="h-3.5 w-3.5" />
                      SIMULATION BOOT CAMP · {stepMeta.badge}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-300 tabular-nums">
                        STEP {hud.tutorial.step + 1} / {hud.tutorial.totalSteps}
                      </span>
                      <button
                        type="button"
                        onClick={skipTutorialStep}
                        title="Skip Step (Backspace)"
                        className="inline-flex items-center gap-1 rounded-md border border-cyan-500/35 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
                      >
                        <SkipForward className="h-3 w-3" />
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={exitToLobby}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-500/45 bg-rose-950/70 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-900/75 cursor-pointer"
                      >
                        <LogOut className="h-3 w-3" />
                        Exit
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-xs bg-slate-800">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-display text-base font-bold text-white">
                      {stepMeta.title}
                    </div>
                    {hud.tutorial.step === 0 && (
                      <span className="font-mono text-xs font-semibold text-cyan-400 tabular-nums">
                        Distance: {Math.min(4.0, hud.tutorial.moveDist).toFixed(1)}m / 4.0m
                      </span>
                    )}
                    {hud.tutorial.step === 2 && (
                      <span className="font-mono text-xs font-semibold text-cyan-400 tabular-nums">
                        ADS Hits: {Math.min(2, hud.tutorial.hits)} / 2
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                    {stepMeta.instruction}
                  </p>
                  <div className="mt-1.5 font-mono text-[10px] text-slate-500">
                    Press Backspace to skip step · Click arena to lock mouse aim
                  </div>
                </div>
              );
            })()
          ) : !hud.tutorial.active ? (
            <div className="pointer-events-none fixed top-4 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-4 rounded-xl border border-cyan-500/40 bg-slate-950/92 px-5 py-2.5 shadow-[0_0_24px_rgba(6,182,212,0.14)]">
                {/* Blue Team Score + Pips */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-display text-xs font-bold tracking-wider text-cyan-400">
                      {hud.teamSize === 1 ? 'YOU' : `ALPHA (${hud.alliesAlive})`}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: ROUNDS_TO_WIN }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-3.5 rounded-xs ${
                            i < hud.playerRounds
                              ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.65)]'
                              : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="font-mono text-2xl font-bold text-white tabular-nums">
                    {hud.playerRounds}
                  </span>
                </div>

                <div className="border-x border-cyan-500/25 px-3 text-center">
                  <div className="font-mono text-[10px] tracking-wider text-cyan-300/80">
                    {hud.teamSize}v{hud.teamSize} · {ARENA_MAPS[selectedMap].name.toUpperCase()} · R{hud.roundNumber}
                  </div>
                  <div className="font-mono text-base font-bold text-white tabular-nums">
                    0:{String(hud.roundTimer).padStart(2, '0')}
                  </div>
                </div>

                {/* Crimson Team Score + Pips */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold text-white tabular-nums">
                    {hud.rivalRounds}
                  </span>
                  <div className="text-left">
                    <div className="font-display text-xs font-bold tracking-wider text-rose-400">
                      {hud.teamSize === 1 ? 'RIVAL' : `OMEGA (${hud.enemiesAlive})`}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: ROUNDS_TO_WIN }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-3.5 rounded-xs ${
                            i < hud.rivalRounds
                              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.65)]'
                              : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Squad Alive Indicators (2v2 - 5v5) */}
              {hud.teamSize > 1 && (
                <div className="flex items-center gap-3 rounded-lg border border-cyan-500/25 bg-slate-950/90 px-3 py-1">
                  <div className="flex items-center gap-1">
                    {hud.allyRoster.map((m) => (
                      <div
                        key={m.id}
                        title={`${m.name}: ${m.alive ? `${m.hp} HP` : 'DOWN'}`}
                        className={`h-2 w-5 rounded-xs transition-colors ${
                          m.alive
                            ? m.isPlayer
                              ? 'bg-cyan-400 ring-1 ring-white/70'
                              : 'bg-cyan-500'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 tabular-nums">
                    {hud.alliesAlive}v{hud.enemiesAlive}
                  </span>
                  <div className="flex items-center gap-1">
                    {hud.enemyRoster.map((m) => (
                      <div
                        key={m.id}
                        title={`${m.name}: ${m.alive ? `${m.hp} HP` : 'DOWN'}`}
                        className={`h-2 w-5 rounded-xs transition-colors ${
                          m.alive ? 'bg-rose-500' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Top-Right Compact Team Kill Feed (below FPS counter) */}
          {hud.killFeed.length > 0 && (
            <div className="pointer-events-none fixed top-12 right-4 z-20 flex flex-col items-end gap-1">
              {hud.killFeed.map((kf) => (
                <div
                  key={kf.id}
                  className="flex items-center gap-1.5 rounded border border-cyan-500/30 bg-slate-950/90 px-2.5 py-1 font-mono text-[11px]"
                >
                  <span className={kf.killerTeam === 'ally' ? 'text-cyan-400 font-bold' : 'text-rose-400 font-bold'}>
                    {kf.killerName}
                  </span>
                  <span className="text-slate-400">{kf.headshot ? '[CRIT]' : '->'}</span>
                  <span className={kf.victimTeam === 'ally' ? 'text-cyan-200' : 'text-rose-300'}>
                    {kf.victimName}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Overhead Floating HP & Team Bars for Allies and Enemies */}
          {hud.overheadMarkers.map((m) => {
            const isAlly = m.team === 'ally';
            return (
              <div
                key={m.id}
                className="pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${m.x * 100}%`,
                  top: `${m.y * 100}%`,
                }}
              >
                <div
                  className={`rounded-md bg-slate-950/90 px-2 py-1 text-center border ${
                    isAlly ? 'border-cyan-400/55' : 'border-rose-500/55'
                  }`}
                >
                  <div
                    className={`font-mono text-[10px] font-bold tabular-nums ${
                      isAlly ? 'text-cyan-300' : 'text-rose-300'
                    }`}
                  >
                    {isAlly ? 'ALLY' : 'UNIT'} · {m.name} · {m.hp}
                  </div>
                  <div className="mt-0.5 h-1.5 w-20 overflow-hidden rounded-xs bg-slate-800">
                    <div
                      className={`h-full transition-all duration-75 ${
                        isAlly ? 'bg-cyan-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${(m.hp / m.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Floating Damage Numbers */}
          {hud.damagePopups.map((p) => (
            <div
              key={p.id}
              className={`pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-1/2 font-mono font-bold tabular-nums ${
                p.crit ? 'text-lg text-amber-300' : 'text-sm text-cyan-100'
              }`}
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                textShadow: '0 2px 6px rgba(0,0,0,0.9)',
              }}
            >
              -{p.amount}
              {p.crit ? '!' : ''}
            </div>
          ))}

          {/* Round Transition Banner & Post-Round Exit Option */}
          {gameState === 'ROUND_END' ? (
            <div className="fixed top-24 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-cyan-500/45 bg-slate-950/95 px-6 py-4 text-center shadow-[0_0_28px_rgba(6,182,212,0.2)] min-w-[300px]">
              <div className="font-display text-base font-bold tracking-wider text-white">
                {hud.roundBanner ?? `ROUND ${hud.roundNumber} COMPLETE`}
              </div>
              <div className="mt-1 font-mono text-xs text-cyan-300/80">
                ALPHA {hud.playerRounds} — {hud.rivalRounds} OMEGA
              </div>
              <div className="mt-3 flex items-center justify-center gap-2.5">
                {mpRoom ? (
                  <span className="font-mono text-xs text-slate-300">
                    Next round knowledge gate starting...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openRoundQuiz(hud.roundNumber + 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 cursor-pointer whitespace-nowrap"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Next Round
                  </button>
                )}
                <button
                  type="button"
                  onClick={exitToLobby}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/65 px-3.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-900/75 cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Exit Match
                </button>
              </div>
            </div>
          ) : (
            hud.roundBanner && (
              <div className="pointer-events-none fixed top-24 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-cyan-500/45 bg-slate-950/95 px-6 py-2.5 text-center shadow-[0_0_20px_rgba(6,182,212,0.18)]">
                <div className="font-display text-base font-bold tracking-wider text-white">
                  {hud.roundBanner}
                </div>
              </div>
            )
          )}

          {/* Active Knowledge Overcharge Perk (Top-Left) */}
          {hud.activePerkLabel && (
            <div className="pointer-events-none fixed top-4 left-4 z-20 flex items-center gap-2 rounded-lg border border-cyan-400/45 bg-slate-950/92 px-3 py-1.5 font-mono text-xs font-semibold text-cyan-300 shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              {hud.activePerkLabel}
            </div>
          )}

          {/* Collected 3D Knowledge Orb Fact Toast */}
          {hud.factToast && (
            <div className="pointer-events-none fixed top-36 left-1/2 z-20 max-w-md -translate-x-1/2 rounded-xl border border-cyan-400/55 bg-slate-950/95 px-4 py-2.5 text-center shadow-[0_0_24px_rgba(34,211,238,0.2)]">
              <div className="flex items-center justify-center gap-1.5 font-mono text-[11px] font-bold text-cyan-400">
                <BookOpen className="h-3.5 w-3.5" />
                DATA CORE (+20 HP) · {hud.factToast.subjectLabel.toUpperCase()}
              </div>
              <div className="mt-1 text-xs text-slate-200 leading-snug">{hud.factToast.fact}</div>
            </div>
          )}

          {/* Cyber-Optic Rangefinder Scope Overlay when ADS with Scope Optic */}
          {hud.ads &&
            ((hud.activeSlot === 0 && resolvedPrimary.optic === 'scope') ||
              (hud.activeSlot === 1 && resolvedSecondary.optic === 'scope')) && (
            <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center">
              <div className="h-[74vh] w-[74vh] rounded-full border-2 border-cyan-400/75 ring-4 ring-slate-950 shadow-[0_0_0_9999px_rgba(2,6,23,0.84)] relative overflow-hidden">
                <div className="absolute inset-4 rounded-full border border-dashed border-cyan-400/35" />
                <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-400/65" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-400/65" />
                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-rose-400 bg-rose-500/80" />
                <div className="absolute top-6 left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold tracking-widest text-cyan-300/80">
                  OPTIC-LINK · ZOOM ACTIVE
                </div>
                {[-3, -2, -1, 1, 2, 3].map((step) => (
                  <div
                    key={`h-${step}`}
                    className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-cyan-300/80"
                    style={{ left: `${50 + step * 7}%` }}
                  />
                ))}
                {[-3, -2, -1, 1, 2, 3].map((step) => (
                  <div
                    key={`v-${step}`}
                    className="absolute left-1/2 h-px w-2.5 -translate-x-1/2 bg-cyan-300/80"
                    style={{ top: `${50 + step * 7}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Center Crosshair + Hitmarker (hidden while spectating) */}
          {hud.playerAlive && (
            <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
              <CrosshairReticle
                config={crosshairConfig}
                ads={hud.ads}
                sliding={hud.sliding}
                reloading={hud.reloading}
                hitMarker={hud.hitMarker}
              />
            </div>
          )}

          {/* Bottom-Left Player HP & Exo-Thruster Status */}
          <div className="pointer-events-none fixed bottom-5 left-5 z-20 rounded-xl border border-cyan-500/40 bg-slate-950/92 px-4 py-3 min-w-[225px] shadow-[0_0_20px_rgba(6,182,212,0.14)]">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-cyan-50 tabular-nums">
                {hud.playerHp}
              </span>
              <span className="font-mono text-xs text-cyan-400/80">/ {hud.maxHp} SHIELD HP</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-xs bg-slate-800">
              <div
                className={`h-full transition-all duration-75 ${
                  hud.playerHp > 50 ? 'bg-cyan-400' : 'bg-rose-500'
                }`}
                style={{ width: `${(hud.playerHp / hud.maxHp) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
              <span className={hud.sliding ? 'text-cyan-300 font-semibold' : ''}>
                {hud.sliding ? 'THRUSTER SLIDE' : hud.dashReady ? 'SLIDE READY (C)' : 'RECHARGING'}
              </span>
              <span>{hud.pointerLocked ? 'AIM LOCKED' : 'CLICK ARENA'}</span>
            </div>
          </div>

          {/* Bottom-Right Active Weapon & Energy Cell Readout */}
          <div className="pointer-events-none fixed bottom-5 right-5 z-20 rounded-xl border border-cyan-500/40 bg-slate-950/92 px-4 py-3 text-right min-w-[205px] shadow-[0_0_20px_rgba(6,182,212,0.14)]">
            <div className="flex items-center justify-end gap-2">
              {hud.ads && (
                <span className="font-mono text-[10px] font-bold text-amber-300">OPTIC ZOOM (E)</span>
              )}
              <span className="font-display text-xs font-bold tracking-wide text-cyan-400">{activeWeaponName}</span>
            </div>
            <div className="mt-0.5 font-mono text-2xl font-bold text-white tabular-nums">
              {hud.reloading ? 'RELOAD' : activeAmmoText}
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-400">
              Hold E / Right-Click Aim · R Reload
            </div>
          </div>
        </>
      )}

      {/* COLLAPSIBLE UNIFIED 4-SLOT HOTBAR DOCK */}
      {gameState === 'PLAYING' && (
        <div
          className={`fixed left-1/2 z-30 -translate-x-1/2 transition-transform duration-200 ${
            dockCollapsed ? 'translate-y-[calc(100%-30px)]' : 'translate-y-0'
          }`}
          style={{ bottom: '16px', maxWidth: 'min(760px, 92vw)' }}
        >
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setDockCollapsed((c) => !c)}
              className="inline-flex items-center gap-1 rounded-t-lg border border-b-0 border-cyan-500/35 bg-slate-950/95 px-3 py-0.5 text-[11px] font-medium text-cyan-300 hover:text-white cursor-pointer whitespace-nowrap"
            >
              {dockCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {dockCollapsed ? 'Loadout (H)' : 'Hide (H)'}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-slate-950/95 px-3 py-2 shadow-[0_0_24px_rgba(6,182,212,0.16)]">
            {(
              [
                { slot: 0 as SlotIndex, label: PRIMARY_WEAPONS[loadout.primary].name },
                { slot: 1 as SlotIndex, label: SECONDARY_WEAPONS[loadout.secondary].name },
                { slot: 2 as SlotIndex, label: MELEE_WEAPONS[loadout.melee].name },
                { slot: 3 as SlotIndex, label: UTILITY_ITEMS[loadout.utility].name },
              ] as const
            ).map((item) => {
              const active = hud.activeSlot === item.slot;
              return (
                <button
                  key={item.slot}
                  type="button"
                  onClick={() => apiRef.current?.selectSlot(item.slot)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-cyan-400 bg-cyan-600 text-white shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/40 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-mono opacity-75 mr-1.5">{item.slot + 1}</span>
                  {item.label}
                </button>
              );
            })}

            <div className="mx-1 h-5 w-px bg-cyan-500/25" />

            <button
              type="button"
              onClick={toggleMute}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              {soundMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              onClick={pauseDuel}
              title="Pause Duel (P)"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={exitToLobby}
              title="Exit to Lobby"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/45 bg-rose-950/65 px-2.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-900/75 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              Exit
            </button>
          </div>
        </div>
      )}

      {/* RIVALS EDUCATIONAL LOADOUT LOBBY / TITLE MENU */}
      {gameState === 'TITLE_MENU' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-xl border border-cyan-500/40 bg-slate-950/95 p-5 sm:p-7 shadow-[0_0_48px_rgba(6,182,212,0.18)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-400">
                  <GraduationCap className="h-4 w-4" />
                  CAMBRIDGE NEXUS · CLASS 6–10 · 1v1–5v5 CYBER ARENA · FIRST TO 5
                </div>
                <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-wide text-white">
                  SHELL SHOCKERS
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-right font-mono text-xs">
                <button
                  type="button"
                  onClick={() => openWorkshopFor(loadout.primary)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/60 px-3 py-2 font-sans text-xs font-semibold text-cyan-300 hover:bg-cyan-900/70 cursor-pointer whitespace-nowrap"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Weapon Armory
                </button>
                <button
                  type="button"
                  onClick={() => setCrosshairModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-950/60 px-3 py-2 font-sans text-xs font-semibold text-amber-300 hover:bg-amber-900/70 cursor-pointer whitespace-nowrap"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  Optic Reticle
                </button>
                <button
                  type="button"
                  onClick={() => setQaModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/60 px-3 py-2 font-sans text-xs font-semibold text-emerald-300 hover:bg-emerald-900/70 cursor-pointer whitespace-nowrap"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Cambridge Q&A (Class {classLevel})
                </button>
              </div>
            </div>

            {/* Player Rank Tier, Level XP Bar & Lifetime Career Stats */}
            {(() => {
              const xpInfo = getXpProgress(career.xp);
              return (
                <div className="mt-3 rounded-lg border border-cyan-500/25 bg-slate-900/85 px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider"
                        style={{
                          borderColor: `${xpInfo.tier.colorHex}66`,
                          backgroundColor: `${xpInfo.tier.colorHex}18`,
                          color: xpInfo.tier.colorHex,
                        }}
                      >
                        <Award className="h-3.5 w-3.5" />
                        LVL {xpInfo.level} · {xpInfo.tier.title.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-slate-300 tabular-nums">
                        {xpInfo.currentLevelXp} / {xpInfo.nextLevelXp} XP
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-400 tabular-nums">
                      <span>
                        WINS <strong className="text-cyan-400">{career.wins}</strong>
                      </span>
                      <span>
                        STREAK <strong className="text-amber-400">{career.winStreak}</strong>
                      </span>
                      <span>
                        ELIMS <strong className="text-emerald-400">{career.totalKills}</strong>
                      </span>
                      <span>
                        CRITS <strong className="text-rose-400">{career.totalHeadshots}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-xs bg-slate-800">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${xpInfo.progressPct}%`,
                        backgroundColor: xpInfo.tier.colorHex,
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Real-Time WebSocket Multiplayer Arena Network */}
            <div className="mt-3 rounded-lg border border-cyan-500/30 bg-slate-900/90 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-cyan-500/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-cyan-400" />
                  <span className="font-mono text-xs font-bold tracking-wider text-white">
                    MULTIPLAYER ARENA NETWORK
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-bold ${
                      mpStatus === 'connected'
                        ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300'
                        : 'border-amber-500/50 bg-amber-950/60 text-amber-300'
                    }`}
                  >
                    {mpStatus === 'connected' ? (
                      <Wifi className="h-3 w-3" />
                    ) : (
                      <WifiOff className="h-3 w-3" />
                    )}
                    {mpStatus === 'connected' ? 'ONLINE' : mpStatus.toUpperCase()}
                  </span>
                </div>

                <label className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400">
                    CALLSIGN
                  </span>
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => handleCallsignChange(e.target.value)}
                    maxLength={16}
                    placeholder="STRIKER"
                    className="w-32 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold text-cyan-200 focus:border-cyan-400 focus:outline-none"
                  />
                </label>
              </div>

              {mpError && (
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-md border border-rose-500/50 bg-rose-950/55 px-3 py-1.5 text-xs text-rose-200">
                  <span>{mpError}</span>
                  <button
                    type="button"
                    onClick={() => setMpError(null)}
                    className="font-mono text-[10px] underline hover:text-white cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {!mpRoom ? (
                <div className="mt-3 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={mpStatus !== 'connected'}
                      onClick={() => createMpRoom(false)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-45 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Room
                    </button>
                    <button
                      type="button"
                      disabled={mpStatus !== 'connected'}
                      onClick={quickJoinMpRoom}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/70 disabled:opacity-45 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Quick Match
                    </button>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="ROOM CODE"
                        maxLength={6}
                        className="w-28 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs uppercase text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={mpStatus !== 'connected' || !joinCodeInput.trim()}
                        onClick={() => joinMpRoom(joinCodeInput)}
                        className="rounded-lg border border-cyan-500/50 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-slate-700 disabled:opacity-45 cursor-pointer"
                      >
                        Join
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => mpClientRef.current?.refreshRooms()}
                      title="Refresh Open Rooms"
                      className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-white cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </button>
                  </div>

                  {mpRooms.length > 0 ? (
                    <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
                      {mpRooms.map((r) => (
                        <div
                          key={r.code}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/90 px-3 py-1.5 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2 font-mono">
                            <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[11px] font-bold text-cyan-300">
                              {r.code}
                            </span>
                            <span className="font-sans font-semibold text-white">{r.hostName}</span>
                            <span className="text-slate-400">
                              · {ARENA_MAPS[r.mapId].name} · {r.teamSize}v{r.teamSize}
                            </span>
                            <span className="text-emerald-400 tabular-nums">
                              {r.playerCount}/{r.maxHumans}
                            </span>
                            <span className="text-[10px] text-slate-400">{r.phase}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => joinMpRoom(r.code)}
                            className="rounded border border-cyan-500/50 bg-cyan-950/70 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-900 cursor-pointer"
                          >
                            Join
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-slate-800/80 bg-slate-950/60 px-3 py-2 font-mono text-[11px] text-slate-400">
                      No open rooms active — create a room or press Quick Match to deploy with players &amp; AI squads.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-cyan-400/50 bg-cyan-950/80 px-2.5 py-1 font-mono text-xs font-bold tracking-widest text-cyan-200">
                        ROOM {mpRoom.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyInviteLink(mpRoom.code)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-cyan-500/40 cursor-pointer"
                      >
                        {copiedInvite ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedInvite ? 'Copied Link' : 'Invite Link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => mpClientRef.current?.switchTeam()}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-cyan-500/40 cursor-pointer"
                      >
                        <Shield className="h-3.5 w-3.5 text-cyan-400" />
                        Switch Team
                      </button>
                      <button
                        type="button"
                        disabled={mpRoom.hostId !== mpPlayerId}
                        onClick={() => handleFillBotsToggle(!mpRoom.fillBots)}
                        className={`rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold cursor-pointer disabled:opacity-60 ${
                          mpRoom.fillBots
                            ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300'
                            : 'border-slate-700 bg-slate-950 text-slate-400'
                        }`}
                      >
                        Bot Backfill: {mpRoom.fillBots ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => mpClientRef.current?.leaveRoom()}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-950/60 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-900/75 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Leave Room
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {(['alpha', 'omega'] as const).map((teamKey) => {
                      const isAlpha = teamKey === 'alpha';
                      const members = mpRoom.players.filter((p) => p.team === teamKey);
                      const botCount = mpRoom.fillBots
                        ? Math.max(0, mpRoom.teamSize - members.length)
                        : 0;
                      return (
                        <div
                          key={teamKey}
                          className={`rounded-md border p-2.5 ${
                            isAlpha
                              ? 'border-cyan-500/35 bg-cyan-950/20'
                              : 'border-rose-500/35 bg-rose-950/20'
                          }`}
                        >
                          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] font-bold">
                            <span className={isAlpha ? 'text-cyan-300' : 'text-rose-300'}>
                              {isAlpha ? 'ALPHA SQUAD' : 'OMEGA SQUAD'}
                            </span>
                            <span className="text-slate-400">
                              {members.length}/{mpRoom.teamSize}
                              {botCount > 0 ? ` (+${botCount} AI)` : ''}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {members.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between gap-2 rounded bg-slate-950/85 px-2 py-1 text-xs"
                              >
                                <div className="flex min-w-0 items-center gap-1.5">
                                  {p.id === mpRoom.hostId && (
                                    <Crown className="h-3 w-3 shrink-0 text-amber-400" />
                                  )}
                                  <span className="truncate font-mono font-semibold text-white">
                                    {p.name}
                                    {p.id === mpPlayerId ? ' (YOU)' : ''}
                                  </span>
                                </div>
                                <span className="shrink-0 font-mono text-[10px] text-slate-400">
                                  {PRIMARY_WEAPONS[p.primary].name}
                                </span>
                              </div>
                            ))}
                            {members.length === 0 && (
                              <div className="font-mono text-[10px] text-slate-500">
                                {botCount > 0 ? `${botCount} AI Bot(s) assigned` : 'Open slot'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Class 6-10 Selector */}
            <div className="mt-4">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                  SELECT CLASS (6–10)
                </span>
                <span className="font-mono text-[11px] font-semibold text-cyan-400">
                  {getCambridgeStageLabel(classLevel)}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {CLASS_LEVELS.map((cls) => {
                  const active = classLevel === cls;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setClassLevel(cls)}
                      className={`rounded-lg border py-1.5 text-center font-mono text-xs font-bold transition-colors cursor-pointer ${
                        active
                          ? 'border-cyan-400 bg-cyan-600 text-white shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50'
                      }`}
                    >
                      C{cls}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cambridge Subject Selector */}
            <div className="mt-4">
              <div className="mb-1.5 font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                CAMBRIDGE MODULE (PRE-ROUND OVERCHARGE GATE)
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-6">
                {(Object.keys(SUBJECTS) as SubjectId[]).map((subId) => {
                  const active = subject === subId;
                  return (
                    <button
                      key={subId}
                      type="button"
                      onClick={() => setSubject(subId)}
                      className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'border-emerald-400 bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-500/50'
                      }`}
                    >
                      {SUBJECTS[subId].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Arena Map Selector (Live 3D Preview Behind Lobby) */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                <span>ARENA SECTOR</span>
                {mpRoom && mpRoom.hostId !== mpPlayerId && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-300">
                    <Lock className="h-3 w-3" />
                    HOST CONTROLS ARENA
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {(Object.keys(ARENA_MAPS) as MapId[]).map((mapId) => {
                  const map = ARENA_MAPS[mapId];
                  const active = selectedMap === mapId;
                  const lockedByHost = Boolean(mpRoom && mpRoom.hostId !== mpPlayerId);
                  return (
                    <button
                      key={mapId}
                      type="button"
                      disabled={lockedByHost}
                      onClick={() => handleMapSelect(mapId)}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer disabled:cursor-default disabled:opacity-75 ${
                        active
                          ? 'border-cyan-400 bg-cyan-600 text-white shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                          : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-500/50'
                      }`}
                    >
                      <div className="font-display text-xs font-bold tracking-wide">{map.name}</div>
                      <div
                        className={`mt-0.5 text-[10px] leading-tight ${
                          active ? 'text-cyan-100' : 'text-slate-400'
                        }`}
                      >
                        {map.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4-Slot Loadout Customizer */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* Primary */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                    1 · PRIMARY ENERGY WEAPON
                  </span>
                  <button
                    type="button"
                    onClick={() => openWorkshopFor(loadout.primary)}
                    className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    Tune
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(Object.keys(PRIMARY_WEAPONS) as PrimaryId[]).map((id) => {
                    const b = weaponBuilds[id];
                    const active = loadout.primary === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLoadout((l) => ({ ...l, primary: id }))}
                        className={`rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-cyan-400 bg-cyan-600 text-white'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-xs border border-white/40"
                            style={{ backgroundColor: b.colorHex }}
                          />
                          <span className="truncate">{PRIMARY_WEAPONS[id].name}</span>
                        </div>
                        <div
                          className={`mt-0.5 truncate text-[10px] ${
                            active ? 'text-cyan-100' : 'text-slate-400'
                          }`}
                        >
                          {b.templateName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                    2 · SECONDARY SIDEARM
                  </span>
                  <button
                    type="button"
                    onClick={() => openWorkshopFor(loadout.secondary)}
                    className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    Tune
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(SECONDARY_WEAPONS) as SecondaryId[]).map((id) => {
                    const b = weaponBuilds[id];
                    const active = loadout.secondary === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLoadout((l) => ({ ...l, secondary: id }))}
                        className={`rounded-lg border px-2 py-2 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-cyan-400 bg-cyan-600 text-white'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-xs border border-white/40"
                            style={{ backgroundColor: b.colorHex }}
                          />
                          <span className="truncate">{SECONDARY_WEAPONS[id].name}</span>
                        </div>
                        <div
                          className={`mt-0.5 truncate text-[10px] ${
                            active ? 'text-cyan-100' : 'text-slate-400'
                          }`}
                        >
                          {b.templateName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Melee */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                    3 · PLASMA MELEE (LUNGE)
                  </span>
                  <button
                    type="button"
                    onClick={() => openWorkshopFor(loadout.melee)}
                    className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    Tune
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(MELEE_WEAPONS) as MeleeId[]).map((id) => {
                    const b = weaponBuilds[id];
                    const active = loadout.melee === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLoadout((l) => ({ ...l, melee: id }))}
                        className={`rounded-lg border px-2 py-2 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-cyan-400 bg-cyan-600 text-white'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-xs border border-white/40"
                            style={{ backgroundColor: b.colorHex }}
                          />
                          <span className="truncate">{MELEE_WEAPONS[id].name}</span>
                        </div>
                        <div
                          className={`mt-0.5 truncate text-[10px] ${
                            active ? 'text-cyan-100' : 'text-slate-400'
                          }`}
                        >
                          {b.templateName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Utility */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                    4 · TACTICAL TECH CORE
                  </span>
                  <button
                    type="button"
                    onClick={() => openWorkshopFor(loadout.utility)}
                    className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    Tune
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(UTILITY_ITEMS) as UtilityId[]).map((id) => {
                    const b = weaponBuilds[id];
                    const active = loadout.utility === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLoadout((l) => ({ ...l, utility: id }))}
                        className={`rounded-lg border px-2 py-2 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-cyan-400 bg-cyan-600 text-white'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-xs border border-white/40"
                            style={{ backgroundColor: b.colorHex }}
                          />
                          <span className="truncate">{UTILITY_ITEMS[id].name}</span>
                        </div>
                        <div
                          className={`mt-0.5 truncate text-[10px] ${
                            active ? 'text-cyan-100' : 'text-slate-400'
                          }`}
                        >
                          {b.templateName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Squad Mode (1v1 - 5v5), Rival AI Skill Tier & Start */}
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-cyan-500/20 pt-4">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                    <Users className="h-3.5 w-3.5 text-cyan-400" />
                    SQUAD SIZE (1v1 – 5v5)
                  </div>
                  <div className="flex items-center gap-1.5">
                    {TEAM_SIZES.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        disabled={Boolean(mpRoom && mpRoom.hostId !== mpPlayerId)}
                        onClick={() => handleTeamSizeSelect(sz)}
                        className={`rounded-lg border px-2.5 py-2 font-mono text-xs font-bold transition-colors cursor-pointer whitespace-nowrap disabled:cursor-default disabled:opacity-75 ${
                          teamSize === sz
                            ? 'border-cyan-400 bg-cyan-600 text-white'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50'
                        }`}
                      >
                        {sz}v{sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                    RIVAL AI RANK
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['rookie', 'ranked', 'nemesis'] as DifficultyId[]).map((id) => {
                      const active = difficulty === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={Boolean(mpRoom && mpRoom.hostId !== mpPlayerId)}
                          onClick={() => handleDifficultySelect(id)}
                          className={`rounded-lg border px-3 py-1.5 text-left transition-colors cursor-pointer disabled:cursor-default disabled:opacity-75 ${
                            active
                              ? 'border-rose-400 bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-rose-500/40'
                          }`}
                        >
                          <div className="text-xs font-bold leading-tight">{DIFFICULTIES[id].label}</div>
                          <div
                            className={`font-mono text-[10px] leading-tight ${
                              active ? 'text-rose-100' : 'text-slate-400'
                            }`}
                          >
                            {DIFFICULTIES[id].subtitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={toggleGraphicsMode}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/45 bg-cyan-950/60 px-3 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/70 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="h-4 w-4" />
                  Graphics: {graphicsMode === 'ultra' ? 'Ultra' : 'Standard'}
                </button>

                <button
                  type="button"
                  onClick={toggleMusic}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium cursor-pointer whitespace-nowrap ${
                    musicEnabled
                      ? 'border-fuchsia-500/50 bg-fuchsia-950/60 text-fuchsia-200 hover:bg-fuchsia-900/70'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-cyan-500/40 hover:bg-slate-800'
                  }`}
                >
                  <Music className="h-4 w-4" />
                  Intro Music: {musicEnabled ? 'On' : 'Off'}
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                >
                  {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {soundMuted ? 'Sound Off' : 'Sound On'}
                </button>

                <button
                  type="button"
                  onClick={startTutorial}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-950/70 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-900/80 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Target className="h-4 w-4" />
                  Boot Camp Tutorial
                </button>

                {mpRoom && mpRoom.hostId !== mpPlayerId ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-slate-800 px-5 py-2.5 font-display text-xs font-bold tracking-wide text-cyan-300 opacity-85 whitespace-nowrap"
                  >
                    WAITING FOR HOST TO START...
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startDuel}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 font-display text-sm font-bold tracking-wide text-white hover:bg-cyan-500 transition-colors cursor-pointer whitespace-nowrap shadow-[0_0_20px_rgba(6,182,212,0.35)]"
                  >
                    <Play className="h-4 w-4" />
                    {mpRoom
                      ? `START MULTIPLAYER (${mpRoom.teamSize}v${mpRoom.teamSize})`
                      : teamSize === 1
                        ? 'LAUNCH 1v1 DUEL'
                        : `LAUNCH ${teamSize}v${teamSize}`}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 font-mono text-[11px] text-slate-400">
              Controls: WASD Move · C Slide · C+Space Slide-Jump · Hold E / Right-Click Aim · 1–4 Loadout · R Reload · Center Data Core (+20 HP)
            </div>
          </div>
        </div>
      )}

      {/* WEAPON TEMPLATES & FULL CUSTOMIZER MODAL (ALL 13 WEAPONS) */}
      {gameState === 'TITLE_MENU' && workshopOpen && (() => {
        const activeCat = getWeaponCategory(workshopWeaponId);
        const activeBuild = weaponBuilds[workshopWeaponId];
        const builtinTemplates = getTemplatesForWeapon(workshopWeaponId);
        const savedForWeapon = userTemplates.filter((t) => t.weaponId === workshopWeaponId);
        const activeMeta = ALL_WEAPON_LIST.find((w) => w.id === workshopWeaponId)!;
        const isEquipped =
          loadout.primary === workshopWeaponId ||
          loadout.secondary === workshopWeaponId ||
          loadout.melee === workshopWeaponId ||
          loadout.utility === workshopWeaponId;

        const resolvedGun =
          activeCat === 'primary'
            ? resolveGunSpec(PRIMARY_WEAPONS[workshopWeaponId as PrimaryId], activeBuild)
            : activeCat === 'secondary'
              ? resolveGunSpec(SECONDARY_WEAPONS[workshopWeaponId as SecondaryId], activeBuild)
              : null;
        const resolvedMelee =
          activeCat === 'melee'
            ? resolveMeleeSpec(MELEE_WEAPONS[workshopWeaponId as MeleeId], activeBuild)
            : null;
        const resolvedUtility =
          activeCat === 'utility'
            ? resolveUtilitySpec(UTILITY_ITEMS[workshopWeaponId as UtilityId], activeBuild)
            : null;

        return (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-xl border border-cyan-500/40 bg-slate-950 p-4 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.18)]">
              {/* Top Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-400">
                    <Wrench className="h-4 w-4" />
                    CYBER ARMORY &amp; TEMPLATES · {activeCat.toUpperCase()}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-xs border border-white/50"
                      style={{ backgroundColor: activeBuild.colorHex }}
                    />
                    <h2 className="font-display text-2xl font-bold text-white">
                      {activeMeta.name}
                    </h2>
                    <span className="rounded border border-cyan-500/35 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                      {activeBuild.templateName}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!isEquipped ? (
                    <button
                      type="button"
                      onClick={() => equipWeaponInLoadout(workshopWeaponId)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                    >
                      Equip in Loadout
                    </button>
                  ) : (
                    <span className="rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-3 py-2 text-xs font-semibold text-emerald-300">
                      Equipped
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      updateWeaponBuild(
                        workshopWeaponId,
                        getDefaultWeaponBuild(workshopWeaponId),
                        false
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkshopOpen(false)}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* All 13 Weapons Switcher */}
              <div className="mt-3 flex flex-wrap gap-1.5 border-b border-cyan-500/20 pb-3">
                {ALL_WEAPON_LIST.map((w) => {
                  const selected = w.id === workshopWeaponId;
                  const equipped =
                    loadout.primary === w.id ||
                    loadout.secondary === w.id ||
                    loadout.melee === w.id ||
                    loadout.utility === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWorkshopWeaponId(w.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        selected
                          ? 'border-cyan-400 bg-cyan-600 text-white'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-xs border border-white/40"
                        style={{ backgroundColor: weaponBuilds[w.id].colorHex }}
                      />
                      <span>{w.name}</span>
                      {equipped && (
                        <span
                          className={`text-[9px] font-mono uppercase ${
                            selected ? 'text-cyan-100' : 'text-emerald-400'
                          }`}
                        >
                          · EQ
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Main 2-Column Customizer Body */}
              <div className="mt-3 grid flex-1 gap-4 overflow-y-auto pr-1 lg:grid-cols-[310px_1fr]">
                {/* Left Column: Templates & Saved Presets */}
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                      BUILT-IN TEMPLATES
                    </div>
                    <div className="space-y-1.5">
                      {builtinTemplates.map((tpl) => {
                        const isTplActive = activeBuild.templateId === tpl.id;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() =>
                              updateWeaponBuild(
                                workshopWeaponId,
                                {
                                  ...applyTemplateToBuild(workshopWeaponId, tpl),
                                  skin: activeBuild.skin ?? 'standard',
                                },
                                false
                              )
                            }
                            className={`w-full rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                              isTplActive
                                ? 'border-cyan-400 bg-cyan-950/70 text-white'
                                : 'border-slate-700 bg-slate-900/90 text-slate-200 hover:border-cyan-500/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold">{tpl.name}</span>
                              {tpl.patch.colorHex && (
                                <span
                                  className="h-2.5 w-2.5 rounded-xs border border-white/40"
                                  style={{ backgroundColor: tpl.patch.colorHex }}
                                />
                              )}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              {tpl.subtitle}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save Current Custom Build as User Template */}
                  <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                    <div className="mb-1.5 text-xs font-semibold text-slate-300">
                      Save Custom Template
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={customTemplateName}
                        onChange={(e) => setCustomTemplateName(e.target.value)}
                        placeholder={`e.g. My ${activeMeta.name}`}
                        maxLength={28}
                        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={saveCurrentAsUserTemplate}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </button>
                    </div>

                    {savedForWeapon.length > 0 && (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-400">
                          Your Saved Templates
                        </div>
                        {savedForWeapon.map((tpl) => {
                          const isSavedActive = activeBuild.templateId === tpl.id;
                          return (
                            <div
                              key={tpl.id}
                              className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${
                                isSavedActive
                                  ? 'border-emerald-500 bg-emerald-950/60 text-white'
                                  : 'border-slate-700 bg-slate-950 text-slate-200'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateWeaponBuild(workshopWeaponId, tpl.build, false)
                                }
                                className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-semibold cursor-pointer"
                              >
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-xs border border-white/40"
                                  style={{ backgroundColor: tpl.build.colorHex }}
                                />
                                <span className="truncate">{tpl.name}</span>
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${tpl.name}`}
                                onClick={() =>
                                  setUserTemplates((prev) =>
                                    prev.filter((item) => item.id !== tpl.id)
                                  )
                                }
                                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Live Stats, Finish Color, Attachments & Stat Sliders */}
                <div className="space-y-4">
                  {/* Live Resolved Stats Readout */}
                  {resolvedGun && (
                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-cyan-500/25 bg-slate-900/90 p-3 sm:grid-cols-6 font-mono text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">DAMAGE</div>
                        <div className="text-sm font-bold text-amber-400">
                          {resolvedGun.damage}
                          {resolvedGun.pellets > 1 ? `×${resolvedGun.pellets}` : ''}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">RATE (RPM)</div>
                        <div className="text-sm font-bold text-cyan-400">
                          {Math.round(60 / resolvedGun.fireInterval)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">MAGAZINE</div>
                        <div className="text-sm font-bold text-white">
                          {resolvedGun.magSize}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">RELOAD</div>
                        <div className="text-sm font-bold text-emerald-400">
                          {resolvedGun.reloadTime.toFixed(2)}s
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">ADS FOV</div>
                        <div className="text-sm font-bold text-slate-200">
                          {Math.round(resolvedGun.adsFov)}°
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">TRIGGER</div>
                        <div className="text-sm font-bold text-rose-300">
                          {resolvedGun.auto ? 'AUTO' : 'SEMI'}
                        </div>
                      </div>
                    </div>
                  )}

                  {resolvedMelee && (
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-cyan-500/25 bg-slate-900/90 p-3 sm:grid-cols-5 font-mono text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">SLASH DMG</div>
                        <div className="text-sm font-bold text-amber-400">
                          {resolvedMelee.damage}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">COOLDOWN</div>
                        <div className="text-sm font-bold text-cyan-400">
                          {resolvedMelee.cooldown.toFixed(2)}s
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">REACH</div>
                        <div className="text-sm font-bold text-emerald-400">
                          {resolvedMelee.range.toFixed(2)}m
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">SPEED BONUS</div>
                        <div className="text-sm font-bold text-white">
                          +{Math.round((resolvedMelee.speedBonus - 1) * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">DASH LUNGE</div>
                        <div className="text-sm font-bold text-rose-300">
                          {resolvedMelee.dashImpulse.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  )}

                  {resolvedUtility && (
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-cyan-500/25 bg-slate-900/90 p-3 sm:grid-cols-4 font-mono text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">CHARGES</div>
                        <div className="text-sm font-bold text-white">
                          {resolvedUtility.charges}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">COOLDOWN</div>
                        <div className="text-sm font-bold text-cyan-400">
                          {resolvedUtility.cooldown.toFixed(1)}s
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">POWER</div>
                        <div className="text-sm font-bold text-amber-400">
                          {Math.round(resolvedUtility.powerMult * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">THROW SPEED</div>
                        <div className="text-sm font-bold text-emerald-400">
                          {Math.round(resolvedUtility.throwSpeedMult * 100)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Finish & Accent Color Picker */}
                  <div className="rounded-lg border border-cyan-500/25 bg-slate-900/80 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">
                        Weapon Finish, Tracer &amp; Reticle Color
                      </span>
                      <span className="font-mono text-slate-400">
                        {activeBuild.colorHex.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {WEAPON_FINISH_SWATCHES.map((sw) => {
                        const active =
                          activeBuild.colorHex.toLowerCase() === sw.hex.toLowerCase();
                        return (
                          <button
                            key={sw.hex}
                            type="button"
                            title={sw.name}
                            onClick={() =>
                              updateWeaponBuild(workshopWeaponId, { colorHex: sw.hex })
                            }
                            className={`h-7 w-7 rounded-lg border-2 transition-transform cursor-pointer ${
                              active
                                ? 'scale-110 border-white'
                                : 'border-slate-700 hover:scale-105'
                            }`}
                            style={{ backgroundColor: sw.hex }}
                          />
                        );
                      })}
                      <label className="ml-1 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-300 cursor-pointer">
                        <span>Custom</span>
                        <input
                          type="color"
                          value={activeBuild.colorHex}
                          onChange={(e) =>
                            updateWeaponBuild(workshopWeaponId, {
                              colorHex: e.target.value,
                            })
                          }
                          className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Tier-Unlocked 3D Weapon Skins */}
                  <div className="rounded-lg border border-cyan-500/25 bg-slate-900/80 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
                        <Award className="h-3.5 w-3.5 text-amber-400" />
                        Weapon Skin Finish · Tier Unlocks ({activeMeta.name})
                      </span>
                      <span className="font-mono text-[11px] text-cyan-300 tabular-nums">
                        YOUR LEVEL: {career.level}
                      </span>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                      {WEAPON_SKINS.map((skin) => {
                        const unlocked = isSkinUnlocked(skin.id, career.level);
                        const activeSkin = (activeBuild.skin ?? 'standard') === skin.id;
                        return (
                          <button
                            key={skin.id}
                            type="button"
                            disabled={!unlocked}
                            onClick={() => {
                              if (!unlocked) return;
                              updateWeaponBuild(workshopWeaponId, { skin: skin.id });
                            }}
                            className={`rounded-lg border p-2 text-left transition-colors ${
                              !unlocked
                                ? 'border-slate-800 bg-slate-950/60 opacity-60 cursor-not-allowed'
                                : activeSkin
                                  ? 'border-cyan-400 bg-cyan-950/75 text-white cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.28)]'
                                  : 'border-slate-700 bg-slate-950/85 text-slate-200 hover:border-cyan-500/45 cursor-pointer'
                            }`}
                          >
                            <div
                              className="mb-1.5 h-3 w-full rounded-xs border border-white/25"
                              style={{ backgroundImage: skin.previewGradient }}
                            />
                            <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                              <span className="truncate">{skin.name}</span>
                              {!unlocked ? (
                                <span className="inline-flex items-center gap-0.5 shrink-0 font-mono text-[9px] text-amber-400 tabular-nums">
                                  <Lock className="h-2.5 w-2.5" />
                                  LV {skin.unlockLevel}
                                </span>
                              ) : activeSkin ? (
                                <span className="shrink-0 font-mono text-[9px] text-cyan-300">
                                  ON
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 truncate text-[10px] text-slate-400">
                              {skin.subtitle}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kill Finisher Effect Selector (Available for EVERY Weapon) */}
                  <div className="rounded-lg border border-cyan-500/25 bg-slate-900/80 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        Kill Finisher Effect ({activeMeta.name})
                      </span>
                      <span className="font-mono text-[11px] text-cyan-300">
                        {WEAPON_FINISHERS.find((f) => f.id === activeBuild.finisher)?.name ?? 'Shockwave Burst'}
                      </span>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {WEAPON_FINISHERS.map((fin) => {
                        const activeFin = (activeBuild.finisher ?? 'plasma_burst') === fin.id;
                        return (
                          <button
                            key={fin.id}
                            type="button"
                            onClick={() => {
                              updateWeaponBuild(workshopWeaponId, { finisher: fin.id });
                              shooterAudio.playFinisher(fin.id);
                            }}
                            className={`rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                              activeFin
                                ? 'border-cyan-400 bg-cyan-950/75 text-white shadow-[0_0_12px_rgba(34,211,238,0.28)]'
                                : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-cyan-500/45'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-xs border border-white/40"
                                style={{ backgroundColor: fin.colorHex }}
                              />
                              <span className="truncate">{fin.name}</span>
                            </div>
                            <div className="mt-0.5 truncate text-[10px] text-slate-400">
                              {fin.subtitle}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Attachments & Trigger (Firearms: Primary & Secondary) */}
                  {(activeCat === 'primary' || activeCat === 'secondary') && (
                    <div className="grid gap-3 rounded-lg border border-cyan-500/25 bg-slate-900/80 p-3 sm:grid-cols-2">
                      <div>
                        <div className="mb-1.5 text-xs font-semibold text-slate-300">
                          Optic Sight
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'iron', label: 'Iron' },
                              { id: 'holo', label: 'Holo' },
                              { id: 'scope', label: 'Scope' },
                            ] as Array<{ id: OpticAttachment; label: string }>
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                updateWeaponBuild(workshopWeaponId, { optic: opt.id })
                              }
                              className={`rounded-lg border py-1.5 text-xs font-semibold cursor-pointer ${
                                activeBuild.optic === opt.id
                                  ? 'border-cyan-400 bg-cyan-600 text-white'
                                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 text-xs font-semibold text-slate-300">
                          Barrel Attachment
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'standard', label: 'Standard' },
                              { id: 'suppressor', label: 'Suppressor' },
                              { id: 'heavy', label: 'Heavy' },
                            ] as Array<{ id: BarrelAttachment; label: string }>
                          ).map((bar) => (
                            <button
                              key={bar.id}
                              type="button"
                              onClick={() =>
                                updateWeaponBuild(workshopWeaponId, { barrel: bar.id })
                              }
                              className={`rounded-lg border py-1.5 text-xs font-semibold cursor-pointer ${
                                activeBuild.barrel === bar.id
                                  ? 'border-cyan-400 bg-cyan-600 text-white'
                                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {bar.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 text-xs font-semibold text-slate-300">
                          Magazine Type
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'standard', label: 'Standard' },
                              { id: 'extended', label: 'Extended' },
                              { id: 'quick', label: 'Quick-Mag' },
                            ] as Array<{ id: MagazineAttachment; label: string }>
                          ).map((mag) => (
                            <button
                              key={mag.id}
                              type="button"
                              onClick={() =>
                                updateWeaponBuild(workshopWeaponId, { magazine: mag.id })
                              }
                              className={`rounded-lg border py-1.5 text-xs font-semibold cursor-pointer ${
                                activeBuild.magazine === mag.id
                                  ? 'border-cyan-400 bg-cyan-600 text-white'
                                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {mag.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 text-xs font-semibold text-slate-300">
                          Trigger Fire Mode
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'default', label: 'Default' },
                              { id: 'auto', label: 'Full-Auto' },
                              { id: 'semi', label: 'Semi-Auto' },
                            ] as Array<{ id: FireModeOverride; label: string }>
                          ).map((fm) => (
                            <button
                              key={fm.id}
                              type="button"
                              onClick={() =>
                                updateWeaponBuild(workshopWeaponId, { fireMode: fm.id })
                              }
                              className={`rounded-lg border py-1.5 text-xs font-semibold cursor-pointer ${
                                activeBuild.fireMode === fm.id
                                  ? 'border-cyan-400 bg-cyan-600 text-white'
                                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {fm.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Free-Tune Stat Sliders */}
                  <div className="rounded-lg border border-cyan-500/25 bg-slate-900/80 p-3">
                    <div className="mb-2.5 text-xs font-semibold text-slate-300">
                      Free-Tune Custom Stat Sliders
                    </div>

                    {(activeCat === 'primary' || activeCat === 'secondary') && (
                      <div className="grid gap-3 sm:grid-cols-2 text-xs">
                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Damage Multiplier</span>
                            <span className="font-mono text-amber-400">
                              {Math.round(activeBuild.damageMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.6}
                            max={1.75}
                            step={0.05}
                            value={activeBuild.damageMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                damageMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Fire Rate Multiplier</span>
                            <span className="font-mono text-cyan-400">
                              {Math.round(activeBuild.fireRateMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.6}
                            max={1.75}
                            step={0.05}
                            value={activeBuild.fireRateMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                fireRateMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Magazine Bonus Rounds</span>
                            <span className="font-mono text-white">
                              {activeBuild.magBonus >= 0
                                ? `+${activeBuild.magBonus}`
                                : activeBuild.magBonus}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-4}
                            max={24}
                            step={1}
                            value={activeBuild.magBonus}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                magBonus: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Accuracy Tightness</span>
                            <span className="font-mono text-emerald-400">
                              {Math.round(activeBuild.accuracyMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.4}
                            max={1.6}
                            step={0.05}
                            value={activeBuild.accuracyMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                accuracyMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Recoil Scale</span>
                            <span className="font-mono text-rose-300">
                              {Math.round(activeBuild.recoilMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.25}
                            max={1.4}
                            step={0.05}
                            value={activeBuild.recoilMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                recoilMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>ADS Zoom FOV Delta</span>
                            <span className="font-mono text-slate-200">
                              {activeBuild.adsZoomDelta >= 0
                                ? `+${activeBuild.adsZoomDelta}°`
                                : `${activeBuild.adsZoomDelta}°`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-12}
                            max={10}
                            step={1}
                            value={activeBuild.adsZoomDelta}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                adsZoomDelta: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>
                      </div>
                    )}

                    {activeCat === 'melee' && (
                      <div className="grid gap-3 sm:grid-cols-2 text-xs">
                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Slash Damage</span>
                            <span className="font-mono text-amber-400">
                              {Math.round(activeBuild.damageMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.7}
                            max={1.8}
                            step={0.05}
                            value={activeBuild.damageMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                damageMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Swing Cadence</span>
                            <span className="font-mono text-cyan-400">
                              {Math.round(activeBuild.fireRateMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.65}
                            max={1.75}
                            step={0.05}
                            value={activeBuild.fireRateMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                fireRateMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Blade Size &amp; Reach</span>
                            <span className="font-mono text-emerald-400">
                              {Math.round(activeBuild.reachMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.8}
                            max={1.55}
                            step={0.05}
                            value={activeBuild.reachMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                reachMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Sprint Move Speed</span>
                            <span className="font-mono text-white">
                              {Math.round(activeBuild.speedMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.85}
                            max={1.45}
                            step={0.05}
                            value={activeBuild.speedMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                speedMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block sm:col-span-2">
                          <div className="flex justify-between text-slate-300">
                            <span>Dash Lunge Impulse</span>
                            <span className="font-mono text-rose-300">
                              {Math.round(activeBuild.dashMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.7}
                            max={1.75}
                            step={0.05}
                            value={activeBuild.dashMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                dashMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>
                      </div>
                    )}

                    {activeCat === 'utility' && (
                      <div className="grid gap-3 sm:grid-cols-2 text-xs">
                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Payload / Heal Power</span>
                            <span className="font-mono text-amber-400">
                              {Math.round(activeBuild.powerMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.7}
                            max={1.85}
                            step={0.05}
                            value={activeBuild.powerMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                powerMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Extra Charges</span>
                            <span className="font-mono text-white">
                              +{activeBuild.magBonus}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={3}
                            step={1}
                            value={activeBuild.magBonus}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                magBonus: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Throw Velocity</span>
                            <span className="font-mono text-emerald-400">
                              {Math.round(activeBuild.dashMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.75}
                            max={1.6}
                            step={0.05}
                            value={activeBuild.dashMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                dashMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>

                        <label className="block">
                          <div className="flex justify-between text-slate-300">
                            <span>Recharge Speed</span>
                            <span className="font-mono text-cyan-400">
                              {Math.round(activeBuild.fireRateMult * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.7}
                            max={1.6}
                            step={0.05}
                            value={activeBuild.fireRateMult}
                            onChange={(e) =>
                              updateWeaponBuild(workshopWeaponId, {
                                fireRateMult: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full accent-cyan-500 cursor-pointer"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CAMBRIDGE Q&A STUDY BANK MODAL (CLASS 6-10) */}
      {gameState === 'TITLE_MENU' && qaModalOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-cyan-500/40 bg-slate-950 p-5 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.18)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-emerald-400">
                  <BookOpen className="h-4 w-4" />
                  {getCambridgeStageLabel(classLevel)}
                </div>
                <h2 className="mt-0.5 font-display text-2xl font-bold text-white">
                  Cambridge Q&amp;A · Class {classLevel}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setQaModalOpen(false)}
                className="rounded-lg border border-cyan-500/35 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                Back to Lobby
              </button>
            </div>

            {/* Quick Class 6-10 + Subject Filter */}
            <div className="mt-3 grid grid-cols-5 gap-1">
              {CLASS_LEVELS.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setClassLevel(cls)}
                  className={`rounded border py-1 font-mono text-xs font-bold cursor-pointer ${
                    classLevel === cls
                      ? 'border-cyan-400 bg-cyan-600 text-white'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/40'
                  }`}
                >
                  C{cls}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 sm:grid-cols-6">
              {(Object.keys(SUBJECTS) as SubjectId[]).map((subId) => (
                <button
                  key={subId}
                  type="button"
                  onClick={() => setSubject(subId)}
                  className={`rounded border px-2 py-1 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    subject === subId
                      ? 'border-emerald-400 bg-emerald-600 text-white'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/40'
                  }`}
                >
                  {SUBJECTS[subId].label}
                </button>
              ))}
            </div>

            {/* Q&A Cards */}
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {getQuestionsForClassAndSubject(classLevel, subject).map((q, idx) => {
                const isRevealed = revealedQaIds[q.id] ?? true;
                return (
                  <div
                    key={q.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/90 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-cyan-400">
                        Q{idx + 1} · {q.cambridgeRef}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedQaIds((prev) => ({ ...prev, [q.id]: !isRevealed }))
                        }
                        className="text-[11px] font-medium text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        {isRevealed ? 'Hide Answer' : 'Show Answer'}
                      </button>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-white">{q.prompt}</div>
                    {isRevealed && (
                      <div className="mt-2.5 rounded-md border border-emerald-500/30 bg-emerald-950/35 p-3 text-xs">
                        <div className="font-bold text-emerald-300">
                          Answer: {q.choices[q.correctIndex]}
                        </div>
                        <div className="mt-1 text-slate-300 leading-relaxed">{q.explanation}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PRE-ROUND KNOWLEDGE GATE (MUST ANSWER CORRECTLY TO PLAY) */}
      {gameState === 'ROUND_QUIZ' && quizState && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl border border-cyan-500/45 bg-slate-950 p-6 shadow-[0_0_40px_rgba(6,182,212,0.2)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
              <div className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-cyan-400">
                <GraduationCap className="h-4 w-4" />
                ROUND {quizState.roundNum} GATE · CLASS {classLevel} · {quizState.question.cambridgeRef.toUpperCase()}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {mpRoom && (
                  <div className="rounded border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-200 tabular-nums">
                    {mpRoom.players.filter((p) => p.ready).length}/{mpRoom.players.length} READY ·{' '}
                    {Math.max(0, Math.ceil(mpRoom.quizTimer))}s
                  </div>
                )}
                <div className="font-mono text-xs text-slate-400">
                  SCORE {quizStats.correct}/{quizStats.total} · STREAK {quizStats.streak}
                </div>
                <button
                  type="button"
                  onClick={exitToLobby}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/45 bg-rose-950/65 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-900/75 cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Exit Match
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-300">
              {!quizState.hadWrongAttempt
                ? `Answer correctly on 1st try to unlock Round ${quizState.roundNum} + ${quizState.perk.label}`
                : `Answer this new question correctly to unlock Round ${quizState.roundNum} (1st-try bonus missed)`}
            </div>

            {quizState.wrongFeedback && !quizState.solved && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/45 bg-rose-950/55 px-3 py-2.5 text-xs text-rose-200">
                <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-rose-300">
                    Incorrect (“{quizState.wrongFeedback.chosenAnswer}”) — switched to a new question!
                  </div>
                  <div className="mt-0.5 text-rose-200/90">
                    Previous answer: <span className="font-semibold text-white">{quizState.wrongFeedback.correctAnswer}</span> — {quizState.wrongFeedback.explanation}
                  </div>
                </div>
              </div>
            )}

            <h2 className="mt-4 font-display text-lg sm:text-xl font-bold leading-snug text-white">
              {quizState.question.prompt}
            </h2>

            <div className="mt-4 grid gap-2">
              {quizState.question.choices.map((choice, idx) => {
                const isSolved = quizState.solved;
                const isCorrectChoice = idx === quizState.question.correctIndex;
                const disabled = isSolved;

                let btnStyle =
                  'border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400 hover:bg-slate-800';
                if (isSolved && isCorrectChoice) {
                  btnStyle = 'border-emerald-400 bg-emerald-900/65 text-emerald-100';
                } else if (isSolved) {
                  btnStyle = 'border-slate-800 bg-slate-950 text-slate-500';
                }

                return (
                  <button
                    key={`${quizState.question.id}-${idx}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => answerQuiz(idx)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      disabled ? 'cursor-default' : 'cursor-pointer'
                    } ${btnStyle}`}
                  >
                    <span>
                      <span className="mr-2.5 font-mono text-xs font-bold opacity-75">
                        [{idx + 1}]
                      </span>
                      {choice}
                    </span>
                    {isSolved && isCorrectChoice && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {quizState.solved ? (
              <div className="mt-4 rounded-lg border border-emerald-500/45 bg-slate-900 p-4">
                <div className="text-xs font-bold text-emerald-400">
                  {!quizState.hadWrongAttempt
                    ? `Correct! Round ${quizState.roundNum} Unlocked + ${quizState.perk.label}`
                    : `Correct! Round ${quizState.roundNum} Unlocked`}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  {quizState.question.explanation}
                </p>
                {mpRoom && mpRoom.players.some((p) => !p.ready) && (
                  <div className="mt-2 font-mono text-[11px] text-cyan-300">
                    Waiting for squad readiness ({mpRoom.players.filter((p) => p.ready).length}/
                    {mpRoom.players.length}) · Auto-deploy in{' '}
                    {Math.max(0, Math.ceil(mpRoom.quizTimer))}s...
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={exitToLobby}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 cursor-pointer whitespace-nowrap"
                  >
                    <LogOut className="h-4 w-4" />
                    Exit to Lobby
                  </button>
                  <button
                    type="button"
                    onClick={deployRoundFromQuiz}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 font-display text-sm font-bold tracking-wide text-white hover:bg-cyan-500 cursor-pointer whitespace-nowrap"
                  >
                    <Play className="h-4 w-4" />
                    {mpRoom ? `LOCKED IN · ROUND ${quizState.roundNum}` : `DEPLOY ROUND ${quizState.roundNum}`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>Press keys 1–4 or click the right answer to unlock play</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={swapQuizQuestion}
                      className="rounded-md border border-cyan-500/35 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      New Question
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOOT CAMP TUTORIAL COMPLETE MODAL */}
      {gameState === 'PLAYING' && hud.tutorial.active && hud.tutorial.completed && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-cyan-500/45 bg-slate-950 p-7 shadow-[0_0_40px_rgba(6,182,212,0.2)]">
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider text-cyan-400">
              <CheckCircle2 className="h-4 w-4" />
              SHELL SHOCKERS · SIMULATION GRADUATE
            </div>
            <h2 className="mt-1 font-display text-3xl font-bold text-white">
              Boot Camp Complete!
            </h2>
            <p className="mt-1.5 text-sm text-slate-300">
              You’ve mastered movement, thruster slide-jumping, optic ADS aiming, reloading, plasma lunging, tactical tech cores, and target elimination.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-cyan-500/25 bg-slate-900 p-4">
              <div>
                <div className="text-xs text-slate-400">Steps Cleared</div>
                <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
                  {hud.tutorial.totalSteps}/{hud.tutorial.totalSteps}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Damage Dealt</div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {hud.totalDamageDealt}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Accuracy</div>
                <div className="font-mono text-xl font-bold text-cyan-400 tabular-nums">
                  {accuracyPct}%
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={startDuel}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 font-display text-sm font-bold tracking-wide text-white hover:bg-cyan-500 cursor-pointer whitespace-nowrap"
              >
                <Play className="h-4 w-4" />
                {teamSize === 1 ? 'LAUNCH 1v1 DUEL' : `LAUNCH ${teamSize}v${teamSize}`}
              </button>
              <button
                type="button"
                onClick={startTutorial}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/45 bg-emerald-950/60 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-900/70 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                Replay Tutorial
              </button>
              <button
                type="button"
                onClick={exitToLobby}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="h-4 w-4" />
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-6">
          <div className="w-full max-w-sm rounded-xl border border-cyan-500/45 bg-slate-950 p-6 text-center shadow-[0_0_36px_rgba(6,182,212,0.2)]">
            <h2 className="font-display text-2xl font-bold tracking-wide text-white">
              {hud.tutorial.active ? 'SIMULATION PAUSED' : 'MATCH PAUSED'}
            </h2>
            <p className="mt-2 font-mono text-xs text-cyan-300/80">
              {hud.tutorial.active
                ? `Boot Camp · Step ${hud.tutorial.step + 1}/${hud.tutorial.totalSteps} · ${ARENA_MAPS[selectedMap].name}`
                : `${teamSize}v${teamSize} · ${ARENA_MAPS[selectedMap].name} · ${teamSize === 1 ? 'YOU' : 'ALPHA'} ${hud.playerRounds} — ${hud.rivalRounds} OMEGA`}
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={resumeDuel}
                className="rounded-lg bg-cyan-600 px-4 py-2.5 font-display text-sm font-bold tracking-wide text-white hover:bg-cyan-500 cursor-pointer"
              >
                {hud.tutorial.active ? 'RESUME TUTORIAL' : 'RESUME MATCH'}
              </button>
              <button
                type="button"
                onClick={() => setCrosshairModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/45 bg-amber-950/50 px-4 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-900/60 cursor-pointer"
              >
                <Crosshair className="h-4 w-4" />
                Customize Optic Reticle
              </button>
              <button
                type="button"
                onClick={hud.tutorial.active ? startTutorial : startDuel}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                {hud.tutorial.active ? 'Restart Tutorial' : 'Restart Match'}
              </button>
              <button
                type="button"
                onClick={exitToLobby}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/45 bg-rose-950/55 px-4 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-900/65 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Exit to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CROSSHAIR CUSTOMIZER MODAL */}
      {crosshairModalOpen && (
        <CrosshairCustomizerModal
          config={crosshairConfig}
          onChange={setCrosshairConfig}
          onClose={() => setCrosshairModalOpen(false)}
        />
      )}

      {/* MATCH VICTORY / DEFEAT DEBRIEF */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-xl border border-cyan-500/45 bg-slate-950 p-7 shadow-[0_0_40px_rgba(6,182,212,0.22)]">
            <div
              className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider ${
                hud.playerRounds >= ROUNDS_TO_WIN ? 'text-cyan-400' : 'text-rose-400'
              }`}
            >
              <Trophy className="h-4 w-4" />
              {hud.playerRounds >= ROUNDS_TO_WIN ? 'SECTOR SECURED · VICTORY' : 'SECTOR LOST · DEFEAT'} ·{' '}
              {teamSize}v{teamSize} · {ARENA_MAPS[selectedMap].name.toUpperCase()}
            </div>
            <h2 className="mt-1 font-display text-3xl font-bold text-white">
              {hud.playerRounds} — {hud.rivalRounds}
            </h2>

            <div className="mt-5 grid grid-cols-3 gap-3 rounded-lg border border-cyan-500/25 bg-slate-900 p-4">
              <div>
                <div className="text-xs text-slate-400">Damage Dealt</div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">
                  {hud.totalDamageDealt}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Eliminations</div>
                <div className="font-mono text-xl font-bold text-cyan-400 tabular-nums">
                  {hud.kills}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Accuracy</div>
                <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
                  {accuracyPct}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Criticals</div>
                <div className="font-mono text-lg font-bold text-amber-400 tabular-nums">
                  {hud.headshots}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Quiz Score</div>
                <div className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
                  {quizStats.correct}/{quizStats.total}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Quiz Streak</div>
                <div className="font-mono text-lg font-bold text-cyan-400 tabular-nums">
                  {quizStats.bestStreak}
                </div>
              </div>
            </div>

            {mpRoom && mpRoom.players.length > 0 && (
              <div className="mt-4 rounded-lg border border-cyan-500/30 bg-slate-900/90 p-3.5">
                <div className="mb-2 font-mono text-[11px] font-bold tracking-wider text-cyan-300">
                  MULTIPLAYER MATCH SCOREBOARD · ROOM {mpRoom.code}
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="grid grid-cols-[1fr_70px_54px_54px_70px] gap-2 border-b border-slate-800 pb-1 text-[10px] text-slate-400">
                    <span>PLAYER</span>
                    <span>SQUAD</span>
                    <span className="text-right">K</span>
                    <span className="text-right">D</span>
                    <span className="text-right">DMG</span>
                  </div>
                  {[...mpRoom.players]
                    .sort((a, b) => b.kills - a.kills || b.damageDealt - a.damageDealt)
                    .map((p) => (
                      <div
                        key={p.id}
                        className={`grid grid-cols-[1fr_70px_54px_54px_70px] items-center gap-2 rounded px-2 py-1 tabular-nums ${
                          p.id === mpPlayerId ? 'bg-cyan-950/50 text-white' : 'text-slate-300'
                        }`}
                      >
                        <span className="truncate font-semibold">
                          {p.name}
                          {p.id === mpPlayerId ? ' (YOU)' : ''}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            p.team === 'alpha' ? 'text-cyan-400' : 'text-rose-400'
                          }`}
                        >
                          {p.team.toUpperCase()}
                        </span>
                        <span className="text-right text-emerald-400">{p.kills}</span>
                        <span className="text-right text-rose-300">{p.deaths}</span>
                        <span className="text-right text-cyan-200">{p.damageDealt}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Post-Match XP Progression & Unlocked Skins */}
            {lastMatchXp && (() => {
              const xpInfo = getXpProgress(career.xp);
              return (
                <div className="mt-4 rounded-lg border border-cyan-500/30 bg-slate-900/90 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-400" />
                      <span className="font-mono text-xs font-bold tracking-wider text-white">
                        MATCH XP EARNED
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                        ({lastMatchXp.difficultyMult.toFixed(2)}× RANK BONUS)
                      </span>
                    </div>
                    <span className="font-mono text-base font-bold text-emerald-400 tabular-nums">
                      +{lastMatchXp.totalEarnedXp} XP
                    </span>
                  </div>

                  {lastMatchXp.leveledUp && (
                    <div className="mt-2.5 rounded-md border border-amber-400/50 bg-amber-950/50 px-3 py-2 text-xs font-bold text-amber-200">
                      LEVEL UP! LVL {lastMatchXp.prevLevel} → LVL {lastMatchXp.nextLevel} ·{' '}
                      {lastMatchXp.nextTier.title.toUpperCase()}
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                      <span style={{ color: xpInfo.tier.colorHex }} className="font-bold">
                        LVL {xpInfo.level} · {xpInfo.tier.title.toUpperCase()}
                      </span>
                      <span className="text-slate-300">
                        {xpInfo.currentLevelXp} / {xpInfo.nextLevelXp} XP
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-xs bg-slate-800">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${xpInfo.progressPct}%`,
                          backgroundColor: xpInfo.tier.colorHex,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-800 pt-2.5 font-mono text-[11px] text-slate-300 tabular-nums sm:grid-cols-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Match</span>
                      <span className="text-white">+{lastMatchXp.outcomeXp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rounds</span>
                      <span className="text-cyan-300">+{lastMatchXp.roundsXp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Elims</span>
                      <span className="text-cyan-300">+{lastMatchXp.killsXp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Criticals</span>
                      <span className="text-amber-300">+{lastMatchXp.headshotsXp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Damage/Acc</span>
                      <span className="text-emerald-300">
                        +{lastMatchXp.damageXp + lastMatchXp.accuracyXp}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cambridge</span>
                      <span className="text-emerald-300">+{lastMatchXp.quizXp}</span>
                    </div>
                  </div>

                  {lastMatchXp.newlyUnlockedSkins.length > 0 && (
                    <div className="mt-3 border-t border-slate-800 pt-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold tracking-wider text-amber-300">
                          NEW WEAPON SKINS UNLOCKED
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            exitToLobby();
                            openWorkshopFor(loadout.primary);
                          }}
                          className="rounded border border-cyan-500/50 bg-cyan-950/70 px-2 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-900 cursor-pointer"
                        >
                          Equip in Armory
                        </button>
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {lastMatchXp.newlyUnlockedSkins.map((sk) => (
                          <div
                            key={sk.id}
                            className="flex items-center gap-2 rounded-md border border-amber-400/35 bg-slate-950 px-2.5 py-1.5"
                          >
                            <span
                              className="h-4 w-6 shrink-0 rounded-xs border border-white/30"
                              style={{ backgroundImage: sk.previewGradient }}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-xs font-bold text-white">
                                {sk.name}
                              </div>
                              <div className="truncate text-[10px] text-slate-400">
                                Unlocked at LV {sk.unlockLevel}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {quizHistory.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 font-mono text-[11px] font-semibold tracking-wider text-slate-400">
                  CONCEPTS REVIEWED THIS MATCH
                </div>
                <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                  {quizHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-200">{item.prompt}</span>
                        <span
                          className={`shrink-0 font-mono text-[10px] font-bold ${
                            item.wasCorrect ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.wasCorrect ? 'CORRECT' : 'REVIEW'}
                        </span>
                      </div>
                      <div className="mt-1 text-emerald-300 font-medium">
                        Answer: {item.correctAnswer}
                      </div>
                      <div className="mt-0.5 text-slate-400">{item.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={startDuel}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 font-display text-sm font-bold tracking-wide text-white hover:bg-cyan-500 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                REDEPLOY REMATCH
              </button>
              <button
                type="button"
                onClick={exitToLobby}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="h-4 w-4" />
                Exit to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
