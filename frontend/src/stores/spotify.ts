import { defineStore } from "pinia";
import { ref } from "vue";
import { axiosApi } from "./axios";

export const useSpotifyStore = defineStore("spotify", () => {
  const accessToken = ref<string>();

  const isActive = ref<boolean>(false);
  const isPaused = ref<boolean>(false);
  const player = ref<any>();
  const deviceId = ref<string | null>();
  const currentTrack = ref<any>();

  const setActive = (newValue: boolean) => {
    isActive.value = newValue;
  };
  const setPaused = (newValue: boolean) => {
    isPaused.value = newValue;
  };
  const setPlayer = (newValue: Spotify.Player) => {
    player.value = newValue;
  };
  const setTrack = (newValue: Spotify.Track) => {
    currentTrack.value = newValue;
  };

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
    const response = await axiosApi.put("/spotify/playSong", { url });
  };

  return {
    accessToken,
    isActive,
    isPaused,
    player,
    deviceId,
    currentTrack,
    setActive,
    setPaused,
    setPlayer,
    setTrack,
    readAccessToken,
    readPlaylists,
    playTrackFromUrl,
  };
});
