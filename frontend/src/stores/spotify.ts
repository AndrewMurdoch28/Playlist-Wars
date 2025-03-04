import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { axiosApi } from "./axios";
import axios from "axios";
import { Track } from "../interfaces/game";

export const useSpotifyStore = defineStore("spotify", () => {
  const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const spotifySecret = import.meta.env.VITE_SPOTIFY_SECRET;

  const access_token = ref<string>();

  const isActive = ref<boolean>(false);
  const isPaused = ref<boolean>(false);
  const player = ref<any>();
  const device_id = ref<string | null>();
  const currentTrack = ref<any>();

  const setActive = (newValue: boolean) => {
    isActive.value = newValue;
  };
  const setPaused = (newValue: boolean) => {
    isPaused.value = newValue;
  };
  const setPlayer = (newValue: any) => {
    player.value = newValue;
  };
  const setTrack = (newValue: Track) => {
    currentTrack.value = newValue;
  };

  const getAccessToken = async () => {
    const response = await axiosApi.get("/spotify/token");
    access_token.value = response.data.access_token;
    return access_token.value;
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

  // const playTrackFromUrl = async (url: string) => {
  //   const match = url.match(/track\/([a-zA-Z0-9]+)/);
  //   if (!match) {
  //     console.error("Invalid Spotify URL");
  //     return;
  //   }

  //   const trackId = match[1];

  //   if (!device_id.value) {
  //     console.error("Spotify player is not ready");
  //     return;
  //   }

  //   try {
  //     await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${access_token}`, {
  //       method: "PUT",
  //       headers: {
  //         Authorization: `Bearer ${access_token.value}`,
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         uris: [`spotify:track:${trackId}`],
  //       }),
  //     });
  //   } catch (error) {
  //     console.error("Error playing track:", error);
  //   }
  // };

  // const getSpotifyToken = async () => {
  //   const response = await axios.post(
  //     "https://accounts.spotify.com/api/token",
  //     new URLSearchParams({ grant_type: "client_credentials" }),
  //     {
  //       headers: {
  //         Authorization: `Basic ${btoa(`${spotifyClientId}:${spotifySecret}`)}`,
  //         "Content-Type": "application/x-www-form-urlencoded",
  //       },
  //     }
  //   );
  //   access_token.value = response.data.access_token;
  //   return response.data.access_token;
  // };

  // const readPlaylists = async (
  //   playlistURLs: string[]
  // ): Promise<{
  //   success: boolean;
  //   trackList: Track[];
  //   failedAtIndex: number | null;
  // }> => {
  //   let index = 0;
  //   try {
  //     const trackList: Track[] = [];

  //     const token = await getSpotifyToken();
  //     const playlistIds = playlistURLs.map(
  //       (url) => url.split("/").pop()?.split("?")[0]
  //     );

  //     for (const playlistId of playlistIds) {
  //       const { data } = await axios.get(
  //         `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
  //         { headers: { Authorization: `Bearer ${token}` } }
  //       );

  //       const tracks = data.items.map((item: any) => ({
  //         artist: item.track.artists.map((a: any) => a.name).join(", "),
  //         name: item.track.name,
  //         releaseYear: item.track.album.release_date.split("-")[0],
  //         url: item.track.external_urls.spotify,
  //       }));

  //       trackList.push(...tracks);
  //       index++;
  //     }

  //     return { success: true, trackList, failedAtIndex: null };
  //   } catch (error) {
  //     console.error("Error fetching playlists:", error);
  //     return { success: false, trackList: [], failedAtIndex: index };
  //   }
  // };

  return {
    access_token,
    isActive,
    isPaused,
    player,
    device_id,
    currentTrack,
    playTrackFromUrl,
    getAccessToken,
    setActive,
    setPaused,
    setPlayer,
    setTrack,
    readPlaylists,
  };
});
