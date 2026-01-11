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
const cardWidth = ref<string>("6");
const cardHeight = ref<string>("6");
const singleSided = ref<boolean>(false);

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

const getRowsSingleSided = (index: number) => {
  let chunks = [];
  for (let i = index; i < index + numOfCardsPerPage; i += 3) {
    const chunk = trackList.value.slice(i, i + 3);
    chunks.push(chunk);
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
    v-if="!singleSided"
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
          <v-select
            v-model="singleSided"
            variant="solo-filled"
            label="Card Mode"
            :items="[
              { title: 'Two-Sided', value: false },
              { title: 'Single-Sided', value: true },
            ]"
            item-title="title"
            item-value="value"
          ></v-select>
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
      <div v-if="trackList.length > 1">
        <template v-if="!singleSided">
          <template v-for="(track, index) in trackList" :key="track.url">
            <div v-if="index % numOfCardsPerPage === 0" class="print-page">
              <div class="print-rows-front" v-for="row in getRowsFront(index)">
                <div
                  class="print-card print-card-front"
                  v-for="track in row"
                  :style="{
                    width: cardWidth + 'cm',
                    height: cardHeight + 'cm',
                  }"
                >
                  <div class="qr-container-full">
                    <VueQrcode
                      :value="track.url"
                      :size="600"
                      :color="{ dark: '#000000', light: '#ffffff' }"
                      type="image/png"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div v-if="index % numOfCardsPerPage === 0" class="print-page">
              <div class="print-rows-back" v-for="row in getRowsBack(index)">
                <div
                  class="print-card"
                  v-for="track in row"
                  :style="{
                    width: cardWidth + 'cm',
                    height: cardHeight + 'cm',
                  }"
                >
                  <div class="card-content">
                    <v-btn
                      color="#344f91"
                      class="hide-print search-btn"
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
                      style="max-height: 40px; width: 90%; margin-bottom: 10px"
                    ></v-text-field>
                    <p v-if="!editYears" class="year-text">
                      {{ track.releaseYear }}
                    </p>
                    <div class="text-container">
                      <p class="info-text">
                        <strong>Artist:</strong> {{ track.artist }}
                      </p>
                      <p class="info-text">
                        <strong>Name:</strong> {{ track.name }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>
        <template v-else>
          <template
            v-for="(track, index) in trackList"
            :key="track.url + '-single'"
          >
            <div v-if="index % numOfCardsPerPage === 0" class="print-page">
              <div
                class="print-rows-front"
                v-for="row in getRowsSingleSided(index)"
              >
                <div
                  class="print-card print-card-single"
                  v-for="track in row"
                  :style="{
                    width: cardWidth + 'cm',
                    height: cardHeight + 'cm',
                  }"
                >
                  <div class="qr-container-single">
                    <VueQrcode
                      :value="track.url"
                      :size="85"
                      :color="{ dark: '#000000', light: '#ffffff' }"
                      type="image/png"
                    />
                  </div>
                  <div class="card-content-single">
                    <div class="text-container-single">
                      <p class="info-text-single">
                        <strong>Artist:</strong> {{ track.artist }}
                      </p>
                      <p class="info-text-single">
                        <strong>Name:</strong> {{ track.name }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style>
.centered {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  margin-top: 50px;
  margin-bottom: 5px;
  gap: 5px;
}

.print-container {
  width: min-content;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.print-page {
  page-break-before: always;
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
  justify-content: flex-start;
  text-align: center;
  background: white;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
}

.print-card-front {
  padding: 0;
  overflow: hidden;
}

.qr-container-full {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.qr-container-full canvas,
.qr-container-full img {
  width: 100% !important;
  height: 100% !important;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.card-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-height: 0;
  padding: 0 5px;
}

.text-container {
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 5px;
}

.search-btn {
  margin-bottom: 3px;
}

.year-text {
  font-size: 42px;
  margin: 8px 0 12px 0;
  line-height: 1;
  font-weight: bold;
}

.info-text {
  font-size: 13px;
  margin: 0;
  padding: 0 5px;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
  width: 100%;
  line-height: 1.4;
}

.print-card-single {
  justify-content: flex-start;
}

.qr-container-single {
  height: 155px;
  flex-shrink: 0;
  margin-bottom: 3px;
  margin-top: 3px;
}

.card-content-single {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-height: 0;
  padding: 0 5px;
}

.text-container-single {
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 3px;
}

.info-text-single {
  font-size: 10px;
  margin: 0;
  padding: 0 3px;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
  width: 100%;
  line-height: 1.2;
}

@media print {
  body {
    background: white;
  }
  .hide-print {
    display: none !important;
  }
  .centered,
  .v-btn {
    display: none;
  }
  .print-page {
    page-break-before: always;
  }
}
</style>