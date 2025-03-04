<template>
  <v-card
    :elevation="hideDetails ? 0 : ''"
    color="card"
    width="90vw"
    max-width="400"
  >
    <v-card-title>Spotify Player</v-card-title>
    <v-card-text>
      <template v-if="!spotifyStore.isActive">
        <v-alert type="warning" class="mb-4">
          Open spotify app and select Web Playback SDK
        </v-alert>
      </template>
      <template v-else>
        <v-img
          v-if="
            !hideDetails && spotifyStore.currentTrack?.album?.images[0]?.url
          "
          :src="spotifyStore.currentTrack?.album?.images[0]?.url"
          class="mb-4"
          height="200"
          contain
        ></v-img>

        <div v-if="!hideDetails" class="list-container">
          <div class="list-item">
            <div class="list-item-title text-h6">
              {{ spotifyStore.currentTrack?.name }}
            </div>
            <div class="list-item-subtitle">
              {{ spotifyStore.currentTrack?.artists[0]?.name }}
            </div>
          </div>
        </div>

        <div style="display: flex">
          <v-slider
            v-model="currentTime"
            :max="duration"
            step="1000"
            hide-details
            @update:model-value="seek"
            class="ma-0"
          >
            <template v-slot:append>
              <span
                >{{ formatTime(currentTime) }}/{{ formatTime(duration) }}</span
              >
            </template>
          </v-slider>
          <v-btn-group v-if="hideDetails" class="ml-1" justify="center">
            <v-btn icon color="card" @click="spotifyStore.player?.togglePlay()">
              <v-icon>
                {{ spotifyStore.isPaused ? "mdi-play" : "mdi-pause" }}
              </v-icon>
            </v-btn>
          </v-btn-group>
        </div>

        <div v-if="!hideDetails" style="display: flex; justify-content: center">
          <v-btn-group class="mt-4" justify="center">
            <v-btn
              icon
              color="card"
              @click="spotifyStore.player?.previousTrack()"
            >
              <v-icon>mdi-skip-previous</v-icon>
            </v-btn>
            <v-btn icon color="card" @click="spotifyStore.player?.togglePlay()">
              <v-icon>
                {{ spotifyStore.isPaused ? "mdi-play" : "mdi-pause" }}
              </v-icon>
            </v-btn>
            <v-btn icon color="card" @click="spotifyStore.player?.nextTrack()">
              <v-icon>mdi-skip-next</v-icon>
            </v-btn>
          </v-btn-group>
        </div>

        <v-slider
          v-model="volume"
          min="0"
          max="1"
          step="0.01"
          hide-details
          class="mt-4"
          @update:model-value="setVolume"
        >
          <template v-slot:prepend>
            <v-icon>mdi-volume-low</v-icon>
          </template>
          <template v-slot:append>
            <v-icon>mdi-volume-high</v-icon>
          </template>
        </v-slider>
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSpotifyStore } from "../stores/spotify";

const props = defineProps<{ hideDetails: boolean }>();

const spotifyStore = useSpotifyStore();

const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.1);
let interval: NodeJS.Timeout;

onMounted(() => {
  window.onSpotifyWebPlaybackSDKReady = () => {
    spotifyStore.readAccessToken().then((access_token: string | undefined) => {
      if (!access_token) {
        console.error("Undefined Access Token");
        return;
      }
      const player = new window.Spotify.Player({
        name: "Web Playback SDK",
        getOAuthToken: (cb) => cb(access_token),
        volume: volume.value,
      });

      spotifyStore.setPlayer(player);

      player.addListener("ready", ({ device_id }) => {
        spotifyStore.deviceId = device_id;
        console.log("Ready with Device ID", device_id);
      });

      player.addListener("not_ready", ({ device_id }) => {
        console.log("Device ID has gone offline", device_id);
      });

      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        spotifyStore.setTrack(state.track_window.current_track);
        spotifyStore.setPaused(state.paused);
        duration.value = state.duration;
        currentTime.value = state.position;

        if (interval) clearInterval(interval);
        if (!state.paused) {
          interval = setInterval(() => {
            if (currentTime.value < duration.value) {
              currentTime.value += 1000;
            }
          }, 1000);
        }

        player.getCurrentState().then((state) => {
          spotifyStore.setActive(!!state);
        });
      });

      player.connect();
    });
  };

  // Load the script
  const script = document.createElement("script");
  script.src = "https://sdk.scdn.co/spotify-player.js";
  script.async = true;
  document.body.appendChild(script);
});

const seek = (position: number) => {
  if (spotifyStore.player) {
    spotifyStore.player.seek(position);
    currentTime.value = position;
  }
};

const setVolume = (newVolume: number) => {
  if (spotifyStore.player) {
    spotifyStore.player.setVolume(newVolume);
    volume.value = newVolume;
  }
};

const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, "0")}`;
};
</script>
