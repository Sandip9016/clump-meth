// services/ComputerGameRoom.js
const ComputerAI = require("./ComputerAI");
const config = require("../config/computerModeConfig");
const Player = require("../models/Player");
const ComputerGame = require("../models/ComputerGame");
const badgeService = require("./BadgeService");

class ComputerGameRoom {
  constructor(
    playerId,
    computerLevel,
    gameMode,
    questions,
    questionService,
    io,
    playerRating = null,
  ) {
    this.id = `computer_${playerId}_${computerLevel}_${Date.now()}`;

    this.playerId = playerId;
    this.computerLevel = computerLevel;
    this.gameMode = gameMode;
    this.gameDuration = config.gameTiming[gameMode].totalDuration * 1000;
    this.questions = questions;
    this.questionService = questionService;
    this.io = io;

    this.gameState = "waiting";
    this.gameStartTime = null;
    this.gameEndTime = null;

    // Player state
    this.playerScore = 0;
    this.playerStreak = 0;
    this.playerCorrectAnswers = 0;
    this.playerQuestionsAnswered = 0;

    // Computer state
    this.computerScore = 0;
    this.computerStreak = 0;
    this.computerCorrectAnswers = 0;
    this.computerQuestionsAnswered = 0;

    // Independent question indices for PvP-style play
    this.playerQuestionIndex = 0;
    this.computerQuestionIndex = 0;

    // Shared question history (like PvP)
    this.questionHistory = [];
    this.computerAIState = null;
    this.computerPendingAnswers = new Map();

    // Player questions storage (indexed by playerQuestionIndex)
    this.playerQuestions = [];

    // Computer questions storage (indexed by computerQuestionIndex)
    this.computerQuestions = [];

    this.difficulty = null;
    this.playerRatingBefore = null;

    // ✅ Set by socket before initialize() is called
    this.symNum = "2"; // "2" or "4" — derived from selectedSymbols.length
    this.diffCode = null; // e.g. "M2", "E4" — derived in initialize()

    // Questions meter (shared like PvP)
    this.questionMeter = Math.max(
      5,
      questionService.getInitialQuestionMeter(
        playerRating || 1000,
        1000 + computerLevel * 100,
      ),
    );

    // ── Independent timer tracking for PvP-style play ────────────────────────
    // playerTimers: playerQuestionIndex -> setTimeout handle (for computer's independent answers)
    // computerTimers: computerQuestionIndex -> setTimeout handle (computer's own countdown)
    // computerAlreadyEmitted: Set of computerQuestionIndexes where computerAnswerResult was sent
    // playerAlreadyAnswered: Set of playerQuestionIndexes player has submitted
    // playerQuestionServedAt: timestamp when current player question was served
    // computerQuestionServedAt: timestamp when current computer question was served
    // pendingPlayerQuestionIndex: which player question is currently active
    // pendingComputerQuestionIndex: which computer question is currently active
    this.playerTimers = new Map();
    this.computerTimers = new Map();
    this.computerAlreadyEmitted = new Set();
    this.playerAlreadyAnswered = new Set();
    this.playerQuestionServedAt = null;
    this.computerQuestionServedAt = null;
    this.pendingPlayerQuestionIndex = null;
    this.pendingComputerQuestionIndex = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async initialize(player) {
    try {
      const levelKey = `level${this.computerLevel}`;

      // Step 1: Determine diffCode based on selected symbols and current skill level
      const symNum = this.symNum || "2";

      // FIXED: Get the appropriate rating for the current symNum to determine difficulty
      // This ensures we use the right rating bucket (E2/E4/M2/M4/H2/H4) based on symbol count
      let seedRating;
      if (symNum === "2") {
        // For 2-symbol games, check player's current 2-symbol ratings to determine difficulty
        const e2Rating = player.pr.computer[levelKey]["E2"] || 1000;
        const m2Rating = player.pr.computer[levelKey]["M2"] || 1000;
        const h2Rating = player.pr.computer[levelKey]["H2"] || 1000;

        // Use the best 2-symbol rating to determine appropriate difficulty
        seedRating = Math.max(e2Rating, m2Rating, h2Rating);
      } else if (symNum === "4") {
        // For 4-symbol games, check player's current 4-symbol ratings to determine difficulty
        const e4Rating = player.pr.computer[levelKey]["E4"] || 1000;
        const m4Rating = player.pr.computer[levelKey]["M4"] || 1000;
        const h4Rating = player.pr.computer[levelKey]["H4"] || 1000;

        // Use the best 4-symbol rating to determine appropriate difficulty
        seedRating = Math.max(e4Rating, m4Rating, h4Rating);
      } else {
        seedRating = 1000; // fallback
      }

      const seedDifficulty = config.getDifficultyByRating(seedRating);
      const diffLetter =
        seedDifficulty === "easy" ? "E" : seedDifficulty === "hard" ? "H" : "M";

      // Step 2: Build diffCode and read the specific rating for this bucket
      this.diffCode = `${diffLetter}${symNum}`;
      this.playerRatingBefore =
        player.pr.computer[levelKey][this.diffCode] || 1000;

      // ✅ Step 3: Derive difficulty from this specific bucket's rating
      this.difficulty = config.getDifficultyByRating(this.playerRatingBefore);

      this.computerAIState = ComputerAI.initializeSession(this.computerLevel);
      this.gameState = "initialized";

      console.log(
        `✅ ComputerGameRoom initialized: ${this.id} | DiffCode: ${this.diffCode} | Rating: ${this.playerRatingBefore} | Difficulty: ${this.difficulty}`,
      );

      return {
        gameId: this.id,
        playerRating: this.playerRatingBefore,
        difficulty: this.difficulty,
        diffCode: this.diffCode,
        computerLevel: this.computerLevel,
        computerDisplayName: this.computerAIState.levelProfile.displayName,
      };
    } catch (error) {
      console.error("Error initializing ComputerGameRoom:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  startGame(onGameEnd) {
    this.gameState = "started";
    this.gameStartTime = Date.now();
    this._onGameEnd = onGameEnd || null;
    console.log(
      `🎮 ComputerGameRoom started: ${this.id} | Duration: ${this.gameDuration}ms (${this.gameMode})`,
    );

    // Store a reference to self for the timer callback
    const self = this;

    // Add 5 second grace period to allow pending answers to be processed
    const gracePeriod = 5000;
    const totalDuration = this.gameDuration + gracePeriod;

    this._timerHandle = setTimeout(async () => {
      console.log(`⏰ [${self.id}] Game timer expired - ending game`);
      try {
        const result = await self.endGame("timerExpired");
        if (result && self._onGameEnd) {
          self._onGameEnd(result, "timerExpired");
        }
      } catch (error) {
        console.error(`❌ [${self.id}] Error in timer callback:`, error);
      }
    }, totalDuration);
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Pre-generate the computer's decision for a question.
   * Called when a question is served to either player or computer.
   */
  prepareComputerDecision(questionIndex, isForComputer = false) {
    const questionsArray = isForComputer
      ? this.computerQuestions
      : this.playerQuestions;
    const question = questionsArray[questionIndex];
    if (!question) return null;

    const computerDecision = ComputerAI.getComputerDecision(
      this.computerAIState,
      question,
    );
    this.computerPendingAnswers.set(questionIndex, computerDecision);

    return computerDecision;
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Called when the computer answers a question (either by timer or after player).
   * Updates computer score/meter/streak.
   */
  processComputerAnsweredFirst(questionIndex) {
    const computerDecision = this.computerPendingAnswers.get(questionIndex);
    if (!computerDecision) return;

    if (computerDecision.action === "skip") {
      this.computerStreak = 0;
    } else if (computerDecision.isCorrect) {
      this.computerScore += 2;
      this.computerStreak += 1;
      this.computerCorrectAnswers += 1;
    } else {
      this.computerScore = Math.max(this.computerScore - 1, 0);
      this.computerStreak = 0;
    }
    this.computerQuestionsAnswered += 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Handle player answer. Works with player's independent question index.
   */
  async handlePlayerAnswer(
    playerQuestionIndex,
    playerAnswer,
    playerTimeSpent,
    isCorrect,
    playerAnsweredFirst,
  ) {
    const question = this.playerQuestions[playerQuestionIndex];
    if (!question)
      throw new Error(`Player question ${playerQuestionIndex} not found`);

    const computerDecision =
      this.computerPendingAnswers.get(playerQuestionIndex);
    if (!computerDecision)
      throw new Error(
        `Computer decision not found for player question ${playerQuestionIndex}`,
      );

    const computerSkipped = computerDecision.action === "skip";
    const whoAnsweredFirst = playerAnsweredFirst ? "player" : "computer";

    // ── PLAYER: score + streak ───────────────────────────────────────────
    if (isCorrect) {
      this.playerScore += 2;
      this.playerStreak += 1;
      this.playerCorrectAnswers += 1;
    } else {
      this.playerScore = Math.max(this.playerScore - 1, 0);
      this.playerStreak = 0;
    }
    this.playerQuestionsAnswered += 1;

    // ── Update shared questions meter (like PvP) ─────────────────────────────
    const qmChange = this.questionService.calculateQMChange(
      isCorrect,
      this.playerRatingBefore,
      question.finalLevel || question.levelNumber || 5,
    );
    // Ensure question meter never goes below 2 to maintain valid question generation
    this.questionMeter = Math.max(2, this.questionMeter + qmChange);

    // ── COMPUTER: score + streak (only if computer timer hasn't already fired) ─
    const computerAlreadyProcessed =
      this.computerAlreadyEmitted.has(playerQuestionIndex);

    if (!computerAlreadyProcessed) {
      if (computerSkipped) {
        this.computerStreak = 0;
      } else if (computerDecision.isCorrect) {
        this.computerScore += 2;
        this.computerStreak += 1;
        this.computerCorrectAnswers += 1;
      } else {
        this.computerScore = Math.max(this.computerScore - 1, 0);
        this.computerStreak = 0;
      }
      this.computerQuestionsAnswered += 1;
    }

    // ── Question history ─────────────────────────────────────────────────
    const questionDetail = {
      question: question.question,
      correctAnswer: question.answer,
      difficulty: this.difficulty,
      questionLevel: question.finalLevel || question.levelNumber || 5,
      playerResponse: {
        answer: playerAnswer,
        isCorrect,
        timeSpent: playerTimeSpent,
        streakAtMoment: this.playerStreak,
      },
      computerResponse: {
        answer: computerDecision.answer,
        isCorrect: computerSkipped ? false : computerDecision.isCorrect,
        timeSpent: computerDecision.timeSpent,
        skipped: computerSkipped,
        streakAtMoment: this.computerStreak,
      },
      playerMeterChange: qmChange,
      computerMeterChange: 0, // No individual meters
      whoAnsweredFirst,
      questionMeter: this.questionMeter, // Add shared meter to history
    };

    this.questionHistory.push(questionDetail);

    return {
      playerScore: this.playerScore,
      playerStreak: this.playerStreak,
      computerScore: this.computerScore,
      computerStreak: this.computerStreak,
      computerDecision,
      whoAnsweredFirst,
      questionDetail,
      questionMeter: this.questionMeter,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  async endGame(endReason) {
    if (this.gameState === "ended") {
      return null;
    }

    console.log(
      `🏁 [${this.id}] Ending game - Reason: ${endReason} | Duration: ${Math.floor((Date.now() - this.gameStartTime) / 1000)}s`,
    );
    this.gameState = "ended";
    this.gameEndTime = Date.now();

    if (this._timerHandle) {
      clearTimeout(this._timerHandle);
      this._timerHandle = null;
    }

    // Clear all independent timers
    for (const handle of this.playerTimers.values()) clearTimeout(handle);
    for (const handle of this.computerTimers.values()) clearTimeout(handle);
    this.playerTimers.clear();
    this.computerTimers.clear();

    const gameDurationSeconds = Math.floor(
      (this.gameEndTime - this.gameStartTime) / 1000,
    );

    try {
      const player = await Player.findById(this.playerId);
      if (!player) throw new Error(`Player ${this.playerId} not found`);

      let result, winner;
      if (this.playerScore > this.computerScore) {
        result = "PlayerWon";
        winner = "Player";
      } else if (this.computerScore > this.playerScore) {
        result = "ComputerWon";
        winner = "Computer";
      } else {
        result = "Draw";
        winner = "Draw";
      }

      const K = 32;
      const computerRating = 1000 + this.computerLevel * 100;
      const expectedScore =
        1 /
        (1 + Math.pow(10, (computerRating - this.playerRatingBefore) / 400));
      const actualScore =
        result === "PlayerWon" ? 1 : result === "Draw" ? 0.5 : 0;
      const ratingChange = Math.round(K * (actualScore - expectedScore));
      const playerRatingAfter = this.playerRatingBefore + ratingChange;

      const levelKey = `level${this.computerLevel}`;
      const levelStats = player.stats.computer[levelKey][this.diffCode];

      levelStats.gamesPlayed += 1;
      levelStats.totalScore += this.playerScore;
      levelStats.highScore = Math.max(levelStats.highScore, this.playerScore);

      if (result === "PlayerWon") {
        levelStats.wins += 1;
        levelStats.currentStreak += 1;
        levelStats.bestStreak = Math.max(
          levelStats.bestStreak,
          levelStats.currentStreak,
        );
      } else if (result === "ComputerWon") {
        levelStats.losses += 1;
        levelStats.currentStreak = 0;
      } else {
        levelStats.draws += 1;
        levelStats.currentStreak = 0;
      }

      levelStats.winRate = Math.round(
        (levelStats.wins / levelStats.gamesPlayed) * 100,
      );
      levelStats.averageScore = levelStats.totalScore / levelStats.gamesPlayed;

      player.pr.computer[levelKey][this.diffCode] = playerRatingAfter;
      await player.save();

      const computerGame = new ComputerGame({
        player: this.playerId,
        computerLevel: this.computerLevel,
        playerScore: this.playerScore,
        computerScore: this.computerScore,
        playerCorrectAnswers: this.playerCorrectAnswers,
        computerCorrectAnswers: this.computerCorrectAnswers,
        winner,
        result,
        difficulty: this.difficulty,
        diffCode: this.diffCode,
        gameMode: this.gameMode,
        gameDuration: gameDurationSeconds,
        questionHistory: this.questionHistory,
        playerRatingBefore: this.playerRatingBefore,
        playerRatingAfter,
        playerRatingChange: ratingChange,
        endReason,
        playedAt: new Date(),
      });

      await computerGame.save();
      console.log(
        `💾 ComputerGame saved: ${computerGame._id} | Winner: ${winner} | Rating Change: ${ratingChange}`,
      );

      try {
        const cs = player.stats.computer;
        const computerGamesPlayed =
          (cs.level1.gamesPlayed || 0) +
          (cs.level2.gamesPlayed || 0) +
          (cs.level3.gamesPlayed || 0) +
          (cs.level4.gamesPlayed || 0) +
          (cs.level5.gamesPlayed || 0);
        const overallGamesPlayed =
          (player.stats.overall.totalGames || 0) + computerGamesPlayed;
        await badgeService.onComputerGameCompleted(
          this.playerId,
          computerGamesPlayed,
          overallGamesPlayed,
        );
      } catch (badgeErr) {
        console.error("⚠️  Badge check failed (non-fatal):", badgeErr.message);
      }

      return {
        gameId: this.id,
        winner,
        result,
        playerScore: this.playerScore,
        computerScore: this.computerScore,
        ratingBefore: this.playerRatingBefore,
        ratingAfter: playerRatingAfter,
        ratingChange,
        stats: {
          gamesPlayed: levelStats.gamesPlayed,
          wins: levelStats.wins,
          losses: levelStats.losses,
          draws: levelStats.draws,
          winRate: levelStats.winRate,
          currentStreak: levelStats.currentStreak,
          bestStreak: levelStats.bestStreak,
        },
      };
    } catch (error) {
      console.error("Error ending ComputerGame:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  getState() {
    return {
      gameId: this.id,
      gameState: this.gameState,
      playerScore: this.playerScore,
      playerStreak: this.playerStreak,
      computerScore: this.computerScore,
      computerStreak: this.computerStreak,
      questionMeter: this.questionMeter,
      playerQuestionIndex: this.playerQuestionIndex,
      computerQuestionIndex: this.computerQuestionIndex,
      totalQuestions:
        this.playerQuestions.length + this.computerQuestions.length,
    };
  }
}

module.exports = ComputerGameRoom;
