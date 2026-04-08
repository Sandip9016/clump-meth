// controller/pvpController.js
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

  const challengeController = new PVPChallengeController(
    io,
    playerManager,
    gameRoomManager,
    questionService,
  );

  if (app && app.locals) {
    app.locals.playerManager = playerManager;
    app.locals.challengeController = challengeController;
  }

  // ✅ Secondary index: userId → socketId
  // Survives socket reconnects so we can update the player's socketId
  // instead of losing their registration entirely
  const userIdToSocketId = new Map();

  io.on("connection", async (socket) => {
    console.log(`✅ Player connected: ${socket.id}`);

    try {
      const redis = await getRedisClient();
      await redis.ping();
      console.log("✅ Redis connection verified");
    } catch (err) {
      console.error("❌ Redis connection failed:", err);
    }

    /* ========================================
       REGISTER PLAYER
       ✅ FIX: If player re-registers with a new socket.id
       (after transport error reconnect), update their socketId
       in playerManager instead of creating a duplicate entry.
    ======================================== */
    socket.on("register-player", (playerData) => {
      try {
        if (!playerData.userId) {
          throw new Error("userId is required");
        }

        // Check if this user already has a session under a different socket
        const oldSocketId = userIdToSocketId.get(playerData.userId);
        if (oldSocketId && oldSocketId !== socket.id) {
          console.log(
            `🔄 ${playerData.username} reconnected: ${oldSocketId} → ${socket.id}`,
          );
          // Remove old socket entry so playerManager stays clean
          playerManager.removePlayer(oldSocketId);
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

        // Update secondary index
        userIdToSocketId.set(playerData.userId, socket.id);

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

        console.log(
          `🟢 Player ONLINE: ${player.username} (${player.id}) | Socket: ${socket.id}`,
        );
      } catch (error) {
        console.error("❌ register-player error:", error);
        // ✅ Never disconnect on error — just emit
        socket.emit("error", { message: error.message });
      }
    });

    /* ========================================
       JOIN LOBBY & START MATCHMAKING
       ✅ FIX: Never call socket.disconnect() here.
       Only emit error and return.
    ======================================== */
    socket.on("join-lobby", async (lobbyData) => {
      try {
        const player = playerManager.getPlayer(socket.id);

        if (!player) {
          console.warn(
            `⚠️ join-lobby: No player for socket ${socket.id} — sending error, NOT disconnecting`,
          );
          // ✅ CRITICAL: only emit error, never disconnect
          socket.emit("error", { message: "Player not registered" });
          return;
        }

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
                stats: {
                  wins: opponent.stats?.pvp?.[gameRoom.difficulty]?.wins || 0,
                  losses:
                    opponent.stats?.pvp?.[gameRoom.difficulty]?.losses || 0,
                  winRate:
                    opponent.stats?.pvp?.[gameRoom.difficulty]?.winRate || 0,
                  currentStreak:
                    opponent.stats?.pvp?.[gameRoom.difficulty]?.currentStreak ||
                    0,
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
        // ✅ Never disconnect — only emit error
        socket.emit("error", { message: error.message });
      }
    });

    /* ========================================
       CHALLENGE SYSTEM
    ======================================== */
    socket.on("send-challenge", async (data) => {
      try {
        console.log(`📤 Challenge request from ${socket.id}:`, data);

        const targetIdentifier = {
          username: data.username,
          userId: data.userId || data.recipientId,
        };

        const customSettings = {
          diff: data.diff || data.difficulty,
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

    socket.on("accept-challenge", async (data) => {
      try {
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

    socket.on("decline-challenge", async (data) => {
      try {
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

    socket.on("cancel-challenge", async (data) => {
      try {
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
          socket.emit("search-cancelled", { message: "Matchmaking cancelled" });
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

        const result = gameRoom.submitAnswer(
          player.id,
          data.answer,
          data.timeSpent,
        );

        console.log(
          `📊 History update for ${player.username}:`,
          result?.history,
        );

        const opponent = gameRoom.getOpposingPlayer(player.id);
        if (opponent) {
          io.to(opponent.socketId).emit("opponent-score-update", {
            opponentId: player.id,
            score: result?.score || 0,
            correctAnswers: result?.correctAnswers || 0,
            history: result?.history || [],
          });
        }

        gameRoom.emitNextQuestion(player.id);
      } catch (err) {
        console.error("❌ submit-answer error:", err);
        socket.emit("error", { message: err.message });
      }
    });

    /* ========================================
       SEND EMOJI
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
       RECONNECT TO GAME
    ======================================== */
    socket.on("reconnect-to-game", async (data) => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        const reconnected = await gameRoom.handlePlayerReconnect(player.id);

        if (reconnected) {
          player.socketId = socket.id;
          player.isInGame = true;

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
       GAME ENDED
    ======================================== */
    socket.on("game-ended", async () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) return;

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) return;

        console.log(`🏁 Game ended for room: ${gameRoom.id}`);

        if (
          gameRoom.gameState !== "completed" &&
          gameRoom.gameState !== "post-game"
        ) {
          await gameRoom.endGame();
        }

        if (gameRoom.gameState === "completed") {
          const postGameStatus = await gameRoom.transitionToPostGameLobby();

          gameRoom.getPlayers().forEach((p) => {
            io.to(p.socketId).emit("post-game-started", {
              message: postGameStatus.message,
              gameResults: gameRoom.getGameState(),
              opponent: gameRoom.getPlayers().find((x) => x.id !== p.id),
              rematchStatus: gameRoom.getRematchStatus(),
            });
          });
        }
      } catch (error) {
        console.error("❌ game-ended error:", error);
      }
    });

    /* ========================================
       QUEUE STATUS
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

        await gameRoom.requestRematch(player.id);

        gameRoom.getPlayers().forEach((p) => {
          io.to(p.socketId).emit("rematch-requested", {
            requestedBy: player.username,
            rematchStatus: gameRoom.getRematchStatus(),
          });
        });
      } catch (error) {
        console.error("❌ request-rematch error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("accept-rematch", async () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        if (!gameRoom.rematchRequested)
          throw new Error("No rematch request pending");

        const result = await gameRoom.acceptRematch(player.id);

        gameRoom.getPlayers().forEach((p) => {
          io.to(p.socketId).emit("rematch-status-update", {
            acceptedBy: player.username,
            rematchStatus: gameRoom.getRematchStatus(),
          });
        });

        if (result.allAccepted) {
          gameRoom.resetForRematch();

          gameRoom.getPlayers().forEach((p) => {
            io.to(p.socketId).emit("rematch-accepted", {
              message: "Rematch accepted by both players!",
              gameState: gameRoom.getGameState(),
            });
          });

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
            console.log(`🎮 Rematch started for room ${gameRoom.id}`);
          }, 3000);
        }
      } catch (error) {
        console.error("❌ accept-rematch error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("decline-rematch", async () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        const result = await gameRoom.declineRematch(player.id);

        gameRoom.getPlayers().forEach((p) => {
          io.to(p.socketId).emit("rematch-declined", {
            declinedBy: player.username,
            message: result.message,
          });
        });
      } catch (error) {
        console.error("❌ decline-rematch error:", error);
        socket.emit("error", { message: error.message });
      }
    });

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

    socket.on("exit-post-game", async () => {
      try {
        const player = playerManager.getPlayer(socket.id);
        if (!player) throw new Error("Player not found");

        const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);
        if (!gameRoom) throw new Error("Game room not found");

        player.isInGame = false;

        const opponent = gameRoom.getOpposingPlayer(player.id);
        if (opponent && opponent.socketId) {
          io.to(opponent.socketId).emit("opponent-left-lobby", {
            message: `${player.username} left the post-game lobby.`,
          });
        }

        const hasPlayersInLobby = gameRoom
          .getPlayers()
          .some((p) => gameRoomManager.getPlayerGameRoom(p.id) !== null);

        if (!hasPlayersInLobby || gameRoom.gameState === "lobby-expired") {
          gameRoomManager.removeGameRoom(gameRoom.id);
        }

        socket.emit("exited-post-game", {
          message: "You have left the post-game lobby.",
        });
      } catch (error) {
        console.error("❌ exit-post-game error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    /* ========================================
       DISCONNECT HANDLER
       ✅ FIX: Keep userId→socketId mapping alive for 10s
       so fast reconnects don't lose registration
    ======================================== */
    socket.on("disconnect", async () => {
      console.log(`👋 Player disconnected: ${socket.id}`);

      const player = playerManager.getPlayer(socket.id);
      if (!player) return;

      console.log(`🔍 Handling disconnect for ${player.username}`);

      // ✅ Don't immediately delete userId mapping — wait 10s for reconnect
      // If player reconnects within 10s and re-registers, the new register-player
      // call will update the mapping before this timeout fires
      const disconnectedUserId = player.id;
      setTimeout(() => {
        if (userIdToSocketId.get(disconnectedUserId) === socket.id) {
          userIdToSocketId.delete(disconnectedUserId);
          console.log(`🗑️ Cleared stale userId mapping for ${player.username}`);
        }
      }, 10000);

      await challengeController.handlePlayerDisconnect(player.id);

      const gameRoom = gameRoomManager.getPlayerGameRoom(player.id);

      if (!gameRoom) {
        await matchmakingService.removeFromQueue(player);
        console.log("✅ Removed from matchmaking queue");
      }

      if (gameRoom) {
        if (
          gameRoom.gameState === "active" ||
          gameRoom.gameState === "waiting"
        ) {
          await gameRoom.handlePlayerDisconnect(player.id);

          const opponent = gameRoom.getOpposingPlayer(player.id);
          if (opponent && opponent.socketId) {
            io.to(opponent.socketId).emit("opponent-disconnected", {
              message: `${player.username} disconnected. Waiting for reconnection (15 seconds)...`,
              gracePeriodExpired: false,
              disconnectedPlayerId: player.id,
            });
          }
        } else if (gameRoom.gameState === "post-game") {
          const opponent = gameRoom.getOpposingPlayer(player.id);
          if (opponent && opponent.socketId) {
            io.to(opponent.socketId).emit("opponent-left-lobby", {
              message: `${player.username} left the post-game lobby.`,
            });
          }
          gameRoomManager.removeGameRoom(gameRoom.id);
        }
      }

      playerManager.removePlayer(socket.id);
      console.log(`🗑️ Player removed: ${player.username}`);
    });
  });

  process.on("SIGTERM", async () => {
    await challengeController.destroy();
    await matchmakingService.destroy();
  });

  process.on("SIGINT", async () => {
    await challengeController.destroy();
    await matchmakingService.destroy();
  });
};
