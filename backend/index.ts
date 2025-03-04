import dotenv from "dotenv";
import express, { Application, Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import gameRouter from "./api/routers/game.router";
import spotifyRouter from "./api/routers/spotify.router";
import { SocketWrapper } from "./sockets/socketWrapper";
import { GameDatabase } from "./database/game.data";
import cookieParser from "cookie-parser";
import axios from "axios";
import qs from "qs";
import { generateRandomString } from "./lib/utils";

dotenv.config();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;
const FRONTEND_URL = process.env.FRONTEND_URL!;

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || "3001", 10);

const allowedOrigins: string[] = FRONTEND_URL
  ? [FRONTEND_URL]
  : [];

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  },
});

export const gameDatabase = new GameDatabase();

export const socketWrapper = new SocketWrapper(io);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/login', (req, res) => {

  var scope = "streaming user-read-email user-read-private"
  var state = generateRandomString(16);

  var auth_query_parameters = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: state
  })

  res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
})

app.get(
  "/callback",
  async (req: express.Request, res: express.Response): Promise<void> => {
    const code = req.query.code as string;

    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        qs.stringify({
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      res.cookie("access_token", response.data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600 * 1000,
      });

      res.cookie("refresh_token", response.data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 3600 * 1000,
      });

      res.redirect(`${FRONTEND_URL}/game/menu`);
    } catch (error) {
      console.error("Error exchanging code:", error);
      res.status(500).send("Error getting token");
    }
  }
);

app.get("/token", (req: Request, res: Response) => {
  const accessToken = req.cookies["access_token"];
  if (!accessToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ access_token: accessToken });
});

app.get("/", (req: Request, res: Response) => {
  res.send("Playlist Wars Backend");
});

app.use("/game", gameRouter);
app.use("/spotify", spotifyRouter);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
