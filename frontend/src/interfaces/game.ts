export enum TurnState {
  PlaceTimelineEntry = "PlaceTimelineEntry",
  PlaceTokens = "PlaceTokens",
  GuessSong = "GuessSong",
}

export interface Game {
  id: string;
  players: { [key: string]: Player };
  playlists: string[];
  tracks: Track[];
  started: boolean;
  currentTurn: Player | null;
  turnState: TurnState;
  activeTimelineEntry: TimelineEntry | null;
}

export interface Player {
  id: string;
  connected: boolean;
  name: string;
  turnOrder: number;
  timeline: TimelineEntry[];
  timelineTokens: Token[];
  tokens: number;
}

export class Token {
  playerId: string;

  constructor(playerId: string) {
    this.playerId = playerId;
  }
}

export class TimelineEntry {
  order: number;
  track: Track;

  constructor(order: number, track: Track) {
    this.order = order;
    this.track = track;
  }
}

export interface Track {
  name: string;
  artist: string;
  releaseYear: number;
  url: string;
}
