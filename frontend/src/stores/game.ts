import { defineStore } from "pinia";
import { computed, Ref, ref } from "vue";
import { axiosApi, getClientId } from "./axios";
import { io } from "socket.io-client";
import { router } from "../router/index";
import { AlertType, Game, Track, TurnState } from "../interfaces/game";
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

  const showAddBtns = ref<boolean>(false);

  const callbackCountdown = ref<Function>(() => {});
  const countdownVisible = ref<boolean>(false);
  const countdownLength = ref<number>(0);
  const countdownValue = ref<number>(0);

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
  });

  socket.on("left", (data: Game) => {
    game.value = data;
  });

  socket.on("updated", (data: Game) => {
    game.value = data;
    if (data.started)
      router.replace({ name: "GameView", params: { gameId: data.id } });
  });

  const alertMessage = ref<string>("");
  const alertType = ref<string>(AlertType.Normal);
  const alertVisible = ref<boolean>(false);

  socket.on("alertMessage", (message: string, result: boolean) => {
    alertMessage.value = message;
    alertType.value = result ? AlertType.Success : AlertType.Failure;
    alertVisible.value = true;
  });

  const placeTimelineEntry = (position: number) => {
    socket.emit("placeTimelineEntry", game.value!.id, position);
  };

  const startTimer = (
    length: number,
    showDialog: boolean,
    callback: Function
  ) => {
    socket.emit("startTimer", game.value!.id, length, showDialog);
    callbackCountdown.value = callback;
  };

  socket.on("startedTimer", (value: number, showDialog: boolean) => {
    countdownLength.value = value;
    countdownValue.value = value;
    countdownVisible.value = showDialog;
    console.log("startedTimer", countdownValue.value);
  });

  socket.on("timerUpdated", (value: number) => {
    console.log("timerUpdated", value);
    countdownValue.value = value;
  });

  socket.on("timerFinished", () => {
    countdownValue.value = 0;
    countdownLength.value = 0;
    callbackCountdown.value();
    callbackCountdown.value = () => {};
  });

  const getTrackForTimeline = () => {
    const trackForTimeline =
      game.value!.tracks[Math.floor(Math.random() * game.value!.tracks.length)];
    game.value!.tracks = game.value!.tracks.filter(
      (track) => track.url !== trackForTimeline.url
    );
    return trackForTimeline;
  };

  return {
    loading,
    game,
    socket,
    showAddBtns,
    countdownVisible,
    countdownLength,
    countdownValue,
    getClientId,
    getPlayers,
    getMe,
    getPlaylists,
    create,
    read,
    update,
    join,
    leave,
    alertMessage,
    alertType,
    alertVisible,
    placeTimelineEntry,
    startTimer,
    getTrackForTimeline,
  };
});
