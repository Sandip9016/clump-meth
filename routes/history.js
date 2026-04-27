// routes/history.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const historyController = require("../controller/historyController");

// Unified mixed feed (home page + full history page)
// GET /api/history/feed?limit=20&skip=0&month=2026-04
router.get("/feed", auth, historyController.getHistoryFeed);

// Per-mode history
// GET /api/history/pvp?limit=20&skip=0&month=2026-04
router.get("/pvp", auth, historyController.getPVPHistory);

// GET /api/history/computer?limit=20&skip=0&month=2026-04&level=3
router.get("/computer", auth, historyController.getComputerHistory);

// GET /api/history/practice?limit=20&skip=0&month=2026-04
router.get("/practice", auth, historyController.getPracticeHistory);

// Single game detail (opens completion screen)
// GET /api/history/:gameMode/:gameId
// gameMode = pvp | computer | practice
router.get("/:gameMode/:gameId", auth, historyController.getGameDetail);

module.exports = router;
