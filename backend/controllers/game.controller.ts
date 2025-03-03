import { Request, Response } from "express";
import gameService from "../services/game.service";

const controller = {
  create: (req: Request, res: Response) => {
    const newGame = gameService.create();
    res.status(200).send(newGame);
  },
};

export default controller;
