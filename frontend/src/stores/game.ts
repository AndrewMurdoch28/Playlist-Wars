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

  const callbackCountdown = ref<Function>(() => { });

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

  const startTimer = (length: number, callback: Function) => {
    socket.emit("startTimer", game.value!.id, length);
    callbackCountdown.value = callback;
  }

  socket.on("startedTimer", (countdown: number) => {
    game.value!.countdown = countdown;
    socket.on("timerUpdated", (countdown: number) => {
      console.log("timer value", countdown)
      game.value!.countdown = countdown;
    });
    socket.on("timerFinished", () => {
      socket.removeListener("timerUpdated");
      socket.removeListener("timerFinished");
      game.value!.countdown = 0;
      callbackCountdown.value();
    });
  })

  const getCorrectPosition = (activeTrack: Track, timeline: Track[]) => {
    if (!activeTrack || !timeline.length) return null;

    const tempTimeline = timeline.filter(track => track.url !== activeTrack.url);
    const activeYear = activeTrack.releaseYear;

    if (!tempTimeline.length) return 0;

    for (let i = 0; i <= tempTimeline.length; i++) {
      const prevYear = tempTimeline[i - 1]?.releaseYear ?? -Infinity;
      const nextYear = tempTimeline[i]?.releaseYear ?? Infinity;

      if (activeYear >= prevYear && activeYear <= nextYear) {
        return i;
      }
    }
    return tempTimeline.length;
  };


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
    showAddBtns,
    getClientId,
    getPlayers,
    getMe,
    getPlaylists,
    create,
    read,
    update,
    join,
    leave,
    getCorrectPosition,
    startTimer,
    getTrackForTimeline,
  };
});
