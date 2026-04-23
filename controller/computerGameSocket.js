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
  // This generates questions dynamically (endless mode) and starts the computer's
  // independent countdown. Both player and computer play independently.
  //
  function serveNextQuestion(gameRoom, socket, questionIndex) {
    // Check if game is still active and not ending
    if (!gameRooms.has(gameRoom.id) || gameRoom.gameState !== "started") {
      return null;
    }

    // Check if we already have a timer for this question
    if (gameRoom.computerTimers.has(questionIndex)) {
      return null; // Silently skip duplicates
    }

    // Generate question dynamically based on current question meter
    // Ensure question meter doesn't go below 0 for valid question generation
    const safeQuestionMeter = Math.max(0, gameRoom.questionMeter || 5);

    // Use selected symbols based on user's choice (2 or 4 signs)
    const symbols = gameRoom.selectedSymbols || [
      "sum",
      "difference",
      "product",
      "quotient",
    ];

    const question = questionService.generateQuestion(
      gameRoom.difficulty,
      symbols, // Use selected symbols
      gameRoom.playerRatingBefore,
      safeQuestionMeter,
    );

    if (!question) {
      console.error(
        `❌ [Q${questionIndex}] Failed to generate question - falling back to default`,
      );
      // Fallback: generate question without meter constraint
      const fallbackQuestion = questionService.generateQuestion(
        gameRoom.difficulty,
        ["sum", "difference", "product", "quotient"],
        gameRoom.playerRatingBefore,
        5, // Default meter level
      );
      if (!fallbackQuestion) {
        console.error(
          `❌ [Q${questionIndex}] Even fallback question generation failed`,
        );
        return null;
      }
      return fallbackQuestion;
    }

    // Store the generated question for this index
    if (!gameRoom.questions) gameRoom.questions = [];
    gameRoom.questions[questionIndex] = question;

    // Record when this question was served so player timeSpent can be compared
    // against the computer's absolute delay.
    gameRoom.questionServedAt = Date.now();
    gameRoom.pendingQuestionIndex = questionIndex;

    // Pre-generate the computer's decision for this question
    const computerDecision = gameRoom.prepareComputerDecision(questionIndex);
    // const computerDelay = Math.min(computerDecision.delayMs, 3000);
    const computerDelay = computerDecision.delayMs;

    // Start computer's independent countdown from THIS moment (question appeared)
    const timerHandle = setTimeout(async () => {
      if (!gameRooms.has(gameRoom.id) || gameRoom.gameState !== "started")
        return;

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
        computerStreak: gameRoom.computerStreak,
        questionMeter: gameRoom.questionMeter,
        whoAnsweredFirst: "computer",
      });

      // Serve next question immediately after computer answers (independent play)
      setTimeout(() => {
        if (!gameRooms.has(gameRoom.id) || gameRoom.gameState !== "started")
          return;
        const nextIndex = questionIndex + 1;
        const nextQ = serveNextQuestion(gameRoom, socket, nextIndex);
        if (nextQ) {
          socket.emit("nextQuestion", {
            index: nextIndex,
            question: nextQ.question,
            input1: nextQ.input1,
            input2: nextQ.input2,
            symbol: nextQ.symbol,
            finalLevel: nextQ.finalLevel,
            questionMeter: gameRoom.questionMeter,
          });
        }
      }, config.gameTiming[gameRoom.gameMode].transitionDelay);
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

        const { computerLevel, gameMode, selectedSymbols } = gameData || {};

        if (!computerLevel || computerLevel < 1 || computerLevel > 5)
          throw new Error("Invalid computer level (1-5)");
        if (!gameMode || !config.gameTiming[gameMode])
          throw new Error("Invalid game mode");
        if (playerGames.has(playerId))
          throw new Error("Player already has an active game");

        // Validate selected symbols (2 or 4 signs)
        const validSymbols = ["sum", "difference", "product", "quotient"];
        let symbols = selectedSymbols || validSymbols; // Default to all 4

        if (!Array.isArray(symbols) || symbols.length === 0) {
          symbols = validSymbols; // Default to all 4
        }

        // Ensure all selected symbols are valid
        symbols = symbols.filter((sym) => validSymbols.includes(sym));

        if (symbols.length === 0) {
          symbols = ["sum", "difference"]; // Default to 2 signs if invalid
        }

        const player = await Player.findById(playerId);
        if (!player) throw new Error("Player not found");

        const playerRating = player.pr.computer[`level${computerLevel}`];
        const difficulty = config.getDifficultyByRating(playerRating);

        // Don't pre-load questions - generate them dynamically for endless mode
        const gameRoom = new ComputerGameRoom(
          playerId,
          computerLevel,
          gameMode,
          [], // Empty questions array - will be generated dynamically
          questionService,
          io,
          playerRating, // Pass player rating for question meter calculation
        );

        // Store selected symbols for question generation
        gameRoom.selectedSymbols = symbols;

        const initResult = await gameRoom.initialize(player);

        gameRooms.set(gameRoom.id, gameRoom);
        playerGames.set(playerId, gameRoom.id);
        socket.join(gameRoom.id);

        gameRoom.startGame(async (result, endReason) => {
          // Clear any pending computer timers before emitting gameEnded
          for (const [
            questionIndex,
            handle,
          ] of gameRoom.computerTimers.entries()) {
            clearTimeout(handle);
          }
          gameRoom.computerTimers.clear();
          gameRoom.computerAlreadyEmitted.clear();

          socket.emit("gameEnded", { ...result, endReason });
          gameRooms.delete(gameRoom.id);
          playerGames.delete(playerId);
        });

        // Serve Q0 — this starts computer's independent countdown for Q0
        const firstQuestion = serveNextQuestion(gameRoom, socket, 0);

        if (callback) {
          console.log(
            `🔍 DEBUG: Returning gameMode="${gameMode}" (type: ${typeof gameMode})`,
          );
          callback({
            success: true,
            gameId: gameRoom.id,
            gameMode,
            computerLevel,
            computerDisplayName: initResult.computerDisplayName,
            difficulty,
            selectedSymbols: symbols, // Echo back selected symbols
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
        if (!gameRoom) {
          // Check if game recently ended (within last 5 seconds)
          if (playerGames.has(playerId)) {
            const recentGameId = playerGames.get(playerId);
            const recentGameRoom = gameRooms.get(recentGameId);
            if (recentGameRoom && recentGameRoom.gameState === "ended") {
              console.log(
                `⚠️ [Q${questionIndex}] Game recently ended, rejecting answer`,
              );
              if (callback)
                callback({ success: false, error: "Game has ended" });
              return;
            }
          }
          throw new Error("Game not found");
        }

        // Allow answers if game is started
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

        // Only emit results if game is still active
        if (gameRoom.gameState === "started" && gameRooms.has(gameRoom.id)) {
          // Emit playerAnswerResult immediately
          socket.emit("playerAnswerResult", {
            questionIndex,
            isCorrect,
            playerScore: gameRoom.playerScore,
            playerStreak: gameRoom.playerStreak,
            questionMeter: gameRoom.questionMeter,
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
              if (
                !gameRooms.has(gameRoom.id) ||
                gameRoom.gameState !== "started"
              )
                return;

              socket.emit("computerAnswerResult", {
                questionIndex,
                answer: computerDecision.answer,
                isCorrect:
                  computerDecision.action === "skip"
                    ? false
                    : computerDecision.isCorrect,
                skipped: computerDecision.action === "skip",
                computerScore: gameRoom.computerScore,
                computerStreak: gameRoom.computerStreak,
                questionMeter: gameRoom.questionMeter,
                whoAnsweredFirst: result.whoAnsweredFirst,
              });

              // Serve next question after transition delay (independent play)
              const nextIndex = questionIndex + 1;
              setTimeout(() => {
                if (
                  !gameRooms.has(gameRoom.id) ||
                  gameRoom.gameState !== "started"
                )
                  return;
                const nextQ = serveNextQuestion(gameRoom, socket, nextIndex);
                if (nextQ) {
                  socket.emit("nextQuestion", {
                    index: nextIndex,
                    question: nextQ.question,
                    input1: nextQ.input1,
                    input2: nextQ.input2,
                    symbol: nextQ.symbol,
                    finalLevel: nextQ.finalLevel,
                    questionMeter: gameRoom.questionMeter,
                  });
                }
              }, config.gameTiming[gameRoom.gameMode].transitionDelay);
            }, remainingDelay);
          } else {
            // Serve next question after transition delay (independent play)
            const nextIndex = questionIndex + 1;
            setTimeout(() => {
              if (
                !gameRooms.has(gameRoom.id) ||
                gameRoom.gameState !== "started"
              )
                return;
              const nextQ = serveNextQuestion(gameRoom, socket, nextIndex);
              if (nextQ) {
                socket.emit("nextQuestion", {
                  index: nextIndex,
                  question: nextQ.question,
                  input1: nextQ.input1,
                  input2: nextQ.input2,
                  symbol: nextQ.symbol,
                  finalLevel: nextQ.finalLevel,
                  questionMeter: gameRoom.questionMeter,
                });
              }
            }, config.gameTiming[gameRoom.gameMode].transitionDelay);
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
