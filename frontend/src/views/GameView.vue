<script setup lang="ts">
import { ref, watch } from "vue";
import { Player, TurnState } from "../interfaces/game";
import { useGameStore } from "../stores/game";
import { getReadableColor } from "../lib/utility";
import PlaySpotify from "../components/PlaySpotify.vue";
import { useSpotifyStore } from "../stores/spotify";

const gameStore = useGameStore();
const spotifyStore = useSpotifyStore();

const showAddBtns = ref<boolean>(false);

watch(
  () => gameStore.game?.turnState,
  async () => {
    if (gameStore.game?.turnState === TurnState.PlaceTimelineEntry) {
      if (gameStore.game.currentTurn?.id === gameStore.getMe?.id) {
        gameStore.game!.activeTimelineEntry = {
          order: 0,
          track: gameStore.getTrackForTimeline(),
        };
        console.log("testing", gameStore.game);
        await gameStore.update();
        showAddBtns.value = true;
      } else showAddBtns.value = false;
    } else if (gameStore.game?.turnState === TurnState.PlaceTokens) {
    } else if (gameStore.game?.turnState === TurnState.GuessSong) {
    }
  },
  { immediate: true }
);

watch(
  () => [gameStore.game?.activeTimelineEntry, spotifyStore.isActive],
  () => {
    console.log(
      gameStore.game?.activeTimelineEntry?.track.url,
      spotifyStore.isActive
    );
    if (gameStore.game?.activeTimelineEntry && spotifyStore.isActive) {
      spotifyStore.playTrackFromUrl(
        gameStore.game!.activeTimelineEntry!.track.url
      );
    }
  }
);

const handleBtn = (position: number) => {
  if (gameStore.game?.turnState === TurnState.PlaceTimelineEntry) {
    console.log(gameStore.game.activeTimelineEntry);
  } else if (gameStore.game?.turnState === TurnState.PlaceTokens) {
  } else if (gameStore.game?.turnState === TurnState.GuessSong) {
  }
};
</script>

<template>
  <v-container>
    <div style="display: flex; gap: 10px; margin-bottom: 10px">
      <v-card
        v-for="player in gameStore.getPlayers"
        :color="
          player.id === gameStore.game?.currentTurn?.id ? '#196b11' : 'card'
        "
        class="pa-1 px-3"
      >
        <div style="display: flex; gap: 5px; font-size: 1.4rem">
          <v-icon v-if="!player.connected" color="red" size="25">
            mdi-connection</v-icon
          >
          <div style="font-weight: bolder;">
            {{ player.name }}
          </div>
        </div>
        <div>Timeline Length: {{ player.timeline.length }}</div>
        <div>Tokens: {{ player.tokens }}</div>
      </v-card>
    </div>
    <v-card color="card" class="mb-1">
      <div v-if="gameStore.game?.turnState === TurnState.PlaceTimelineEntry">
        <v-card-title class="text-h5 font-weight-bold">
          {{
            `Listen to song and place the card in timeline ${gameStore.game?.currentTurn?.name}.`
          }}
        </v-card-title>
      </div>
      <div v-if="gameStore.game?.turnState === TurnState.PlaceTokens">
        <v-card-title class="text-h5 font-weight-bold">
          {{ "Place tokens to try and steal!" }}
        </v-card-title>
      </div>
      <div v-if="gameStore.game?.turnState === TurnState.GuessSong">
        <v-card-title class="text-h5 font-weight-bold">
          {{ "Guess the song to win a token!" }}
        </v-card-title>
      </div>
      <PlaySpotify :hideDetails="true"></PlaySpotify>
    </v-card>
    <v-card color="card">
      <v-card-title class="text-h5 font-weight-bold">
        Timeline: {{ gameStore.game?.currentTurn?.name }}
      </v-card-title>
      <div style="display: flex; justify-content: center; align-items: center">
        <v-btn v-if="showAddBtns" @click="handleBtn(0)">
          <span style="font-size: 24px; line-height: 1">+</span>
        </v-btn>
        <template
          v-for="(card, index) in gameStore.game?.currentTurn?.timeline"
          :key="card.track.releaseYear"
        >
          <v-card
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
          <v-btn v-if="showAddBtns" @click="handleBtn(index + 1)">
            <span style="font-size: 24px; line-height: 1">+</span>
          </v-btn>
        </template>
      </div>
    </v-card>
  </v-container>
</template>
