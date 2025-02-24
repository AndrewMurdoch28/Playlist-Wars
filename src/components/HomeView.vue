<script setup lang="ts">
import { ref } from "vue";

const txtValue = ref<string>();

const apiCall = () => {
  console.log(txtValue.value);
};
</script>

<template>
  <div class="centered">
    <v-text-field
      v-model="txtValue"
      variant="solo-filled"
      label="Link To Spotify Playlist"
      class="mr-2"
      style="width: 30vw"
    ></v-text-field>
    <div class="btn-container">
      <v-btn @click="apiCall">Submit</v-btn>
    </div>
  </div>
</template>

<style>
.centered {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  width: 35vw;
}

.btn-container {
  margin-left: auto;
}
</style>
