const mongoose = require("mongoose");
const { Schema } = mongoose;

// ✅ Nested schema for question details in practice
const PracticeQuestionDetailSchema = new Schema(
  {
    questionId: String,
    question: String,
    options: [String],
    correctAnswer: String,
    difficulty: String,
    questionType: String,
    playerResponse: {
      answer: String,           // null if skipped
      isCorrect: Boolean,
      timeSpent: Number,        // milliseconds
      skipped: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const PracticeGameSchema = new Schema({
  // Player
  player: {
    type: Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },

  // Game format
  diffCode: {
    type: String,
    enum: ["E2", "E4", "M2", "M4", "H2", "H4"],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true,
  },

  // Counts
  correctCount: {
    type: Number,
    default: 0,
  },
  incorrectCount: {
    type: Number,
    default: 0,
  },
  skippedCount: {
    type: Number,
    default: 0,
  },
  totalQuestions: {
    type: Number,
    default: 0,
  },

  // Score & rating
  pointsEarned: {
    type: Number,
    default: 0,
  },
  ratingBefore: {
    type: Number,
    required: true,
  },
  ratingAfter: {
    type: Number,
    required: true,
  },
  ratingChange: {
    type: Number,
    required: true,
  },

  // Question history (optional — frontend sends if available)
  questionHistory: [PracticeQuestionDetailSchema],

  // Game duration in seconds
  gameDuration: {
    type: Number,
    default: 0,
  },

  playedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PracticeGame", PracticeGameSchema);
