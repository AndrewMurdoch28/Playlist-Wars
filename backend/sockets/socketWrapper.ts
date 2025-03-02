import { Server, Socket } from "socket.io";

export class SocketWrapper {
  private io: Server;
  private initialized: boolean;
  private rooms: Map<string, Set<string>>;

  constructor(io: Server) {
    this.io = io;
    this.initialized = false;
    this.rooms = new Map();
  }

  /**
   * Initializes socket event listeners
   */
  public initialize(): void {
    if (this.initialized) return;

    this.io.on("connection", (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on("join-room", (roomId: string) => {
        this.joinRoom(socket, roomId);
      });

      socket.on("disconnect", () => {
        this.removeUserFromRooms(socket);
        console.log(`User disconnected: ${socket.id}`);
      });
    });
    this.initialized = true;
  }

  /**
   * Creates a new room for a game
   * @param roomId - Unique identifier for the room
   */
  public createRoom(roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      console.log(`Room created: ${roomId}`);
    }
  }

  /**
   * Joins a user to a specific room
   * @param socket - The user's socket connection
   * @param roomId - The room ID to join
   */
  public joinRoom(socket: Socket, roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.createRoom(roomId);
    }

    socket.join(roomId);
    this.rooms.get(roomId)?.add(socket.id);
    console.log(`User ${socket.id} joined room: ${roomId}`);

    // Notify others in the room
    this.io.to(roomId).emit("user-joined", { userId: socket.id, roomId });
  }

  /**
   * Broadcasts event and any additional args to all sockets
   * @param event Event to broadcast
   * @param args Any additional args to send
   */
  public emit = (event: string, ...args: any[]) => {
    this.io.emit(event, ...args);
  };

  /**
   * Emits an event to all users in a room
   * @param roomId - The target room
   * @param event - The event name
   * @param data - The event data
   */
  public emitToRoom(roomId: string, event: string, data: any): void {
    if (this.rooms.has(roomId)) {
      this.io.to(roomId).emit(event, data);
      console.log(`Event "${event}" emitted to room ${roomId}:`, data);
    }
  }

  /**
   * Emits an event to a specific user
   * @param userId - The target user ID
   * @param event - The event name
   * @param data - The event data
   */
  public emitToUser(userId: string, event: string, data: any): void {
    this.io.to(userId).emit(event, data);
    console.log(`Event "${event}" sent to user ${userId}:`, data);
  }

  /**
   * Removes a user from all rooms they are in
   * @param socket - The user's socket connection
   */
  private removeUserFromRooms(socket: Socket): void {
    this.rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.leave(roomId);
        this.io.to(roomId).emit("user-left", { userId: socket.id });

        // If the room is empty, delete it
        if (users.size === 0) {
          this.rooms.delete(roomId);
          console.log(`Room deleted: ${roomId}`);
        }
      }
    });
  }
}
