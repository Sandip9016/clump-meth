// models/Player.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const playerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: false,
      trim: true,
    },
    lastName: {
      type: String,
      required: false,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // ✅ Password only required for LOCAL users
    password: {
      type: String,
      minlength: 6,
      required: function () {
        return !this.authProviders || this.authProviders.includes("local");
      },
    },

    // ✅ Multi-auth support
    authProviders: {
      type: [String],
      enum: ["local", "google", "facebook"],
      default: ["local"],
    },

    // ✅ NEW: Google ID
    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values
    },

    // ✅ ADD THIS
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: false,
    },
    country: {
      type: String,
      required: false,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    profileImage: {
      type: String,
      default: null,
    },

    // ✅ Personal Records / Ratings (ELO-style)
    pr: {
      practice: {
        E2: { type: Number, default: 1000 },
        E4: { type: Number, default: 1000 },
        M2: { type: Number, default: 1000 },
        M4: { type: Number, default: 1000 },
        H2: { type: Number, default: 1000 },
        H4: { type: Number, default: 1000 },
      },
      pvp: {
        E2: { type: Number, default: 1000 },
        E4: { type: Number, default: 1000 },
        M2: { type: Number, default: 1000 },
        M4: { type: Number, default: 1000 },
        H2: { type: Number, default: 1000 },
        H4: { type: Number, default: 1000 },
      },
      // ✅ Computer Mode Ratings (by level + diffCode)
      computer: {
        level1: {
          E2: { type: Number, default: 1000 },
          E4: { type: Number, default: 1000 },
          M2: { type: Number, default: 1000 },
          M4: { type: Number, default: 1000 },
          H2: { type: Number, default: 1000 },
          H4: { type: Number, default: 1000 },
        },
        level2: {
          E2: { type: Number, default: 1000 },
          E4: { type: Number, default: 1000 },
          M2: { type: Number, default: 1000 },
          M4: { type: Number, default: 1000 },
          H2: { type: Number, default: 1000 },
          H4: { type: Number, default: 1000 },
        },
        level3: {
          E2: { type: Number, default: 1000 },
          E4: { type: Number, default: 1000 },
          M2: { type: Number, default: 1000 },
          M4: { type: Number, default: 1000 },
          H2: { type: Number, default: 1000 },
          H4: { type: Number, default: 1000 },
        },
        level4: {
          E2: { type: Number, default: 1000 },
          E4: { type: Number, default: 1000 },
          M2: { type: Number, default: 1000 },
          M4: { type: Number, default: 1000 },
          H2: { type: Number, default: 1000 },
          H4: { type: Number, default: 1000 },
        },
        level5: {
          E2: { type: Number, default: 1000 },
          E4: { type: Number, default: 1000 },
          M2: { type: Number, default: 1000 },
          M4: { type: Number, default: 1000 },
          H2: { type: Number, default: 1000 },
          H4: { type: Number, default: 1000 },
        },
      },
    },

    // ✅ NEW: Game Statistics
    stats: {
      // Practice Mode Stats
      practice: {
        E2: {
          gamesPlayed: { type: Number, default: 0 },
          highScore: { type: Number, default: 0 },
          totalScore: { type: Number, default: 0 },
          averageScore: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
        E4: {
          gamesPlayed: { type: Number, default: 0 },
          highScore: { type: Number, default: 0 },
          totalScore: { type: Number, default: 0 },
          averageScore: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
        M2: {
          gamesPlayed: { type: Number, default: 0 },
          highScore: { type: Number, default: 0 },
          totalScore: { type: Number, default: 0 },
          averageScore: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
        M4: {
          gamesPlayed: { type: Number, default: 0 },
          highScore: { type: Number, default: 0 },
          totalScore: { type: Number, default: 0 },
          averageScore: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
        H2: {
          gamesPlayed: { type: Number, default: 0 },
          highScore: { type: Number, default: 0 },
          totalScore: { type: Number, default: 0 },
          averageScore: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
        H4: {
          gamesPlayed: { type: Number, default: 0 },
          highScore: { type: Number, default: 0 },
          totalScore: { type: Number, default: 0 },
          averageScore: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
      },

      // PvP Mode Stats
      pvp: {
        E2: {
          gamesPlayed: { type: Number, default: 0 },
          wins: { type: Number, default: 0 },
          losses: { type: Number, default: 0 },
          draws: { type: Number, default: 0 },
          winRate: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
        E4: {
          gamesPlayed: { type: Number, default: 0 },
          wins: { type: Number, default: 0 },
          losses: { type: Number, default: 0 },
          draws: { type: Number, default: 0 },
          winRate: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
        M2: {
          gamesPlayed: { type: Number, default: 0 },
          wins: { type: Number, default: 0 },
          losses: { type: Number, default: 0 },
          draws: { type: Number, default: 0 },
          winRate: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
        M4: {
          gamesPlayed: { type: Number, default: 0 },
          wins: { type: Number, default: 0 },
          losses: { type: Number, default: 0 },
          draws: { type: Number, default: 0 },
          winRate: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
        H2: {
          gamesPlayed: { type: Number, default: 0 },
          wins: { type: Number, default: 0 },
          losses: { type: Number, default: 0 },
          draws: { type: Number, default: 0 },
          winRate: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
        H4: {
          gamesPlayed: { type: Number, default: 0 },
          wins: { type: Number, default: 0 },
          losses: { type: Number, default: 0 },
          draws: { type: Number, default: 0 },
          winRate: { type: Number, default: 0 },
          currentStreak: { type: Number, default: 0 },
          bestStreak: { type: Number, default: 0 },
          totalCorrect: { type: Number, default: 0 },
          totalIncorrect: { type: Number, default: 0 },
          totalSkipped: { type: Number, default: 0 },
          totalTimeSpent: { type: Number, default: 0 },
          totalQuestionsAnswered: { type: Number, default: 0 },
        },
      },

      // ✅ Overall Stats (all difficulties combined)
      overall: {
        totalGames: { type: Number, default: 0 },
        totalWins: { type: Number, default: 0 },
        totalLosses: { type: Number, default: 0 },
        totalDraws: { type: Number, default: 0 },
        overallWinRate: { type: Number, default: 0 },
      },

      // ✅ Computer Mode Stats (by level + diffCode)
      computer: {
        level1: {
          E2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          E4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          M2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          M4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          H2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          H4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
        },
        level2: {
          E2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          E4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          M2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          M4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          H2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          H4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
        },
        level3: {
          E2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          E4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          M2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          M4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          H2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          H4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
        },
        level4: {
          E2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          E4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          M2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          M4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          H2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          H4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
        },
        level5: {
          E2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          E4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          M2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          M4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          H2: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
          H4: {
            gamesPlayed: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            winRate: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            highScore: { type: Number, default: 0 },
            averageScore: { type: Number, default: 0 },
          },
        },
      },
    },

    // ✅ NEW: All-Time Best Stats (per diffCode)
    allTimeBest: {
      practice: {
        E2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
      pvp: {
        E2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
    },

    // ✅ NEW: Monthly Stats Array
    monthlyStats: [
      {
        month: { type: String, required: true }, // Format: "2024-01"
        mode: { type: String, enum: ["practice", "pvp"], required: true },
        diffCode: {
          type: String,
          enum: ["E2", "E4", "M2", "M4", "H2", "H4"],
          required: true,
        },
        // Practice stats
        highScore: { type: Number, default: 0 },
        bestStreak: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        // PVP stats
        bestWin: {
          username: { type: String, default: "" },
          rating: { type: Number, default: 0 },
        },
        longestStreak: { type: Number, default: 0 },
        highestRating: { type: Number, default: 1000 },
        // Common stats
        questionsPerSecond: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        totalCorrect: { type: Number, default: 0 },
        totalIncorrect: { type: Number, default: 0 },
        totalSkipped: { type: Number, default: 0 },
        totalTimeSpent: { type: Number, default: 0 },
        totalQuestionsAnswered: { type: Number, default: 0 },
      },
    ],

    // ✅ NEW: Pre-Computed Best Stats for All Time Periods
    weekBest: {
      practice: {
        E2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
      pvp: {
        E2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
    },
    monthBest: {
      practice: {
        E2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
      pvp: {
        E2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
    },
    threeMonthsBest: {
      practice: {
        E2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
      pvp: {
        E2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
    },
    sixMonthsBest: {
      practice: {
        E2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
      pvp: {
        E2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
    },
    yearBest: {
      practice: {
        E2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
      pvp: {
        E2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        E4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        M4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H2: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
        H4: {
          bestWin: {
            username: { type: String, default: "" },
            rating: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          longestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          highestRating: {
            value: { type: Number, default: 1000 },
            date: { type: Date, default: Date.now },
          },
          bestStreak: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestAccuracy: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
          bestQuestionsPerSecond: {
            value: { type: Number, default: 0 },
            date: { type: Date, default: Date.now },
          },
        },
      },
    },

    // ✅ NEW: Game Preferences
    preferences: {
      defaultDifficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium",
      },
      defaultTimer: {
        type: Number,
        enum: [30, 60, 90],
        default: 60,
      },
      defaultSymbols: {
        type: [String],
        default: ["sum", "difference", "product", "quotient"],
      },
      soundEnabled: {
        type: Boolean,
        default: true,
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
    },

    // ✅ Badge system tracking (streak + loyalty)
    badgeTracking: {
      lastOpenedDate: { type: String, default: null }, // "YYYY-MM-DD"
      currentStreak: { type: Number, default: 0 },
      appOpenCount: { type: Number, default: 0 },
    },

    fcmToken: {
      type: String,
      required: false,
    },

    accountStatus: {
      state: {
        type: String,
        enum: ["active", "inactive", "blocked"],
        default: "active",
      },
      reason: {
        type: String,
        default: "Active User",
      },
      changedAt: {
        type: Date,
        default: Date.now,
      },
      lastActiveAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ================================
// PRE-SAVE HOOKS
// ================================

// Hash password before saving
playerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ================================
// INSTANCE METHODS
// ================================

// Compare password
playerSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ✅ NEW: Update PvP stats after a game
playerSchema.methods.updatePvPStats = function (
  diffCode,
  won,
  draw = false,
  opponentRating = 0,
  opponentUsername = "",
  questionHistory = [],
  playerRatingAfter = 0,
) {
  const diffStats = this.stats.pvp[diffCode];
  const currentMonth = new Date().toISOString().slice(0, 7); // "2024-01"

  // Increment games played
  diffStats.gamesPlayed++;

  // Update win/loss/draw
  if (draw) {
    diffStats.draws++;
  } else if (won) {
    diffStats.wins++;
    diffStats.currentStreak++;
    if (diffStats.currentStreak > diffStats.bestStreak) {
      diffStats.bestStreak = diffStats.currentStreak;
    }
  } else {
    diffStats.losses++;
    diffStats.currentStreak = 0; // Reset streak on loss
  }

  // Calculate win rate
  if (diffStats.gamesPlayed > 0) {
    diffStats.winRate = Math.round(
      (diffStats.wins / diffStats.gamesPlayed) * 100,
    );
  }

  // Calculate question statistics
  let correct = 0,
    incorrect = 0,
    skipped = 0,
    totalTime = 0;

  questionHistory.forEach((q) => {
    const playerResponse = q.player1Response || q.player2Response;
    if (playerResponse) {
      totalTime += playerResponse.timeSpent || 0;

      if (playerResponse.answer === null || playerResponse.answer === "") {
        skipped++;
      } else if (playerResponse.isCorrect) {
        correct++;
      } else {
        incorrect++;
      }
    }
  });

  // Update detailed stats
  diffStats.totalCorrect += correct;
  diffStats.totalIncorrect += incorrect;
  diffStats.totalSkipped += skipped;
  diffStats.totalTimeSpent += totalTime;
  diffStats.totalQuestionsAnswered += questionHistory.length;

  // Update all-time best
  const allTimeBest = this.allTimeBest.pvp[diffCode];

  if (won && opponentRating > allTimeBest.bestWin.rating) {
    allTimeBest.bestWin.username = opponentUsername;
    allTimeBest.bestWin.rating = opponentRating;
    allTimeBest.bestWin.date = new Date();
  }

  if (diffStats.bestStreak > allTimeBest.longestStreak.value) {
    allTimeBest.longestStreak.value = diffStats.bestStreak;
    allTimeBest.longestStreak.date = new Date();
  }

  if (playerRatingAfter > allTimeBest.highestRating.value) {
    allTimeBest.highestRating.value = playerRatingAfter;
    allTimeBest.highestRating.date = new Date();
  }

  const questionsPerSecond =
    diffStats.totalTimeSpent > 0
      ? diffStats.totalQuestionsAnswered / (diffStats.totalTimeSpent / 1000)
      : 0;
  if (questionsPerSecond > allTimeBest.bestQuestionsPerSecond.value) {
    allTimeBest.bestQuestionsPerSecond.value = questionsPerSecond;
    allTimeBest.bestQuestionsPerSecond.date = new Date();
  }

  // Update overall stats
  this.stats.overall.totalGames++;
  if (draw) {
    this.stats.overall.totalDraws++;
  } else if (won) {
    this.stats.overall.totalWins++;
  } else {
    this.stats.overall.totalLosses++;
  }

  // Calculate overall win rate
  if (this.stats.overall.totalGames > 0) {
    this.stats.overall.overallWinRate = Math.round(
      (this.stats.overall.totalWins / this.stats.overall.totalGames) * 100,
    );
  }

  // Update monthly stats
  this.updateMonthlyStats(currentMonth, "pvp", diffCode, {
    bestWin: won
      ? { username: opponentUsername, rating: opponentRating }
      : allTimeBest.bestWin,
    longestStreak: diffStats.bestStreak,
    highestRating: playerRatingAfter,
    questionsPerSecond: questionsPerSecond,
    gamesPlayed: diffStats.gamesPlayed,
    wins: diffStats.wins,
    losses: diffStats.losses,
    draws: diffStats.draws,
    totalCorrect: diffStats.totalCorrect,
    totalIncorrect: diffStats.totalIncorrect,
    totalSkipped: diffStats.totalSkipped,
    totalTimeSpent: diffStats.totalTimeSpent,
    totalQuestionsAnswered: diffStats.totalQuestionsAnswered,
  });

  return this.save();
};

// ✅ NEW: Update practice stats after a game
playerSchema.methods.updatePracticeStats = function (
  diffCode,
  score,
  questionHistory = [],
) {
  const diffStats = this.stats.practice[diffCode];
  const currentMonth = new Date().toISOString().slice(0, 7); // "2024-01"

  // Increment games played
  diffStats.gamesPlayed++;

  // Update high score
  if (score > diffStats.highScore) {
    diffStats.highScore = score;
  }

  // Update total and average score
  diffStats.totalScore += score;
  diffStats.averageScore = Math.round(
    diffStats.totalScore / diffStats.gamesPlayed,
  );

  // Calculate question statistics
  let correct = 0,
    incorrect = 0,
    skipped = 0,
    totalTime = 0,
    currentStreak = 0,
    maxStreak = 0;

  questionHistory.forEach((q) => {
    totalTime += q.playerResponse.timeSpent || 0;

    if (q.playerResponse.skipped) {
      skipped++;
      currentStreak = 0;
    } else if (q.playerResponse.isCorrect) {
      correct++;
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      incorrect++;
      currentStreak = 0;
    }
  });

  // Update detailed stats
  diffStats.totalCorrect += correct;
  diffStats.totalIncorrect += incorrect;
  diffStats.totalSkipped += skipped;
  diffStats.totalTimeSpent += totalTime;
  diffStats.totalQuestionsAnswered += questionHistory.length;

  // Update streak
  diffStats.currentStreak = questionHistory[questionHistory.length - 1]
    ?.playerResponse.isCorrect
    ? diffStats.currentStreak + 1
    : 0;
  diffStats.bestStreak = Math.max(
    diffStats.bestStreak,
    diffStats.currentStreak,
    maxStreak,
  );

  // Update all-time best
  const allTimeBest = this.allTimeBest.practice[diffCode];
  if (diffStats.bestStreak > allTimeBest.bestStreak.value) {
    allTimeBest.bestStreak.value = diffStats.bestStreak;
    allTimeBest.bestStreak.date = new Date();
  }

  const accuracy =
    diffStats.totalQuestionsAnswered > 0
      ? (diffStats.totalCorrect / diffStats.totalQuestionsAnswered) * 100
      : 0;
  if (accuracy > allTimeBest.bestAccuracy.value) {
    allTimeBest.bestAccuracy.value = accuracy;
    allTimeBest.bestAccuracy.date = new Date();
  }

  const questionsPerSecond =
    diffStats.totalTimeSpent > 0
      ? diffStats.totalQuestionsAnswered / (diffStats.totalTimeSpent / 1000)
      : 0;
  if (questionsPerSecond > allTimeBest.bestQuestionsPerSecond.value) {
    allTimeBest.bestQuestionsPerSecond.value = questionsPerSecond;
    allTimeBest.bestQuestionsPerSecond.date = new Date();
  }

  // Update monthly stats
  this.updateMonthlyStats(currentMonth, "practice", diffCode, {
    highScore: diffStats.highScore,
    bestStreak: diffStats.bestStreak,
    accuracy: accuracy,
    questionsPerSecond: questionsPerSecond,
    gamesPlayed: diffStats.gamesPlayed,
    totalCorrect: diffStats.totalCorrect,
    totalIncorrect: diffStats.totalIncorrect,
    totalSkipped: diffStats.totalSkipped,
    totalTimeSpent: diffStats.totalTimeSpent,
    totalQuestionsAnswered: diffStats.totalQuestionsAnswered,
  });

  return this.save();
};

// ✅ NEW: Get player's current rating for a specific mode
playerSchema.methods.getRating = function (mode, difficulty) {
  return this.pr[mode][difficulty];
};

// ✅ NEW: Update player's rating
playerSchema.methods.updateRating = function (mode, difficulty, delta) {
  this.pr[mode][difficulty] += delta;

  // Ensure rating doesn't go below 0
  if (this.pr[mode][difficulty] < 0) {
    this.pr[mode][difficulty] = 0;
  }

  return this.save();
};

// ✅ NEW: Get player's stats for matchmaking
playerSchema.methods.getMatchmakingData = function () {
  return {
    id: this._id,
    username: this.username,
    rating: this.pr.pvp[this.preferences.defaultDifficulty],
    diff: this.preferences.defaultDifficulty,
    timer: this.preferences.defaultTimer,
    symbol: this.preferences.defaultSymbols,
    email: this.email,
  };
};

// ✅ NEW: Get player profile summary
playerSchema.methods.getProfileSummary = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    profileImage: this.profileImage,
    country: this.country,
    ratings: {
      practice: this.pr.practice,
      pvp: this.pr.pvp,
    },
    stats: {
      overall: this.stats.overall,
      pvpByDiffCode: this.stats.pvp,
    },
    preferences: this.preferences,
    accountStatus: this.accountStatus.state,
    memberSince: this.createdAt,
  };
};

// ✅ NEW: Update monthly stats
playerSchema.methods.updateMonthlyStats = function (
  month,
  mode,
  diffCode,
  stats,
) {
  // Find existing monthly stat entry
  const existingIndex = this.monthlyStats.findIndex(
    (stat) =>
      stat.month === month && stat.mode === mode && stat.diffCode === diffCode,
  );

  const monthlyData = {
    month,
    mode,
    diffCode,
    ...stats,
  };

  if (existingIndex !== -1) {
    // Update existing entry
    Object.assign(this.monthlyStats[existingIndex], monthlyData);
  } else {
    // Add new entry
    this.monthlyStats.push(monthlyData);
  }

  // Keep only last 12 months of data to prevent array growth
  this.monthlyStats.sort((a, b) => b.month.localeCompare(a.month));
  if (this.monthlyStats.length > 72) {
    // 12 months × 6 diffCodes
    this.monthlyStats = this.monthlyStats.slice(0, 72);
  }
};

// ✅ NEW: Update last active timestamp
playerSchema.methods.updateLastActive = function () {
  this.accountStatus.lastActiveAt = new Date();
  return this.save();
};

// ✅ NEW: Update pre-computed best stats for all time periods
playerSchema.methods.updateBestStats = function (
  mode,
  diffCode,
  newAchievement,
  timeFilter,
) {
  const now = new Date();
  const timeBestMap = {
    "1week": "weekBest",
    "1month": "monthBest",
    "3months": "threeMonthsBest",
    "6months": "sixMonthsBest",
    "1year": "yearBest",
    alltime: "allTimeBest",
  };

  const timeField = timeBestMap[timeFilter];
  if (!timeField) return this;

  // Update the specific time period field
  if (!this[timeField]) this[timeField] = {};
  if (!this[timeField][mode]) this[timeField][mode] = {};
  if (!this[timeField][mode][diffCode]) this[timeField][mode][diffCode] = {};

  const currentBest = this[timeField][mode][diffCode];

  // Update each achievement type if it's better than current
  if (
    newAchievement.bestStreak &&
    newAchievement.bestStreak.value > currentBest.bestStreak.value
  ) {
    this[timeField][mode][diffCode].bestStreak = {
      value: newAchievement.bestStreak.value,
      date: now,
    };
  }

  if (
    newAchievement.bestAccuracy &&
    newAchievement.bestAccuracy.value > currentBest.bestAccuracy.value
  ) {
    this[timeField][mode][diffCode].bestAccuracy = {
      value: newAchievement.bestAccuracy.value,
      date: now,
    };
  }

  if (
    newAchievement.bestQuestionsPerSecond &&
    newAchievement.bestQuestionsPerSecond.value >
      currentBest.bestQuestionsPerSecond.value
  ) {
    this[timeField][mode][diffCode].bestQuestionsPerSecond = {
      value: newAchievement.bestQuestionsPerSecond.value,
      date: now,
    };
  }

  // PVP-specific achievements
  if (mode === "pvp") {
    if (
      newAchievement.bestWin &&
      newAchievement.bestWin.rating > currentBest.bestWin.rating
    ) {
      this[timeField][mode][diffCode].bestWin = {
        username: newAchievement.bestWin.username,
        rating: newAchievement.bestWin.rating,
        date: now,
      };
    }

    if (
      newAchievement.longestStreak &&
      newAchievement.longestStreak.value > currentBest.longestStreak.value
    ) {
      this[timeField][mode][diffCode].longestStreak = {
        value: newAchievement.longestStreak.value,
        date: now,
      };
    }

    if (
      newAchievement.highestRating &&
      newAchievement.highestRating.value > currentBest.highestRating.value
    ) {
      this[timeField][mode][diffCode].highestRating = {
        value: newAchievement.highestRating.value,
        date: now,
      };
    }
  }

  return this.save();
};

// ================================
// VIRTUAL PROPERTIES
// ================================

// ✅ Virtual: Total PvP games played (all diffCodes)
playerSchema.virtual("totalPvPGames").get(function () {
  return ["E2", "E4", "M2", "M4", "H2", "H4"].reduce(
    (sum, code) => sum + (this.stats.pvp[code]?.gamesPlayed || 0),
    0,
  );
});

// ✅ Virtual: Total practice games played (all diffCodes)
playerSchema.virtual("totalPracticeGames").get(function () {
  return ["E2", "E4", "M2", "M4", "H2", "H4"].reduce(
    (sum, code) => sum + (this.stats.practice[code]?.gamesPlayed || 0),
    0,
  );
});

// ✅ Virtual: Full name
playerSchema.virtual("fullName").get(function () {
  return (
    `${this.firstName || ""} ${this.lastName || ""}`.trim() || this.username
  );
});

// ================================
// STATIC METHODS
// ================================

// ✅ NEW: Find top players by rating
playerSchema.statics.getLeaderboard = function (mode, difficulty, limit = 10) {
  const sortField = `pr.${mode}.${difficulty}`;
  return this.find({ "accountStatus.state": "active" })
    .sort({ [sortField]: -1 })
    .limit(limit)
    .select("username profileImage pr stats country");
};

// ✅ NEW: Find players in rating range
playerSchema.statics.findByRatingRange = function (
  mode,
  difficulty,
  minRating,
  maxRating,
) {
  const ratingField = `pr.${mode}.${difficulty}`;
  return this.find({
    [ratingField]: { $gte: minRating, $lte: maxRating },
    "accountStatus.state": "active",
  });
};

// ✅ NEW: Get player statistics
playerSchema.statics.getGlobalStats = async function () {
  const totalPlayers = await this.countDocuments();
  const activePlayers = await this.countDocuments({
    "accountStatus.state": "active",
  });

  const stats = await this.aggregate([
    { $match: { "accountStatus.state": "active" } },
    {
      $group: {
        _id: null,
        totalGames: { $sum: "$stats.overall.totalGames" },
        totalWins: { $sum: "$stats.overall.totalWins" },
        totalLosses: { $sum: "$stats.overall.totalLosses" },
        avgRatingE2: { $avg: "$pr.pvp.E2" },
        avgRatingM2: { $avg: "$pr.pvp.M2" },
        avgRatingH2: { $avg: "$pr.pvp.H2" },
        avgRatingE4: { $avg: "$pr.pvp.E4" },
        avgRatingM4: { $avg: "$pr.pvp.M4" },
        avgRatingH4: { $avg: "$pr.pvp.H4" },
      },
    },
  ]);

  return {
    totalPlayers,
    activePlayers,
    ...(stats[0] || {}),
  };
};

// ================================
// INDEXES
// ================================

playerSchema.index(
  { username: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
playerSchema.index({ email: 1 });
playerSchema.index({ "pr.pvp.E2": -1 });
playerSchema.index({ "pr.pvp.E4": -1 });
playerSchema.index({ "pr.pvp.M2": -1 });
playerSchema.index({ "pr.pvp.M4": -1 });
playerSchema.index({ "pr.pvp.H2": -1 });
playerSchema.index({ "pr.pvp.H4": -1 });
playerSchema.index({ "accountStatus.state": 1 });
playerSchema.index({ "accountStatus.lastActiveAt": -1 });

module.exports = mongoose.model("Player", playerSchema);
