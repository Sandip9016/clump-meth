const { getQuestions } = require("../loadQuestion");

// ─── Symbol normalisation ────────────────────────────────────────────────────
const SYMBOL_MAP = {
  "+": "sum",
  "-": "difference",
  "*": "product",
  "/": "quotient",
  // accept the word forms too, so callers can pass either
  sum: "sum",
  difference: "difference",
  product: "product",
  quotient: "quotient",
};

/**
 * Normalise one symbol token coming from the request into the DB's casing.
 * Returns the original token (lowercased) if no mapping found.
 */
function normaliseSymbol(raw) {
  const key = raw.trim().toLowerCase();
  return SYMBOL_MAP[key] || key;
}

/**
 * Parse a comma-separated symbol query param into a normalised list.
 */
function parseSymbols(rawSymbols) {
  if (!rawSymbols) return [];
  return String(rawSymbols)
    .split(",")
    .map((s) => normaliseSymbol(s))
    .filter(Boolean);
}

/**
 * Check whether a question's symbol field matches any of the requested symbols.
 * Comparison is case-insensitive.
 */
function symbolMatches(question, symbolList) {
  if (!question.symbol) return false;
  const qSymbols = question.symbol
    .split(",")
    .map((s) => s.trim().toLowerCase());
  return symbolList.some((sym) => qSymbols.includes(sym));
}

// ─── QM / Level helpers ──────────────────────────────────────────────────────
const QM_RANGES = [
  { level: 1, start: 0, end: 5 },
  { level: 2, start: 6, end: 9 },
  { level: 3, start: 10, end: 13 },
  { level: 4, start: 14, end: 17 },
  { level: 5, start: 18, end: 21 },
  { level: 6, start: 22, end: 25 },
  { level: 7, start: 26, end: 29 },
  { level: 8, start: 30, end: 33 },
  { level: 9, start: 34, end: 37 },
  { level: 10, start: 38, end: 45 },
];

function getQuestionLevelFromQM(qm) {
  for (const range of QM_RANGES) {
    if (qm >= range.start && qm <= range.end) return range.level;
  }
  return 10;
}

function determineFinalQuestionLevel(qm = null) {
  if (qm !== null && qm !== undefined && qm >= 0) {
    const level = getQuestionLevelFromQM(qm);
    console.log(`Using QM-based level: QM=${qm} -> Level=${level}`);
    return level;
  }
  return 1;
}

// ─── GET /question ────────────────────────────────────────────────────────────
exports.getQuestion = (req, res) => {
  const diff = String(req.query.difficulty || "")
    .trim()
    .toLowerCase();
  const symbolList = parseSymbols(req.query.symbol);
  let qm = req.query.qm !== undefined ? Number(req.query.qm) : null;

  // Validation
  if (!["easy", "medium", "hard"].includes(diff) || !symbolList.length) {
    return res.status(400).json({
      message:
        "Provide difficulty=(easy|medium|hard), symbol (one or comma-separated), and optional qm (Question Meter)",
    });
  }

  if (qm !== null && (isNaN(qm) || qm < 0)) {
    return res.status(400).json({
      message: "Question Meter (qm) must be a non-negative number if provided",
    });
  }

  try {
    const allQs = getQuestions();
    console.log(`Total questions loaded: ${allQs.length}`);

    const targetFinalLevel = determineFinalQuestionLevel(qm);

    // If qm was null, seed it to the start of the target level's range
    if (qm === null) {
      const range = QM_RANGES.find((r) => r.level === targetFinalLevel);
      qm = range ? range.start : 0;
    }

    console.log(
      `Difficulty: ${diff}, QM: ${qm}, Target final level: ${targetFinalLevel}`,
    );
    console.log(`Normalised symbols: ${JSON.stringify(symbolList)}`);

    // Filter by difficulty + level
    let pool = allQs.filter(
      (q) => q.difficulty === diff && q.finalLevel === targetFinalLevel,
    );
    console.log(
      `Questions after difficulty & final level filter: ${pool.length}`,
    );

    // Filter by symbol
    pool = pool.filter((q) => symbolMatches(q, symbolList));
    console.log(`Questions after symbol filter: ${pool.length}`);

    if (!pool.length) {
      return res.status(404).json({
        message: `No questions available matching difficulty "${diff}", final level ${targetFinalLevel}, and symbols [${symbolList.join(", ")}]`,
        debug: {
          difficulty: diff,
          finalLevel: targetFinalLevel,
          symbols: symbolList,
          questionMeter: qm,
          levelDeterminedBy: "QM",
        },
      });
    }

    const question = pool[Math.floor(Math.random() * pool.length)];

    return res.json({
      question: {
        questionKey: question.questionKey,
        questionLevel: question.questionLevel,
        difficulty: question.difficulty,
        question: question.question,
        input1: question.input1,
        input2: question.input2,
        answer: question.answer,
        symbol: question.symbol,
        valid: question.valid,
        combo: question.combo,
        finalLevel: question.finalLevel,
        qm,
      },
    });
  } catch (err) {
    console.error("Error in getQuestion:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// ─── POST /submitAnswer ───────────────────────────────────────────────────────
exports.submitAnswer = (req, res) => {
  const {
    playerRating,
    currentScore,
    givenAnswer,
    question,
    symbol,
    qm,
    streak = 0,
  } = req.body;

  if (
    typeof currentScore !== "number" ||
    !question ||
    typeof question.answer === "undefined"
  ) {
    return res.status(400).json({
      message: "Missing required fields: currentScore, question.answer",
    });
  }

  const questionMeter = qm !== undefined ? Number(qm) : null;
  if (questionMeter !== null && (isNaN(questionMeter) || questionMeter < 0)) {
    return res.status(400).json({
      message: "Question Meter (qm) must be a non-negative number if provided",
    });
  }

  // Normalise symbols from body
  const symbolList = Array.isArray(symbol)
    ? symbol.map((s) => normaliseSymbol(String(s)))
    : parseSymbols(String(symbol || ""));

  // Check answer
  const correct = String(givenAnswer).trim() === String(question.answer).trim();

  const newStreak = correct ? streak + 1 : 0;
  const delta = correct ? 2 : -1;
  const nextQM = Math.max(0, (questionMeter ?? 0) + delta);

  // Score calculation
  let newCurrentScore = currentScore;
  if (correct) {
    if (newStreak <= 2) {
      newCurrentScore += 1;
    } else if (newStreak === 3) {
      newCurrentScore += 3;
    } else if (newStreak === 5) {
      newCurrentScore += 5;
    } else if (newStreak === 10) {
      newCurrentScore += 10;
    } else if (newStreak % 10 === 0) {
      newCurrentScore += 10;
    }
  }

  try {
    const allQs = getQuestions();

    const nextFinalLevel = determineFinalQuestionLevel(nextQM);

    let nextPool = allQs.filter(
      (q) =>
        q.difficulty === question.difficulty &&
        q.finalLevel === nextFinalLevel &&
        symbolMatches(q, symbolList),
    );

    if (!nextPool.length) {
      return res.status(404).json({
        message: "No next questions available",
        newCurrentScore,
        correct,
      });
    }

    const nextQ = nextPool[Math.floor(Math.random() * nextPool.length)];

    return res.json({
      correct,
      oldScore: currentScore,
      updatedScore: newCurrentScore,
      scoreDelta: delta,
      streak: newStreak,
      nextQuestion: {
        questionKey: nextQ.questionKey,
        questionLevel: nextQ.questionLevel,
        score: newCurrentScore,
        difficulty: nextQ.difficulty,
        levelNumber: nextQ.levelNumber,
        question: nextQ.question,
        input1: nextQ.input1,
        input2: nextQ.input2,
        answer: nextQ.answer,
        symbol: nextQ.symbol,
        valid: nextQ.valid,
        combo: nextQ.combo,
        finalLevel: nextQ.finalLevel,
        qm: nextQM,
      },
    });
  } catch (err) {
    console.error("Error in submitAnswer:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// ─── Misc exports ─────────────────────────────────────────────────────────────
exports.getLevelFromScore = (score) => {
  const breakpoints = [5, 9, 13, 17, 21, 25, 29, 33, 37];
  return breakpoints.findIndex((bp) => score <= bp) + 1 || 10;
};

exports.getQuestionLevelFromQM = getQuestionLevelFromQM;
exports.determineFinalQuestionLevel = determineFinalQuestionLevel;

// ─── Preload on startup ───────────────────────────────────────────────────────
(function preloadQuestions() {
  console.log("[Startup] Preloading questions...");
  try {
    const data = getQuestions();
    console.log(`[Startup] Preloaded ${data.length} questions`);
    const stats = { byDifficulty: {}, byFinalLevel: {} };
    data.forEach((q) => {
      stats.byDifficulty[q.difficulty] =
        (stats.byDifficulty[q.difficulty] || 0) + 1;
      stats.byFinalLevel[q.finalLevel] =
        (stats.byFinalLevel[q.finalLevel] || 0) + 1;
    });
    console.log("[Startup] By difficulty:", stats.byDifficulty);
    console.log("[Startup] By final level:", stats.byFinalLevel);
  } catch (error) {
    console.error("[Startup] Error preloading questions:", error);
  }
})();
