<script setup lang="ts">
import { useGameStore } from "../stores/game";

const gameStore = useGameStore();

const createLobby = async () => {
  await gameStore.createLobby();
}
</script>

<template>
  <div>Playlist Wars</div>
  <v-btn @click="createLobby">Create Lobby</v-btn>
  <v-btn>Join Lobby</v-btn>
</template>