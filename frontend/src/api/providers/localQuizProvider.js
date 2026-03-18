import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import {
  JOB_STATUS,
  createAssessmentPackage,
  gradeSubmission,
  mergeSettings,
  prepareSourceMaterial,
  sanitizeQuizDocument,
  serializeQuizForPractice,
} from "../../lib/browserAssessment";
import { buildExportBlob } from "../../lib/browserExport";

function now() {
  return new Date().toISOString();
}

function createId(prefix = "") {
  const cryptoApi = typeof window !== "undefined" ? window.crypto : null;
  const base =
    cryptoApi?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return prefix ? `${prefix}${base}` : base;
}

function requireVerifiedUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!user.emailVerified) {
    throw new Error("Verified email required.");
  }

  return user;
}

function userCollection(userId, path) {
  return collection(db, "users", userId, path);
}

function userDocument(userId, collectionName, documentId) {
  return doc(db, "users", userId, collectionName, documentId);
}

function sortByUpdated(items) {
  return [...items].sort((left, right) => {
    const leftDate = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightDate = new Date(right.updatedAt || right.createdAt || 0).getTime();
    return rightDate - leftDate;
  });
}

function mapSnapshot(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function summarizeQuestionResults(sessions) {
  const weakTopics = new Map();
  const missedQuestions = new Map();
  let completedCount = 0;
  let scoreTotal = 0;

  sessions.forEach((session) => {
    if (session.status !== "completed" || !session.results) {
      return;
    }

    completedCount += 1;
    scoreTotal += session.results.score || 0;

    (session.results.weakTopics || []).forEach((entry) => {
      weakTopics.set(entry.topic, (weakTopics.get(entry.topic) || 0) + entry.misses);
    });

    (session.results.questionResults || []).forEach((result) => {
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
      .sort((left, right) => right[1] - left[1])
      .map(([topic, misses]) => ({ topic, misses })),
    mostMissedQuestions: Array.from(missedQuestions.values())
      .sort((left, right) => right.misses - left.misses)
      .slice(0, 5),
  };
}

async function syncPublishedQuiz(quiz) {
  if (quiz.status !== "published" || !quiz.publicId) {
    return;
  }

  await setDoc(doc(db, "publishedQuizzes", quiz.publicId), {
    ...quiz,
    publicPreviewEnabled: true,
    sourceQuizId: quiz.id,
  });
}

async function listQuizJobs() {
  const user = requireVerifiedUser();
  const snapshot = await getDocs(userCollection(user.uid, "quizJobs"));

  return {
    jobs: sortByUpdated(snapshot.docs.map(mapSnapshot)).slice(0, 20),
  };
}

async function createQuizJob(payload) {
  const user = requireVerifiedUser();
  const jobId = createId();
  const settings = mergeSettings(payload.settings);
  const source = {
    fileName: payload.file?.name || "Untitled source",
    mimeType: payload.file?.type || "application/octet-stream",
    pageRange: payload.pageRange || "",
  };
  const jobReference = userDocument(user.uid, "quizJobs", jobId);
  const quizReference = userDocument(user.uid, "quizzes", jobId);

  let job = {
    id: jobId,
    ownerUid: user.uid,
    status: JOB_STATUS.UPLOADING,
    source,
    settings,
    errorMessage: null,
    createdAt: now(),
    updatedAt: now(),
  };

  await setDoc(jobReference, job);
  payload.onJobUpdate?.(job, {
    status: JOB_STATUS.UPLOADING,
    progress: 5,
  });

  try {
    let stagePersisted = job.status;

    const sourceMaterial = await prepareSourceMaterial({
      file: payload.file,
      fileName: source.fileName,
      mimeType: source.mimeType,
      pageRange: source.pageRange,
      onProgress(progressUpdate) {
        if (progressUpdate.status && progressUpdate.status !== stagePersisted) {
          stagePersisted = progressUpdate.status;
          job = {
            ...job,
            status: progressUpdate.status,
            updatedAt: now(),
          };
          setDoc(jobReference, job, { merge: true }).catch(() => {});
        }

        payload.onJobUpdate?.(
          {
            ...job,
            status: progressUpdate.status,
            updatedAt: now(),
          },
          progressUpdate
        );
      },
    });

    job = {
      ...job,
      status: JOB_STATUS.GENERATING,
      pageCount: sourceMaterial.pageCount,
      selectedPages: sourceMaterial.selectedPages,
      extractionPreview: sourceMaterial.extractionPreview,
      updatedAt: now(),
    };

    await setDoc(jobReference, job, { merge: true });
    payload.onJobUpdate?.(job, {
      status: JOB_STATUS.GENERATING,
      progress: 82,
    });

    const generatedQuiz = sanitizeQuizDocument(
      createAssessmentPackage(sourceMaterial.pageEntries, settings, source.fileName)
    );

    const quizPayload = {
      id: jobId,
      jobId,
      ownerUid: user.uid,
      status: "draft",
      publicId: null,
      title: generatedQuiz.title,
      difficulty: generatedQuiz.difficulty,
      subject: generatedQuiz.subject,
      sourceSummary: generatedQuiz.sourceSummary,
      questions: generatedQuiz.questions,
      flashcards: generatedQuiz.flashcards,
      studyGuide: generatedQuiz.studyGuide,
      source: {
        ...source,
        pageCount: sourceMaterial.pageCount,
        selectedPages: sourceMaterial.selectedPages,
      },
      createdAt: now(),
      updatedAt: now(),
    };

    await setDoc(quizReference, quizPayload);

    job = {
      ...job,
      status: JOB_STATUS.REVIEW_READY,
      draftQuizId: jobId,
      generatedAssets: {
        title: quizPayload.title,
        questionCount: quizPayload.questions.length,
        flashcardCount: quizPayload.flashcards.length,
        studyGuideSections: quizPayload.studyGuide.sections.length,
      },
      updatedAt: now(),
    };

    await setDoc(jobReference, job, { merge: true });
    payload.onJobUpdate?.(job, {
      status: JOB_STATUS.REVIEW_READY,
      progress: 100,
    });

    return job;
  } catch (error) {
    const failedJob = {
      ...job,
      status: JOB_STATUS.FAILED,
      errorMessage: error.message || "Failed to process quiz job.",
      updatedAt: now(),
    };

    await setDoc(jobReference, failedJob, { merge: true });
    payload.onJobUpdate?.(failedJob, {
      status: JOB_STATUS.FAILED,
      progress: 100,
    });
    throw error;
  }
}

async function getQuizJob(jobId) {
  const user = requireVerifiedUser();
  const snapshot = await getDoc(userDocument(user.uid, "quizJobs", jobId));

  if (!snapshot.exists()) {
    throw new Error("Quiz job not found.");
  }

  return mapSnapshot(snapshot);
}

async function publishJob(jobId) {
  return publishQuiz(jobId);
}

async function listQuizzes() {
  const user = requireVerifiedUser();
  const snapshot = await getDocs(userCollection(user.uid, "quizzes"));

  return {
    quizzes: sortByUpdated(snapshot.docs.map(mapSnapshot)).slice(0, 30),
  };
}

async function getQuiz(quizId) {
  const user = requireVerifiedUser();
  const snapshot = await getDoc(userDocument(user.uid, "quizzes", quizId));

  if (!snapshot.exists()) {
    throw new Error("Quiz not found.");
  }

  return mapSnapshot(snapshot);
}

async function updateQuiz(quizId, payload) {
  const user = requireVerifiedUser();
  const quizReference = userDocument(user.uid, "quizzes", quizId);
  const snapshot = await getDoc(quizReference);

  if (!snapshot.exists()) {
    throw new Error("Quiz not found.");
  }

  const existingQuiz = snapshot.data();
  const sanitized = sanitizeQuizDocument({
    title: payload.title || existingQuiz.title,
    difficulty: payload.difficulty || existingQuiz.difficulty,
    subject: payload.subject || existingQuiz.subject,
    sourceSummary: payload.sourceSummary || existingQuiz.sourceSummary,
    questions: payload.questions || existingQuiz.questions,
    flashcards: payload.flashcards || existingQuiz.flashcards,
    studyGuide: payload.studyGuide || existingQuiz.studyGuide,
  });

  const updatedQuiz = {
    ...existingQuiz,
    ...sanitized,
    id: quizId,
    updatedAt: now(),
  };

  await setDoc(quizReference, updatedQuiz, { merge: true });
  await syncPublishedQuiz(updatedQuiz);
  return updatedQuiz;
}

async function publishQuiz(quizId) {
  const user = requireVerifiedUser();
  const quizReference = userDocument(user.uid, "quizzes", quizId);
  const snapshot = await getDoc(quizReference);

  if (!snapshot.exists()) {
    throw new Error("Draft quiz not found.");
  }

  const quiz = snapshot.data();
  const publishedQuiz = {
    ...quiz,
    id: quizId,
    status: "published",
    ownerUid: user.uid,
    publicId: quiz.publicId || createId("share_"),
    publicPreviewEnabled: true,
    publishedAt: quiz.publishedAt || now(),
    updatedAt: now(),
  };

  await setDoc(quizReference, publishedQuiz, { merge: true });
  await syncPublishedQuiz(publishedQuiz);
  return publishedQuiz;
}

async function getQuizResults(quizId) {
  const user = requireVerifiedUser();
  const snapshot = await getDocs(
    query(collection(db, "practiceSessions"), where("ownerUid", "==", user.uid))
  );
  const sessions = snapshot.docs
    .map(mapSnapshot)
    .filter((session) => session.sourceQuizId === quizId);

  return {
    quizId,
    ...summarizeQuestionResults(sessions),
  };
}

async function exportQuiz(quizId, payload) {
  const quiz = await getQuiz(quizId);
  return buildExportBlob(quiz, payload.format, Boolean(payload.includeAnswers));
}

async function getPublicQuiz(quizId) {
  const snapshot = await getDoc(doc(db, "publishedQuizzes", quizId));

  if (!snapshot.exists()) {
    throw new Error("Published quiz not found.");
  }

  const quiz = mapSnapshot(snapshot);

  if (!quiz.publicPreviewEnabled) {
    throw new Error("This quiz is not available for practice.");
  }

  return {
    quiz: serializeQuizForPractice(quiz),
  };
}

async function startPracticeSession(payload) {
  const snapshot = await getDoc(doc(db, "publishedQuizzes", payload.quizId));

  if (!snapshot.exists()) {
    throw new Error("Practice quiz not found.");
  }

  const publishedQuiz = mapSnapshot(snapshot);
  const sessionId = createId("session_");
  const sessionDocument = {
    id: sessionId,
    ownerUid: publishedQuiz.ownerUid,
    sourceQuizId: publishedQuiz.sourceQuizId || publishedQuiz.id,
    publicQuizId: payload.quizId,
    participantName: payload.participantName || "",
    timedMode: Boolean(payload.timedMode),
    questionIds: Array.isArray(payload.questionIds) ? payload.questionIds : [],
    status: "in_progress",
    publicAccess: true,
    createdAt: now(),
    updatedAt: now(),
    results: null,
  };

  await setDoc(doc(db, "practiceSessions", sessionId), sessionDocument);

  return {
    sessionId,
    quiz: serializeQuizForPractice(publishedQuiz, sessionDocument.questionIds),
  };
}

async function getPracticeSession(sessionId) {
  const snapshot = await getDoc(doc(db, "practiceSessions", sessionId));

  if (!snapshot.exists()) {
    throw new Error("Practice session not found.");
  }

  const session = mapSnapshot(snapshot);

  return {
    sessionId,
    quizId: session.publicQuizId,
    results: session.results,
    participantName: session.participantName || "",
  };
}

async function submitPracticeSession(sessionId, payload) {
  const sessionReference = doc(db, "practiceSessions", sessionId);
  const sessionSnapshot = await getDoc(sessionReference);

  if (!sessionSnapshot.exists()) {
    throw new Error("Practice session not found.");
  }

  const session = mapSnapshot(sessionSnapshot);
  const publicQuizSnapshot = await getDoc(doc(db, "publishedQuizzes", session.publicQuizId));

  if (!publicQuizSnapshot.exists()) {
    throw new Error("The published quiz for this session is no longer available.");
  }

  const publicQuiz = mapSnapshot(publicQuizSnapshot);
  const selectedIds =
    Array.isArray(session.questionIds) && session.questionIds.length
      ? new Set(session.questionIds)
      : null;
  const quizForGrading = {
    ...publicQuiz,
    questions: (publicQuiz.questions || []).filter(
      (question) => !selectedIds || selectedIds.has(question.id)
    ),
  };
  const results = gradeSubmission(quizForGrading, payload.answers || {});
  const completedSession = {
    ...session,
    durationSeconds: Number(payload.durationSeconds || 0),
    results,
    status: "completed",
    submittedAt: now(),
    updatedAt: now(),
  };

  await updateDoc(sessionReference, completedSession);

  return {
    sessionId,
    quizId: session.publicQuizId,
    results,
  };
}

export const localQuizProvider = {
  createQuizJob,
  exportQuiz,
  getPracticeSession,
  getPublicQuiz,
  getQuiz,
  getQuizJob,
  getQuizResults,
  listQuizJobs,
  listQuizzes,
  publishJob,
  publishQuiz,
  startPracticeSession,
  submitPracticeSession,
  updateQuiz,
};
