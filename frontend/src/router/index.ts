import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import PlaylistWarsView from "../views/PlaylistWarsView.vue";
import CardGeneratorView from "../views/CardGeneratorView.vue";

const routes = [
  { path: "/", component: HomeView },
  { path: "/game", component: PlaylistWarsView },
  { path: "/card-generator", component: CardGeneratorView },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
