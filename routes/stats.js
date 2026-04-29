// routes/stats.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Player = require("../models/Player");
const auth = require("../middleware/auth");

const DIFF_CODES = ["E2", "E4", "M2", "M4", "H2", "H4"];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the earliest "YYYY-MM" that belongs to the requested window. */
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

/**
 * Aggregate monthly-stat entries for one (mode, diffCode) pair.
 * - Counters (games, correct …) are SUMmed.
 * - "Best" values (highScore, streak, highestRating, q/s) are MAX'd —
 *   each monthly entry already stores the best single-game value for that month.
 */
const aggregateMonthlyStats = (monthlyData, mode, diffCode) => {
  const filtered = monthlyData.filter(
    (s) => s.mode === mode && s.diffCode === diffCode,
  );

  const zero = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalSkipped: 0,
    totalTimeSpent: 0,
    totalQuestionsAnswered: 0,
    // best-in-period (MAX)
    topScore: 0, // practice — highest single-game score
    bestStreak: 0, // practice — longest correct-answer run in a single game
    bestQuestionsPerSecond: 0, // both — best q/s rate seen in a single game
    longestStreak: 0, // pvp — longest consecutive win streak
    highestRating: 0, // pvp — peak Elo rating reached
    bestWin: { username: "", rating: 0 },
  };

  if (filtered.length === 0) return zero;

  return filtered.reduce((acc, s) => {
    // Cumulative counters
    acc.gamesPlayed += s.gamesPlayed || 0;
    acc.wins += s.wins || 0;
    acc.losses += s.losses || 0;
    acc.draws += s.draws || 0;
    acc.totalCorrect += s.totalCorrect || 0;
    acc.totalIncorrect += s.totalIncorrect || 0;
    acc.totalSkipped += s.totalSkipped || 0;
    acc.totalTimeSpent += s.totalTimeSpent || 0;
    acc.totalQuestionsAnswered += s.totalQuestionsAnswered || 0;

    // Best q/s across months (each monthly entry stores best game rate for that month)
    acc.bestQuestionsPerSecond = Math.max(
      acc.bestQuestionsPerSecond,
      s.questionsPerSecond || 0,
    );

    if (mode === "practice") {
      acc.topScore = Math.max(acc.topScore, s.highScore || 0);
      acc.bestStreak = Math.max(acc.bestStreak, s.bestStreak || 0);
    }

    if (mode === "pvp") {
      if ((s.bestWin?.rating || 0) > acc.bestWin.rating) {
        acc.bestWin = {
          username: s.bestWin.username || "",
          rating: s.bestWin.rating || 0,
        };
      }
      acc.longestStreak = Math.max(acc.longestStreak, s.longestStreak || 0);
      // highestRating in the monthly entry = peak Elo touched that month
      acc.highestRating = Math.max(acc.highestRating, s.highestRating || 0);
    }

    return acc;
  }, zero);
};

/**
 * Build the "current" stats object the client displays.
 * All fields map 1-to-1 to a client requirement.
 */
const buildCurrentStats = (agg, mode) => {
  const totalAnswered =
    agg.totalCorrect + agg.totalIncorrect + agg.totalSkipped;

  // Questions / Second (Time per question in seconds)
  // Requirement: Time taken to answer 1 Question (Correct/ Incorrect/ Skipped)
  let questionsPerSecond = 0;
  if (agg.totalTimeSpent > 0 && agg.totalQuestionsAnswered > 0) {
    // Calculate average time per question in seconds
    questionsPerSecond =
      Math.round(
        (agg.totalTimeSpent / 1000 / agg.totalQuestionsAnswered) * 100,
      ) / 100;
  } else if (agg.bestQuestionsPerSecond > 0) {
    // Fallback: use the stored best time per question
    questionsPerSecond = Math.round(agg.bestQuestionsPerSecond * 100) / 100;
  }

  // ── Common fields (both PVP and Practice) ───────────────────────────────
  const out = {
    gamesPlayed: agg.gamesPlayed,

    // Requirement: X / (correct + incorrect + skipped)  →  expressed as %
    accuracy:
      totalAnswered > 0
        ? Math.round((agg.totalCorrect / totalAnswered) * 100)
        : 0,
    skippedPercentage:
      totalAnswered > 0
        ? Math.round((agg.totalSkipped / totalAnswered) * 100)
        : 0,
    incorrectPercentage:
      totalAnswered > 0
        ? Math.round((agg.totalIncorrect / totalAnswered) * 100)
        : 0,

    questionsPerSecond,

    // Raw counts (useful for client labels like "33 correct")
    totalCorrect: agg.totalCorrect,
    totalIncorrect: agg.totalIncorrect,
    totalSkipped: agg.totalSkipped,
    totalQuestionsAnswered: agg.totalQuestionsAnswered,
    totalTimeSpent: agg.totalTimeSpent,
  };

  // ── PVP-specific ─────────────────────────────────────────────────────────
  if (mode === "pvp") {
    out.wins = agg.wins;
    out.losses = agg.losses;
    out.draws = agg.draws;

    // Win / Loss / Draw rates as % of games played
    out.winRate =
      agg.gamesPlayed > 0 ? Math.round((agg.wins / agg.gamesPlayed) * 100) : 0;
    out.lossRate =
      agg.gamesPlayed > 0
        ? Math.round((agg.losses / agg.gamesPlayed) * 100)
        : 0;
    out.drawRate =
      agg.gamesPlayed > 0 ? Math.round((agg.draws / agg.gamesPlayed) * 100) : 0;

    // "Highest Rank" = highest Elo rating reached in the selected period & difficulty
    out.highestRating = agg.highestRating || 0;

    // "Best Win" = highest-rated opponent defeated in the period
    out.bestWin = agg.bestWin || { username: "", rating: 0 };

    // "Longest Streak" = max consecutive wins in the period
    out.longestStreak = agg.longestStreak || 0;
  }

  // ── Practice-specific ────────────────────────────────────────────────────
  if (mode === "practice") {
    // "Top Score" = highest score in any single game in the period
    out.topScore = agg.topScore || 0;
    // "Best Streak" = longest correct-answer streak in any single game in the period
    out.bestStreak = agg.bestStreak || 0;
  }

  return out;
};

/**
 * Read the precomputed windowed-best bucket for the requested period.
 * These are updated after every game by _updateWindowedBests in Player.js.
 *
 * NOTE: The Mongoose schema for practice best-buckets does NOT include a
 * "bestHighScore" field, so topScore with a timestamp is not available here —
 * it is already surfaced as `current.topScore` (aggregated from monthlyStats).
 */
const buildBestStats = (player, mode, diffCode, timeFilter) => {
  const fieldMap = {
    "1week": "weekBest",
    "1month": "monthBest",
    "3months": "threeMonthsBest",
    "6months": "sixMonthsBest",
    "1year": "yearBest",
    alltime: "allTimeBest",
  };

  const bucket =
    player[fieldMap[timeFilter] || "allTimeBest"]?.[mode]?.[diffCode];

  if (mode === "pvp") {
    return {
      // Highest-rated opponent defeated (with date)
      bestWin: bucket?.bestWin || { username: "", rating: 0, date: null },
      // Longest consecutive win streak achieved (with date)
      longestStreak: bucket?.longestStreak || { value: 0, date: null },
      // Peak Elo rating reached (with date)
      highestRating: bucket?.highestRating || { value: 1000, date: null },
      // Best questions-per-second rate (with date)
      bestQuestionsPerSecond: bucket?.bestQuestionsPerSecond || {
        value: 0,
        date: null,
      },
    };
  }

  // practice
  return {
    // Best Streak with the date it was set
    bestStreak: bucket?.bestStreak || { value: 0, date: null },
    // Best Accuracy % with the date it was set
    bestAccuracy: bucket?.bestAccuracy || { value: 0, date: null },
    // Best questions-per-second rate (with date)
    bestQuestionsPerSecond: bucket?.bestQuestionsPerSecond || {
      value: 0,
      date: null,
    },
  };
};

/**
 * Build a lean ratings object:
 * - If a specific diffCode is requested → return only that code for practice + pvp.
 * - Otherwise → return all diffCodes for practice + pvp (computer omitted).
 */
const buildRatings = (pr, diffCode) => {
  if (diffCode) {
    return {
      practice: { [diffCode]: pr?.practice?.[diffCode] ?? 1000 },
      pvp: { [diffCode]: pr?.pvp?.[diffCode] ?? 1000 },
    };
  }
  // Return all practice + pvp ratings, skip computer
  return {
    practice: pr?.practice || {},
    pvp: pr?.pvp || {},
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stats/:playerId
//
//   Query params
//   ─────────────────────────────────────────────────────────────────────────
//   time     = alltime | 1week | 1month | 3months | 6months | 1year  (default: alltime)
//   mode     = pvp | practice | all                                   (default: all)
//   diffCode = E2 | E4 | M2 | M4 | H2 | H4                          (default: all codes)
//
//   Response shape
//   ─────────────────────────────────────────────────────────────────────────
//   {
//     playerId, username, profileImage, timeFilter, mode,
//     ratings: { practice: { <diffCode>: rating }, pvp: { <diffCode>: rating } },
//     current: {
//       pvp: {
//         <diffCode|"all">: {
//           gamesPlayed, wins, losses, draws,
//           winRate, lossRate, drawRate,         // %
//           accuracy, skippedPercentage, incorrectPercentage,  // %
//           questionsPerSecond,
//           highestRating,                        // Highest Rank
//           bestWin: { username, rating },
//           longestStreak,
//           totalCorrect, totalIncorrect, totalSkipped,
//           totalQuestionsAnswered, totalTimeSpent
//         }
//       },
//       practice: {
//         <diffCode|"all">: {
//           gamesPlayed,
//           accuracy, skippedPercentage, incorrectPercentage,  // %
//           questionsPerSecond,
//           topScore,                             // Top Score
//           bestStreak,                           // Best Streak
//           totalCorrect, totalIncorrect, totalSkipped,
//           totalQuestionsAnswered, totalTimeSpent
//         }
//       }
//     },
//     best: {
//       pvp: {
//         <diffCode>: {
//           bestWin: { username, rating, date },
//           longestStreak: { value, date },
//           highestRating: { value, date },
//           bestQuestionsPerSecond: { value, date }
//         }
//       },
//       practice: {
//         <diffCode>: {
//           bestStreak: { value, date },
//           bestAccuracy: { value, date },
//           bestQuestionsPerSecond: { value, date }
//         }
//       }
//     }
//   }
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:playerId", auth, async (req, res) => {
  try {
    const { playerId } = req.params;
    const { time = "alltime", mode, diffCode } = req.query;

    // DEBUG: Log request details
    console.log("=== STATS API DEBUG ===");
    console.log("Requested playerId:", playerId);
    console.log("Query params:", { time, mode, diffCode });
    console.log("Auth user ID:", req.user?._id);
    console.log("Auth user username:", req.user?.username);

    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid player ID format" });
    }

    const validTimeFilters = [
      "1week",
      "1month",
      "3months",
      "6months",
      "1year",
      "alltime",
    ];
    const validModes = ["practice", "pvp", "all"];

    const normalizedTime = validTimeFilters.includes(time) ? time : "alltime";
    const normalizedMode = validModes.includes(mode) ? mode : "all";
    const normalizedDiffCode = DIFF_CODES.includes(diffCode) ? diffCode : null;

    const startMonth = getStartMonth(normalizedTime);
    const currentMonth = new Date().toISOString().slice(0, 7);

    const player = await Player.findById(playerId).select(
      "username profileImage pr monthlyStats " +
        "allTimeBest weekBest monthBest threeMonthsBest sixMonthsBest yearBest",
    );

    // DEBUG: Log player lookup result
    console.log("Player lookup result:", player ? "FOUND" : "NOT FOUND");
    if (player) {
      console.log("Found player username:", player.username);
      console.log("Monthly stats count:", player.monthlyStats?.length || 0);
    }

    if (!player) {
      console.log("Returning 404 - Player not found");
      return res
        .status(404)
        .json({ success: false, message: "Player not found" });
    }

    // Filter monthly entries to the requested time window
    const windowedMonthly = player.monthlyStats.filter(
      (s) => s.month >= startMonth && s.month <= currentMonth,
    );

    const codesRequested = normalizedDiffCode
      ? [normalizedDiffCode]
      : DIFF_CODES;
    const modesToProcess =
      normalizedMode === "all" ? ["pvp", "practice"] : [normalizedMode];

    const response = {
      playerId: player._id,
      username: player.username,
      profileImage: player.profileImage,
      timeFilter: normalizedTime,
      mode: normalizedMode,
      diffCode: normalizedDiffCode || "all",
      // Only return ratings for the selected diffCode (or all if none specified)
      ratings: buildRatings(player.pr, normalizedDiffCode),
      current: {},
      best: {},
    };

    for (const m of modesToProcess) {
      response.current[m] = {};
      response.best[m] = {};

      // ── Per-diffCode stats ────────────────────────────────────────────────
      for (const code of codesRequested) {
        const agg = aggregateMonthlyStats(windowedMonthly, m, code);
        response.current[m][code] = buildCurrentStats(agg, m);
        response.best[m][code] = buildBestStats(
          player,
          m,
          code,
          normalizedTime,
        );
      }

      // ── "all" rollup (only when no specific diffCode was requested) ───────
      if (!normalizedDiffCode) {
        // Re-aggregate across all six diffCodes into one combined bucket
        const rollupAgg = {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          totalCorrect: 0,
          totalIncorrect: 0,
          totalSkipped: 0,
          totalTimeSpent: 0,
          totalQuestionsAnswered: 0,
          bestQuestionsPerSecond: 0,
          // pvp bests
          longestStreak: 0,
          highestRating: 0,
          bestWin: { username: "", rating: 0 },
          // practice bests
          topScore: 0,
          bestStreak: 0,
        };

        for (const code of DIFF_CODES) {
          const agg = aggregateMonthlyStats(windowedMonthly, m, code);

          rollupAgg.gamesPlayed += agg.gamesPlayed || 0;
          rollupAgg.totalCorrect += agg.totalCorrect || 0;
          rollupAgg.totalIncorrect += agg.totalIncorrect || 0;
          rollupAgg.totalSkipped += agg.totalSkipped || 0;
          rollupAgg.totalTimeSpent += agg.totalTimeSpent || 0;
          rollupAgg.totalQuestionsAnswered += agg.totalQuestionsAnswered || 0;
          rollupAgg.bestQuestionsPerSecond = Math.max(
            rollupAgg.bestQuestionsPerSecond,
            agg.bestQuestionsPerSecond || 0,
          );

          if (m === "pvp") {
            rollupAgg.wins += agg.wins || 0;
            rollupAgg.losses += agg.losses || 0;
            rollupAgg.draws += agg.draws || 0;
            rollupAgg.longestStreak = Math.max(
              rollupAgg.longestStreak,
              agg.longestStreak || 0,
            );
            rollupAgg.highestRating = Math.max(
              rollupAgg.highestRating,
              agg.highestRating || 0,
            );
            if ((agg.bestWin?.rating || 0) > rollupAgg.bestWin.rating) {
              rollupAgg.bestWin = agg.bestWin;
            }
          }

          if (m === "practice") {
            rollupAgg.topScore = Math.max(
              rollupAgg.topScore,
              agg.topScore || 0,
            );
            rollupAgg.bestStreak = Math.max(
              rollupAgg.bestStreak,
              agg.bestStreak || 0,
            );
          }
        }

        response.current[m]["all"] = buildCurrentStats(rollupAgg, m);
        // No "best" rollup for "all" — best records are per-diffCode only
      }
    }

    // DEBUG: Log final response
    console.log("Final response keys:", Object.keys(response));
    console.log("Response playerId:", response.playerId);
    console.log("Response username:", response.username);
    console.log("=== END STATS API DEBUG ===");

    return res.json(response);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching stats",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// Export helper functions for testing
module.exports = {
  router,
  getStartMonth,
  aggregateMonthlyStats,
  buildCurrentStats,
  buildBestStats,
  buildRatings,
};
