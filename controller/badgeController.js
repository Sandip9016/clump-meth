// controller/badgeController.js
const badgeService = require("../services/BadgeService");
const Badge = require("../models/Badge");

/**
 * GET /api/badges/all
 * Public — returns all active badges with iconUrls.
 * Frontend calls this once on app start to preload all badge icons.
 */
exports.getAllBadges = async (req, res) => {
  try {
    const badges = await Badge.find({ isActive: true })
      .sort({ badgeId: 1 })
      .select("badgeId title description unearnedDescription category targetCount iconName iconUrl");

    return res.status(200).json({
      success: true,
      count: badges.length,
      badges,
    });
  } catch (err) {
    console.error("getAllBadges error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/badges/my
 * Returns all badges with this player's progress and earned status.
 */
exports.getMyBadges = async (req, res) => {
  try {
    const playerId = req.user._id.toString();
    const badges = await badgeService.getPlayerBadges(playerId);
    const summary = await badgeService.getBadgeSummary(playerId);

    return res.status(200).json({
      success: true,
      summary,
      badges,
    });
  } catch (err) {
    console.error("getMyBadges error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/badges/my/earned
 * Returns only earned badges for this player.
 */
exports.getMyEarnedBadges = async (req, res) => {
  try {
    const playerId = req.user._id.toString();
    const badges = await badgeService.getEarnedBadges(playerId);

    return res.status(200).json({
      success: true,
      count: badges.length,
      badges,
    });
  } catch (err) {
    console.error("getMyEarnedBadges error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/badges/player/:playerId
 * Get another player's earned badges (public-facing, earned only).
 */
exports.getPlayerBadges = async (req, res) => {
  try {
    const { playerId } = req.params;
    const badges = await badgeService.getEarnedBadges(playerId);

    return res.status(200).json({
      success: true,
      count: badges.length,
      badges,
    });
  } catch (err) {
    console.error("getPlayerBadges error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/badges/event/app-opened
 * Client calls this once per app session start (login / cold open).
 * Handles streak and loyalty badges.
 */
exports.onAppOpened = async (req, res) => {
  try {
    const playerId = req.user._id.toString();
    const newlyEarned = await badgeService.onAppOpened(playerId);

    return res.status(200).json({
      success: true,
      newlyEarned,
    });
  } catch (err) {
    console.error("onAppOpened error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/badges/event/page-visited
 * Body: { page: "theme" | "stats" | "leaderboard" | "analysis" }
 * Client calls this when user navigates to special pages.
 */
exports.onPageVisited = async (req, res) => {
  try {
    const playerId = req.user._id.toString();
    const { page } = req.body;

    if (!page) {
      return res.status(400).json({ success: false, message: "page is required" });
    }

    let newlyEarned = [];

    switch (page) {
      case "theme":
        newlyEarned = await badgeService.onThemePageOpened(playerId);
        break;
      case "stats":
        newlyEarned = await badgeService.onStatsPageOpened(playerId);
        break;
      case "leaderboard":
        newlyEarned = await badgeService.onLeaderboardOpened(playerId);
        break;
      case "analysis":
        newlyEarned = await badgeService.onGameAnalyzed(playerId);
        break;
      default:
        return res.status(400).json({ success: false, message: `Unknown page: ${page}` });
    }

    return res.status(200).json({ success: true, newlyEarned });
  } catch (err) {
    console.error("onPageVisited error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
