<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { AlertType, Player, Track, TurnState } from "../interfaces/game";
import { useGameStore } from "../stores/game";
import { getReadableColor } from "../lib/utility";
import PlaySpotify from "../components/PlaySpotify.vue";
import { useSpotifyStore } from "../stores/spotify";

const gameStore = useGameStore();
const spotifyStore = useSpotifyStore();

const cardColour = new Map<string, string>();

const guessSongName = ref<string | null>();
const guessSongArtist = ref<string | null>();

const activeSongVisible = ref<boolean>(false);
const activeSongCoverImg = ref<string>();

const apealVisible = ref<boolean>(false);
const apealValue = ref<number | null>();
const apealForm = ref();

const actionApealVisible = ref<boolean>(false);

const actionGuessVisible = ref<boolean>(false);

const timelineVisible = ref<boolean>(false);
const selectedPlayerTimeline = ref<Player>();

const logList = ref();

const activeTrackIndex = computed(() =>
  gameStore.getCurrent?.timeline.findIndex(
    (track) => track.url === gameStore.game?.activeTrack?.url
  )
);

watch(
  () => [gameStore.alertVisible, gameStore.game],
  () => {
    actionGuessVisible.value = false;
    activeSongVisible.value = false;
    actionApealVisible.value = false;
    if (gameStore.game?.turnState === TurnState.PlaceTimelineEntry) {
      if (gameStore.getCurrent?.id === gameStore.getMe?.id)
        gameStore.showAddBtns = true;
      else gameStore.showAddBtns = false;
    } else if (gameStore.game?.turnState === TurnState.PlaceTokens) {
      if (
        !gameStore.getMe?.ready &&
        gameStore.getMe?.id !== gameStore.getCurrent?.id &&
        gameStore.getMe!.tokens > 0
      )
        gameStore.showAddBtns = true;
    } else if (gameStore.game?.turnState === TurnState.SongApeal) {
      if (gameStore.game.trackApeal) actionApealVisible.value = true;
      else activeSongVisible.value = true;
    } else if (gameStore.game?.turnState === TurnState.ActionGuesses) {
      activeSongVisible.value = false;
      actionApealVisible.value = false;
      if (gameStore.alertVisible !== true) actionGuessVisible.value = true;
      else actionGuessVisible.value = false;
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => gameStore.game?.turnState,
  async () => {
    if (gameStore.game?.turnState === TurnState.SongApeal) {
      activeSongCoverImg.value = await spotifyStore.getAlbumCover(
        gameStore.game.activeTrack!.url
      );
    }
  }
);

watch(
  () => gameStore.game?.logs,
  () => {
    nextTick(() => {
      logList.value.$el.scrollTop = logList.value.$el.scrollHeight;
    });
  }
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
  guessSongName.value = "";
  guessSongArtist.value = "";
};

const apealSong = async () => {
  if ((await apealForm.value?.validate()).valid) {
    gameStore.apealSong(apealValue.value!);
    apealValue.value = null;
    apealVisible.value = false;
    activeSongVisible.value = false;
  }
};

const actionApealSong = (action: boolean) => {
  gameStore.actionApealSong(action);
};

const actionGuess = (action: boolean) => {
  gameStore.actionGuess(action);
};

const showTimeline = (player: Player) => {
  timelineVisible.value = true;
  selectedPlayerTimeline.value = player;
};

const startVoteKick = () => {};

const required = (value: string) =>
  Array.isArray(value)
    ? value.length > 0 || "Required."
    : !!value || "Required.";

const getSongYearUrl = (track: Track) => {
  const query = encodeURIComponent(
    `${track.name} By ${track.artist} release year`
  );
  return `https://www.google.com/search?q=${query}`;
};

const searchSongYear = (track: Track) => {
  window.open(getSongYearUrl(track), "_blank");
};

const openSpotifyApp = () => {
  const trackUrl = gameStore.game?.activeTrack?.url;

  if (trackUrl) {
    // Convert regular URL to Spotify URI
    const spotifyUri = trackUrl.replace(
      "https://open.spotify.com/",
      "spotify://"
    );

    // Try opening in the Spotify app first
    window.location.href = spotifyUri;

    // Optional: Open in browser if app is not installed (fails silently)
    setTimeout(() => {
      window.open(trackUrl, "_blank");
    }, 1000);
  } else {
    console.warn("No track URL available");
  }
};
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
  <v-dialog v-model="gameStore.alertVisible" persistent width="400">
    <v-card color="card" class="pa-4 text-center">
      <div style="display: flex">
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
        <div style="font-size: 1.3rem; margin-left: 5px; line-height: 1.8">
          {{ gameStore.alertMessage[0] }}
        </div>
      </div>
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
          align-items: center;
          flex-wrap: nowrap;
          overflow-y: auto;
          margin-left: 5px;
          margin-right: 5px;
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
  <v-dialog v-model="activeSongVisible" persistent max-width="500">
    <v-card color="card" class="pa-4 text-center">
      <v-card-title class="text-h6">Active Song Answer</v-card-title>
      <v-divider class="mb-2"></v-divider>
      <v-img :src="activeSongCoverImg" height="200"></v-img>
      <div style="display: flex; justify-content: center">
        <div>
          <div style="font-size: 1.5rem; font-weight: bolder">
            {{ gameStore.game?.activeTrack?.releaseYear }}
          </div>
          <div style="font-size: 1rem">
            {{ gameStore.game?.activeTrack?.name }}
          </div>
          <div style="font-size: 1rem">
            {{ gameStore.game?.activeTrack?.artist }}
          </div>
        </div>
        <v-btn
          color="#344f91"
          class="hide-print"
          icon
          small
          @click="searchSongYear(gameStore.game!.activeTrack!)"
        >
          <v-icon>mdi-magnify</v-icon>
        </v-btn>
      </div>
      <v-divider class="my-2"></v-divider>
      <div
        v-if="gameStore.getMe!.id === gameStore.game?.currentPlayerId"
        style="
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
          flex-wrap: wrap;
        "
      >
        <v-btn @click="apealVisible = true" color="error" variant="text"
          >Apeal Release Year</v-btn
        >
        <v-btn @click="gameStore.confirmSong" color="primary" variant="text"
          >Confirm Release Year</v-btn
        >
      </div>
      <div v-else style="font-weight: bolder; font-size: 1.3rem">
        Waiting on
        {{ gameStore.game!.players[gameStore.game!.currentPlayerId!].name }}'s
        Action
      </div>
    </v-card>
  </v-dialog>
  <v-dialog v-model="apealVisible" persistent max-width="500">
    <v-card color="card" class="pa-4">
      <v-card-title class="text-h6 text-center"
        >Active Song Answer</v-card-title
      >
      <v-divider class="mb-2"></v-divider>
      <v-img :src="activeSongCoverImg" height="200"></v-img>
      <div style="display: flex; justify-content: center">
        <div>
          <div style="font-size: 1.5rem; font-weight: bolder">
            {{ gameStore.game?.activeTrack?.releaseYear }}
          </div>
          <div style="font-size: 1rem">
            {{ gameStore.game?.activeTrack?.name }}
          </div>
          <div style="font-size: 1rem">
            {{ gameStore.game?.activeTrack?.artist }}
          </div>
        </div>
        <v-btn
          color="#344f91"
          class="hide-print"
          icon
          small
          @click="searchSongYear(gameStore.game!.activeTrack!)"
        >
          <v-icon>mdi-magnify</v-icon>
        </v-btn>
      </div>
      <v-form ref="apealForm" style="display: flex; justify-content: center">
        <v-text-field
          v-model="apealValue"
          max-width="395"
          class="px-2 mb-1 mt-2"
          type="number"
          :rules="[required]"
          label="Correct Song Release Year"
          placeholder="Enter Year"
        ></v-text-field>
      </v-form>
      <v-divider class="mb-2"></v-divider>
      <div
        style="
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        "
      >
        <v-btn @click="apealVisible = false" color="error" variant="text"
          >Cancel Apeal</v-btn
        >
        <v-btn @click="apealSong" color="primary" variant="text"
          >Confirm Apeal</v-btn
        >
      </div>
    </v-card>
  </v-dialog>
  <v-dialog v-model="actionApealVisible" persistent max-width="400px">
    <v-card color="card" class="pa-4 text-center">
      <v-card-title class="text-h6">Apeal Evaluation</v-card-title>
      <v-divider class="mb-2"></v-divider>
      <v-img :src="activeSongCoverImg" height="200"></v-img>
      <div style="display: flex; justify-content: center">
        <div>
          <div style="font-size: 1.5rem; font-weight: bolder">
            {{ gameStore.game?.activeTrack?.releaseYear }}
          </div>
          <div style="font-size: 1rem">
            {{ gameStore.game?.activeTrack?.name }}
          </div>
          <div style="font-size: 1rem">
            {{ gameStore.game?.activeTrack?.artist }}
          </div>
        </div>
        <v-btn
          color="#344f91"
          class="hide-print"
          icon
          small
          @click="searchSongYear(gameStore.game!.activeTrack!)"
          style="position: absolute; right: 20%"
        >
          <v-icon>mdi-magnify</v-icon>
        </v-btn>
      </div>
      <v-divider class="my-2"></v-divider>
      <v-row>
        <v-col cols="6">Old Release Year:</v-col>
        <v-col cols="6" style="font-weight: bolder">{{
          gameStore.game?.activeTrack?.releaseYear
        }}</v-col>
      </v-row>
      <v-divider class="my-2"></v-divider>
      <v-row>
        <v-col cols="6">New Release Year:</v-col>
        <v-col cols="6" style="font-weight: bolder">{{
          gameStore.game?.trackApeal
        }}</v-col>
      </v-row>
      <v-divider class="my-2"></v-divider>
      <div
        v-if="!gameStore.getMe!.ready && gameStore.getMe!.id !== gameStore.game!.players[gameStore.game!.currentPlayerId!].id"
        style="
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        "
      >
        <v-btn @click="actionApealSong(false)" color="error" variant="text">
          Deny Apeal
        </v-btn>
        <v-btn @click="actionApealSong(true)" color="success" variant="text">
          Approve Apeal
        </v-btn>
      </div>
      <div v-else style="font-weight: bolder; font-size: 1.3rem">
        Waiting for Other Players...
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
  <v-dialog v-model="actionGuessVisible" persistent max-width="400px">
    <v-card color="card" class="pa-4 text-center">
      <v-card-title class="text-h6">Guess Evaluation</v-card-title>
      <v-divider class="mb-2"></v-divider>

      <v-row>
        <v-col cols="6">Correct Name:</v-col>
        <v-col cols="6" style="font-weight: bolder">{{
          gameStore.game?.activeTrack?.name
        }}</v-col>
      </v-row>
      <v-row>
        <v-col cols="6">Correct Artist:</v-col>
        <v-col cols="6" style="font-weight: bolder">{{
          gameStore.game?.activeTrack?.artist
        }}</v-col>
      </v-row>
      <v-divider class="my-2"></v-divider>
      <v-row>
        <v-col cols="6">Guess Name:</v-col>
        <v-col cols="6" style="font-weight: bolder">{{
          gameStore.guessToAction?.name
        }}</v-col>
      </v-row>
      <v-row>
        <v-col cols="6">Guess Artist:</v-col>
        <v-col cols="6" style="font-weight: bolder">{{
          gameStore.guessToAction?.artist
        }}</v-col>
      </v-row>

      <v-divider class="my-2"></v-divider>

      <div
        v-if="!gameStore.getMe?.ready"
        style="
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        "
      >
        <v-btn @click="actionGuess(true)" color="success" variant="text">
          Guess is Correct
        </v-btn>
        <v-btn @click="actionGuess(false)" color="error" variant="text">
          Guess is Incorrect
        </v-btn>
      </div>
      <div v-else style="font-weight: bolder; font-size: 1.3rem">
        Waiting for Other Players...
      </div>
    </v-card>
  </v-dialog>
  <v-container>
    <div style="display: flex; gap: 5px; margin-bottom: 5px; flex-wrap: wrap">
      <v-menu v-for="player in gameStore.getPlayers" width="220">
        <template v-slot:activator="{ props }">
          <v-card
            v-bind="props"
            :color="player.id === gameStore.getCurrent?.id ? 'primary' : 'card'"
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
    <PlaySpotify :hideDetails="true"></PlaySpotify>
    <v-card
      color="card"
      class="mb-1"
      style="display: flex; flex-direction: column; justify-content: center"
    >
      <v-btn
        v-if="!spotifyStore.isActive"
        @click="openSpotifyApp"
        color="gray"
        class="ma-2"
        >Link to Song</v-btn
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
      <div
        v-if="
          gameStore.game?.turnState === TurnState.GuessSong &&
          !gameStore.getMe?.ready
        "
      >
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
        <div style="display: flex; justify-content: flex-end; max-width: 395px">
          <v-btn
            @click="guessSong"
            class="mx-2 my-2"
            width="380"
            color="primary"
            >Submit Guess</v-btn
          >
        </div>
      </div>
      <v-btn
        v-if="
          gameStore.getMe?.id !== gameStore.getCurrent?.id &&
          gameStore.game?.turnState === TurnState.PlaceTokens &&
          gameStore.getMe!.tokens > 0  &&
          !gameStore.getMe?.ready
        "
        @click="pass"
        class="ma-2"
        color="primary"
        >Pass</v-btn
      >
      <div style="display: flex">
        <v-btn
          v-if="gameStore.getMe!.tokens >= gameStore.game!.tokensToBuy"
          @click="gameStore.buySong()"
          class="ma-2"
          color="primary"
          >Buy Song {{ `(Cost: ${gameStore.game?.tokensToBuy} tokens)` }}</v-btn
        >
        <!-- <v-btn
          v-if="gameStore.getMe!.tokens >= 1 && gameStore.game?.turnState === TurnState.PlaceTimelineEntry"
          @click="gameStore.buyAnotherSong()"
          class="ma-2"
          color="primary"
          >Change Song (Cost 1 Token)</v-btn
        > -->
      </div>
    </v-card>
    <v-card color="card" class="mb-1">
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
              gameStore.game?.activeTrack?.url &&
            !gameStore.getCurrent?.timelineTokens.some(
              (token) => token.position === 0
            )
          "
          @click="handleAddBtn(0)"
          color="primary"
        >
          <span style="font-size: 24px; line-height: 1">+</span>
        </v-btn>
        <v-card
          v-if="
            gameStore.getCurrent?.timelineTokens.some(
              (token) => token.position === 0
            )
          "
          class="vertical-text"
          color="token"
          >{{
            gameStore.game!.players[
              gameStore.getCurrent?.timelineTokens.find(
                (token) => token.position === 0
              )!.playerId
            ].name
          }}</v-card
        >
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
            <div
              v-if="
                track.url === gameStore.game?.activeTrack?.url &&
                gameStore.game.turnState !== TurnState.ActionGuesses
              "
            >
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
              (index !== activeTrackIndex! - 1) && !gameStore.getCurrent?.timelineTokens.some((token) => token.position === index + 1)
            "
            @click="handleAddBtn(index + 1)"
            color="primary"
          >
            <span style="font-size: 24px; line-height: 1">+</span>
          </v-btn>
          <v-card
          v-if="
            gameStore.getCurrent?.timelineTokens.some(
              (token) => token.position === index + 1
            )
          "
          class="vertical-text"
          color="token"
          >{{
            gameStore.game!.players[
              gameStore.getCurrent?.timelineTokens.find(
                (token) => token.position === index + 1
              )!.playerId
            ].name
          }}</v-card
        >
        </template>
      </div>
    </v-card>
    <v-card color="card" class="pa-3">
      <div class="d-flex align-center">
        <v-icon color="primary" size="35" class="ma-2 mr-0"
          >mdi-text-long</v-icon
        >
        <v-card-title class="text-h6">Game Logs</v-card-title>
      </div>
      <v-list ref="logList" bg-color="card" density="compact" max-height="200">
        <v-list-item v-for="log in gameStore.game?.logs">
          <v-list-item-title class="text-body-2">
            <span style="font-size: 0.7rem; margin-right: 5px">{{
              new Date(log.timestamp).toLocaleTimeString()
            }}</span>
            <span
              :class="{
                'text-gray': !log.important,
              }"
              style="font-weight: bold"
            >
              {{ log.text }}
            </span>
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>

<style>
.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: upright;
  white-space: nowrap;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
