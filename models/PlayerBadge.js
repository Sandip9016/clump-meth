// models/PlayerBadge.js
const mongoose = require("mongoose");

/**
 * Tracks a player's progress toward and earning of each badge.
 * One document per (player, badge) pair.
 */
const playerBadgeSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    badge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Badge",
      required: true,
    },
    badgeId: {
      type: Number,
      required: true,
    },
    isEarned: {
      type: Boolean,
      default: false,
    },
    earnedAt: {
      type: Date,
      default: null,
    },
    // For progress-based badges (e.g. play 10 PvP games)
    currentCount: {
      type: Number,
      default: 0,
    },
    // Whether the player has been notified about earning this badge
    notified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Compound unique index — one record per player per badge
playerBadgeSchema.index({ player: 1, badge: 1 }, { unique: true });
playerBadgeSchema.index({ player: 1, isEarned: 1 });
playerBadgeSchema.index({ player: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model("PlayerBadge", playerBadgeSchema);
