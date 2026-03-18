import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { getPracticeSession } from "../api/quizApi";

function ResultsPage() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [loading, setLoading] = useState(!location.state?.resultData);
  const [error, setError] = useState("");
  const [sessionData, setSessionData] = useState(location.state?.resultData || null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setLoading(true);

      try {
        const response = await getPracticeSession(sessionId, token);

        if (!isMounted) {
          return;
        }

        setSessionData({
          sessionId,
          quizId: response.quizId,
          previewToken: response.previewToken || "",
          results: response.results,
        });
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

    if (!sessionData) {
      loadSession();
    }

    return () => {
      isMounted = false;
    };
  }, [sessionData, sessionId, token]);

  const retryLabel = useMemo(() => {
    if (!sessionData?.results?.missedQuestionIds?.length) {
      return "Start a new attempt";
    }

    return `Retry ${sessionData.results.missedQuestionIds.length} missed question(s)`;
  }, [sessionData]);

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

  if (!sessionData?.results) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5">Results are not available yet.</Typography>
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
                "linear-gradient(135deg, rgba(7, 89, 133, 0.95), rgba(17, 24, 39, 1))",
              color: "#fff",
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 800 }}>
              Practice results
            </Typography>
            <Typography sx={{ mt: 2, opacity: 0.92 }}>
              Score: {sessionData.results.score}% ({sessionData.results.correctCount}/
              {sessionData.results.totalCount} correct)
            </Typography>
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}

          {sessionData.results.weakTopics?.length > 0 && (
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Weak topics
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {sessionData.results.weakTopics.map((topic) => (
                    <Chip
                      key={topic.topic}
                      label={`${topic.topic} (${topic.misses})`}
                      color="warning"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Stack spacing={2}>
            {sessionData.results.questionResults.map((result, index) => (
              <Card key={result.questionId} sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {index + 1}. {result.prompt}
                      </Typography>
                      <Chip
                        label={result.isCorrect ? "Correct" : "Needs review"}
                        color={result.isCorrect ? "success" : "warning"}
                        size="small"
                      />
                    </Stack>
                    <Typography variant="body2">
                      Your answer: {result.userAnswer || "No answer submitted"}
                    </Typography>
                    {!result.isCorrect && (
                      <Typography variant="body2">
                        Correct answer: {result.correctAnswer || "Not available"}
                      </Typography>
                    )}
                    <Typography color="text.secondary">{result.explanation}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Button
            variant="contained"
            startIcon={<ReplayRoundedIcon />}
            onClick={() =>
              navigate(
                sessionData.previewToken
                  ? `/practice/${sessionData.quizId}?token=${encodeURIComponent(
                      sessionData.previewToken
                    )}`
                  : `/practice/${sessionData.quizId}`,
                {
                  state: {
                    retryQuestionIds: sessionData.results.missedQuestionIds,
                  },
                }
              )
            }
          >
            {retryLabel}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

export default ResultsPage;
