import { Router } from "express";
import controller from "../controllers/game.controller";

const router = Router();

router.post("/create", controller.create);
router.get("/:gameId", controller.read);
router.post("/update/:gameId", controller.update);
router.post("/join/:gameId", controller.join);
router.post("/leave/:gameId", controller.leave);

export default router;
