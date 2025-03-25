import { defineStore } from "pinia";
import { ref } from "vue";
import { axiosApi } from "./axios";
import axios from "axios";
import { Track } from "../interfaces/game";
import { PlayerState, RepeatState } from "../interfaces/spotify";

export const useSpotifyStore = defineStore("spotify", () => {
  const accessToken = ref<string>();

  const playerState = ref<PlayerState>();

  const readAccessToken = async () => {
    const response = await axiosApi.get("/spotify/token");
    accessToken.value = response.data.access_token;
    return accessToken.value;
  };

  const readPlaylists = async (playlistURLs: string[]) => {
    try {
      const response = await axiosApi.post("/spotify/playlists", {
        playlistURLs,
      });
      return response.data;
    } catch (error) {
      return { success: false, failedAtIndex: true };
    }
  };

  const getAlbumCover = async (url: string) => {
    const response = await axiosApi.post(`/spotify/albumCover`, { url });
    return response.data.albumCoverUrl;
  };

  const refreshPlayerState = () => {
    axios
      .get("https://api.spotify.com/v1/me/player", {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      .then((response) => {
        playerState.value = response.data;
      })
      .catch((error) => {
        console.error("Error fetching player state:", error);
      });
  };

  const playTrack = async (url: string) => {
    await axiosApi
      .put("/spotify/playSong", {
        url,
      })
      .then(() => {
        setTimeout(refreshPlayerState, 1000);
      })
      .catch((error) => {
        console.error("Error playing song:", error);
      });
  };

  const seek = (position: number) => {
    axios
      .put(
        `https://api.spotify.com/v1/me/player/seek?position_ms=${position}`,
        null,
        {
          headers: { Authorization: `Bearer ${accessToken.value}` },
        }
      )
      .then(() => {
        playerState.value!.progress_ms = position;
      })
      .catch((error) => {
        console.error("Error seeking position:", error);
      });
  };

  const setVolume = (newVolume: number) => {
    axios
      .put(
        `https://api.spotify.com/v1/me/player/volume?volume_percent=${newVolume}`,
        null,
        {
          headers: { Authorization: `Bearer ${accessToken.value}` },
        }
      )
      .then(() => {
        playerState.value!.device.volume_percent = newVolume;
      })
      .catch((error) => {
        console.error("Error setting volume:", error);
      });
  };

  const setRepeat = (state: RepeatState) => {
    axios
      .put(`https://api.spotify.com/v1/me/player/repeat?state=${state}`, null, {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      .then(() => {
        playerState.value!.repeat_state = state;
      })
      .catch((error) => {
        console.error("Error setting volume:", error);
      });
  };

  const nextTrack = () => {
    axios
      .post("https://api.spotify.com/v1/me/player/next", null, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`,
        },
      })
      .then(() => {
        setTimeout(refreshPlayerState, 1000);
      })
      .catch((error) => {
        console.error("Error playing next track:", error);
      });
  };

  const previousTrack = () => {
    axios
      .post("https://api.spotify.com/v1/me/player/previous", null, {
        headers: {
          Authorization: `Bearer ${accessToken.value}`,
        },
      })
      .then(() => {
        setTimeout(refreshPlayerState, 1000);
      })
      .catch((error) => {
        console.error("Error playing previous track:", error);
      });
  };

  const togglePlayPause = () => {
    axios
      .put(
        `https://api.spotify.com/v1/me/player/${
          playerState.value!.is_playing ? "pause" : "play"
        }`,
        null,
        {
          headers: { Authorization: `Bearer ${accessToken.value}` },
        }
      )
      .then(() => {
        playerState.value!.is_playing = !playerState.value!.is_playing;
      })
      .catch((error) => {
        console.error("Error toggling play/pause:", error);
      });
  };

  const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const spotifyClientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

  const getSpotifyToken = async () => {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${btoa(
            `${spotifyClientId}:${spotifyClientSecret}`
          )}`,
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
    playerState,
    readAccessToken,
    readPlaylists,
    playTrack,
    getAlbumCover,
    refreshPlayerState,
    seek,
    setVolume,
    setRepeat,
    nextTrack,
    previousTrack,
    togglePlayPause,
    readPlaylistsFrontend,
  };
});
