import { Router } from "express";
import gameController from "../controllers/game.controller";

const router = Router();

router.post("/lobby", gameController.create);

export default router;
