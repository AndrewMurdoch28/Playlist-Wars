import { defineStore } from "pinia";
import { ref } from "vue";
import { axiosApi } from "./axios";

export const useGameStore = defineStore("game", () => {
  const createLobby = async () => {
    const response = await axiosApi.post("game/lobby");
  };

  return {
    createLobby,
  };
});
