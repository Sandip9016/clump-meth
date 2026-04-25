// services/BadgeService.js
/**
 * BadgeService
 * ─────────────────────────────────────────────────────────────────────────────
 * Central service for all badge-related logic.
 * Call the appropriate method from controllers / GameRoom after each event.
 *
 * Principles:
 *  • Never throws — always wraps in try/catch so badge errors NEVER break gameplay.
 *  • Returns an array of newly-earned badge titles so callers can notify the user.
 *  • Idempotent: calling twice for the same event will not double-award a badge.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Badge = require("../models/Badge");
const PlayerBadge = require("../models/PlayerBadge");
const Player = require("../models/Player");

class BadgeService {
  constructor() {
    this.badgeSocket = null; // Set by app.js after initialization
  }

  /**
   * Set the badge socket interface for real-time delivery.
   * Called from app.js during initialization.
   *
   * @param {object} badgeSocket - { emitBadgeEarned, getPlayerSocketId, getConnectedPlayers }
   */
  setBadgeSocket(badgeSocket) {
    this.badgeSocket = badgeSocket;
    console.log("✅ BadgeService socket interface registered");
  }

  // ─────────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────────

  /**
   * Load a badge document by its numeric badgeId.
   * Returns null if not found (badge not seeded yet).
   */
  async _getBadge(badgeId) {
    return Badge.findOne({ badgeId, isActive: true });
  }

  /**
   * Internal method: Emit badge earned via socket if available
   */
  _emitBadgeEarned(playerId, badgeInfo) {
    try {
      if (this.badgeSocket) {
        this.badgeSocket.emitBadgeEarned(playerId, badgeInfo);
      }
    } catch (err) {
      console.error("❌ Error emitting badge via socket:", err);
      // Don't throw — socket emission failure shouldn't break badge earning
    }
  }

  /**
   * Get or create a PlayerBadge progress record for (playerId, badge._id).
   * Returns { playerBadge, isNew }.
   */
  async _getOrCreate(playerId, badge) {
    // Use findOneAndUpdate with upsert to avoid race-condition duplicate key errors
    const pb = await PlayerBadge.findOneAndUpdate(
      { player: playerId, badgeId: badge.badgeId },
      {
        $setOnInsert: {
          player: playerId,
          badge: badge._id,
          badgeId: badge.badgeId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return { playerBadge: pb, isNew: false };
  }

  /**
   * Mark a badge as earned (if not already earned).
   * Returns the badge title if newly earned, null otherwise.
   * Also emits real-time socket notification.
   */
  async _award(playerId, badgeId) {
    const badge = await this._getBadge(badgeId);
    if (!badge) return null;

    const { playerBadge } = await this._getOrCreate(playerId, badge);

    if (playerBadge.isEarned) return null; // already earned

    playerBadge.isEarned = true;
    playerBadge.earnedAt = new Date();
    playerBadge.notified = false; // Mark for offline delivery
    await playerBadge.save();

    console.log(`🏅 Badge earned: [${badge.title}] by player ${playerId}`);

    const badgeInfo = {
      badgeId: badge.badgeId,
      title: badge.title,
      description: badge.description,
      category: badge.category,
      iconName: badge.iconName,
      iconUrl: badge.iconUrl || null,
      earnedAt: playerBadge.earnedAt,
    };

    // ✅ Emit real-time socket notification
    this._emitBadgeEarned(playerId, badgeInfo);

    return badgeInfo;
  }

  /**
   * Increment the progress counter for a progress-based badge.
   * Automatically awards the badge when currentCount >= targetCount.
   * Returns the badge title if newly earned, null otherwise.
   * Also emits real-time socket notification.
   */
  async _incrementProgress(playerId, badgeId) {
    const badge = await this._getBadge(badgeId);
    if (!badge) return null;

    const { playerBadge } = await this._getOrCreate(playerId, badge);

    if (playerBadge.isEarned) return null; // already earned, nothing to do

    playerBadge.currentCount += 1;

    if (badge.targetCount && playerBadge.currentCount >= badge.targetCount) {
      playerBadge.isEarned = true;
      playerBadge.earnedAt = new Date();
      playerBadge.notified = false; // Mark for offline delivery
      console.log(`🏅 Badge earned: [${badge.title}] by player ${playerId}`);
    }

    await playerBadge.save();

    if (playerBadge.isEarned) {
      const badgeInfo = {
        badgeId: badge.badgeId,
        title: badge.title,
        description: badge.description,
        category: badge.category,
        iconName: badge.iconName,
        iconUrl: badge.iconUrl || null,
        earnedAt: playerBadge.earnedAt,
      };

      // ✅ Emit real-time socket notification
      this._emitBadgeEarned(playerId, badgeInfo);

      return badgeInfo;
    }

    return null;
  }

  /**
   * Sync a progress counter to an exact value (used when we read
   * stats directly from Player doc instead of counting events).
   * Returns the badge title if newly earned, null otherwise.
   * Also emits real-time socket notification.
   */
  async _syncProgress(playerId, badgeId, currentCount) {
    const badge = await this._getBadge(badgeId);
    if (!badge) return null;

    const { playerBadge } = await this._getOrCreate(playerId, badge);

    if (playerBadge.isEarned) return null;

    playerBadge.currentCount = currentCount;

    if (badge.targetCount && playerBadge.currentCount >= badge.targetCount) {
      playerBadge.isEarned = true;
      playerBadge.earnedAt = new Date();
      playerBadge.notified = false; // Mark for offline delivery
      console.log(`🏅 Badge earned: [${badge.title}] by player ${playerId}`);
    }

    await playerBadge.save();

    if (playerBadge.isEarned) {
      const badgeInfo = {
        badgeId: badge.badgeId,
        title: badge.title,
        description: badge.description,
        category: badge.category,
        iconName: badge.iconName,
        iconUrl: badge.iconUrl || null,
        earnedAt: playerBadge.earnedAt,
      };

      // ✅ Emit real-time socket notification
      this._emitBadgeEarned(playerId, badgeInfo);

      return badgeInfo;
    }

    return null;
  }

  // ─────────────────────────────────────────────
  // PUBLIC API — called from controllers
  // Each method returns [] or [badgeTitle, ...] of newly earned badges.
  // They NEVER throw.
  // ─────────────────────────────────────────────

  /**
   * Call after a PvP game completes (timer ends OR opponent quits/disconnects).
   * Handles badges: 3 (PvP Beginner), 4 (PvP Competitor), 5 (PvP Veteran),
   *                  12 (Dedicated Player), 13 (Math Marathoner)
   *
   * @param {string} playerId  - MongoDB ObjectId string
   */
  async onPvPGameCompleted(playerId) {
    const earned = [];
    try {
      const player = await Player.findById(playerId);
      if (!player) return earned;

      const pvpTotal =
        (player.stats?.pvp?.E2?.gamesPlayed || 0) +
        (player.stats?.pvp?.E4?.gamesPlayed || 0) +
        (player.stats?.pvp?.M2?.gamesPlayed || 0) +
        (player.stats?.pvp?.M4?.gamesPlayed || 0) +
        (player.stats?.pvp?.H2?.gamesPlayed || 0) +
        (player.stats?.pvp?.H4?.gamesPlayed || 0);

      const overallTotal = player.stats?.overall?.totalGames || 0;

      // PvP-specific badges (badgeIds 3, 4, 5)
      for (const [badgeId, threshold] of [
        [3, 1],
        [4, 10],
        [5, 100],
      ]) {
        const badgeInfo = await this._syncProgress(playerId, badgeId, pvpTotal);
        if (badgeInfo) earned.push(badgeInfo);
      }

      // Overall match badges (badgeIds 12, 13)
      for (const badgeId of [12, 13]) {
        const badgeInfo = await this._syncProgress(
          playerId,
          badgeId,
          overallTotal,
        );
        if (badgeInfo) earned.push(badgeInfo);
      }
    } catch (err) {
      console.error("BadgeService.onPvPGameCompleted error:", err);
    }
    return earned;
  }

  /**
   * Call after a Practice game completes (timer ends).
   * Handles badges: 9 (Practice Rookie), 10 (Practice Regular), 11 (Practice Pro),
   *                  12 (Dedicated Player), 13 (Math Marathoner)
   *
   * @param {string} playerId
   */
  async onPracticeGameCompleted(playerId) {
    const earned = [];
    try {
      const player = await Player.findById(playerId);
      if (!player) return earned;

      const practiceTotal =
        (player.stats?.practice?.E2?.gamesPlayed || 0) +
        (player.stats?.practice?.E4?.gamesPlayed || 0) +
        (player.stats?.practice?.M2?.gamesPlayed || 0) +
        (player.stats?.practice?.M4?.gamesPlayed || 0) +
        (player.stats?.practice?.H2?.gamesPlayed || 0) +
        (player.stats?.practice?.H4?.gamesPlayed || 0);

      const overallTotal = player.stats?.overall?.totalGames || 0;

      // Practice-specific badges (badgeIds 9, 10, 11)
      for (const badgeId of [9, 10, 11]) {
        const badgeInfo = await this._syncProgress(
          playerId,
          badgeId,
          practiceTotal,
        );
        if (badgeInfo) earned.push(badgeInfo);
      }

      // Overall match badges (badgeIds 12, 13)
      for (const badgeId of [12, 13]) {
        const badgeInfo = await this._syncProgress(
          playerId,
          badgeId,
          overallTotal,
        );
        if (badgeInfo) earned.push(badgeInfo);
      }
    } catch (err) {
      console.error("BadgeService.onPracticeGameCompleted error:", err);
    }
    return earned;
  }

  /**
   * Call after a Computer mode game completes.
   * Handles badges: 6, 7, 8 + 12, 13
   *
   * @param {string} playerId
   * @param {number} computerGamesPlayed  - total computer games for this player
   * @param {number} overallGamesPlayed   - total games across all modes
   */
  async onComputerGameCompleted(
    playerId,
    computerGamesPlayed,
    overallGamesPlayed,
  ) {
    const earned = [];
    try {
      for (const badgeId of [6, 7, 8]) {
        const badgeInfo = await this._syncProgress(
          playerId,
          badgeId,
          computerGamesPlayed,
        );
        if (badgeInfo) earned.push(badgeInfo);
      }
      for (const badgeId of [12, 13]) {
        const badgeInfo = await this._syncProgress(
          playerId,
          badgeId,
          overallGamesPlayed,
        );
        if (badgeInfo) earned.push(badgeInfo);
      }
    } catch (err) {
      console.error("BadgeService.onComputerGameCompleted error:", err);
    }
    return earned;
  }

  /**
   * Call when a player starts/plays a match in Infinity (Practice) mode.
   * Handles badges: 14 (Infinity Explorer), 15 (Infinity Seeker)
   *
   * @param {string} playerId
   * @param {number} infinityGamesPlayed
   */
  async onInfinityGamePlayed(playerId, infinityGamesPlayed) {
    const earned = [];
    try {
      for (const badgeId of [14, 15]) {
        const badgeInfo = await this._syncProgress(
          playerId,
          badgeId,
          infinityGamesPlayed,
        );
        if (badgeInfo) earned.push(badgeInfo);
      }
    } catch (err) {
      console.error("BadgeService.onInfinityGamePlayed error:", err);
    }
    return earned;
  }

  /**
   * Call when a player views a game analysis screen.
   * Handles badges: 16 (Analyst), 17 (Insightful Player), 18 (Data Scientist)
   *
   * @param {string} playerId
   */
  async onGameAnalyzed(playerId) {
    const earned = [];
    try {
      for (const badgeId of [16, 17, 18]) {
        const badgeInfo = await this._incrementProgress(playerId, badgeId);
        if (badgeInfo) earned.push(badgeInfo);
      }
    } catch (err) {
      console.error("BadgeService.onGameAnalyzed error:", err);
    }
    return earned;
  }

  /**
   * Call when a player sends a reaction/emoji during a PvP game.
   * Handles badges: 24 (First Reaction), 19 (Expressive Player)
   *
   * @param {string} playerId
   */
  async onReactionSent(playerId) {
    const earned = [];
    try {
      for (const badgeId of [24, 19]) {
        const badgeInfo = await this._incrementProgress(playerId, badgeId);
        if (badgeInfo) earned.push(badgeInfo);
      }
    } catch (err) {
      console.error("BadgeService.onReactionSent error:", err);
    }
    return earned;
  }

  /**
   * Call when a friend request is ACCEPTED (either side gets the badge).
   * Handles badge: 20 (Friendly Connection)
   *
   * @param {string} playerId  - the player who just gained a friend
   */
  async onFriendAdded(playerId) {
    const earned = [];
    try {
      const badgeInfo = await this._award(playerId, 20);
      if (badgeInfo) earned.push(badgeInfo);
    } catch (err) {
      console.error("BadgeService.onFriendAdded error:", err);
    }
    return earned;
  }

  /**
   * Call after Google account is linked to a player.
   * Handles badge: 22 (Google Linked)
   *
   * @param {string} playerId
   */
  async onGoogleLinked(playerId) {
    const earned = [];
    try {
      const badgeInfo = await this._award(playerId, 22);
      if (badgeInfo) earned.push(badgeInfo);
    } catch (err) {
      console.error("BadgeService.onGoogleLinked error:", err);
    }
    return earned;
  }

  /**
   * Call after Facebook account is linked to a player.
   * Handles badge: 21 (Facebook Linked)
   *
   * @param {string} playerId
   */
  async onFacebookLinked(playerId) {
    const earned = [];
    try {
      const badgeInfo = await this._award(playerId, 21);
      if (badgeInfo) earned.push(badgeInfo);
    } catch (err) {
      console.error("BadgeService.onFacebookLinked error:", err);
    }
    return earned;
  }

  /**
   * Call when a player opens the Theme/Numpad customization page.
   * Handles badge: 25 (Customizer)
   *
   * @param {string} playerId
   */
  async onThemePageOpened(playerId) {
    const earned = [];
    try {
      const badgeInfo = await this._award(playerId, 25);
      if (badgeInfo) earned.push(badgeInfo);
    } catch (err) {
      console.error("BadgeService.onThemePageOpened error:", err);
    }
    return earned;
  }

  /**
   * Call when a player opens the Stats page.
   * Handles badge: 26 (Stat Seeker)
   *
   * @param {string} playerId
   */
  async onStatsPageOpened(playerId) {
    const earned = [];
    try {
      const badgeInfo = await this._award(playerId, 26);
      if (badgeInfo) earned.push(badgeInfo);
    } catch (err) {
      console.error("BadgeService.onStatsPageOpened error:", err);
    }
    return earned;
  }

  /**
   * Call when a player opens the Leaderboard page.
   * Handles badge: 27 (Leaderboard Visitor)
   *
   * @param {string} playerId
   */
  async onLeaderboardOpened(playerId) {
    const earned = [];
    try {
      const badgeInfo = await this._award(playerId, 27);
      if (badgeInfo) earned.push(badgeInfo);
    } catch (err) {
      console.error("BadgeService.onLeaderboardOpened error:", err);
    }
    return earned;
  }

  /**
   * Call when a player updates their profile (text fields).
   * Awards badge 1 (Profile Perfectionist) if all required + optional fields filled.
   * Awards badge 2 (Picture Perfect) if profileImage is set.
   *
   * @param {string} playerId
   */
  async onProfileUpdated(playerId) {
    const earned = [];
    try {
      const player = await Player.findById(playerId);
      if (!player) return earned;

      // Badge 2: Picture Perfect
      if (player.profileImage) {
        const badgeInfo = await this._award(playerId, 2);
        if (badgeInfo) earned.push(badgeInfo);
      }

      // Badge 1: Profile Perfectionist — all key fields present
      const hasAll =
        player.firstName &&
        player.lastName &&
        player.gender &&
        player.country &&
        player.dateOfBirth &&
        player.profileImage;

      if (hasAll) {
        const badgeInfo = await this._award(playerId, 1);
        if (badgeInfo) earned.push(badgeInfo);
      }
    } catch (err) {
      console.error("BadgeService.onProfileUpdated error:", err);
    }
    return earned;
  }

  /**
   * Call on every login / app-open event.
   * Handles daily streak badges: 29 (3-Day), 30 (7-Day), 31 (30-Day)
   * Handles loyalty badge:       28 (1-Year Loyal Mathlete)
   *
   * The streak logic:
   *  - If the player opened the app yesterday → increment streak.
   *  - If the player opened the app today already → no-op (idempotent).
   *  - If more than 1 day gap → reset streak to 1.
   *
   * Streak data is stored directly on the Player document in a
   * `badgeTracking` subdocument that we add here.
   *
   * @param {string} playerId
   */
  async onAppOpened(playerId) {
    const earned = [];
    try {
      const player = await Player.findById(playerId);
      if (!player) return earned;

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

      // ── Initialise badgeTracking if missing ──
      if (!player.badgeTracking) {
        player.badgeTracking = {
          lastOpenedDate: null,
          currentStreak: 0,
          appOpenCount: 0,
        };
      }

      const bt = player.badgeTracking;
      const lastStr = bt.lastOpenedDate || null;

      if (lastStr === todayStr) {
        // Already recorded today — no change needed for streak
        // But still check loyalty badge in case it was just missed
      } else {
        bt.appOpenCount = (bt.appOpenCount || 0) + 1;

        if (!lastStr) {
          // First ever open
          bt.currentStreak = 1;
        } else {
          const last = new Date(lastStr);
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().slice(0, 10);

          if (lastStr === yesterdayStr) {
            bt.currentStreak = (bt.currentStreak || 0) + 1;
          } else {
            bt.currentStreak = 1; // streak broken
          }
        }

        bt.lastOpenedDate = todayStr;
        player.markModified("badgeTracking");
        await player.save();
      }

      // ── Streak badges ──
      const streak = bt.currentStreak || 0;
      for (const [badgeId, threshold] of [
        [29, 3],
        [30, 7],
        [31, 30],
      ]) {
        const badgeInfo = await this._syncProgress(playerId, badgeId, streak);
        if (badgeInfo) earned.push(badgeInfo);
      }

      // ── Loyalty badge (badge 28): 1 year anniversary + 12+ opens ──
      if (bt.appOpenCount >= 12) {
        const memberSince = player.createdAt;
        const oneYearLater = new Date(memberSince);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        if (now >= oneYearLater) {
          const badgeInfo = await this._award(playerId, 28);
          if (badgeInfo) earned.push(badgeInfo);
        }
      }
    } catch (err) {
      console.error("BadgeService.onAppOpened error:", err);
    }
    return earned;
  }

  // ─────────────────────────────────────────────
  // QUERY METHODS
  // ─────────────────────────────────────────────

  /**
   * Get all badges with the player's current progress and earned status.
   * Returns a merged array of badge definitions + player progress.
   *
   * @param {string} playerId
   * @returns {Array}
   */
  async getPlayerBadges(playerId) {
    const [allBadges, playerBadges] = await Promise.all([
      Badge.find({ isActive: true }).sort({ badgeId: 1 }),
      PlayerBadge.find({ player: playerId }),
    ]);

    const progressMap = new Map(playerBadges.map((pb) => [pb.badgeId, pb]));

    return allBadges.map((badge) => {
      const pb = progressMap.get(badge.badgeId);
      return {
        badgeId: badge.badgeId,
        title: badge.title,
        description: badge.description,
        unearnedDescription: badge.unearnedDescription,
        category: badge.category,
        targetCount: badge.targetCount,
        iconName: badge.iconName,
        iconUrl: badge.iconUrl || null,
        isEarned: pb?.isEarned || false,
        earnedAt: pb?.earnedAt || null,
        currentCount: pb?.currentCount || 0,
        progress: badge.targetCount
          ? Math.min(
              100,
              Math.floor(((pb?.currentCount || 0) / badge.targetCount) * 100),
            )
          : pb?.isEarned
            ? 100
            : 0,
      };
    });
  }

  /**
   * Get only earned badges for a player.
   *
   * @param {string} playerId
   * @returns {Array}
   */
  async getEarnedBadges(playerId) {
    const all = await this.getPlayerBadges(playerId);
    return all.filter((b) => b.isEarned);
  }

  /**
   * Get count summary: total badges, earned count.
   *
   * @param {string} playerId
   * @returns {{ total: number, earned: number, percentage: number }}
   */
  async getBadgeSummary(playerId) {
    const [total, earned] = await Promise.all([
      Badge.countDocuments({ isActive: true }),
      PlayerBadge.countDocuments({ player: playerId, isEarned: true }),
    ]);
    return {
      total,
      earned,
      percentage: total > 0 ? Math.floor((earned / total) * 100) : 0,
    };
  }
}

// Export a singleton so all modules share the same instance
module.exports = new BadgeService();
