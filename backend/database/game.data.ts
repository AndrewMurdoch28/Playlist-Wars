import { generateRandomString } from "../lib/utils";

export class GameDatabase {
  private games: Map<string, Game>;

  constructor() {
    this.games = new Map();
  }

  set(key: string, value: Game) {
    this.games.set(key, value);
  }

  get(key: string) {
    return this.games.get(key) || null;
  }

  delete(key: string) {
    return this.games.delete(key);
  }

  getAll() {
    return new Map(this.games);
  }

  clear() {
    this.games.clear();
  }

  gameForPlayer(playerId: string) {
    for (const game of this.games.values()) {
      if (game.players[playerId]) {
        return game;
      }
    }
    return false;
  }
}

export enum TurnState {
  PlaceTimelineEntry = "PlaceTimelineEntry",
  PlaceTokens = "PlaceTokens",
  GuessSong = "GuessSong",
}

export class Game {
  id: string;
  players: { [key: string]: Player };
  playlists: string[];
  tracks: Track[];
  started: boolean;
  currentTurn: Player | null;
  turnState: TurnState;
  countdown: number;
  coutdownVisible: boolean;
  activeTrack: Track | null;

  constructor() {
    this.id = generateRandomString(5);
    this.players = {};
    this.playlists = [];
    this.tracks = [];
    this.started = false;
    this.currentTurn = null;
    this.countdown = 0;
    this.coutdownVisible = false;
    this.turnState = TurnState.PlaceTimelineEntry;
    this.activeTrack = null;
  }

  updateGame(data: Partial<this>) {
    Object.assign(this, data);
  }

  addPlayer(playerId: string, playerData: Player) {
    if (!this.players[playerId]) this.players[playerId] = playerData;
  }

  getPlayer(playerId: string) {
    return this.players[playerId];
  }

  removePlayer(playerId: string) {
    delete this.players[playerId];
  }

  playerConnection(playerId: string, value: boolean) {
    if (this.players[playerId]) {
      this.players[playerId].connected = value;
    }
  }
}

export class Player {
  id: string;
  connected: boolean;
  name: string;
  turnOrder: number;
  timeline: Track[];
  timelineTokens: Token[];
  tokens: number;

  constructor(id: string, name: string, turnOrder: number) {
    this.id = id;
    this.connected = false;
    this.turnOrder = turnOrder;
    this.name = name;
    this.timeline = [];
    this.timelineTokens = [];
    this.tokens = 0;
  }
}

export interface Token {
  playerId: string;
  position: number;
}

export interface Track {
  name: string;
  artist: string;
  releaseYear: number;
  url: string;
}
