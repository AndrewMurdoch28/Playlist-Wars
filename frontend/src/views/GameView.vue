<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { AlertType, Player, TurnState } from "../interfaces/game";
import { useGameStore } from "../stores/game";
import { getReadableColor } from "../lib/utility";
import PlaySpotify from "../components/PlaySpotify.vue";
import { useSpotifyStore } from "../stores/spotify";

const gameStore = useGameStore();
const spotifyStore = useSpotifyStore();

const cardColour = new Map<string, string>();

const guessSongVisible = ref<boolean>(false);
const guessSongName = ref<string | null>();
const guessSongArtist = ref<string | null>();

const actionGuessVisible = ref<boolean>(false);

const timelineVisible = ref<boolean>(false);
const selectedPlayerTimeline = ref<Player>();

const activeTrackIndex = computed(() =>
  gameStore.getCurrent?.timeline.findIndex(
    (track) => track.url === gameStore.game?.activeTrack?.url
  )
);

watch(
  () => [gameStore.alertVisible, gameStore.game?.turnState],
  async () => {
    if (gameStore.game?.turnState === TurnState.PlaceTimelineEntry) {
      actionGuessVisible.value = false;
      if (gameStore.getCurrent?.id === gameStore.getMe?.id)
        gameStore.showAddBtns = true;
      else gameStore.showAddBtns = false;
    } else if (gameStore.game?.turnState === TurnState.PendingPlaceTokens) {
    } else if (gameStore.game?.turnState === TurnState.PlaceTokens) {
      if (
        !gameStore.getMe?.ready &&
        gameStore.getMe?.id !== gameStore.getCurrent?.id &&
        gameStore.getMe!.tokens > 0
      )
        gameStore.showAddBtns = true;
    } else if (gameStore.game?.turnState === TurnState.GuessSong) {
      if (!gameStore.getMe?.ready) guessSongVisible.value = true;
    } else if (gameStore.game?.turnState === TurnState.ActionGuesses) {
      if (gameStore.alertVisible !== true) actionGuessVisible.value = true;
      else actionGuessVisible.value = false;
    }
  },
  { immediate: true }
);

watch(
  () => [spotifyStore.isActive],
  () => {
    if (gameStore.game?.activeTrack && spotifyStore.isActive) {
      spotifyStore.playTrackFromUrl(gameStore.game!.activeTrack!.url);
    }
  },
  { immediate: true }
);

watch(
  () => gameStore.getCurrent?.timeline,
  () => {
    gameStore.getCurrent?.timeline.forEach((track) => {
      if (!cardColour.has(track.url))
        cardColour.set(track.url, getReadableColor());
    });
  },
  { immediate: true }
);

watch(
  () => selectedPlayerTimeline.value,
  () => {
    selectedPlayerTimeline.value?.timeline.forEach((track) => {
      if (!cardColour.has(track.url))
        cardColour.set(track.url, getReadableColor());
    });
  },
  { immediate: true }
);

watch(
  () => gameStore.alertVisible,
  () => {
    if (
      !gameStore.alertVisible &&
      (gameStore.alertMessage.length > 0 || gameStore.alertType.length > 0)
    ) {
      gameStore.alertMessage.shift();
      gameStore.alertType.shift();
      if (gameStore.alertMessage.length > 0 || gameStore.alertType.length > 0)
        gameStore.alertVisible = true;
    }
  }
);

const pass = () => {
  if (gameStore.game?.turnState === TurnState.PlaceTokens) {
    gameStore.placeToken(null);
    gameStore.showAddBtns = false;
  }
};

const handleAddBtn = (position: number) => {
  if (gameStore.game?.turnState === TurnState.PlaceTimelineEntry) {
    gameStore.showAddBtns = false;
    gameStore.placeTimelineEntry(position);
  } else if (gameStore.game?.turnState === TurnState.PlaceTokens) {
    gameStore.placeToken(position);
    gameStore.showAddBtns = false;
  }
};

const guessSong = () => {
  gameStore.guessSong(guessSongName.value, guessSongArtist.value);
  guessSongVisible.value = false;
  guessSongName.value = "";
  guessSongArtist.value = "";
};

const actionGuess = (action: boolean) => {
  gameStore.actionGuess(action);
};

const showTimeline = (player: Player) => {
  timelineVisible.value = true;
  selectedPlayerTimeline.value = player;
};

const startVoteKick = () => {};
</script>

<template>
  <v-menu :close-on-content-click="false" width="220">
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        style="position: fixed; top: 5px; right: 5px; z-index: 10000"
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
      <v-icon
        v-if="gameStore.alertType[0] === AlertType.Success"
        color="success"
        size="40"
        >mdi-check</v-icon
      >
      <v-icon
        v-if="gameStore.alertType[0] === AlertType.Failure"
        color="error"
        size="40"
        >mdi-cancel</v-icon
      >
      <div style="font-size: 1.3rem">{{ gameStore.alertMessage[0] }}</div>
      <v-btn class="mt-4" color="white" @click="gameStore.alertVisible = false"
        >OK</v-btn
      >
    </v-card>
  </v-dialog>
  <v-dialog v-model="timelineVisible">
    <v-card color="card">
      <div style="display: flex">
        <v-icon color="primary" size="35" class="ma-2 mr-0"
          >mdi-music-box-multiple</v-icon
        >
        <v-card-title>
          Timeline: {{ selectedPlayerTimeline?.name }}
        </v-card-title>
      </div>
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: nowrap;
          overflow-y: auto;
        "
      >
        <template
          v-for="(track, index) in selectedPlayerTimeline?.timeline"
          :key="track.releaseYear"
        >
          <v-card
            class="pa-1 ma-2 mx-1 text-center"
            elevation="5"
            min-width="200"
            min-height="150"
            max-width="200"
            max-height="150"
            :color="cardColour.get(track.url)"
          >
            <div v-if="track.url === gameStore.game?.activeTrack?.url">
              <span style="font-size: 50px; line-height: 3">?</span>
            </div>
            <div v-else>
              <v-card-title class="text-h5 font-weight-bold">
                {{ track.releaseYear }}
              </v-card-title>
              <div style="font-weight: bold">{{ track.name }}</div>
              <div>{{ track.artist }}</div>
            </div>
          </v-card>
        </template>
      </div>
    </v-card>
  </v-dialog>
  <v-dialog v-model="gameStore.countdownVisible" persistent>
    <v-card color="card" class="pa-4 text-center">
      <div style="font-size: 1.3rem">{{ gameStore.countdownMessage }}</div>
      <div style="font-size: 1.5rem">{{ gameStore.countdownValue }}</div>
      <v-progress-linear
        :model-value="
          (gameStore.countdownValue / gameStore.countdownLength) * 100
        "
      ></v-progress-linear>
    </v-card>
  </v-dialog>
  <v-dialog v-model="actionGuessVisible" persistent>
    <v-card color="card" class="pa-4 text-center">
      <div>
        Correct Name:
        <span style="font-size: 1.3rem">{{
          gameStore.game?.activeTrack?.name
        }}</span>
      </div>
      <div>
        Correct Artist:
        <span style="font-size: 1.3rem">{{
          gameStore.game?.activeTrack?.artist
        }}</span>
      </div>
      <div>
        Guess Name:
        <span style="font-size: 1.3rem">{{
          gameStore.guessToAction?.name
        }}</span>
      </div>
      <div>
        Guess Artist:
        <span style="font-size: 1.3rem">{{
          gameStore.guessToAction?.artist
        }}</span>
      </div>
      <div
        style="
          display: flex;
          justify-content: center;
          margin-top: 15px;
          gap: 10px;
        "
      >
        <v-btn
          :disabled="gameStore.getMe?.ready"
          @click="actionGuess(true)"
          color="success"
          >Guess is Correct</v-btn
        >
        <v-btn
          :disabled="gameStore.getMe?.ready"
          @click="actionGuess(false)"
          color="error"
          >Guess is incorrect</v-btn
        >
      </div>
    </v-card>
  </v-dialog>
  <v-container>
    <div style="display: flex; gap: 5px; margin-bottom: 5px; flex-wrap: wrap">
      <v-menu v-for="player in gameStore.getPlayers" width="220">
        <template v-slot:activator="{ props }">
          <v-card
            v-bind="props"
            :color="
              player.id === gameStore.getCurrent?.id ? 'primary' : 'card'
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
        </template>
        <v-card width="230" color="card">
          <v-list-item @click="showTimeline(player)">
            <v-icon color="primary" :class="`mr-3 gl-n13`"
              >mdi-music-box-multiple</v-icon
            >
            <span class="pr-2">View Timeline</span>
          </v-list-item>
          <v-list-item @click="startVoteKick">
            <v-icon color="red darken-1" :class="`mr-3 gl-n13`"
              >mdi-karate</v-icon
            >
            <span class="pr-2">Vote Kick from Game</span>
          </v-list-item>
          <v-spacer />
        </v-card>
      </v-menu>
    </div>
    <!-- <v-progress-linear
      v-if="gameStore.countdownLength > 0"
      style="border-radius: 3px"
      class="mb-2"
      height="15"
      color="white"
      :model-value="
        (gameStore.countdownValue / gameStore.countdownLength) * 100
      "
    ></v-progress-linear> -->
    <div style="display: flex; flex-wrap: wrap; gap: 5px">
      <v-card color="card" class="mb-1">
        <div v-if="guessSongVisible">
          <v-text-field
            v-model="guessSongName"
            max-width="395"
            class="px-2 mb-1 mt-2"
            hide-details
            label="Song Name"
            placeholder="Enter Song Name"
          ></v-text-field>
          <v-text-field
            v-model="guessSongArtist"
            max-width="395"
            class="px-2"
            hide-details
            label="Song Artist"
            placeholder="Enter Song Artist"
          ></v-text-field>
          <div
            style="display: flex; justify-content: flex-end; max-width: 395px"
          >
            <v-btn @click="guessSong" class="mx-2 my-1" color="primary"
              >Submit</v-btn
            >
          </div>
        </div>
        <PlaySpotify :hideDetails="true"></PlaySpotify>
      </v-card>
      <v-card
        color="card"
        class="mb-1"
        style="display: flex; flex-direction: column; justify-content: center"
      >
        <div v-if="gameStore.game?.turnState === TurnState.PlaceTimelineEntry">
          <div class="pa-2 text-h5 font-weight-bold">
            {{
              gameStore.getMe?.id === gameStore.getCurrent?.id
                ? `Listen to song and select the correct position in the timeline.`
                : `${gameStore.getCurrent?.name} is placing the song in the timeline.`
            }}
          </div>
        </div>
        <div v-if="gameStore.game?.turnState === TurnState.PlaceTokens">
          <div class="pa-2 text-h5 font-weight-bold">
            {{
              gameStore.getMe?.id === gameStore.getCurrent?.id
                ? "Waiting for players to place tokens."
                : gameStore.getMe?.ready
                ? "Waiting on other players."
                : "Place tokens to try and steal!"
            }}
          </div>
        </div>
        <div v-if="gameStore.game?.turnState === TurnState.GuessSong">
          <div class="pa-2 text-h5 font-weight-bold">
            {{
              gameStore.getMe?.ready
                ? "Waiting on other players."
                : "Guess the song to win a token!"
            }}
          </div>
        </div>
        <v-btn
          v-if="
            gameStore.getMe?.id !== gameStore.getCurrent?.id &&
            gameStore.game?.turnState === TurnState.PlaceTokens &&
            !gameStore.getMe?.ready
          "
          @click="pass"
          class="ma-2"
          color="primary"
          >Pass</v-btn
        ></v-card
      >
    </div>
    <v-card color="card">
      <div style="display: flex">
        <v-icon color="primary" size="35" class="ma-2 mr-0"
          >mdi-music-box-multiple</v-icon
        >
        <v-card-title>
          Timeline: {{ gameStore.getCurrent?.name }}
        </v-card-title>
      </div>
      <div
        style="
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          overflow-y: auto;
          margin-left: 5px;
          margin-right: 5px;
        "
      >
        <v-btn
          v-if="
            gameStore.showAddBtns &&
            gameStore.getCurrent?.timeline[0].url !==
              gameStore.game?.activeTrack?.url
          "
          @click="handleAddBtn(0)"
          color="primary"
        >
          <span style="font-size: 24px; line-height: 1">+</span>
        </v-btn>
        <template
          v-for="(track, index) in gameStore.getCurrent?.timeline"
          :key="track.releaseYear"
        >
          <v-card
            class="pa-1 ma-2 mx-1 text-center"
            elevation="5"
            min-width="200"
            min-height="150"
            max-width="200"
            max-height="150"
            :color="cardColour.get(track.url)"
          >
            <div v-if="track.url === gameStore.game?.activeTrack?.url">
              <span style="font-size: 50px; line-height: 3">?</span>
            </div>
            <div v-else>
              <v-card-title class="text-h5 font-weight-bold">
                {{ track.releaseYear }}
              </v-card-title>
              <div style="font-weight: bold">{{ track.name }}</div>
              <div>{{ track.artist }}</div>
            </div>
          </v-card>
          <v-btn
            v-if="
              gameStore.showAddBtns &&
              (index !== activeTrackIndex) &&
              (index !== activeTrackIndex! - 1)
            "
            @click="handleAddBtn(index + 1)"
            color="primary"
          >
            <span style="font-size: 24px; line-height: 1">+</span>
          </v-btn>
        </template>
      </div>
    </v-card>
  </v-container>
</template>
