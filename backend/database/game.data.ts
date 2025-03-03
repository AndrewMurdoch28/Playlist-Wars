import { generateRandomString } from "../lib/utils";

class GameDatabase {
  private games: { [key: string]: Game };

  constructor() {
    this.games = {};
  }

  set(key: string, value: Game) {
    this.games[key] = value;
  }

  get(key: string) {
    return this.games[key] || null;
  }

  delete(key: string) {
    if (key in this.games) {
      delete this.games[key];
      return true;
    }
    return false;
  }

  getAll() {
    return { ...this.games };
  }

  clear() {
    this.games = {};
  }

  getGameForPlayer(playerId: string) {
    for (const game of Object.values(this.games)) {
      if (game.players[playerId]) {
        return game;
      }
    }
    return false;
  }
}

export const gameDatabase = new GameDatabase();

export class Game {
  id: string;
  players: { [key: string]: Player };
  tracks: Track[];

  constructor() {
    this.id = generateRandomString(5);
    this.players = {};
    this.tracks = [];
  }

  updateGame(data: Partial<this>) {
    if (data.players) {
      Object.assign(this.players, data.players);
    }
    if (data.tracks) {
      this.tracks = data.tracks;
    }
  }

  addPlayer(playerId: string, playerData: Player) {
    if (!this.players[playerId]) this.players[playerId] = playerData;
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
  timeline: { [key: string]: Track[] };

  constructor(id: string, name: string) {
    this.id = id;
    this.connected = false;
    this.name = name;
    this.timeline = {};
  }
}

export class Track {
  name: string;
  artist: string;
  releaseYear: number;

  constructor(name: string, artist: string, releaseYear: number) {
    this.name = name;
    this.artist = artist;
    this.releaseYear = releaseYear;
  }
}
