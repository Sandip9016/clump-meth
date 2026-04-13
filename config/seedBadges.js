// config/seedBadges.js
/**
 * Upserts all badge definitions into the Badge collection.
 * Called once during app startup after MongoDB connects.
 * Safe to run multiple times — uses upsert so existing badges are updated.
 */

const Badge = require("../models/Badge");
const BADGE_DEFINITIONS = require("./badgeSeedData");

async function seedBadges() {
  try {
    let created = 0;
    let updated = 0;

    for (const def of BADGE_DEFINITIONS) {
      const result = await Badge.findOneAndUpdate(
        { badgeId: def.badgeId },
        { $set: def },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    }

    console.log(
      `✅ Badge seed complete — ${created} created, ${updated} updated (${BADGE_DEFINITIONS.length} total)`,
    );
  } catch (err) {
    console.error("❌ Badge seed failed:", err);
  }
}

module.exports = { seedBadges };
