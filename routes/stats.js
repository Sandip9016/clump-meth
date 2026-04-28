const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Player = require("../models/Player");
const auth = require("../middleware/auth");

// ✅ Get All-Time Best Stats
router.get("/all-time/:playerId", auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { mode, diffCode } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid player ID format",
        error: "Player ID must be a valid 24-character hex string",
      });
    }

    // Find player
    const player = await Player.findById(playerId).select(
      "allTimeBest username profileImage",
    );
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
        error: `No player found with ID: ${playerId}`,
      });
    }

    let result = {
      playerId: player._id,
      username: player.username,
      profileImage: player.profileImage,
      practice: {},
      pvp: {},
    };

    // Helper to format all-time best stats
    const formatAllTimeBest = (stats, type) => {
      const formatted = {};
      Object.keys(stats).forEach((diffCode) => {
        if (!diffCode || (mode && mode !== "all" && !stats[diffCode])) return;

        const stat = stats[diffCode];
        formatted[diffCode] = {
          ...stat,
          // For PVP
          ...(type === "pvp" && {
            bestWin:
              stat.bestWin.rating > 0
                ? stat.bestWin
                : { username: "N/A", rating: 0, date: stat.bestWin.date },
            longestStreak:
              stat.longestStreak.value > 0
                ? stat.longestStreak
                : { value: 0, date: stat.longestStreak.date },
            highestRating:
              stat.highestRating.value >= 1000
                ? stat.highestRating
                : { value: 1000, date: stat.highestRating.date },
            bestQuestionsPerSecond:
              stat.bestQuestionsPerSecond.value > 0
                ? stat.bestQuestionsPerSecond
                : { value: 0, date: stat.bestQuestionsPerSecond.date },
          }),
          // For Practice
          ...(type === "practice" && {
            bestStreak:
              stat.bestStreak.value > 0
                ? stat.bestStreak
                : { value: 0, date: stat.bestStreak.date },
            bestAccuracy:
              stat.bestAccuracy.value > 0
                ? stat.bestAccuracy
                : { value: 0, date: stat.bestAccuracy.date },
            bestQuestionsPerSecond:
              stat.bestQuestionsPerSecond.value > 0
                ? stat.bestQuestionsPerSecond
                : { value: 0, date: stat.bestQuestionsPerSecond.date },
          }),
        };
      });
      return formatted;
    };

    // Filter by mode if specified
    if (mode && mode !== "all") {
      if (mode === "practice") {
        result.practice = diffCode
          ? {
              [diffCode]: formatAllTimeBest(
                { [diffCode]: player.allTimeBest.practice[diffCode] },
                "practice",
              )[diffCode],
            }
          : formatAllTimeBest(player.allTimeBest.practice, "practice");
      } else if (mode === "pvp") {
        result.pvp = diffCode
          ? {
              [diffCode]: formatAllTimeBest(
                { [diffCode]: player.allTimeBest.pvp[diffCode] },
                "pvp",
              )[diffCode],
            }
          : formatAllTimeBest(player.allTimeBest.pvp, "pvp");
      }
    } else {
      result = {
        playerId: player._id,
        username: player.username,
        practice: formatAllTimeBest(player.allTimeBest.practice, "practice"),
        pvp: formatAllTimeBest(player.allTimeBest.pvp, "pvp"),
      };
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching all-time stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching all-time stats",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// ✅ Get Monthly Stats
router.get("/monthly/:playerId", auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { month, mode, diffCode } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid player ID format",
        error: "Player ID must be a valid 24-character hex string",
      });
    }

    // Find player
    const player = await Player.findById(playerId).select(
      "monthlyStats username profileImage",
    );
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
        error: `No player found with ID: ${playerId}`,
      });
    }

    let filteredStats = player.monthlyStats;

    // Filter by month if specified
    if (month) {
      filteredStats = filteredStats.filter((stat) => stat.month === month);
    }

    // Filter by mode if specified
    if (mode && mode !== "all") {
      filteredStats = filteredStats.filter((stat) => stat.mode === mode);
    }

    // Filter by diffCode if specified
    if (diffCode) {
      filteredStats = filteredStats.filter(
        (stat) => stat.diffCode === diffCode,
      );
    }

    // Calculate derived stats for monthly data
    const calculateMonthlyDerivedStats = (stat) => {
      const total = stat.totalCorrect + stat.totalIncorrect + stat.totalSkipped;
      const questionsPerSecond =
        stat.totalTimeSpent > 0
          ? Math.round(
              (stat.totalQuestionsAnswered / (stat.totalTimeSpent / 1000)) *
                100,
            ) / 100
          : 0;

      return {
        ...stat,
        // Calculated percentages
        winRate:
          stat.gamesPlayed > 0
            ? Math.round((stat.wins / stat.gamesPlayed) * 100)
            : 0,
        lossRate:
          stat.gamesPlayed > 0
            ? Math.round((stat.losses / stat.gamesPlayed) * 100)
            : 0,
        drawRate:
          stat.gamesPlayed > 0
            ? Math.round((stat.draws / stat.gamesPlayed) * 100)
            : 0,
        accuracy: total > 0 ? Math.round((stat.totalCorrect / total) * 100) : 0,
        questionsPerSecond: questionsPerSecond,
        skippedPercentage:
          total > 0 ? Math.round((stat.totalSkipped / total) * 100) : 0,
        incorrectPercentage:
          total > 0 ? Math.round((stat.totalIncorrect / total) * 100) : 0,
      };
    };

    // Group by month for better organization
    const groupedStats = {};
    filteredStats.forEach((stat) => {
      const key = `${stat.month}-${stat.mode}-${stat.diffCode}`;
      groupedStats[key] = calculateMonthlyDerivedStats(stat);
    });

    res.json({
      playerId: player._id,
      username: player.username,
      profileImage: player.profileImage,
      stats: month
        ? groupedStats[`${month}-${mode || "practice"}-${diffCode || "E2"}`] ||
          {}
        : groupedStats,
    });
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching monthly stats",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// ✅ Get Current Stats (live data)
router.get("/current/:playerId", auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { mode, diffCode } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid player ID format",
        error: "Player ID must be a valid 24-character hex string",
      });
    }

    // Find player
    const player = await Player.findById(playerId).select(
      "stats pr username profileImage",
    );
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
        error: `No player found with ID: ${playerId}`,
      });
    }

    let result = {
      playerId: player._id,
      username: player.username,
      profileImage: player.profileImage,
      practice: {},
      pvp: {},
    };

    // Calculate derived stats
    const calculateDerivedStats = (stats) => {
      const total =
        stats.totalCorrect + stats.totalIncorrect + stats.totalSkipped;
      const questionsPerSecond =
        stats.totalTimeSpent > 0
          ? Math.round(
              (stats.totalQuestionsAnswered / (stats.totalTimeSpent / 1000)) *
                100,
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
        accuracy:
          total > 0 ? Math.round((stats.totalCorrect / total) * 100) : 0,
        questionsPerSecond: questionsPerSecond,
        skippedPercentage:
          total > 0 ? Math.round((stats.totalSkipped / total) * 100) : 0,
        incorrectPercentage:
          total > 0 ? Math.round((stats.totalIncorrect / total) * 100) : 0,
      };
    };

    // Filter and include stats
    if (mode && mode !== "all") {
      if (mode === "practice") {
        result.practice = diffCode
          ? {
              [diffCode]: calculateDerivedStats(
                player.stats.practice[diffCode],
              ),
            }
          : Object.keys(player.stats.practice).reduce((acc, key) => {
              acc[key] = calculateDerivedStats(player.stats.practice[key]);
              return acc;
            }, {});
      } else if (mode === "pvp") {
        result.pvp = diffCode
          ? { [diffCode]: calculateDerivedStats(player.stats.pvp[diffCode]) }
          : Object.keys(player.stats.pvp).reduce((acc, key) => {
              acc[key] = calculateDerivedStats(player.stats.pvp[key]);
              return acc;
            }, {});
      }
    } else {
      result.practice = Object.keys(player.stats.practice).reduce(
        (acc, key) => {
          acc[key] = calculateDerivedStats(player.stats.practice[key]);
          return acc;
        },
        {},
      );

      result.pvp = Object.keys(player.stats.pvp).reduce((acc, key) => {
        acc[key] = calculateDerivedStats(player.stats.pvp[key]);
        return acc;
      }, {});
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching current stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching current stats",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// ✅ Get Stats Summary (combined view)
router.get("/summary/:playerId", auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { month, mode, diffCode } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid player ID format",
        error: "Player ID must be a valid 24-character hex string",
      });
    }

    // Get current stats
    const player = await Player.findById(playerId).select(
      "stats allTimeBest monthlyStats pr username profileImage",
    );
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
        error: `No player found with ID: ${playerId}`,
      });
    }

    const calculateDerivedStats = (stats) => {
      const total =
        stats.totalCorrect + stats.totalIncorrect + stats.totalSkipped;
      return {
        ...stats,
        accuracy:
          total > 0 ? Math.round((stats.totalCorrect / total) * 100) : 0,
        questionsPerSecond:
          stats.totalTimeSpent > 0
            ? Math.round(
                (stats.totalQuestionsAnswered / (stats.totalTimeSpent / 1000)) *
                  100,
              ) / 100
            : 0,
        skippedPercentage:
          total > 0 ? Math.round((stats.totalSkipped / total) * 100) : 0,
        incorrectPercentage:
          total > 0 ? Math.round((stats.totalIncorrect / total) * 100) : 0,
      };
    };

    // Get monthly stats if month specified
    let monthlyStats = {};
    if (month) {
      const monthData = player.monthlyStats.filter(
        (stat) =>
          stat.month === month &&
          (!mode || stat.mode === mode) &&
          (!diffCode || stat.diffCode === diffCode),
      );

      monthData.forEach((stat) => {
        const key = `${stat.mode}-${stat.diffCode}`;
        monthlyStats[key] = stat;
      });
    }

    // Build response
    const response = {
      playerId: player._id,
      username: player.username,
      profileImage: player.profileImage,
      current: {
        practice: Object.keys(player.stats.practice).reduce((acc, key) => {
          if (!diffCode || key === diffCode) {
            acc[key] = calculateDerivedStats(player.stats.practice[key]);
          }
          return acc;
        }, {}),
        pvp: Object.keys(player.stats.pvp).reduce((acc, key) => {
          if (!diffCode || key === diffCode) {
            acc[key] = calculateDerivedStats(player.stats.pvp[key]);
          }
          return acc;
        }, {}),
      },
      allTimeBest: player.allTimeBest,
      ratings: player.pr,
    };

    if (month) {
      response.monthly = monthlyStats;
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching stats summary:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching stats summary",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;
