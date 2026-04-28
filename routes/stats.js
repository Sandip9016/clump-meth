const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Player = require("../models/Player");
const auth = require("../middleware/auth");

// ✅ Get All-Time Best Stats with time filtering
router.get("/all-time/:playerId", auth, async (req, res) => {
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

    // Get time range
    const timeRange = getTimeRange(time);

    // Find player with all stats
    const player = await Player.findById(playerId).select(
      "allTimeBest monthlyStats username profileImage",
    );
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
        error: `No player found with ID: ${playerId}`,
      });
    }

    // Filter monthly stats by time range for best achievements in period
    const timeFilteredStats = player.monthlyStats.filter((stat) => {
      const statDate = new Date(stat.month);
      return statDate >= timeRange.start && statDate <= timeRange.end;
    });

    let result = {
      playerId: player._id,
      username: player.username,
      profileImage: player.profileImage,
      practice: {},
      pvp: {},
    };

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

    // Helper to find best achievements in time period
    const findBestInTimePeriod = (monthlyData, mode, diffCode) => {
      const filtered = monthlyData.filter(
        (stat) =>
          stat.mode === mode && (!diffCode || stat.diffCode === diffCode),
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

    // Filter by mode if specified - use time-filtered best achievements
    if (mode && mode !== "all") {
      if (mode === "practice") {
        result.practice = diffCode
          ? {
              [diffCode]: findBestInTimePeriod(
                timeFilteredStats,
                "practice",
                diffCode,
              ),
            }
          : Object.keys(player.stats.practice).reduce((acc, key) => {
              acc[key] = findBestInTimePeriod(
                timeFilteredStats,
                "practice",
                key,
              );
              return acc;
            }, {});
      } else if (mode === "pvp") {
        result.pvp = diffCode
          ? {
              [diffCode]: findBestInTimePeriod(
                timeFilteredStats,
                "pvp",
                diffCode,
              ),
            }
          : Object.keys(player.stats.pvp).reduce((acc, key) => {
              acc[key] = findBestInTimePeriod(timeFilteredStats, "pvp", key);
              return acc;
            }, {});
      }
    } else {
      result = {
        playerId: player._id,
        username: player.username,
        profileImage: player.profileImage,
        practice: Object.keys(player.stats.practice).reduce((acc, key) => {
          acc[key] = findBestInTimePeriod(timeFilteredStats, "practice", key);
          return acc;
        }, {}),
        pvp: Object.keys(player.stats.pvp).reduce((acc, key) => {
          acc[key] = findBestInTimePeriod(timeFilteredStats, "pvp", key);
          return acc;
        }, {}),
      };
    }

    // Add time filter info to response
    result.timeFilter = time;

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

// ✅ Get Time-based Stats (replaces monthly stats)
router.get("/monthly/:playerId", auth, async (req, res) => {
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

    // Get time range
    const timeRange = getTimeRange(time);

    // Find player with all stats
    const player = await Player.findById(playerId).select(
      "stats allTimeBest monthlyStats username profileImage",
    );
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found",
        error: `No player found with ID: ${playerId}`,
      });
    }

    // Filter monthly stats by time range
    let filteredStats = player.monthlyStats.filter((stat) => {
      const statDate = new Date(stat.month);
      return statDate >= timeRange.start && statDate <= timeRange.end;
    });

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
      timeFilter: time,
      stats: Object.keys(groupedStats).length > 0 ? groupedStats : {},
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

// ✅ Get Current Stats with time filtering
router.get("/current/:playerId", auth, async (req, res) => {
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

    // Get time range
    const timeRange = getTimeRange(time);

    // Find player with all stats
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

    // Filter monthly stats by time range for current period stats
    const timeFilteredStats = player.monthlyStats.filter((stat) => {
      const statDate = new Date(stat.month);
      return statDate >= timeRange.start && statDate <= timeRange.end;
    });

    let result = {
      playerId: player._id,
      username: player.username,
      profileImage: player.profileImage,
      practice: {},
      pvp: {},
    };

    // Aggregate time-filtered monthly stats for current period
    const aggregateTimeStats = (monthlyData, mode, diffCode) => {
      const filtered = monthlyData.filter(
        (stat) =>
          stat.mode === mode && (!diffCode || stat.diffCode === diffCode),
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

    // Filter and include time-based stats
    if (mode && mode !== "all") {
      if (mode === "practice") {
        result.practice = diffCode
          ? {
              [diffCode]: calculateDerivedStats(
                aggregateTimeStats(timeFilteredStats, "practice", diffCode),
              ),
            }
          : Object.keys(player.stats.practice).reduce((acc, key) => {
              acc[key] = calculateDerivedStats(
                aggregateTimeStats(timeFilteredStats, "practice", key),
              );
              return acc;
            }, {});
      } else if (mode === "pvp") {
        result.pvp = diffCode
          ? {
              [diffCode]: calculateDerivedStats(
                aggregateTimeStats(timeFilteredStats, "pvp", diffCode),
              ),
            }
          : Object.keys(player.stats.pvp).reduce((acc, key) => {
              acc[key] = calculateDerivedStats(
                aggregateTimeStats(timeFilteredStats, "pvp", key),
              );
              return acc;
            }, {});
      }
    } else {
      result.practice = Object.keys(player.stats.practice).reduce(
        (acc, key) => {
          acc[key] = calculateDerivedStats(
            aggregateTimeStats(timeFilteredStats, "practice", key),
          );
          return acc;
        },
        {},
      );

      result.pvp = Object.keys(player.stats.pvp).reduce((acc, key) => {
        acc[key] = calculateDerivedStats(
          aggregateTimeStats(timeFilteredStats, "pvp", key),
        );
        return acc;
      }, {});
    }

    // Add time filter info to response
    result.timeFilter = time;

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

// ✅ Get Stats Summary (combined view) with time filtering
router.get("/summary/:playerId", auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { time = "alltime", month, mode, diffCode } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid player ID format",
        error: "Player ID must be a valid 24-character hex string",
      });
    }

    // Get time range
    const timeRange = getTimeRange(time);

    // Get player with all stats
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

    // Filter monthly stats by time range
    const timeFilteredStats = player.monthlyStats.filter((stat) => {
      const statDate = new Date(stat.month);
      return statDate >= timeRange.start && statDate <= timeRange.end;
    });

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

    // Build response with time-filtered data
    const response = {
      playerId: player._id,
      username: player.username,
      profileImage: player.profileImage,
      timeFilter: time,
      current: {
        practice: Object.keys(player.stats.practice).reduce((acc, key) => {
          if (!diffCode || key === diffCode) {
            acc[key] = calculateDerivedStats(
              aggregateTimeStats(timeFilteredStats, "practice", key),
            );
          }
          return acc;
        }, {}),
        pvp: Object.keys(player.stats.pvp).reduce((acc, key) => {
          if (!diffCode || key === diffCode) {
            acc[key] = calculateDerivedStats(
              aggregateTimeStats(timeFilteredStats, "pvp", key),
            );
          }
          return acc;
        }, {}),
      },
      allTimeBest: {
        practice: Object.keys(player.stats.practice).reduce((acc, key) => {
          if (!diffCode || key === diffCode) {
            acc[key] = findBestInTimePeriod(timeFilteredStats, "practice", key);
          }
          return acc;
        }, {}),
        pvp: Object.keys(player.stats.pvp).reduce((acc, key) => {
          if (!diffCode || key === diffCode) {
            acc[key] = findBestInTimePeriod(timeFilteredStats, "pvp", key);
          }
          return acc;
        }, {}),
      },
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
