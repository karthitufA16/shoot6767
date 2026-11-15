import type {
  ClientMessage,
  MpBotSnapshot,
  MpRoomSnapshot,
  MpRoomSummary,
  MpTeam,
  ServerMessage,
} from './multiplayerTypes';
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

export type MpConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface MultiplayerClientCallbacks {
  onStatusChange?: (status: MpConnectionStatus) => void;
  onWelcome?: (playerId: string, rooms: MpRoomSummary[]) => void;
  onRoomsList?: (rooms: MpRoomSummary[]) => void;
  onRoomSnapshot?: (room: MpRoomSnapshot) => void;
  onRoundStarted?: (roundNumber: number, room: MpRoomSnapshot) => void;
  onRoomLeft?: () => void;
  onRoomError?: (message: string) => void;
  onFireFx?: (msg: Extract<ServerMessage, { type: 'fire_fx' }>) => void;
  onMeleeFx?: (msg: Extract<ServerMessage, { type: 'melee_fx' }>) => void;
  onWaterRipple?: (msg: Extract<ServerMessage, { type: 'water_ripple' }>) => void;
  onBouncePad?: (msg: Extract<ServerMessage, { type: 'bounce_pad' }>) => void;
  onPlayerDamaged?: (msg: Extract<ServerMessage, { type: 'player_damaged' }>) => void;
  onBotDamaged?: (msg: Extract<ServerMessage, { type: 'bot_damaged' }>) => void;
  onEntityKilled?: (msg: Extract<ServerMessage, { type: 'entity_killed' }>) => void;
  onOrbCollected?: (msg: Extract<ServerMessage, { type: 'orb_collected' }>) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private status: MpConnectionStatus = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private disposed = false;
  private callbacks: MultiplayerClientCallbacks = {};
  private profile: { name: string; primary: PrimaryId; secondary: SecondaryId } = {
    name: 'STRIKER',
    primary: 'assault_rifle',
    secondary: 'revolver',
  };
  private pendingInviteRoom: string | null = null;
  public playerId: string | null = null;

  public setCallbacks(cb: MultiplayerClientCallbacks): void {
    this.callbacks = cb;
  }

  public connect(initialProfile: { name: string; primary: PrimaryId; secondary: SecondaryId }): void {
    this.profile = initialProfile;
    this.disposed = false;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        this.pendingInviteRoom = roomParam.trim().toUpperCase();
      }
    }
    this.openSocket();
  }

  private setStatus(next: MpConnectionStatus): void {
    this.status = next;
    this.callbacks.onStatusChange?.(next);
  }

  private openSocket(): void {
    if (this.disposed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;
    this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.setStatus('connected');
        this.send({
          type: 'hello',
          name: this.profile.name,
          primary: this.profile.primary,
          secondary: this.profile.secondary,
        });
        if (this.pendingInviteRoom) {
          const code = this.pendingInviteRoom;
          this.pendingInviteRoom = null;
          this.joinRoom(code);
        }
        if (this.pingInterval !== null) window.clearInterval(this.pingInterval);
        this.pingInterval = window.setInterval(() => {
          this.send({ type: 'ping', t: Date.now() });
        }, 12000);
      };

      ws.onmessage = (ev) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(String(ev.data)) as ServerMessage;
        } catch {
          return;
        }
        switch (msg.type) {
          case 'welcome':
            this.playerId = msg.playerId;
            this.callbacks.onWelcome?.(msg.playerId, msg.rooms);
            break;
          case 'rooms_list':
            this.callbacks.onRoomsList?.(msg.rooms);
            break;
          case 'room_snapshot':
            this.callbacks.onRoomSnapshot?.(msg.room);
            break;
          case 'round_started':
            this.callbacks.onRoundStarted?.(msg.roundNumber, msg.room);
            break;
          case 'room_left':
            this.callbacks.onRoomLeft?.();
            break;
          case 'room_error':
            this.callbacks.onRoomError?.(msg.message);
            break;
          case 'fire_fx':
            this.callbacks.onFireFx?.(msg);
            break;
          case 'melee_fx':
            this.callbacks.onMeleeFx?.(msg);
            break;
          case 'water_ripple':
            this.callbacks.onWaterRipple?.(msg);
            break;
          case 'bounce_pad':
            this.callbacks.onBouncePad?.(msg);
            break;
          case 'player_damaged':
            this.callbacks.onPlayerDamaged?.(msg);
            break;
          case 'bot_damaged':
            this.callbacks.onBotDamaged?.(msg);
            break;
          case 'entity_killed':
            this.callbacks.onEntityKilled?.(msg);
            break;
          case 'orb_collected':
            this.callbacks.onOrbCollected?.(msg);
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        this.ws = null;
        if (this.pingInterval !== null) {
          window.clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        if (!this.disposed) {
          this.setStatus('reconnecting');
          const delay = Math.min(5000, 650 * Math.pow(1.6, this.reconnectAttempt));
          this.reconnectAttempt += 1;
          this.reconnectTimer = window.setTimeout(() => this.openSocket(), delay);
        } else {
          this.setStatus('disconnected');
        }
      };

      ws.onerror = () => {
        // Close handler manages reconnect cleanly
      };
    } catch {
      this.setStatus('disconnected');
    }
  }

  public disconnect(): void {
    this.disposed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public getStatus(): MpConnectionStatus {
    return this.status;
  }

  public send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public updateProfile(name: string, primary: PrimaryId, secondary: SecondaryId): void {
    this.profile = { name, primary, secondary };
    this.send({ type: 'set_profile', name, primary, secondary });
  }

  public refreshRooms(): void {
    this.send({ type: 'list_rooms' });
  }

  public createRoom(params: {
    name?: string;
    mapId: MapId;
    teamSize: TeamSize;
    difficulty: DifficultyId;
    fillBots: boolean;
    autoStart?: boolean;
  }): void {
    this.send({ type: 'create_room', ...params });
  }

  public joinRoom(code: string): void {
    this.send({ type: 'join_room', code: code.trim().toUpperCase() });
  }

  public quickJoin(params: {
    mapId: MapId;
    teamSize: TeamSize;
    difficulty: DifficultyId;
    fillBots: boolean;
  }): void {
    this.send({ type: 'quick_join', ...params });
  }

  public leaveRoom(): void {
    this.send({ type: 'leave_room' });
  }

  public updateRoomSettings(params: {
    mapId?: MapId;
    teamSize?: TeamSize;
    difficulty?: DifficultyId;
    fillBots?: boolean;
  }): void {
    this.send({ type: 'update_room', ...params });
  }

  public switchTeam(team?: MpTeam): void {
    this.send({ type: 'switch_team', team });
  }

  public setReady(ready: boolean): void {
    this.send({ type: 'set_ready', ready });
  }

  public startMatch(): void {
    this.send({ type: 'start_match' });
  }

  public requestRematch(): void {
    this.send({ type: 'request_rematch' });
  }

  public submitQuizReady(perkLabel: string | null, bonusHp: number, damageMult: number): void {
    this.send({ type: 'quiz_ready', perkLabel, bonusHp, damageMult });
  }

  public sendPlayerState(state: {
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
  }): void {
    this.send({ type: 'player_state', ...state });
  }

  public sendFireFx(fx: {
    weaponId: string;
    from: [number, number, number];
    to: [number, number, number];
    colorHex: number;
    hitWater?: boolean;
    explosion?: boolean;
    splashRadius?: number;
  }): void {
    this.send({ type: 'fire_fx', ...fx });
  }

  public sendMeleeFx(origin: [number, number, number], dir: [number, number, number], colorHex: number): void {
    this.send({ type: 'melee_fx', origin, dir, colorHex });
  }

  public sendWaterRipple(x: number, z: number, strength: number): void {
    this.send({ type: 'water_ripple', x, z, strength });
  }

  public sendBouncePad(padIndex: number, x: number, z: number): void {
    this.send({ type: 'bounce_pad', padIndex, x, z });
  }

  public sendHitPlayer(payload: {
    targetId: string;
    damage: number;
    headshot: boolean;
    hitPoint: [number, number, number];
    weaponId: WeaponId;
    finisherId: FinisherId;
    colorHex: string;
  }): void {
    this.send({ type: 'hit_player', ...payload });
  }

  public sendHitBot(payload: {
    botId: string;
    damage: number;
    headshot: boolean;
    hitPoint: [number, number, number];
    weaponId: WeaponId;
    finisherId: FinisherId;
    colorHex: string;
  }): void {
    this.send({ type: 'hit_bot', ...payload });
  }

  public sendBotDamagePlayer(payload: {
    botName: string;
    targetPlayerId: string;
    damage: number;
    headshot: boolean;
  }): void {
    this.send({ type: 'bot_damage_player', ...payload });
  }

  public sendBotsSync(bots: MpBotSnapshot[]): void {
    this.send({ type: 'bots_sync', bots });
  }

  public sendOrbPickup(): void {
    this.send({ type: 'orb_pickup' });
  }

  public sendMedkitHeal(amount: number): void {
    this.send({ type: 'medkit_heal', amount });
  }
}
