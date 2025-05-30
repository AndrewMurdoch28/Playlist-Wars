export enum TurnState {
  PlaceTimelineEntry = "PlaceTimelineEntry",
  PendingPlaceTokens = "PendingPlaceTokens",
  PlaceTokens = "PlaceTokens",
  GuessSong = "GuessSong",
  SongApeal = "SongApeal",
  ActionGuesses = "ActionGuesses",
}

export enum AlertType {
  Success = "success",
  Failure = "failure",
  Normal = "normal",
}

export interface Log {
  timestamp: Date;
  important: boolean;
  text: string;
}

export interface Game {
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
