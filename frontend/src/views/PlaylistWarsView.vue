<script setup lang="ts">
import { useGameStore } from "../stores/game";
import JoinRoom from "../components/JoinGame.vue";
import { onMounted, ref } from "vue";
import { router } from "../router";
import { useRoute } from "vue-router";

const route = useRoute();

const gameStore = useGameStore();

const joinLobbyVisible = ref<boolean>(false);

const create = async () => {
  await gameStore.create();
};

onMounted(() => {
  const { access_token, refresh_token, expires_in } = route.query;

  if (access_token && refresh_token && expires_in) {
    localStorage.setItem("access_token", access_token as string);
    localStorage.setItem("refresh_token", refresh_token as string);
    localStorage.setItem("expires_in", expires_in as string);

    console.log("access_token", access_token)

    router.replace({ path: "/menu" });
  }
});
</script>

<template>
  <JoinRoom v-model="joinLobbyVisible"></JoinRoom>
  <v-container
    class="fill-height d-flex flex-column align-center justify-center"
  >
    <v-card
      color="card"
      class="pa-6 text-center"
      elevation="10"
      max-width="400"
    >
      <v-btn
        style="position: absolute; top: 0px; left: 0px"
        variant="plain"
        @click="router.push('/')"
      >
        ⬅️ Back
      </v-btn>
      <v-card-title class="text-h4 font-weight-bold"
        >Playlist Wars</v-card-title
      >
      <v-card-text class="text-body-1">
        Create or join a lobby to start the game!
      </v-card-text>
      <v-divider class="my-4"></v-divider>
      <v-btn
        :loading="gameStore.loading"
        block
        color="primary"
        size="large"
        class="mb-3"
        @click="create"
      >
        🎮 Create Lobby
      </v-btn>
      <v-btn
        :loading="gameStore.loading"
        block
        color="secondary"
        size="large"
        @click="joinLobbyVisible = true"
      >
        🔗 Join Lobby
      </v-btn>
    </v-card>
  </v-container>
</template>
