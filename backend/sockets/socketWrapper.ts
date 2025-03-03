import { Server, Socket } from "socket.io";
import { Game, gameDatabase, Player } from "@/database/game.data";

export class SocketWrapper {
  io: Server;

  constructor(io: Server) {
    this.io = io;
    this.initialize();
  }

  /**
   * Initializes socket event listeners
   */
  initialize() {
    this.io.on("connection", (socket: Socket) => {
      const clientId = socket.handshake.auth.clientId;
      const result = gameDatabase.getGameForPlayer(clientId);
      if (result) this.joinGame(socket, result.id, clientId);
      console.log(`User connected: ${clientId}`);

      socket.on("disconnect", () => {
        const result = gameDatabase.getGameForPlayer(clientId);
        if (result) {
          result.playerConnection(clientId, false);
          this.emitToRoom("left", result.id, result);
        }
      });

      socket.on("create", () => {
        const newGame = new Game();
        gameDatabase.set(newGame.id, newGame);
        this.joinGame(socket, newGame.id, clientId);
      });

      socket.on("update", (game: Game) => {
        gameDatabase.get(game.id).updateGame(game);
        this.emitToRoom("updated", game.id, gameDatabase.get(game.id));
        console.log(gameDatabase.get(game.id));
      });

      socket.on("join", (gameId: string) => {
        this.joinGame(socket, gameId, clientId);
      });

      socket.on("leave", (gameId) => {
        this.leaveGame(socket, gameId, clientId);
      });

      socket.on("sendMessage", ({ gameId, message }) => {
        this.io.to(gameId).emit("receiveMessage", message);
      });
    });
  }

  joinGame(socket: Socket, gameId: string, clientId: string) {
    socket.join(gameId);
    gameDatabase
      .get(gameId)
      ?.addPlayer(
        clientId,
        new Player(
          clientId,
          `Player ${
            Object.values(gameDatabase.get(gameId)!.players).length + 1
          }`
        )
      );
    gameDatabase.get(gameId)?.playerConnection(clientId, true);
    this.emitToRoom("joined", gameId, gameDatabase.get(gameId));
    console.log(`${clientId} joined room ${gameId}`);
  }

  leaveGame(socket: Socket, gameId: string, clientId: string) {
    socket.join(gameId);
    gameDatabase.get(gameId)?.removePlayer(clientId);
    gameDatabase.get(gameId)?.playerConnection(clientId, false);
    this.emitToRoom("left", gameId, gameDatabase.get(gameId));
    console.log(`${clientId} left room ${gameId}`);
  }

  /**
   * Broadcasts event and any additional args to all sockets
   * @param event Event to broadcast
   * @param args Any additional args to send
   */
  emit(event: string, ...args: any[]) {
    this.io.emit(event, ...args);
  }

  /**
   * Emits an event to all users in a room
   * @param gameId - The target room
   * @param event - The event name
   * @param data - The event data
   */
  emitToRoom(event: string, gameId: string, ...args: any[]) {
    this.io.to(gameId).emit(event, ...args);
    console.log(`Event "${event}" emitted to room ${gameId}:`, ...args);
  }

  /**
   * Emits an event to a specific user
   * @param userId - The target user ID
   * @param event - The event name
   * @param data - The event data
   */
  emitToUser(event: string, socketId: string, ...args: any[]) {
    this.io.to(socketId).emit(event, ...args);
    console.log(`Event "${event}" sent to user ${socketId}:`, ...args);
  }
}
