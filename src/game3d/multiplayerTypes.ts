import type {
  DifficultyId,
  FinisherId,
  MapId,
  PrimaryId,
  SecondaryId,
  SlotIndex,
  TeamSize,
  WeaponId,
} from './types';

export type MpTeam = 'alpha' | 'omega';

export type MpRoomPhase = 'LOBBY' | 'ROUND_QUIZ' | 'PLAYING' | 'ROUND_END' | 'GAME_OVER';

export interface MpPlayerInfo {
  id: string;
  name: string;
  team: MpTeam;
  ready: boolean;
  connected: boolean;
  alive: boolean;
  hp: number;
  maxHp: number;
  kills: number;
  deaths: number;
  damageDealt: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  sliding: boolean;
  eyeHeight: number;
  activeSlot: SlotIndex;
  primary: PrimaryId;
  secondary: SecondaryId;
  speed: number;
  grounded: boolean;
  perkLabel: string | null;
  damageMult: number;
  bonusHp: number;
}

export interface MpBotSnapshot {
  id: string;
  name: string;
  team: MpTeam;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  knockedDown: boolean;
  grounded: boolean;
  speed: number;
}

export interface MpKillFeedEvent {
  id: number;
  killerName: string;
  killerTeam: MpTeam;
  victimName: string;
  victimTeam: MpTeam;
  headshot: boolean;
}

export interface MpRoomSnapshot {
  code: string;
  name: string;
  hostId: string;
  mapId: MapId;
  teamSize: TeamSize;
  difficulty: DifficultyId;
  fillBots: boolean;
  phase: MpRoomPhase;
  roundNumber: number;
  alphaRounds: number;
  omegaRounds: number;
  roundsToWin: number;
  roundTimer: number;
  quizTimer: number;
  roundEndTimer: number;
  roundBanner: string | null;
  orbActive: boolean;
  orbRespawnTimer: number;
  players: MpPlayerInfo[];
  bots: MpBotSnapshot[];
  killFeed: MpKillFeedEvent[];
  serverTime: number;
}

export interface MpRoomSummary {
  code: string;
  name: string;
  hostName: string;
  mapId: MapId;
  teamSize: TeamSize;
  difficulty: DifficultyId;
  fillBots: boolean;
  phase: MpRoomPhase;
  playerCount: number;
  maxHumans: number;
  alphaRounds: number;
  omegaRounds: number;
}

export type ClientMessage =
  | {
      type: 'hello';
      name: string;
      primary: PrimaryId;
      secondary: SecondaryId;
    }
  | {
      type: 'set_profile';
      name: string;
      primary: PrimaryId;
      secondary: SecondaryId;
    }
  | {
      type: 'list_rooms';
    }
  | {
      type: 'create_room';
      name?: string;
      mapId: MapId;
      teamSize: TeamSize;
      difficulty: DifficultyId;
      fillBots: boolean;
      autoStart?: boolean;
    }
  | {
      type: 'join_room';
      code: string;
    }
  | {
      type: 'quick_join';
      mapId: MapId;
      teamSize: TeamSize;
      difficulty: DifficultyId;
      fillBots: boolean;
    }
  | {
      type: 'leave_room';
    }
  | {
      type: 'update_room';
      mapId?: MapId;
      teamSize?: TeamSize;
      difficulty?: DifficultyId;
      fillBots?: boolean;
    }
  | {
      type: 'switch_team';
      team?: MpTeam;
    }
  | {
      type: 'set_ready';
      ready: boolean;
    }
  | {
      type: 'start_match';
    }
  | {
      type: 'request_rematch';
    }
  | {
      type: 'quiz_ready';
      perkLabel: string | null;
      bonusHp: number;
      damageMult: number;
    }
  | {
      type: 'player_state';
      x: number;
      y: number;
      z: number;
      yaw: number;
      pitch: number;
      sliding: boolean;
      eyeHeight: number;
      activeSlot: SlotIndex;
      primary: PrimaryId;
      secondary: SecondaryId;
      speed: number;
      grounded: boolean;
    }
  | {
      type: 'fire_fx';
      weaponId: string;
      from: [number, number, number];
      to: [number, number, number];
      colorHex: number;
      hitWater?: boolean;
      explosion?: boolean;
      splashRadius?: number;
    }
  | {
      type: 'melee_fx';
      origin: [number, number, number];
      dir: [number, number, number];
      colorHex: number;
    }
  | {
      type: 'water_ripple';
      x: number;
      z: number;
      strength: number;
    }
  | {
      type: 'bounce_pad';
      padIndex: number;
      x: number;
      z: number;
    }
  | {
      type: 'hit_player';
      targetId: string;
      damage: number;
      headshot: boolean;
      hitPoint: [number, number, number];
      weaponId: WeaponId;
      finisherId: FinisherId;
      colorHex: string;
    }
  | {
      type: 'hit_bot';
      botId: string;
      damage: number;
      headshot: boolean;
      hitPoint: [number, number, number];
      weaponId: WeaponId;
      finisherId: FinisherId;
      colorHex: string;
    }
  | {
      type: 'bot_damage_player';
      botName: string;
      targetPlayerId: string;
      damage: number;
      headshot: boolean;
    }
  | {
      type: 'bots_sync';
      bots: MpBotSnapshot[];
    }
  | {
      type: 'orb_pickup';
    }
  | {
      type: 'medkit_heal';
      amount: number;
    }
  | {
      type: 'ping';
      t: number;
    };

export type ServerMessage =
  | {
      type: 'welcome';
      playerId: string;
      rooms: MpRoomSummary[];
    }
  | {
      type: 'rooms_list';
      rooms: MpRoomSummary[];
    }
  | {
      type: 'room_error';
      message: string;
    }
  | {
      type: 'room_left';
    }
  | {
      type: 'room_snapshot';
      room: MpRoomSnapshot;
    }
  | {
      type: 'round_started';
      roundNumber: number;
      room: MpRoomSnapshot;
    }
  | {
      type: 'fire_fx';
      shooterId: string;
      weaponId: string;
      from: [number, number, number];
      to: [number, number, number];
      colorHex: number;
      hitWater?: boolean;
      explosion?: boolean;
      splashRadius?: number;
    }
  | {
      type: 'melee_fx';
      shooterId: string;
      origin: [number, number, number];
      dir: [number, number, number];
      colorHex: number;
    }
  | {
      type: 'water_ripple';
      playerId: string;
      x: number;
      z: number;
      strength: number;
    }
  | {
      type: 'bounce_pad';
      playerId: string;
      padIndex: number;
      x: number;
      z: number;
    }
  | {
      type: 'player_damaged';
      targetId: string;
      attackerId: string;
      attackerName: string;
      damage: number;
      newHp: number;
      headshot: boolean;
      hitPoint: [number, number, number];
    }
  | {
      type: 'bot_damaged';
      botId: string;
      attackerId: string;
      attackerName: string;
      damage: number;
      newHp: number;
      headshot: boolean;
      hitPoint: [number, number, number];
    }
  | {
      type: 'entity_killed';
      killerId: string;
      killerName: string;
      killerTeam: MpTeam;
      victimId: string;
      victimName: string;
      victimTeam: MpTeam;
      victimIsBot: boolean;
      headshot: boolean;
      pos: [number, number, number];
      finisherId: FinisherId;
      colorHex: string;
      killFeedEntry: MpKillFeedEvent;
    }
  | {
      type: 'orb_collected';
      playerId: string;
      playerName: string;
      team: MpTeam;
    }
  | {
      type: 'pong';
      t: number;
      serverTime: number;
    };
