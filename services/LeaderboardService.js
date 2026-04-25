// services/LeaderboardService.js
const Player = require("../models/Player");
const Friend = require("../models/Friend");

class LeaderboardService {
  /**
   * Get global leaderboard for PvP mode
   * @param {string} diffCode - E2, E4, M2, M4, H2, H4
   * @param {string} currentUserId - Current player's ID
   * @param {number} limit - Number of top players to return (default 10)
   */
  static async getGlobalLeaderboard(diffCode, currentUserId, limit = 10) {
    // Validate inputs first (synchronously)
    if (!diffCode || typeof diffCode !== "string") {
      return {
        success: false,
        error: `Invalid diffCode. Must be one of: E2, E4, M2, M4, H2, H4`,
      };
    }

    if (!currentUserId) {
      return {
        success: false,
        error: `Current user ID is required`,
      };
    }

    // Validate diffCode
    const validDiffCodes = ["E2", "E4", "M2", "M4", "H2", "H4"];
    if (!validDiffCodes.includes(diffCode)) {
      return {
        success: false,
        error: `Invalid diffCode. Must be one of: ${validDiffCodes.join(", ")}`,
      };
    }

    try {
      // Get all active players sorted by selected diffCode PvP rating with tie-breaking
      const allPlayers = await Player.find({ "accountStatus.state": "active" })
        .sort({
          [`pr.pvp.${diffCode}`]: -1, // Primary: rating (descending) for selected diffCode
          username: 1, // Secondary: alphabetical
          _id: 1, // Tertiary: MongoDB ID
        })
        .select("username profileImage country pr.pvp pr.stats")
        .lean();

      // Add ranks based on selected diffCode rating
      const leaderBoard = allPlayers.map((player, index) => ({
        rank: index + 1,
        userId: player._id,
        username: player.username,
        profileImage: player.profileImage,
        country: player.country,
        rating: player.pr?.pvp?.[diffCode] || 1000,
        gamesPlayed: player.pr?.stats?.pvp?.[diffCode]?.gamesPlayed || 0,
        wins: player.pr?.stats?.pvp?.[diffCode]?.wins || 0,
        winRate: player.pr?.stats?.pvp?.[diffCode]?.winRate || 0,
        isCurrentPlayer: player._id.toString() === currentUserId.toString(),
      }));

      // Find current player index (0-based) and object
      const currentPlayerIndex = leaderBoard.findIndex(
        (p) => p.isCurrentPlayer,
      );
      const currentPlayer =
        currentPlayerIndex !== -1 ? leaderBoard[currentPlayerIndex] : null;

      // Get top N players (capped at 10)
      const topLimit = Math.min(limit, 10);
      const topPlayers = leaderBoard.slice(0, topLimit);

      // Get players BELOW current player (only if current player is not in top 10)
      let aroundPlayers = [];
      if (currentPlayer && currentPlayer.rank > topLimit) {
        // currentPlayerIndex is 0-based, so currentPlayerIndex + 1 is the next player after them
        const startIdx = currentPlayerIndex + 1;
        const endIdx = Math.min(startIdx + 10, leaderBoard.length);
        aroundPlayers = leaderBoard.slice(startIdx, endIdx);
      }

      return {
        success: true,
        diffCode,
        leaderboard: {
          top: topPlayers,
          currentPlayer: currentPlayer,
          around: aroundPlayers,
        },
        totalCount: leaderBoard.length,
      };
    } catch (error) {
      console.error("Error in getGlobalLeaderboard:", error);
      throw error;
    }
  }

  /**
   * Get country leaderboard for PvP mode
   * @param {string} diffCode - E2, E4, M2, M4, H2, H4
   * @param {string} currentUserId - Current player's ID
   * @param {string} countryCode - Country code (optional, will use current player's country)
   * @param {number} limit - Number of top players to return (default 10)
   */
  static async getCountryLeaderboard(
    diffCode,
    currentUserId,
    countryCode,
    limit = 10,
  ) {
    try {
      // Validate inputs
      if (!diffCode || typeof diffCode !== "string") {
        throw new Error(
          `Invalid diffCode. Must be one of: E2, E4, M2, M4, H2, H4`,
        );
      }

      if (!currentUserId) {
        throw new Error(`Current user ID is required`);
      }

      // Validate diffCode
      const validDiffCodes = ["E2", "E4", "M2", "M4", "H2", "H4"];
      if (!validDiffCodes.includes(diffCode)) {
        throw new Error(
          `Invalid diffCode. Must be one of: ${validDiffCodes.join(", ")}`,
        );
      }

      // Get current player's country if not provided
      if (!countryCode) {
        const currentPlayer = await Player.findById(currentUserId)
          .select("country")
          .lean();
        countryCode = currentPlayer?.country;
      }

      if (!countryCode) {
        return {
          success: true,
          diffCode,
          leaderboard: {
            top: [],
            currentPlayer: null,
            around: [],
          },
          totalCount: 0,
          message: "No country specified",
        };
      }

      // Get all active players from the same country sorted by selected diffCode rating
      const allPlayers = await Player.find({
        "accountStatus.state": "active",
        country: countryCode,
      })
        .sort({
          [`pr.pvp.${diffCode}`]: -1, // Primary: rating (descending) for selected diffCode
          username: 1, // Secondary: alphabetical
          _id: 1, // Tertiary: MongoDB ID
        })
        .select("username profileImage country pr.pvp pr.stats")
        .lean();

      // Add ranks based on selected diffCode rating
      const leaderBoard = allPlayers.map((player, index) => ({
        rank: index + 1,
        userId: player._id,
        username: player.username,
        profileImage: player.profileImage,
        country: player.country,
        rating: player.pr?.pvp?.[diffCode] || 1000,
        gamesPlayed: player.pr?.stats?.pvp?.[diffCode]?.gamesPlayed || 0,
        wins: player.pr?.stats?.pvp?.[diffCode]?.wins || 0,
        winRate: player.pr?.stats?.pvp?.[diffCode]?.winRate || 0,
        isCurrentPlayer: player._id.toString() === currentUserId.toString(),
      }));

      // Find current player index (0-based) and object
      const currentPlayerIndex = leaderBoard.findIndex(
        (p) => p.isCurrentPlayer,
      );
      const currentPlayer =
        currentPlayerIndex !== -1 ? leaderBoard[currentPlayerIndex] : null;

      // Get top N players (capped at 10)
      const topLimit = Math.min(limit, 10);
      const topPlayers = leaderBoard.slice(0, topLimit);

      // Get players BELOW current player (only if current player is not in top 10)
      let aroundPlayers = [];
      if (currentPlayer && currentPlayer.rank > topLimit) {
        // currentPlayerIndex is 0-based, so currentPlayerIndex + 1 is the next player after them
        const startIdx = currentPlayerIndex + 1;
        const endIdx = Math.min(startIdx + 10, leaderBoard.length);
        aroundPlayers = leaderBoard.slice(startIdx, endIdx);
      }

      return {
        success: true,
        diffCode,
        country: countryCode,
        leaderboard: {
          top: topPlayers,
          currentPlayer: currentPlayer,
          around: aroundPlayers,
        },
        totalCount: leaderBoard.length,
      };
    } catch (error) {
      console.error("Error in getCountryLeaderboard:", error);
      throw error;
    }
  }

  /**
   * Get friends leaderboard for PvP mode
   * @param {string} diffCode - E2, E4, M2, M4, H2, H4
   * @param {string} currentUserId - Current player's ID
   */
  static async getFriendsLeaderboard(diffCode, currentUserId) {
    try {
      // Validate inputs
      if (!diffCode || typeof diffCode !== "string") {
        throw new Error(
          `Invalid diffCode. Must be one of: E2, E4, M2, M4, H2, H4`,
        );
      }

      if (!currentUserId) {
        throw new Error(`Current user ID is required`);
      }

      // Validate diffCode
      const validDiffCodes = ["E2", "E4", "M2", "M4", "H2", "H4"];
      if (!validDiffCodes.includes(diffCode)) {
        throw new Error(
          `Invalid diffCode. Must be one of: ${validDiffCodes.join(", ")}`,
        );
      }

      // Get all accepted friendships for current user
      const friendships = await Friend.find({
        $or: [
          { requester: currentUserId, status: "accepted" },
          { recipient: currentUserId, status: "accepted" },
        ],
      }).lean();

      // Extract friend IDs
      const friendIds = friendships.map((f) =>
        f.requester.toString() === currentUserId.toString()
          ? f.recipient.toString()
          : f.requester.toString(),
      );

      // Add current user to the pool for ranking
      friendIds.push(currentUserId.toString());

      // Get all friends + current user sorted by selected diffCode PvP rating
      const allPlayers = await Player.find({
        _id: { $in: friendIds },
        "accountStatus.state": "active",
      })
        .sort({
          [`pr.pvp.${diffCode}`]: -1, // Primary: rating (descending) for selected diffCode
          username: 1, // Secondary: alphabetical
          _id: 1, // Tertiary: MongoDB ID
        })
        .select("username profileImage country pr.pvp pr.stats")
        .lean();

      // Add ranks based on selected diffCode rating
      const leaderBoard = allPlayers.map((player, index) => ({
        rank: index + 1,
        userId: player._id,
        username: player.username,
        profileImage: player.profileImage,
        country: player.country,
        rating: player.pr?.pvp?.[diffCode] || 1000,
        gamesPlayed: player.pr?.stats?.pvp?.[diffCode]?.gamesPlayed || 0,
        wins: player.pr?.stats?.pvp?.[diffCode]?.wins || 0,
        winRate: player.pr?.stats?.pvp?.[diffCode]?.winRate || 0,
        isCurrentPlayer: player._id.toString() === currentUserId.toString(),
        isFriend: player._id.toString() !== currentUserId.toString(),
      }));

      // Separate friends list and current player
      const friends = leaderBoard.filter((p) => !p.isCurrentPlayer);
      const currentPlayer = leaderBoard.find((p) => p.isCurrentPlayer) || null;

      return {
        success: true,
        diffCode,
        leaderboard: {
          friends: friends, // All friends ranked by selected diffCode rating
          currentPlayer: currentPlayer, // Player's own rank among friends+self
        },
        totalCount: friends.length,
      };
    } catch (error) {
      console.error("Error in getFriendsLeaderboard:", error);
      throw error;
    }
  }
}

module.exports = LeaderboardService;
