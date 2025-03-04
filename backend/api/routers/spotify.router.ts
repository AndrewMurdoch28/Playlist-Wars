import { Router } from "express";
import controller from "../controllers/spotify.controller";

const router = Router();

router.get("/token", controller.getToken);
router.post("/playlists", controller.getPlaylists);
router.put("/playSong", controller.playSong);

export default router;
