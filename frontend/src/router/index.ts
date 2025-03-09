import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/login",
    component: () => {
      window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/login`;
    },
  },
  {
    name: "Menu",
    path: "/menu",
    component: () => import("../views/PlaylistWarsView.vue"),
  },
  {
    name: "RoomView",
    path: "/room/:gameId",
    component: () => import("../views/RoomView.vue"),
  },
  {
    name: "GameView",
    path: "/game/:gameId",
    component: () => import("../views/GameView.vue"),
  },
  {
    path: "/card-generator",
    component: () => import("../views/CardGeneratorView.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    component: () => import("../views/HomeView.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
