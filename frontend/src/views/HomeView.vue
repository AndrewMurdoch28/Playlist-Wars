<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const env = import.meta.env.VITE_ENV;
</script>

<template>
  <v-container
    class="fill-height d-flex flex-column align-center justify-center"
  >
    <v-card
      color="card"
      class="pa-6 text-center"
      elevation="10"
      max-width="400"
    >
      <v-card-title class="text-h4 font-weight-bold"
        >Playlist Wars</v-card-title
      >
      <v-card-text class="text-body-1">
        A fun music-based game where you battle with playlists!
      </v-card-text>
      <v-divider class="my-4"></v-divider>
      <v-btn
        :disabled="env !== 'localhost'"
        block
        color="primary"
        size="large"
        class="mb-3"
        @click="router.push('/login')"
      >
        🎵 Play Game (In Developement)
      </v-btn>
      <v-btn
        block
        color="secondary"
        size="large"
        @click="router.push('/card-generator')"
      >
        🃏 Generate Cards
      </v-btn>
    </v-card>
  </v-container>
</template>
