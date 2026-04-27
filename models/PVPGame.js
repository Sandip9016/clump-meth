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
    questionType: String,
    player1Response: {
      answer: String,
      isCorrect: Boolean,
      timeSpent: Number,
    },
    player2Response: {
      answer: String,
      isCorrect: Boolean,
      timeSpent: Number,
    },
  },
  { _id: false },
);

// ✅ Nested schema for emoji history
const EmojiHistorySchema = new Schema(
  {
    emoji: String,
    fromPlayerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
    },
    fromPlayerName: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const PVPGameSchema = new Schema({
  player1: {
    type: Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },
  player2: {
    type: Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },
  scorePlayer1: {
    type: Number,
    required: true,
  },
  scorePlayer2: {
    type: Number,
    required: true,
  },
  // ✅ NEW: Correct answers count for each player
  correctAnswersPlayer1: {
    type: Number,
    default: 0,
  },
  correctAnswersPlayer2: {
    type: Number,
    default: 0,
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: "Player",
    required: false,
  },
  result: {
    type: String,
    enum: [
      "Player1Won",
      "Player2Won",
      "Draw",
      "Player1Disconnected",
      "Player2Disconnected",
    ],
    required: true,
  },
  // ✅ NEW: End reason for game termination
  endReason: {
    type: String,
    enum: ["normal", "disconnect", "grace-period-expired"],
    default: "normal",
  },
  // ✅ NEW: Track which player disconnected
  disconnectedPlayerId: {
    type: Schema.Types.ObjectId,
    ref: "Player",
    required: false,
  },
  gameDuration: {
    type: Number, // in seconds
    required: true,
  },
  // ✅ Game difficulty level
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
  // ✅ NEW: Game timer setting
  timer: {
    type: Number,
    required: true,
  },
  // ✅ NEW: Detailed question history with both players' responses
  questionHistory: [QuestionDetailSchema],
  // ✅ NEW: Emoji exchanges during game
  emojiHistory: [EmojiHistorySchema],
  // ✅ Rating before match started (for history display)
  ratingBeforePlayer1: {
    type: Number,
    default: 0,
  },
  ratingBeforePlayer2: {
    type: Number,
    default: 0,
  },
  // ✅ NEW: Rating changes for each player
  ratingChangePlayer1: {
    type: Number,
    default: 0,
  },
  ratingChangePlayer2: {
    type: Number,
    default: 0,
  },
  // ✅ Whether this game was a friend challenge (vs random matchmaking)
  isFriendMatch: {
    type: Boolean,
    default: false,
  },
  playedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PVPGame", PVPGameSchema);
