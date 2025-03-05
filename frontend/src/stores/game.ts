import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { axiosApi, getClientId } from "./axios";
import { io } from "socket.io-client";
import { router } from "../router/index";
import { Game } from "../interfaces/game";
import { useSpotifyStore } from "./spotify";

export const useGameStore = defineStore("game", () => {
  const spotifyStore = useSpotifyStore();

  const loading = ref<boolean>(true);
  const game = ref<Game | null>(null);

  const socket = io(import.meta.env.VITE_BACKEND_URL, {
    auth: { clientId: getClientId() },
    autoConnect: false,
  });
  socket.connect();
  loading.value = false;

  const getPlayers = computed(() => {
    if (game.value) return Array.from(Object.values(game.value?.players!));
    else return null;
  });

  const getMe = computed(() =>
    getPlayers.value?.find((player) => player.id === getClientId())
  );

  const getPlaylists = computed(() => {
    if (game.value) return Array.from(Object.values(game.value?.playlists!));
    else return null;
  });

  const create = async () => {
    const response = await axiosApi.post("/game/create");
  };

  const read = async (gameId: string) => {
    const result = await axiosApi.get(`/game/${gameId}`);
  };

  const update = async () => {
    const response = await axiosApi.post(
      `/game/update/${game.value?.id}`,
      game.value
    );
  };

  const join = async (gameId: string) => {
    const response = await axiosApi.post(`/game/join/${gameId}`);
  };

  const leave = async () => {
    const response = await axiosApi.post(`/game/leave/${game.value?.id}`);
    router.replace({ name: "Menu" });
  };

  socket.on("joined", (data: Game) => {
    game.value = data;
    if (data.started)
      router.replace({ name: "GameView", params: { gameId: data.id } });
    else router.replace({ name: "RoomView", params: { gameId: data.id } });
    console.log(`Joined ${data.id}`);
  });

  socket.on("left", (data: Game) => {
    game.value = data;
    console.log(`left`);
  });

  socket.on("updated", (data: Game) => {
    console.log("updated", data);
    game.value = data;
    if (data.started)
      router.replace({ name: "GameView", params: { gameId: data.id } });
  });

  const getTrackForTimeline = () => {
    const trackForTimeline =
      game.value!.tracks[
      Math.floor(Math.random() * game.value!.tracks.length)
      ];
    game.value!.tracks = game.value!.tracks.filter(
      (track) => track.url !== trackForTimeline.url
    );
    return trackForTimeline;
  }

  return {
    loading,
    game,
    socket,
    getClientId,
    getPlayers,
    getMe,
    getPlaylists,
    create,
    read,
    update,
    join,
    leave,
    getTrackForTimeline,
  };
});
