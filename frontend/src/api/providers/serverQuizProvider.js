import { apiRequest } from "../client";

function requireServerBaseUrl() {
  if (!process.env.REACT_APP_FUNCTION_URL) {
    throw new Error(
      "Server quiz provider selected, but REACT_APP_FUNCTION_URL is not configured."
    );
  }
}

function withoutLocalOnlyFields(payload = {}) {
  const nextPayload = { ...payload };
  delete nextPayload.file;
  delete nextPayload.onJobUpdate;
  return nextPayload;
}

async function listQuizJobs() {
  requireServerBaseUrl();
  return apiRequest("/quiz-jobs");
}

async function createQuizJob(payload) {
  requireServerBaseUrl();
  const requestBody = withoutLocalOnlyFields(payload);
  const response = await apiRequest("/quiz-jobs", {
    method: "POST",
    body: requestBody,
  });

  payload.onJobUpdate?.(response, {
    status: response.status,
    progress: 0,
  });

  return response;
}

async function getQuizJob(jobId) {
  requireServerBaseUrl();
  return apiRequest(`/quiz-jobs/${jobId}`);
}

async function publishJob(jobId) {
  requireServerBaseUrl();
  return apiRequest(`/quiz-jobs/${jobId}/publish`, {
    method: "POST",
  });
}

async function listQuizzes() {
  requireServerBaseUrl();
  return apiRequest("/quizzes");
}

async function getQuiz(quizId) {
  requireServerBaseUrl();
  return apiRequest(`/quizzes/${quizId}`);
}

async function updateQuiz(quizId, payload) {
  requireServerBaseUrl();
  return apiRequest(`/quizzes/${quizId}`, {
    method: "PUT",
    body: payload,
  });
}

async function publishQuiz(quizId) {
  requireServerBaseUrl();
  return apiRequest(`/quizzes/${quizId}/publish`, {
    method: "POST",
  });
}

async function getQuizResults(quizId) {
  requireServerBaseUrl();
  return apiRequest(`/quizzes/${quizId}/results`);
}

async function exportQuiz(quizId, payload) {
  requireServerBaseUrl();
  return apiRequest(`/quizzes/${quizId}/export`, {
    method: "POST",
    body: payload,
    responseType: "blob",
  });
}

async function getPublicQuiz(quizId, token) {
  requireServerBaseUrl();
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  return apiRequest(`/public/quizzes/${quizId}${suffix}`, { requireAuth: false });
}

async function startPracticeSession(payload) {
  requireServerBaseUrl();
  return apiRequest("/practice-sessions", {
    method: "POST",
    body: payload,
    requireAuth: false,
  });
}

async function getPracticeSession(sessionId, token) {
  requireServerBaseUrl();
  const suffix = token ? `?token=${encodeURIComponent(token)}` : "";
  return apiRequest(`/practice-sessions/${sessionId}${suffix}`, {
    requireAuth: false,
  });
}

async function submitPracticeSession(sessionId, payload) {
  requireServerBaseUrl();
  return apiRequest(`/practice-sessions/${sessionId}/submit`, {
    method: "POST",
    body: payload,
    requireAuth: false,
  });
}

export const serverQuizProvider = {
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
