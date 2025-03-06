<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { AlertType, Player, TurnState } from "../interfaces/game";
import { useGameStore } from "../stores/game";
import { getReadableColor } from "../lib/utility";
import PlaySpotify from "../components/PlaySpotify.vue";
import { useSpotifyStore } from "../stores/spotify";

const gameStore = useGameStore();
const spotifyStore = useSpotifyStore();

const hideActiveTrack = ref<boolean>(false);

const alertMessage = ref<string>("");
const alertType = ref<string>(AlertType.Normal);
const alertVisible = ref<boolean>(false);

const countdownMessage = ref<string>("");
const countdownVisible = ref<boolean>(false);

const activeTrackIndex = computed(() =>
  gameStore.game?.currentTurn?.timeline.findIndex(
    (track) => track.url === gameStore.game?.activeTrack?.url
  )
);

watch(
  () => gameStore.game,
  () => {
    countdownVisible.value = gameStore.game!.coutdownVisible;
  },
  { deep: true }
);

watch(
  () => gameStore.game?.turnState,
  async () => {
    if (gameStore.game?.turnState === TurnState.PlaceTimelineEntry) {
      hideActiveTrack.value = true;
      if (gameStore.game.currentTurn?.id === gameStore.getMe?.id) {
        if (gameStore.game!.activeTrack === null) {
          gameStore.game!.activeTrack = gameStore.getTrackForTimeline();
          await gameStore.update();
        }
        gameStore.showAddBtns = true;
      } else gameStore.showAddBtns = false;
    } else if (gameStore.game?.turnState === TurnState.PendingPlaceTokens) {
      hideActiveTrack.value = true;
      countdownMessage.value = `Place steal tokens. First come first serve!`;
    } else if (gameStore.game?.turnState === TurnState.PlaceTokens) {
      hideActiveTrack.value = true;
      if (gameStore.getMe!.tokens > 0) gameStore.showAddBtns = true;
    } else if (gameStore.game?.turnState === TurnState.GuessSong) {
      hideActiveTrack.value = false;
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
  const active = gameStore.game?.activeTrack;
  const timeline = gameStore.game?.currentTurn?.timeline;
  if (gameStore.game?.turnState === TurnState.PlaceTimelineEntry) {
    gameStore.showAddBtns = false;
    timeline!.splice(position, 0, active!);
    gameStore.game.turnState = TurnState.PendingPlaceTokens;
    gameStore.game.coutdownVisible = true;
    gameStore.update();
    gameStore.startTimer(5, () => {
      gameStore.game!.turnState = TurnState.PlaceTokens;
      gameStore.game!.coutdownVisible = false;
      gameStore.update();
      gameStore.startTimer(5, () => {
        const activeTimeline = gameStore.game!.currentTurn!.timeline;
        const activeTrack = gameStore.game!.activeTrack;
        if (!activeTrack) return;

        const correctPosition = gameStore.getCorrectPosition(
          activeTrack,
          activeTimeline
        );

        const activeTrackPosition =
          gameStore.game!.currentTurn?.timeline.findIndex(
            (track) => track.url === activeTrack.url
          );
        const correctAnswerActiveTrack =
          activeTrackPosition === correctPosition;
        if (gameStore.game!.currentTurn!.id === gameStore.getMe!.id) {
          alertMessage.value = correctAnswerActiveTrack
            ? `You placed the song correctly! Congratulations!`
            : `You placed the song incorrectly.`;
          alertType.value = correctAnswerActiveTrack
            ? AlertType.Success
            : AlertType.Failure;
          alertVisible.value = true;
          if (!correctAnswerActiveTrack) {
            gameStore.game?.currentTurn?.timeline.splice(
              activeTrackPosition!,
              1
            );
            // gameStore.game!.currentTurn!.timeline =
            //   gameStore.game!.currentTurn!.timeline.filter(
            //     (track) => track.url !== gameStore.game?.activeTrack?.url
            //   );
          }
        } else if (!correctAnswerActiveTrack) {
          for (const token of gameStore.game!.currentTurn!.timelineTokens) {
            if (token.position === correctPosition) {
              const player = gameStore.game?.players[token.playerId];
              const correctPosition = gameStore.getCorrectPosition(
                activeTrack,
                player!.timeline
              );
              player!.timeline.splice(correctPosition!, 0, activeTrack);
              if (player!.id === gameStore.getMe!.id) {
                alertMessage.value = correctAnswerActiveTrack
                  ? `You placed the token correctly! Congratulations!`
                  : `You placed the token incorrectly.`;
                alertType.value = correctAnswerActiveTrack
                  ? AlertType.Success
                  : AlertType.Failure;
                alertVisible.value = true;
              }
            }
          }
          gameStore.game!.currentTurn!.timelineTokens = [];
        }
        gameStore.game!.activeTrack = null;
        gameStore.game!.turnState = TurnState.GuessSong;
        gameStore.update();
      });
    });
  } else if (gameStore.game?.turnState === TurnState.PlaceTokens) {
    if (gameStore.getMe!.tokens > 0) {
      gameStore.getMe!.tokens--;
      gameStore.game.currentTurn?.timelineTokens.push({
        playerId: gameStore.getMe!.id,
        position,
      });
      gameStore.update();
      gameStore.showAddBtns = false;
    }
  } else if (gameStore.game?.turnState === TurnState.GuessSong) {
  }
};

const reset = () => {
  gameStore.game!.currentTurn?.timeline.pop();
  gameStore.game!.activeTrack = gameStore.getTrackForTimeline();
  gameStore.game!.turnState = TurnState.PlaceTimelineEntry;
  gameStore.update();
};

const test = () => {
  gameStore.getCorrectPosition(
    gameStore.game!.activeTrack!,
    gameStore.game!.currentTurn!.timeline
  );
};
</script>

<template>
  <v-btn @click="test">test</v-btn>
  <v-btn @click="reset">reset</v-btn>
  <v-dialog v-model="alertVisible" width="400">
    <v-card color="card" class="pa-4 text-center">
      <div style="font-size: 1.3rem">{{ alertMessage }}</div>
      <v-btn class="mt-4" color="white" @click="alertVisible = false">OK</v-btn>
    </v-card>
  </v-dialog>
  <v-dialog v-model="countdownVisible" persistent>
    <v-card color="card" class="pa-4 text-center">
      <div style="font-size: 1.3rem">{{ countdownMessage }}</div>
      <div style="font-size: 1.5rem">{{ gameStore.game?.countdown }}</div>
    </v-card>
  </v-dialog>
  <v-container>
    <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap">
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
            :color="getReadableColor()"
          >
            <div
              v-if="
                hideActiveTrack &&
                track.url === gameStore.game?.activeTrack?.url
              "
            >
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
