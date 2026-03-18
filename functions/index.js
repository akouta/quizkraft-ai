const crypto = require("crypto");

const cors = require("cors");
const express = require("express");
const rateLimit = require("express-rate-limit");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onRequest} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");

const {
  DEFAULT_SETTINGS,
  JOB_STATUS,
  createAssessmentPackage,
  gradeSubmission,
  prepareSourceMaterial,
  sanitizeQuizDocument,
  serializeQuizForPractice,
} = require("./quizEngine");
const {
  buildPdfBuffer,
  buildQtiXml,
  buildWordBuffer,
} = require("./exportRoutes");

initializeApp();

const app = express();
const auth = getAuth();
const db = getFirestore();
const bucket = getStorage().bucket();

const corsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://quizcraft-3aee1.web.app",
  "https://quizkraft.com",
];

const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({limit: "8mb"}));

function now() {
  return Timestamp.now();
}

function createId() {
  return crypto.randomUUID();
}

function createSecretToken() {
  return crypto.randomBytes(18).toString("hex");
}

function isTimestampLike(value) {
  return value && typeof value.toDate === "function";
}

function serializeData(value) {
  if (Array.isArray(value)) {
    return value.map((item) => serializeData(item));
  }

  if (isTimestampLike(value)) {
    return value.toDate().toISOString();
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => {
          return [key, serializeData(nestedValue)];
        }),
    );
  }

  return value;
}

function mergeSettings(settings = {}) {
  return {
    difficulty: ["easy", "medium", "hard"].includes(settings.difficulty) ?
      settings.difficulty :
      DEFAULT_SETTINGS.difficulty,
    subject: settings.subject || DEFAULT_SETTINGS.subject,
    numMCQs: Math.max(0, Math.min(10, Number(settings.numMCQs ?? DEFAULT_SETTINGS.numMCQs))),
    numSAQs: Math.max(0, Math.min(10, Number(settings.numSAQs ?? DEFAULT_SETTINGS.numSAQs))),
    numEPs: Math.max(0, Math.min(10, Number(settings.numEPs ?? DEFAULT_SETTINGS.numEPs))),
  };
}

function requireStoragePathOwnership(storagePath, userId) {
  if (
    !storagePath ||
    typeof storagePath !== "string" ||
    !storagePath.startsWith(`uploads/${userId}/`)
  ) {
    throw new Error("Only first-party uploads owned by the current user are allowed.");
  }
}

function userDocRef(userId) {
  return db.collection("users").doc(userId);
}

function jobDocRef(userId, jobId) {
  return userDocRef(userId).collection("quizJobs").doc(jobId);
}

function quizDocRef(userId, quizId) {
  return userDocRef(userId).collection("quizzes").doc(quizId);
}

function practiceDocRef(userId, sessionId) {
  return userDocRef(userId).collection("practiceSessions").doc(sessionId);
}

function publishedQuizDocRef(quizId) {
  return db.collection("publishedQuizzes").doc(quizId);
}

function publicPracticeDocRef(sessionId) {
  return db.collection("practiceSessions").doc(sessionId);
}

async function requireVerifiedUser(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({error: "Missing bearer token."});
    return;
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const decoded = await auth.verifyIdToken(token);

    if (!decoded.email_verified) {
      res.status(403).json({error: "Verified email required."});
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({error: "Invalid authentication token."});
  }
}

async function syncPublishedQuiz(quiz) {
  if (quiz.status !== "published") {
    return;
  }

  await publishedQuizDocRef(quiz.id).set({
    ...quiz,
    publicPreviewEnabled: true,
  });
}

async function publishQuiz(userId, quizId) {
  const quizSnapshot = await quizDocRef(userId, quizId).get();

  if (!quizSnapshot.exists) {
    throw new Error("Draft quiz not found.");
  }

  const quiz = quizSnapshot.data();
  const publishedQuiz = {
    ...quiz,
    id: quizId,
    ownerUid: userId,
    status: "published",
    previewToken: quiz.previewToken || createSecretToken(),
    publicPreviewEnabled: true,
    publishedAt: quiz.publishedAt || now(),
    updatedAt: now(),
  };

  await quizDocRef(userId, quizId).set(publishedQuiz, {merge: true});
  await syncPublishedQuiz(publishedQuiz);

  return publishedQuiz;
}

async function processQuizJob(userId, jobId) {
  const jobReference = jobDocRef(userId, jobId);

  try {
    const jobSnapshot = await jobReference.get();

    if (!jobSnapshot.exists) {
      return;
    }

    const job = jobSnapshot.data();
    const sourcePath = job.source?.storagePath;

    requireStoragePathOwnership(sourcePath, userId);

    await jobReference.set({
      status: JOB_STATUS.EXTRACTING,
      updatedAt: now(),
      errorMessage: null,
    }, {merge: true});

    const [fileBuffer] = await bucket.file(sourcePath).download();
    const sourceMaterial = await prepareSourceMaterial({
      fileBuffer,
      fileName: job.source?.fileName || sourcePath,
      mimeType: job.source?.mimeType || "application/octet-stream",
      pageRange: job.source?.pageRange || "",
    });

    await jobReference.set({
      status: JOB_STATUS.GENERATING,
      updatedAt: now(),
      pageCount: sourceMaterial.pageCount,
      selectedPages: sourceMaterial.selectedPages,
      extractionPreview: sourceMaterial.extractionPreview,
    }, {merge: true});

    const generatedQuiz = sanitizeQuizDocument(createAssessmentPackage(
        sourceMaterial.pageEntries,
        job.settings,
        job.source?.fileName || sourcePath,
    ));

    const quizPayload = {
      id: jobId,
      jobId,
      ownerUid: userId,
      status: "draft",
      previewToken: null,
      title: generatedQuiz.title,
      difficulty: generatedQuiz.difficulty,
      subject: generatedQuiz.subject,
      sourceSummary: generatedQuiz.sourceSummary,
      questions: generatedQuiz.questions,
      flashcards: generatedQuiz.flashcards,
      studyGuide: generatedQuiz.studyGuide,
      source: {
        ...job.source,
        pageCount: sourceMaterial.pageCount,
        selectedPages: sourceMaterial.selectedPages,
      },
      createdAt: job.createdAt || now(),
      updatedAt: now(),
    };

    await quizDocRef(userId, jobId).set(quizPayload, {merge: true});

    await jobReference.set({
      status: JOB_STATUS.REVIEW_READY,
      updatedAt: now(),
      draftQuizId: jobId,
      generatedAssets: {
        title: quizPayload.title,
        difficulty: quizPayload.difficulty,
        subject: quizPayload.subject,
        sourceSummary: quizPayload.sourceSummary,
        questions: quizPayload.questions,
        flashcards: quizPayload.flashcards,
        studyGuide: quizPayload.studyGuide,
      },
    }, {merge: true});
  } catch (error) {
    await jobReference.set({
      status: JOB_STATUS.FAILED,
      updatedAt: now(),
      errorMessage: error.message || "Failed to process quiz job.",
    }, {merge: true});
  }
}

function sanitizeQuizUpdate(existingQuiz, payload = {}) {
  const sanitized = sanitizeQuizDocument({
    title: payload.title || existingQuiz.title,
    difficulty: payload.difficulty || existingQuiz.difficulty,
    subject: payload.subject || existingQuiz.subject,
    sourceSummary: payload.sourceSummary || existingQuiz.sourceSummary,
    questions: payload.questions || existingQuiz.questions,
    flashcards: payload.flashcards || existingQuiz.flashcards,
    studyGuide: payload.studyGuide || existingQuiz.studyGuide,
  });

  return {
    ...existingQuiz,
    ...sanitized,
    updatedAt: now(),
  };
}

function summarizeQuestionResults(sessions) {
  const weakTopics = new Map();
  const missedQuestions = new Map();
  let completedCount = 0;
  let scoreTotal = 0;

  sessions.forEach((session) => {
    if (session.status !== "completed") {
      return;
    }

    completedCount += 1;
    scoreTotal += session.results?.score || 0;

    (session.results?.weakTopics || []).forEach((entry) => {
      weakTopics.set(entry.topic, (weakTopics.get(entry.topic) || 0) + entry.misses);
    });

    (session.results?.questionResults || []).forEach((result) => {
      if (!result.isCorrect) {
        const missed = missedQuestions.get(result.questionId) || {
          questionId: result.questionId,
          prompt: result.prompt,
          misses: 0,
        };
        missed.misses += 1;
        missedQuestions.set(result.questionId, missed);
      }
    });
  });

  return {
    completionCount: completedCount,
    averageScore: completedCount ? Math.round(scoreTotal / completedCount) : 0,
    weakTopics: Array.from(weakTopics.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([topic, misses]) => ({topic, misses})),
    mostMissedQuestions: Array.from(missedQuestions.values())
        .sort((a, b) => b.misses - a.misses)
        .slice(0, 5),
  };
}

function publicQuizPayload(quiz) {
  return {
    id: quiz.id,
    title: quiz.title,
    difficulty: quiz.difficulty,
    subject: quiz.subject,
    sourceSummary: quiz.sourceSummary,
    questions: serializeQuizForPractice(quiz).questions,
  };
}

function buildExportResponse(format, bufferOrXml) {
  if (format === "pdf") {
    return {
      contentType: "application/pdf",
      filename: "quizkraft-assessment.pdf",
      body: bufferOrXml,
    };
  }

  if (format === "word") {
    return {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: "quizkraft-assessment.docx",
      body: bufferOrXml,
    };
  }

  return {
    contentType: "application/xml",
    filename: "quizkraft-assessment-qti.xml",
    body: Buffer.from(bufferOrXml, "utf8"),
  };
}

app.get("/health", (req, res) => {
  res.json({status: "ok"});
});

app.get("/quiz-jobs", requireVerifiedUser, async (req, res) => {
  const snapshot = await userDocRef(req.user.uid)
      .collection("quizJobs")
      .orderBy("updatedAt", "desc")
      .limit(20)
      .get();

  res.json({
    jobs: snapshot.docs.map((doc) => serializeData({
      id: doc.id,
      ...doc.data(),
    })),
  });
});

app.post("/quiz-jobs", requireVerifiedUser, authenticatedLimiter, async (req, res) => {
  try {
    const settings = mergeSettings(req.body.settings);
    const source = {
      storagePath: req.body.storagePath,
      fileName: req.body.fileName || req.body.storagePath,
      mimeType: req.body.mimeType || "application/octet-stream",
      pageRange: req.body.pageRange || "",
    };

    requireStoragePathOwnership(source.storagePath, req.user.uid);

    const jobId = createId();
    const payload = {
      id: jobId,
      ownerUid: req.user.uid,
      status: JOB_STATUS.QUEUED,
      source,
      settings,
      errorMessage: null,
      createdAt: now(),
      updatedAt: now(),
    };

    await jobDocRef(req.user.uid, jobId).set(payload);

    res.status(202).json(serializeData(payload));
  } catch (error) {
    res.status(400).json({error: error.message || "Failed to create quiz job."});
  }
});

app.get("/quiz-jobs/:id", requireVerifiedUser, async (req, res) => {
  const snapshot = await jobDocRef(req.user.uid, req.params.id).get();

  if (!snapshot.exists) {
    res.status(404).json({error: "Quiz job not found."});
    return;
  }

  res.json(serializeData({
    id: snapshot.id,
    ...snapshot.data(),
  }));
});

app.post(
    "/quiz-jobs/:id/publish",
    requireVerifiedUser,
    authenticatedLimiter,
    async (req, res) => {
      try {
        const quiz = await publishQuiz(req.user.uid, req.params.id);
        res.json(serializeData(quiz));
      } catch (error) {
        res.status(400).json({error: error.message || "Failed to publish quiz."});
      }
    },
);

app.get("/quizzes", requireVerifiedUser, async (req, res) => {
  const snapshot = await userDocRef(req.user.uid)
      .collection("quizzes")
      .orderBy("updatedAt", "desc")
      .limit(30)
      .get();

  res.json({
    quizzes: snapshot.docs.map((doc) => serializeData({
      id: doc.id,
      ...doc.data(),
    })),
  });
});

app.get("/quizzes/:id", requireVerifiedUser, async (req, res) => {
  const snapshot = await quizDocRef(req.user.uid, req.params.id).get();

  if (!snapshot.exists) {
    res.status(404).json({error: "Quiz not found."});
    return;
  }

  res.json(serializeData({
    id: snapshot.id,
    ...snapshot.data(),
  }));
});

app.put(
    "/quizzes/:id",
    requireVerifiedUser,
    authenticatedLimiter,
    async (req, res) => {
      const quizReference = quizDocRef(req.user.uid, req.params.id);
      const snapshot = await quizReference.get();

      if (!snapshot.exists) {
        res.status(404).json({error: "Quiz not found."});
        return;
      }

      const updatedQuiz = sanitizeQuizUpdate(snapshot.data(), req.body);

      await quizReference.set(updatedQuiz, {merge: true});
      await syncPublishedQuiz(updatedQuiz);

      res.json(serializeData({
        id: req.params.id,
        ...updatedQuiz,
      }));
    },
);

app.post(
    "/quizzes/:id/publish",
    requireVerifiedUser,
    authenticatedLimiter,
    async (req, res) => {
      try {
        const quiz = await publishQuiz(req.user.uid, req.params.id);
        res.json(serializeData(quiz));
      } catch (error) {
        res.status(400).json({error: error.message || "Failed to publish quiz."});
      }
    },
);

app.get("/quizzes/:id/results", requireVerifiedUser, async (req, res) => {
  const snapshot = await userDocRef(req.user.uid)
      .collection("practiceSessions")
      .where("quizId", "==", req.params.id)
      .orderBy("createdAt", "desc")
      .get();

  const sessions = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  res.json(serializeData({
    quizId: req.params.id,
    ...summarizeQuestionResults(sessions),
  }));
});

app.post(
    "/quizzes/:id/export",
    requireVerifiedUser,
    authenticatedLimiter,
    async (req, res) => {
      const snapshot = await quizDocRef(req.user.uid, req.params.id).get();

      if (!snapshot.exists) {
        res.status(404).json({error: "Quiz not found."});
        return;
      }

      const quiz = snapshot.data();
      const format = req.body.format || "pdf";
      const includeAnswers = Boolean(req.body.includeAnswers);
      let exportBody;

      if (format === "pdf") {
        exportBody = await buildPdfBuffer(quiz, includeAnswers);
      } else if (format === "word") {
        exportBody = await buildWordBuffer(quiz, includeAnswers);
      } else if (format === "qti") {
        exportBody = buildQtiXml(quiz);
      } else {
        res.status(400).json({error: "Unsupported export format."});
        return;
      }

      const exportResponse = buildExportResponse(format, exportBody);

      res.setHeader("Content-Type", exportResponse.contentType);
      res.setHeader(
          "Content-Disposition",
          `attachment; filename="${exportResponse.filename}"`,
      );
      res.send(exportResponse.body);
    },
);

app.get("/public/quizzes/:id", async (req, res) => {
  const snapshot = await publishedQuizDocRef(req.params.id).get();
  const previewToken = req.query.token;

  if (!snapshot.exists) {
    res.status(404).json({error: "Published quiz not found."});
    return;
  }

  const quiz = snapshot.data();

  if (!previewToken || previewToken !== quiz.previewToken) {
    res.status(403).json({error: "Preview token required."});
    return;
  }

  res.json(serializeData({
    quiz: publicQuizPayload(quiz),
    previewToken,
  }));
});

app.post("/practice-sessions", publicLimiter, async (req, res) => {
  const {quizId, previewToken, participantName, timedMode, questionIds} = req.body;
  const quizSnapshot = await publishedQuizDocRef(quizId).get();

  if (!quizSnapshot.exists) {
    res.status(404).json({error: "Published quiz not found."});
    return;
  }

  const quiz = quizSnapshot.data();

  if (!previewToken || previewToken !== quiz.previewToken) {
    res.status(403).json({error: "Preview token required."});
    return;
  }

  const selectedQuestionIds = Array.isArray(questionIds) ? new Set(questionIds) : null;
  const selectedQuestions = (quiz.questions || []).filter((question) => {
    if (question.enabled === false) {
      return false;
    }

    if (!selectedQuestionIds) {
      return true;
    }

    return selectedQuestionIds.has(question.id);
  });

  const sessionId = createId();
  const sessionToken = createSecretToken();
  const sessionPayload = {
    id: sessionId,
    ownerUid: quiz.ownerUid,
    quizId,
    previewToken,
    participantName: participantName || "Guest learner",
    timedMode: Boolean(timedMode),
    status: "in_progress",
    questionIds: selectedQuestions.map((question) => question.id),
    answers: {},
    quizSnapshot: {
      id: quiz.id,
      title: quiz.title,
      difficulty: quiz.difficulty,
      subject: quiz.subject,
      sourceSummary: quiz.sourceSummary,
      questions: selectedQuestions,
    },
    sessionToken,
    createdAt: now(),
    updatedAt: now(),
  };

  await publicPracticeDocRef(sessionId).set(sessionPayload);
  await practiceDocRef(quiz.ownerUid, sessionId).set(sessionPayload);

  res.status(201).json(serializeData({
    sessionId,
    sessionToken,
    quiz: serializeQuizForPractice(sessionPayload.quizSnapshot),
  }));
});

app.get("/practice-sessions/:id", publicLimiter, async (req, res) => {
  const snapshot = await publicPracticeDocRef(req.params.id).get();
  const sessionToken = req.query.token;

  if (!snapshot.exists) {
    res.status(404).json({error: "Practice session not found."});
    return;
  }

  const session = snapshot.data();

  if (!sessionToken || sessionToken !== session.sessionToken) {
    res.status(403).json({error: "Practice session token required."});
    return;
  }

  res.json(serializeData({
    id: snapshot.id,
    status: session.status,
    quizId: session.quizId,
    previewToken: session.previewToken,
    quiz: serializeQuizForPractice(session.quizSnapshot),
    results: session.results || null,
  }));
});

app.post(
    "/practice-sessions/:id/submit",
    publicLimiter,
    async (req, res) => {
      const snapshot = await publicPracticeDocRef(req.params.id).get();

      if (!snapshot.exists) {
        res.status(404).json({error: "Practice session not found."});
        return;
      }

      const session = snapshot.data();
      const sessionToken = req.body.sessionToken;

      if (!sessionToken || sessionToken !== session.sessionToken) {
        res.status(403).json({error: "Practice session token required."});
        return;
      }

      const answers = req.body.answers || {};
      const results = gradeSubmission(session.quizSnapshot, answers);
      const completedPayload = {
        ...session,
        status: "completed",
        answers,
        durationSeconds: Number(req.body.durationSeconds || 0),
        results,
        completedAt: now(),
        updatedAt: now(),
      };

      await publicPracticeDocRef(req.params.id).set(completedPayload, {merge: true});
      await practiceDocRef(session.ownerUid, req.params.id).set(
          completedPayload,
          {merge: true},
      );

      res.json(serializeData({
        sessionId: req.params.id,
        quizId: session.quizId,
        previewToken: session.previewToken,
        status: "completed",
        results,
      }));
    },
);

exports.api = onRequest({
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 120,
}, app);

exports.handleQuizJobCreate = onDocumentCreated({
  document: "users/{userId}/quizJobs/{jobId}",
  region: "us-central1",
  memory: "1GiB",
  timeoutSeconds: 120,
}, async (event) => {
  if (!event.data) {
    return;
  }

  await processQuizJob(event.params.userId, event.params.jobId);
});
