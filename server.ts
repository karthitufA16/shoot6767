import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  ClientMessage,
  MpBotSnapshot,
  MpKillFeedEvent,
  MpPlayerInfo,
  MpRoomPhase,
  MpRoomSnapshot,
  MpRoomSummary,
  MpTeam,
  ServerMessage,
} from './src/game3d/multiplayerTypes.ts';
import type { DifficultyId, MapId, PrimaryId, SecondaryId, TeamSize } from './src/game3d/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const ROUNDS_TO_WIN = 5;
const ROUND_DURATION_SEC = 90;
const QUIZ_GATE_DURATION_SEC = 18;
const ROUND_END_DURATION_SEC = 3.2;

const VALID_MAPS = new Set<MapId>(['arena', 'construction', 'hydro', 'splash', 'docks']);
const VALID_DIFFS = new Set<DifficultyId>(['rookie', 'ranked', 'nemesis']);
const VALID_TEAM_SIZES = new Set<TeamSize>([1, 2, 3, 4, 5]);

const MAP_SPAWN_Z: Record<MapId, number> = {
  arena: 29,
  construction: 29,
  hydro: 28,
  splash: 29,
  docks: 30,
};

interface ClientSession {
  id: string;
  ws: WebSocket;
  name: string;
  primary: PrimaryId;
  secondary: SecondaryId;
  roomCode: string | null;
  lastAliveAt: number;
}

interface ServerRoom {
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
  roundTimer: number;
  quizTimer: number;
  roundEndTimer: number;
  roundBanner: string | null;
  orbActive: boolean;
  orbRespawnTimer: number;
  players: Map<string, MpPlayerInfo>;
  bots: MpBotSnapshot[];
  killFeed: MpKillFeedEvent[];
  nextEventId: number;
  createdAt: number;
}

const sessions = new Map<string, ClientSession>();
const rooms = new Map<string, ServerRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
}

function safeSend(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function getRoomSummaries(): MpRoomSummary[] {
  const list: MpRoomSummary[] = [];
  for (const room of rooms.values()) {
    const host = room.players.get(room.hostId);
    list.push({
      code: room.code,
      name: room.name,
      hostName: host?.name ?? 'Commander',
      mapId: room.mapId,
      teamSize: room.teamSize,
      difficulty: room.difficulty,
      fillBots: room.fillBots,
      phase: room.phase,
      playerCount: room.players.size,
      maxHumans: room.teamSize * 2,
      alphaRounds: room.alphaRounds,
      omegaRounds: room.omegaRounds,
    });
  }
  return list.sort((a, b) => b.playerCount - a.playerCount);
}

function toRoomSnapshot(room: ServerRoom): MpRoomSnapshot {
  return {
    code: room.code,
    name: room.name,
    hostId: room.hostId,
    mapId: room.mapId,
    teamSize: room.teamSize,
    difficulty: room.difficulty,
    fillBots: room.fillBots,
    phase: room.phase,
    roundNumber: room.roundNumber,
    alphaRounds: room.alphaRounds,
    omegaRounds: room.omegaRounds,
    roundsToWin: ROUNDS_TO_WIN,
    roundTimer: room.roundTimer,
    quizTimer: room.quizTimer,
    roundEndTimer: room.roundEndTimer,
    roundBanner: room.roundBanner,
    orbActive: room.orbActive,
    orbRespawnTimer: room.orbRespawnTimer,
    players: Array.from(room.players.values()),
    bots: room.bots,
    killFeed: room.killFeed,
    serverTime: Date.now(),
  };
}

function broadcastToRoom(room: ServerRoom, msg: ServerMessage, excludePlayerId?: string): void {
  const payload = JSON.stringify(msg);
  for (const p of room.players.keys()) {
    if (excludePlayerId && p === excludePlayerId) continue;
    const sess = sessions.get(p);
    if (sess && sess.ws.readyState === WebSocket.OPEN) {
      sess.ws.send(payload);
    }
  }
}

function broadcastLobbyRooms(): void {
  const summaries = getRoomSummaries();
  const payload = JSON.stringify({ type: 'rooms_list', rooms: summaries } satisfies ServerMessage);
  for (const sess of sessions.values()) {
    if (!sess.roomCode && sess.ws.readyState === WebSocket.OPEN) {
      sess.ws.send(payload);
    }
  }
}

function spawnPositionForPlayer(
  mapId: MapId,
  team: MpTeam,
  indexInTeam: number
): { x: number; z: number; yaw: number } {
  const spawnZ = MAP_SPAWN_Z[mapId] ?? 29;
  const xOffsets = [0, -4.2, 4.2, -8.4, 8.4];
  const ox = xOffsets[indexInTeam % xOffsets.length];
  if (team === 'alpha') {
    return { x: ox, z: spawnZ, yaw: 0 };
  }
  return { x: ox, z: -spawnZ, yaw: Math.PI };
}

function buildInitialBotsForRoom(room: ServerRoom): MpBotSnapshot[] {
  if (!room.fillBots) return [];
  const alphaHumans = Array.from(room.players.values()).filter((p) => p.team === 'alpha').length;
  const omegaHumans = Array.from(room.players.values()).filter((p) => p.team === 'omega').length;
  const neededAlpha = Math.max(0, room.teamSize - alphaHumans);
  const neededOmega = Math.max(0, room.teamSize - omegaHumans);
  const spawnZ = MAP_SPAWN_Z[room.mapId] ?? 29;

  const alphaNames = ['VANGUARD', 'CYBER-A', 'PULSE-A', 'NOVA-A', 'SPECTER'];
  const omegaNames = ['CRIMSON', 'NEMESIS', 'VIPER-X', 'APEX-O', 'RAVEN-9'];
  const result: MpBotSnapshot[] = [];

  for (let i = 0; i < neededAlpha; i++) {
    const xOffsets = [-4.2, 4.2, -8.4, 8.4, 0];
    result.push({
      id: `bot-alpha-${i}`,
      name: alphaNames[i % alphaNames.length],
      team: 'alpha',
      x: xOffsets[i % xOffsets.length],
      y: 0,
      z: spawnZ - 1.2,
      yaw: Math.PI,
      hp: 100,
      maxHp: 100,
      alive: true,
      knockedDown: false,
      grounded: true,
      speed: 0,
    });
  }
  for (let i = 0; i < neededOmega; i++) {
    const xOffsets = [0, -4.2, 4.2, -8.4, 8.4];
    result.push({
      id: `bot-omega-${i}`,
      name: omegaNames[i % omegaNames.length],
      team: 'omega',
      x: xOffsets[i % xOffsets.length],
      y: 0,
      z: -spawnZ + 1.2,
      yaw: 0,
      hp: 100,
      maxHp: 100,
      alive: true,
      knockedDown: false,
      grounded: true,
      speed: 0,
    });
  }
  return result;
}

function pickBalancedTeam(room: ServerRoom): MpTeam {
  let alpha = 0;
  let omega = 0;
  for (const p of room.players.values()) {
    if (p.team === 'alpha') alpha += 1;
    else omega += 1;
  }
  if (omega < alpha && omega < room.teamSize) return 'omega';
  if (alpha < room.teamSize) return 'alpha';
  return omega < room.teamSize ? 'omega' : alpha <= omega ? 'alpha' : 'omega';
}

function enterRoundQuiz(room: ServerRoom, roundNum: number): void {
  room.phase = 'ROUND_QUIZ';
  room.roundNumber = roundNum;
  room.quizTimer = QUIZ_GATE_DURATION_SEC;
  room.roundBanner = `ROUND ${roundNum} KNOWLEDGE GATE`;
  room.killFeed = [];
  room.orbActive = true;
  room.orbRespawnTimer = 0;

  let alphaIdx = 0;
  let omegaIdx = 0;
  for (const p of room.players.values()) {
    const idx = p.team === 'alpha' ? alphaIdx++ : omegaIdx++;
    const sp = spawnPositionForPlayer(room.mapId, p.team, idx);
    p.ready = false;
    p.alive = true;
    p.bonusHp = 0;
    p.damageMult = 1;
    p.perkLabel = null;
    p.maxHp = 100;
    p.hp = 100;
    p.x = sp.x;
    p.y = 1.75;
    p.z = sp.z;
    p.yaw = sp.yaw;
    p.pitch = 0;
    p.sliding = false;
    p.speed = 0;
    p.grounded = true;
  }
  room.bots = buildInitialBotsForRoom(room);
  broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
}

function beginActiveRound(room: ServerRoom): void {
  room.phase = 'PLAYING';
  room.roundTimer = ROUND_DURATION_SEC;
  room.roundBanner = `ROUND ${room.roundNumber} — FIGHT`;
  room.orbActive = true;
  room.orbRespawnTimer = 0;
  room.killFeed = [];

  let alphaIdx = 0;
  let omegaIdx = 0;
  for (const p of room.players.values()) {
    const idx = p.team === 'alpha' ? alphaIdx++ : omegaIdx++;
    const sp = spawnPositionForPlayer(room.mapId, p.team, idx);
    p.alive = true;
    p.maxHp = 100 + p.bonusHp;
    p.hp = p.maxHp;
    p.x = sp.x;
    p.y = 1.75;
    p.z = sp.z;
    p.yaw = sp.yaw;
    p.pitch = 0;
    p.sliding = false;
    p.speed = 0;
    p.grounded = true;
  }
  room.bots = buildInitialBotsForRoom(room);

  const snapshot = toRoomSnapshot(room);
  broadcastToRoom(room, {
    type: 'round_started',
    roundNumber: room.roundNumber,
    room: snapshot,
  });
}

function finishRoomRound(room: ServerRoom, winningTeam: MpTeam, reason: string): void {
  if (room.phase !== 'PLAYING') return;
  if (winningTeam === 'alpha') {
    room.alphaRounds += 1;
  } else {
    room.omegaRounds += 1;
  }
  const winnerLabel = winningTeam === 'alpha' ? 'ALPHA' : 'OMEGA';
  room.roundBanner = `${winnerLabel} WINS ROUND ${room.roundNumber} · ${reason}`;

  if (room.alphaRounds >= ROUNDS_TO_WIN || room.omegaRounds >= ROUNDS_TO_WIN) {
    room.phase = 'GAME_OVER';
    room.roundEndTimer = 0;
  } else {
    room.phase = 'ROUND_END';
    room.roundEndTimer = ROUND_END_DURATION_SEC;
  }
  broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
}

function evaluateElimination(room: ServerRoom, reasonHint: string): void {
  if (room.phase !== 'PLAYING') return;
  const alphaHumansAlive = Array.from(room.players.values()).filter(
    (p) => p.team === 'alpha' && p.alive
  ).length;
  const omegaHumansAlive = Array.from(room.players.values()).filter(
    (p) => p.team === 'omega' && p.alive
  ).length;
  const alphaBotsAlive = room.bots.filter((b) => b.team === 'alpha' && b.alive).length;
  const omegaBotsAlive = room.bots.filter((b) => b.team === 'omega' && b.alive).length;

  const alphaTotal = alphaHumansAlive + alphaBotsAlive;
  const omegaTotal = omegaHumansAlive + omegaBotsAlive;

  if (omegaTotal === 0 && alphaTotal > 0) {
    finishRoomRound(room, 'alpha', reasonHint);
  } else if (alphaTotal === 0 && omegaTotal > 0) {
    finishRoomRound(room, 'omega', reasonHint);
  } else if (alphaTotal === 0 && omegaTotal === 0) {
    finishRoomRound(room, 'alpha', reasonHint);
  }
}

function leaveCurrentRoom(session: ClientSession): void {
  if (!session.roomCode) return;
  const room = rooms.get(session.roomCode);
  session.roomCode = null;
  if (!room) return;

  room.players.delete(session.id);
  if (room.players.size === 0) {
    rooms.delete(room.code);
  } else {
    if (room.hostId === session.id) {
      const nextHost = room.players.keys().next().value;
      if (nextHost) room.hostId = nextHost;
    }
    if (room.phase === 'PLAYING') {
      evaluateElimination(room, 'Squad Disconnected');
    }
    broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
  }
  safeSend(session.ws, { type: 'room_left' });
  broadcastLobbyRooms();
}

function addPlayerToRoom(session: ClientSession, room: ServerRoom): boolean {
  if (room.players.size >= 10) {
    safeSend(session.ws, { type: 'room_error', message: 'Room is full (10/10 players).' });
    return false;
  }

  leaveCurrentRoom(session);
  const team = pickBalancedTeam(room);
  const teamCount = Array.from(room.players.values()).filter((p) => p.team === team).length;
  const sp = spawnPositionForPlayer(room.mapId, team, teamCount);

  const playerInfo: MpPlayerInfo = {
    id: session.id,
    name: session.name,
    team,
    ready: false,
    connected: true,
    alive: room.phase === 'PLAYING' ? false : true,
    hp: 100,
    maxHp: 100,
    kills: 0,
    deaths: 0,
    damageDealt: 0,
    x: sp.x,
    y: 1.75,
    z: sp.z,
    yaw: sp.yaw,
    pitch: 0,
    sliding: false,
    eyeHeight: 1.75,
    activeSlot: 0,
    primary: session.primary,
    secondary: session.secondary,
    speed: 0,
    grounded: true,
    perkLabel: null,
    damageMult: 1,
    bonusHp: 0,
  };

  room.players.set(session.id, playerInfo);
  session.roomCode = room.code;

  if (room.phase === 'LOBBY') {
    room.bots = buildInitialBotsForRoom(room);
  }

  broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
  broadcastLobbyRooms();
  return true;
}

async function bootstrap(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      uptime: Math.round(process.uptime()),
      activeRooms: rooms.size,
      connectedPlayers: sessions.size,
    });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getRoomSummaries() });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const playerId = `p_${crypto.randomBytes(4).toString('hex')}`;
    const session: ClientSession = {
      id: playerId,
      ws,
      name: `STRIKER-${playerId.slice(-3).toUpperCase()}`,
      primary: 'assault_rifle',
      secondary: 'revolver',
      roomCode: null,
      lastAliveAt: Date.now(),
    };
    sessions.set(playerId, session);

    safeSend(ws, {
      type: 'welcome',
      playerId,
      rooms: getRoomSummaries(),
    });

    ws.on('message', (raw) => {
      session.lastAliveAt = Date.now();
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        return;
      }

      if (msg.type === 'ping') {
        safeSend(ws, { type: 'pong', t: msg.t, serverTime: Date.now() });
        return;
      }

      if (msg.type === 'hello' || msg.type === 'set_profile') {
        const cleanName = (msg.name || '').trim().slice(0, 16);
        if (cleanName) session.name = cleanName.toUpperCase();
        if (msg.primary) session.primary = msg.primary;
        if (msg.secondary) session.secondary = msg.secondary;
        if (session.roomCode) {
          const room = rooms.get(session.roomCode);
          const p = room?.players.get(session.id);
          if (room && p) {
            p.name = session.name;
            p.primary = session.primary;
            p.secondary = session.secondary;
            broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
          }
        }
        return;
      }

      if (msg.type === 'list_rooms') {
        safeSend(ws, { type: 'rooms_list', rooms: getRoomSummaries() });
        return;
      }

      if (msg.type === 'create_room') {
        const mapId = VALID_MAPS.has(msg.mapId) ? msg.mapId : 'splash';
        const teamSize = VALID_TEAM_SIZES.has(msg.teamSize) ? msg.teamSize : 2;
        const difficulty = VALID_DIFFS.has(msg.difficulty) ? msg.difficulty : 'ranked';
        const code = generateRoomCode();
        const room: ServerRoom = {
          code,
          name: (msg.name || `${session.name}'S ARENA`).trim().slice(0, 26),
          hostId: session.id,
          mapId,
          teamSize,
          difficulty,
          fillBots: Boolean(msg.fillBots),
          phase: 'LOBBY',
          roundNumber: 1,
          alphaRounds: 0,
          omegaRounds: 0,
          roundTimer: ROUND_DURATION_SEC,
          quizTimer: QUIZ_GATE_DURATION_SEC,
          roundEndTimer: 0,
          roundBanner: null,
          orbActive: true,
          orbRespawnTimer: 0,
          players: new Map(),
          bots: [],
          killFeed: [],
          nextEventId: 1,
          createdAt: Date.now(),
        };
        rooms.set(code, room);
        addPlayerToRoom(session, room);
        if (msg.autoStart) {
          room.alphaRounds = 0;
          room.omegaRounds = 0;
          enterRoundQuiz(room, 1);
          broadcastLobbyRooms();
        }
        return;
      }

      if (msg.type === 'join_room') {
        const code = (msg.code || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          safeSend(ws, { type: 'room_error', message: `Room ${code} not found.` });
          return;
        }
        addPlayerToRoom(session, room);
        return;
      }

      if (msg.type === 'quick_join') {
        // Join an open LOBBY or active room on preferred map/teamSize, else create one
        let targetRoom: ServerRoom | null = null;
        for (const r of rooms.values()) {
          if (r.players.size < r.teamSize * 2 && (r.phase === 'LOBBY' || r.phase === 'ROUND_QUIZ')) {
            targetRoom = r;
            break;
          }
        }
        if (targetRoom) {
          addPlayerToRoom(session, targetRoom);
          return;
        }
        const mapId = VALID_MAPS.has(msg.mapId) ? msg.mapId : 'splash';
        const teamSize = VALID_TEAM_SIZES.has(msg.teamSize) ? msg.teamSize : 2;
        const difficulty = VALID_DIFFS.has(msg.difficulty) ? msg.difficulty : 'ranked';
        const code = generateRoomCode();
        const room: ServerRoom = {
          code,
          name: `${session.name}'S SQUAD`,
          hostId: session.id,
          mapId,
          teamSize,
          difficulty,
          fillBots: Boolean(msg.fillBots),
          phase: 'LOBBY',
          roundNumber: 1,
          alphaRounds: 0,
          omegaRounds: 0,
          roundTimer: ROUND_DURATION_SEC,
          quizTimer: QUIZ_GATE_DURATION_SEC,
          roundEndTimer: 0,
          roundBanner: null,
          orbActive: true,
          orbRespawnTimer: 0,
          players: new Map(),
          bots: [],
          killFeed: [],
          nextEventId: 1,
          createdAt: Date.now(),
        };
        rooms.set(code, room);
        addPlayerToRoom(session, room);
        return;
      }

      if (msg.type === 'leave_room') {
        leaveCurrentRoom(session);
        return;
      }

      const room = session.roomCode ? rooms.get(session.roomCode) : undefined;
      if (!room) return;
      const player = room.players.get(session.id);
      if (!player) return;

      if (msg.type === 'update_room') {
        if (room.hostId !== session.id) return;
        if (msg.mapId && VALID_MAPS.has(msg.mapId)) room.mapId = msg.mapId;
        if (msg.teamSize && VALID_TEAM_SIZES.has(msg.teamSize)) room.teamSize = msg.teamSize;
        if (msg.difficulty && VALID_DIFFS.has(msg.difficulty)) room.difficulty = msg.difficulty;
        if (typeof msg.fillBots === 'boolean') room.fillBots = msg.fillBots;
        room.bots = buildInitialBotsForRoom(room);
        broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
        broadcastLobbyRooms();
        return;
      }

      if (msg.type === 'switch_team') {
        if (room.phase !== 'LOBBY') return;
        const desired: MpTeam =
          msg.team === 'alpha' || msg.team === 'omega'
            ? msg.team
            : player.team === 'alpha'
              ? 'omega'
              : 'alpha';
        player.team = desired;
        room.bots = buildInitialBotsForRoom(room);
        broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
        return;
      }

      if (msg.type === 'set_ready') {
        player.ready = Boolean(msg.ready);
        broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
        return;
      }

      if (msg.type === 'start_match') {
        if (room.hostId !== session.id) return;
        room.alphaRounds = 0;
        room.omegaRounds = 0;
        for (const p of room.players.values()) {
          p.kills = 0;
          p.deaths = 0;
          p.damageDealt = 0;
        }
        enterRoundQuiz(room, 1);
        broadcastLobbyRooms();
        return;
      }

      if (msg.type === 'request_rematch') {
        if (room.phase !== 'GAME_OVER' && room.hostId !== session.id) return;
        room.alphaRounds = 0;
        room.omegaRounds = 0;
        for (const p of room.players.values()) {
          p.kills = 0;
          p.deaths = 0;
          p.damageDealt = 0;
        }
        enterRoundQuiz(room, 1);
        broadcastLobbyRooms();
        return;
      }

      if (msg.type === 'quiz_ready') {
        if (room.phase !== 'ROUND_QUIZ') return;
        player.ready = true;
        player.perkLabel = msg.perkLabel;
        player.bonusHp = Math.min(40, Math.max(0, Number(msg.bonusHp) || 0));
        player.damageMult = Math.min(1.25, Math.max(1, Number(msg.damageMult) || 1));

        const allReady = Array.from(room.players.values()).every((p) => p.ready);
        if (allReady) {
          beginActiveRound(room);
        } else {
          broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
        }
        return;
      }

      if (msg.type === 'player_state') {
        if (!player.alive || room.phase !== 'PLAYING') return;
        player.x = msg.x;
        player.y = msg.y;
        player.z = msg.z;
        player.yaw = msg.yaw;
        player.pitch = msg.pitch;
        player.sliding = Boolean(msg.sliding);
        player.eyeHeight = msg.eyeHeight;
        player.activeSlot = msg.activeSlot;
        player.primary = msg.primary;
        player.secondary = msg.secondary;
        player.speed = msg.speed;
        player.grounded = Boolean(msg.grounded);
        return;
      }

      if (msg.type === 'fire_fx') {
        broadcastToRoom(
          room,
          {
            type: 'fire_fx',
            shooterId: session.id,
            weaponId: msg.weaponId,
            from: msg.from,
            to: msg.to,
            colorHex: msg.colorHex,
            hitWater: msg.hitWater,
            explosion: msg.explosion,
            splashRadius: msg.splashRadius,
          },
          session.id
        );
        return;
      }

      if (msg.type === 'melee_fx') {
        broadcastToRoom(
          room,
          {
            type: 'melee_fx',
            shooterId: session.id,
            origin: msg.origin,
            dir: msg.dir,
            colorHex: msg.colorHex,
          },
          session.id
        );
        return;
      }

      if (msg.type === 'water_ripple') {
        broadcastToRoom(
          room,
          {
            type: 'water_ripple',
            playerId: session.id,
            x: msg.x,
            z: msg.z,
            strength: msg.strength,
          },
          session.id
        );
        return;
      }

      if (msg.type === 'bounce_pad') {
        broadcastToRoom(
          room,
          {
            type: 'bounce_pad',
            playerId: session.id,
            padIndex: msg.padIndex,
            x: msg.x,
            z: msg.z,
          },
          session.id
        );
        return;
      }

      if (msg.type === 'hit_player') {
        if (room.phase !== 'PLAYING' || !player.alive) return;
        const target = room.players.get(msg.targetId);
        if (!target || !target.alive || target.team === player.team) return;

        const clampedDamage = Math.max(1, Math.min(220, Math.round(msg.damage)));
        target.hp = Math.max(0, target.hp - clampedDamage);
        player.damageDealt += clampedDamage;

        broadcastToRoom(room, {
          type: 'player_damaged',
          targetId: target.id,
          attackerId: player.id,
          attackerName: player.name,
          damage: clampedDamage,
          newHp: target.hp,
          headshot: Boolean(msg.headshot),
          hitPoint: msg.hitPoint,
        });

        if (target.hp <= 0) {
          target.alive = false;
          target.deaths += 1;
          player.kills += 1;
          const entry: MpKillFeedEvent = {
            id: room.nextEventId++,
            killerName: player.name,
            killerTeam: player.team,
            victimName: target.name,
            victimTeam: target.team,
            headshot: Boolean(msg.headshot),
          };
          room.killFeed = [...room.killFeed.slice(-3), entry];
          broadcastToRoom(room, {
            type: 'entity_killed',
            killerId: player.id,
            killerName: player.name,
            killerTeam: player.team,
            victimId: target.id,
            victimName: target.name,
            victimTeam: target.team,
            victimIsBot: false,
            headshot: Boolean(msg.headshot),
            pos: msg.hitPoint,
            finisherId: msg.finisherId,
            colorHex: msg.colorHex,
            killFeedEntry: entry,
          });
          evaluateElimination(
            room,
            msg.headshot ? 'Headshot Elimination' : 'Squad Eliminated'
          );
        }
        return;
      }

      if (msg.type === 'hit_bot') {
        if (room.phase !== 'PLAYING' || !player.alive) return;
        const bot = room.bots.find((b) => b.id === msg.botId);
        if (!bot || !bot.alive || bot.team === player.team) return;

        const clampedDamage = Math.max(1, Math.min(220, Math.round(msg.damage)));
        bot.hp = Math.max(0, bot.hp - clampedDamage);
        player.damageDealt += clampedDamage;

        broadcastToRoom(room, {
          type: 'bot_damaged',
          botId: bot.id,
          attackerId: player.id,
          attackerName: player.name,
          damage: clampedDamage,
          newHp: bot.hp,
          headshot: Boolean(msg.headshot),
          hitPoint: msg.hitPoint,
        });

        if (bot.hp <= 0) {
          bot.alive = false;
          bot.knockedDown = true;
          player.kills += 1;
          const entry: MpKillFeedEvent = {
            id: room.nextEventId++,
            killerName: player.name,
            killerTeam: player.team,
            victimName: bot.name,
            victimTeam: bot.team,
            headshot: Boolean(msg.headshot),
          };
          room.killFeed = [...room.killFeed.slice(-3), entry];
          broadcastToRoom(room, {
            type: 'entity_killed',
            killerId: player.id,
            killerName: player.name,
            killerTeam: player.team,
            victimId: bot.id,
            victimName: bot.name,
            victimTeam: bot.team,
            victimIsBot: true,
            headshot: Boolean(msg.headshot),
            pos: [bot.x, bot.y + 1.2, bot.z],
            finisherId: msg.finisherId,
            colorHex: msg.colorHex,
            killFeedEntry: entry,
          });
          evaluateElimination(
            room,
            msg.headshot ? 'Headshot Elimination' : 'Enemy Squad Eliminated'
          );
        }
        return;
      }

      if (msg.type === 'bot_damage_player') {
        if (room.phase !== 'PLAYING' || session.id !== room.hostId) return;
        const target = room.players.get(msg.targetPlayerId);
        if (!target || !target.alive) return;
        const clamped = Math.max(1, Math.min(60, Math.round(msg.damage)));
        target.hp = Math.max(0, target.hp - clamped);
        broadcastToRoom(room, {
          type: 'player_damaged',
          targetId: target.id,
          attackerId: 'bot',
          attackerName: msg.botName,
          damage: clamped,
          newHp: target.hp,
          headshot: Boolean(msg.headshot),
          hitPoint: [target.x, target.y, target.z],
        });
        if (target.hp <= 0) {
          target.alive = false;
          target.deaths += 1;
          const killerTeam: MpTeam = target.team === 'alpha' ? 'omega' : 'alpha';
          const entry: MpKillFeedEvent = {
            id: room.nextEventId++,
            killerName: msg.botName,
            killerTeam,
            victimName: target.name,
            victimTeam: target.team,
            headshot: Boolean(msg.headshot),
          };
          room.killFeed = [...room.killFeed.slice(-3), entry];
          broadcastToRoom(room, {
            type: 'entity_killed',
            killerId: 'bot',
            killerName: msg.botName,
            killerTeam,
            victimId: target.id,
            victimName: target.name,
            victimTeam: target.team,
            victimIsBot: false,
            headshot: Boolean(msg.headshot),
            pos: [target.x, Math.max(0.2, target.y - 0.6), target.z],
            finisherId: 'standard',
            colorHex: '#f43f5e',
            killFeedEntry: entry,
          });
          evaluateElimination(room, 'Eliminated by Rival');
        }
        return;
      }

      if (msg.type === 'bots_sync') {
        if (session.id !== room.hostId || room.phase !== 'PLAYING') return;
        // Host updates bot kinematic positions while preserving server-authoritative HP/alive state
        const byId = new Map(room.bots.map((b) => [b.id, b]));
        for (const incoming of msg.bots) {
          const existing = byId.get(incoming.id);
          if (existing) {
            existing.x = incoming.x;
            existing.y = incoming.y;
            existing.z = incoming.z;
            existing.yaw = incoming.yaw;
            existing.grounded = incoming.grounded;
            existing.speed = incoming.speed;
            // Bot-vs-Bot HP reductions reported by host simulation
            if (incoming.hp < existing.hp && existing.alive) {
              existing.hp = Math.max(0, Math.round(incoming.hp));
              if (existing.hp <= 0) {
                existing.alive = false;
                existing.knockedDown = true;
                const killerTeam: MpTeam = existing.team === 'alpha' ? 'omega' : 'alpha';
                const entry: MpKillFeedEvent = {
                  id: room.nextEventId++,
                  killerName: killerTeam === 'alpha' ? 'ALPHA SQUAD' : 'OMEGA SQUAD',
                  killerTeam,
                  victimName: existing.name,
                  victimTeam: existing.team,
                  headshot: false,
                };
                room.killFeed = [...room.killFeed.slice(-3), entry];
                evaluateElimination(room, 'Enemy Squad Eliminated');
              }
            }
          }
        }
        return;
      }

      if (msg.type === 'orb_pickup') {
        if (room.phase !== 'PLAYING' || !player.alive || !room.orbActive) return;
        room.orbActive = false;
        room.orbRespawnTimer = 16;
        player.hp = Math.min(player.maxHp, player.hp + 20);
        for (const other of room.players.values()) {
          if (other.id !== player.id && other.team === player.team && other.alive) {
            other.hp = Math.min(other.maxHp, other.hp + 15);
          }
        }
        for (const bot of room.bots) {
          if (bot.team === player.team && bot.alive) {
            bot.hp = Math.min(bot.maxHp, bot.hp + 15);
          }
        }
        broadcastToRoom(room, {
          type: 'orb_collected',
          playerId: player.id,
          playerName: player.name,
          team: player.team,
        });
        broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
        return;
      }

      if (msg.type === 'medkit_heal') {
        if (room.phase !== 'PLAYING' || !player.alive) return;
        const amt = Math.max(1, Math.min(90, Math.round(msg.amount)));
        player.hp = Math.min(player.maxHp, player.hp + amt);
        broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom(session);
      sessions.delete(playerId);
    });
  });

  // Authoritative 20Hz simulation & snapshot tick across all multiplayer rooms
  let lastTickMs = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = Math.min(0.25, (now - lastTickMs) / 1000);
    lastTickMs = now;

    for (const room of rooms.values()) {
      if (room.phase === 'ROUND_QUIZ') {
        room.quizTimer = Math.max(0, room.quizTimer - dt);
        if (room.quizTimer <= 0) {
          beginActiveRound(room);
        } else {
          broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
        }
      } else if (room.phase === 'PLAYING') {
        room.roundTimer = Math.max(0, room.roundTimer - dt);
        if (!room.orbActive) {
          room.orbRespawnTimer = Math.max(0, room.orbRespawnTimer - dt);
          if (room.orbRespawnTimer <= 0) {
            room.orbActive = true;
          }
        }

        if (room.roundTimer <= 0) {
          const alphaAlive =
            Array.from(room.players.values()).filter((p) => p.team === 'alpha' && p.alive).length +
            room.bots.filter((b) => b.team === 'alpha' && b.alive).length;
          const omegaAlive =
            Array.from(room.players.values()).filter((p) => p.team === 'omega' && p.alive).length +
            room.bots.filter((b) => b.team === 'omega' && b.alive).length;
          const alphaHp =
            Array.from(room.players.values())
              .filter((p) => p.team === 'alpha' && p.alive)
              .reduce((a, p) => a + p.hp, 0) +
            room.bots.filter((b) => b.team === 'alpha' && b.alive).reduce((a, b) => a + b.hp, 0);
          const omegaHp =
            Array.from(room.players.values())
              .filter((p) => p.team === 'omega' && p.alive)
              .reduce((a, p) => a + p.hp, 0) +
            room.bots.filter((b) => b.team === 'omega' && b.alive).reduce((a, b) => a + b.hp, 0);

          const winner: MpTeam =
            alphaAlive !== omegaAlive
              ? alphaAlive > omegaAlive
                ? 'alpha'
                : 'omega'
              : alphaHp >= omegaHp
                ? 'alpha'
                : 'omega';
          finishRoomRound(room, winner, 'Time Expired');
        } else {
          broadcastToRoom(room, { type: 'room_snapshot', room: toRoomSnapshot(room) });
        }
      } else if (room.phase === 'ROUND_END') {
        room.roundEndTimer = Math.max(0, room.roundEndTimer - dt);
        if (room.roundEndTimer <= 0) {
          enterRoundQuiz(room, room.roundNumber + 1);
        }
      }
    }
  }, 50);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Shell Shockers Multiplayer server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
