// controller/computerGameController.js
const Player = require("../models/Player");
const ComputerGame = require("../models/ComputerGame");
const { QuestionService } = require("../services/QuestionService");
const ComputerGameRoom = require("../services/ComputerGameRoom");
const config = require("../config/computerModeConfig");

class ComputerGameController {
  /**
   * Get computer mode stats for a player
   */
  static async getComputerStats(req, res) {
    try {
      const playerId = req.user._id;

      const player = await Player.findById(playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      return res.json({
        success: true,
        computerStats: player.stats.computer,
        computerRatings: player.pr.computer,
      });
    } catch (error) {
      console.error("Error fetching computer stats:", error);
      return res.status(500).json({ error: "Error fetching computer stats" });
    }
  }

  /**
   * Get computer game history
   */
  static async getComputerGameHistory(req, res) {
    try {
      const playerId = req.user._id;
      const limit = req.query.limit || 10;
      const skip = req.query.skip || 0;

      const games = await ComputerGame.find({ player: playerId })
        .sort({ playedAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const total = await ComputerGame.countDocuments({ player: playerId });

      return res.json({
        success: true,
        games,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      });
    } catch (error) {
      console.error("Error fetching game history:", error);
      return res.status(500).json({ error: "Error fetching game history" });
    }
  }

  /**
   * Get single computer game details
   */
  static async getComputerGameDetails(req, res) {
    try {
      const gameId = req.params.gameId;
      const playerId = req.user._id;

      const game = await ComputerGame.findById(gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      if (game.player.toString() !== playerId.toString()) {
        return res
          .status(403)
          .json({ error: "Unauthorized to view this game" });
      }

      return res.json({
        success: true,
        game,
      });
    } catch (error) {
      console.error("Error fetching game details:", error);
      return res.status(500).json({ error: "Error fetching game details" });
    }
  }
}

module.exports = ComputerGameController;
