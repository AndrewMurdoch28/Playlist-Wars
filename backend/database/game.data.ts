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
  PendingPlaceTokens = "PendingPlaceTokens",
  PlaceTokens = "PlaceTokens",
  GuessSong = "GuessSong",
  SongApeal = "SongApeal",
  ActionGuesses = "ActionGuesses",
}

export interface TrackGuess {
  playerId: string;
  name: string;
  artist: string;
}

export interface Log {
  timestamp: Date;
  important: boolean;
  text: string;
}

export class Game {
  id: string;
  logs: Log[];
  players: { [key: string]: Player };
  playlists: string[];
  tracks: Track[];
  started: boolean;
  currentPlayerId: string | null;
  turnState: TurnState;
  activeTrack: Track | null;
  trackApeal: number | null;
  guesses: TrackGuess[];
  guessToActionId: string | null;
  tokensToBuy: number;

  constructor() {
    this.id = generateRandomString(5);
    this.logs = [];
    this.players = {};
    this.playlists = [];
    this.tracks = [];
    this.started = false;
    this.currentPlayerId = null;
    this.turnState = TurnState.PlaceTimelineEntry;
    this.activeTrack = null;
    this.trackApeal = null;
    this.guesses = [];
    this.guessToActionId = null;
    this.tokensToBuy = 5;
  }

  updateGame(data: Partial<this>) {
    Object.assign(this, data);
  }

  addPlayer(playerId: string, playerData: Player) {
    if (!this.players[playerId]) this.players[playerId] = playerData;
  }

  arePlayersReady() {
    return Object.values(this.players).every((player) => player.ready);
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
  ready: boolean;
  turnOrder: number;
  timeline: Track[];
  timelineTokens: Token[];
  tokens: number;
  action: boolean;

  constructor(id: string, name: string, turnOrder: number) {
    this.id = id;
    this.connected = false;
    this.turnOrder = turnOrder;
    this.name = name;
    this.ready = false;
    this.timeline = [];
    this.timelineTokens = [];
    this.tokens = 0;
    this.action = false;
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
