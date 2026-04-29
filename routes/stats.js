// routes/stats.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Player = require("../models/Player");
const auth = require("../middleware/auth");

const DIFF_CODES = ["E2", "E4", "M2", "M4", "H2", "H4"];

// ── Time window helper ────────────────────────────────────────────────────────
// Returns the earliest "YYYY-MM" string that belongs to the requested window.
// Monthly entries are compared lexicographically (safe for ISO "YYYY-MM").
const getStartMonth = (timeFilter) => {
  const now = new Date();
  switch (timeFilter) {
    case "1week": {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 7);
    }
    case "1month": {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.toISOString().slice(0, 7);
    }
    case "3months": {
      const d = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return d.toISOString().slice(0, 7);
    }
    case "6months": {
      const d = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      return d.toISOString().slice(0, 7);
    }
    case "1year": {
      const d = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      return d.toISOString().slice(0, 7);
    }
    case "alltime":
    default:
      return "0000-00";
  }
};

// ── Aggregate delta-based monthly entries ─────────────────────────────────────
// Each monthly entry stores per-game increments (deltas) + running bests.
// We SUM the delta counters and MAX the "best" values.
const aggregateMonthlyStats = (monthlyData, mode, diffCode) => {
  const filtered = monthlyData.filter(
    (s) => s.mode === mode && s.diffCode === diffCode,
  );

  const zero = {
    gamesPlayed: 0, wins: 0, losses: 0, draws: 0,
    totalCorrect: 0, totalIncorrect: 0, totalSkipped: 0,
    totalTimeSpent: 0, totalQuestionsAnswered: 0,
    highScore: 0, bestStreak: 0, bestAccuracy: 0, questionsPerSecond: 0,
    bestWin: { username: "", rating: 0 },
    longestStreak: 0, highestRating: 1000,
  };

  if (filtered.length === 0) return zero;

  return filtered.reduce((acc, s) => {
    acc.gamesPlayed            += s.gamesPlayed            || 0;
    acc.wins                   += s.wins                   || 0;
    acc.losses                 += s.losses                 || 0;
    acc.draws                  += s.draws                  || 0;
    acc.totalCorrect           += s.totalCorrect           || 0;
    acc.totalIncorrect         += s.totalIncorrect         || 0;
    acc.totalSkipped           += s.totalSkipped           || 0;
    acc.totalTimeSpent         += s.totalTimeSpent         || 0;
    acc.totalQuestionsAnswered += s.totalQuestionsAnswered || 0;

    acc.highScore          = Math.max(acc.highScore,         s.highScore          || 0);
    acc.bestStreak         = Math.max(acc.bestStreak,        s.bestStreak         || 0);
    acc.bestAccuracy       = Math.max(acc.bestAccuracy,      s.accuracy           || 0);
    acc.questionsPerSecond = Math.max(acc.questionsPerSecond,s.questionsPerSecond || 0);

    if (mode === "pvp") {
      if ((s.bestWin?.rating || 0) > acc.bestWin.rating) {
        acc.bestWin = { username: s.bestWin.username || "", rating: s.bestWin.rating };
      }
      acc.longestStreak = Math.max(acc.longestStreak, s.longestStreak || 0);
      acc.highestRating = Math.max(acc.highestRating, s.highestRating || 1000);
    }

    return acc;
  }, zero);
};

// ── Calculate display stats from aggregated data ──────────────────────────────
const calculateDerivedStats = (agg, mode) => {
  const total = agg.totalCorrect + agg.totalIncorrect + agg.totalSkipped;
  const questionsPerSecond =
    agg.totalTimeSpent > 0
      ? Math.round((agg.totalQuestionsAnswered / (agg.totalTimeSpent / 1000)) * 100) / 100
      : 0;

  const out = {
    gamesPlayed:           agg.gamesPlayed,
    totalCorrect:          agg.totalCorrect,
    totalIncorrect:        agg.totalIncorrect,
    totalSkipped:          agg.totalSkipped,
    totalTimeSpent:        agg.totalTimeSpent,
    totalQuestionsAnswered:agg.totalQuestionsAnswered,
    // client requirements: percentage of total questions
    accuracy:            total > 0 ? Math.round((agg.totalCorrect   / total) * 100) : 0,
    skippedPercentage:   total > 0 ? Math.round((agg.totalSkipped   / total) * 100) : 0,
    incorrectPercentage: total > 0 ? Math.round((agg.totalIncorrect / total) * 100) : 0,
    questionsPerSecond,
  };

  if (mode === "pvp") {
    out.wins   = agg.wins;
    out.losses = agg.losses;
    out.draws  = agg.draws;
    out.winRate  = agg.gamesPlayed > 0 ? Math.round((agg.wins   / agg.gamesPlayed) * 100) : 0;
    out.lossRate = agg.gamesPlayed > 0 ? Math.round((agg.losses / agg.gamesPlayed) * 100) : 0;
    out.drawRate = agg.gamesPlayed > 0 ? Math.round((agg.draws  / agg.gamesPlayed) * 100) : 0;
  }

  if (mode === "practice") {
    out.highScore  = agg.highScore;
    out.bestStreak = agg.bestStreak;
  }

  return out;
};

// ── Read precomputed best from the correct windowed field ─────────────────────
const getPreComputedBest = (player, mode, diffCode, timeFilter) => {
  const fieldMap = {
    "1week":   "weekBest",
    "1month":  "monthBest",
    "3months": "threeMonthsBest",
    "6months": "sixMonthsBest",
    "1year":   "yearBest",
    alltime:   "allTimeBest",
  };

  const bucket = player[fieldMap[timeFilter] || "allTimeBest"]?.[mode]?.[diffCode];

  if (mode === "pvp") {
    return {
      bestWin:               bucket?.bestWin               || { username: "", rating: 0, date: null },
      longestStreak:         bucket?.longestStreak         || { value: 0, date: null },
      highestRating:         bucket?.highestRating         || { value: 1000, date: null },
      bestQuestionsPerSecond:bucket?.bestQuestionsPerSecond|| { value: 0, date: null },
    };
  }

  return {
    bestStreak:            bucket?.bestStreak            || { value: 0, date: null },
    bestAccuracy:          bucket?.bestAccuracy          || { value: 0, date: null },
    bestQuestionsPerSecond:bucket?.bestQuestionsPerSecond|| { value: 0, date: null },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stats/:playerId
//   ?time=alltime|1week|1month|3months|6months|1year   (default: alltime)
//   &mode=pvp|practice|all                             (default: all)
//   &diffCode=E2|E4|M2|M4|H2|H4                       (default: all codes)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:playerId", auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { time = "alltime", mode, diffCode } = req.query;

    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({ success: false, message: "Invalid player ID format" });
    }

    const validTimeFilters = ["1week", "1month", "3months", "6months", "1year", "alltime"];
    const validModes       = ["practice", "pvp", "all"];

    const normalizedTime     = validTimeFilters.includes(time)   ? time   : "alltime";
    const normalizedMode     = validModes.includes(mode)         ? mode   : "all";
    const normalizedDiffCode = DIFF_CODES.includes(diffCode)     ? diffCode : null;

    const startMonth   = getStartMonth(normalizedTime);
    const currentMonth = new Date().toISOString().slice(0, 7);

    const player = await Player.findById(playerId).select(
      "username profileImage pr stats monthlyStats " +
      "allTimeBest weekBest monthBest threeMonthsBest sixMonthsBest yearBest",
    );

    if (!player) {
      return res.status(404).json({ success: false, message: "Player not found" });
    }

    // Monthly entries in the requested window
    const windowedMonthly = player.monthlyStats.filter(
      (s) => s.month >= startMonth && s.month <= currentMonth,
    );

    const codesRequested = normalizedDiffCode ? [normalizedDiffCode] : DIFF_CODES;
    const modesToProcess  = normalizedMode === "all" ? ["pvp", "practice"] : [normalizedMode];

    const response = {
      playerId:     player._id,
      username:     player.username,
      profileImage: player.profileImage,
      timeFilter:   normalizedTime,
      mode:         normalizedMode,
      ratings:      player.pr || {},
      current:      {},
      best:         {},
    };

    for (const m of modesToProcess) {
      response.current[m] = {};
      response.best[m]    = {};

      for (const code of codesRequested) {
        const agg = aggregateMonthlyStats(windowedMonthly, m, code);
        response.current[m][code] = calculateDerivedStats(agg, m);
        response.best[m][code]    = getPreComputedBest(player, m, code, normalizedTime);
      }

      // When no specific diffCode is requested, also provide an "all" rollup
      if (!normalizedDiffCode) {
        const rollup = DIFF_CODES.reduce(
          (acc, code) => {
            const c = response.current[m][code];
            acc.gamesPlayed            += c.gamesPlayed            || 0;
            acc.totalCorrect           += c.totalCorrect           || 0;
            acc.totalIncorrect         += c.totalIncorrect         || 0;
            acc.totalSkipped           += c.totalSkipped           || 0;
            acc.totalTimeSpent         += c.totalTimeSpent         || 0;
            acc.totalQuestionsAnswered += c.totalQuestionsAnswered || 0;
            if (m === "pvp") {
              acc.wins   += c.wins   || 0;
              acc.losses += c.losses || 0;
              acc.draws  += c.draws  || 0;
            }
            if (m === "practice") {
              acc.highScore  = Math.max(acc.highScore  || 0, c.highScore  || 0);
              acc.bestStreak = Math.max(acc.bestStreak || 0, c.bestStreak || 0);
            }
            return acc;
          },
          {
            gamesPlayed: 0, totalCorrect: 0, totalIncorrect: 0, totalSkipped: 0,
            totalTimeSpent: 0, totalQuestionsAnswered: 0,
            wins: 0, losses: 0, draws: 0, highScore: 0, bestStreak: 0,
          },
        );
        response.current[m]["all"] = calculateDerivedStats(rollup, m);
      }
    }

    return res.json(response);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching stats",
      error: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    });
  }
});

module.exports = router;
