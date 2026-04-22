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
    console.warn(`⚠️  [Computer Mode] ${context}: ${error.message}`);
  } else {
    console.error(`❌ [Computer Mode] Unexpected error in ${context}:`, error);
  }
}

module.exports = function registerComputerGameSocket(io) {
  const computerNamespace = io.of("/computer-game");

  const gameRooms = new Map(); // gameId  -> ComputerGameRoom
  const playerGames = new Map(); // playerId -> gameId
  const questionService = new QuestionService();

  // ─── Helper: serve next question and start the computer's independent timer ─
  //
  // This is the core of the fix.
  // Every time a new question is served (game start OR after previous Q resolves),
  // we record the exact timestamp and start the computer's countdown independently.
  // When that countdown fires we emit computerAnswerResult regardless of whether
  // the player has answered yet.  When the player DOES answer, we compare their
  // timeSpent against how much of the computer's delay has already elapsed to
  // determine whoAnsweredFirst — exactly like a real PvP match.
  //
  function serveNextQuestion(gameRoom, socket, questionIndex) {
    const question = gameRoom.questions[questionIndex];
    if (!question) return null;

    // Record when this question was served so player timeSpent can be compared
    // against the computer's absolute delay.
    gameRoom.questionServedAt = Date.now();
    gameRoom.pendingQuestionIndex = questionIndex;

    // Pre-generate the computer's decision for this question
    const computerDecision = gameRoom.prepareComputerDecision(questionIndex);
    const computerDelay = Math.min(computerDecision.delayMs, 3000);

    // Start computer's independent countdown from THIS moment (question appeared)
    const timerHandle = setTimeout(async () => {
      if (!gameRooms.has(gameRoom.id)) return;

      // If player already answered this question, computerAnswerResult was
      // already emitted inside submitAnswer — don't double-emit.
      if (gameRoom.computerAlreadyEmitted.has(questionIndex)) return;

      // Player has NOT answered yet — computer answers on its own schedule.
      // Process the computer's result independently (player side stays unchanged).
      gameRoom.processComputerAnsweredFirst(questionIndex);
      gameRoom.computerAlreadyEmitted.add(questionIndex);

      socket.emit("computerAnswerResult", {
        questionIndex,
        answer: computerDecision.answer,
        isCorrect:
          computerDecision.action === "skip"
            ? false
            : computerDecision.isCorrect,
        skipped: computerDecision.action === "skip",
        computerScore: gameRoom.computerScore,
        computerMeter: gameRoom.computerMeter,
        computerStreak: gameRoom.computerStreak,
        whoAnsweredFirst: "computer",
      });

      // If player still hasn't answered, we just wait — they can still submit
      // and will get playerAnswerResult (with whoAnsweredFirst: "computer")
      // nextQuestion will be sent after the player answers OR on playerTimeout.
    }, computerDelay);

    // Store handle so we can cancel it if player answers before computer fires
    gameRoom.computerTimers.set(questionIndex, timerHandle);

    return question;
  }

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

        gameRoom.startGame(async (result, endReason) => {
          // Clear any pending computer timers before emitting gameEnded
          for (const handle of gameRoom.computerTimers.values())
            clearTimeout(handle);
          gameRoom.computerTimers.clear();

          socket.emit("gameEnded", { ...result, endReason });
          gameRooms.delete(gameRoom.id);
          playerGames.delete(playerId);
        });

        // Serve Q0 — this starts computer's independent countdown for Q0
        const firstQuestion = serveNextQuestion(gameRoom, socket, 0);

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

        // Ignore duplicate submissions for the same question
        if (gameRoom.playerAlreadyAnswered.has(questionIndex)) {
          if (callback) callback({ success: true });
          return;
        }
        gameRoom.playerAlreadyAnswered.add(questionIndex);

        const isCorrect = questionService.checkAnswer(question, answer);

        // Determine actual whoAnsweredFirst based on real elapsed time.
        // Computer's delay was set from the moment the question was served.
        // If the computer's timer already fired, computer answered first.
        const computerAlreadyFired =
          gameRoom.computerAlreadyEmitted.has(questionIndex);
        const computerDecision =
          gameRoom.computerPendingAnswers.get(questionIndex);
        const computerSkipped = computerDecision?.action === "skip";

        // whoAnsweredFirst: player wins if computer skipped, or player was faster
        const playerAnsweredFirst =
          computerSkipped ||
          (!computerAlreadyFired && timeSpent < computerDecision?.delayMs);

        // Cancel the computer's independent timer — we're resolving this question now
        const timerHandle = gameRoom.computerTimers.get(questionIndex);
        if (timerHandle) {
          clearTimeout(timerHandle);
          gameRoom.computerTimers.delete(questionIndex);
        }

        // Process player answer with the resolved whoAnsweredFirst
        const result = await gameRoom.handlePlayerAnswer(
          questionIndex,
          answer,
          timeSpent,
          isCorrect,
          playerAnsweredFirst,
        );

        // Emit playerAnswerResult immediately
        socket.emit("playerAnswerResult", {
          questionIndex,
          isCorrect,
          playerScore: gameRoom.playerScore,
          playerMeter: gameRoom.playerMeter,
          playerStreak: gameRoom.playerStreak,
        });

        // If computer already fired independently, its result was already emitted.
        // If not, emit it now after its remaining delay (or immediately if already past).
        if (!computerAlreadyFired) {
          gameRoom.computerAlreadyEmitted.add(questionIndex);

          const elapsed = Date.now() - gameRoom.questionServedAt;
          const remainingDelay = Math.max(
            0,
            Math.min(computerDecision.delayMs, 3000) - elapsed,
          );

          setTimeout(async () => {
            if (!gameRooms.has(gameRoom.id)) return;

            socket.emit("computerAnswerResult", {
              questionIndex,
              answer: computerDecision.answer,
              isCorrect:
                computerDecision.action === "skip"
                  ? false
                  : computerDecision.isCorrect,
              skipped: computerDecision.action === "skip",
              computerScore: gameRoom.computerScore,
              computerMeter: gameRoom.computerMeter,
              computerStreak: gameRoom.computerStreak,
              whoAnsweredFirst: result.whoAnsweredFirst,
            });

            // Serve next question after transition delay
            const nextIndex = questionIndex + 1;
            if (nextIndex < gameRoom.questions.length) {
              setTimeout(() => {
                if (!gameRooms.has(gameRoom.id)) return;
                const nextQ = serveNextQuestion(gameRoom, socket, nextIndex);
                if (nextQ) {
                  socket.emit("nextQuestion", {
                    index: nextIndex,
                    question: nextQ.question,
                    input1: nextQ.input1,
                    input2: nextQ.input2,
                    symbol: nextQ.symbol,
                    finalLevel: nextQ.finalLevel,
                  });
                }
              }, config.gameTiming[gameRoom.gameMode].transitionDelay);
            } else {
              // All 20 questions answered
              const endResult = await gameRoom.endGame("questionsExhausted");
              if (endResult) {
                for (const h of gameRoom.computerTimers.values())
                  clearTimeout(h);
                gameRoom.computerTimers.clear();
                socket.emit("gameEnded", {
                  ...endResult,
                  endReason: "questionsExhausted",
                });
              }
              gameRooms.delete(gameRoom.id);
              playerGames.delete(playerId);
            }
          }, remainingDelay);
        } else {
          // Computer already fired — serve next question after transition delay
          const nextIndex = questionIndex + 1;
          if (nextIndex < gameRoom.questions.length) {
            setTimeout(() => {
              if (!gameRooms.has(gameRoom.id)) return;
              const nextQ = serveNextQuestion(gameRoom, socket, nextIndex);
              if (nextQ) {
                socket.emit("nextQuestion", {
                  index: nextIndex,
                  question: nextQ.question,
                  input1: nextQ.input1,
                  input2: nextQ.input2,
                  symbol: nextQ.symbol,
                  finalLevel: nextQ.finalLevel,
                });
              }
            }, config.gameTiming[gameRoom.gameMode].transitionDelay);
          } else {
            const endResult = await gameRoom.endGame("questionsExhausted");
            if (endResult) {
              for (const h of gameRoom.computerTimers.values()) clearTimeout(h);
              gameRoom.computerTimers.clear();
              socket.emit("gameEnded", {
                ...endResult,
                endReason: "questionsExhausted",
              });
            }
            gameRooms.delete(gameRoom.id);
            playerGames.delete(playerId);
          }
        }

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
          // Clear independent computer timers
          for (const handle of gameRoom.computerTimers.values())
            clearTimeout(handle);
          gameRoom.computerTimers.clear();

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
            for (const handle of gameRoom.computerTimers.values())
              clearTimeout(handle);
            gameRoom.computerTimers.clear();
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
