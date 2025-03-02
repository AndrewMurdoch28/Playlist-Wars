import { Request, Response } from "express";
import gameService from "../services/game.service";

const controller = {
  create: (req: Request, res: Response) => {
    gameService.create();
    res.status(200).send();
  },
};

export default controller;
