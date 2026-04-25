// services/LeaderboardService.js
const Player = require("../models/Player");
const Friend = require("../models/Friend");

const VALID_DIFF_CODES = ["E2", "E4", "M2", "M4", "H2", "H4"];

/**
 * Validate diffCode and currentUserId.
 * Returns an error string if invalid, null if valid.
 */
function validate(diffCode, currentUserId) {
  if (!diffCode || !VALID_DIFF_CODES.includes(diffCode)) {
    return `Invalid diffCode. Must be one of: ${VALID_DIFF_CODES.join(", ")}`;
  }
  if (!currentUserId) {
    return "Current user ID is required";
  }
  return null;
}

/**
 * Map a raw player document to a leaderboard entry.
 * - Rating  → player.pr.pvp[diffCode]
 * - Stats   → player.stats.pvp[diffCode]  (NOT player.pr.stats)
 */
function buildEntry(player, rank, diffCode, currentUserId) {
  return {
    rank,
    userId: player._id,
    username: player.username,
    profileImage: player.profileImage || null,
    country: player.country || "",
    rating: player.pr?.pvp?.[diffCode] ?? 1000,
    gamesPlayed: player.stats?.pvp?.[diffCode]?.gamesPlayed ?? 0,
    wins: player.stats?.pvp?.[diffCode]?.wins ?? 0,
    winRate: player.stats?.pvp?.[diffCode]?.winRate ?? 0,
    isCurrentPlayer: player._id.toString() === currentUserId.toString(),
  };
}

class LeaderboardService {
  /**
   * GET /api/leaderboard/global?diffCode=E2
   *
   * Response:
   *   top          → top 10 players (current player included if they are in top 10)
   *   currentPlayer → current player's entry with their correct global rank
   *   around        → up to 10 players ranked BELOW current player
   *                   (empty if current player is in top 10)
   */
  static async getGlobalLeaderboard(diffCode, currentUserId, limit = 10) {
    const err = validate(diffCode, currentUserId);
    if (err) return { success: false, error: err };

    try {
      // Fetch all active players sorted by the selected diffCode rating
      const allPlayers = await Player.find({ "accountStatus.state": "active" })
        .sort({
          [`pr.pvp.${diffCode}`]: -1, // highest rating first
          username: 1, // tie-break: alphabetical
          _id: 1, // tie-break: stable id
        })
        .select("username profileImage country pr.pvp stats.pvp")
        .lean();

      // Assign ranks (1-based) based on sort order for the selected diffCode
      const leaderBoard = allPlayers.map((player, index) =>
        buildEntry(player, index + 1, diffCode, currentUserId),
      );

      // Locate current player
      const currentPlayerIndex = leaderBoard.findIndex(
        (p) => p.isCurrentPlayer,
      );
      const currentPlayer =
        currentPlayerIndex !== -1 ? leaderBoard[currentPlayerIndex] : null;

      // Top [limit] players (includes current player if within limit)
      const topPlayers = leaderBoard.slice(0, limit);

      // Players ranked BELOW current player — only when outside top [limit]
      // The number of below players is always fixed at 10
      let aroundPlayers = [];
      if (currentPlayer && currentPlayer.rank > limit) {
        // currentPlayerIndex is 0-based; +1 gives the next player after them
        const startIdx = currentPlayerIndex + 1;
        const endIdx = Math.min(startIdx + 10, leaderBoard.length);
        aroundPlayers = leaderBoard.slice(startIdx, endIdx);
      }

      return {
        success: true,
        diffCode,
        leaderboard: {
          top: topPlayers,
          currentPlayer,
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
   * GET /api/leaderboard/country?diffCode=E2
   *
   * Identical logic to global but filtered to the player's country.
   * Response shape is the same: top, currentPlayer, around.
   */
  static async getCountryLeaderboard(
    diffCode,
    currentUserId,
    countryCode,
    limit = 10,
  ) {
    const err = validate(diffCode, currentUserId);
    if (err) throw new Error(err);

    try {
      // If no country passed, look up the player's own country
      if (!countryCode) {
        const me = await Player.findById(currentUserId)
          .select("country")
          .lean();
        countryCode = me?.country;
      }

      if (!countryCode) {
        return {
          success: true,
          diffCode,
          leaderboard: { top: [], currentPlayer: null, around: [] },
          totalCount: 0,
          message: "No country specified",
        };
      }

      // Fetch all active players in that country sorted by selected diffCode rating
      const allPlayers = await Player.find({
        "accountStatus.state": "active",
        country: countryCode,
      })
        .sort({
          [`pr.pvp.${diffCode}`]: -1,
          username: 1,
          _id: 1,
        })
        .select("username profileImage country pr.pvp stats.pvp")
        .lean();

      // Assign ranks (1-based) for this country pool
      const leaderBoard = allPlayers.map((player, index) =>
        buildEntry(player, index + 1, diffCode, currentUserId),
      );

      const currentPlayerIndex = leaderBoard.findIndex(
        (p) => p.isCurrentPlayer,
      );
      const currentPlayer =
        currentPlayerIndex !== -1 ? leaderBoard[currentPlayerIndex] : null;

      // Top [limit] players (includes current player if within limit)
      const topPlayers = leaderBoard.slice(0, limit);

      // Players ranked BELOW current player — only when outside top [limit]
      // The number of below players is always fixed at 10
      let aroundPlayers = [];
      if (currentPlayer && currentPlayer.rank > limit) {
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
          currentPlayer,
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
   * GET /api/leaderboard/friends?diffCode=E2
   *
   * Response:
   *   friends      → ALL friends + current player in one ranked list,
   *                  ranks starting from 1, sorted by selected diffCode rating.
   *                  Current player is included here with isCurrentPlayer: true.
   *   currentPlayer → pointer to the current player's entry (same object from friends list)
   */
  static async getFriendsLeaderboard(diffCode, currentUserId) {
    const err = validate(diffCode, currentUserId);
    if (err) throw new Error(err);

    try {
      // Fetch all accepted friendships involving current user
      const friendships = await Friend.find({
        $or: [
          { requester: currentUserId, status: "accepted" },
          { recipient: currentUserId, status: "accepted" },
        ],
      }).lean();

      // Collect friend IDs
      const friendIds = friendships.map((f) =>
        f.requester.toString() === currentUserId.toString()
          ? f.recipient.toString()
          : f.requester.toString(),
      );

      // Include current user so their rank is computed correctly
      friendIds.push(currentUserId.toString());

      // Fetch friends + current user sorted by selected diffCode rating
      const allPlayers = await Player.find({
        _id: { $in: friendIds },
        "accountStatus.state": "active",
      })
        .sort({
          [`pr.pvp.${diffCode}`]: -1,
          username: 1,
          _id: 1,
        })
        .select("username profileImage country pr.pvp stats.pvp")
        .lean();

      // Assign ranks (1-based) across the combined pool (friends + current user)
      const leaderBoard = allPlayers.map((player, index) => ({
        ...buildEntry(player, index + 1, diffCode, currentUserId),
        isFriend: player._id.toString() !== currentUserId.toString(),
      }));

      // currentPlayer is a reference into the same ranked list
      const currentPlayer = leaderBoard.find((p) => p.isCurrentPlayer) || null;

      return {
        success: true,
        diffCode,
        leaderboard: {
          // Full ranked list: all friends + current player, ranks from 1
          friends: leaderBoard,
          // Convenience pointer to current player's entry
          currentPlayer,
        },
        totalCount: leaderBoard.length,
      };
    } catch (error) {
      console.error("Error in getFriendsLeaderboard:", error);
      throw error;
    }
  }
}

module.exports = LeaderboardService;
