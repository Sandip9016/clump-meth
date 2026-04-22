// controller/computerGameSocket.js
const Player = require("../models/Player");
const { QuestionService } = require("../services/QuestionService");
const ComputerGameRoom = require("../services/ComputerGameRoom");
const config = require("../config/computerModeConfig");
const jwt = require("jsonwebtoken");

// ─── Expected validation errors — logged as clean warnings, no stack traces ──
const VALIDATION_ERRORS = new Set([
  "Player not authenticated",
  "Invalid computer level (1-5)",
  "Invalid game mode",
  "Player already has an active game",
  "Player not found",
  "No questions available for this difficulty",
  "Game not found",
  "Game is not active",
  "Question not found",
]);

function logError(context, error) {
  if (VALIDATION_ERRORS.has(error.message)) {
    // Expected path — one clean warning line, no stack trace
    console.warn(`⚠️  [Computer Mode] ${context}: ${error.message}`);
  } else {
    // Unexpected server error — full stack for debugging
    console.error(`❌ [Computer Mode] Unexpected error in ${context}:`, error);
  }
}

module.exports = function registerComputerGameSocket(io) {
  const computerNamespace = io.of("/computer-game");

  const gameRooms = new Map(); // gameId  -> ComputerGameRoom
  const playerGames = new Map(); // playerId -> gameId
  const questionService = new QuestionService();

  computerNamespace.on("connection", (socket) => {
    console.log(`🎮 [Computer Mode] Player connected: ${socket.id}`);

    let playerId = null;

    // ─── Authenticate ────────────────────────────────────────────────────────
    socket.on("authenticate", (token, callback) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        playerId = decoded.id;

        socket.emit("authenticated", {
          success: true,
          playerId,
          message: "Authenticated for computer mode",
        });

        console.log(
          `✅ [Computer Mode] Player authenticated: ${playerId} (${socket.id})`,
        );
        if (callback) callback({ success: true });
      } catch (error) {
        console.warn(
          `⚠️  [Computer Mode] Auth failed for socket ${socket.id}: ${error.message}`,
        );
        socket.emit("authenticated", { success: false, error: "Auth failed" });
        if (callback) callback({ success: false, error: "Auth failed" });
      }
    });

    // ─── Start Game ───────────────────────────────────────────────────────────
    socket.on("startGame", async (gameData, callback) => {
      try {
        if (!playerId) throw new Error("Player not authenticated");

        const { computerLevel, gameMode } = gameData || {};

        if (!computerLevel || computerLevel < 1 || computerLevel > 5)
          throw new Error("Invalid computer level (1-5)");
        if (!gameMode || !config.gameTiming[gameMode])
          throw new Error("Invalid game mode");
        if (playerGames.has(playerId))
          throw new Error("Player already has an active game");

        const player = await Player.findById(playerId);
        if (!player) throw new Error("Player not found");

        const playerRating = player.pr.computer[`level${computerLevel}`];
        const difficulty = config.getDifficultyByRating(playerRating);

        const questionsData =
          questionService.getQuestionsForDifficulty(difficulty);
        if (!questionsData || questionsData.length === 0)
          throw new Error("No questions available for this difficulty");

        // Shuffle and limit to 20 questions
        const questionsForGame = questionsData
          .sort(() => Math.random() - 0.5)
          .slice(0, 20);

        const gameRoom = new ComputerGameRoom(
          playerId,
          computerLevel,
          gameMode,
          questionsForGame,
          questionService,
          io,
        );

        const initResult = await gameRoom.initialize(player);

        gameRooms.set(gameRoom.id, gameRoom);
        playerGames.set(playerId, gameRoom.id);
        socket.join(gameRoom.id);

        // Start game — onGameEnd callback fires on timer expiry
        gameRoom.startGame(async (result, endReason) => {
          socket.emit("gameEnded", {
            ...result,
            endReason,
          });
          gameRooms.delete(gameRoom.id);
          playerGames.delete(playerId);
        });

        // Fetch first question (also pre-generates AI decision for it)
        const firstQuestion = gameRoom.getNextQuestion();

        if (callback) {
          callback({
            success: true,
            gameId: gameRoom.id,
            gameMode,
            computerLevel,
            computerDisplayName: initResult.computerDisplayName,
            difficulty,
            question: firstQuestion
              ? {
                  index: 0,
                  question: firstQuestion.question,
                  input1: firstQuestion.input1,
                  input2: firstQuestion.input2,
                  symbol: firstQuestion.symbol,
                  finalLevel: firstQuestion.finalLevel,
                }
              : null,
            gameState: gameRoom.getState(),
          });
        }

        // gameStarted event arrives just after the ack
        socket.emit("gameStarted", {
          gameId: gameRoom.id,
          computerDisplayName: initResult.computerDisplayName,
          computerLevel,
        });

        console.log(
          `🎮 Computer game started: ${gameRoom.id} | Level: ${computerLevel} | Mode: ${gameMode}`,
        );
      } catch (error) {
        logError("startGame", error);
        if (callback) callback({ success: false, error: error.message });
        else socket.emit("gameError", { error: error.message });
      }
    });

    // ─── Submit Answer ────────────────────────────────────────────────────────
    socket.on("submitAnswer", async (answerData, callback) => {
      try {
        const { gameId, questionIndex, answer, timeSpent } = answerData || {};

        const gameRoom = gameRooms.get(gameId);
        if (!gameRoom) throw new Error("Game not found");
        if (gameRoom.gameState !== "started")
          throw new Error("Game is not active");

        const question = gameRoom.questions[questionIndex];
        if (!question) throw new Error("Question not found");

        const isCorrect = questionService.checkAnswer(question, answer);

        const result = await gameRoom.handlePlayerAnswer(
          questionIndex,
          answer,
          timeSpent,
          isCorrect,
        );

        // Fetch next question before the async delay fires
        const nextQuestion = gameRoom.getNextQuestion();

        // Emit playerAnswerResult immediately
        socket.emit("playerAnswerResult", {
          questionIndex,
          isCorrect,
          playerScore: gameRoom.playerScore,
          playerMeter: gameRoom.playerMeter,
          playerStreak: gameRoom.playerStreak,
        });

        // Cap AI delay to 3s for responsiveness; still feels natural
        const computerDelay = Math.min(result.computerDecision.delayMs, 3000);

        setTimeout(async () => {
          // Guard: skip if game was already cleaned up (e.g. player left mid-delay)
          if (!gameRooms.has(gameRoom.id)) return;

          socket.emit("computerAnswerResult", {
            questionIndex,
            answer: result.computerDecision.answer,
            isCorrect:
              result.computerDecision.action === "skip"
                ? false
                : result.computerDecision.isCorrect,
            skipped: result.computerDecision.action === "skip",
            computerScore: gameRoom.computerScore,
            computerMeter: gameRoom.computerMeter,
            computerStreak: gameRoom.computerStreak,
            whoAnsweredFirst: result.whoAnsweredFirst,
          });

          if (nextQuestion) {
            setTimeout(() => {
              if (!gameRooms.has(gameRoom.id)) return;
              socket.emit("nextQuestion", {
                index: gameRoom.currentQuestionIndex - 1,
                question: nextQuestion.question,
                input1: nextQuestion.input1,
                input2: nextQuestion.input2,
                symbol: nextQuestion.symbol,
                finalLevel: nextQuestion.finalLevel,
              });
            }, config.gameTiming[gameRoom.gameMode].transitionDelay);
          } else {
            // All 20 questions answered before timer
            const endResult = await gameRoom.endGame("questionsExhausted");
            if (endResult) {
              socket.emit("gameEnded", {
                ...endResult,
                endReason: "questionsExhausted",
              });
            }
            gameRooms.delete(gameRoom.id);
            playerGames.delete(playerId);
          }
        }, computerDelay);

        if (callback) callback({ success: true });
      } catch (error) {
        logError("submitAnswer", error);
        if (callback) callback({ success: false, error: error.message });
        else socket.emit("gameError", { error: error.message });
      }
    });

    // ─── Get Game State ───────────────────────────────────────────────────────
    socket.on("getGameState", (gameId, callback) => {
      try {
        const gameRoom = gameRooms.get(gameId);
        if (!gameRoom) throw new Error("Game not found");
        if (callback) callback({ success: true, state: gameRoom.getState() });
      } catch (error) {
        logError("getGameState", error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // ─── Leave Game ───────────────────────────────────────────────────────────
    socket.on("leaveGame", async (gameId) => {
      try {
        const gameRoom = gameRooms.get(gameId);
        if (!gameRoom) return;

        if (gameRoom.gameState !== "ended") {
          const result = await gameRoom.endGame("playerDisconnect");
          if (result) {
            socket.emit("gameEnded", {
              ...result,
              endReason: "playerDisconnect",
            });
          }
        }

        gameRooms.delete(gameId);
        playerGames.delete(playerId);
        socket.leave(gameId);
        console.log(`👋 Player left game: ${gameId}`);
      } catch (error) {
        logError("leaveGame", error);
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      try {
        if (playerId && playerGames.has(playerId)) {
          const gameId = playerGames.get(playerId);
          const gameRoom = gameRooms.get(gameId);

          if (gameRoom && gameRoom.gameState !== "ended") {
            await gameRoom.endGame("playerDisconnect");
          }

          gameRooms.delete(gameId);
          playerGames.delete(playerId);
        }
      } catch (error) {
        logError("disconnect", error);
      } finally {
        console.log(`❌ [Computer Mode] Player disconnected: ${socket.id}`);
      }
    });
  });

  return computerNamespace;
};
