<template>
  <v-app>
    <v-main>
      <HomeView />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import HomeView from './components/HomeView.vue';
</script>

<style>
.v-main {
  background-color: gray;
}
</style>
