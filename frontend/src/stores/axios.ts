import axios from "axios";
import { useGameStore } from "./game";
import { generateRandomString } from "../lib/utility";

export const axiosApi = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
});

export const getClientId = () => {
  let clientId = localStorage.getItem("clientId");
  if (!clientId) {
    clientId = generateRandomString(10);
    localStorage.setItem("clientId", clientId);
  }
  return clientId;
};

axiosApi.interceptors.request.use((config) => {
  const gameStore = useGameStore();
  config.headers["socketId"] = gameStore.socket.id;
  config.headers["clientId"] = getClientId();
  return config;
});
