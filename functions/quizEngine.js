const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");

const {extractPages} = require("./pdfUtils");

const DEFAULT_SETTINGS = {
  difficulty: "medium",
  subject: "STEM",
  numMCQs: 4,
  numSAQs: 3,
  numEPs: 2,
};

const JOB_STATUS = {
  QUEUED: "queued",
  EXTRACTING: "extracting",
  GENERATING: "generating",
  REVIEW_READY: "review_ready",
  FAILED: "failed",
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "almost",
  "along",
  "also",
  "although",
  "among",
  "because",
  "before",
  "being",
  "between",
  "could",
  "during",
  "every",
  "first",
  "found",
  "from",
  "given",
  "have",
  "into",
  "known",
  "many",
  "might",
  "more",
  "most",
  "other",
  "often",
  "over",
  "same",
  "should",
  "some",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "using",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);

function parsePageRange(pageRangeStr, numPages) {
  const pageIndices = new Set();
  const matches = pageRangeStr.match(/\d+(-\d+)?/g);

  if (!matches) {
    return [];
  }

  matches.forEach((range) => {
    if (range.includes("-")) {
      const [start, end] = range.split("-").map((n) => parseInt(n, 10));

      if (start < 1 || end < 1 || start > numPages || end > numPages) {
        throw new Error(`Range ${start}-${end} is out of bounds.`);
      }

      for (let i = start - 1; i < end; i += 1) {
        pageIndices.add(i);
      }
    } else {
      const page = parseInt(range, 10);

      if (page < 1 || page > numPages) {
        throw new Error(`Page ${page} is out of bounds.`);
      }

      pageIndices.add(page - 1);
    }
  });

  return Array.from(pageIndices).sort((a, b) => a - b);
}

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeAnswer(value = "") {
  return normalizeWhitespace(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "");
}

function splitSentences(text = "") {
  return text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((sentence) => normalizeWhitespace(sentence))
      .filter((sentence) => sentence.length >= 40);
}

function extractKeywords(text = "", limit = 24) {
  const counts = new Map();

  text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 4 && !STOP_WORDS.has(word))
      .forEach((word) => {
        counts.set(word, (counts.get(word) || 0) + 1);
      });

  return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
}

function sentenceScore(sentence, keywords) {
  const lower = sentence.toLowerCase();
  const keywordHits = keywords.filter((keyword) => lower.includes(keyword)).length;

  return keywordHits * 5 + Math.min(sentence.length, 180) / 60;
}

function pickKeyword(sentence, keywords) {
  const sentenceWords = sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 4 && !STOP_WORDS.has(word));

  const keyword = keywords.find((candidate) => sentenceWords.includes(candidate));

  if (keyword) {
    return keyword;
  }

  return sentenceWords[0] || "concept";
}

function createPromptPrefix(type, difficulty, keyword) {
  if (type === "multiple_choice") {
    if (difficulty === "hard") {
      return `Which source-backed term best completes the advanced statement about ${keyword}?`;
    }

    return `According to the material, which term best completes the statement about ${keyword}?`;
  }

  if (type === "short_answer") {
    if (difficulty === "hard") {
      return `Explain the role of ${keyword} and connect it to the supporting evidence in the source.`;
    }

    return `What does the source say about ${keyword}?`;
  }

  if (difficulty === "hard") {
    return `Work through a source-grounded explanation of ${keyword} and justify your reasoning.`;
  }

  return `Explain why ${keyword} matters in the source material and support your answer.`;
}

function buildDistractors(correctKeyword, keywords) {
  const distractors = keywords.filter((keyword) => keyword !== correctKeyword);

  if (distractors.length >= 3) {
    return distractors.slice(0, 3);
  }

  const fillers = ["equilibrium", "gradient", "vector", "constraint"];

  fillers.forEach((item) => {
    if (item !== correctKeyword && !distractors.includes(item)) {
      distractors.push(item);
    }
  });

  return distractors.slice(0, 3);
}

function reorderOptions(options, correctAnswer) {
  const uniqueOptions = Array.from(new Set(options)).slice(0, 4);

  if (!uniqueOptions.includes(correctAnswer)) {
    uniqueOptions[0] = correctAnswer;
  }

  return uniqueOptions.sort((a, b) => a.localeCompare(b));
}

function createSourceRef(page, sentence) {
  return [{
    page,
    snippet: sentence.slice(0, 220),
  }];
}

function buildQuestion(type, sentenceEntry, keywords, difficulty, index) {
  const keyword = pickKeyword(sentenceEntry.text, keywords);
  const promptPrefix = createPromptPrefix(type, difficulty, keyword);
  const prompt = `${promptPrefix} Source statement: "${sentenceEntry.text}"`;
  const explanation = `Source-backed rationale: ${sentenceEntry.text}`;

  if (type === "multiple_choice") {
    const distractors = buildDistractors(keyword, keywords);

    return {
      id: `${type}-${index + 1}`,
      type,
      prompt,
      options: reorderOptions([keyword, ...distractors], keyword),
      correctAnswer: keyword,
      explanation,
      difficulty,
      topic: keyword,
      enabled: true,
      sourceRefs: createSourceRef(sentenceEntry.page, sentenceEntry.text),
    };
  }

  return {
    id: `${type}-${index + 1}`,
    type,
    prompt,
    options: [],
    correctAnswer: sentenceEntry.text,
    explanation,
    difficulty,
    topic: keyword,
    enabled: true,
    sourceRefs: createSourceRef(sentenceEntry.page, sentenceEntry.text),
  };
}

function dedupeByPrompt(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = normalizeAnswer(item.prompt);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildFlashcards(sentenceEntries, keywords) {
  return sentenceEntries.slice(0, 8).map((entry, index) => {
    const keyword = pickKeyword(entry.text, keywords);

    return {
      id: `flashcard-${index + 1}`,
      front: `What is the key idea behind ${keyword}?`,
      back: entry.text,
      topic: keyword,
      sourceRefs: createSourceRef(entry.page, entry.text),
    };
  });
}

function buildStudyGuide(sentenceEntries, keywords) {
  const sections = keywords.slice(0, 4).map((keyword, index) => {
    const related = sentenceEntries
        .filter((entry) => entry.text.toLowerCase().includes(keyword))
        .slice(0, 2);

    const fallbacks = related.length ? related : sentenceEntries.slice(index, index + 2);
    const keyPoints = fallbacks.map((entry) => entry.text);

    return {
      id: `section-${index + 1}`,
      heading: keyword.charAt(0).toUpperCase() + keyword.slice(1),
      summary: keyPoints[0] || `Source-backed overview of ${keyword}.`,
      keyPoints,
      sourceRefs: fallbacks.flatMap((entry) => createSourceRef(
          entry.page,
          entry.text,
      )),
    };
  });

  return {
    title: "Study Guide",
    sections,
  };
}

function buildSourceSummary(sentenceEntries) {
  return sentenceEntries
      .slice(0, 4)
      .map((entry) => `Page ${entry.page}: ${entry.text}`)
      .join(" ");
}

function createAssessmentPackage(
    pageEntries,
    settings,
    fileName,
) {
  const mergedSettings = {...DEFAULT_SETTINGS, ...settings};
  const combinedText = pageEntries.map((entry) => entry.text).join(" ");
  const keywords = extractKeywords(combinedText);
  const rankedEntries = pageEntries
      .flatMap((entry) => {
        return splitSentences(entry.text).map((sentence) => ({
          page: entry.page,
          text: sentence,
          score: sentenceScore(sentence, keywords),
        }));
      })
      .sort((a, b) => b.score - a.score);

  const uniqueEntries = [];
  const seen = new Set();

  rankedEntries.forEach((entry) => {
    const key = normalizeAnswer(entry.text);

    if (!seen.has(key)) {
      seen.add(key);
      uniqueEntries.push(entry);
    }
  });

  if (!uniqueEntries.length) {
    throw new Error("The selected material does not contain enough text to draft assessments.");
  }

  const multipleChoice = Array.from(
      {length: mergedSettings.numMCQs},
      (_, index) => {
        const entry = uniqueEntries[index % uniqueEntries.length];
        return buildQuestion(
            "multiple_choice",
            entry,
            keywords,
            mergedSettings.difficulty,
            index,
        );
      },
  );

  const shortAnswer = Array.from(
      {length: mergedSettings.numSAQs},
      (_, index) => {
        const entry = uniqueEntries[
            (index + mergedSettings.numMCQs) % uniqueEntries.length
        ];

        return buildQuestion(
            "short_answer",
            entry,
            keywords,
            mergedSettings.difficulty,
            index,
        );
      },
  );

  const examProblems = Array.from(
      {length: mergedSettings.numEPs},
      (_, index) => {
        const entry = uniqueEntries[
            (
              index +
              mergedSettings.numMCQs +
              mergedSettings.numSAQs
            ) % uniqueEntries.length
        ];

        return buildQuestion(
            "exam_problem",
            entry,
            keywords,
            mergedSettings.difficulty,
            index,
        );
      },
  );

  const questions = dedupeByPrompt([
    ...multipleChoice,
    ...shortAnswer,
    ...examProblems,
  ]);

  const prettyName = path.basename(fileName, path.extname(fileName))
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  return {
    title: prettyName ? `${prettyName} Assessment Pack` : "Generated Assessment Pack",
    difficulty: mergedSettings.difficulty,
    subject: mergedSettings.subject,
    sourceSummary: buildSourceSummary(uniqueEntries),
    questions,
    flashcards: buildFlashcards(uniqueEntries, keywords),
    studyGuide: buildStudyGuide(uniqueEntries, keywords),
  };
}

async function extractImageText(fileBuffer) {
  const tempFilePath = path.join("/tmp", `quizkraft-${Date.now()}.img`);

  fs.writeFileSync(tempFilePath, fileBuffer);

  try {
    const {data: {text}} = await Tesseract.recognize(tempFilePath, "eng");

    return [{
      page: 1,
      text: normalizeWhitespace(text),
    }];
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

async function extractPdfTextByPage(fileBuffer, pageIndices) {
  const pages = [];

  for (const pageIndex of pageIndices) {
    const singlePageBuffer = await extractPages(fileBuffer, [pageIndex]);
    const parsed = await pdfParse(singlePageBuffer);

    pages.push({
      page: pageIndex + 1,
      text: normalizeWhitespace(parsed.text),
    });
  }

  return pages.filter((page) => page.text);
}

async function prepareSourceMaterial({
  fileBuffer,
  fileName,
  mimeType,
  pageRange,
}) {
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const fullPdfData = await pdfParse(fileBuffer);
    const pageCount = fullPdfData.numpages || 1;
    const selectedIndices = pageRange ?
      parsePageRange(pageRange, pageCount) :
      Array.from({length: pageCount}, (_, index) => index);
    const pageEntries = await extractPdfTextByPage(fileBuffer, selectedIndices);
    const selectedPages = selectedIndices.map((index) => index + 1);

    return {
      pageEntries,
      pageCount,
      selectedPages,
      extractionPreview: pageEntries.slice(0, 6).map((entry) => ({
        page: entry.page,
        snippet: entry.text.slice(0, 320),
      })),
    };
  }

  const imageEntries = await extractImageText(fileBuffer);

  return {
    pageEntries: imageEntries,
    pageCount: 1,
    selectedPages: [1],
    extractionPreview: imageEntries.map((entry) => ({
      page: entry.page,
      snippet: entry.text.slice(0, 320),
    })),
  };
}

function sanitizeQuestion(question, index) {
  return {
    id: question.id || `question-${index + 1}`,
    type: question.type || "short_answer",
    prompt: normalizeWhitespace(question.prompt),
    options: Array.isArray(question.options) ? question.options : [],
    correctAnswer: normalizeWhitespace(question.correctAnswer || ""),
    explanation: normalizeWhitespace(question.explanation || ""),
    difficulty: question.difficulty || "medium",
    topic: normalizeWhitespace(question.topic || "General"),
    enabled: question.enabled !== false,
    sourceRefs: Array.isArray(question.sourceRefs) ?
      question.sourceRefs
          .filter((ref) => ref && ref.page && ref.snippet)
          .map((ref) => ({
            page: Number(ref.page),
            snippet: normalizeWhitespace(ref.snippet).slice(0, 220),
          })) :
      [],
  };
}

function sanitizeQuizDocument(document) {
  return {
    title: normalizeWhitespace(document.title || "Generated Assessment Pack"),
    difficulty: document.difficulty || "medium",
    subject: normalizeWhitespace(document.subject || "STEM"),
    sourceSummary: normalizeWhitespace(document.sourceSummary || ""),
    questions: Array.isArray(document.questions) ?
      document.questions.map(sanitizeQuestion) :
      [],
    flashcards: Array.isArray(document.flashcards) ?
      document.flashcards.map((card, index) => ({
        id: card.id || `flashcard-${index + 1}`,
        front: normalizeWhitespace(card.front || ""),
        back: normalizeWhitespace(card.back || ""),
        topic: normalizeWhitespace(card.topic || "General"),
        sourceRefs: Array.isArray(card.sourceRefs) ?
          card.sourceRefs.map((ref) => ({
            page: Number(ref.page),
            snippet: normalizeWhitespace(ref.snippet).slice(0, 220),
          })) :
          [],
      })) :
      [],
    studyGuide: {
      title: normalizeWhitespace(document.studyGuide?.title || "Study Guide"),
      sections: Array.isArray(document.studyGuide?.sections) ?
        document.studyGuide.sections.map((section, index) => ({
          id: section.id || `section-${index + 1}`,
          heading: normalizeWhitespace(section.heading || "Key Concept"),
          summary: normalizeWhitespace(section.summary || ""),
          keyPoints: Array.isArray(section.keyPoints) ?
            section.keyPoints.map((point) => normalizeWhitespace(point)) :
            [],
          sourceRefs: Array.isArray(section.sourceRefs) ?
            section.sourceRefs.map((ref) => ({
              page: Number(ref.page),
              snippet: normalizeWhitespace(ref.snippet).slice(0, 220),
            })) :
            [],
        })) :
        [],
    },
  };
}

function serializeQuizForPractice(quiz) {
  return {
    id: quiz.id,
    title: quiz.title,
    difficulty: quiz.difficulty,
    subject: quiz.subject,
    sourceSummary: quiz.sourceSummary,
    questions: quiz.questions
        .filter((question) => question.enabled !== false)
        .map((question) => ({
          id: question.id,
          type: question.type,
          prompt: question.prompt,
          options: question.options || [],
          difficulty: question.difficulty,
          topic: question.topic,
          sourceRefs: question.sourceRefs || [],
        })),
  };
}

function compareFreeText(userAnswer, correctAnswer) {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  if (!normalizedUser || !normalizedCorrect) {
    return false;
  }

  if (normalizedUser === normalizedCorrect) {
    return true;
  }

  if (normalizedCorrect.includes(normalizedUser) ||
      normalizedUser.includes(normalizedCorrect)) {
    return true;
  }

  const correctWords = normalizedCorrect.split(/\s+/).filter(Boolean);
  const userWords = new Set(normalizedUser.split(/\s+/).filter(Boolean));
  const overlap = correctWords.filter((word) => userWords.has(word)).length;

  return overlap >= Math.max(2, Math.ceil(correctWords.length * 0.45));
}

function gradeSubmission(quiz, answers) {
  const questionResults = quiz.questions
      .filter((question) => question.enabled !== false)
      .map((question) => {
        const userAnswer = answers[question.id] || "";
        const isCorrect = question.type === "multiple_choice" ?
          normalizeAnswer(userAnswer) === normalizeAnswer(question.correctAnswer) :
          compareFreeText(userAnswer, question.correctAnswer);

        return {
          questionId: question.id,
          prompt: question.prompt,
          topic: question.topic,
          type: question.type,
          sourceRefs: question.sourceRefs || [],
          explanation: question.explanation,
          correctAnswer: question.correctAnswer,
          userAnswer,
          isCorrect,
        };
      });

  const correctCount = questionResults.filter((result) => result.isCorrect).length;
  const totalCount = questionResults.length || 1;
  const score = Math.round((correctCount / totalCount) * 100);
  const weakTopicCounts = new Map();

  questionResults.forEach((result) => {
    if (!result.isCorrect) {
      weakTopicCounts.set(
          result.topic,
          (weakTopicCounts.get(result.topic) || 0) + 1,
      );
    }
  });

  const weakTopics = Array.from(weakTopicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([topic, misses]) => ({topic, misses}));

  return {
    score,
    correctCount,
    totalCount,
    weakTopics,
    missedQuestionIds: questionResults
        .filter((result) => !result.isCorrect)
        .map((result) => result.questionId),
    questionResults,
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  JOB_STATUS,
  gradeSubmission,
  parsePageRange,
  prepareSourceMaterial,
  sanitizeQuizDocument,
  serializeQuizForPractice,
  createAssessmentPackage,
};
