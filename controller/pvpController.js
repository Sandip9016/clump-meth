// handlers/socketHandler.js
const {
  RedisMatchmakingService,
} = require("../services/RedisMatchmakingService");
const { GameRoomManager } = require("../services/GameRoomManager");
const { PlayerManager } = require("../services/PlayerManager");
const { QuestionService } = require("../services/QuestionService");
const { PVPChallengeController } = require("./pvpChallengeController");
const { getRedisClient } = require("../config/redis");

module.exports = function registerSocketHandlers(io, app) {
  const playerManager = new PlayerManager();
  const questionService = new QuestionService();
  const gameRoomManager = new GameRoomManager(questionService, io);
  const matchmakingService = new RedisMatchmakingService(
    playerManager,
    gameRoomManager,
  );

  // ✅ Initialize Challenge Controller
  const challengeController = new PVPChallengeController(
    io,
    playerManager,
    gameRoomManager,
    questionService,
  );

  // ✅ Store in app.locals for route access
  if (app && app.locals) {
    app.locals.playerManager = playerManager;
    app.locals.challengeController = challengeController;
  }

  io.on("connection", async (socket) => {
    console.log(`✅ Player connected: ${socket.id}`);

    // Test Redis connection
    try {
      const redis = await getRedisClient();
      await redis.ping();
      console.log("✅ Redis connection verified");
    } catch (err) {
      console.error("❌ Redis connection failed:", err);
    }

    /* ========================================
   REGISTER PLAYER (ONLINE ONLY)
   No matchmaking, no challenge
======================================== */
    socket.on("register-player", (playerData) => {
      try {
        if (!playerData.userId) {
          throw new Error("userId is required");
        }

        const player = playerManager.addPlayer(socket.id, {
          id: playerData.userId,
          username: playerData.username,
          email: playerData.email,
          rating: playerData.rating,
          diff: playerData.diff,
          timer: playerData.timer,
          symbol: playerData.symbol,
        });

        socket.emit("player-registered", {
          success: true,
          message: "Player is online",
          player: {
            id: player.id,
            username: player.username,
            rating: player.rating,
            diff: player.diff,
            timer: player.timer,
          },
          onlineCount: playerManager.getOnlineCount(),
        });

        console.log(`🟢 Player ONLINE: ${player.username} (${player.id})`);
      } catch (error) {
        console.error("❌ register-player error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /* ========================================
       JOIN LOBBY & START MATCHMAKING
    ======================================== */
    socket.on("join-lobby", async (lobbyData) => {
      try {
        const player = playerManager.getPlayer(socket.id);

        if (!player) {
          throw new Error("Player not registered");
        }

        // 🔥 UPDATE PLAYER GAME DYNAMICS HERE
        playerManager.updatePlayerGamePreferences(socket.id, {
          diff: lobbyData.diff,
          timer: lobbyData.timer,
          symbol: lobbyData.symbol,
          rating: lobbyData.rating,
        });

        socket.join(socket.id);

        socket.emit("lobby-joined", {
          success: true,
          player: {
            id: player.id,
            socketId: player.socketId,
            username: player.username,
            rating: player.rating,
            diff: player.diff,
            timer: player.timer,
            symbol: player.symbol,
          },
        });

        console.log(
          `🎯 ${player.username} joined lobby | Rating:${player.rating} | Diff:${player.diff} | Timer:${player.timer}`,
        );

        await matchmakingService.findMatch(player, (gameRoom) => {
          const players = gameRoom.getPlayers();

          players.forEach((p) => {
            const opponent = players.find((x) => x.id !== p.id);

            io.to(p.socketId).emit("match-found", {
              gameRoom: gameRoom.getPublicData(),
              opponent: {
                id: opponent.id,
                username: opponent.username,
                rating: opponent.rating,
                // ✅ Added Player History
                stats: {
                  wins: opponent.stats?.pvp?.[gameRoom.difficulty]?.wins || 0,
                  losses: opponent.stats?.pvp?.[gameRoom.difficulty]?.losses || 0,
                  winRate: opponent.stats?.pvp?.[gameRoom.difficulty]?.winRate || 0,
                  currentStreak: opponent.stats?.pvp?.[gameRoom.difficulty]?.currentStreak || 0,
                },
              },
              myPlayerId: p.id,
              initialQuestionMeter: gameRoom.questionMeter,
            });
          });

          setTimeout(() => {
            gameRoom.startGame();

            players.forEach((p) => {
              io.to(p.socketId).emit("game-started", {
                gameState: gameRoom.getGameState(),
                currentQuestion: gameRoom.getCurrentQuestion(),
                myPlayerId: p.id,
              });
            });
          }, 3000);
        });
      } catch (error) {
        console.error("❌ join-lobby error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /* ========================================
       CHALLENGE SYSTEM SOCKET HANDLERS
    ======================================== */

    /**
     * SEND CHALLENGE
     * Client sends: { username, userId, diff, timer, symbol }
     */
    socket.on("send-challenge", async (data) => {
      try {
        console.log(`📤 Challenge request from ${socket.id}:`, data);

        // Extract target player identifier
        const targetIdentifier = {
          username: data.username,
          userId: data.userId,
        };

        // Extract custom settings (if provided)
        const customSettings = {
          diff: data.diff,
          timer: data.timer,
          symbol: data.symbol,
        };

        const result = await challengeController.sendChallenge(
          socket.id,
          targetIdentifier,
          customSettings,
        );

        socket.emit("challenge-sent-success", result);
      } catch (error) {
        console.error("❌ send-challenge error:", error);
        socket.emit("challenge-error", {
          action: "send",
          message: error.message,
        });
      }
    });

    /**
     * ACCEPT CHALLENGE
     * Client sends: { challengeId }
     */
    socket.on("accept-challenge", async (data) => {
      try {
        console.log(`✅ Accept challenge from ${socket.id}:`, data);

        const result = await challengeController.acceptChallenge(
          socket.id,
          data.challengeId,
        );

        socket.emit("challenge-accepted-success", result);
      } catch (error) {
        console.error("❌ accept-challenge error:", error);
        socket.emit("challenge-error", {
          action: "accept",
          message: error.message,
          challengeId: data.challengeId,
        });
      }
    });

    /**
     * DECLINE CHALLENGE
     * Client sends: { challengeId }
     */
    socket.on("decline-challenge", async (data) => {
      try {
        console.log(`❌ Decline challenge from ${socket.id}:`, data);

        const result = await challengeController.declineChallenge(
          socket.id,
          data.challengeId,
        );

        socket.emit("challenge-declined-success", result);
      } catch (error) {
        console.error("❌ decline-challenge error:", error);
        socket.emit("challenge-error", {
          action: "decline",
          message: error.message,
          challengeId: data.challengeId,
        });
      }
    });

    /**
     * CANCEL CHALLENGE
     * Client sends: { challengeId }
     */
    socket.on("cancel-challenge", async (data) => {
      try {
        console.log(`🚫 Cancel challenge from ${socket.id}:`, data);

        const result = await challengeController.cancelChallenge(
          socket.id,
          data.challengeId,
        );

        socket.emit("challenge-cancelled-success", result);
      } catch (error) {
        console.error("❌ cancel-challenge error:", error);
        socket.emit("challenge-error", {
          action: "cancel",
          message: error.message,
          challengeId: data.challengeId,
        });
      }
    });

    /**
     * GET MY CHALLENGES
     */
    socket.on("get-my-challenges", () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) {
          socket.emit("challenge-error", {
            action: "get-challenges",
            message: "Player not found",
          });
          return;
        }

        const challenges = challengeController.getPlayerChallenges(player.id);

        socket.emit("my-challenges", {
          challenges,
          totalSent: challenges.filter((c) => c.type === "sent").length,
          totalReceived: challenges.filter((c) => c.type === "received").length,
        });
      } catch (error) {
        console.error("❌ get-my-challenges error:", error);
        socket.emit("challenge-error", {
          action: "get-challenges",
          message: error.message,
        });
      }
    });

    /**
     * GET CHALLENGE STATISTICS (ADMIN)
     */
    socket.on("get-challenge-stats", () => {
      try {
        const stats = challengeController.getStatistics();
        socket.emit("challenge-stats", stats);
      } catch (error) {
        console.error("❌ get-challenge-stats error:", error);
      }
    });

    /* ========================================
       CANCEL MATCHMAKING SEARCH
    ======================================== */
    socket.on("cancel_search", async () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (player) {
          await matchmakingService.removeFromQueue(player);
          console.log(`❌ ${player.username} cancelled search`);

          socket.emit("search-cancelled", {
            message: "Matchmaking cancelled",
          });
        }
      } catch (error) {
        console.error("❌ cancel_search error:", error);
      }
    });

    /* ========================================
       SUBMIT ANSWER
    ======================================== */
    socket.on("submit-answer", (data) => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        gameRoom.submitAnswer(player.id, data.answer, data.timeSpent);

        const opponent = gameRoom.getOpposingPlayer(player.id);
        if (opponent) {
          const playerScore = gameRoom.playerScores.get(player.id);
          io.to(opponent.socketId).emit("opponent-score-update", {
            opponentId: player.id,
            score: playerScore.score,
            correctAnswers: playerScore.correctAnswers,
          });
        }

        gameRoom.emitNextQuestion(player.id);
      } catch (err) {
        console.error("❌ submit-answer error:", err);
        socket.emit("error", { message: err.message });
      }
    });

    /* ========================================
       SEND EMOJI DURING MATCH
    ======================================== */
    socket.on("send-emoji", async (data) => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        if (gameRoom.gameState !== "active") {
          throw new Error("Can only send emoji during active game");
        }

        const result = gameRoom.sendEmojiToOpponent(player.id, data.emoji);

        if (!result.success) {
          if (result.message.includes("Invalid")) {
            socket.emit("emoji-invalid", { message: result.message });
          } else {
            socket.emit("emoji-rate-limited", { message: result.message });
          }
        }
      } catch (error) {
        console.error("❌ send-emoji error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /* ========================================
       RECONNECT TO GAME (GRACE PERIOD)
    ======================================== */
    socket.on("reconnect-to-game", async (data) => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        // Try to reconnect during grace period
        const reconnected = await gameRoom.handlePlayerReconnect(player.id);

        if (reconnected) {
          player.socketId = socket.id; // Update socket ID
          player.isInGame = true;

          // Send game state to reconnected player
          socket.emit("game-reconnected", {
            message: "Successfully reconnected to game!",
            gameState: gameRoom.getGameState(),
            currentQuestion: gameRoom.getCurrentQuestion(),
            myPlayerId: player.id,
          });

          const opponent = gameRoom.getOpposingPlayer(player.id);
          if (opponent && opponent.socketId) {
            io.to(opponent.socketId).emit("opponent-reconnected", {
              message: `${player.username} has reconnected!`,
              gameState: gameRoom.getGameState(),
            });
          }

          console.log(`✅ ${player.username} successfully reconnected`);
        } else {
          socket.emit("reconnect-failed", {
            message: "Grace period expired. Game ended.",
          });
        }
      } catch (error) {
        console.error("❌ reconnect-to-game error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /* ========================================
       GET GAME STATE
    ======================================== */
    socket.on("get-game-state", () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        socket.emit("game-state-update", {
          gameState: gameRoom.getGameState(),
          currentQuestion: gameRoom.getCurrentQuestion(),
          questionMeter: gameRoom.questionMeter,
          myPlayerId: player.id,
        });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    /* ========================================
       GAME ENDED (NORMAL OR TIME EXPIRED)
    ======================================== */
    socket.on("game-ended", async () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) {
          console.log("❌ Player not found for game-ended");
          return;
        }

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) {
          console.log("❌ Game room not found for game-ended");
          return;
        }

        console.log(`🏁 Game ended for room: ${gameRoom.id}`);

        // End the game if not already ended
        if (
          gameRoom.gameState !== "completed" &&
          gameRoom.gameState !== "post-game"
        ) {
          await gameRoom.endGame();
        }

        // ✅ TRANSITION TO POST-GAME LOBBY (don't remove room yet)
        if (gameRoom.gameState === "completed") {
          const postGameStatus = await gameRoom.transitionToPostGameLobby();

          // Notify both players about post-game state
          gameRoom.getPlayers().forEach((p) => {
            io.to(p.socketId).emit("post-game-started", {
              message: postGameStatus.message,
              gameResults: gameRoom.getGameState(),
              opponent: gameRoom.getPlayers().find((x) => x.id !== p.id),
              rematchStatus: gameRoom.getRematchStatus(),
            });
          });

          console.log(
            `✅ Game transitioned to post-game lobby for ${player.username}`,
          );
        }
      } catch (error) {
        console.error("❌ game-ended error:", error);
      }
    });

    /* ========================================
       GET QUEUE STATUS (ADMIN/DEBUG)
    ======================================== */
    socket.on("get-queue-status", async () => {
      try {
        const status = await matchmakingService.getQueueStatus();
        const avgWaitTime = await matchmakingService.getAverageWaitTime();

        socket.emit("queue-status", {
          ...status,
          averageWaitTime: avgWaitTime,
        });
      } catch (error) {
        console.error("❌ get-queue-status error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /* ========================================
       REMATCH SYSTEM
    ======================================== */

    /**
     * REQUEST REMATCH
     * Client sends: { }
     */
    socket.on("request-rematch", async () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        if (gameRoom.gameState !== "post-game") {
          throw new Error(
            "Cannot request rematch - game not in post-game state",
          );
        }

        const result = await gameRoom.requestRematch(player.id);

        // Notify both players
        gameRoom.getPlayers().forEach((p) => {
          io.to(p.socketId).emit("rematch-requested", {
            requestedBy: player.username,
            rematchStatus: gameRoom.getRematchStatus(),
          });
        });

        console.log(
          `📢 Rematch requested by ${player.username} in room ${gameRoom.id}`,
        );
      } catch (error) {
        console.error("❌ request-rematch error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * ACCEPT REMATCH
     * Client sends: { }
     */
    socket.on("accept-rematch", async () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        if (!gameRoom.rematchRequested) {
          throw new Error("No rematch request pending");
        }

        const result = await gameRoom.acceptRematch(player.id);

        // Notify both players
        gameRoom.getPlayers().forEach((p) => {
          io.to(p.socketId).emit("rematch-status-update", {
            acceptedBy: player.username,
            rematchStatus: gameRoom.getRematchStatus(),
          });
        });

        // If both players accepted, prepare for new game
        if (result.allAccepted) {
          console.log(`🎮 Both players accepted rematch! Creating new game...`);

          // Reset game for rematch
          gameRoom.resetForRematch();

          // Notify players that new game is starting
          gameRoom.getPlayers().forEach((p) => {
            io.to(p.socketId).emit("rematch-accepted", {
              message: "Rematch accepted by both players!",
              gameState: gameRoom.getGameState(),
            });
          });

          // Start the rematch game after 3 seconds
          setTimeout(() => {
            gameRoom.startGame();

            gameRoom.getPlayers().forEach((p) => {
              io.to(p.socketId).emit("game-started", {
                gameState: gameRoom.getGameState(),
                currentQuestion: gameRoom.getCurrentQuestion(),
                myPlayerId: p.id,
                isRematch: true,
              });
            });

            console.log(`🎮 Rematch game started for room ${gameRoom.id}`);
          }, 3000);
        }
      } catch (error) {
        console.error("❌ accept-rematch error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * DECLINE REMATCH
     * Client sends: { }
     */
    socket.on("decline-rematch", async () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        const result = await gameRoom.declineRematch(player.id);

        // Notify both players
        gameRoom.getPlayers().forEach((p) => {
          io.to(p.socketId).emit("rematch-declined", {
            declinedBy: player.username,
            message: result.message,
          });
        });

        console.log(
          `❌ Rematch declined by ${player.username} in room ${gameRoom.id}`,
        );
      } catch (error) {
        console.error("❌ decline-rematch error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * GET REMATCH STATUS
     * Client sends: { }
     */
    socket.on("get-rematch-status", () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        socket.emit("rematch-status", {
          gameState: gameRoom.gameState,
          rematchStatus: gameRoom.getRematchStatus(),
          opponent: gameRoom.getPlayers().find((p) => p.id !== player.id),
        });
      } catch (error) {
        console.error("❌ get-rematch-status error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * EXIT POST-GAME LOBBY
     * Client sends: { }
     */
    socket.on("exit-post-game", async () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        // Mark player as left
        player.isInGame = false;

        // Notify opponent
        const opponent = gameRoom.getOpposingPlayer(player.id);
        if (opponent && opponent.socketId) {
          io.to(opponent.socketId).emit("opponent-left-lobby", {
            message: `${player.username} left the post-game lobby.`,
          });
        }

        // Remove game room if both players have left
        const hasPlayersInLobby = gameRoom
          .getPlayers()
          .some((p) => gameRoomManager.getPlayerGameRoom(p.id) !== null);

        if (!hasPlayersInLobby || gameRoom.gameState === "lobby-expired") {
          gameRoomManager.removeGameRoom(gameRoom.id);
          console.log(
            `🗑️ Post-game lobby removed: ${gameRoom.id} (${player.username} exited)`,
          );
        }

        socket.emit("exited-post-game", {
          message: "You have left the post-game lobby.",
        });

        console.log(
          `👋 ${player.username} exited post-game lobby for room ${gameRoom.id}`,
        );
      } catch (error) {
        console.error("❌ exit-post-game error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /* ========================================
       DISCONNECT HANDLER
    ======================================== */
    socket.on("disconnect", async () => {
      console.log(`👋 Player disconnected: ${socket.id}`);

      const player = playerManager.getPlayer(socket.id);
      if (!player) {
        return;
      }

      console.log(`🔍 Handling disconnect for ${player.username}`);

      // 1. HANDLE PENDING CHALLENGES
      await challengeController.handlePlayerDisconnect(player.id);
      console.log("✅ Challenge cleanup completed");

      // 2. CHECK IF IN GAME ROOM
      const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
      
      // 3. REMOVE FROM MATCHMAKING QUEUE (Only if NOT in a game)
      if (!gameRoom) {
        await matchmakingService.removeFromQueue(player);
        console.log("✅ Removed from matchmaking queue");
      } else {
        console.log("ℹ️ Player is in a game room, skipping queue removal to preserve state");
      }

      // 4. HANDLE GAME ROOM DISCONNECTION

      if (gameRoom) {
        console.log(`🎮 ${player.username} was in game room: ${gameRoom.id}`);

        // Check if game is active or waiting
        if (
          gameRoom.gameState === "active" ||
          gameRoom.gameState === "waiting"
        ) {
          // ✅ Implement grace period - don't immediately end game
          const graceResult = await gameRoom.handlePlayerDisconnect(player.id);
          console.log(`⏳ Grace period started for ${player.username}`);

          // Notify opponent
          const opponent = gameRoom.getOpposingPlayer(player.id);
          if (opponent && opponent.socketId) {
            io.to(opponent.socketId).emit("opponent-disconnected", {
              message: `${player.username} disconnected. Waiting for reconnection (15 seconds)...`,
              gracePeriodExpired: false,
              disconnectedPlayerId: player.id,
            });
          }
        } else if (gameRoom.gameState === "post-game") {
          // Player disconnected during post-game lobby
          const opponent = gameRoom.getOpposingPlayer(player.id);
          if (opponent && opponent.socketId) {
            io.to(opponent.socketId).emit("opponent-left-lobby", {
              message: `${player.username} left the post-game lobby.`,
            });
          }

          // Remove game room
          gameRoomManager.removeGameRoom(gameRoom.id);
          console.log(`🗑️ Post-game lobby removed: ${gameRoom.id}`);
        }
      }

      // 4. REMOVE PLAYER (with grace period for reconnect)
      playerManager.removePlayer(socket.id);
      console.log(`🗑️ Player removed: ${player.username}`);
    });
  });

  // Cleanup on server shutdown
  process.on("SIGTERM", async () => {
    console.log("🛑 Server shutting down, cleaning up...");
    await challengeController.destroy();
    await matchmakingService.destroy();
  });

  process.on("SIGINT", async () => {
    console.log("🛑 Server interrupted, cleaning up...");
    await challengeController.destroy();
    await matchmakingService.destroy();
  });
};
