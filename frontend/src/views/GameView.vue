<script setup lang="ts">
import { ref, watch } from "vue";
import { Player, TurnState } from "../interfaces/game";
import { useGameStore } from "../stores/game";
import { getReadableColor } from "../lib/utility";
import PlaySpotify from "../components/PlaySpotify.vue";

const gameStore = useGameStore();
</script>

<template>
  <v-container>
    <div style="display: flex; gap: 10px; margin-bottom: 10px">
      <v-card
        v-for="player in gameStore.getPlayers"
        :color="
          player.id === gameStore.getGame?.currentTurn?.id ? '#196b11' : 'card'
        "
        class="pa-1 px-3"
      >
        <div style="display: flex; gap: 5px; font-size: 1.4rem">
          <v-icon v-if="!player.connected" color="red" size="25">
            mdi-connection</v-icon
          >
          <div>
            {{ player.name }}
          </div>
        </div>
        <div>Timeline Length: {{ player.timeline.length }}</div>
        <div>Tokens: {{ player.tokens }}</div>
      </v-card>
    </div>
    <v-card color="card" class="mb-1">
      <div v-if="gameStore.getGame?.turnState === TurnState.PlaceTimelineEntry">
        <v-card-title class="text-h5 font-weight-bold">
          {{
            `Place the card in timeline ${gameStore.getGame?.currentTurn?.name}.`
          }}
        </v-card-title>
      </div>
      <div v-if="gameStore.getGame?.turnState === TurnState.PlaceTokens">
        <v-card-title class="text-h5 font-weight-bold">
          {{ "Place tokens to try and steal!" }}
        </v-card-title>
      </div>
      <div v-if="gameStore.getGame?.turnState === TurnState.GuessSong">
        <v-card-title class="text-h5 font-weight-bold">
          {{ "Guess the song to win a token!" }}
        </v-card-title>
      </div>
      <PlaySpotify :hideDetails="true"></PlaySpotify>
    </v-card>
    <v-card color="card">
      <v-card-title class="text-h5 font-weight-bold">
        Timeline: {{ gameStore.getGame?.currentTurn?.name }}
      </v-card-title>
      <v-card
        v-for="card in gameStore.getGame?.currentTurn?.timeline"
        :key="card.track.releaseYear"
        class="pa-1 ma-2 text-center"
        elevation="5"
        width="200"
        :color="getReadableColor()"
      >
        <v-card-title class="text-h5 font-weight-bold">
          {{ card.track.releaseYear }}
        </v-card-title>
        <div>Name: {{ card.track.name }}</div>
        <div>Artist: {{ card.track.artist }}</div>
      </v-card>
    </v-card>
  </v-container>
</template>
