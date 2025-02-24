<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";
import VueQrcode from "vue-qrcode";

const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const spotifySecret = import.meta.env.VITE_SPOTIFY_SECRET;
const txtValue = ref<string>("");
const trackList = ref<
  {
    artist: string;
    name: string;
    year: string;
    url: string;
  }[]
>([]);
const loading = ref<boolean>(false);
const form = ref();
const errorMessage = ref<string | null>(null);

const numOfCardsPerPage = 12;

const getSpotifyToken = async () => {
  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      headers: {
        Authorization: `Basic ${btoa(`${spotifyClientId}:${spotifySecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return response.data.access_token;
};

const fetchPlaylistTracks = async () => {
  errorMessage.value = null; // Reset error before API call
  if (!(await form.value?.validate()).valid) return;

  try {
    loading.value = true;
    const token = await getSpotifyToken();
    const playlistId = txtValue.value.split("/").pop()?.split("?")[0];

    const { data } = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    trackList.value = data.items.map((item: any) => ({
      artist: item.track.artists.map((a: any) => a.name).join(", "),
      name: item.track.name,
      year: item.track.album.release_date.split("-")[0],
      url: item.track.external_urls.spotify,
    }));
  } catch (error) {
    console.error("Error fetching playlist:", error);
    errorMessage.value = "Failed to fetch playlist. Please check the link.";
  } finally {
    loading.value = false;
  }
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
  window.print();
};

const required = (value: string) =>
  Array.isArray(value)
    ? value.length > 0 || "Required."
    : !!value || "Required.";
</script>

<template>
  <div class="centered">
    <v-form ref="form">
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
    </v-form>
    <v-btn :loading="loading" @click="fetchPlaylistTracks">
      Generate Cards
    </v-btn>
    <v-btn :disabled="trackList.length === 0" @click="printCards" color="blue">
      Print Cards
    </v-btn>
  </div>

  <div class="print-container">
    <!-- Front Side: QR Code for each track (with 9 tracks per page) -->
    <div v-if="trackList.length > 1">
      <template v-for="(track, index) in trackList" :key="track.url">
        <div v-if="index % numOfCardsPerPage === 0" class="print-page">
          <div class="print-rows-front" v-for="row in getRowsFront(index)">
            <div class="print-card" v-for="track in row">
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
            <div class="print-card" v-for="track in row">
              <p style="font-size: 50px">{{ track.year }}</p>
              <p><strong>Artist:</strong> {{ track.artist }}</p>
              <p><strong>Song Name:</strong> {{ track.name }}</p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Special handling for the single track -->
    <div v-if="trackList.length === 1">
      <!-- QR Code for the single track -->
      <div class="print-page">
        <div class="print-cards">
          <div class="print-card">
            <VueQrcode
              :value="trackList[0].url"
              :size="150"
              :color="{ dark: '#000000', light: '#ffffff' }"
              type="image/png"
            />
          </div>
        </div>
      </div>

      <!-- Song Details for the single track -->
      <div class="print-page">
        <div class="print-cards">
          <div class="print-card-back">
            <p style="font-size: 50px">{{ trackList[0].year }}</p>
            <p><strong>Artist:</strong> {{ trackList[0].artist }}</p>
            <p><strong>Song Name:</strong> {{ trackList[0].name }}</p>
          </div>
        </div>
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
  gap: 5px;
}

/* Printable card container */
.print-container {
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
  width: 6cm;
  height: 5.5cm;
  margin: 10px;
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
