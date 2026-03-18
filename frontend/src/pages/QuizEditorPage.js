import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid2,
  IconButton,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useNavigate, useParams } from "react-router-dom";
import {
  exportQuiz,
  getQuiz,
  getQuizResults,
  publishQuiz,
  updateQuiz,
} from "../api/quizApi";
import { useAuth } from "../context/AuthContext";
import { trackEvent } from "../lib/analytics";
import { downloadBlob, moveItem } from "../utils/quiz";

function ResultsPanel({ results }) {
  if (!results) {
    return (
      <Typography color="text.secondary">
        Teacher results will appear here after learners complete practice sessions.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Completion count
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {results.completionCount}
            </Typography>
          </Paper>
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Average score
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {results.averageScore}%
            </Typography>
          </Paper>
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Weak topics
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {results.weakTopics?.length || 0}
            </Typography>
          </Paper>
        </Grid2>
      </Grid2>

      {results.weakTopics?.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Weak topics</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {results.weakTopics.map((topic) => (
              <Chip
                key={topic.topic}
                label={`${topic.topic} (${topic.misses})`}
                color="warning"
                variant="outlined"
              />
            ))}
          </Stack>
        </Paper>
      )}

      {results.mostMissedQuestions?.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
            Most missed questions
          </Typography>
          <Stack spacing={1.5}>
            {results.mostMissedQuestions.map((question) => (
              <Box key={question.questionId}>
                <Typography sx={{ fontWeight: 600 }}>{question.prompt}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Missed {question.misses} time(s)
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

function FlashcardsPanel({ flashcards }) {
  if (!flashcards?.length) {
    return <Typography color="text.secondary">No flashcards generated yet.</Typography>;
  }

  return (
    <Grid2 container spacing={2}>
      {flashcards.map((card) => (
        <Grid2 key={card.id} size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
            <Stack spacing={1.5}>
              <Typography variant="overline">{card.topic}</Typography>
              <Typography sx={{ fontWeight: 700 }}>{card.front}</Typography>
              <Divider />
              <Typography color="text.secondary">{card.back}</Typography>
              {card.sourceRefs?.map((ref) => (
                <Typography key={`${card.id}-${ref.page}`} variant="caption" color="text.secondary">
                  p.{ref.page}: {ref.snippet}
                </Typography>
              ))}
            </Stack>
          </Paper>
        </Grid2>
      ))}
    </Grid2>
  );
}

function StudyGuidePanel({ studyGuide }) {
  if (!studyGuide?.sections?.length) {
    return <Typography color="text.secondary">No study guide sections generated yet.</Typography>;
  }

  return (
    <Stack spacing={2}>
      {studyGuide.sections.map((section) => (
        <Paper key={section.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {section.heading}
            </Typography>
            <Typography color="text.secondary">{section.summary}</Typography>
            {section.keyPoints?.map((point, index) => (
              <Typography key={`${section.id}-${index}`}>- {point}</Typography>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

function QuizEditorPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const [tab, setTab] = useState("questions");

  useEffect(() => {
    let isMounted = true;

    async function loadQuiz() {
      setLoading(true);

      try {
        const [quizData, resultsData] = await Promise.all([
          getQuiz(quizId),
          getQuizResults(quizId),
        ]);

        if (!isMounted) {
          return;
        }

        setQuiz(quizData);
        setResults(resultsData);
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
  }, [quizId]);

  const practiceLink = useMemo(() => {
    if (quiz?.publicId) {
      return `${window.location.origin}/practice/${quiz.publicId}`;
    }

    if (!quiz?.previewToken) {
      return "";
    }

    return `${window.location.origin}/practice/${quiz.id}?token=${quiz.previewToken}`;
  }, [quiz]);

  const handleQuizFieldChange = (field, value) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      [field]: value,
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      questions: previousQuiz.questions.map((question, questionIndex) => {
        if (questionIndex !== index) {
          return question;
        }

        return {
          ...question,
          [field]: value,
        };
      }),
    }));
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      questions: previousQuiz.questions.map((question, currentQuestionIndex) => {
        if (currentQuestionIndex !== questionIndex) {
          return question;
        }

        return {
          ...question,
          options: question.options.map((option, currentOptionIndex) => {
            if (currentOptionIndex !== optionIndex) {
              return option;
            }

            return value;
          }),
        };
      }),
    }));
  };

  const handleDeleteQuestion = (index) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      questions: previousQuiz.questions.filter((_, questionIndex) => {
        return questionIndex !== index;
      }),
    }));
  };

  const handleMoveQuestion = (fromIndex, toIndex) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      questions: moveItem(previousQuiz.questions, fromIndex, toIndex),
    }));
  };

  const handleSave = async () => {
    if (!quiz) {
      return;
    }

    setSaving(true);
    setError("");
    setInfo("");

    try {
      const updatedQuiz = await updateQuiz(quiz.id, quiz);
      setQuiz(updatedQuiz);
      setInfo("Draft saved.");
      trackEvent("draft_saved", {
        user_id: currentUser?.uid || "unknown",
        quiz_id: updatedQuiz.id,
        asset_type: "quiz",
        status: updatedQuiz.status,
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!quiz) {
      return;
    }

    setPublishing(true);
    setError("");
    setInfo("");

    try {
      const publishedQuiz = await publishQuiz(quiz.id);
      setQuiz(publishedQuiz);
      setInfo("Quiz published. Practice link is ready.");
      trackEvent("quiz_published", {
        user_id: currentUser?.uid || "unknown",
        quiz_id: publishedQuiz.id,
        asset_type: "quiz",
        status: publishedQuiz.status,
      });
    } catch (publishError) {
      setError(publishError.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleExport = async (format, includeAnswers) => {
    if (!quiz) {
      return;
    }

    setError("");
    setInfo("");

    try {
      const blob = await exportQuiz(quiz.id, { format, includeAnswers });
      const fileSuffix = format === "word" ? "docx" : format === "pdf" ? "pdf" : "xml";
      downloadBlob(blob, `quizkraft-${quiz.id}.${fileSuffix}`);
      setInfo(`Exported ${format.toUpperCase()} file.`);
      trackEvent("export_clicked", {
        user_id: currentUser?.uid || "unknown",
        quiz_id: quiz.id,
        asset_type: format,
        status: "exported",
      });
    } catch (exportError) {
      setError(exportError.message);
    }
  };

  const handleCopyPracticeLink = async () => {
    if (!practiceLink) {
      setError("Publish the quiz before copying a practice link.");
      return;
    }

    try {
      await navigator.clipboard.writeText(practiceLink);
      setInfo("Practice link copied.");
    } catch (copyError) {
      setError("Could not copy the practice link.");
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
        <Typography variant="h5">Quiz not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh", py: 6 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 } }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate("/app")}
            >
              Back to workspace
            </Button>
            <Chip label={quiz.status} color={quiz.status === "published" ? "success" : "warning"} />
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {info && <Alert severity="success">{info}</Alert>}

          <Paper
            sx={{
              p: 4,
              borderRadius: 4,
              background:
                "linear-gradient(135deg, rgba(15,23,42,1), rgba(11,78,125,0.92))",
              color: "#fff",
            }}
          >
            <Grid2 container spacing={3}>
              <Grid2 size={{ xs: 12, md: 8 }}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Quiz title"
                    value={quiz.title}
                    onChange={(event) => handleQuizFieldChange("title", event.target.value)}
                    sx={{
                      "& .MuiInputBase-root": {
                        color: "#fff",
                        backgroundColor: "rgba(255,255,255,0.08)",
                      },
                    }}
                  />
                  <Grid2 container spacing={2}>
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Subject"
                        value={quiz.subject}
                        onChange={(event) =>
                          handleQuizFieldChange("subject", event.target.value)
                        }
                        sx={{
                          "& .MuiInputBase-root": {
                            color: "#fff",
                            backgroundColor: "rgba(255,255,255,0.08)",
                          },
                        }}
                      />
                    </Grid2>
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Difficulty"
                        value={quiz.difficulty}
                        onChange={(event) =>
                          handleQuizFieldChange("difficulty", event.target.value)
                        }
                        sx={{
                          "& .MuiInputBase-root": {
                            color: "#fff",
                            backgroundColor: "rgba(255,255,255,0.08)",
                          },
                        }}
                      />
                    </Grid2>
                  </Grid2>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Source summary"
                    value={quiz.sourceSummary}
                    onChange={(event) =>
                      handleQuizFieldChange("sourceSummary", event.target.value)
                    }
                    sx={{
                      "& .MuiInputBase-root": {
                        color: "#fff",
                        backgroundColor: "rgba(255,255,255,0.08)",
                      },
                    }}
                  />
                </Stack>
              </Grid2>

              <Grid2 size={{ xs: 12, md: 4 }}>
                <Stack spacing={1.5}>
                  <Button
                    variant="contained"
                    startIcon={<SaveRoundedIcon />}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save draft"}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PublishRoundedIcon />}
                    onClick={handlePublish}
                    disabled={publishing}
                    sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.42)" }}
                  >
                    {publishing ? "Publishing..." : "Publish practice link"}
                  </Button>
                  <Button
                    variant="text"
                    startIcon={<IosShareRoundedIcon />}
                    onClick={handleCopyPracticeLink}
                    sx={{ color: "#fff" }}
                  >
                    Copy practice link
                  </Button>
                </Stack>
              </Grid2>
            </Grid2>
          </Paper>

          <Paper sx={{ borderRadius: 4 }}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable">
              <Tab value="questions" label="Questions" />
              <Tab value="flashcards" label="Flashcards" />
              <Tab value="study-guide" label="Study guide" />
              <Tab value="results" label="Results" />
            </Tabs>
          </Paper>

          <FormControlLabel
            control={
              <Switch
                checked={showAnswers}
                onChange={(event) => setShowAnswers(event.target.checked)}
              />
            }
            label="Show answers and rationales in the editor"
          />

          {tab === "questions" && (
            <Stack spacing={2}>
              {quiz.questions.map((question, index) => (
                <Card key={question.id} sx={{ borderRadius: 4 }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        spacing={2}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {index + 1}. {question.type.replace(/_/g, " ")}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            onClick={() => handleMoveQuestion(index, index - 1)}
                            disabled={index === 0}
                          >
                            <ArrowUpwardRoundedIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleMoveQuestion(index, index + 1)}
                            disabled={index === quiz.questions.length - 1}
                          >
                            <ArrowDownwardRoundedIcon />
                          </IconButton>
                          <IconButton color="error" onClick={() => handleDeleteQuestion(index)}>
                            <DeleteOutlineRoundedIcon />
                          </IconButton>
                        </Stack>
                      </Stack>

                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        label="Prompt"
                        value={question.prompt}
                        onChange={(event) =>
                          handleQuestionChange(index, "prompt", event.target.value)
                        }
                      />

                      <Grid2 container spacing={2}>
                        <Grid2 size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Topic"
                            value={question.topic}
                            onChange={(event) =>
                              handleQuestionChange(index, "topic", event.target.value)
                            }
                          />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 4 }}>
                          <TextField
                            fullWidth
                            label="Difficulty"
                            value={question.difficulty}
                            onChange={(event) =>
                              handleQuestionChange(index, "difficulty", event.target.value)
                            }
                          />
                        </Grid2>
                        <Grid2 size={{ xs: 12, sm: 4 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={question.enabled !== false}
                                onChange={(event) =>
                                  handleQuestionChange(index, "enabled", event.target.checked)
                                }
                              />
                            }
                            label="Enabled"
                          />
                        </Grid2>
                      </Grid2>

                      {question.type === "multiple_choice" && (
                        <Grid2 container spacing={2}>
                          {question.options.map((option, optionIndex) => (
                            <Grid2 key={`${question.id}-${optionIndex}`} size={{ xs: 12, sm: 6 }}>
                              <TextField
                                fullWidth
                                label={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                value={option}
                                onChange={(event) =>
                                  handleOptionChange(index, optionIndex, event.target.value)
                                }
                              />
                            </Grid2>
                          ))}
                        </Grid2>
                      )}

                      {showAnswers && (
                        <Stack spacing={2}>
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            label="Correct answer"
                            value={question.correctAnswer}
                            onChange={(event) =>
                              handleQuestionChange(index, "correctAnswer", event.target.value)
                            }
                          />
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            label="Explanation"
                            value={question.explanation}
                            onChange={(event) =>
                              handleQuestionChange(index, "explanation", event.target.value)
                            }
                          />
                        </Stack>
                      )}

                      {question.sourceRefs?.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                          <Typography sx={{ fontWeight: 700, mb: 1 }}>
                            Source grounding
                          </Typography>
                          <Stack spacing={1}>
                            {question.sourceRefs.map((ref) => (
                              <Typography
                                key={`${question.id}-${ref.page}-${ref.snippet}`}
                                variant="body2"
                                color="text.secondary"
                              >
                                p.{ref.page}: {ref.snippet}
                              </Typography>
                            ))}
                          </Stack>
                        </Paper>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {tab === "flashcards" && <FlashcardsPanel flashcards={quiz.flashcards} />}
          {tab === "study-guide" && <StudyGuidePanel studyGuide={quiz.studyGuide} />}
          {tab === "results" && <ResultsPanel results={results} />}

          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Export bundle
                </Typography>
                <Typography color="text.secondary">
                  Exports are generated client-side to keep the app inside a
                  true no-spend architecture.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button variant="contained" onClick={() => handleExport("pdf", false)}>
                    Export PDF
                  </Button>
                  <Button variant="outlined" onClick={() => handleExport("word", true)}>
                    Export Word + answers
                  </Button>
                  <Button variant="outlined" onClick={() => handleExport("qti", false)}>
                    Export QTI 2.1
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}

export default QuizEditorPage;
