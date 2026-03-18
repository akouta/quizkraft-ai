import { localQuizProvider } from "./providers/localQuizProvider";
import { serverQuizProvider } from "./providers/serverQuizProvider";

const QUIZ_PROVIDER_MODE =
  process.env.REACT_APP_QUIZ_PROVIDER === "server" ? "server" : "local";

const activeProvider =
  QUIZ_PROVIDER_MODE === "server" ? serverQuizProvider : localQuizProvider;

export function getQuizProviderMode() {
  return QUIZ_PROVIDER_MODE;
}

export function listQuizJobs(...args) {
  return activeProvider.listQuizJobs(...args);
}

export function createQuizJob(...args) {
  return activeProvider.createQuizJob(...args);
}

export function getQuizJob(...args) {
  return activeProvider.getQuizJob(...args);
}

export function publishJob(...args) {
  return activeProvider.publishJob(...args);
}

export function listQuizzes(...args) {
  return activeProvider.listQuizzes(...args);
}

export function getQuiz(...args) {
  return activeProvider.getQuiz(...args);
}

export function updateQuiz(...args) {
  return activeProvider.updateQuiz(...args);
}

export function publishQuiz(...args) {
  return activeProvider.publishQuiz(...args);
}

export function getQuizResults(...args) {
  return activeProvider.getQuizResults(...args);
}

export function exportQuiz(...args) {
  return activeProvider.exportQuiz(...args);
}

export function getPublicQuiz(...args) {
  return activeProvider.getPublicQuiz(...args);
}

export function startPracticeSession(...args) {
  return activeProvider.startPracticeSession(...args);
}

export function getPracticeSession(...args) {
  return activeProvider.getPracticeSession(...args);
}

export function submitPracticeSession(...args) {
  return activeProvider.submitPracticeSession(...args);
}
