import { gameDatabase, Game, Track } from "../database/game.data";

const service = {
  create: () => {
    const newGame = new Game();
    gameDatabase.set(newGame.id, newGame);
    return newGame.getObject();
  },
};

export default service;
