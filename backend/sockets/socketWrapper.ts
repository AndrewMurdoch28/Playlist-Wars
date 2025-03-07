import { Server, Socket } from "socket.io";
import { Game, Player, Track, TurnState } from "@/database/game.data";
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
      const clientId = socket.handshake.auth.clientId;
      this.sockets.set(clientId, socket);

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

      socket.on("startGame", (gameId: string) => {
        
      });

      socket.on("placeTimelineEntry", (gameId: string, position: number) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState !== TurnState.PlaceTimelineEntry) return;
        const activeTimeline = game.currentTurn!.timeline;
        const activeTrack = game.activeTrack!;
        activeTimeline.splice(position, 0, activeTrack!);
        if (Object.values(game.players).some((player) => player.tokens > 0)) {
          game.turnState = TurnState.PendingPlaceTokens;
          this.startTimer(gameId, 5, true, () => {
            game!.turnState = TurnState.PlaceTokens;
            this.emitToRoom("updated", gameId, game);
          });
        } else game.turnState = TurnState.GuessSong;
        this.emitToRoom("updated", gameId, game);

        this.startTimer(gameId, 5, true, () => {
          game = gameDatabase.get(gameId)!;
          game.turnState = TurnState.PlaceTokens;
          this.emitToRoom("updated", gameId, game);
        });
      });

      socket.on("placedToken", (gameId: string, position: number) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState !== TurnState.PlaceTokens) return;
        const activeTimeline = game.currentTurn!.timeline;
        const activeTrack = game.activeTrack!;
        const thisPlayer = game.getPlayer(clientId);
        if (thisPlayer!.tokens > 0) {
          thisPlayer!.tokens--;
          game.currentTurn?.timelineTokens.push({
            playerId: thisPlayer!.id,
            position,
          });
        }
        thisPlayer.ready = true;
        this.emitToRoom("updated", gameId, game);
        if (game.arePlayersReady()) {
          Object.values(game.players).forEach(
            (player) => (player.ready = false)
          );
          const correctPosition = this.getCorrectPosition(
            activeTrack,
            activeTimeline
          );
          const activeTrackPosition = game.currentTurn?.timeline.findIndex(
            (track) => track.url === activeTrack.url
          );
          const correctAnswerActiveTrack =
            activeTrackPosition === correctPosition;
          this.sockets
            .get(game.currentTurn!.id)
            ?.emit(
              "alertMessage",
              correctAnswerActiveTrack
                ? "Congrats you placed the song correctly!"
                : "You placed the song incorectly.",
              correctAnswerActiveTrack
            );
          if (!correctAnswerActiveTrack) {
            game.currentTurn?.timeline.splice(activeTrackPosition!, 1);
            for (const token of game.currentTurn!.timelineTokens) {
              const player = game?.players[token.playerId];
              if (token.position === correctPosition) {
                const correctPosition = this.getCorrectPosition(
                  activeTrack,
                  player!.timeline
                );
                player!.timeline.splice(correctPosition!, 0, activeTrack);
                this.sockets
                  .get(player.id)
                  ?.emit(
                    "alertMessage",
                    `Congrats you placed the token correctly! You stole that song.`,
                    true
                  );
              }
              this.sockets
                .get(player.id)
                ?.emit(
                  "alertMessage",
                  `You placed the song incorrectly.`,
                  false
                );
            }
            game.currentTurn!.timelineTokens = [];
          }
          game.activeTrack = null;
          game.turnState = TurnState.GuessSong;
          this.emitToRoom("updated", gameId, game);
        }
      });

      socket.on("guessSong", (gameId: string, name: string, artist: string) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState !== TurnState.GuessSong) return;
        const thisPlayer = game.getPlayer(clientId);
        if (name && name !== "" && artist && artist !== "")
          game.guesses.push({ playerId: thisPlayer.id, name, artist });
        thisPlayer.ready = true;
        this.emitToRoom("updated", gameId, game);
        if (game.arePlayersReady()) {
          Object.values(game.players).forEach(
            (player) => (player.ready = false)
          );
          game.turnState = TurnState.ActionGuesses;
          game.guessToAction = game.guesses[0];
          this.emitToRoom("updated", gameId, game);
        }
      });

      socket.on(
        "actionGuess",
        (gameId: string, playerId: string, action: boolean) => {
          let game = gameDatabase.get(gameId);
          if (!game || game.turnState !== TurnState.ActionGuesses) return;
          const thisPlayer = game.getPlayer(clientId);
          thisPlayer.ready = true;
          thisPlayer.action = action;
          if (game.arePlayersReady()) {
            const yes = Object.values(game.players).filter(
              (player) => player.action === true
            );
            const no = Object.values(game.players).filter(
              (player) => player.action === false
            );
            if (yes > no) {
              this.sockets
                .get(playerId)
                ?.emit(
                  "alertMessage",
                  `Congrats you guessed the song correctly! You get one token.`,
                  true
                );
              game.getPlayer(playerId).tokens++;
            } else if (yes <= no) {
              this.sockets
                .get(playerId)
                ?.emit(
                  "alertMessage",
                  `You guessed the song incorrectly.`,
                  false
                );
            }
            const currentIndex = game.guesses.findIndex(
              (guess) => guess.playerId === game.guessToAction?.playerId
            );
            if (currentIndex + 1 < game.guesses.length) {
              game.guessToAction = game.guesses[currentIndex + 1];
            } else {
              const findNextTurn = Object.values(game.players).find(
                (player) => {
                  game.currentTurn!.turnOrder + 1 === player.turnOrder;
                }
              );
              if (findNextTurn) {
                game.currentTurn = findNextTurn;
              } else {
                game.currentTurn = Object.values(game.players).find(
                  (player) => {
                    player.turnOrder === 0;
                  }
                )!;
              }
              this.emitToRoom(
                "alertMessage",
                gameId,
                `It is now ${game.currentTurn.name}'s turn!`
              );
              game.turnState = TurnState.PlaceTimelineEntry;
            }
            this.emitToRoom("updated", gameId, game);
          }
        }
      );
    });
  }

  getCorrectPosition(activeTrack: Track, timeline: Track[]) {
    if (!activeTrack || !timeline.length) return null;
    const tempTimeline = timeline.filter(
      (track) => track.url !== activeTrack.url
    );
    const activeYear = activeTrack.releaseYear;
    if (!tempTimeline.length) return 0;
    for (let i = 0; i <= tempTimeline.length; i++) {
      const prevYear = tempTimeline[i - 1]?.releaseYear ?? -Infinity;
      const nextYear = tempTimeline[i]?.releaseYear ?? Infinity;
      if (activeYear >= prevYear && activeYear <= nextYear) {
        return i;
      }
    }
    return tempTimeline.length;
  }

  startTimer(
    gameId: string,
    length: number,
    showDialog: boolean,
    callback: Function
  ) {
    let countdown = length;
    this.emitToRoom("startedTimer", gameId, length, showDialog);
    const timer = setInterval(() => {
      if (countdown > 0) {
        countdown--;
        this.emitToRoom("timerUpdated", gameId, countdown);
      } else {
        callback();
        clearInterval(timer);
        this.emitToRoom("timerFinished", gameId);
      }
    }, 1000);
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
          `Player ${
            Object.values(gameDatabase.get(gameId)!.players).length + 1
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
}
