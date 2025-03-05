import { defineStore } from "pinia";
import { ref } from "vue";
import { axiosApi } from "./axios";

export const useSpotifyStore = defineStore("spotify", () => {
  const accessToken = ref<string>();

  const isActive = ref<boolean>(false);
  const isPaused = ref<boolean>(false);
  const currentTime = ref<number>(0);
  const duration = ref<number>(0);
  const volume = ref<number>(0.1);
  const player = ref<Spotify.Player>();
  const playerName = ref<string>(`Playlist Wars - ${Math.floor(Math.random() * 1000)}`);
  const deviceId = ref<string | null>();
  const currentTrack = ref<Spotify.Track>();

  const readAccessToken = async () => {
    const response = await axiosApi.get("/spotify/token");
    accessToken.value = response.data.access_token;
    return accessToken.value;
  };

  const readPlaylists = async (playlistURLs: string[]) => {
    const response = await axiosApi.post("/spotify/playlists", {
      playlistURLs,
    });
    return response.data;
  };

  const playTrackFromUrl = async (url: string) => {
    const response = await axiosApi.put("/spotify/playSong", { url, deviceId: deviceId.value });
  };

  return {
    accessToken,
    isActive,
    isPaused,
    currentTime,
    duration,
    volume,
    player,
    playerName,
    deviceId,
    currentTrack,
    readAccessToken,
    readPlaylists,
    playTrackFromUrl,
  };
});
