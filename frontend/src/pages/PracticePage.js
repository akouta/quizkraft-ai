import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  getPublicQuiz,
  startPracticeSession,
  submitPracticeSession,
} from "../api/quizApi";
import { trackEvent } from "../lib/analytics";

function PracticePage() {
  const { quizId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const previewToken = searchParams.get("token") || "";
  const retryQuestionIds = location.state?.retryQuestionIds || null;
  const retryLabel = retryQuestionIds?.length
    ? `Retrying ${retryQuestionIds.length} missed question(s)`
    : "";
  const [quiz, setQuiz] = useState(null);
  const [session, setSession] = useState(null);
  const [participantName, setParticipantName] = useState(
    location.state?.participantName || ""
  );
  const [timedMode, setTimedMode] = useState(false);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadQuiz() {
      setLoading(true);

      try {
        const response = await getPublicQuiz(quizId, previewToken);

        if (isMounted) {
          setQuiz(response.quiz);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadQuiz();

    return () => {
      isMounted = false;
    };
  }, [previewToken, quizId]);

  useEffect(() => {
    if (!timedMode || !startedAt) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [startedAt, timedMode]);

  const handleStart = async () => {
    if (!quiz) {
      return;
    }

    try {
      const response = await startPracticeSession({
        quizId,
        participantName,
        timedMode,
        questionIds: retryQuestionIds,
        previewToken,
      });

      setSession({
        id: response.sessionId,
        token: response.sessionToken || "",
      });
      setQuiz(response.quiz);
      setStartedAt(Date.now());
      setElapsedSeconds(0);
      trackEvent("practice_started", {
        quiz_id: quizId,
        asset_type: "practice",
        status: "started",
      });
    } catch (startError) {
      setError(startError.message);
    }
  };

  const handleSubmit = async () => {
    if (!session) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await submitPracticeSession(session.id, {
        answers,
        durationSeconds: elapsedSeconds,
        sessionToken: session.token || "",
      });

      trackEvent("practice_completed", {
        quiz_id: quizId,
        asset_type: "practice",
        status: "completed",
      });

      const resultsPath = session.token
        ? `/results/${session.id}?token=${encodeURIComponent(session.token)}`
        : `/results/${session.id}`;

      navigate(resultsPath, {
        state: {
          resultData: response,
          participantName,
        },
      });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5">Practice quiz not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh", py: 6 }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Paper
            sx={{
              p: 4,
              borderRadius: 4,
              background:
                "linear-gradient(135deg, rgba(15,23,42,1), rgba(11,78,125,0.92))",
              color: "#fff",
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
              {quiz.title}
            </Typography>
            <Typography sx={{ opacity: 0.92 }}>
              {quiz.subject} | {quiz.difficulty}
            </Typography>
            <Typography sx={{ mt: 2, maxWidth: 760 }}>{quiz.sourceSummary}</Typography>
            {retryLabel && (
              <Alert sx={{ mt: 3 }} severity="info">
                {retryLabel}
              </Alert>
            )}
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}

          {!session ? (
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Start practice
                  </Typography>
                  <Typography color="text.secondary">
                    Practice runs from the published quiz snapshot. The learner
                    session writes directly to Firestore without a backend.
                  </Typography>
                  <TextField
                    fullWidth
                    label="Your name (optional)"
                    value={participantName}
                    onChange={(event) => setParticipantName(event.target.value)}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={timedMode}
                        onChange={(event) => setTimedMode(event.target.checked)}
                      />
                    }
                    label="Timed mode"
                  />
                  <Button variant="contained" size="large" onClick={handleStart}>
                    Begin session
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={2}>
              {timedMode && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    Elapsed time: {elapsedSeconds}s
                  </Typography>
                </Paper>
              )}
              {quiz.questions.map((question, index) => (
                <Card key={question.id} sx={{ borderRadius: 4 }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {index + 1}. {question.prompt}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Topic: {question.topic}
                      </Typography>

                      {question.type === "multiple_choice" ? (
                        <RadioGroup
                          value={answers[question.id] || ""}
                          onChange={(event) =>
                            setAnswers((previousAnswers) => ({
                              ...previousAnswers,
                              [question.id]: event.target.value,
                            }))
                          }
                        >
                          {question.options.map((option) => (
                            <FormControlLabel
                              key={option}
                              value={option}
                              control={<Radio />}
                              label={option}
                            />
                          ))}
                        </RadioGroup>
                      ) : (
                        <TextField
                          fullWidth
                          multiline
                          minRows={4}
                          label="Your answer"
                          value={answers[question.id] || ""}
                          onChange={(event) =>
                            setAnswers((previousAnswers) => ({
                              ...previousAnswers,
                              [question.id]: event.target.value,
                            }))
                          }
                        />
                      )}

                      {question.sourceRefs?.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                          <Typography sx={{ fontWeight: 700, mb: 1 }}>
                            Source context
                          </Typography>
                          {question.sourceRefs.map((ref) => (
                            <Typography
                              key={`${question.id}-${ref.page}-${ref.snippet}`}
                              variant="body2"
                              color="text.secondary"
                            >
                              p.{ref.page}: {ref.snippet}
                            </Typography>
                          ))}
                        </Paper>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit practice"}
              </Button>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

export default PracticePage;
