export interface Game {
  id: string;
  players: Record<string, Player>;
  tracks: Track[];
}

export interface Player {
  id: string;
  connected: boolean;
  name: string;
  timeline: Record<string, Track[]>;
}

export interface Track {
  name: string;
  artist: string;
  releaseYear: number;
}
