// config/computerModeConfig.js
// Computer Mode Phase 1 - Fixed Parameters
// Based on Computer Mode Spec v1.2

module.exports = {
  // Game Timing Configuration
  gameTiming: {
    "1-minute": {
      totalDuration: 60,
      transitionDelay: 500, // ms between questions
    },
    "2-minute": {
      totalDuration: 120,
      transitionDelay: 500,
    },
    "3-minute": {
      totalDuration: 180,
      transitionDelay: 500,
    },
  },

  // Base response time delays by question level tag
  responseTimeDelays: {
    easy: { min: 1.2, max: 2.8 }, // Q level 1-3
    medium: { min: 2.5, max: 5.0 }, // Q level 4-6
    hard: { min: 4.5, max: 8.0 }, // Q level 7-9
    maximum: { min: 6.0, max: 12.0 }, // Q level 10
  },

  // Computer Level Profiles (Levels 1-5)
  computerLevels: {
    1: {
      displayName: "Beginner",
      description: "Frequent mistakes, slow, rarely streaks",

      accuracy: {
        baseMin: 55,
        baseMax: 68,
        floor: 30, // Minimum accuracy clamp
        difficultyPenalties: {
          easy: 0, // Q level 1-3
          medium: -8, // Q level 4-6
          hard: -18, // Q level 7-9
          maximum: -28, // Q level 10
        },
      },

      responseTime: {
        multiplier: 1.3, // Slower - hesitates more
      },

      skipProbability: {
        easy: 12, // %
        medium: 22,
        hard: 35,
        maximum: 45,
      },
    },

    2: {
      displayName: "Amateur",
      description: "Answers most easy Qs, struggles above Q-level 5",

      accuracy: {
        baseMin: 66,
        baseMax: 78,
        floor: 40,
        difficultyPenalties: {
          easy: 0,
          medium: -8,
          hard: -18,
          maximum: -28,
        },
      },

      responseTime: {
        multiplier: 1.15, // Slightly slower than baseline
      },

      skipProbability: {
        easy: 7,
        medium: 15,
        hard: 26,
        maximum: 34,
      },
    },

    3: {
      displayName: "Skilled",
      description: "Solid mid-game, occasional slumps on hard Qs",

      accuracy: {
        baseMin: 75,
        baseMax: 86,
        floor: 50,
        difficultyPenalties: {
          easy: 0,
          medium: -8,
          hard: -18,
          maximum: -28,
        },
      },

      responseTime: {
        multiplier: 1.0, // Baseline
      },

      skipProbability: {
        easy: 4,
        medium: 9,
        hard: 17,
        maximum: 24,
      },
    },

    4: {
      displayName: "Expert",
      description: "High accuracy, fast, long streaks, rare skips",

      accuracy: {
        baseMin: 84,
        baseMax: 93,
        floor: 60,
        difficultyPenalties: {
          easy: 0,
          medium: -8,
          hard: -18,
          maximum: -28,
        },
      },

      responseTime: {
        multiplier: 0.88, // Faster
      },

      skipProbability: {
        easy: 2,
        medium: 5,
        hard: 10,
        maximum: 15,
      },
    },

    5: {
      displayName: "Pro",
      description: "Near-perfect on easy/medium, competitive on hard",

      accuracy: {
        baseMin: 90,
        baseMax: 97,
        floor: 70,
        difficultyPenalties: {
          easy: 0,
          medium: -8,
          hard: -18,
          maximum: -28,
        },
      },

      responseTime: {
        multiplier: 0.75, // Fastest
      },

      skipProbability: {
        easy: 1,
        medium: 3,
        hard: 6,
        maximum: 10,
      },
    },
  },

  // Question level tag mapping to bands
  questionLevelBandMap: {
    easy: [1, 2, 3],
    medium: [4, 5, 6],
    hard: [7, 8, 9],
    maximum: [10],
  },

  // Utility function to get question band from level tag
  getQuestionBand(levelTag) {
    if (levelTag >= 1 && levelTag <= 3) return "easy";
    if (levelTag >= 4 && levelTag <= 6) return "medium";
    if (levelTag >= 7 && levelTag <= 9) return "hard";
    if (levelTag === 10) return "maximum";
    return "easy"; // fallback
  },

  // Player rating brackets to question difficulty
  ratingToDifficulty: {
    easy: { minRating: 0, maxRating: 799 },
    medium: { minRating: 800, maxRating: 1399 },
    hard: { minRating: 1400, maxRating: Infinity },
  },

  // Utility function to get question difficulty based on player rating
  getDifficultyByRating(rating) {
    if (rating < 800) return "easy";
    if (rating < 1400) return "medium";
    return "hard";
  },
};
