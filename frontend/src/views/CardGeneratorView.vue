<script setup lang="ts">
import { ref } from "vue";
import VueQrcode from "vue-qrcode";
import { useSpotifyStore } from "../stores/spotify";
import { Track } from "../interfaces/game";
import { router } from "../router/index";

const spotifyStore = useSpotifyStore();

const txtValue = ref<string>("");
const trackList = ref<Track[]>([]);
const loading = ref<boolean>(false);
const form = ref();
const errorMessage = ref<string | null>(null);
const editYears = ref<boolean>(false);

const numOfCardsPerPage = 12;

// Dynamic width and height
const cardWidth = ref<string>("6"); // Default width in cm
const cardHeight = ref<string>("6"); // Default height in cm

const fetchPlaylists = async () => {
  loading.value = true;
  const result = await spotifyStore.readPlaylistsFrontend([txtValue.value]);
  if (result.success) {
    trackList.value = result.trackList;
  } else {
    errorMessage.value = "Failed to fetch playlist. Please check the link.";
  }
  loading.value = false;
};

const getSongYearUrl = (track: { artist: string; name: string }) => {
  const query = encodeURIComponent(
    `${track.name} By ${track.artist} release year`
  );
  return `https://www.google.com/search?q=${query}`;
};

const searchSongYear = (track: { artist: string; name: string }) => {
  window.open(getSongYearUrl(track), "_blank");
};

const getRowsFront = (index: number) => {
  let chunks = [];
  for (let i = index; i < index + numOfCardsPerPage; i += 3) {
    const chunk = trackList.value.slice(i, i + 3);
    chunks.push(chunk);
  }
  return chunks;
};

const getRowsBack = (index: number) => {
  let chunks = [];
  for (let i = index; i < index + numOfCardsPerPage; i += 3) {
    const chunk = trackList.value.slice(i, i + 3);
    chunks.push(chunk.reverse());
  }
  return chunks;
};

const printCards = () => {
  editYears.value = false;
  setTimeout(() => {
    window.print();
  }, 500);
};

const required = (value: string) =>
  Array.isArray(value)
    ? value.length > 0 || "Required."
    : !!value || "Required.";
</script>

<template>
  <v-btn
    style="position: absolute; top: 5px; left: 0px"
    color="grey"
    variant="plain"
    @click="router.push('/')"
  >
    ⬅️ Back
  </v-btn>
  <v-btn
    @click="editYears = !editYears"
    color="#344f91"
    class="hide-print"
    style="
      position: fixed;
      top: 50%;
      left: 3px;
      transform: translateY(-50%);
      z-index: 1000;
    "
    ><v-icon>{{ editYears ? "mdi-eye" : "mdi-pencil" }}</v-icon></v-btn
  >
  <div>
    <div class="centered">
      <v-form ref="form">
        <div style="display: flex; gap: 3px; flex-wrap: wrap">
          <v-text-field
            v-model="txtValue"
            variant="solo-filled"
            label="Link To Spotify Playlist"
            :rules="[required]"
            :error="!!errorMessage"
            :error-messages="errorMessage"
            style="width: 100vw; max-width: 800px"
            clearable
          ></v-text-field>
          <v-text-field
            v-model="cardWidth"
            variant="solo-filled"
            label="Card Width (cm)"
            type="number"
            min="1"
            :error="false"
          ></v-text-field>
          <v-text-field
            v-model="cardHeight"
            variant="solo-filled"
            label="Card Height (cm)"
            type="number"
            min="1"
            :error="false"
          ></v-text-field>
        </div>
      </v-form>

      <v-btn :loading="loading" @click="fetchPlaylists"> Generate Cards </v-btn>
      <v-btn
        :disabled="trackList.length === 0"
        @click="printCards"
        color="blue"
      >
        Print Cards
      </v-btn>
    </div>

    <div class="print-container">
      <!-- Front Side: QR Code for each track (with 9 tracks per page) -->
      <div v-if="trackList.length > 1">
        <template v-for="(track, index) in trackList" :key="track.url">
          <div v-if="index % numOfCardsPerPage === 0" class="print-page">
            <div class="print-rows-front" v-for="row in getRowsFront(index)">
              <div
                class="print-card"
                v-for="track in row"
                :style="{ width: cardWidth + 'cm', height: cardHeight + 'cm' }"
              >
                <VueQrcode
                  :value="track.url"
                  :size="150"
                  :color="{ dark: '#000000', light: '#ffffff' }"
                  type="image/png"
                />
              </div>
            </div>
          </div>

          <!-- Back Side: Song Details for each track (with 9 tracks per page) -->
          <div v-if="index % numOfCardsPerPage === 0" class="print-page">
            <div class="print-rows-back" v-for="row in getRowsBack(index)">
              <div
                class="print-card"
                v-for="track in row"
                :style="{ width: cardWidth + 'cm', height: cardHeight + 'cm' }"
              >
                <v-btn
                  color="#344f91"
                  class="hide-print"
                  icon
                  small
                  @click="searchSongYear(track)"
                >
                  <v-icon>mdi-magnify</v-icon>
                </v-btn>
                <v-text-field
                  v-if="editYears"
                  v-model="track.releaseYear"
                  class="hide-print"
                  label="Release Year"
                  variant="solo-filled"
                  bg-color="#344f91"
                  density="default"
                  style="max-height: 40px; width: 80%; margin-bottom: 30px"
                ></v-text-field>
                <p v-if="!editYears" style="font-size: 50px">
                  {{ track.releaseYear }}
                </p>
                <p><strong>Artist:</strong>{{ track.artist }}</p>
                <p><strong>Name:</strong> {{ track.name }}</p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style>
/* Center form */
.centered {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  margin-top: 50px;
  margin-bottom: 5px;
  gap: 5px;
}

/* Printable card container */
.print-container {
  width: min-content;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

/* Page styles */
.print-page {
  page-break-before: always; /* Forces a page break before each new set of cards */
}

.print-rows-front {
  display: flex;
}

.print-rows-back {
  display: flex;
  justify-content: flex-end;
}

.print-card {
  margin: 0px;
  border: 1px solid black;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: white;
}

/* Print Layout */
@media print {
  body {
    background: white;
  }

  .hide-print {
    display: none !important;
  }

  .centered,
  .v-btn {
    display: none; /* Hide buttons when printing */
  }

  /* Page break logic */
  .print-page {
    page-break-before: always; /* Forces page break between odd/even pages */
  }
}
</style>
