import React, { useState } from "react";
import axios from "axios";
import QuizDisplay from "../QuizDisplay/QuizDisplay";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Card,
  CardContent,
  Grid2,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import DifficultySelector from "../DifficultySelector/DifficultySelector";
import { saveQuizToHistory } from "../../firebase/firestoreUtils";
import { useAuth } from "../../context/AuthContext";

// Import Firebase Storage
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

function FileUpload({ onQuizUpdate, setIsLoading }) {
  const { currentUser } = useAuth();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploadResponse, setUploadResponse] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [numMCQs, setNumMCQs] = useState(1);
  const [numSAQs, setNumSAQs] = useState(1);
  const [numEPs, setNumEPs] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const [pageRange, setPageRange] = useState("");
  const [pageCount, setPageCount] = useState(null);
  const [selectionMode, setSelectionMode] = useState("all");
  const [pageRangeError, setPageRangeError] = useState("");

  const theme = useTheme();

  // Adjust this to your Cloud Function endpoint that processes the file from GCS
  // e.g. "https://us-central1-<YOUR-PROJECT>.cloudfunctions.net/api/generateQuiz"
  const FUNCTION_URL = process.env.REACT_APP_FUNCTION_URL;

  function handleFileChange(event) {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : "");
    setUploadResponse(null);
    setProgress(0);
    setIsProcessing(false);
    setPageCount(null);
  }

  async function handleQuizSave(quizData) {
    if (!currentUser || !currentUser.uid) {
      alert("You need to be logged in to save quiz history.");
      return;
    }

    if (!quizData || Object.keys(quizData).length === 0) {
      return;
    }

    try {
      await saveQuizToHistory(currentUser.uid, quizData);
    } catch (error) {
      alert("Failed to save quiz history. Please try again.");
    }
  }

  async function handleSubmit(event) {
    event?.preventDefault();

    if (!file) {
      setUploadResponse({ message: "Please select a file first!" });
      return;
    }

    // You may also want to check if the user is logged in & verified:
    if (!currentUser || !currentUser.uid) {
      alert("You must be logged in to upload a file.");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setIsProcessing(false);

    try {
      // 1) Upload file to Firebase Storage
      const storage = getStorage();
      const storageRef = ref(
        storage,
        `uploads/${currentUser.uid}/${file.name}`
      );
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Show progress
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percentCompleted = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setProgress(percentCompleted);
          if (percentCompleted === 100) {
            setIsProcessing(true);
          }
        },
        (error) => {
          setIsLoading(false);
          setIsProcessing(false);
          alert("Failed to upload file. Please try again.");
        },
        async () => {
          // Upload completed
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // 2) Call the Cloud Function with downloadURL + quiz params
          const payload = {
            fileUrl: downloadURL,
            difficulty,
            numMCQs,
            numSAQs,
            numEPs,
          };

          // If selectionMode === "range", include pageRange
          if (selectionMode === "range" && pageRange.trim() !== "") {
            payload.pageRange = pageRange;
          }

          try {
            const response = await axios.post(
              `${FUNCTION_URL}/process-file`,
              payload
            );
            const data = response.data;

            setUploadResponse({
              message: "✅ File processed successfully!",
              extractedText: data.extractedText,
              quiz: data.quiz,
            });

            // If the function returns something like totalPages, set it
            if (data.totalPages) {
              setPageCount(data.totalPages);
            } else {
            }

            if (data.quiz) {
              onQuizUpdate(data.quiz);
              await handleQuizSave(data.quiz);
            }
          } catch (funcErr) {
            alert(
              funcErr.response?.data?.error ||
                "An unexpected error occurred while generating the quiz."
            );
            setUploadResponse({
              message: `Error generating quiz: ${funcErr.message}`,
            });
            setProgress(0);
          } finally {
            setIsLoading(false);
            setIsProcessing(false);
            setTimeout(() => setProgress(0), 2000);
          }
        }
      );
    } catch (error) {
      alert(error.message || "An unexpected error occurred. Please try again.");
      setUploadResponse({ message: `Error uploading file: ${error.message}` });
      setProgress(0);
      setIsLoading(false);
      setIsProcessing(false);
    }
  }

  const showUploadForm = !uploadResponse;
  const showResult = !!uploadResponse;

  return (
    <Card
      className="FileUpload"
      sx={{
        textAlign: "center",
        padding: 4,
        backgroundColor: theme.palette.mode === "dark" ? "#2c2c2c" : "#fff",
        borderRadius: 2,
        boxShadow:
          theme.palette.mode === "dark"
            ? "0px 4px 10px rgba(0, 0, 0, 0.5)"
            : "0px 2px 10px rgba(0, 0, 0, 0.1)",
        color: theme.palette.text.primary,
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      {showUploadForm && (
        <>
          <Typography variant="h5" gutterBottom sx={{ marginBottom: 3 }}>
            Upload Your Lecture File
          </Typography>

          <Box sx={{ textAlign: "center", marginBottom: 2 }}>
            <input
              accept=".png,.jpg,.jpeg,.pdf"
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <label htmlFor="file-upload">
              <Button variant="outlined" component="span" color="primary">
                {fileName || "Select File"}
              </Button>
            </label>
            {fileName && (
              <Typography
                variant="body2"
                sx={{ marginTop: 1, color: "gray", fontStyle: "italic" }}
              >
                Selected file: {fileName}
              </Typography>
            )}
          </Box>

          <Grid2>
            <RadioGroup
              value={selectionMode}
              onChange={(e) => setSelectionMode(e.target.value)}
              sx={{ marginBottom: 2 }}
            >
              <FormControlLabel
                value="all"
                control={<Radio />}
                label="Use All Pages"
              />
              <FormControlLabel
                value="range"
                control={<Radio />}
                label="Specify Page Range"
              />
            </RadioGroup>
            {selectionMode === "range" && (
              <TextField
                label="Page Range (e.g., 1-3,5)"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                error={!!pageRangeError}
                helperText={pageRangeError}
                sx={{ marginBottom: 2 }}
                fullWidth
              />
            )}
          </Grid2>

          <Grid2
            container
            spacing={2}
            sx={{ marginBottom: 3, justifyContent: "center" }}
          >
            <Grid2>
              <TextField
                fullWidth
                label="Number of Multiple-Choice Questions"
                type="number"
                value={numMCQs}
                onChange={(e) => {
                  let value = e.target.value;
                  if (parseInt(value) < 0) value = 0;
                  setNumMCQs(value);
                }}
                onBlur={() => {
                  setNumMCQs((prev) => String(parseInt(prev) || 0));
                }}
                inputProps={{ min: 0, step: 1 }}
                sx={{
                  backgroundColor: "background.default",
                  borderRadius: 1,
                }}
              />
            </Grid2>
            <Grid2>
              <TextField
                fullWidth
                label="Number of Short-Answer Questions"
                type="number"
                value={numSAQs}
                onChange={(e) => {
                  let value = e.target.value;
                  if (parseInt(value) < 0) value = 0;
                  setNumSAQs(value);
                }}
                onBlur={() => {
                  setNumSAQs((prev) => String(parseInt(prev) || 0));
                }}
                inputProps={{ min: 0, step: 1 }}
                sx={{
                  backgroundColor: "background.default",
                  borderRadius: 1,
                }}
              />
            </Grid2>
            <Grid2>
              <TextField
                fullWidth
                label="Number of Exam Problems"
                type="number"
                value={numEPs}
                onChange={(e) => {
                  let value = e.target.value;
                  if (parseInt(value) < 0) value = 0;
                  setNumEPs(value);
                }}
                onBlur={() => {
                  setNumEPs((prev) => String(parseInt(prev) || 0));
                }}
                inputProps={{ min: 0, step: 1 }}
                sx={{
                  backgroundColor: "background.default",
                  borderRadius: 1,
                }}
              />
            </Grid2>
            <DifficultySelector
              difficulty={difficulty}
              setDifficulty={setDifficulty}
            />
          </Grid2>

          <Box>
            <Button
              type="button"
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              sx={{
                padding: "10px 30px",
                fontWeight: "bold",
                backgroundColor: "primary.main",
                "&:hover": { backgroundColor: "primary.dark" },
              }}
            >
              Upload
            </Button>
          </Box>

          {progress > 0 && (
            <Box sx={{ marginTop: 2 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography
                variant="body2"
                sx={{ textAlign: "center", marginTop: 1 }}
              >
                {progress}%
              </Typography>
            </Box>
          )}

          {isProcessing && (
            <Box
              sx={{
                marginTop: 2,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CircularProgress size={24} sx={{ marginRight: 1 }} />
              <Typography variant="body2" sx={{ lineHeight: "24px" }}>
                Processing your file...
              </Typography>
            </Box>
          )}
        </>
      )}

      {showResult && (
        <UploadResponse
          extractedText={uploadResponse.extractedText}
          quiz={uploadResponse.quiz}
          message={uploadResponse.message}
        />
      )}
    </Card>
  );
}

function UploadResponse({ message, extractedText, quiz }) {
  return (
    <Box sx={{ marginTop: 4, textAlign: "center" }}>
      <Typography variant="h6" gutterBottom>
        {message}
      </Typography>

      {extractedText && (
        <Card sx={{ marginTop: 2, padding: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Extracted Text
            </Typography>
            <Box
              sx={{
                padding: 2,
                backgroundColor: "#f5f5f5",
                borderRadius: 1,
                whiteSpace: "pre-wrap",
              }}
            >
              {extractedText}
            </Box>
          </CardContent>
        </Card>
      )}

      {quiz && (
        <Box sx={{ marginTop: 4 }}>
          <QuizDisplay quiz={quiz} />
        </Box>
      )}
    </Box>
  );
}

export default FileUpload;
