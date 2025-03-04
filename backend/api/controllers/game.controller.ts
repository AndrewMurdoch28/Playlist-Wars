import { Request, Response } from "express";
import { socketWrapper } from "../../index";
import { gameDatabase } from "../../index";
import { Game } from "@/database/game.data";

const controller = {
  create: (req: Request, res: Response) => {
    const socketId = req.get("socketId") as string;
    const clientId = req.get("clientId") as string;
    console.log(socketId, clientId);
    const newGame = new Game();
    gameDatabase.set(newGame.id, newGame);
    if (newGame.id) {
      socketWrapper.joinGame(
        socketWrapper.sockets.get(socketId)!,
        newGame.id,
        clientId
      );
      res.status(201).send(newGame.id);
    } else {
      res.status(400).send(newGame.id);
    }
  },
  read: (req: Request, res: Response) => {
    const result = gameDatabase.get(req.params.gameId);
    res.status(result ? 200 : 404).send(result);
  },
  update: (req: Request, res: Response) => {
    const gameId = req.params.gameId;
    gameDatabase.get(gameId)?.updateGame(req.body);
    if (gameId) {
      socketWrapper.emitToRoom("updated", gameId, gameDatabase.get(gameId));
      res.status(201).send(gameId);
    } else {
      res.status(400).send(gameId);
    }
  },
  join: (req: Request, res: Response) => {
    const socketId = req.get("socketId") as string;
    const clientId = req.get("clientId") as string;
    const gameId = req.params.gameId;
    if (gameId) {
      try {
        socketWrapper.joinGame(
          socketWrapper.sockets.get(socketId)!,
          gameId,
          clientId
        );
        res.status(200).send(gameId);
      } catch (error) {
        res.status(400).send(error);
      }
    } else {
      res.status(400).send(gameId);
    }
  },
  leave: (req: Request, res: Response) => {
    const socketId = req.get("socketId") as string;
    const clientId = req.get("clientId") as string;
    const gameId = req.params.gameId;
    if (gameId) {
      socketWrapper.leaveGame(
        socketWrapper.sockets.get(socketId)!,
        gameId,
        clientId
      );
      res.status(200).send(gameId);
    } else {
      res.status(400).send(gameId);
    }
  },
};

export default controller;
