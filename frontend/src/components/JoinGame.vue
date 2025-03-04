<script setup lang="ts">
import { ref } from "vue";
import { useGameStore } from "../stores/game";

const gameStore = useGameStore();

const visible = defineModel<boolean>({ default: false });
const errorVisible = ref<boolean>(false);
const errorMessage = ref<string>("");
const loading = ref<boolean>(false);

const gameId = ref<string>("");

const join = async () => {
  try {
    loading.value = true;
    await gameStore.join(gameId.value.trim());
  } catch (error) {
    console.log(error)
    errorVisible.value = true;
    errorMessage.value = "Room does not exist.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="visible" max-width="400">
    <v-card color="card" class="pa-4">
      <v-card-title class="text-h5 font-weight-bold">Join a Game</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="gameId"
          :loading="loading"
          label="Game ID"
          placeholder="Enter Game ID"
          outlined
          required
          :error="errorVisible"
          :error-messages="errorMessage"
        />
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn color="grey darken-1" variant="text" @click="visible = false"
          >Cancel</v-btn
        >
        <v-btn color="primary" :disabled="!gameId.trim()" @click="join">
          Join
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
