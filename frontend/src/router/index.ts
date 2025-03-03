import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import PlaylistWarsView from "../views/PlaylistWarsView.vue";
import CardGeneratorView from "../views/CardGeneratorView.vue";
import RoomView from "../views/RoomView.vue";

const routes = [
  { path: "/", component: HomeView },
  {
    path: "/game",
    children: [
      {
        name: "Menu",
        path: "menu",
        component: PlaylistWarsView,
      },
      {
        name: "RoomView",
        path: ":gameId",
        component: RoomView,
      },
    ],
  },
  { path: "/card-generator", component: CardGeneratorView },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
