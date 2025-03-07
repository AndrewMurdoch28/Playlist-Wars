<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { AlertType, Player, TurnState } from "../interfaces/game";
import { useGameStore } from "../stores/game";
import { getReadableColor } from "../lib/utility";
import PlaySpotify from "../components/PlaySpotify.vue";
import { useSpotifyStore } from "../stores/spotify";

const gameStore = useGameStore();
const spotifyStore = useSpotifyStore();

const cardColour = new Map<string, string>();

const timeToPlaceActiveTrack = 5;
const timeToPlaceTokens = 5;
const timeToGuessSong = 5;

const guessSongVisible = ref<boolean>(false);
const guessSongName = ref<string | null>();
const guessSongArtist = ref<string | null>();

const countdownMessage = ref<string>("");

const activeTrackIndex = computed(() =>
  gameStore.game?.currentTurn?.timeline.findIndex(
    (track) => track.url === gameStore.game?.activeTrack?.url
  )
);

watch(
  () => gameStore.game?.turnState,
  async () => {
    if (gameStore.game?.turnState === TurnState.PlaceTimelineEntry) {
      if (gameStore.game.currentTurn?.id === gameStore.getMe?.id) {
        if (gameStore.game!.activeTrack === null) {
          gameStore.game!.activeTrack = gameStore.getTrackForTimeline();
          await gameStore.update();
        }
        gameStore.showAddBtns = true;
      } else gameStore.showAddBtns = false;
    } else if (gameStore.game?.turnState === TurnState.PendingPlaceTokens) {
      countdownMessage.value = `Place steal tokens. First come first serve!`;
    } else if (gameStore.game?.turnState === TurnState.PlaceTokens) {
      if (gameStore.getMe!.tokens > 0) gameStore.showAddBtns = true;
    } else if (gameStore.game?.turnState === TurnState.GuessSong) {
      guessSongVisible.value = true;
    }
  },
  { immediate: true }
);

watch(
  () => [gameStore.game?.activeTrack, spotifyStore.isActive],
  () => {
    if (gameStore.game?.activeTrack && spotifyStore.isActive) {
      spotifyStore.playTrackFromUrl(gameStore.game!.activeTrack!.url);
    }
  }
);

const handleBtn = (position: number) => {
  if (gameStore.game?.turnState === TurnState.PlaceTimelineEntry) {
    gameStore.showAddBtns = false;
    gameStore.placeTimelineEntry(position);
  } else if (gameStore.game?.turnState === TurnState.PlaceTokens) {
    // Make fucntion for placedToken
    if (gameStore.getMe!.tokens > 0) {
      gameStore.getMe!.tokens--;
      gameStore.game.currentTurn?.timelineTokens.push({
        playerId: gameStore.getMe!.id,
        position,
      });
      gameStore.update();
      gameStore.showAddBtns = false;
    }
  }
};

watch(
  () => gameStore.game?.currentTurn?.timeline,
  () => {
    gameStore.game?.currentTurn?.timeline.forEach((track) => {
      if (!cardColour.has(track.url))
        cardColour.set(track.url, getReadableColor());
    });
  }
);

const reset = () => {
  if (gameStore.game!.currentTurn?.timeline.length! > 1)
    gameStore.game!.currentTurn?.timeline.pop();
  gameStore.game!.activeTrack = gameStore.getTrackForTimeline();
  gameStore.game!.turnState = TurnState.PlaceTimelineEntry;
  gameStore.update();
};

// const test = () => {
//   gameStore.getCorrectPosition(
//     gameStore.game!.activeTrack!,
//     gameStore.game!.currentTurn!.timeline
//   );
// };
</script>

<template>
  <!-- <v-btn @click="test">test</v-btn> -->
  <v-btn @click="reset">reset</v-btn>
  <v-menu :close-on-content-click="false" width="220">
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        style="position: fixed; top: 5px; right: 5px"
        icon
        color="card"
        ><v-icon>mdi-menu</v-icon></v-btn
      >
    </template>
    <v-card color="card">
      <v-row class="align-center justify-center ma-1 mt-2">
        <div style="font-size: large; font-weight: bolder">
          Game ID: {{ gameStore.game?.id }}
        </div>
      </v-row>
      <v-list-item @click="gameStore.leave()">
        <v-icon color="red darken-1" :class="`mr-3 gl-n13`">mdi-logout</v-icon>
        <span class="pr-2">Leave Game</span>
      </v-list-item>
      <v-spacer />
    </v-card>
  </v-menu>
  <v-dialog v-model="gameStore.alertVisible" width="400">
    <v-card color="card" class="pa-4 text-center">
      <div style="font-size: 1.3rem">{{ gameStore.alertMessage }}</div>
      <v-btn class="mt-4" color="white" @click="gameStore.alertVisible = false"
        >OK</v-btn
      >
    </v-card>
  </v-dialog>
  <v-dialog v-model="gameStore.countdownVisible" persistent>
    <v-card color="card" class="pa-4 text-center">
      <div style="font-size: 1.3rem">{{ countdownMessage }}</div>
      <div style="font-size: 1.5rem">{{ gameStore.countdownValue }}</div>
      <v-progress-linear
        :model-value="
          (gameStore.countdownValue / gameStore.countdownLength) * 100
        "
      ></v-progress-linear>
    </v-card>
  </v-dialog>
  <v-container>
    <div style="display: flex; gap: 5px; margin-bottom: 5px; flex-wrap: wrap">
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
          <div style="font-weight: bolder">
            {{ player.name
            }}<span style="font-size: 0.9rem; margin-left: 10px">{{
              gameStore.getMe?.id === player.id ? "(You)" : ""
            }}</span>
          </div>
        </div>
        <div>Timeline Length: {{ player.timeline.length }}</div>
        <div>Tokens: {{ player.tokens }}</div>
      </v-card>
    </div>
    <v-progress-linear
      v-if="gameStore.countdownLength > 0"
      style="border-radius: 3px"
      class="mb-2"
      height="15"
      color="white"
      :model-value="
        (gameStore.countdownValue / gameStore.countdownLength) * 100
      "
    ></v-progress-linear>
    <v-card color="card" class="mb-1">
      <div v-if="gameStore.game?.turnState === TurnState.PlaceTimelineEntry">
        <div class="pa-2 text-h5 font-weight-bold">
          {{
            `Listen to song and place the card in timeline ${gameStore.game?.currentTurn?.name}.`
          }}
        </div>
      </div>
      <div v-if="gameStore.game?.turnState === TurnState.PlaceTokens">
        <div class="pa-2 text-h5 font-weight-bold">
          {{ "Place tokens to try and steal!" }}
        </div>
      </div>
      <div v-if="gameStore.game?.turnState === TurnState.GuessSong">
        <div class="pa-2 text-h5 font-weight-bold">
          {{ "Guess the song to win a token!" }}
        </div>
      </div>
      <div v-if="guessSongVisible">
        <v-text-field
          v-model="guessSongName"
          max-width="395"
          class="px-2 mb-1"
          hide-details
          label="Song Name"
          placeholder="Enter Song Name"
          variant="solo-filled"
        ></v-text-field>
        <v-text-field
          v-model="guessSongArtist"
          max-width="395"
          class="px-2"
          hide-details
          label="Song Artist"
          placeholder="Enter Song Artist"
          variant="solo-filled"
        ></v-text-field>
      </div>
      <PlaySpotify :hideDetails="true"></PlaySpotify>
    </v-card>
    <v-card color="card">
      <v-card-title class="text-h5 font-weight-bold">
        Timeline: {{ gameStore.game?.currentTurn?.name }}
      </v-card-title>
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        "
      >
        <v-btn
          v-if="
            gameStore.showAddBtns &&
            gameStore.game?.currentTurn?.timeline[0].url !==
              gameStore.game?.activeTrack?.url
          "
          @click="handleBtn(0)"
        >
          <span style="font-size: 24px; line-height: 1">+</span>
        </v-btn>
        <template
          v-for="(track, index) in gameStore.game?.currentTurn?.timeline"
          :key="track.releaseYear"
        >
          <v-card
            class="pa-1 ma-2 mx-1 text-center"
            elevation="5"
            width="200"
            height="150"
            :color="cardColour.get(track.url)"
          >
            <div v-if="track.url === gameStore.game?.activeTrack?.url">
              <span style="font-size: 50px; line-height: 3">?</span>
            </div>
            <div v-else>
              <v-card-title class="text-h5 font-weight-bold">
                {{ track.releaseYear }}
              </v-card-title>
              <div>Name: {{ track.name }}</div>
              <div>Artist: {{ track.artist }}</div>
            </div>
          </v-card>
          <v-btn
            v-if="
              gameStore.showAddBtns &&
              (index !== activeTrackIndex) &&
              (index !== activeTrackIndex! - 1)
            "
            @click="handleBtn(index + 1)"
          >
            <span style="font-size: 24px; line-height: 1">+</span>
          </v-btn>
        </template>
      </div>
    </v-card>
  </v-container>
</template>
