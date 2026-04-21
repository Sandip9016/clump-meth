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
    this.playerMeter = 5;
    this.playerStreak = 0;
    this.playerCorrectAnswers = 0;
    this.playerQuestionsAnswered = 0;

    // Computer state
    this.computerScore = 0;
    this.computerMeter = 5;
    this.computerStreak = 0;
    this.computerCorrectAnswers = 0;
    this.computerQuestionsAnswered = 0;

    this.currentQuestionIndex = 0;
    this.questionHistory = [];
    this.computerAIState = null;
    this.computerPendingAnswers = new Map();

    this.difficulty = null;
    this.playerRatingBefore = null;
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
    console.log(`🎮 ComputerGameRoom started: ${this.id}`);

    this._timerHandle = setTimeout(async () => {
      const result = await this.endGame("timerExpired");
      if (result && this._onGameEnd) {
        this._onGameEnd(result, "timerExpired");
      }
    }, this.gameDuration);
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Fetch next question and pre-generate the computer's decision for it.
   */
  getNextQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      return null;
    }

    const question = this.questions[this.currentQuestionIndex];
    this.currentQuestionIndex++;

    const computerDecision = ComputerAI.getComputerDecision(
      this.computerAIState,
      question,
    );
    this.computerPendingAnswers.set(
      this.currentQuestionIndex - 1,
      computerDecision,
    );

    return question;
  }

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Handle player answer submission.
   *
   * Both player AND computer are treated as real parallel players (like PVP):
   *
   *  SCORE  — both always update regardless of who answered first
   *           correct → +2,  wrong → -1 (floor 0),  skip → 0
   *
   *  STREAK — both always update regardless of order
   *           correct → +1,  wrong/skip → reset to 0
   *
   *  METER  — only the player who answered FIRST gets meter change on that Q.
   *           The slower player gets 0 meter change for that question.
   *           skip → no meter change for the computer (and no score/streak change)
   *
   * Meter bounds: floor 1, cap 10  (spec §6.2)
   * Score bounds: floor 0
   */
  async handlePlayerAnswer(
    questionIndex,
    playerAnswer,
    playerTimeSpent,
    isCorrect,
  ) {
    const question = this.questions[questionIndex];
    if (!question) {
      throw new Error(`Question ${questionIndex} not found`);
    }

    const computerDecision = this.computerPendingAnswers.get(questionIndex);
    if (!computerDecision) {
      throw new Error(
        `Computer decision not found for question ${questionIndex}`,
      );
    }

    // Who answered first — determines who gets the meter change.
    // A computer SKIP does not count as "answering first" — it is opting out.
    // When the computer skips, the player's answer is uncontested and always
    // gets the meter change, regardless of timing.
    const computerSkipped = computerDecision.action === "skip";
    const playerAnsweredFirst =
      computerSkipped || playerTimeSpent < computerDecision.delayMs;
    const whoAnsweredFirst = playerAnsweredFirst ? "player" : "computer";

    // ── PLAYER: score + streak always update ────────────────────────────────
    let playerMeterChange = 0;

    if (isCorrect) {
      this.playerScore += 2;
      this.playerStreak += 1;
      this.playerCorrectAnswers += 1;
      // Meter only if player answered first
      if (playerAnsweredFirst) {
        playerMeterChange = 2;
        this.playerMeter = Math.min(this.playerMeter + 2, 10);
      }
    } else {
      this.playerScore = Math.max(this.playerScore - 1, 0);
      this.playerStreak = 0;
      // Meter penalty only if player answered first
      if (playerAnsweredFirst) {
        playerMeterChange = -1;
        this.playerMeter = Math.max(this.playerMeter - 1, 1);
      }
    }
    this.playerQuestionsAnswered += 1;

    // ── COMPUTER: score + streak always update ──────────────────────────────
    let computerMeterChange = 0;

    if (computerDecision.action === "skip") {
      // Spec §4.3: skip → no score change, no meter change, streak resets
      this.computerStreak = 0;
      // computerScore and computerMeter unchanged
    } else if (computerDecision.isCorrect) {
      this.computerScore += 2;
      this.computerStreak += 1;
      this.computerCorrectAnswers += 1;
      // Meter only if computer answered first
      if (!playerAnsweredFirst) {
        computerMeterChange = 2;
        this.computerMeter = Math.min(this.computerMeter + 2, 10);
      }
    } else {
      this.computerScore = Math.max(this.computerScore - 1, 0);
      this.computerStreak = 0;
      // Meter penalty only if computer answered first
      if (!playerAnsweredFirst) {
        computerMeterChange = -1;
        this.computerMeter = Math.max(this.computerMeter - 1, 1);
      }
    }
    this.computerQuestionsAnswered += 1;

    // ── Question history (Phase 2 data prep — spec §6.4) ───────────────────
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
        isCorrect:
          computerDecision.action === "skip"
            ? false
            : computerDecision.isCorrect,
        timeSpent: computerDecision.timeSpent,
        skipped: computerDecision.action === "skip",
        streakAtMoment: this.computerStreak,
      },
      playerMeterChange,
      computerMeterChange,
      whoAnsweredFirst,
    };

    this.questionHistory.push(questionDetail);

    return {
      playerScore: this.playerScore,
      playerMeter: this.playerMeter,
      playerStreak: this.playerStreak,
      computerScore: this.computerScore,
      computerMeter: this.computerMeter,
      computerStreak: this.computerStreak,
      computerDecision,
      whoAnsweredFirst,
      questionDetail,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  async endGame(endReason) {
    if (this.gameState === "ended") return null;

    this.gameState = "ended";
    this.gameEndTime = Date.now();

    // Cancel timer if game ended early
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

      // ELO rating change
      const K = 32;
      const computerRating = 1000 + this.computerLevel * 100;
      const expectedScore =
        1 /
        (1 + Math.pow(10, (computerRating - this.playerRatingBefore) / 400));
      const actualScore =
        result === "PlayerWon" ? 1 : result === "Draw" ? 0.5 : 0;
      const ratingChange = Math.round(K * (actualScore - expectedScore));
      const playerRatingAfter = this.playerRatingBefore + ratingChange;

      // Update player stats
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

      // ── Badge checks (never throws — badge errors must not break gameplay) ─
      try {
        const cs = player.stats.computer;
        const computerGamesPlayed =
          (cs.level1.gamesPlayed || 0) +
          (cs.level2.gamesPlayed || 0) +
          (cs.level3.gamesPlayed || 0) +
          (cs.level4.gamesPlayed || 0) +
          (cs.level5.gamesPlayed || 0);

        // overall.totalGames only tracks PvP/practice — add computer games for true total
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
      playerMeter: this.playerMeter,
      playerStreak: this.playerStreak,
      computerScore: this.computerScore,
      computerMeter: this.computerMeter,
      computerStreak: this.computerStreak,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.questions.length,
    };
  }
}

module.exports = ComputerGameRoom;
