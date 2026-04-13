const Player = require("../models/Player");
const PVPGame = require("../models/PVPGame");
const badgeService = require("./BadgeService");

/* ================================
   DATABASE HELPERS (PLAYER ID)
================================ */

async function updatePlayerRatingInDatabase(playerId, delta, diff) {
  try {
    const player = await Player.findById(playerId);
    if (!player) throw new Error(`Player not found: ${playerId}`);

    player.pr.pvp[diff] += delta;
    await player.save();

    return player;
  } catch (err) {
    console.error("Error updating PvP rating:", err);
    throw err;
  }
}

async function savePVPGameToDatabase(gameData) {
  try {
    const {
      player1Id,
      player2Id,
      player1Score,
      player2Score,
      gameDuration,
      disconnectedPlayerId,
      difficulty,
      timer,
      questionHistory,
      emojiHistory,
      ratingChanges,
      correctAnswers,
      endReason,
    } = gameData;

    let result = "Draw";
    let winner = null;

    if (disconnectedPlayerId) {
      winner = disconnectedPlayerId === player1Id ? player2Id : player1Id;
      result = disconnectedPlayerId === player1Id ? "Player2Won" : "Player1Won";
    } else {
      if (player1Score > player2Score) {
        result = "Player1Won";
        winner = player1Id;
      } else if (player2Score > player1Score) {
        result = "Player2Won";
        winner = player2Id;
      }
    }

    const pvpGame = new PVPGame({
      player1: player1Id,
      player2: player2Id,
      scorePlayer1: player1Score,
      scorePlayer2: player2Score,
      correctAnswersPlayer1: correctAnswers?.player1 || 0,
      correctAnswersPlayer2: correctAnswers?.player2 || 0,
      winner,
      result,
      endReason: endReason || "normal",
      disconnectedPlayerId: disconnectedPlayerId || null,
      gameDuration: Math.floor(gameDuration / 1000),
      difficulty: difficulty || "medium",
      timer: timer || 60,
      questionHistory: questionHistory || [],
      emojiHistory: emojiHistory || [],
      ratingChangePlayer1: ratingChanges?.[0] || 0,
      ratingChangePlayer2: ratingChanges?.[1] || 0,
      playedAt: new Date(),
    });

    await pvpGame.save();
    console.log(`💾 Game saved to database: ${pvpGame._id}`);
    return pvpGame;
  } catch (err) {
    console.error("Error saving PVP game:", err);
    throw err;
  }
}

/* ================================
   GAME ROOM
================================ */

class GameRoom {
  constructor(players, questionService) {
    this.id = `${players[0].id}_${players[1].id}_${Date.now()}`;

    this.players = players;
    this.questionService = questionService;
    this.createdAt = Date.now();
    this.gameState = "waiting";

    this.playerProgress = new Map(players.map((p) => [p.id, 0]));
    this.playerAnswers = new Map();
    this.playerScores = new Map();
    this.questions = [];

    this.gameTimer = null;
    this.questionTimer = null;

    this.questionMeter = questionService.getInitialQuestionMeter(
      players[0].rating,
      players[1].rating,
    );

    this.questionMeterController = null;

    // Parse diff code (e.g. "M2", "E4", "H2") into difficulty + symbols
    const rawDiff =
      players[0].rating > players[1].rating ? players[1].diff : players[0].diff;
    const parsed = GameRoom.parseDiffCode(rawDiff);
    this.diffCode = rawDiff;           // original code e.g. "M2"
    this.difficulty = parsed.difficulty; // "easy" | "medium" | "hard"
    this.level = parsed.level;          // numeric level e.g. 2 or 4
    this.symbols = parsed.symbols;      // filtered symbol list

    this.gameSettings = {
      questionsPerGame: 10,
      timePerQuestion: 30000,
      totalGameTime: 60000,
    };

    this.disconnectedPlayerId = null;
    this.disconnectedAt = null;

    // ✅ GRACE PERIOD: Disconnection handling (15 seconds)
    this.gracePeriodTimeout = null;
    this.gracePeriodDuration = 15000; // 15 seconds
    this.disconnectGracePeriod = new Map(); // playerId -> { disconnectedAt, gracePeriodExpired }

    // ✅ DETAILED QUESTION HISTORY
    this.detailedQuestionHistory = [];

    // ✅ EMOJI SYSTEM
    this.emojiHistory = [];
    this.emojiRateLimit = new Map(); // playerId -> lastEmojiTime
    this.ALLOWED_EMOJIS = ["😄", "🔥", "🎯", "😅", "👏", "💪", "⚡", "🚀"];
    this.EMOJI_RATE_LIMIT_MS = 2000; // 2 seconds

    // ✅ REMATCH SYSTEM
    this.rematchRequested = false;
    this.rematchPlayerId = null;
    this.rematchPlayersAccepted = new Map(); // playerId -> boolean
    this.postGameTimeout = null;

    players.forEach((player) => {
      this.playerScores.set(player.id, {
        score: 0,
        correctAnswers: 0,
        totalTime: 0,
        streak: 0,
        maxStreak: 0,
        questionsAnswered: 0,
      });
    });
  }

  /**
   * Parse a diff code like "M2", "E4", "H2" into difficulty, level, and symbols.
   * Format: <D><N> where D = E|M|H and N = 2|4
   *   2 symbols → sum, difference
   *   4 symbols → sum, difference, product, quotient
   */
  static parseDiffCode(diff) {
    const ALL_SYMBOLS = ["sum", "difference", "product", "quotient"];
    const TWO_SYMBOLS = ["sum", "difference"];

    if (!diff || typeof diff !== "string") {
      return { difficulty: "medium", level: 2, symbols: TWO_SYMBOLS };
    }

    const upper = diff.toUpperCase();
    const diffMap = { E: "easy", M: "medium", H: "hard" };
    const diffChar = upper[0];
    const levelNum = parseInt(upper[1], 10);

    const difficulty = diffMap[diffChar] || "medium";
    const level = isNaN(levelNum) ? 2 : levelNum;
    const symbols = level >= 4 ? ALL_SYMBOLS : TWO_SYMBOLS;

    return { difficulty, level, symbols };
  }

  bindIO(io) {
    this.io = io;
  }

  startGame() {
    this.gameState = "active";
    this.gameTimer = setTimeout(
      () => this.endGame(),
      this.gameSettings.totalGameTime,
    );
    this.players.forEach((p) => this.emitNextQuestion(p.id));
  }

  emitNextQuestion(playerId) {
    const idx = this.playerProgress.get(playerId);

    if (this.questions.length <= idx) {
      const lowerRating = Math.min(...this.players.map((p) => p.rating));
      const q = this.questionService.generateQuestion(
        this.difficulty,
        this.symbols,
        lowerRating,
        this.questionMeter,
      );

      this.questions.push(q);
      this.playerAnswers.set(`${idx}`, new Map());
    }

    const player = this.players.find((p) => p.id === playerId);

    this.io.to(player.socketId).emit("next-question", {
      question: this.questions[idx],
      gameState: this.getGameState(),
      questionMeter: this.questionMeter,
    });

    this.playerProgress.set(playerId, idx + 1);
  }

  submitAnswer(playerId, answer, timeSpent) {
    if (this.gameState !== "active") return;

    const idx = this.playerProgress.get(playerId) - 1;
    const q = this.questions[idx];
    if (!q) return;

    const answers = this.playerAnswers.get(`${idx}`);
    if (answers.has(playerId)) return;

    const isCorrect = this.questionService.checkAnswer(q, answer);
    answers.set(playerId, { answer, isCorrect, timeSpent });

    const ps = this.playerScores.get(playerId);
    ps.questionsAnswered++;
    ps.totalTime += timeSpent;

    if (isCorrect) {
      ps.correctAnswers++;
      ps.streak++;
      ps.maxStreak = Math.max(ps.maxStreak, ps.streak);

      // base score for correct answer
      let points = 1;

      // streak bonuses
      if (ps.streak === 3) points += 2;
      else if (ps.streak === 5) points += 3;
      else if (ps.streak === 7) points += 5;

      ps.score += points;
    } else {
      ps.streak = 0;
    }
  }

  async handlePlayerDisconnect(playerId) {
    console.log(`🔌 Player ${playerId} disconnected from game ${this.id}`);

    if (this.gameState !== "active" && this.gameState !== "waiting") {
      console.log(`Game already ${this.gameState}, ignoring disconnect`);
      return null;
    }

    // ✅ START GRACE PERIOD (15 seconds to reconnect)
    console.log(`⏳ Starting 15-second grace period for ${playerId}`);

    this.disconnectGracePeriod.set(playerId, {
      disconnectedAt: Date.now(),
      gracePeriodExpired: false,
    });

    // Notify opponent about grace period
    const opponent = this.players.find((p) => p.id !== playerId);
    if (opponent && this.io && opponent.socketId) {
      this.io.to(opponent.socketId).emit("game-in-grace-period", {
        message: `${this.players.find((p) => p.id === playerId).username} disconnected. Waiting for reconnection...`,
        gracePeriodDuration: this.gracePeriodDuration,
        disconnectedPlayerId: playerId,
      });
    }

    const gracePeriodTimeout = setTimeout(async () => {
      console.log(`⏰ Grace period expired for ${playerId}`);

      const graceData = this.disconnectGracePeriod.get(playerId);
      if (graceData) {
        graceData.gracePeriodExpired = true;
      }

      // Player didn't reconnect - other player wins
      await this.endGameWithDisconnect(playerId);
    }, this.gracePeriodDuration);

    this.gracePeriodTimeout = gracePeriodTimeout;

    return {
      gracePeriod: this.gracePeriodDuration,
      message: "Grace period started. You have 15 seconds to reconnect.",
    };
  }

  async calculateDisconnectResults(winner, disconnectedPlayer) {
    const winnerScore = this.playerScores.get(winner.id);
    const disconnectedScore = this.playerScores.get(disconnectedPlayer.id);

    const results = [
      {
        playerId: winner.id,
        username: winner.username,
        currentRating: winner.rating,
        finalScore: winnerScore.score,
        totalTime: winnerScore.totalTime,
        correctAnswers: winnerScore.correctAnswers,
        disconnected: false,
      },
      {
        playerId: disconnectedPlayer.id,
        username: disconnectedPlayer.username,
        currentRating: disconnectedPlayer.rating,
        finalScore: disconnectedScore.score,
        totalTime: disconnectedScore.totalTime,
        correctAnswers: disconnectedScore.correctAnswers,
        disconnected: true,
      },
    ];

    const ratingChanges = await this.calculateDisconnectRatingChanges(
      results,
      winner.id,
    );

    return {
      winner: results[0],
      disconnectedPlayer: results[1],
      players: results.map((r, i) => ({
        ...r,
        won: r.playerId === winner.id,
        newRating: r.currentRating + ratingChanges[i],
        ratingChange: ratingChanges[i],
      })),
      gameStats: {
        duration: this.disconnectedAt - this.createdAt,
        endReason: "disconnect",
        disconnectedAt: this.disconnectedAt,
      },
    };
  }

  // ✅ NEW: End game with disconnect after grace period expires
  async endGameWithDisconnect(disconnectedPlayerId) {
    if (this.gameState === "completed") {
      return null;
    }

    this.disconnectedPlayerId = disconnectedPlayerId;
    this.disconnectedAt = Date.now();
    this.gameState = "completed";

    clearTimeout(this.gameTimer);
    clearTimeout(this.questionTimer);

    const remainingPlayer = this.players.find(
      (p) => p.id !== disconnectedPlayerId,
    );
    const disconnectedPlayer = this.players.find(
      (p) => p.id === disconnectedPlayerId,
    );

    if (!remainingPlayer) {
      console.error("No remaining player found!");
      return null;
    }

    const gameResults = await this.calculateDisconnectResults(
      remainingPlayer,
      disconnectedPlayer,
    );

    await this.saveGameToDatabase(gameResults);
    this.markPlayersAsNotInGame();

    // ✅ Update PvP stats so badge counters are accurate (non-blocking)
    for (const playerResult of gameResults.players) {
      const won = playerResult.playerId === remainingPlayer.id;
      Player.findById(playerResult.playerId).then((p) => {
        if (p) return p.updatePvPStats(this.difficulty, won);
      }).catch(() => {});
    }

    // ✅ Badge system: both players complete a PvP match on disconnect (non-blocking)
    for (const player of this.players) {
      badgeService.onPvPGameCompleted(player.id).then((earned) => {
        if (earned.length > 0 && this.io && player.socketId) {
          this.io.to(player.socketId).emit("badges-earned", { badges: earned });
        }
      }).catch(() => {});
    }

    if (this.io && remainingPlayer.socketId) {
      this.io.to(remainingPlayer.socketId).emit("grace-period-expired", {
        message: "Your opponent did not reconnect within 15 seconds. You win!",
        gameResults: gameResults,
        finalQuestionMeter: this.questionMeter,
        yourPlayerId: remainingPlayer.id,
        disconnectedPlayerId: disconnectedPlayerId,
      });

      console.log(`📤 Grace period expired, ${remainingPlayer.username} wins`);
    }

    return gameResults;
  }

  // ✅ NEW: Handle reconnection during grace period
  async handlePlayerReconnect(playerId) {
    const graceData = this.disconnectGracePeriod.get(playerId);

    if (!graceData) {
      console.log(`❌ No grace period for ${playerId}`);
      return false;
    }

    if (graceData.gracePeriodExpired) {
      console.log(`❌ Grace period expired for ${playerId}`);
      return false;
    }

    console.log(`✅ Player ${playerId} reconnected within grace period!`);

    // Clear the grace period timeout
    if (this.gracePeriodTimeout) {
      clearTimeout(this.gracePeriodTimeout);
      this.gracePeriodTimeout = null;
    }

    this.disconnectGracePeriod.delete(playerId);
    this.disconnectedPlayerId = null;

    const player = this.players.find((p) => p.id === playerId);
    if (player) {
      player.isInGame = true;
    }

    // Notify opponent of reconnection
    const opponent = this.players.find((p) => p.id !== playerId);
    if (opponent && this.io && opponent.socketId) {
      this.io.to(opponent.socketId).emit("opponent-reconnected", {
        message: `${player.username} has reconnected!`,
        gameState: this.getGameState(),
      });
    }

    return true;
  }

  // ✅ NEW: Validate and send emoji to opponent
  validateAndSendEmoji(playerId, emoji) {
    // Check if emoji is allowed
    if (!this.ALLOWED_EMOJIS.includes(emoji)) {
      return {
        success: false,
        message: "Invalid emoji. Use one of: 😄 🔥 🎯 😅 👏 💪 ⚡ 🚀",
      };
    }

    // Check rate limit
    const lastEmojiTime = this.emojiRateLimit.get(playerId);
    const now = Date.now();

    if (lastEmojiTime && now - lastEmojiTime < this.EMOJI_RATE_LIMIT_MS) {
      return {
        success: false,
        message: `Too many emojis. Wait ${Math.ceil((this.EMOJI_RATE_LIMIT_MS - (now - lastEmojiTime)) / 1000)}s before sending another.`,
      };
    }

    // Update rate limit
    this.emojiRateLimit.set(playerId, now);

    return { success: true };
  }

  // ✅ NEW: Send emoji to opponent
  sendEmojiToOpponent(playerId, emoji) {
    const validation = this.validateAndSendEmoji(playerId, emoji);

    if (!validation.success) {
      return validation;
    }

    const player = this.players.find((p) => p.id === playerId);
    const opponent = this.players.find((p) => p.id !== playerId);

    if (!opponent || !this.io || !opponent.socketId) {
      return { success: false, message: "Opponent not available" };
    }

    // Store emoji in history
    const emojiRecord = {
      emoji,
      fromPlayerId: playerId,
      fromPlayerName: player.username,
      timestamp: new Date(),
    };

    this.emojiHistory.push(emojiRecord);

    // Send to opponent
    this.io.to(opponent.socketId).emit("opponent-emoji-received", {
      emoji,
      fromPlayer: player.username,
      timestamp: new Date(),
    });

    console.log(`😊 ${player.username} sent ${emoji} to ${opponent.username}`);

    // ✅ Badge system: reaction badges (non-blocking)
    badgeService.onReactionSent(player.id).then((earned) => {
      if (earned.length > 0 && this.io && player.socketId) {
        this.io.to(player.socketId).emit("badges-earned", { badges: earned });
      }
    }).catch(() => {});

    return { success: true, message: "Emoji sent!" };
  }

  // ✅ NEW: Get emoji history
  getEmojiHistory() {
    return this.emojiHistory;
  }

  // ✅ NEW: Request rematch
  async requestRematch(playerId) {
    try {
      console.log(`🔄 Rematch requested by ${playerId} in room ${this.id}`);

      const requestingPlayer = this.players.find((p) => p.id === playerId);
      if (!requestingPlayer) {
        throw new Error("Player not found");
      }

      this.rematchRequested = true;
      this.rematchPlayerId = playerId;
      this.rematchPlayersAccepted.set(playerId, true); // Requester already accepts
      this.rematchPlayersAccepted.set(
        this.players.find((p) => p.id !== playerId).id,
        false,
      ); // Other player hasn't decided yet

      return {
        success: true,
        message: `${requestingPlayer.username} requested a rematch!`,
        rematchRequestedBy: requestingPlayer.username,
      };
    } catch (error) {
      console.error("❌ Error requesting rematch:", error);
      throw error;
    }
  }

  // ✅ NEW: Accept rematch
  async acceptRematch(playerId) {
    try {
      console.log(`✅ Rematch accepted by ${playerId} in room ${this.id}`);

      const acceptingPlayer = this.players.find((p) => p.id === playerId);
      if (!acceptingPlayer) {
        throw new Error("Player not found");
      }

      this.rematchPlayersAccepted.set(playerId, true);

      // Check if both players have accepted
      const allAccepted = Array.from(
        this.rematchPlayersAccepted.values(),
      ).every((accepted) => accepted);

      if (allAccepted) {
        console.log(
          `🎮 Both players accepted rematch! Ready to create new game room.`,
        );
        return {
          success: true,
          allAccepted: true,
          message: "Both players accepted! Starting new game...",
        };
      }

      return {
        success: true,
        allAccepted: false,
        message: `${acceptingPlayer.username} accepted. Waiting for opponent...`,
      };
    } catch (error) {
      console.error("❌ Error accepting rematch:", error);
      throw error;
    }
  }

  // ✅ NEW: Decline rematch
  async declineRematch(playerId) {
    try {
      console.log(`❌ Rematch declined by ${playerId} in room ${this.id}`);

      const decliningPlayer = this.players.find((p) => p.id === playerId);
      if (!decliningPlayer) {
        throw new Error("Player not found");
      }

      this.rematchRequested = false;
      this.rematchPlayerId = null;
      this.rematchPlayersAccepted.clear();

      return {
        success: true,
        message: `${decliningPlayer.username} declined the rematch.`,
        rematchCancelled: true,
      };
    } catch (error) {
      console.error("❌ Error declining rematch:", error);
      throw error;
    }
  }

  // ✅ NEW: Get rematch status
  getRematchStatus() {
    return {
      rematchRequested: this.rematchRequested,
      rematchPlayerId: this.rematchPlayerId,
      playersAccepted: Object.fromEntries(this.rematchPlayersAccepted),
      players: this.players.map((p) => ({
        id: p.id,
        username: p.username,
        accepted: this.rematchPlayersAccepted.get(p.id) || false,
      })),
    };
  }

  // ✅ NEW: Transition game to post-game state
  async transitionToPostGameLobby() {
    console.log(`🏁 Transitioning game ${this.id} to post-game lobby`);

    this.gameState = "post-game";

    // Clear game timers
    if (this.gameTimer) clearTimeout(this.gameTimer);
    if (this.questionTimer) clearTimeout(this.questionTimer);

    // Set a timeout to auto-end post-game lobby after 5 minutes if no rematch
    this.postGameTimeout = setTimeout(
      () => {
        console.log(`⏰ Post-game lobby expired for room ${this.id}`);
        this.gameState = "lobby-expired";
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return {
      message: "Game ended. You can request a rematch!",
      postGameLobbyActive: true,
    };
  }

  // ✅ NEW: Reset game for rematch
  resetForRematch() {
    console.log(`🔄 Resetting game ${this.id} for rematch`);

    this.gameState = "waiting";
    this.createdAt = Date.now();
    this.playerProgress.clear();
    this.playerAnswers.clear();
    this.questions = [];
    this.detailedQuestionHistory = [];
    this.emojiHistory = [];
    this.emojiRateLimit.clear();

    // Reset scores
    this.players.forEach((player) => {
      this.playerProgress.set(player.id, 0);
      this.playerScores.set(player.id, {
        score: 0,
        correctAnswers: 0,
        totalTime: 0,
        streak: 0,
        maxStreak: 0,
        questionsAnswered: 0,
      });
    });

    // Reset rematch tracking
    this.rematchRequested = false;
    this.rematchPlayerId = null;
    this.rematchPlayersAccepted.clear();

    // Clear post-game timeout
    if (this.postGameTimeout) {
      clearTimeout(this.postGameTimeout);
      this.postGameTimeout = null;
    }

    return {
      message: "Game reset for rematch!",
      gameState: this.getGameState(),
    };
  }

  // ✅ UPDATE: submitAnswer with detailed question history tracking
  submitAnswer(playerId, answer, timeSpent) {
    if (this.gameState !== "active") return;

    const idx = this.playerProgress.get(playerId) - 1;
    const q = this.questions[idx];
    if (!q) return;

    const answers = this.playerAnswers.get(`${idx}`);
    if (answers.has(playerId)) return;

    const isCorrect = this.questionService.checkAnswer(q, answer);
    answers.set(playerId, { answer, isCorrect, timeSpent });

    const ps = this.playerScores.get(playerId);
    ps.questionsAnswered++;
    ps.totalTime += timeSpent;

    // ✅ Track question history with player response
    let historyQuestion = this.detailedQuestionHistory.find(
      (qh) => qh.questionId === q.id,
    );

    if (!historyQuestion) {
      historyQuestion = {
        questionId: q.id,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.answer,
        difficulty: q.difficulty || this.difficulty,
        questionType: q.type,
        player1Response: null,
        player2Response: null,
      };
      this.detailedQuestionHistory.push(historyQuestion);
    }

    // Update player response
    if (playerId === this.players[0].id) {
      historyQuestion.player1Response = {
        answer,
        isCorrect,
        timeSpent,
      };
    } else {
      historyQuestion.player2Response = {
        answer,
        isCorrect,
        timeSpent,
      };
    }

    if (isCorrect) {
      ps.correctAnswers++;
      ps.streak++;
      ps.maxStreak = Math.max(ps.maxStreak, ps.streak);

      let points = 1;
      if (ps.streak === 3) points += 2;
      else if (ps.streak === 5) points += 3;
      else if (ps.streak === 7) points += 5;

      ps.score += points;
    } else {
      ps.streak = 0;
    }
    
    // Return result for controller
    return {
      isCorrect,
      score: ps.score,
      streak: ps.streak,
      correctAnswers: ps.correctAnswers,
      history: this.getPlayerHistory(playerId)
    };
  }

  // ✅ NEW: Get player's answer history for UI
  getPlayerHistory(playerId) {
    const history = [];
    const currentIdx = this.playerProgress.get(playerId);
    
    for (let i = 0; i < currentIdx; i++) {
        const answers = this.playerAnswers.get(`${i}`);
        if (answers && answers.has(playerId)) {
            history.push(answers.get(playerId).isCorrect);
        }
    }
    return history.slice(-8); 
  }

  async endGame() {
    if (this.gameState === "completed") {
      console.log("Game already completed, skipping endGame");
      return null;
    }

    this.gameState = "completed";
    clearTimeout(this.gameTimer);
    clearTimeout(this.questionTimer);

    const gameResults = await this.calculateGameResults();
    await this.saveGameToDatabase(gameResults);

    // ✅ Update PvP stats so badge counters are accurate (non-blocking)
    for (const playerResult of gameResults.players) {
      const won = playerResult.won;
      Player.findById(playerResult.playerId).then((p) => {
        if (p) return p.updatePvPStats(this.difficulty, won);
      }).catch(() => {});
    }

    // ✅ Badge system: award PvP completion badges (non-blocking)
    for (const player of this.players) {
      badgeService.onPvPGameCompleted(player.id).then((earned) => {
        if (earned.length > 0 && this.io && player.socketId) {
          this.io.to(player.socketId).emit("badges-earned", { badges: earned });
        }
      }).catch(() => {});
    }

    // ✅ CRITICAL: Mark players as NOT in game
    this.markPlayersAsNotInGame();

    return gameResults;
  }

  async calculateGameResults() {
    const results = this.players.map((player) => {
      const s = this.playerScores.get(player.id);
      return {
        playerId: player.id,
        username: player.username,
        currentRating: player.rating,
        finalScore: s.score,
        totalTime: s.totalTime,
        correctAnswers: s.correctAnswers,
        disconnected: false,
      };
    });

    const winner = results.reduce((a, b) =>
      b.finalScore > a.finalScore ||
      (b.finalScore === a.finalScore && b.totalTime < a.totalTime)
        ? b
        : a,
    );

    const ratingChanges = await this.calculateRatingChanges(results, winner);

    return {
      winner,
      players: results.map((r, i) => ({
        ...r,
        won: r.playerId === winner.playerId,
        newRating: r.currentRating + ratingChanges[i],
        ratingChange: ratingChanges[i],
      })),
      gameStats: {
        duration: Date.now() - this.createdAt,
        endReason: "normal",
      },
    };
  }

  async saveGameToDatabase(gameResults) {
    const [p1, p2] = gameResults.players;

    await savePVPGameToDatabase({
      player1Id: p1.playerId,
      player2Id: p2.playerId,
      player1Score: p1.finalScore,
      player2Score: p2.finalScore,
      gameDuration: gameResults.gameStats.duration,
      disconnectedPlayerId: this.disconnectedPlayerId,
      difficulty: this.difficulty,
      timer: this.players[0].timer,
      questionHistory: this.detailedQuestionHistory,
      emojiHistory: this.emojiHistory,
      ratingChanges: [p1.ratingChange, p2.ratingChange],
      correctAnswers: {
        player1: p1.correctAnswers,
        player2: p2.correctAnswers,
      },
      endReason: gameResults.gameStats.endReason,
    });
  }

  async calculateDisconnectRatingChanges(playerResults, winnerId) {
    const changes = [];
    for (const p of playerResults) {
      const delta = p.playerId === winnerId ? +5 : -5;
      await updatePlayerRatingInDatabase(p.playerId, delta, this.difficulty);
      changes.push(delta);
    }
    return changes;
  }

  async calculateRatingChanges(playerResults, winner) {
    const changes = [];

    for (const p of playerResults) {
      let delta = p.playerId === winner.playerId ? +5 : -5;
      await updatePlayerRatingInDatabase(p.playerId, delta, this.difficulty);
      changes.push(delta);
    }

    return changes;
  }

  // ✅ NEW: Mark all players as not in game
  markPlayersAsNotInGame() {
    console.log(`🔓 Marking players as NOT in game for room ${this.id}`);
    this.players.forEach((player) => {
      player.isInGame = false;
      console.log(
        `   ✅ ${player.username} (${player.id}) - isInGame set to FALSE`,
      );
    });
  }

  getGameState() {
    return {
      gameId: this.id,
      state: this.gameState,
      playerProgress: Object.fromEntries(this.playerProgress),
      playerScores: Object.fromEntries(this.playerScores),
      questionMeter: this.questionMeter,
      timeRemaining: Math.max(
        0,
        this.gameSettings.totalGameTime - (Date.now() - this.createdAt),
      ),
      disconnectedPlayerId: this.disconnectedPlayerId,
    };
  }

  getPlayers() {
    return this.players;
  }

  getOpposingPlayer(playerId) {
    return this.players.find((p) => p.id !== playerId) || null;
  }

  getCurrentQuestion() {
    return this.questions[this.questions.length - 1] || null;
  }

  getPublicData() {
    return {
      id: this.id,
      players: this.players.map((p) => ({
        id: p.id,
        username: p.username,
        rating: p.rating,
      })),
      createdAt: this.createdAt,
      gameState: this.gameState,
      questionMeter: this.questionMeter,
      difficulty: this.difficulty,   // "easy" | "medium" | "hard"
      level: this.diffCode,          // original diff code e.g. "M2"
      symbols: this.symbols,         // e.g. ["sum","difference"]
    };
  }
}

module.exports = { GameRoom };
