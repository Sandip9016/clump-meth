// controller/historyController.js
const PVPGame = require("../models/PVPGame");
const ComputerGame = require("../models/ComputerGame");
const PracticeGame = require("../models/PracticeGame");
const Player = require("../models/Player");

// Computer level display map
const COMPUTER_LEVEL_MAP = {
  1: { name: "Beginner", label: "L1", tagline: "Everyone starts somewhere" },
  2: { name: "Amateur", label: "L2", tagline: "Rising through the ranks" },
  3: { name: "Skilled", label: "L3", tagline: "Bring your A-game" },
  4: { name: "Expert", label: "L4", tagline: "Think fast. Very fast" },
  5: { name: "Pro", label: "L5", tagline: "Beat me if you can" },
};

/**
 * Parse & validate ?month=YYYY-MM query param.
 * Returns { start, end } Date objects, or null if no month given.
 * Throws a descriptive string if format is invalid.
 */
function parseMonthFilter(month) {
  if (!month) return null;

  // Must match YYYY-MM exactly
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Invalid month format. Use YYYY-MM (e.g. 2026-04)");
  }

  const [yr, mo] = month.split("-").map(Number);
  return {
    start: new Date(yr, mo - 1, 1),
    end: new Date(yr, mo, 1),
  };
}

/**
 * Format a PVP game for the history table row
 */
function formatPVPRow(game, myId) {
  // Handle deleted players (null references)
  if (!game.player1 || !game.player2) {
    return {
      gameId: game._id,
      gameMode: game.isFriendMatch ? "friend" : "pvp",
      gameType: game.diffCode,
      opponent: null,
      myScore: game.player1 ? game.scorePlayer1 : game.scorePlayer2,
      oppScore: game.player1 ? game.scorePlayer2 : game.scorePlayer1,
      outcome: "unknown",
      myRatingAtMatch: game.player1
        ? game.ratingBeforePlayer1
        : game.ratingBeforePlayer2,
      ratingChange: game.player1
        ? game.ratingChangePlayer1
        : game.ratingChangePlayer2,
      playedAt: game.playedAt,
      analysisAvailable: false,
    };
  }

  const isPlayer1 = game.player1._id
    ? game.player1._id.toString() === myId
    : game.player1.toString() === myId;

  const opponent = isPlayer1 ? game.player2 : game.player1;
  const myScore = isPlayer1 ? game.scorePlayer1 : game.scorePlayer2;
  const oppScore = isPlayer1 ? game.scorePlayer2 : game.scorePlayer1;
  const ratingChange = isPlayer1
    ? game.ratingChangePlayer1
    : game.ratingChangePlayer2;
  const ratingBefore = isPlayer1
    ? game.ratingBeforePlayer1
    : game.ratingBeforePlayer2;
  const oppRatingBefore = isPlayer1
    ? game.ratingBeforePlayer2
    : game.ratingBeforePlayer1;

  let outcome = "draw";
  if (game.result === "Draw") outcome = "draw";
  else if (
    (isPlayer1 && game.result === "Player1Won") ||
    (!isPlayer1 && game.result === "Player2Won")
  ) {
    outcome = "win";
  } else {
    outcome = "loss";
  }

  return {
    gameId: game._id,
    gameMode: game.isFriendMatch ? "friend" : "pvp",
    gameType: game.diffCode, // E2 / E4 / M2 / M4 / H2 / H4
    opponent: opponent
      ? {
          id: opponent._id,
          username: opponent.username,
          profileImage: opponent.profileImage || null,
          ratingAtMatch: oppRatingBefore || null,
        }
      : null,
    myScore,
    oppScore,
    outcome,
    myRatingAtMatch: ratingBefore || null,
    ratingChange,
    playedAt: game.playedAt,
    analysisAvailable: false, // coming soon
  };
}

/**
 * Format a Computer game for the history table row
 */
function formatComputerRow(game) {
  const levelInfo =
    COMPUTER_LEVEL_MAP[game.computerLevel] || COMPUTER_LEVEL_MAP[1];

  let outcome = "draw";
  if (game.result === "PlayerWon") outcome = "win";
  else if (game.result === "ComputerWon") outcome = "loss";

  return {
    gameId: game._id,
    gameMode: "computer",
    gameType: game.diffCode,
    computer: {
      level: game.computerLevel,
      label: levelInfo.label,
      name: levelInfo.name,
      tagline: levelInfo.tagline,
    },
    myScore: game.playerScore,
    oppScore: game.computerScore,
    outcome,
    ratingChange: game.playerRatingChange,
    ratingBefore: game.playerRatingBefore,
    ratingAfter: game.playerRatingAfter,
    playedAt: game.playedAt,
    analysisAvailable: false, // coming soon
  };
}

/**
 * Format a Practice game for the history table row
 */
function formatPracticeRow(game) {
  // Practice has no opponent and no win/loss — show score as outcome indicator
  return {
    gameId: game._id,
    gameMode: "practice",
    gameType: game.diffCode,
    correctCount: game.correctCount,
    incorrectCount: game.incorrectCount,
    skippedCount: game.skippedCount,
    totalQuestions: game.totalQuestions,
    pointsEarned: game.pointsEarned,
    ratingChange: game.ratingChange,
    ratingBefore: game.ratingBefore,
    ratingAfter: game.ratingAfter,
    outcome: game.pointsEarned >= 0 ? "win" : "loss", // positive points = green
    playedAt: game.playedAt,
    analysisAvailable: false, // coming soon
  };
}

/* ─────────────────────────────────────────────────────────────
   GET /api/history/feed
   Unified mixed feed of all game types (sorted newest first)
   Query: limit (default 20), skip (default 0), month (YYYY-MM optional)
───────────────────────────────────────────────────────────── */
exports.getHistoryFeed = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    let dateFilter = {};
    try {
      const range = parseMonthFilter(req.query.month);
      if (range)
        dateFilter = { playedAt: { $gte: range.start, $lt: range.end } };
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    // Fetch from all 3 collections in parallel
    const [pvpGames, computerGames, practiceGames] = await Promise.all([
      PVPGame.find({
        $or: [{ player1: req.user._id }, { player2: req.user._id }],
        ...dateFilter,
      })
        .populate("player1", "username profileImage")
        .populate("player2", "username profileImage")
        .sort({ playedAt: -1 })
        .lean(),

      ComputerGame.find({ player: req.user._id, ...dateFilter })
        .sort({ playedAt: -1 })
        .lean(),

      PracticeGame.find({ player: req.user._id, ...dateFilter })
        .sort({ playedAt: -1 })
        .lean(),
    ]);

    // Format each
    const pvpRows = pvpGames.map((g) => formatPVPRow(g, myId));
    const computerRows = computerGames.map(formatComputerRow);
    const practiceRows = practiceGames.map(formatPracticeRow);

    // Merge & sort by playedAt desc
    const allRows = [...pvpRows, ...computerRows, ...practiceRows].sort(
      (a, b) => new Date(b.playedAt) - new Date(a.playedAt),
    );

    const total = allRows.length;
    const paginated = allRows.slice(skip, skip + limit);

    return res.json({
      success: true,
      games: paginated,
      total,
      limit,
      skip,
    });
  } catch (err) {
    console.error("Error fetching history feed:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/history/pvp
   PvP (+ friend matches) history only
   Query: limit, skip, month
───────────────────────────────────────────────────────────── */
exports.getPVPHistory = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    let dateFilter = {};
    try {
      const range = parseMonthFilter(req.query.month);
      if (range)
        dateFilter = { playedAt: { $gte: range.start, $lt: range.end } };
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    const total = await PVPGame.countDocuments({
      $or: [{ player1: req.user._id }, { player2: req.user._id }],
      ...dateFilter,
    });

    const games = await PVPGame.find({
      $or: [{ player1: req.user._id }, { player2: req.user._id }],
      ...dateFilter,
    })
      .populate("player1", "username profileImage")
      .populate("player2", "username profileImage")
      .sort({ playedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      games: games.map((g) => formatPVPRow(g, myId)),
      total,
      limit,
      skip,
    });
  } catch (err) {
    console.error("Error fetching PVP history:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/history/computer
   Computer mode history only
   Query: limit, skip, month, level (1-5)
───────────────────────────────────────────────────────────── */
exports.getComputerHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    const level = req.query.level ? parseInt(req.query.level) : null;

    // Validate level
    if (level !== null && (isNaN(level) || level < 1 || level > 5)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid level. Use 1–5." });
    }

    let filter = { player: req.user._id };
    if (level) filter.computerLevel = level;

    try {
      const range = parseMonthFilter(req.query.month);
      if (range) filter.playedAt = { $gte: range.start, $lt: range.end };
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    const total = await ComputerGame.countDocuments(filter);
    const games = await ComputerGame.find(filter)
      .sort({ playedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      games: games.map(formatComputerRow),
      total,
      limit,
      skip,
    });
  } catch (err) {
    console.error("Error fetching computer history:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/history/practice
   Practice mode history only
   Query: limit, skip, month
───────────────────────────────────────────────────────────── */
exports.getPracticeHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    let filter = { player: req.user._id };
    try {
      const range = parseMonthFilter(req.query.month);
      if (range) filter.playedAt = { $gte: range.start, $lt: range.end };
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    const total = await PracticeGame.countDocuments(filter);
    const games = await PracticeGame.find(filter)
      .sort({ playedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      games: games.map(formatPracticeRow),
      total,
      limit,
      skip,
    });
  } catch (err) {
    console.error("Error fetching practice history:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/history/:gameMode/:gameId
   Single game detail (completion screen data)
   gameMode: pvp | computer | practice
───────────────────────────────────────────────────────────── */
exports.getGameDetail = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const { gameMode, gameId } = req.params;

    // Validate gameId is a valid MongoDB ObjectId
    if (!/^[a-f\d]{24}$/i.test(gameId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid gameId format." });
    }
    let formatted = null;

    if (gameMode === "pvp" || gameMode === "friend") {
      game = await PVPGame.findById(gameId)
        .populate("player1", "username profileImage")
        .populate("player2", "username profileImage")
        .lean();

      if (!game) return res.status(404).json({ message: "Game not found" });

      // Handle deleted players
      if (!game.player1 || !game.player2) {
        return res
          .status(410)
          .json({ message: "Game data incomplete - player accounts deleted" });
      }

      const isPlayer1 = game.player1._id.toString() === myId;
      if (!isPlayer1 && game.player2._id.toString() !== myId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      formatted = {
        ...formatPVPRow(game, myId),
        questionHistory: game.questionHistory || [],
        emojiHistory: game.emojiHistory || [],
        gameDuration: game.gameDuration,
        analysis: {
          status: "coming_soon",
          message: "Analysis feature coming soon!",
        },
      };
    } else if (gameMode === "computer") {
      game = await ComputerGame.findById(gameId).lean();

      if (!game) return res.status(404).json({ message: "Game not found" });
      if (game.player.toString() !== myId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      formatted = {
        ...formatComputerRow(game),
        questionHistory: game.questionHistory || [],
        gameDuration: game.gameDuration,
        analysis: {
          status: "coming_soon",
          message: "Analysis feature coming soon!",
        },
      };
    } else if (gameMode === "practice") {
      game = await PracticeGame.findById(gameId).lean();

      if (!game) return res.status(404).json({ message: "Game not found" });
      if (game.player.toString() !== myId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      formatted = {
        ...formatPracticeRow(game),
        questionHistory: game.questionHistory || [],
        gameDuration: game.gameDuration,
        analysis: {
          status: "coming_soon",
          message: "Analysis feature coming soon!",
        },
      };
    } else {
      return res
        .status(400)
        .json({ message: "Invalid gameMode. Use: pvp | computer | practice" });
    }

    return res.json({ success: true, game: formatted });
  } catch (err) {
    console.error("Error fetching game detail:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
