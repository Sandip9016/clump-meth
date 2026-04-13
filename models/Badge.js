// models/Badge.js
const mongoose = require("mongoose");

/**
 * Master list of all badges in the system.
 * Stored once — referenced by PlayerBadge documents.
 */
const badgeSchema = new mongoose.Schema(
  {
    badgeId: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    unearnedDescription: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "profile",
        "pvp",
        "computer",
        "practice",
        "matches",
        "infinity",
        "analysis",
        "social",
        "reactions",
        "customization",
        "navigation",
        "loyalty",
        "streak",
      ],
      required: true,
    },
    // For progress-based badges, what is the target number
    targetCount: {
      type: Number,
      default: null,
    },
    iconName: {
      type: String,
      default: null,
    },
    // S3 URL for the badge icon image
    iconUrl: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Badge", badgeSchema);
