import { generateRandomString } from "../lib/utils";

class GameDatabase {
  private games: Map<string, Game>;

  constructor() {
    this.games = new Map<string, Game>();
  }

  set(key: string, value: Game) {
    this.games.set(key, value);
  }

  get(key: string) {
    return this.games.get(key);
  }

  delete(key: string) {
    return this.games.delete(key);
  }

  getAll() {
    return Object.fromEntries(this.games);
  }

  clear() {
    this.games.clear();
  }
}

export const gameDatabase = new GameDatabase();

export class Game {
  id: string;
  players: Map<string, string>;
  track: Track[];

  constructor() {
    this.id = generateRandomString(5);
    this.players = new Map<string, string>();
    this.track = [];
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
