import { Router } from "express";
import gameController from "../controllers/game.controller";

const router = Router();

router.post("/create", gameController.create);

export default router;
