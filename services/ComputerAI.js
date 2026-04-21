// services/ComputerAI.js
const config = require("../config/computerModeConfig");

class ComputerAI {
  /**
   * Initialize computer AI for a game session
   * @param {number} computerLevel - 1-5
   * @returns {object} sessionState
   */
  static initializeSession(computerLevel) {
    const levelProfile = config.computerLevels[computerLevel];
    const baseAccuracy =
      levelProfile.accuracy.baseMin +
      Math.random() *
        (levelProfile.accuracy.baseMax - levelProfile.accuracy.baseMin);

    return {
      computerLevel,
      sessionAccuracy: Math.round(baseAccuracy * 100) / 100,
      sessionStartTime: Date.now(),
      levelProfile,
    };
  }

  static shouldSkip(sessionState, questionLevelTag) {
    const band = config.getQuestionBand(questionLevelTag);
    const skipProb = sessionState.levelProfile.skipProbability[band];
    return Math.random() * 100 < skipProb;
  }

  static calculateEffectiveAccuracy(sessionState, questionLevelTag) {
    const band = config.getQuestionBand(questionLevelTag);
    const baseAccuracy = sessionState.sessionAccuracy;
    const penalty =
      sessionState.levelProfile.accuracy.difficultyPenalties[band];
    const floor = sessionState.levelProfile.accuracy.floor;
    return Math.min(Math.max(baseAccuracy + penalty, floor), 98);
  }

  static isAnswerCorrect(sessionState, questionLevelTag) {
    const effectiveAccuracy = ComputerAI.calculateEffectiveAccuracy(
      sessionState,
      questionLevelTag,
    );
    return Math.random() * 100 < effectiveAccuracy;
  }

  static calculateResponseTime(sessionState, questionLevelTag) {
    const band = config.getQuestionBand(questionLevelTag);
    const delays = config.responseTimeDelays[band];
    const rawDelay = delays.min + Math.random() * (delays.max - delays.min);
    const multiplier = sessionState.levelProfile.responseTime.multiplier;
    return Math.max(rawDelay * multiplier, 0.8);
  }

  /**
   * Get computer's decision for a question.
   *
   * Questions from question_master.json have NO options array.
   * Correct answer is question.answer (number).
   * Wrong answer is generated as a plausible nearby number.
   */
  static getComputerDecision(sessionState, question) {
    const questionLevelTag = question.finalLevel || question.levelNumber || 5;

    // Step 1: Skip check
    if (ComputerAI.shouldSkip(sessionState, questionLevelTag)) {
      return {
        action: "skip",
        answer: null,
        isCorrect: false,
        timeSpent: 0,
        delayMs: 0,
        skipped: true,
      };
    }

    // Step 2: Correct or wrong
    const isCorrect = ComputerAI.isAnswerCorrect(
      sessionState,
      questionLevelTag,
    );

    // Step 3: Resolve answer — question.answer is the correct numeric value
    const correctAnswer = question.answer;
    let answer;
    if (isCorrect) {
      answer = correctAnswer;
    } else {
      // Plausible wrong: offset ±1..±5 from correct, never 0
      const offset =
        (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
      answer = correctAnswer + offset;
    }

    // Step 4: Response delay
    const delaySeconds = ComputerAI.calculateResponseTime(
      sessionState,
      questionLevelTag,
    );

    return {
      action: "answer",
      answer,
      isCorrect,
      timeSpent: delaySeconds,
      delayMs: Math.round(delaySeconds * 1000),
      skipped: false,
    };
  }
}

module.exports = ComputerAI;
