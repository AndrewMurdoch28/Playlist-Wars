import { Server, Socket } from "socket.io";
import { Game, Player, Track, TurnState } from "@/database/game.data";
import { gameDatabase } from "..";

export enum AlertType {
  Success = "success",
  Failure = "failure",
  Normal = "normal",
}

export class SocketWrapper {
  io: Server;
  sockets: Map<string, Socket>;

  constructor(io: Server) {
    this.io = io;
    this.sockets = new Map<string, Socket>();
    this.initialize();
  }

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

      socket.on("placeTimelineEntry", (gameId: string, position: number) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState !== TurnState.PlaceTimelineEntry) return;
        const activeTimeline = game.players[game.currentPlayerId!]!.timeline;
        const activeTrack = game.activeTrack!;
        activeTimeline.splice(position, 0, activeTrack!);
        if (Object.values(game.players).some((player) => player.tokens > 0)) {
          game.turnState = TurnState.PendingPlaceTokens;
          this.startTimer(
            gameId,
            5,
            true,
            () => {
              game!.turnState = TurnState.PlaceTokens;
              this.emitToRoom("updated", gameId, game);
            },
            "Place tokens to attempt to steal the song. First come first serve!"
          );
        } else game.turnState = TurnState.GuessSong;
        this.emitToRoom("updated", gameId, game);
      });

      socket.on(
        "placeToken",
        (gameId: string, position: number | null | undefined) => {
          let game = gameDatabase.get(gameId);
          if (!game || game.turnState !== TurnState.PlaceTokens) return;
          const thisPlayer = game.players[clientId];
          console.log(position, thisPlayer);
          if (typeof position === "number" && thisPlayer!.tokens > 0) {
            thisPlayer!.tokens--;
            game.players[game.currentPlayerId!]?.timelineTokens.push({
              playerId: thisPlayer!.id,
              position,
            });
            console.log("did this run");
          }
          console.log(game.players[game.currentPlayerId!]);
          thisPlayer.ready = true;
          this.emitToRoom("updated", gameId, game);
          if (
            Object.values(game.players).every(
              (player) =>
                player.ready ||
                player.id === game.players[game.currentPlayerId!]!.id
            )
          ) {
            Object.values(game.players).forEach(
              (player) => (player.ready = false)
            );
            game.turnState = TurnState.GuessSong;
            this.emitToRoom("updated", gameId, game);
          }
        }
      );

      socket.on(
        "guessSong",
        (
          gameId: string,
          name: string | null | undefined,
          artist: string | null | undefined
        ) => {
          let game = gameDatabase.get(gameId);
          if (!game || game.turnState !== TurnState.GuessSong) return;
          const thisPlayer = game.players[clientId];
          if (name && name !== "" && artist && artist !== "")
            game.guesses.push({ playerId: thisPlayer.id, name, artist });
          thisPlayer.ready = true;
          this.emitToRoom("updated", gameId, game);
          if (game.arePlayersReady()) {
            Object.values(game.players).forEach(
              (player) => (player.ready = false)
            );
            const activeTimeline =
              game.players[game.currentPlayerId!]!.timeline;
            const activeTrack = game.activeTrack!;
            const correctPosition = this.getCorrectPosition(
              activeTrack,
              activeTimeline
            );
            const activeTrackPosition = game.players[
              game.currentPlayerId!
            ]?.timeline.findIndex((track) => track.url === activeTrack.url);
            const correctAnswerActiveTrack =
              activeTrackPosition === correctPosition;
            console.log(
              correctAnswerActiveTrack,
              activeTrackPosition,
              correctPosition
            );
            this.sockets
              .get(game.players[game.currentPlayerId!]!.id)
              ?.emit(
                "alertMessage",
                correctAnswerActiveTrack
                  ? "Congrats you placed the song correctly!"
                  : "You placed the song incorectly.",
                correctAnswerActiveTrack ? AlertType.Success : AlertType.Failure
              );
            Object.values(game.players).forEach((player) => {
              if (game.players[game.currentPlayerId!]?.id !== player.id) {
                this.sockets
                  .get(player.id)
                  ?.emit(
                    "alertMessage",
                    correctAnswerActiveTrack
                      ? `${
                          game.players[game.currentPlayerId!]?.name
                        } placed the song correctly in their timeline.`
                      : `${
                          game.players[game.currentPlayerId!]?.name
                        } placed the song incorrectly in their timeline.`,
                    AlertType.Normal
                  );
              }
            });

            if (!correctAnswerActiveTrack) {
              console.log(
                "test",
                game.players[game.currentPlayerId!],
                game.players[game.currentPlayerId!]!.timelineTokens
              );
              for (const token of game.players[game.currentPlayerId!]!
                .timelineTokens) {
                const player = game?.players[token.playerId];
                console.log(token.position, correctPosition);
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
                      AlertType.Success
                    );
                } else {
                  this.sockets
                    .get(player.id)
                    ?.emit(
                      "alertMessage",
                      `You placed the token incorrectly.`,
                      AlertType.Failure
                    );
                }
              }
              game.players[game.currentPlayerId!]?.timeline.splice(
                activeTrackPosition!,
                1
              );
              game.players[game.currentPlayerId!]!.timelineTokens = [];
            }
            if (game.guesses.length > 0) {
              game.turnState = TurnState.ActionGuesses;
              game.guessToActionId = game.guesses[0].playerId;
              this.emitToRoom("updated", gameId, game);
            } else {
              this.nextTurn(game);
            }
          }
        }
      );

      socket.on("actionGuess", (gameId: string, action: boolean) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState !== TurnState.ActionGuesses) return;
        const thisPlayer = game.players[clientId];
        thisPlayer.ready = true;
        thisPlayer.action = action;
        this.emitToRoom("updated", gameId, game);
        if (game.arePlayersReady()) {
          const guessToAction = game.guesses.find(
            (guess) => guess.playerId === game.guessToActionId
          )!;
          Object.values(game.players).forEach(
            (player) => (player.ready = false)
          );
          const yes = Object.values(game.players).filter(
            (player) => player.action === true
          ).length;
          const no = Object.values(game.players).filter(
            (player) => player.action === false
          ).length;
          if (yes > no) {
            this.sockets
              .get(guessToAction.playerId)
              ?.emit(
                "alertMessage",
                `Congrats you guessed the song correctly! You get one token.`,
                AlertType.Success
              );
            game.players[guessToAction.playerId].tokens++;
            this.emitToRoom("updated", gameId, game);
          } else if (yes <= no) {
            this.sockets
              .get(guessToAction.playerId)
              ?.emit(
                "alertMessage",
                `You guessed the song incorrectly.`,
                AlertType.Failure
              );
          }
          const currentIndex = game.guesses.findIndex(
            (guess) => guess.playerId === guessToAction.playerId
          );
          if (currentIndex + 1 < game.guesses.length) {
            game.guessToActionId = game.guesses[currentIndex + 1].playerId;
            this.emitToRoom("updated", gameId, game);
          } else {
            this.nextTurn(game);
          }
        }
      });
    });
  }

  nextTurn(game: Game) {
    const findNextTurn = Object.values(game.players).find(
      (player) =>
        game.players[game.currentPlayerId!]!.turnOrder + 1 === player.turnOrder
    );
    if (findNextTurn) {
      game.currentPlayerId = findNextTurn.id;
    } else {
      game.currentPlayerId = Object.values(game.players).find(
        (player) => player.turnOrder === 0
      )!.id;
    }
    this.emitToRoom(
      "alertMessage",
      game.id,
      `It is now ${game.players[game.currentPlayerId!].name}'s turn!`,
      AlertType.Normal
    );
    game.guesses = [];
    game.activeTrack = this.getTrackForTimeline(game);
    this.emitToRoom("changeSong", game.id, game.activeTrack.url);
    game.turnState = TurnState.PlaceTimelineEntry;
    this.emitToRoom("updated", game.id, game);
  }

  getTrackForTimeline(game: Game) {
    const trackForTimeline =
      game!.tracks[Math.floor(Math.random() * game!.tracks.length)];
    game!.tracks = game!.tracks.filter(
      (track) => track.url !== trackForTimeline.url
    );
    return trackForTimeline;
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
    callback: Function,
    message?: string
  ) {
    let countdown = length;
    this.emitToRoom("startedTimer", gameId, length, showDialog, message);
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
