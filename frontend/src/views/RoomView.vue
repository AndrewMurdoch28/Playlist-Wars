<script setup lang="ts">
import { useGameStore } from "../stores/game";
import { ref } from "vue";

const gameStore = useGameStore();
const nameError = ref<boolean>(false);
const timeout = ref();

const startGame = () => {
  console.log(gameStore.getClientId());
};

const leaveGame = () => {
  gameStore.leave();
};

const onInputChange = () => {
  clearTimeout(timeout.value);
  timeout.value = setTimeout(() => {
    if (gameStore.getMe?.name.length !== 0) {
      gameStore.update();
      nameError.value = false;
    } else nameError.value = true;
  }, 500);
};
</script>

<template>
  <v-container
    class="fill-height d-flex flex-column align-center justify-center"
  >
    <v-card class="pa-6 text-center" elevation="10" max-width="600">
      <v-card-title class="text-h4 font-weight-bold">
        Game ID: {{ gameStore.getGame?.id }}
      </v-card-title>

      <div v-for="player in gameStore.getPlayers" :key="player.id">
        <v-row class="align-center justify-center mb-2" no-gutters>
          <v-col cols="12" md="1" class="text-center mr-2">
            <v-icon :color="player.connected ? 'green' : 'red'" size="25">
              {{ player.connected ? "mdi-check-circle" : "mdi-connection" }}
            </v-icon>
          </v-col>

          <v-col cols="12" md="6" class="text-center">
            <v-text-field
              v-if="player.id === gameStore.getClientId()"
              v-model="player.name"
              @input="onInputChange()"
              density="compact"
              variant="outlined"
              :error="nameError"
              hide-details
              style="max-width: 150px"
            />
            <div v-else style="font-size: 1.4rem">
              {{ player.name }}
            </div>
          </v-col>

          <v-col cols="12" md="2" class="text-center">
            <div
              v-if="player.id === gameStore.getClientId()"
              class="font-weight-bold"
            >
              (You)
            </div>
          </v-col>
        </v-row>
      </div>

      <v-divider class="my-4"></v-divider>

      <v-btn
        @click="startGame"
        :disabled="
          gameStore.getPlayers ? gameStore.getPlayers.length < 2 : false
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
  </v-container>
</template>

<style scoped></style>
