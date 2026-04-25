// controller/leaderboardController.js
const LeaderboardService = require("../services/LeaderboardService");
const Player = require("../models/Player");

class LeaderboardController {
  /**
   * GET /api/leaderboard/global?diffCode=E2
   * Get global leaderboard for PvP mode
   */
  static async getGlobalLeaderboard(req, res) {
    try {
      const { diffCode, limit = 10 } = req.query;
      const currentUserId = req.user._id;

      if (!diffCode) {
        return res.status(400).json({
          success: false,
          message: "diffCode is required. Use one of: E2, E4, M2, M4, H2, H4",
        });
      }

      const result = await LeaderboardService.getGlobalLeaderboard(
        diffCode,
        currentUserId,
        parseInt(limit),
      );

      // Check if service returned an error
      if (result && result.success === false) {
        return res.status(400).json({
          success: false,
          message: result.error,
        });
      }

      res.json(result);
    } catch (error) {
      // Handle specific validation errors (don't log these as they're expected)
      if (error.message && error.message.includes("Invalid diffCode")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Log only unexpected errors
      console.error("❌ Unexpected error in getGlobalLeaderboard:", error);

      // Handle other errors
      res.status(500).json({
        success: false,
        message: "Failed to fetch global leaderboard",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  /**
   * GET /api/leaderboard/country?diffCode=E2&country=US
   * Get country leaderboard for PvP mode
   */
  static async getCountryLeaderboard(req, res) {
    try {
      const { diffCode, country, limit = 10 } = req.query;
      const currentUserId = req.user._id;

      if (!diffCode) {
        return res.status(400).json({
          success: false,
          message: "diffCode is required. Use one of: E2, E4, M2, M4, H2, H4",
        });
      }

      const result = await LeaderboardService.getCountryLeaderboard(
        diffCode,
        currentUserId,
        country,
        parseInt(limit),
      );

      res.json(result);
    } catch (error) {
      // Handle specific validation errors (don't log these as they're expected)
      if (error.message && error.message.includes("Invalid diffCode")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Log only unexpected errors
      console.error("❌ Unexpected error in getCountryLeaderboard:", error);

      // Handle other errors
      res.status(500).json({
        success: false,
        message: "Failed to fetch country leaderboard",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  /**
   * GET /api/leaderboard/friends?diffCode=E2
   * Get friends leaderboard for PvP mode
   */
  static async getFriendsLeaderboard(req, res) {
    try {
      const { diffCode } = req.query;
      const currentUserId = req.user._id;

      if (!diffCode) {
        return res.status(400).json({
          success: false,
          message: "diffCode is required. Use one of: E2, E4, M2, M4, H2, H4",
        });
      }

      const result = await LeaderboardService.getFriendsLeaderboard(
        diffCode,
        currentUserId,
      );

      res.json(result);
    } catch (error) {
      // Handle specific validation errors (don't log these as they're expected)
      if (error.message && error.message.includes("Invalid diffCode")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Log only unexpected errors
      console.error("❌ Unexpected error in getFriendsLeaderboard:", error);

      // Handle other errors
      res.status(500).json({
        success: false,
        message: "Failed to fetch friends leaderboard",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  /**
   * GET /api/leaderboard/summary
   * Get summary of all leaderboards for current user
   */
  static async getLeaderboardSummary(req, res) {
    try {
      const currentUserId = req.user._id;
      const diffCodes = ["E2", "E4", "M2", "M4", "H2", "H4"];

      // Get user's current ratings for all diffCodes
      const user = await Player.findById(currentUserId)
        .select("username pr.pvp country")
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const summary = diffCodes.map((diffCode) => ({
        diffCode,
        currentRating: user.pr?.pvp?.[diffCode] || 1000,
      }));

      res.json({
        success: true,
        username: user.username,
        country: user.country,
        ratings: summary,
      });
    } catch (error) {
      // Log only unexpected errors
      console.error("❌ Unexpected error in getLeaderboardSummary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch leaderboard summary",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }
}

module.exports = LeaderboardController;
