const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Player = require("../models/Player");
const auth = require("../middleware/auth");

// Helper function to calculate date ranges for time filtering
const getTimeRange = (timeFilter) => {
  const now = new Date();
  const ranges = {
    "1week": {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      end: now,
    },
    "1month": {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now,
    },
    "3months": {
      start: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      end: now,
    },
    "6months": {
      start: new Date(now.getFullYear(), now.getMonth() - 6, 1),
      end: now,
    },
    "1year": {
      start: new Date(now.getFullYear() - 1, 0, 1),
      end: now,
    },
    alltime: {
      start: new Date(0),
      end: now,
    },
  };

  return ranges[timeFilter] || ranges["alltime"];
};

// Helper to get pre-computed best achievements for time period
const getPreComputedBest = (player, mode, diffCode, timeFilter) => {
  const timeBestMap = {
    "1week": player.weekBest,
    "1month": player.monthBest,
    "3months": player.threeMonthsBest,
    "6months": player.sixMonthsBest,
    "1year": player.yearBest,
    alltime: player.allTimeBest,
  };

  const bestData =
    timeBestMap[timeFilter] &&
    timeBestMap[timeFilter][mode] &&
    timeBestMap[timeFilter][mode][diffCode];

  if (!bestData) {
    return {
      bestStreak: { value: 0, date: null },
      bestAccuracy: { value: 0, date: null },
      bestQuestionsPerSecond: { value: 0, date: null },
      bestWin: { username: "", rating: 0, date: null },
      longestStreak: { value: 0, date: null },
      highestRating: { value: 1000, date: null },
    };
  }

  const result = {
    bestStreak: bestData.bestStreak || { value: 0, date: null },
    bestAccuracy: bestData.bestAccuracy || { value: 0, date: null },
    bestQuestionsPerSecond: bestData.bestQuestionsPerSecond || {
      value: 0,
      date: null,
    },
  };

  if (mode === "pvp") {
    result.bestWin = bestData.bestWin || {
      username: "",
      rating: 0,
      date: null,
    };
    result.longestStreak = bestData.longestStreak || { value: 0, date: null };
    result.highestRating = bestData.highestRating || {
      value: 1000,
      date: null,
    };
  }

  return result;
};

// Helper to find best achievements in time period
const findBestInTimePeriod = (
  monthlyData,
  mode,
  diffCode,
  timeFilter,
  allTimeBestData,
) => {
  // For alltime filter, use pre-computed allTimeBest data from database
  if (timeFilter === "alltime") {
    const allTimeBest =
      allTimeBestData &&
      allTimeBestData[mode] &&
      allTimeBestData[mode][diffCode];

    if (allTimeBest) {
      const result = {
        bestStreak: allTimeBest.bestStreak || { value: 0, date: null },
        bestAccuracy: allTimeBest.bestAccuracy || { value: 0, date: null },
        bestQuestionsPerSecond: allTimeBest.bestQuestionsPerSecond || {
          value: 0,
          date: null,
        },
      };

      if (mode === "pvp") {
        result.bestWin = allTimeBest.bestWin || {
          username: "",
          rating: 0,
          date: null,
        };
        result.longestStreak = allTimeBest.longestStreak || {
          value: 0,
          date: null,
        };
        result.highestRating = allTimeBest.highestRating || {
          value: 1000,
          date: null,
        };
      }

      return result;
    }
  }

  // For other time filters, calculate from monthly data
  const filtered = monthlyData.filter(
    (stat) => stat.mode === mode && (!diffCode || stat.diffCode === diffCode),
  );

  if (filtered.length === 0) {
    return {
      bestStreak: { value: 0, date: null },
      bestAccuracy: { value: 0, date: null },
      bestQuestionsPerSecond: { value: 0, date: null },
      bestWin: { username: "", rating: 0, date: null },
      longestStreak: { value: 0, date: null },
      highestRating: { value: 1000, date: null },
    };
  }

  const bestStreak = filtered.reduce(
    (best, stat) =>
      stat.bestStreak > best.value
        ? { value: stat.bestStreak, date: stat.month }
        : best,
    { value: 0, date: null },
  );

  const bestAccuracy = filtered.reduce(
    (best, stat) =>
      stat.accuracy > best.value
        ? { value: stat.accuracy, date: stat.month }
        : best,
    { value: 0, date: null },
  );

  const bestQuestionsPerSecond = filtered.reduce(
    (best, stat) =>
      stat.questionsPerSecond > best.value
        ? { value: stat.questionsPerSecond, date: stat.month }
        : best,
    { value: 0, date: null },
  );

  const result = {
    bestStreak,
    bestAccuracy,
    bestQuestionsPerSecond,
  };

  if (mode === "pvp") {
    const bestWin = filtered.reduce(
      (best, stat) =>
        stat.bestWin.rating > best.rating
          ? {
              username: stat.bestWin.username,
              rating: stat.bestWin.rating,
              date: stat.month,
            }
          : best,
      { username: "", rating: 0, date: null },
    );

    const longestStreak = filtered.reduce(
      (best, stat) =>
        stat.longestStreak > best.value
          ? { value: stat.longestStreak, date: stat.month }
          : best,
      { value: 0, date: null },
    );

    const highestRating = filtered.reduce(
      (best, stat) =>
        stat.highestRating > best.value
          ? { value: stat.highestRating, date: stat.month }
          : best,
      { value: 1000, date: null },
    );

    result.bestWin = bestWin;
    result.longestStreak = longestStreak;
    result.highestRating = highestRating;
  }

  return result;
};

// Helper to aggregate time-filtered stats
const aggregateTimeStats = (monthlyData, mode, diffCode) => {
  const filtered = monthlyData.filter(
    (stat) => stat.mode === mode && (!diffCode || stat.diffCode === diffCode),
  );

  if (filtered.length === 0) {
    return {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      highScore: 0,
      totalScore: 0,
      averageScore: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      totalSkipped: 0,
      totalTimeSpent: 0,
      totalQuestionsAnswered: 0,
    };
  }

  const aggregated = filtered.reduce(
    (acc, stat) => {
      acc.gamesPlayed += stat.gamesPlayed;
      acc.wins += stat.wins;
      acc.losses += stat.losses;
      acc.draws += stat.draws;
      acc.highScore = Math.max(acc.highScore, stat.highScore);
      acc.totalScore += stat.totalScore;
      acc.bestStreak = Math.max(acc.bestStreak, stat.bestStreak);
      acc.totalCorrect += stat.totalCorrect;
      acc.totalIncorrect += stat.totalIncorrect;
      acc.totalSkipped += stat.totalSkipped;
      acc.totalTimeSpent += stat.totalTimeSpent;
      acc.totalQuestionsAnswered += stat.totalQuestionsAnswered;
      return acc;
    },
    {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      highScore: 0,
      totalScore: 0,
      averageScore: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      totalSkipped: 0,
      totalTimeSpent: 0,
      totalQuestionsAnswered: 0,
    },
  );

  aggregated.averageScore =
    aggregated.gamesPlayed > 0
      ? Math.round(aggregated.totalScore / aggregated.gamesPlayed)
      : 0;

  return aggregated;
};

// Helper to calculate derived stats
const calculateDerivedStats = (stats) => {
  const total = stats.totalCorrect + stats.totalIncorrect + stats.totalSkipped;
  const questionsPerSecond =
    stats.totalTimeSpent > 0
      ? Math.round(
          (stats.totalQuestionsAnswered / (stats.totalTimeSpent / 1000)) * 100,
        ) / 100
      : 0;

  return {
    // Basic stats
    gamesPlayed: stats.gamesPlayed || 0,
    wins: stats.wins || 0,
    losses: stats.losses || 0,
    draws: stats.draws || 0,
    highScore: stats.highScore || 0,
    totalScore: stats.totalScore || 0,
    averageScore: stats.averageScore || 0,
    currentStreak: stats.currentStreak || 0,
    bestStreak: stats.bestStreak || 0,

    // Question stats
    totalCorrect: stats.totalCorrect || 0,
    totalIncorrect: stats.totalIncorrect || 0,
    totalSkipped: stats.totalSkipped || 0,
    totalTimeSpent: stats.totalTimeSpent || 0,
    totalQuestionsAnswered: stats.totalQuestionsAnswered || 0,

    // Calculated percentages
    winRate:
      stats.gamesPlayed > 0
        ? Math.round((stats.wins / stats.gamesPlayed) * 100)
        : 0,
    lossRate:
      stats.gamesPlayed > 0
        ? Math.round((stats.losses / stats.gamesPlayed) * 100)
        : 0,
    drawRate:
      stats.gamesPlayed > 0
        ? Math.round((stats.draws / stats.gamesPlayed) * 100)
        : 0,
    accuracy: total > 0 ? Math.round((stats.totalCorrect / total) * 100) : 0,
    questionsPerSecond: questionsPerSecond,
    skippedPercentage:
      total > 0 ? Math.round((stats.totalSkipped / total) * 100) : 0,
    incorrectPercentage:
      total > 0 ? Math.round((stats.totalIncorrect / total) * 100) : 0,
  };
};

// ✅ UNIFIED STATS API - Single endpoint for all stats
router.get("/:playerId", auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { time = "alltime", mode, diffCode } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid player ID format",
        error: "Player ID must be a valid 24-character hex string",
      });
    }

    // Validate and normalize parameters
    const validTimeFilters = [
      "1week",
      "1month",
      "3months",
      "6months",
      "1year",
      "alltime",
    ];
    const validModes = ["practice", "pvp", "all"];
    const validDiffCodes = ["E2", "E4", "M2", "M4", "H2", "H4"];

    const normalizedTime = validTimeFilters.includes(time) ? time : "alltime";
    const normalizedMode = validModes.includes(mode) ? mode : "all";
    const normalizedDiffCode = validDiffCodes.includes(diffCode)
      ? diffCode
      : null;

    const timeRange = getTimeRange(normalizedTime);

    // Find player with all stats
    const player = await Player.findById(playerId).select(
      "stats allTimeBest weekBest monthBest threeMonthsBest sixMonthsBest yearBest monthlyStats pr username profileImage",
    );
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
        error: `No player found with ID: ${playerId}`,
      });
    }

    // Filter monthly stats by time range
    const timeFilteredStats = player.monthlyStats.filter((stat) => {
      // stat.month is in format "2026-04", so we need to parse it correctly
      if (!stat.month || typeof stat.month !== "string") return false;

      const parts = stat.month.split("-");
      if (parts.length !== 2) return false;

      const [year, month] = parts.map(Number);
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return false;

      const statDate = new Date(year, month - 1, 1); // month-1 because months are 0-indexed
      if (isNaN(statDate.getTime())) return false;

      return statDate >= timeRange.start && statDate <= timeRange.end;
    });

    // Build unified response
    const response = {
      playerId: player._id,
      username: player.username,
      profileImage: player.profileImage,
      timeFilter: normalizedTime,
      current: {
        practice: {},
        pvp: {},
      },
      best: {
        practice: {},
        pvp: {},
      },
      ratings: player.pr || {},
    };

    // Process practice stats
    if (
      !normalizedMode ||
      normalizedMode === "all" ||
      normalizedMode === "practice"
    ) {
      const practiceDiffCodes = normalizedDiffCode
        ? [normalizedDiffCode]
        : ["E2", "E4", "M2", "M4", "H2", "H4"];

      practiceDiffCodes.forEach((code) => {
        if (player.stats.practice && player.stats.practice[code]) {
          // Current aggregated stats - fallback to current stats if no monthly data
          let currentStats;
          if (timeFilteredStats.length === 0) {
            // Use current stats as fallback when no monthly data exists
            currentStats = {
              ...player.stats.practice[code],
              // Add missing fields for consistency
              wins: 0,
              losses: 0,
              draws: 0,
              totalCorrect: 0,
              totalIncorrect: 0,
              totalSkipped: 0,
              totalTimeSpent: 0,
              totalQuestionsAnswered: 0,
            };
          } else {
            currentStats = aggregateTimeStats(
              timeFilteredStats,
              "practice",
              code,
            );
          }
          response.current.practice[code] = calculateDerivedStats(currentStats);

          // Best achievements in time period
          response.best.practice[code] = getPreComputedBest(
            player,
            "practice",
            code,
            normalizedTime,
          );
        }
      });
    }

    // Process PVP stats
    if (
      !normalizedMode ||
      normalizedMode === "all" ||
      normalizedMode === "pvp"
    ) {
      const pvpDiffCodes = normalizedDiffCode
        ? [normalizedDiffCode]
        : ["E2", "E4", "M2", "M4", "H2", "H4"];

      pvpDiffCodes.forEach((code) => {
        if (player.stats.pvp && player.stats.pvp[code]) {
          // Current aggregated stats - fallback to current stats if no monthly data
          let currentStats;
          if (timeFilteredStats.length === 0) {
            // Use current stats as fallback when no monthly data exists
            currentStats = {
              ...player.stats.pvp[code],
              // Add missing fields for consistency
              highScore: 0,
              totalScore: 0,
              averageScore: 0,
              totalCorrect: 0,
              totalIncorrect: 0,
              totalSkipped: 0,
              totalTimeSpent: 0,
              totalQuestionsAnswered: 0,
            };
          } else {
            currentStats = aggregateTimeStats(timeFilteredStats, "pvp", code);
          }
          response.current.pvp[code] = calculateDerivedStats(currentStats);

          // Best achievements in time period
          response.best.pvp[code] = getPreComputedBest(
            player,
            "pvp",
            code,
            normalizedTime,
          );
        }
      });
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching stats",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;
