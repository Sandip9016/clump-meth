// routes/leaderboard.js
const express = require("express");
const auth = require("../middleware/auth");
const leaderboardController = require("../controller/leaderboardController");

const router = express.Router();

/**
 * GET /api/leaderboard/global?diffCode=E2&limit=10
 * Get global leaderboard for PvP mode
 * Shows top 10 players, current player rank, and players around current player
 */
router.get("/global", auth, leaderboardController.getGlobalLeaderboard);

/**
 * GET /api/leaderboard/country?diffCode=E2&country=US&limit=10
 * Get country leaderboard for PvP mode
 * Shows top 10 players from current player's country
 */
router.get("/country", auth, leaderboardController.getCountryLeaderboard);

/**
 * GET /api/leaderboard/friends?diffCode=E2
 * Get friends leaderboard for PvP mode
 * Shows all friends ranked by rating
 */
router.get("/friends", auth, leaderboardController.getFriendsLeaderboard);

/**
 * GET /api/leaderboard/summary
 * Get summary of current user's ratings across all diffCodes
 */
router.get("/summary", auth, leaderboardController.getLeaderboardSummary);

module.exports = router;
