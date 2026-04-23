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

    this.currentQuestionIndex = 0;
    this.questionHistory = [];
    this.computerAIState = null;
    this.computerPendingAnswers = new Map();

    this.difficulty = null;
    this.playerRatingBefore = null;

    // Questions meter (shared like PvP)
    this.questionMeter = Math.max(
      5,
      questionService.getInitialQuestionMeter(
        playerRating || 1000,
        1000 + computerLevel * 100,
      ),
    );

    // ── Independent timer tracking ────────────────────────────────────────
    // computerTimers: questionIndex -> setTimeout handle (computer's own countdown)
    // computerAlreadyEmitted: Set of questionIndexes where computerAnswerResult was sent
    // playerAlreadyAnswered: Set of questionIndexes player has submitted
    // questionServedAt: timestamp when current question was served to frontend
    // pendingQuestionIndex: which question is currently active
    this.computerTimers = new Map();
    this.computerAlreadyEmitted = new Set();
    this.playerAlreadyAnswered = new Set();
    this.questionServedAt = null;
    this.pendingQuestionIndex = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async initialize(player) {
    try {
      this.playerRatingBefore =
        player.pr.computer[`level${this.computerLevel}`];
      this.difficulty = config.getDifficultyByRating(this.playerRatingBefore);
      this.computerAIState = ComputerAI.initializeSession(this.computerLevel);
      this.gameState = "initialized";

      console.log(
        `✅ ComputerGameRoom initialized: ${this.id} | Player Rating: ${this.playerRatingBefore} | Difficulty: ${this.difficulty}`,
      );

      return {
        gameId: this.id,
        playerRating: this.playerRatingBefore,
        difficulty: this.difficulty,
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
   * Called by serveNextQuestion in the socket controller when a question is served.
   * Replaces the old getNextQuestion() which also advanced currentQuestionIndex.
   */
  prepareComputerDecision(questionIndex) {
    const question = this.questions[questionIndex];
    if (!question) return null;

    const computerDecision = ComputerAI.getComputerDecision(
      this.computerAIState,
      question,
    );
    this.computerPendingAnswers.set(questionIndex, computerDecision);
    // Track how many questions have been served
    this.currentQuestionIndex = Math.max(
      this.currentQuestionIndex,
      questionIndex + 1,
    );
    return computerDecision;
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Called when the computer's independent timer fires BEFORE the player answers.
   * Updates computer score/meter/streak. Player side is untouched — they may
   * still answer after this, and handlePlayerAnswer will handle their side.
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
   * Handle player answer. Now accepts explicit playerAnsweredFirst flag
   * resolved by the socket controller using real timestamps.
   */
  async handlePlayerAnswer(
    questionIndex,
    playerAnswer,
    playerTimeSpent,
    isCorrect,
    playerAnsweredFirst,
  ) {
    const question = this.questions[questionIndex];
    if (!question) throw new Error(`Question ${questionIndex} not found`);

    const computerDecision = this.computerPendingAnswers.get(questionIndex);
    if (!computerDecision)
      throw new Error(
        `Computer decision not found for question ${questionIndex}`,
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
    // If computer already fired independently (processComputerAnsweredFirst ran),
    // skip updating computer state here to avoid double-counting.
    const computerAlreadyProcessed =
      this.computerAlreadyEmitted.has(questionIndex);

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
      const levelStats = player.stats.computer[levelKey];

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

      player.pr.computer[levelKey] = playerRatingAfter;
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
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
    };
  }
}

module.exports = ComputerGameRoom;
