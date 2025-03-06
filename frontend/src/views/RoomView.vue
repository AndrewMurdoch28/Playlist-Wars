<script setup lang="ts">
import { useGameStore } from "../stores/game";
import { ref, watch } from "vue";
import { useSpotifyStore } from "../stores/spotify";
import PlaySpotify from "../components/PlaySpotify.vue";

const gameStore = useGameStore();
const spotifyStore = useSpotifyStore();

const nameError = ref<boolean>(false);
const timeout = ref();
const playlistUrls = ref<string[]>(gameStore.getPlaylists || []);
const loading = ref<boolean>(false);
const errorMessage = ref<string>("");
const errorIndex = ref<number | null>();

watch(
  () => gameStore.getPlaylists,
  (newVal) => {
    if (newVal) {
      playlistUrls.value = [...newVal];
    }
  },
  { deep: true, immediate: true }
);

const startGame = async () => {
  loading.value = true;
  const result = await spotifyStore.readPlaylists(playlistUrls.value);
  if (result.success) {
    gameStore.game!.tracks = result.trackList;
    let turnOrderCounter = 0;
    gameStore.getPlayers?.forEach((player) => {
      const track = gameStore.getTrackForTimeline();
      player.timeline.push(track);
      player.turnOrder = turnOrderCounter;
      player.tokens = 3; // temp
      turnOrderCounter++;
    });
    gameStore.getPlayers?.sort((a, b) => a.turnOrder - b.turnOrder);
    gameStore.game!.currentTurn = gameStore.getPlayers![0];
    gameStore.game!.started = true;
    await gameStore.update();
  } else {
    errorMessage.value = "Failed to fetch playlist. Please check the link.";
    errorIndex.value = result.failedAtIndex!;
  }
  loading.value = false;
};

const leaveGame = () => {
  gameStore.leave();
};

const onInputChange = (fn: Function) => {
  clearTimeout(timeout.value);
  timeout.value = setTimeout(() => {
    fn();
  }, 500);
};

const updateName = async () => {
  if (gameStore.getMe?.name.length !== 0) {
    await gameStore.update();
    nameError.value = false;
  } else nameError.value = true;
};

const updatePlaylists = async () => {
  gameStore.game!.playlists = playlistUrls.value;
  await gameStore.update();
};

const addPlaylist = () => {
  playlistUrls.value.push("");
  updatePlaylists();
};

const removePlaylist = (index: number) => {
  playlistUrls.value.splice(index, 1);
  updatePlaylists();
  errorIndex.value = null;
};
</script>

<template>
  <v-container
    class="fill-height d-flex flex-column align-center justify-center"
  >
    <div style="display: flex; gap: 20px; flex-wrap: wrap">
      <v-card
        color="card"
        class="pa-6 text-center"
        elevation="10"
        width="90vw"
        max-width="400"
      >
        <v-card-title class="text-h4 font-weight-bold">
          Game ID: {{ gameStore.game?.id }}
        </v-card-title>

        <div v-for="player in gameStore.getPlayers" :key="player.id">
          <div class="d-flex align-center mb-2" style="gap: 10px">
            <v-icon :color="player.connected ? 'green' : 'red'" size="25">
              {{ player.connected ? "mdi-check-circle" : "mdi-connection" }}
            </v-icon>

            <v-text-field
              v-if="player.id === gameStore.getClientId()"
              v-model="player.name"
              @input="onInputChange(updateName)"
              label="Name"
              density="compact"
              variant="outlined"
              :error="nameError"
              hide-details
            />
            <div v-else style="font-size: 1.4rem">
              {{ player.name }}
            </div>

            <div
              v-if="player.id === gameStore.getClientId()"
              class="font-weight-bold"
            >
              (You)
            </div>
          </div>
        </div>

        <v-divider class="my-4"></v-divider>

        <div>
          <v-btn @click="addPlaylist" color="primary" class="mb-2">
            <v-icon left>mdi-plus</v-icon> Add Playlist
          </v-btn>

          <div v-for="(url, index) in playlistUrls" :key="index" class="d-flex">
            <v-text-field
              v-model="playlistUrls[index]"
              @input="onInputChange(updatePlaylists)"
              label="Playlist URL"
              placeholder="Enter Game ID"
              density="compact"
              variant="outlined"
              hide-details
              :error="errorIndex === index"
              :error-message="errorMessage"
              class="mb-2"
            />
            <v-btn
              @click="removePlaylist(index)"
              color="red"
              icon
              size="35"
              style="margin-left: 5px; margin-top: 2px"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </div>
        </div>

        <v-btn
          @click="startGame"
          :loading="loading"
          :disabled="
            (gameStore.getPlayers ? gameStore.getPlayers.length < 2 : false) ||
            playlistUrls.length < 1 ||
            playlistUrls[0].length < 1
          "
          color="green darken-1"
          block
        >
          <v-icon left>mdi-play</v-icon> Start Game
        </v-btn>

        <v-btn @click="leaveGame" color="red darken-1" block class="mt-2">
          <v-icon left>mdi-exit-to-app</v-icon> Leave Game
        </v-btn>
      </v-card>
      <PlaySpotify :hideDetails="false"></PlaySpotify>
    </div>
  </v-container>
</template>

<style scoped></style>
