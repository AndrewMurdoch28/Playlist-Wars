import { defineStore } from "pinia";
import { ref } from "vue";
import { axiosApi } from "./axios";
import axios from "axios";
import { Track } from "../interfaces/game";

export const useSpotifyStore = defineStore("spotify", () => {
  const accessToken = ref<string>();

  const isActive = ref<boolean>(false);
  const isPaused = ref<boolean>(false);
  const currentTime = ref<number>(0);
  const duration = ref<number>(0);
  const volume = ref<number>(0.1);
  const player = ref<Spotify.Player>();
  const playerName = ref<string>(
    `Playlist Wars - ${Math.floor(Math.random() * 1000)}`
  );
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
    const response = await axiosApi.put("/spotify/playSong", {
      url,
      deviceId: deviceId.value,
    });
  };

  const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const spotifyClientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

  const getSpotifyToken = async () => {
    console.log(spotifyClientId, spotifyClientSecret);
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${btoa(`${spotifyClientId}:${spotifyClientSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data.access_token;
  };

  const readPlaylistsFrontend = async (
    playlistURLs: string[]
  ): Promise<{
    success: boolean;
    trackList: Track[];
    failedAtIndex: number | null;
  }> => {
    let index = 0;
    try {
      const trackList: Track[] = [];

      const token = await getSpotifyToken();
      const playlistIds = playlistURLs.map(
        (url) => url.split("/").pop()?.split("?")[0]
      );

      for (const playlistId of playlistIds) {
        const { data } = await axios.get(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const tracks = data.items.map((item: any) => ({
          artist: item.track.artists.map((a: any) => a.name).join(", "),
          name: item.track.name,
          releaseYear: item.track.album.release_date.split("-")[0],
          url: item.track.external_urls.spotify,
        }));

        trackList.push(...tracks);
        index++;
      }

      return { success: true, trackList, failedAtIndex: null };
    } catch (error) {
      console.error("Error fetching playlists:", error);
      return { success: false, trackList: [], failedAtIndex: index };
    }
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
    readPlaylistsFrontend,
    readPlaylists,
    playTrackFromUrl,
  };
});
