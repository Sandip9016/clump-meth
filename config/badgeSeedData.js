// config/badgeSeedData.js
/**
 * Master badge definitions.
 * iconUrl is built from the EXACT filename in S3:
 * https://clumpcoder-profile-bucket.s3.ap-south-1.amazonaws.com/Badges/icons-svg/
 *
 * Filenames confirmed from icons-svg zip:
 *   01 Profile Perfectionist.svg
 *   02 Picture Perfect.svg
 *   03 PvP Beginner.svg
 *   04 PvP Competitor.svg
 *   05 PvP Veteran.svg
 *   09 Practice Rookie.svg
 *   10 Practice Regular.svg
 *   11 Practice Pro.svg
 *   13 Math Marathoner.svg
 *   20 Friendly Connection.svg
 *   21 Facebook Linked.svg
 *   22 Google Linked.svg
 *   23 Twitter Linked.svg
 *   24 Reactive.svg
 *   25 Customizer.svg
 *   26 Stat Seeker.svg
 *   27 Podium Finish.svg
 *   28 Loyal Mathlete.svg
 *   30 Weekly Warior.svg      ← intentional typo in file, kept as-is
 *   31 3-Day Streak.svg
 *   31 Monthly Masters.svg
 *
 * Badges 6,7,8,12,14,15,16,17,18,19 have no icon file yet — iconUrl is null.
 */

const S3_BASE = "https://clumpcoder-profile-bucket.s3.ap-south-1.amazonaws.com/Badges/icons-svg";

// Builds the S3 URL from the exact filename (spaces become +)
function s3(filename) {
  return `${S3_BASE}/${filename.replace(/ /g, "+")}`;
}

const BADGE_DEFINITIONS = [
  {
    badgeId: 1,
    title: "Profile Perfectionist",
    description: "Completed your full profile with all details.",
    unearnedDescription: "Complete your profile section.",
    category: "profile",
    targetCount: null,
    iconName: "profile_perfectionist",
    iconUrl: s3("01 Profile Perfectionist.svg"),
  },
  {
    badgeId: 2,
    title: "Picture Perfect",
    description: "Added a profile picture for the first time.",
    unearnedDescription: "Add your profile picture.",
    category: "profile",
    targetCount: null,
    iconName: "picture_perfect",
    iconUrl: s3("02 Picture Perfect.svg"),
  },
  {
    badgeId: 3,
    title: "PvP Beginner",
    description: "Completed 1 match in PvP Mode.",
    unearnedDescription: "Complete 1 Match in PvP Mode [0/1]",
    category: "pvp",
    targetCount: 1,
    iconName: "pvp_beginner",
    iconUrl: s3("03 PvP Beginner.svg"),
  },
  {
    badgeId: 4,
    title: "PvP Competitor",
    description: "Completed 10 matches in PvP Mode.",
    unearnedDescription: "Complete 10 Matches in PvP Mode",
    category: "pvp",
    targetCount: 10,
    iconName: "pvp_competitor",
    iconUrl: s3("04 PvP Competitor.svg"),
  },
  {
    badgeId: 5,
    title: "PvP Veteran",
    description: "Completed 100 matches in PvP Mode.",
    unearnedDescription: "Complete 100 Matches in PvP Mode",
    category: "pvp",
    targetCount: 100,
    iconName: "pvp_veteran",
    iconUrl: s3("05 PvP Veteran.svg"),
  },
  {
    badgeId: 6,
    title: "Computer Challenger",
    description: "Completed 1 match in Computer Mode.",
    unearnedDescription: "Complete 1 Match in Computer Mode [0/1]",
    category: "computer",
    targetCount: 1,
    iconName: "computer_challenger",
    iconUrl: null, // no icon file yet
  },
  {
    badgeId: 7,
    title: "Computer Competitor",
    description: "Completed 10 matches in Computer Mode.",
    unearnedDescription: "Complete 10 Matches in Computer Mode",
    category: "computer",
    targetCount: 10,
    iconName: "computer_competitor",
    iconUrl: null,
  },
  {
    badgeId: 8,
    title: "Computer Master",
    description: "Completed 100 matches in Computer Mode.",
    unearnedDescription: "Complete 100 Matches in Computer Mode",
    category: "computer",
    targetCount: 100,
    iconName: "computer_master",
    iconUrl: null,
  },
  {
    badgeId: 9,
    title: "Practice Rookie",
    description: "Completed 1 match in Practice Mode.",
    unearnedDescription: "Complete 1 Match in Practice Mode [0/1]",
    category: "practice",
    targetCount: 1,
    iconName: "practice_rookie",
    iconUrl: s3("09 Practice Rookie.svg"),
  },
  {
    badgeId: 10,
    title: "Practice Regular",
    description: "Completed 10 matches in Practice Mode.",
    unearnedDescription: "Complete 10 Matches in Practice Mode",
    category: "practice",
    targetCount: 10,
    iconName: "practice_regular",
    iconUrl: s3("10 Practice Regular.svg"),
  },
  {
    badgeId: 11,
    title: "Practice Pro",
    description: "Completed 100 matches in Practice Mode.",
    unearnedDescription: "Complete 100 Matches in Practice Mode",
    category: "practice",
    targetCount: 100,
    iconName: "practice_pro",
    iconUrl: s3("11 Practice Pro.svg"),
  },
  {
    badgeId: 12,
    title: "Dedicated Player",
    description: "Completed 500 matches across all game modes.",
    unearnedDescription: "Complete 500 Matches in any Game Mode",
    category: "matches",
    targetCount: 500,
    iconName: "dedicated_player",
    iconUrl: null,
  },
  {
    badgeId: 13,
    title: "Math Marathoner",
    description: "Completed 1000 matches across all game modes.",
    unearnedDescription: "Complete 1000 Matches in any Game Mode",
    category: "matches",
    targetCount: 1000,
    iconName: "math_marathoner",
    iconUrl: s3("13 Math Marathoner.svg"),
  },
  {
    badgeId: 14,
    title: "Infinity Explorer",
    description: "Played 1 match in Infinity (Practice Mode).",
    unearnedDescription: "Play 1 Match in Infinity (Practice Mode). [0/1]",
    category: "infinity",
    targetCount: 1,
    iconName: "infinity_explorer",
    iconUrl: null,
  },
  {
    badgeId: 15,
    title: "Infinity Seeker",
    description: "Played 10 matches in Infinity (Practice Mode).",
    unearnedDescription: "Play 10 Matches in Infinity (Practice Mode)",
    category: "infinity",
    targetCount: 10,
    iconName: "infinity_seeker",
    iconUrl: null,
  },
  {
    badgeId: 16,
    title: "Analyst",
    description: "Analyzed 1 game in any mode.",
    unearnedDescription: "Analyze 1 Game in any mode [0/1]",
    category: "analysis",
    targetCount: 1,
    iconName: "analyst",
    iconUrl: null,
  },
  {
    badgeId: 17,
    title: "Insightful Player",
    description: "Analyzed 10 games in any mode.",
    unearnedDescription: "Analyze 10 Games in any mode",
    category: "analysis",
    targetCount: 10,
    iconName: "insightful_player",
    iconUrl: null,
  },
  {
    badgeId: 18,
    title: "Data Scientist",
    description: "Analyzed 100 games in any mode.",
    unearnedDescription: "Analyze 100 Games in any mode",
    category: "analysis",
    targetCount: 100,
    iconName: "data_scientist",
    iconUrl: null,
  },
  {
    badgeId: 19,
    title: "Expressive Player",
    description: "Sent reactions to an opponent 10 times in PvP Mode.",
    unearnedDescription: "Send Reactions to opponent 10 times in PvP Mode [0/10]",
    category: "reactions",
    targetCount: 10,
    iconName: "expressive_player",
    iconUrl: null,
  },
  {
    badgeId: 20,
    title: "Friendly Connection",
    description: "Added your first friend.",
    unearnedDescription: "Add a Friend.",
    category: "social",
    targetCount: 1,
    iconName: "friendly_connection",
    iconUrl: s3("20 Friendly Connection.svg"),
  },
  {
    badgeId: 21,
    title: "Facebook Linked",
    description: "Connected your Facebook account.",
    unearnedDescription: "Connect your Facebook Account.",
    category: "social",
    targetCount: null,
    iconName: "facebook_linked",
    iconUrl: s3("21 Facebook Linked.svg"),
  },
  {
    badgeId: 22,
    title: "Google Linked",
    description: "Connected your Google account.",
    unearnedDescription: "Connect your Google Account.",
    category: "social",
    targetCount: null,
    iconName: "google_linked",
    iconUrl: s3("22 Google Linked.svg"),
  },
  {
    badgeId: 23,
    title: "X Linked",
    description: "Connected your X account.",
    unearnedDescription: "Connect your X Account.",
    category: "social",
    targetCount: null,
    iconName: "x_linked",
    iconUrl: s3("23 Twitter Linked.svg"), // filename uses "Twitter" not "X"
  },
  {
    badgeId: 24,
    title: "First Reaction",
    description: "Sent a reaction to an opponent for the first time in PvP Mode.",
    unearnedDescription: "Send a Reaction to opponent 1 time in PvP Mode [0/1]",
    category: "reactions",
    targetCount: 1,
    iconName: "first_reaction",
    iconUrl: s3("24 Reactive.svg"), // filename is "Reactive"
  },
  {
    badgeId: 25,
    title: "Customizer",
    description: "Opened the Theme & Numpad section.",
    unearnedDescription: "Open Theme Page.",
    category: "customization",
    targetCount: null,
    iconName: "customizer",
    iconUrl: s3("25 Customizer.svg"),
  },
  {
    badgeId: 26,
    title: "Stat Seeker",
    description: "Opened the Stats page.",
    unearnedDescription: "Open Stats Page.",
    category: "navigation",
    targetCount: null,
    iconName: "stat_seeker",
    iconUrl: s3("26 Stat Seeker.svg"),
  },
  {
    badgeId: 27,
    title: "Leaderboard Visitor",
    description: "Visited the Leaderboard page.",
    unearnedDescription: "Open Leaderboard Page.",
    category: "navigation",
    targetCount: null,
    iconName: "leaderboard_visitor",
    iconUrl: s3("27 Podium Finish.svg"), // filename is "Podium Finish"
  },
  {
    badgeId: 28,
    title: "Loyal Mathlete",
    description: "Celebrating 1 year with the game!",
    unearnedDescription: "Complete 1 Year on the Game.",
    category: "loyalty",
    targetCount: null,
    iconName: "loyal_mathlete",
    iconUrl: s3("28 Loyal Mathlete.svg"),
  },
  {
    badgeId: 29,
    title: "3-Day Streak",
    description: "Opened the app on 3 consecutive days.",
    unearnedDescription: "Open the app consecutively for 3 days.",
    category: "streak",
    targetCount: 3,
    iconName: "streak_3",
    iconUrl: s3("31 3-Day Streak.svg"), // file is numbered 31
  },
  {
    badgeId: 30,
    title: "Weekly Warrior",
    description: "Opened the app on 7 consecutive days.",
    unearnedDescription: "Open the app consecutively for 7 days.",
    category: "streak",
    targetCount: 7,
    iconName: "streak_7",
    iconUrl: s3("30 Weekly Warior.svg"), // intentional typo in filename
  },
  {
    badgeId: 31,
    title: "Monthly Master",
    description: "Opened the app on 30 consecutive days.",
    unearnedDescription: "Open the app consecutively for 30 days.",
    category: "streak",
    targetCount: 30,
    iconName: "streak_30",
    iconUrl: s3("31 Monthly Masters.svg"), // file uses "Masters"
  },
];

module.exports = BADGE_DEFINITIONS;
