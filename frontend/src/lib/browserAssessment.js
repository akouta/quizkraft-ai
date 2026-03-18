import * as pdfjsLib from "pdfjs-dist/webpack";
import { createWorker } from "tesseract.js";

export const DEFAULT_SETTINGS = {
  difficulty: "medium",
  subject: "STEM",
  numMCQs: 4,
  numSAQs: 3,
  numEPs: 2,
};

export const JOB_STATUS = {
  UPLOADING: "uploading",
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

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeAnswer(value = "") {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");
}

function parseFileName(fileName = "") {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePageRange(pageRangeString, pageCount) {
  const pageIndices = new Set();
  const matches = pageRangeString.match(/\d+(-\d+)?/g);

  if (!matches) {
    return [];
  }

  matches.forEach((range) => {
    if (range.includes("-")) {
      const [start, end] = range.split("-").map((value) => Number.parseInt(value, 10));

      if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
        throw new Error(`Range ${start}-${end} is out of bounds.`);
      }

      for (let index = start - 1; index < end; index += 1) {
        pageIndices.add(index);
      }

      return;
    }

    const page = Number.parseInt(range, 10);

    if (page < 1 || page > pageCount) {
      throw new Error(`Page ${page} is out of bounds.`);
    }

    pageIndices.add(page - 1);
  });

  return Array.from(pageIndices).sort((left, right) => left - right);
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
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function sentenceScore(sentence, keywords) {
  const lowerSentence = sentence.toLowerCase();
  const keywordHits = keywords.filter((keyword) => lowerSentence.includes(keyword)).length;
  return keywordHits * 5 + Math.min(sentence.length, 180) / 60;
}

function pickKeyword(sentence, keywords) {
  const sentenceWords = sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4 && !STOP_WORDS.has(word));

  const keyword = keywords.find((candidate) => sentenceWords.includes(candidate));
  return keyword || sentenceWords[0] || "concept";
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

  return uniqueOptions.sort((left, right) => left.localeCompare(right));
}

function createSourceRef(page, sentence) {
  return [
    {
      page,
      snippet: sentence.slice(0, 220),
    },
  ];
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
    const relatedEntries = sentenceEntries
      .filter((entry) => entry.text.toLowerCase().includes(keyword))
      .slice(0, 2);
    const fallbackEntries = relatedEntries.length
      ? relatedEntries
      : sentenceEntries.slice(index, index + 2);
    const keyPoints = fallbackEntries.map((entry) => entry.text);

    return {
      id: `section-${index + 1}`,
      heading: keyword.charAt(0).toUpperCase() + keyword.slice(1),
      summary: keyPoints[0] || `Source-backed overview of ${keyword}.`,
      keyPoints,
      sourceRefs: fallbackEntries.flatMap((entry) => createSourceRef(entry.page, entry.text)),
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

export function createAssessmentPackage(pageEntries, settings, fileName) {
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
  const combinedText = pageEntries.map((entry) => entry.text).join(" ");
  const keywords = extractKeywords(combinedText);
  const rankedEntries = pageEntries
    .flatMap((entry) =>
      splitSentences(entry.text).map((sentence) => ({
        page: entry.page,
        text: sentence,
        score: sentenceScore(sentence, keywords),
      }))
    )
    .sort((left, right) => right.score - left.score);

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

  const multipleChoice = Array.from({ length: mergedSettings.numMCQs }, (_, index) => {
    const entry = uniqueEntries[index % uniqueEntries.length];
    return buildQuestion("multiple_choice", entry, keywords, mergedSettings.difficulty, index);
  });

  const shortAnswer = Array.from({ length: mergedSettings.numSAQs }, (_, index) => {
    const entry = uniqueEntries[(index + mergedSettings.numMCQs) % uniqueEntries.length];
    return buildQuestion("short_answer", entry, keywords, mergedSettings.difficulty, index);
  });

  const examProblems = Array.from({ length: mergedSettings.numEPs }, (_, index) => {
    const entry =
      uniqueEntries[
        (index + mergedSettings.numMCQs + mergedSettings.numSAQs) % uniqueEntries.length
      ];
    return buildQuestion("exam_problem", entry, keywords, mergedSettings.difficulty, index);
  });

  const questions = dedupeByPrompt([...multipleChoice, ...shortAnswer, ...examProblems]);
  const prettyName = parseFileName(fileName);

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

async function readFileAsArrayBuffer(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Could not read the selected file."));
    };

    reader.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }

      onProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
    };

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.readAsArrayBuffer(file);
  });
}

async function extractPdfTextByPage(fileBuffer, pageIndices, onProgress) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let index = 0; index < pageIndices.length; index += 1) {
    const pageIndex = pageIndices[index];
    const page = await pdf.getPage(pageIndex + 1);
    const textContent = await page.getTextContent();
    const text = normalizeWhitespace(
      textContent.items.map((item) => item.str || "").join(" ")
    );

    if (text) {
      pages.push({
        page: pageIndex + 1,
        text,
      });
    }

    page.cleanup();
    onProgress?.({
      completedPages: index + 1,
      totalPages: pageIndices.length,
      page: pageIndex + 1,
    });
  }

  loadingTask.destroy();
  return {
    pageCount: pdf.numPages || 1,
    pageEntries: pages,
  };
}

async function extractImageText(file, onProgress) {
  const worker = await createWorker("eng", 1, {
    logger(message) {
      if (message.status === "recognizing text") {
        onProgress?.(Math.max(1, Math.round(message.progress * 100)));
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(file);

    return [
      {
        page: 1,
        text: normalizeWhitespace(text),
      },
    ];
  } finally {
    await worker.terminate();
  }
}

export async function prepareSourceMaterial({
  file,
  fileName,
  mimeType,
  pageRange,
  onProgress,
}) {
  const isPdf =
    mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  onProgress?.({
    status: JOB_STATUS.UPLOADING,
    progress: 5,
  });

  const fileBuffer = await readFileAsArrayBuffer(file, (progress) => {
    onProgress?.({
      status: JOB_STATUS.UPLOADING,
      progress: Math.round(progress * 0.3),
    });
  });

  if (isPdf) {
    const previewPdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) }).promise;
    const pageCount = previewPdf.numPages || 1;
    previewPdf.cleanup();
    const selectedIndices = pageRange
      ? parsePageRange(pageRange, pageCount)
      : Array.from({ length: pageCount }, (_, index) => index);

    onProgress?.({
      status: JOB_STATUS.EXTRACTING,
      progress: 35,
    });

    const extracted = await extractPdfTextByPage(fileBuffer, selectedIndices, (progressData) => {
      const ratio = progressData.totalPages
        ? progressData.completedPages / progressData.totalPages
        : 1;

      onProgress?.({
        status: JOB_STATUS.EXTRACTING,
        progress: 35 + Math.round(ratio * 35),
      });
    });

    return {
      pageEntries: extracted.pageEntries,
      pageCount: extracted.pageCount,
      selectedPages: selectedIndices.map((index) => index + 1),
      extractionPreview: extracted.pageEntries.slice(0, 6).map((entry) => ({
        page: entry.page,
        snippet: entry.text.slice(0, 320),
      })),
    };
  }

  onProgress?.({
    status: JOB_STATUS.EXTRACTING,
    progress: 35,
  });

  const imageEntries = await extractImageText(file, (progress) => {
    onProgress?.({
      status: JOB_STATUS.EXTRACTING,
      progress: 35 + Math.round(progress * 0.35),
    });
  });

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
    sourceRefs: Array.isArray(question.sourceRefs)
      ? question.sourceRefs
          .filter((ref) => ref && ref.page && ref.snippet)
          .map((ref) => ({
            page: Number(ref.page),
            snippet: normalizeWhitespace(ref.snippet).slice(0, 220),
          }))
      : [],
  };
}

export function sanitizeQuizDocument(document) {
  return {
    title: normalizeWhitespace(document.title || "Generated Assessment Pack"),
    difficulty: document.difficulty || "medium",
    subject: normalizeWhitespace(document.subject || "STEM"),
    sourceSummary: normalizeWhitespace(document.sourceSummary || ""),
    questions: Array.isArray(document.questions)
      ? document.questions.map(sanitizeQuestion)
      : [],
    flashcards: Array.isArray(document.flashcards)
      ? document.flashcards.map((card, index) => ({
          id: card.id || `flashcard-${index + 1}`,
          front: normalizeWhitespace(card.front || ""),
          back: normalizeWhitespace(card.back || ""),
          topic: normalizeWhitespace(card.topic || "General"),
          sourceRefs: Array.isArray(card.sourceRefs)
            ? card.sourceRefs.map((ref) => ({
                page: Number(ref.page),
                snippet: normalizeWhitespace(ref.snippet).slice(0, 220),
              }))
            : [],
        }))
      : [],
    studyGuide: {
      title: normalizeWhitespace(document.studyGuide?.title || "Study Guide"),
      sections: Array.isArray(document.studyGuide?.sections)
        ? document.studyGuide.sections.map((section, index) => ({
            id: section.id || `section-${index + 1}`,
            heading: normalizeWhitespace(section.heading || "Key Concept"),
            summary: normalizeWhitespace(section.summary || ""),
            keyPoints: Array.isArray(section.keyPoints)
              ? section.keyPoints.map((point) => normalizeWhitespace(point))
              : [],
            sourceRefs: Array.isArray(section.sourceRefs)
              ? section.sourceRefs.map((ref) => ({
                  page: Number(ref.page),
                  snippet: normalizeWhitespace(ref.snippet).slice(0, 220),
                }))
              : [],
          }))
        : [],
    },
  };
}

export function serializeQuizForPractice(quiz, selectedQuestionIds = null) {
  const allowedIds = Array.isArray(selectedQuestionIds) && selectedQuestionIds.length
    ? new Set(selectedQuestionIds)
    : null;

  return {
    id: quiz.id,
    title: quiz.title,
    difficulty: quiz.difficulty,
    subject: quiz.subject,
    sourceSummary: quiz.sourceSummary,
    questions: (quiz.questions || [])
      .filter((question) => question.enabled !== false)
      .filter((question) => !allowedIds || allowedIds.has(question.id))
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

  if (
    normalizedCorrect.includes(normalizedUser) ||
    normalizedUser.includes(normalizedCorrect)
  ) {
    return true;
  }

  const correctWords = normalizedCorrect.split(/\s+/).filter(Boolean);
  const userWords = new Set(normalizedUser.split(/\s+/).filter(Boolean));
  const overlap = correctWords.filter((word) => userWords.has(word)).length;

  return overlap >= Math.max(2, Math.ceil(correctWords.length * 0.45));
}

export function gradeSubmission(quiz, answers) {
  const questionResults = (quiz.questions || [])
    .filter((question) => question.enabled !== false)
    .map((question) => {
      const userAnswer = answers[question.id] || "";
      const isCorrect =
        question.type === "multiple_choice"
          ? normalizeAnswer(userAnswer) === normalizeAnswer(question.correctAnswer)
          : compareFreeText(userAnswer, question.correctAnswer);

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
      weakTopicCounts.set(result.topic, (weakTopicCounts.get(result.topic) || 0) + 1);
    }
  });

  const weakTopics = Array.from(weakTopicCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([topic, misses]) => ({ topic, misses }));

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

export function mergeSettings(settings = {}) {
  return {
    difficulty: ["easy", "medium", "hard"].includes(settings.difficulty)
      ? settings.difficulty
      : DEFAULT_SETTINGS.difficulty,
    subject: settings.subject || DEFAULT_SETTINGS.subject,
    numMCQs: Math.max(0, Math.min(10, Number(settings.numMCQs ?? DEFAULT_SETTINGS.numMCQs))),
    numSAQs: Math.max(0, Math.min(10, Number(settings.numSAQs ?? DEFAULT_SETTINGS.numSAQs))),
    numEPs: Math.max(0, Math.min(10, Number(settings.numEPs ?? DEFAULT_SETTINGS.numEPs))),
  };
}
