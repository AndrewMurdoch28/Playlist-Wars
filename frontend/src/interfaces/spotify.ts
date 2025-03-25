export enum RepeatState {
  TRACK = "track",
  CONTEXT = "context",
  OFF = "off",
}

export interface PlayerState {
  disallows: { [key: string]: boolean }; // Map of actions that are disallowed (e.g., play, pause)
  context: any | null; // The context of the current playback (e.g., playlist, album, etc.)
  currently_playing_type: string; // The type of the currently playing item (e.g., track, episode)
  device: Device; // Information about the device that is currently playing
  is_playing: boolean; // Whether a track is currently playing
  item: Item; // The current item (track, episode, etc.)
  progress_ms: number; // The current position in the track in milliseconds
  repeat_state: string; // Repeat state (e.g., "off", "track", "context")
  shuffle_state: boolean; // Whether shuffle is enabled
  smart_shuffle: boolean; // Whether smart shuffle is enabled
  timestamp: number; // The timestamp of when the state was retrieved
}

export interface Item {
  album: Album;
  artists: Artist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: ExternalIds;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  popularity: number;
  preview_url: string | null;
  track_number: number;
  type: string;
  uri: string;
}

export interface Device {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  supports_volume: boolean;
  type: string;
  volume_percent: number;
}

export interface ExternalUrls {
  spotify: string;
}

export interface ExternalIds {
  isrc: string;
}

export interface Artist {
  id: string;
  name: string;
  href: string;
  external_urls: ExternalUrls;
}

export interface Album {
  album_type: string;
  artists: Artist[];
  available_markets: string[];
  external_urls: ExternalUrls;
  href: string;
  id: string;
  images: Image[];
  name: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: string;
  uri: string;
}

export interface Image {
  height: number;
  url: string;
  width: number;
}

export interface Track {
  album: Album;
  artists: Artist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: ExternalIds;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  popularity: number;
  preview_url: string | null;
  track_number: number;
  type: string;
  uri: string;
}
