<template>
  <v-card
    :elevation="hideDetails ? 0 : ''"
    color="card"
    width="90vw"
    max-width="400"
  >
    <div class="pa-2">
      <div>Spotify Player</div>
    <template v-if="!spotifyStore.player || !spotifyStore.isActive">
      <v-alert type="warning" class="mb-4">
        Open the spotify app and select
        <span style="font-weight: bolder">{{ spotifyStore.playerName }}</span>
        from the connect to device menu <v-icon>mdi-laptop</v-icon>.
      </v-alert>
    </template>
    <template v-else>
      <v-img
        v-if="!hideDetails && spotifyStore.currentTrack?.album?.images[0]?.url"
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
          v-model="spotifyStore.currentTime"
          :max="spotifyStore.duration"
          step="1000"
          hide-details
          @update:model-value="seek"
          class="ma-0"
        >
          <template v-slot:append>
            <span
              >{{ formatTime(spotifyStore.currentTime) }}/{{
                formatTime(spotifyStore.duration)
              }}</span
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
        v-model="spotifyStore.volume"
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
  </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useSpotifyStore } from "../stores/spotify";

const props = defineProps<{ hideDetails: boolean }>();

const spotifyStore = useSpotifyStore();

let interval: NodeJS.Timeout;

// Sync the player state with the store on mount
onMounted(() => {
  spotifyStore.readAccessToken().then((access_token: string | undefined) => {
    if (!access_token) {
      console.error("Undefined Access Token");
      return;
    }
    if (spotifyStore.player && spotifyStore.isActive) return;
    const player = new window.Spotify.Player({
      name: spotifyStore.playerName,
      getOAuthToken: (cb) => cb(access_token),
      volume: spotifyStore.volume,
    });

    spotifyStore.player = player;

    player.addListener("ready", ({ device_id }) => {
      spotifyStore.deviceId = device_id;
      console.log("Ready with name", spotifyStore.playerName);
    });

    player.addListener("not_ready", ({ device_id }) => {
      console.log("Device ID has gone offline", device_id);
    });

    player.addListener("player_state_changed", (state) => {
      if (!state) return;
      spotifyStore.currentTrack = state.track_window.current_track;
      spotifyStore.isPaused = state.paused;
      spotifyStore.duration = state.duration;
      spotifyStore.currentTime = state.position;

      if (interval) clearInterval(interval);
      if (!state.paused) {
        interval = setInterval(() => {
          if (spotifyStore.currentTime < spotifyStore.duration) {
            spotifyStore.currentTime += 1000;
          }
        }, 1000);
      }

      player.getCurrentState().then((state) => {
        spotifyStore.isActive = !!state;
      });
    });

    player.connect();
  });
});

const seek = (position: number) => {
  if (spotifyStore.player) {
    spotifyStore.player.seek(position);
    spotifyStore.currentTime = position;
  }
};

const setVolume = (newVolume: number) => {
  if (spotifyStore.player) {
    spotifyStore.player.setVolume(newVolume);
    spotifyStore.volume = newVolume;
  }
};

const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, "0")}`;
};
</script>
