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

      socket.on(
        "startGame",
        (
          gameId: string,
          trackList: Track[],
          startTokens: number,
          tokensToBuy: number
        ) => {
          let game = gameDatabase.get(gameId);
          if (!game) return;
          game!.tracks = trackList;
          let players = Object.values(game.players);
          let shuffledPlayers = players.sort(() => Math.random() - 0.5);
          shuffledPlayers.forEach((player, index) => {
            const track = this.getTrackForTimeline(game);
            player.timeline.push(track);
            player.turnOrder = index;
            player.tokens = startTokens;
          });
          game.tokensToBuy = tokensToBuy;
          game.currentPlayerId = shuffledPlayers[0].id;
          game.activeTrack = this.getTrackForTimeline(game);
          game.started = true;
          this.addLog(gameId, "Game Started", true);
          this.addLog(
            gameId,
            `${game.players[game.currentPlayerId].name}'s turn`,
            true
          );
          this.emitToRoom("updated", gameId, game);
        }
      );

      socket.on("buyAnotherSong", (gameId: string) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState === TurnState.PlaceTimelineEntry) return;
        const player = game.players[clientId];
        if (player.tokens >= 1) {
          player.tokens--;
          const newTrack = this.getTrackForTimeline(game);
          game.activeTrack = newTrack;
          this.emitToRoom("changeSong", game.id, game.activeTrack.url);
          this.addLog(gameId, `${player.name} changed the active song`, true);
          this.emitToRoom("updated", gameId, game);
        }
      });

      socket.on("buyTimelineEntry", (gameId: string) => {
        let game = gameDatabase.get(gameId);
        if (!game) return;
        const player = game.players[clientId];
        if (player.tokens >= game.tokensToBuy) {
          player.tokens = player.tokens - game.tokensToBuy;
          const timelineEntry = this.getTrackForTimeline(game);
          const correctPositions = this.getCorrectPositions(
            timelineEntry,
            player.timeline
          );
          player.timeline.splice(correctPositions[0], 0, timelineEntry);
          this.addLog(gameId, `${player.name} bought Song`, true);
          this.emitToRoom("updated", gameId, game);
        }
      });

      socket.on("placeTimelineEntry", (gameId: string, position: number) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState !== TurnState.PlaceTimelineEntry) return;
        const activeTimeline = game.players[game.currentPlayerId!]!.timeline;
        const activeTrack = game.activeTrack!;
        activeTimeline.splice(position, 0, activeTrack!);
        if (
          Object.values(game.players).some(
            (player) => player.tokens > 0 && player.id !== clientId
          )
        ) {
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
        this.addLog(
          gameId,
          `${game.players[game.currentPlayerId!].name} placed Song`,
          true
        );
        this.emitToRoom("updated", gameId, game);
      });

      socket.on(
        "placeToken",
        (gameId: string, position: number | null | undefined) => {
          let game = gameDatabase.get(gameId);
          if (!game || game.turnState !== TurnState.PlaceTokens) return;
          const thisPlayer = game.players[clientId];
          if (typeof position === "number" && thisPlayer!.tokens > 0) {
            thisPlayer!.tokens--;
            game.players[game.currentPlayerId!]?.timelineTokens.push({
              playerId: thisPlayer!.id,
              position,
            });
            this.addLog(gameId, `${thisPlayer.name} placed Token`, true);
          }
          this.addLog(gameId, `${thisPlayer.name} passed token placement`);
          thisPlayer.ready = true;
          this.emitToRoom("updated", gameId, game);
          if (
            Object.values(game.players).every(
              (player) =>
                player.ready ||
                player.id === game.players[game.currentPlayerId!]!.id || player.tokens === 0
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
          if (name && name !== "" && artist && artist !== "") {
            game.guesses.push({ playerId: thisPlayer.id, name, artist });
            this.addLog(gameId, `${thisPlayer.name} guessed song`, true);
          }
          this.addLog(gameId, `${thisPlayer.name} passed guessing`);
          thisPlayer.ready = true;
          this.emitToRoom("updated", gameId, game);
          if (game.arePlayersReady()) {
            Object.values(game.players).forEach(
              (player) => (player.ready = false)
            );
            game.turnState = TurnState.SongApeal;
            this.emitToRoom("updated", gameId, game);
          }
        }
      );

      socket.on("appealSong", (gameId: string, year: number) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState !== TurnState.SongApeal) return;
        game.trackApeal = year;
        this.emitToRoom("updated", gameId, game);
      });

      socket.on("confirmSong", (gameId: string) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState !== TurnState.SongApeal) return;
        const activeTimeline = game.players[game.currentPlayerId!]!.timeline;
        const activeTrack = game.activeTrack!;
        const correctPositions = this.getCorrectPositions(
          activeTrack,
          activeTimeline
        );
        const activeTrackPosition = game.players[
          game.currentPlayerId!
        ]?.timeline.findIndex((track) => track.url === activeTrack.url);
        const correctAnswerActiveTrack =
          correctPositions.includes(activeTrackPosition);
        this.addLog(
          gameId,
          `${
            game.players[game.currentPlayerId!].name
          } placed the song correctly`,
          true,
          true
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
          for (const token of game.players[game.currentPlayerId!]!
            .timelineTokens) {
            const player = game?.players[token.playerId];
            console.log(activeTrack.name, token.position, correctPositions)
            if (correctPositions.includes(token.position)) {
              const stolenSpots = this.getCorrectPositions(
                activeTrack,
                player!.timeline
              );
              player!.timeline.splice(stolenSpots[0], 0, activeTrack);
              this.addLog(
                gameId,
                `${player.name} placed the token correctly and stole the song`,
                true
              );
              this.sockets
                .get(player.id)
                ?.emit(
                  "alertMessage",
                  `Congrats you placed the token correctly! You stole that song.`,
                  AlertType.Success
                );
            } else {
              this.addLog(
                gameId,
                `${player.name} placed the token incorrectly`
              );
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
        }
        game.players[game.currentPlayerId!]!.timelineTokens = [];
        if (game.guesses.length > 0) {
          game.turnState = TurnState.ActionGuesses;
          game.guessToActionId = game.guesses[0].playerId;
          this.emitToRoom("updated", gameId, game);
        } else {
          this.nextTurn(game);
        }
      });

      socket.on("actionApealSong", (gameId: string, action: boolean) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState !== TurnState.SongApeal) return;
        const thisPlayer = game.players[clientId];
        thisPlayer.ready = true;
        thisPlayer.action = action;
        this.addLog(gameId, `${thisPlayer.name} actioned the apeal`);
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
          const actionPlayers = Object.values(game.players).filter(
            (player) => player.id !== game.currentPlayerId
          );
          const yes = actionPlayers.filter(
            (player) => player.action === true
          ).length;
          const no = actionPlayers.filter(
            (player) => player.action === false
          ).length;
          if (yes > no) {
            this.addLog(
              gameId,
              `The song apeal was approved ${
                game.activeTrack!.releaseYear
              } => ${game.trackApeal}`,
              true
            );
            this.emitToRoom(
              "alertMessage",
              game.id,
              `The song apeal was approved ${
                game.activeTrack!.releaseYear
              } => ${game.trackApeal}`,
              AlertType.Success
            );
            game.activeTrack!.releaseYear = game.trackApeal!;
            game.players[game.currentPlayerId!].timeline.find(
              (track) => track.url === game.activeTrack?.url
            )!.releaseYear = game.trackApeal!;
          } else if (yes <= no) {
            this.addLog(gameId, `The song apeal was denied`, true);
            this.emitToRoom(
              "alertMessage",
              game.id,
              `The song apeal was denied`,
              AlertType.Failure
            );
          }
          game.trackApeal = null;
          this.emitToRoom("updated", gameId, game);
          const activeTimeline = game.players[game.currentPlayerId!]!.timeline;
          const activeTrack = game.activeTrack!;
          const correctPositions = this.getCorrectPositions(
            activeTrack,
            activeTimeline
          );
          const activeTrackPosition = game.players[
            game.currentPlayerId!
          ]?.timeline.findIndex((track) => track.url === activeTrack.url);
          const correctAnswerActiveTrack =
            correctPositions.includes(activeTrackPosition);
          this.addLog(
            gameId,
            `${
              game.players[game.currentPlayerId!].name
            } placed the song correctly`,
            true,
            true
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
            for (const token of game.players[game.currentPlayerId!]!
              .timelineTokens) {
              const player = game?.players[token.playerId];
              if (correctPositions.includes(token.position)) {
                const stolenSpots = this.getCorrectPositions(
                  activeTrack,
                  player!.timeline
                );
                player!.timeline.splice(stolenSpots[0], 0, activeTrack);
                this.addLog(
                  gameId,
                  `${player.name} placed the token correctly and stole the song`,
                  true
                );
                this.sockets
                  .get(player.id)
                  ?.emit(
                    "alertMessage",
                    `Congrats you placed the token correctly! You stole that song.`,
                    AlertType.Success
                  );
              } else {
                this.addLog(
                  gameId,
                  `${player.name} placed the token incorrectly`
                );
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
          }
          game.players[game.currentPlayerId!]!.timelineTokens = [];
          if (game.guesses.length > 0) {
            game.turnState = TurnState.ActionGuesses;
            game.guessToActionId = game.guesses[0].playerId;
            this.emitToRoom("updated", gameId, game);
          } else {
            this.nextTurn(game);
          }
        }
      });

      socket.on("actionGuess", (gameId: string, action: boolean) => {
        let game = gameDatabase.get(gameId);
        if (!game || game.turnState !== TurnState.ActionGuesses) return;
        const thisPlayer = game.players[clientId];
        thisPlayer.ready = true;
        thisPlayer.action = action;
        this.addLog(gameId, `${thisPlayer.name} actioned the guess`);
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
            this.addLog(
              gameId,
              `${
                game.players[guessToAction.playerId].name
              } guessed the song correctly`,
              true
            );
            this.sockets
              .get(guessToAction.playerId)
              ?.emit(
                "alertMessage",
                `Congrats you guessed the song correctly! You get one token.`,
                AlertType.Success
              );
            game.players[guessToAction.playerId].tokens++;
          } else if (yes <= no) {
            this.addLog(
              gameId,
              `${
                game.players[guessToAction.playerId].name
              } guessed the song incorrectly`,
              true
            );
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

  resolveActiveTrack() {}

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
    this.addLog(
      game.id,
      `${game.players[game.currentPlayerId!].name}'s turn`,
      true
    );
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

  /**
   * Finds all valid positions to insert a track into a timeline based on release year
   * @param activeTrack The track to be positioned
   * @param timeline Array of tracks in chronological order
   * @returns Array of valid position indices
   */
  getCorrectPositions(activeTrack: Track, timeline: Track[]) {
    // Handle null/undefined inputs
    if (!activeTrack || !Array.isArray(timeline) || timeline.length === 0) {
      return [0]; // Default to position 0 for empty timeline
    }

    // Validate that activeTrack has necessary properties
    const activeYear = activeTrack.releaseYear;
    const activeUrl = activeTrack.url;

    if (activeYear === undefined || activeYear === null) {
      return [0]; // Default to position 0 if no release year
    }

    // Filter out tracks with the same URL (handles duplicate URLs)
    const tempTimeline = activeUrl
      ? timeline.filter((track) => track.url !== activeUrl)
      : [...timeline];

    // If timeline is empty after filtering, insert at position 0
    if (tempTimeline.length === 0) {
      return [0];
    }

    // Ensure timeline is sorted by release year
    const sortedTimeline = [...tempTimeline].sort((a, b) => {
      const yearA = a.releaseYear ?? Infinity;
      const yearB = b.releaseYear ?? Infinity;
      return yearA - yearB;
    });

    const positions: number[] = [];

    // Check each possible position
    for (let i = 0; i <= sortedTimeline.length; i++) {
      const prevYear = sortedTimeline[i - 1]?.releaseYear ?? -Infinity;
      const nextYear = sortedTimeline[i]?.releaseYear ?? Infinity;
      // Handle tracks with missing release years safely
      if (
        (activeYear >= prevYear ||
          prevYear === undefined ||
          prevYear === null) &&
        (activeYear <= nextYear || nextYear === undefined || nextYear === null)
      ) {
        positions.push(i);
      }
    }

    return positions;
  }

  addLog(
    gameId: string,
    text: string,
    important: boolean = false,
    update?: boolean
  ) {
    let game = gameDatabase.get(gameId);
    if (!game) return;
    game.logs.push({ important, text, timestamp: new Date() });
    if (update) this.emitToRoom("updated", game.id, game);
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
