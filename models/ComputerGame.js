const mongoose = require("mongoose");
const { Schema } = mongoose;

// ✅ Nested schema for question details
const QuestionDetailSchema = new Schema(
  {
    questionId: String,
    question: String,
    options: [String],
    correctAnswer: String,
    difficulty: String,
    questionLevel: Number, // Question level tag (1-10)
    playerResponse: {
      answer: String,
      isCorrect: Boolean,
      timeSpent: Number, // milliseconds
    },
    computerResponse: {
      answer: String,
      isCorrect: Boolean,
      timeSpent: Number, // milliseconds (artificial delay)
      skipped: Boolean, // true if computer skipped
    },
    playerMeterChange: Number, // +2, -1, or 0
    computerMeterChange: Number, // +2, -1, or 0
    whoAnsweredFirst: String, // "player" or "computer"
  },
  { _id: false },
);

const ComputerGameSchema = new Schema({
  // Players
  player: {
    type: Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },

  // Computer
  computerLevel: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    required: true,
  },

  // Scores
  playerScore: {
    type: Number,
    required: true,
    default: 0,
  },
  computerScore: {
    type: Number,
    required: true,
    default: 0,
  },

  // Correct Answers
  playerCorrectAnswers: {
    type: Number,
    default: 0,
  },
  computerCorrectAnswers: {
    type: Number,
    default: 0,
  },

  // Outcome
  winner: {
    type: String,
    enum: ["Player", "Computer", "Draw"],
    required: true,
  },
  result: {
    type: String,
    enum: ["PlayerWon", "ComputerWon", "Draw"],
    required: true,
  },

  // Game metadata
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true,
  },
  // ✅ Diff code (E2/E4/M2/M4/H2/H4)
  diffCode: {
    type: String,
    enum: ["E2", "E4", "M2", "M4", "H2", "H4"],
    required: true,
  },
  gameMode: {
    type: String,
    enum: ["1-minute", "2-minute", "3-minute"],
    required: true,
  },
  gameDuration: {
    type: Number, // seconds
    required: true,
  },

  // Question history with details
  questionHistory: [QuestionDetailSchema],

  // Rating changes
  playerRatingBefore: {
    type: Number,
    required: true,
  },
  playerRatingAfter: {
    type: Number,
    required: true,
  },
  playerRatingChange: {
    type: Number,
    required: true,
  },

  // End reason
  endReason: {
    type: String,
    enum: ["timerExpired", "playerDisconnect", "questionsExhausted"],
    default: "timerExpired",
  },

  // Timestamps
  playedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ComputerGame", ComputerGameSchema);
