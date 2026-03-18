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
  Grid2,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import {
  createQuizJob,
  getQuizProviderMode,
  listQuizJobs,
  listQuizzes,
} from "./api/quizApi";
import { trackEvent } from "./lib/analytics";
import { formatDate } from "./utils/quiz";

const WORKSPACE_STEPS = ["Upload", "Generate", "Review", "Publish / Export"];
const ACTIVE_JOB_STATUSES = ["uploading", "extracting", "generating"];
const QUIZ_PROVIDER_MODE = getQuizProviderMode();

function statusTone(status) {
  if (status === "review_ready" || status === "published") {
    return "success";
  }

  if (status === "failed") {
    return "error";
  }

  if (status === "draft") {
    return "warning";
  }

  return "info";
}

function mergeJob(previousJobs, job) {
  const nextJobs = previousJobs.filter((item) => item.id !== job.id);
  return [job, ...nextJobs].sort((left, right) => {
    const leftDate = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightDate = new Date(right.updatedAt || right.createdAt || 0).getTime();
    return rightDate - leftDate;
  });
}

function App() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [file, setFile] = useState(null);
  const [pageRange, setPageRange] = useState("");
  const [subject, setSubject] = useState("STEM");
  const [difficulty, setDifficulty] = useState("medium");
  const [numMCQs, setNumMCQs] = useState(4);
  const [numSAQs, setNumSAQs] = useState(3);
  const [numEPs, setNumEPs] = useState(2);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [creatingJob, setCreatingJob] = useState(false);
  const [error, setError] = useState("");

  const activeQuiz = useMemo(() => {
    if (activeJob?.draftQuizId) {
      return quizzes.find((quiz) => quiz.id === activeJob.draftQuizId) || null;
    }

    return quizzes[0] || null;
  }, [activeJob, quizzes]);

  const activeStep = useMemo(() => {
    if (!activeJob) {
      return 0;
    }

    if (ACTIVE_JOB_STATUSES.includes(activeJob.status)) {
      return 1;
    }

    if (activeQuiz?.status === "published") {
      return 3;
    }

    if (activeJob.status === "review_ready") {
      return 2;
    }

    return 0;
  }, [activeJob, activeQuiz]);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      setLoading(true);

      try {
        const [jobData, quizData] = await Promise.all([listQuizJobs(), listQuizzes()]);

        if (!isMounted) {
          return;
        }

        const nextJobs = jobData.jobs || [];
        const nextQuizzes = quizData.quizzes || [];

        setJobs(nextJobs);
        setQuizzes(nextQuizzes);
        setActiveJob(
          nextJobs.find((job) => ACTIVE_JOB_STATUSES.includes(job.status)) ||
            nextJobs[0] ||
            null
        );
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

    if (currentUser) {
      loadWorkspace();
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleCreateJob = async () => {
    if (!file || !currentUser) {
      return;
    }

    setCreatingJob(true);
    setError("");
    setUploadStatus("uploading");
    setUploadProgress(5);

    trackEvent("upload_started", {
      user_id: currentUser.uid,
      asset_type: "quiz",
      status: "uploading",
    });
    trackEvent("generation_started", {
      user_id: currentUser.uid,
      asset_type: "quiz",
      status: "extracting",
    });

    try {
      const job = await createQuizJob({
        file,
        pageRange,
        settings: {
          subject,
          difficulty,
          numMCQs,
          numSAQs,
          numEPs,
        },
        onJobUpdate(jobUpdate, progressUpdate = {}) {
          setActiveJob(jobUpdate);
          setJobs((previousJobs) => mergeJob(previousJobs, jobUpdate));
          setUploadStatus(progressUpdate.status || jobUpdate.status);
          if (typeof progressUpdate.progress === "number") {
            setUploadProgress(progressUpdate.progress);
          }
        },
      });

      trackEvent("upload_succeeded", {
        user_id: currentUser.uid,
        asset_type: "quiz",
        status: "local_processed",
      });
      trackEvent("generation_completed", {
        user_id: currentUser.uid,
        quiz_id: job.draftQuizId || job.id,
        asset_type: "quiz",
        status: job.status,
      });

      const quizData = await listQuizzes();
      setQuizzes(quizData.quizzes || []);
      setActiveJob(job);
      setFile(null);
      setUploadProgress(100);
    } catch (jobError) {
      setUploadStatus("failed");
      setUploadProgress(100);
      setError(jobError.message);

      trackEvent("generation_failed", {
        user_id: currentUser.uid,
        asset_type: "quiz",
        status: "failed",
      });
    } finally {
      setCreatingJob(false);
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

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh", py: 6 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 4,
              background:
                "linear-gradient(135deg, rgba(10,25,47,0.98), rgba(20,93,160,0.88))",
              color: "#fff",
            }}
          >
            <Stack spacing={2}>
              <Chip
                label="No-spend Spark architecture"
                color="warning"
                sx={{ alignSelf: "flex-start", fontWeight: 700 }}
              />
              <Chip
                label={`Data provider: ${QUIZ_PROVIDER_MODE}`}
                variant="outlined"
                sx={{ alignSelf: "flex-start", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
              />
              <Typography variant="h3" sx={{ fontWeight: 800, maxWidth: 760 }}>
                Process lecture files in the browser, save only the generated
                artifacts, and publish practice-ready assessments without Cloud
                Functions or Storage.
              </Typography>
              <Typography variant="body1" sx={{ maxWidth: 780, opacity: 0.92 }}>
                The source file never leaves the browser. QuizKraft extracts the
                text locally, builds a source-cited draft, then stores the job
                and editable assessment directly in Firestore.
              </Typography>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 4 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {WORKSPACE_STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}
          <Alert severity="info" variant="outlined">
            Free-tier guardrail: only quiz metadata, citations, drafts, and
            practice results are persisted. Original files are not uploaded or
            stored.
          </Alert>

          <Grid2 container spacing={3}>
            <Grid2 size={{ xs: 12, md: 7 }}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Upload Course Material
                      </Typography>
                      <Typography color="text.secondary">
                        PDFs are parsed in-browser. Screenshots run through local
                        OCR in the browser worker. No Cloud Storage upload is
                        involved.
                      </Typography>
                    </Box>

                    <Button variant="outlined" component="label">
                      {file ? file.name : "Choose PDF or image"}
                      <input
                        hidden
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(event) => setFile(event.target.files?.[0] || null)}
                      />
                    </Button>

                    <Grid2 container spacing={2}>
                      <Grid2 size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Subject"
                          value={subject}
                          onChange={(event) => setSubject(event.target.value)}
                        />
                      </Grid2>
                      <Grid2 size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          select
                          label="Difficulty"
                          value={difficulty}
                          onChange={(event) => setDifficulty(event.target.value)}
                        >
                          <MenuItem value="easy">Easy</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="hard">Hard</MenuItem>
                        </TextField>
                      </Grid2>
                      <Grid2 size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="MCQs"
                          value={numMCQs}
                          onChange={(event) => setNumMCQs(Number(event.target.value))}
                          inputProps={{ min: 0, max: 10 }}
                        />
                      </Grid2>
                      <Grid2 size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Short answer"
                          value={numSAQs}
                          onChange={(event) => setNumSAQs(Number(event.target.value))}
                          inputProps={{ min: 0, max: 10 }}
                        />
                      </Grid2>
                      <Grid2 size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Exam problems"
                          value={numEPs}
                          onChange={(event) => setNumEPs(Number(event.target.value))}
                          inputProps={{ min: 0, max: 10 }}
                        />
                      </Grid2>
                    </Grid2>

                    <TextField
                      fullWidth
                      label="Page range (optional)"
                      value={pageRange}
                      onChange={(event) => setPageRange(event.target.value)}
                      helperText="Use formats like 1-4,6 when you do not want the full file."
                    />

                    {(creatingJob || uploadStatus !== "idle") && (
                      <Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.max(0, Math.min(uploadProgress, 100))}
                          sx={{ borderRadius: 99, height: 10 }}
                        />
                        <Typography variant="body2" sx={{ mt: 1, textTransform: "capitalize" }}>
                          Stage: {uploadStatus.replace(/_/g, " ")} ({uploadProgress}%)
                        </Typography>
                      </Box>
                    )}

                    <Button
                      variant="contained"
                      size="large"
                      disabled={!file || creatingJob}
                      onClick={handleCreateJob}
                    >
                      {creatingJob ? "Processing locally..." : "Start quiz job"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid2>

            <Grid2 size={{ xs: 12, md: 5 }}>
              <Card sx={{ borderRadius: 4, mb: 3 }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      Active Job
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Recent jobs tracked: {jobs.length}
                    </Typography>
                    {!activeJob && (
                      <Typography color="text.secondary">
                        No active job yet. Upload a file to start a local
                        source-cited draft.
                      </Typography>
                    )}
                    {activeJob && (
                      <>
                        <Chip
                          color={statusTone(activeJob.status)}
                          label={activeJob.status.replace(/_/g, " ")}
                          sx={{ alignSelf: "flex-start", textTransform: "capitalize" }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Updated {formatDate(activeJob.updatedAt)}
                        </Typography>
                        {Array.isArray(activeJob.extractionPreview) &&
                          activeJob.extractionPreview.length > 0 && (
                            <Stack spacing={1}>
                              <Typography sx={{ fontWeight: 700 }}>
                                Extraction preview
                              </Typography>
                              {activeJob.extractionPreview.map((entry) => (
                                <Paper
                                  key={`${entry.page}-${entry.snippet}`}
                                  variant="outlined"
                                  sx={{ p: 1.5, borderRadius: 3 }}
                                >
                                  <Typography variant="caption" color="text.secondary">
                                    Page {entry.page}
                                  </Typography>
                                  <Typography variant="body2">
                                    {entry.snippet}
                                  </Typography>
                                </Paper>
                              ))}
                            </Stack>
                          )}

                        {activeJob.status === "review_ready" && (
                          <Button
                            variant="contained"
                            onClick={() =>
                              navigate(`/quizzes/${activeJob.draftQuizId}/edit`)
                            }
                          >
                            Open draft editor
                          </Button>
                        )}
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      Recent drafts and published quizzes
                    </Typography>
                    {quizzes.length === 0 && (
                      <Typography color="text.secondary">
                        Your generated quizzes will appear here once a local job
                        reaches review-ready status.
                      </Typography>
                    )}
                    {quizzes.slice(0, 6).map((quiz) => (
                      <Paper
                        key={quiz.id}
                        variant="outlined"
                        sx={{ p: 2, borderRadius: 3 }}
                      >
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          spacing={2}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{quiz.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {quiz.subject} | {quiz.difficulty}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              size="small"
                              color={statusTone(quiz.status)}
                              label={quiz.status}
                            />
                            <Button
                              variant="text"
                              onClick={() => navigate(`/quizzes/${quiz.id}/edit`)}
                            >
                              Open
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid2>
          </Grid2>
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
