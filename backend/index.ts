import dotenv from "dotenv";
import express, { Application, Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import gameRouter from "./routers/game.router";

dotenv.config();

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || "3001", 10);

const allowedOrigins: string[] = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Playlist Wars Backend");
});

app.use("/game", gameRouter);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("message", (data) => {
    console.log("Received message:", data);
    io.emit("message", data);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
