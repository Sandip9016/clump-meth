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

// ✅ FIXED: Update PvP stats after a game
playerSchema.methods.updatePvPStats = function (
  diffCode,
  won,
  draw = false,
  opponentRating = 0,
  opponentUsername = "",
  myQuestionHistory = [], // only this player's responses: [{isCorrect, timeSpent, answer}, ...]
  playerRatingAfter = 0,
) {
  // DEBUG: Log what data we're receiving
  console.log(`=== PvP STATS UPDATE DEBUG ===`);
  console.log(`Player: ${this.username}`);
  console.log(`DiffCode: ${diffCode}`);
  console.log(`Won: ${won}, Draw: ${draw}`);
  console.log(`Opponent: ${opponentUsername} (${opponentRating})`);
  console.log(`Question History Length: ${myQuestionHistory.length}`);
  if (myQuestionHistory.length > 0) {
    console.log(`Sample Question:`, myQuestionHistory[0]);
    console.log(
      `Correct: ${myQuestionHistory.filter((q) => q.isCorrect === true).length}`,
    );
    console.log(
      `Incorrect: ${myQuestionHistory.filter((q) => q.isCorrect === false).length}`,
    );
    console.log(
      `Skipped: ${myQuestionHistory.filter((q) => q.isCorrect === null || q.answer === null).length}`,
    );
  }
  console.log(`==========================`);

  const diffStats = this.stats.pvp[diffCode];
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "2026-04"

  // ── 1. Cumulative win/loss/draw ──────────────────────────────────────────
  diffStats.gamesPlayed++;

  if (draw) {
    diffStats.draws++;
    // draw does NOT reset win streak
  } else if (won) {
    diffStats.wins++;
    diffStats.currentStreak++;
    if (diffStats.currentStreak > diffStats.bestStreak) {
      diffStats.bestStreak = diffStats.currentStreak;
    }
  } else {
    diffStats.losses++;
    diffStats.currentStreak = 0;
  }

  if (diffStats.gamesPlayed > 0) {
    diffStats.winRate = Math.round(
      (diffStats.wins / diffStats.gamesPlayed) * 100,
    );
  }

  // ── 2. Question stats from THIS player's responses ───────────────────────
  let correct = 0,
    incorrect = 0,
    skipped = 0,
    totalTime = 0;
  myQuestionHistory.forEach((r) => {
    totalTime += r.timeSpent || 0;
    if (r.answer === null || r.answer === undefined || r.answer === "") {
      skipped++;
    } else if (r.isCorrect) {
      correct++;
    } else {
      incorrect++;
    }
  });

  diffStats.totalCorrect += correct;
  diffStats.totalIncorrect += incorrect;
  diffStats.totalSkipped += skipped;
  diffStats.totalTimeSpent += totalTime;
  diffStats.totalQuestionsAnswered += myQuestionHistory.length;

  const questionsPerSecond =
    diffStats.totalTimeSpent > 0
      ? diffStats.totalQuestionsAnswered / (diffStats.totalTimeSpent / 1000)
      : 0;

  // ── 3. Update allTimeBest ────────────────────────────────────────────────
  const allTimeBest = this.allTimeBest.pvp[diffCode];

  if (won && opponentRating > allTimeBest.bestWin.rating) {
    allTimeBest.bestWin.username = opponentUsername;
    allTimeBest.bestWin.rating = opponentRating;
    allTimeBest.bestWin.date = now;
  }
  if (diffStats.bestStreak > allTimeBest.longestStreak.value) {
    allTimeBest.longestStreak.value = diffStats.bestStreak;
    allTimeBest.longestStreak.date = now;
  }
  if (
    playerRatingAfter > 0 &&
    playerRatingAfter > allTimeBest.highestRating.value
  ) {
    allTimeBest.highestRating.value = playerRatingAfter;
    allTimeBest.highestRating.date = now;
  }
  if (questionsPerSecond > allTimeBest.bestQuestionsPerSecond.value) {
    allTimeBest.bestQuestionsPerSecond.value = questionsPerSecond;
    allTimeBest.bestQuestionsPerSecond.date = now;
  }
  this.markModified("allTimeBest");

  // ── 4. Update overall stats ──────────────────────────────────────────────
  this.stats.overall.totalGames++;
  if (draw) {
    this.stats.overall.totalDraws++;
  } else if (won) {
    this.stats.overall.totalWins++;
  } else {
    this.stats.overall.totalLosses++;
  }
  if (this.stats.overall.totalGames > 0) {
    this.stats.overall.overallWinRate = Math.round(
      (this.stats.overall.totalWins / this.stats.overall.totalGames) * 100,
    );
  }

  // ── 5. Update monthly stats with DELTAS (not cumulative totals) ──────────
  this.updateMonthlyStats(currentMonth, "pvp", diffCode, {
    // deltas for this single game
    deltaGamesPlayed: 1,
    deltaWins: won ? 1 : 0,
    deltaLosses: !won && !draw ? 1 : 0,
    deltaDraws: draw ? 1 : 0,
    deltaCorrect: correct,
    deltaIncorrect: incorrect,
    deltaSkipped: skipped,
    deltaTimeSpent: totalTime,
    deltaQuestionsAnswered: myQuestionHistory.length,
    // best-in-game values (stored as running bests inside the monthly entry)
    gameWon: won,
    opponentRating,
    opponentUsername,
    currentStreakAfterGame: diffStats.currentStreak,
    playerRatingAfter,
    questionsPerSecond,
  });

  // ── 6. Update all windowed best fields ───────────────────────────────────
  const achievement = {
    bestWin: won
      ? { username: opponentUsername, rating: opponentRating, date: now }
      : null,
    longestStreak: { value: diffStats.currentStreak, date: now },
    highestRating:
      playerRatingAfter > 0 ? { value: playerRatingAfter, date: now } : null,
    bestQuestionsPerSecond: { value: questionsPerSecond, date: now },
  };
  this._updateWindowedBests("pvp", diffCode, achievement, now);

  this.markModified("stats");
  return this.save();
};

// ✅ FIXED: Update practice stats after a game
playerSchema.methods.updatePracticeStats = function (
  diffCode,
  score,
  questionHistory = [], // [{playerResponse: {isCorrect, timeSpent, skipped}}, ...]
) {
  // DEBUG: Log what data we're receiving
  console.log(`=== PRACTICE STATS UPDATE DEBUG ===`);
  console.log(`Player: ${this.username}`);
  console.log(`DiffCode: ${diffCode}`);
  console.log(`Score: ${score}`);
  console.log(`Question History Length: ${questionHistory.length}`);
  if (questionHistory.length > 0) {
    console.log(`Sample Question:`, questionHistory[0]);
    console.log(
      `Correct: ${questionHistory.filter((q) => (q.playerResponse || q).isCorrect === true).length}`,
    );
    console.log(
      `Incorrect: ${questionHistory.filter((q) => (q.playerResponse || q).isCorrect === false).length}`,
    );
    console.log(
      `Skipped: ${questionHistory.filter((q) => (q.playerResponse || q).skipped || (q.playerResponse || q).answer === null).length}`,
    );
  }
  console.log(`===============================`);

  const diffStats = this.stats.practice[diffCode];
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  // ── 1. Cumulative game stats ─────────────────────────────────────────────
  diffStats.gamesPlayed++;
  if (score > diffStats.highScore) diffStats.highScore = score;
  diffStats.totalScore += score;
  diffStats.averageScore = Math.round(
    diffStats.totalScore / diffStats.gamesPlayed,
  );

  // ── 2. Question stats ────────────────────────────────────────────────────
  let correct = 0,
    incorrect = 0,
    skipped = 0,
    totalTime = 0;
  let runStreak = 0,
    maxStreak = 0;

  questionHistory.forEach((q) => {
    const r = q.playerResponse || q;
    totalTime += r.timeSpent || 0;
    if (
      r.skipped ||
      r.answer === null ||
      r.answer === undefined ||
      r.answer === ""
    ) {
      skipped++;
      runStreak = 0;
    } else if (r.isCorrect) {
      correct++;
      runStreak++;
      maxStreak = Math.max(maxStreak, runStreak);
    } else {
      incorrect++;
      runStreak = 0;
    }
  });

  diffStats.totalCorrect += correct;
  diffStats.totalIncorrect += incorrect;
  diffStats.totalSkipped += skipped;
  diffStats.totalTimeSpent += totalTime;
  diffStats.totalQuestionsAnswered += questionHistory.length;

  // bestStreak is the best single-game streak ever; currentStreak carries across games
  diffStats.bestStreak = Math.max(diffStats.bestStreak, maxStreak);
  // currentStreak: continue from last game only if last answer was correct
  const lastResponse = questionHistory[questionHistory.length - 1];
  const lastCorrect = lastResponse
    ? !!(lastResponse.playerResponse || lastResponse).isCorrect
    : false;
  diffStats.currentStreak = lastCorrect ? diffStats.currentStreak + correct : 0;

  const accuracy =
    diffStats.totalQuestionsAnswered > 0
      ? (diffStats.totalCorrect / diffStats.totalQuestionsAnswered) * 100
      : 0;

  const questionsPerSecond =
    diffStats.totalTimeSpent > 0
      ? diffStats.totalQuestionsAnswered / (diffStats.totalTimeSpent / 1000)
      : 0;

  // ── 3. Update allTimeBest ────────────────────────────────────────────────
  const allTimeBest = this.allTimeBest.practice[diffCode];
  if (diffStats.bestStreak > allTimeBest.bestStreak.value) {
    allTimeBest.bestStreak.value = diffStats.bestStreak;
    allTimeBest.bestStreak.date = now;
  }
  if (accuracy > allTimeBest.bestAccuracy.value) {
    allTimeBest.bestAccuracy.value = accuracy;
    allTimeBest.bestAccuracy.date = now;
  }
  if (questionsPerSecond > allTimeBest.bestQuestionsPerSecond.value) {
    allTimeBest.bestQuestionsPerSecond.value = questionsPerSecond;
    allTimeBest.bestQuestionsPerSecond.date = now;
  }
  this.markModified("allTimeBest");

  // ── 4. Update monthly stats with DELTAS ──────────────────────────────────
  this.updateMonthlyStats(currentMonth, "practice", diffCode, {
    deltaGamesPlayed: 1,
    deltaCorrect: correct,
    deltaIncorrect: incorrect,
    deltaSkipped: skipped,
    deltaTimeSpent: totalTime,
    deltaQuestionsAnswered: questionHistory.length,
    // running bests inside the monthly entry
    gameScore: score,
    gameMaxStreak: maxStreak,
    gameAccuracy:
      questionHistory.length > 0 ? (correct / questionHistory.length) * 100 : 0,
    questionsPerSecond,
  });

  // ── 5. Update all windowed best fields ───────────────────────────────────
  const achievement = {
    bestHighScore: { value: score, date: now },
    bestStreak: { value: maxStreak, date: now },
    bestAccuracy: {
      value:
        questionHistory.length > 0
          ? (correct / questionHistory.length) * 100
          : 0,
      date: now,
    },
    bestQuestionsPerSecond: { value: questionsPerSecond, date: now },
  };
  this._updateWindowedBests("practice", diffCode, achievement, now);

  this.markModified("stats");
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

// ✅ FIXED: Update monthly stats using DELTAS (increments), not cumulative totals
playerSchema.methods.updateMonthlyStats = function (
  month,
  mode,
  diffCode,
  data,
) {
  const idx = this.monthlyStats.findIndex(
    (s) => s.month === month && s.mode === mode && s.diffCode === diffCode,
  );

  if (idx !== -1) {
    const entry = this.monthlyStats[idx];

    // ── Increment delta counters ────────────────────────────────────────────
    entry.gamesPlayed += data.deltaGamesPlayed || 0;
    entry.totalCorrect += data.deltaCorrect || 0;
    entry.totalIncorrect += data.deltaIncorrect || 0;
    entry.totalSkipped += data.deltaSkipped || 0;
    entry.totalTimeSpent += data.deltaTimeSpent || 0;
    entry.totalQuestionsAnswered += data.deltaQuestionsAnswered || 0;

    if (mode === "pvp") {
      entry.wins += data.deltaWins || 0;
      entry.losses += data.deltaLosses || 0;
      entry.draws += data.deltaDraws || 0;

      // bestWin: keep the highest-rated opponent defeated this month
      if (data.gameWon && data.opponentRating > (entry.bestWin?.rating || 0)) {
        entry.bestWin = {
          username: data.opponentUsername,
          rating: data.opponentRating,
        };
      }
      // longestStreak: highest consecutive win streak seen this month
      if ((data.currentStreakAfterGame || 0) > (entry.longestStreak || 0)) {
        entry.longestStreak = data.currentStreakAfterGame;
      }
      // highestRating: highest Elo reached this month
      if (
        data.playerRatingAfter > 0 &&
        data.playerRatingAfter > (entry.highestRating || 1000)
      ) {
        entry.highestRating = data.playerRatingAfter;
      }
      // questionsPerSecond: best rate this month
      if ((data.questionsPerSecond || 0) > (entry.questionsPerSecond || 0)) {
        entry.questionsPerSecond = data.questionsPerSecond;
      }
    }

    if (mode === "practice") {
      // highScore: best score this month
      if ((data.gameScore || 0) > (entry.highScore || 0)) {
        entry.highScore = data.gameScore;
      }
      // bestStreak: best single-game streak this month
      if ((data.gameMaxStreak || 0) > (entry.bestStreak || 0)) {
        entry.bestStreak = data.gameMaxStreak;
      }
      // accuracy: best single-game accuracy this month
      if ((data.gameAccuracy || 0) > (entry.accuracy || 0)) {
        entry.accuracy = data.gameAccuracy;
      }
      if ((data.questionsPerSecond || 0) > (entry.questionsPerSecond || 0)) {
        entry.questionsPerSecond = data.questionsPerSecond;
      }
    }

    this.monthlyStats[idx] = entry;
  } else {
    // ── First game of this month/mode/diffCode combo ───────────────────────
    const newEntry = {
      month,
      mode,
      diffCode,
      gamesPlayed: data.deltaGamesPlayed || 0,
      totalCorrect: data.deltaCorrect || 0,
      totalIncorrect: data.deltaIncorrect || 0,
      totalSkipped: data.deltaSkipped || 0,
      totalTimeSpent: data.deltaTimeSpent || 0,
      totalQuestionsAnswered: data.deltaQuestionsAnswered || 0,
    };

    if (mode === "pvp") {
      newEntry.wins = data.deltaWins || 0;
      newEntry.losses = data.deltaLosses || 0;
      newEntry.draws = data.deltaDraws || 0;
      newEntry.bestWin = data.gameWon
        ? { username: data.opponentUsername, rating: data.opponentRating }
        : { username: "", rating: 0 };
      newEntry.longestStreak = data.currentStreakAfterGame || 0;
      newEntry.highestRating =
        data.playerRatingAfter > 0 ? data.playerRatingAfter : 1000;
      newEntry.questionsPerSecond = data.questionsPerSecond || 0;
    }

    if (mode === "practice") {
      newEntry.highScore = data.gameScore || 0;
      newEntry.bestStreak = data.gameMaxStreak || 0;
      newEntry.accuracy = data.gameAccuracy || 0;
      newEntry.questionsPerSecond = data.questionsPerSecond || 0;
    }

    this.monthlyStats.push(newEntry);
  }

  // Keep only last 13 months × 2 modes × 6 diffCodes = 156 max entries
  this.monthlyStats.sort((a, b) => b.month.localeCompare(a.month));
  if (this.monthlyStats.length > 156) {
    this.monthlyStats = this.monthlyStats.slice(0, 156);
  }

  this.markModified("monthlyStats");
};

// ✅ FIXED: Internal helper — update all windowed best fields (week/month/3m/6m/year/alltime)
playerSchema.methods._updateWindowedBests = function (
  mode,
  diffCode,
  achievement,
  now,
) {
  const WINDOWS = [
    { field: "weekBest", ms: 7 * 24 * 60 * 60 * 1000 },
    { field: "monthBest", ms: 30 * 24 * 60 * 60 * 1000 },
    { field: "threeMonthsBest", ms: 90 * 24 * 60 * 60 * 1000 },
    { field: "sixMonthsBest", ms: 180 * 24 * 60 * 60 * 1000 },
    { field: "yearBest", ms: 365 * 24 * 60 * 60 * 1000 },
    { field: "allTimeBest", ms: Infinity },
  ];

  for (const { field } of WINDOWS) {
    if (!this[field]) continue;
    if (!this[field][mode]) continue;
    const bucket = this[field][mode][diffCode];
    if (!bucket) continue;

    // PVP fields
    if (mode === "pvp") {
      if (
        achievement.bestWin &&
        achievement.bestWin.rating > (bucket.bestWin?.rating || 0)
      ) {
        bucket.bestWin = {
          username: achievement.bestWin.username,
          rating: achievement.bestWin.rating,
          date: now,
        };
      }
      if (
        achievement.longestStreak &&
        achievement.longestStreak.value > (bucket.longestStreak?.value || 0)
      ) {
        bucket.longestStreak = {
          value: achievement.longestStreak.value,
          date: now,
        };
      }
      if (
        achievement.highestRating &&
        achievement.highestRating.value > (bucket.highestRating?.value || 1000)
      ) {
        bucket.highestRating = {
          value: achievement.highestRating.value,
          date: now,
        };
      }
    }

    // Practice fields
    if (mode === "practice") {
      if (
        achievement.bestStreak &&
        achievement.bestStreak.value > (bucket.bestStreak?.value || 0)
      ) {
        bucket.bestStreak = { value: achievement.bestStreak.value, date: now };
      }
      if (
        achievement.bestAccuracy &&
        achievement.bestAccuracy.value > (bucket.bestAccuracy?.value || 0)
      ) {
        bucket.bestAccuracy = {
          value: achievement.bestAccuracy.value,
          date: now,
        };
      }
      // Top Score (highest score in a single game)
      if (
        achievement.bestHighScore &&
        achievement.bestHighScore.value > (bucket.bestHighScore?.value || 0)
      ) {
        bucket.bestHighScore = {
          value: achievement.bestHighScore.value,
          date: now,
        };
      }
    }

    // Common
    if (
      achievement.bestQuestionsPerSecond &&
      achievement.bestQuestionsPerSecond.value >
        (bucket.bestQuestionsPerSecond?.value || 0)
    ) {
      bucket.bestQuestionsPerSecond = {
        value: achievement.bestQuestionsPerSecond.value,
        date: now,
      };
    }

    this.markModified(field);
  }
};

// ✅ KEPT: updateBestStats (public API, kept for any external callers)
playerSchema.methods.updateBestStats = function (
  mode,
  diffCode,
  newAchievement,
  _timeFilter,
) {
  // Delegate to the internal helper which updates ALL windows at once
  this._updateWindowedBests(mode, diffCode, newAchievement, new Date());
  return this.save();
};

// ✅ Update last active timestamp
playerSchema.methods.updateLastActive = function () {
  this.accountStatus.lastActiveAt = new Date();
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
