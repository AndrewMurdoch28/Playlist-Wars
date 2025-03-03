import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { axiosApi } from "./axios";
import { io } from "socket.io-client";
import { router } from "../router/index";
import { Game } from "../interfaces/game";

export const useGameStore = defineStore("game", () => {
  const loading = ref<boolean>(true);
  const game = ref<Game | null>(null);

  const getClientId = () => {
    let clientId = localStorage.getItem("clientId");
    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem("clientId", clientId);
    }
    return clientId;
  };

  const socket = io(import.meta.env.VITE_BACKEND_URL, {
    auth: { clientId: getClientId() },
    autoConnect: false,
  });
  socket.connect();
  loading.value = false;

  const getLoading = computed(() => loading.value);
  const getGame = computed(() => game.value);

  const getPlayers = computed(() => {
    if (game.value) return Array.from(Object.values(game.value?.players!));
    else return null;
  });

  const getMe = computed(() =>
    getPlayers.value?.find((player) => player.id === getClientId())
  );

  // const create = async () => {
  //   const response = await axiosApi.post("game/create");
  //   currentGameId.value = response.data.gameId;
  // };

  const create = () => {
    socket.emit("create");
    console.log(`Creating Game`);
  };

  const update = () => {
    socket.emit("update", game.value);
    console.log(`Updating Game`);
  };

  const join = (gameId: string) => {
    socket.emit("join", gameId);
    console.log(`Joining ${gameId}`);
  };

  const leave = () => {
    socket.emit("leave", getGame.value?.id);
    router.replace({ name: "Menu" });
    console.log(`Leaving ${getGame.value?.id}`);
  };

  socket.on("joined", (data: Game) => {
    game.value = data;
    router.push({ name: "RoomView", params: { gameId: data.id } });
    console.log(`Joined ${data.id}`);
  });

  socket.on("left", (data: Game) => {
    game.value = data;
    console.log(`left`);
  });

  socket.on("updated", (data: Game) => {
    game.value = data;
  });

  return {
    getLoading,
    getClientId,
    getGame,
    getPlayers,
    getMe,
    create,
    update,
    join,
    leave,
  };
});
