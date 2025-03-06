import { Server, Socket } from "socket.io";
import { Game, Player } from "@/database/game.data";
import { gameDatabase } from "..";

export class SocketWrapper {
  io: Server;
  sockets: Map<string, Socket>;

  constructor(io: Server) {
    this.io = io;
    this.sockets = new Map<string, Socket>();
    this.initialize();
  }

  /**
   * Initializes socket event listeners
   */
  initialize() {
    this.io.on("connection", (socket: Socket) => {
      this.sockets.set(socket.id, socket);
      const clientId = socket.handshake.auth.clientId;

      const result = gameDatabase.gameForPlayer(clientId);
      if (result) this.joinGame(socket, result.id, clientId);
      console.log(`User connected: ${clientId}`);

      socket.on("disconnect", () => {
        this.sockets.delete(socket.id);
        const result = gameDatabase.gameForPlayer(clientId);
        if (result) {
          result.playerConnection(clientId, false);
          this.emitToRoom("left", result.id, result);
        }
      });

      socket.on("startTimer", (gameId: string, length: number) => {
        let countdown = length;
        this.emitToRoom("startedTimer", gameId, length);
        const timer = setInterval(() => {
          if (countdown > 0) {
            countdown--;
            this.emitToRoom("timerUpdated", gameId, countdown);
          } else {
            clearInterval(timer);
            this.emitToRoom("timerFinished", gameId);
          }
        }, 1000);
      });
    });
  }

  joinGame(socket: Socket, gameId: string, clientId: string) {
    const game = gameDatabase.get(gameId);
    if (!game) throw new Error("Game Does Not Exist");
    if (game.started && !game.players[clientId])
      throw new Error("Game Already Started");

    socket.join(gameId);
    gameDatabase
      .get(gameId)
      ?.addPlayer(
        clientId,
        new Player(
          clientId,
          `Player ${Object.values(gameDatabase.get(gameId)!.players).length + 1
          }`,
          Object.values(gameDatabase.get(gameId)!.players).length
        )
      );
    gameDatabase.get(gameId)?.playerConnection(clientId, true);
    this.emitToRoom("joined", gameId, gameDatabase.get(gameId));
  }

  leaveGame(socket: Socket, gameId: string, clientId: string) {
    socket.join(gameId);
    gameDatabase.get(gameId)?.removePlayer(clientId);
    gameDatabase.get(gameId)?.playerConnection(clientId, false);
    this.emitToRoom("left", gameId, gameDatabase.get(gameId));
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
  }

  /**
   * Emits an event to a specific user
   * @param userId - The target user ID
   * @param event - The event name
   * @param data - The event data
   */
  emitToUser(event: string, socketId: string, ...args: any[]) {
    this.io.to(socketId).emit(event, ...args);
  }
}
