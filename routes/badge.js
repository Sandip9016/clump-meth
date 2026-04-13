// routes/badge.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const badgeController = require("../controller/badgeController");

// ── All badges with iconUrls (public — frontend preloads on app start) ──
router.get("/all", badgeController.getAllBadges);

// ── Player's own badges ──
router.get("/my", auth, badgeController.getMyBadges);
router.get("/my/earned", auth, badgeController.getMyEarnedBadges);

// ── Another player's earned badges (public) ──
router.get("/player/:playerId", auth, badgeController.getPlayerBadges);

// ── Client-triggered events ──
router.post("/event/app-opened", auth, badgeController.onAppOpened);
router.post("/event/page-visited", auth, badgeController.onPageVisited);

module.exports = router;
