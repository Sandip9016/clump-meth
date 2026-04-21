// routes/computerGame.js
const express = require("express");
const auth = require("../middleware/auth");
const computerGameController = require("../controller/computerGameController");

const router = express.Router();

/**
 * Get computer mode stats for authenticated player
 */
router.get("/stats", auth, computerGameController.getComputerStats);

/**
 * Get computer game history for authenticated player
 */
router.get("/history", auth, computerGameController.getComputerGameHistory);

/**
 * Get specific computer game details
 */
router.get("/:gameId", auth, computerGameController.getComputerGameDetails);

module.exports = router;
