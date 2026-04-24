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

  // ─── Helper: serve next question for PLAYER and start computer's independent timer ─
  //
  // This generates questions dynamically for the player only.
  // Computer has its own independent question serving system.
  //
  function serveNextPlayerQuestion(gameRoom, socket, playerQuestionIndex) {
    // Check if game is still active and not ending
    if (!gameRooms.has(gameRoom.id) || gameRoom.gameState !== "started") {
      return null;
    }

    // Check if we already have a timer for this player question
    if (gameRoom.playerTimers.has(playerQuestionIndex)) {
      return null; // Silently skip duplicates
    }

    // Generate question dynamically based on current question meter
    const safeQuestionMeter = Math.max(0, gameRoom.questionMeter || 5);

    // Use selected symbols based on user's choice
    const symbols = gameRoom.selectedSymbols || [
      "sum",
      "difference",
      "product",
      "quotient",
    ];

    const question = questionService.generateQuestion(
      gameRoom.difficulty,
      symbols,
      gameRoom.playerRatingBefore,
      safeQuestionMeter,
    );

    if (!question) {
      console.error(
        `❌ [Player Q${playerQuestionIndex}] Failed to generate question - falling back to default`,
      );
      const fallbackQuestion = questionService.generateQuestion(
        gameRoom.difficulty,
        ["sum", "difference", "product", "quotient"],
        gameRoom.playerRatingBefore,
        5,
      );
      if (!fallbackQuestion) {
        console.error(
          `❌ [Player Q${playerQuestionIndex}] Even fallback question generation failed`,
        );
        return null;
      }
      return fallbackQuestion;
    }

    // Store the generated question for this player index
    gameRoom.playerQuestions[playerQuestionIndex] = question;
    gameRoom.playerQuestionIndex = playerQuestionIndex;

    // Record when this question was served
    gameRoom.playerQuestionServedAt = Date.now();
    gameRoom.pendingPlayerQuestionIndex = playerQuestionIndex;

    // Pre-generate the computer's decision for this player question
    const computerDecision = gameRoom.prepareComputerDecision(
      playerQuestionIndex,
      false,
    );
    // Use full delay without capping at 3s
    const computerDelay = computerDecision.delayMs;

    // Start computer's independent countdown for answering THIS player question
    const timerHandle = setTimeout(async () => {
      if (!gameRooms.has(gameRoom.id) || gameRoom.gameState !== "started")
        return;

      // If player already answered this question, computerAnswerResult was
      // already emitted inside submitAnswer — don't double-emit.
      if (gameRoom.computerAlreadyEmitted.has(playerQuestionIndex)) return;

      // Player has NOT answered yet — computer answers on its own schedule.
      gameRoom.processComputerAnsweredFirst(playerQuestionIndex);
      gameRoom.computerAlreadyEmitted.add(playerQuestionIndex);

      socket.emit("computerAnswerResult", {
        questionIndex: playerQuestionIndex,
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
    }, computerDelay);

    // Store handle so we can cancel it if player answers before computer fires
    gameRoom.playerTimers.set(playerQuestionIndex, timerHandle);

    return question;
  }

  // ─── Helper: serve next question for COMPUTER only (independent play) ─
  //
  // Computer has its own question index and answers on its own schedule.
  //
  function serveNextComputerQuestion(gameRoom, socket, computerQuestionIndex) {
    // Check if game is still active and not ending
    if (!gameRooms.has(gameRoom.id) || gameRoom.gameState !== "started") {
      return null;
    }

    // Check if we already have a timer for this computer question
    if (gameRoom.computerTimers.has(computerQuestionIndex)) {
      return null; // Silently skip duplicates
    }

    // Generate question dynamically based on current question meter
    const safeQuestionMeter = Math.max(0, gameRoom.questionMeter || 5);

    // Use selected symbols based on user's choice
    const symbols = gameRoom.selectedSymbols || [
      "sum",
      "difference",
      "product",
      "quotient",
    ];

    const question = questionService.generateQuestion(
      gameRoom.difficulty,
      symbols,
      gameRoom.playerRatingBefore,
      safeQuestionMeter,
    );

    if (!question) {
      console.error(
        `❌ [Computer Q${computerQuestionIndex}] Failed to generate question - falling back to default`,
      );
      const fallbackQuestion = questionService.generateQuestion(
        gameRoom.difficulty,
        ["sum", "difference", "product", "quotient"],
        gameRoom.playerRatingBefore,
        5,
      );
      if (!fallbackQuestion) {
        console.error(
          `❌ [Computer Q${computerQuestionIndex}] Even fallback question generation failed`,
        );
        return null;
      }
      return fallbackQuestion;
    }

    // Store the generated question for this computer index
    gameRoom.computerQuestions[computerQuestionIndex] = question;
    gameRoom.computerQuestionIndex = computerQuestionIndex;

    // Record when this question was served
    gameRoom.computerQuestionServedAt = Date.now();
    gameRoom.pendingComputerQuestionIndex = computerQuestionIndex;

    // Pre-generate the computer's decision for its own question
    const computerDecision = gameRoom.prepareComputerDecision(
      computerQuestionIndex,
      true,
    );
    // Use full delay without capping at 3s
    const computerDelay = computerDecision.delayMs;

    // Start computer's independent countdown for answering ITS OWN question
    const timerHandle = setTimeout(async () => {
      if (!gameRooms.has(gameRoom.id) || gameRoom.gameState !== "started")
        return;

      // Computer answers its own question
      gameRoom.processComputerAnsweredFirst(computerQuestionIndex);
      gameRoom.computerAlreadyEmitted.add(computerQuestionIndex);

      socket.emit("computerAnswerResult", {
        questionIndex: computerQuestionIndex,
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

      // Serve next computer question after transition delay
      setTimeout(() => {
        if (!gameRooms.has(gameRoom.id) || gameRoom.gameState !== "started")
          return;
        const nextIndex = computerQuestionIndex + 1;
        serveNextComputerQuestion(gameRoom, socket, nextIndex);
      }, config.gameTiming[gameRoom.gameMode].transitionDelay);
    }, computerDelay);

    // Store handle
    gameRoom.computerTimers.set(computerQuestionIndex, timerHandle);

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

        const { computerLevel, gameMode, selectedSymbols, diffCode } =
          gameData || {};

        if (!computerLevel || computerLevel < 1 || computerLevel > 5)
          throw new Error("Invalid computer level (1-5)");
        if (!gameMode || !config.gameTiming[gameMode])
          throw new Error("Invalid game mode");
        // diffCode is optional - if not provided, use original logic
        const useFrontendDiffCode =
          diffCode && ["E2", "E4", "M2", "M4", "H2", "H4"].includes(diffCode);
        if (diffCode && !useFrontendDiffCode)
          throw new Error(
            "Invalid diffCode. Use one of: E2, E4, M2, M4, H2, H4",
          );
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

        // ✅ Derive symbol number from selectedSymbols count (2 or 4)
        const symNum = symbols.length >= 4 ? "4" : "2";

        // Don't pre-load questions - generate them dynamically for endless mode
        const gameRoom = new ComputerGameRoom(
          playerId,
          computerLevel,
          gameMode,
          [], // Empty questions array - will be generated dynamically
          questionService,
          io,
          null,
        );

        // Store frontend's diffCode choice if provided
        gameRoom.selectedSymbols = symbols;
        gameRoom.symNum = symNum;
        if (useFrontendDiffCode) {
          gameRoom.diffCode = diffCode; // Use frontend's choice
        }
        // If not provided, ComputerGameRoom will use original calculation logic

        const initResult = await gameRoom.initialize(player);

        gameRooms.set(gameRoom.id, gameRoom);
        playerGames.set(playerId, gameRoom.id);
        socket.join(gameRoom.id);

        gameRoom.startGame(async (result, endReason) => {
          // Clear any pending computer timers before emitting gameEnded
          for (const [
            playerQuestionIndex,
            handle,
          ] of gameRoom.playerTimers.entries()) {
            clearTimeout(handle);
          }
          for (const [
            computerQuestionIndex,
            handle,
          ] of gameRoom.computerTimers.entries()) {
            clearTimeout(handle);
          }
          gameRoom.playerTimers.clear();
          gameRoom.computerTimers.clear();
          gameRoom.computerAlreadyEmitted.clear();

          socket.emit("gameEnded", { ...result, endReason });
          gameRooms.delete(gameRoom.id);
          playerGames.delete(playerId);
        });

        // Serve Q0 for player — this starts computer's independent countdown for Q0
        const firstPlayerQuestion = serveNextPlayerQuestion(
          gameRoom,
          socket,
          0,
        );

        // Also start computer's independent question serving (PvP style)
        setTimeout(() => {
          if (gameRooms.has(gameRoom.id) && gameRoom.gameState === "started") {
            serveNextComputerQuestion(gameRoom, socket, 0);
          }
        }, 1000); // Start computer's first question after 1 second delay

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
            difficulty: initResult.difficulty,
            diffCode: initResult.diffCode,
            selectedSymbols: symbols, // Echo back selected symbols
            question: firstPlayerQuestion
              ? {
                  index: 0,
                  question: firstPlayerQuestion.question,
                  input1: firstPlayerQuestion.input1,
                  input2: firstPlayerQuestion.input2,
                  symbol: firstPlayerQuestion.symbol,
                  finalLevel: firstPlayerQuestion.finalLevel,
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
                `⚠️ [Player Q${questionIndex}] Game recently ended, rejecting answer`,
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

        const question = gameRoom.playerQuestions[questionIndex];
        if (!question) throw new Error("Player question not found");

        // Ignore duplicate submissions for the same question
        if (gameRoom.playerAlreadyAnswered.has(questionIndex)) {
          if (callback) callback({ success: true });
          return;
        }
        gameRoom.playerAlreadyAnswered.add(questionIndex);

        const isCorrect = questionService.checkAnswer(question, answer);

        // Determine actual whoAnsweredFirst based on real elapsed time.
        // Computer's delay was set from the moment the question was served.
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
        const timerHandle = gameRoom.playerTimers.get(questionIndex);
        if (timerHandle) {
          clearTimeout(timerHandle);
          gameRoom.playerTimers.delete(questionIndex);
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

            const elapsed = Date.now() - gameRoom.playerQuestionServedAt;
            const remainingDelay = Math.max(
              0,
              computerDecision.delayMs - elapsed, // No capping at 3s
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

              // Serve next PLAYER question after transition delay (independent play)
              const nextPlayerIndex = questionIndex + 1;
              setTimeout(() => {
                if (
                  !gameRooms.has(gameRoom.id) ||
                  gameRoom.gameState !== "started"
                )
                  return;
                const nextQ = serveNextPlayerQuestion(
                  gameRoom,
                  socket,
                  nextPlayerIndex,
                );
                if (nextQ) {
                  socket.emit("nextQuestion", {
                    index: nextPlayerIndex,
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
            // Serve next PLAYER question after transition delay (independent play)
            const nextPlayerIndex = questionIndex + 1;
            setTimeout(() => {
              if (
                !gameRooms.has(gameRoom.id) ||
                gameRoom.gameState !== "started"
              )
                return;
              const nextQ = serveNextPlayerQuestion(
                gameRoom,
                socket,
                nextPlayerIndex,
              );
              if (nextQ) {
                socket.emit("nextQuestion", {
                  index: nextPlayerIndex,
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
          // Clear all independent computer timers
          for (const handle of gameRoom.playerTimers.values())
            clearTimeout(handle);
          for (const handle of gameRoom.computerTimers.values())
            clearTimeout(handle);
          gameRoom.playerTimers.clear();
          gameRoom.computerTimers.clear();
          gameRoom.computerAlreadyEmitted.clear();
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
            for (const handle of gameRoom.playerTimers.values())
              clearTimeout(handle);
            for (const handle of gameRoom.computerTimers.values())
              clearTimeout(handle);
            gameRoom.playerTimers.clear();
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
