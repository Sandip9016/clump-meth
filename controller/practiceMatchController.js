// controller/practiceMatchController.js
const Player = require("../models/Player");
const badgeService = require("../services/BadgeService");

// Practice session logic (unchanged)
function calculatePracticePoints({
  correctCount,
  skippedCount,
  incorrectCount,
}) {
  let pointsA = correctCount - incorrectCount;
  pointsA = Math.max(-10, Math.min(10, pointsA));
  const bonus = (incorrectCount === 0 ? 1 : 0) + (skippedCount === 0 ? 1 : 0);
  return pointsA + bonus;
}

// ✅ Valid diffCodes for practice
const VALID_DIFF_CODES = ["E2", "E4", "M2", "M4", "H2", "H4"];

/**
 * POST /api/practice/end
 * Body: { diffCode, correctCount, incorrectCount, skippedCount }
 */
exports.endPracticeSession = async (req, res) => {
  const { diffCode, correctCount, incorrectCount, skippedCount } = req.body;

  const playerId = req.user._id;
  console.log(playerId);

  // Normalize diffCode to uppercase (e.g. "m2" → "M2")
  const normalizedDiffCode = (diffCode || "").toUpperCase();

  const total = correctCount + incorrectCount + skippedCount;

  if (!playerId || !VALID_DIFF_CODES.includes(normalizedDiffCode)) {
    return res.status(400).json({ message: "Missing or invalid diffCode. Use one of: E2, E4, M2, M4, H2, H4" });
  }

  if (
    typeof correctCount !== "number" ||
    typeof incorrectCount !== "number" ||
    typeof skippedCount !== "number"
  ) {
    return res.status(400).json({ message: "Count fields must be numbers" });
  }

  try {
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });

    // Initialize PR if not exists
    if (!player.pr) player.pr = { practice: {}, pvp: {} };
    if (!player.pr.practice) player.pr.practice = {};

    // ✅ Increment stats.practice[normalizedDiffCode].gamesPlayed for badge tracking
    if (!player.stats.practice[normalizedDiffCode]) {
      player.stats.practice[normalizedDiffCode] = {
        gamesPlayed: 0,
        highScore: 0,
        totalScore: 0,
        averageScore: 0,
      };
    }
    player.stats.practice[normalizedDiffCode].gamesPlayed += 1;
    player.stats.overall.totalGames += 1;
    player.markModified("stats");

    const points = calculatePracticePoints({
      correctCount,
      skippedCount,
      incorrectCount,
    });
    const currentRating = player.pr.practice[normalizedDiffCode] || 1000;
    const newRating = currentRating + points;

    player.pr.practice[normalizedDiffCode] = newRating;
    await player.save();

    // ✅ Badge checks — non-blocking
    badgeService.onPracticeGameCompleted(playerId.toString()).then((earned) => {
      if (earned.length > 0) {
        console.log(`🏅 Practice badges earned for ${playerId}: ${earned.map(b => b.title).join(", ")}`);
      }
    }).catch(() => {});

    return res.json({
      message: "Practice session ended",
      pointsEarned: points,
      newRating: newRating,
      oldRating: currentRating,
      diffCode: normalizedDiffCode,
      correctPercent: ((correctCount / total) * 100).toFixed(2) + "%",
      incorrectPercent: ((incorrectCount / total) * 100).toFixed(2) + "%",
      skippedPercent: ((skippedCount / total) * 100).toFixed(2) + "%",
    });
  } catch (err) {
    console.error("Error ending practice session:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
