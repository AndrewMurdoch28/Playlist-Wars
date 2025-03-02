<script setup lang="ts">
import { router } from "../router/index";
</script>

<template>
  <div>Playlist Wars</div>
  <v-btn @click="router.push('/game')">Play Game</v-btn>
  <v-btn @click="router.push('/card-generator')">Generate Cards</v-btn>
</template>
