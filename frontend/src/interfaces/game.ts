export enum TurnState {
  PlaceTimelineEntry = "PlaceTimelineEntry",
  PendingPlaceTokens = "PendingPlaceTokens",
  PlaceTokens = "PlaceTokens",
  GuessSong = "GuessSong",
}

export enum AlertType {
  Success = "success",
  Failure = "failure",
  Normal = "normal",
}

export interface Game {
  id: string;
  players: { [key: string]: Player };
  playlists: string[];
  tracks: Track[];
  started: boolean;
  currentTurn: Player | null;
  turnState: TurnState;
  activeTrack: Track | null;
  guesses: TrackGuess[];
  guessToAction: TrackGuess | null;
}

export interface TrackGuess {
  playerId: string;
  name: string;
  artist: string;
}

export interface Player {
  id: string;
  connected: boolean;
  name: string;
  ready: boolean;
  turnOrder: number;
  timeline: Track[];
  timelineTokens: Token[];
  tokens: number;
  action: boolean;
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
