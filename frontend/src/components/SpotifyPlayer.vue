<template>
  <template
    v-if="
      !spotifyStore.playerState || !spotifyStore.playerState.device.is_active
    "
  >
    <v-alert class="mb-1" width="100vw" max-width="450" type="warning">
      <div style="font-size: 2.5rem; font-weight: bolder">Open Spotify</div>
    </v-alert>
  </template>

  <v-card
    v-else
    :elevation="hideDetails ? 0 : ''"
    color="card"
    width="100vw"
    max-width="450"
    class="pa-4 mb-1"
  >
    <v-img
      v-if="
        !hideDetails && spotifyStore.playerState?.item?.album?.images[0]?.url
      "
      :src="spotifyStore.playerState?.item?.album?.images[0]?.url"
      class="mb-4"
      height="200"
      contain
    ></v-img>

    <div v-if="!hideDetails" class="list-container">
      <div class="list-item">
        <div class="list-item-title text-h6">
          {{ spotifyStore.playerState?.item?.name }}
        </div>
        <div class="list-item-subtitle">
          {{ spotifyStore.playerState?.item?.artists[0]?.name }}
        </div>
      </div>
    </div>

    <div style="display: flex">
      <v-slider
        v-model="spotifyStore.playerState.progress_ms"
        :max="spotifyStore.playerState.item.duration_ms"
        step="1000"
        hide-details
        @end="spotifyStore.seek(spotifyStore.playerState.progress_ms)"
        class="ma-0"
      >
        <template v-slot:append>
          <span>
            {{ formatTime(spotifyStore.playerState.progress_ms) }}/{{
              formatTime(spotifyStore.playerState.item.duration_ms)
            }}
          </span>
        </template>
      </v-slider>
      <v-btn-group v-if="hideDetails" class="ml-1" justify="center">
        <v-btn icon color="card" @click="spotifyStore.togglePlayPause">
          <v-icon>
            {{ spotifyStore.playerState.is_playing ? "mdi-pause" : "mdi-play" }}
          </v-icon>
        </v-btn>
      </v-btn-group>
    </div>

    <div
      v-if="!hideDetails"
      style="display: flex; justify-content: center"
      class="mx-0"
    >
      <v-btn-group class="mt-4" justify="center">
        <v-btn icon color="card" @click="spotifyStore.previousTrack">
          <v-icon>mdi-skip-previous</v-icon>
        </v-btn>
        <v-btn icon color="card" @click="spotifyStore.togglePlayPause">
          <v-icon>
            {{ spotifyStore.playerState.is_playing ? "mdi-pause" : "mdi-play" }}
          </v-icon>
        </v-btn>
        <v-btn icon color="card" @click="spotifyStore.nextTrack">
          <v-icon>mdi-skip-next</v-icon>
        </v-btn>
      </v-btn-group>
    </div>

    <v-slider
      v-model="spotifyStore.playerState.device.volume_percent"
      min="0"
      max="100"
      step="1"
      hide-details
      class="mt-4 mx-0"
      @end="
        spotifyStore.setVolume(spotifyStore.playerState.device.volume_percent)
      "
    >
      <template v-slot:prepend>
        <v-icon>mdi-volume-low</v-icon>
      </template>
      <template v-slot:append>
        <v-icon>mdi-volume-high</v-icon>
      </template>
    </v-slider>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useSpotifyStore } from "../stores/spotify";
import axios from "axios";

const spotifyStore = useSpotifyStore();

const props = defineProps<{ hideDetails: boolean }>();

const accessToken = ref<string | null>(null);

let interval: NodeJS.Timeout;

onMounted(() => {
  spotifyStore.readAccessToken().then((token: string | undefined) => {
    if (!token) {
      console.error("Undefined Access Token");
      return;
    }
    accessToken.value = token;
    spotifyStore.refreshPlayerState();
  });
});

watch(
  () => spotifyStore.playerState,
  () => {
    if (spotifyStore.playerState?.is_playing) {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        if (
          spotifyStore.playerState!.progress_ms <
          spotifyStore.playerState!.item.duration_ms
        ) {
          spotifyStore.playerState!.progress_ms += 1000;
        }
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
  },
  { deep: true }
);

const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds.padStart(2, "0")}`;
};
</script>
