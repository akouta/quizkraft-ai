import React, { useState } from "react";
import FileUpload from "./components/FileUpload/FileUpload";
import QuizDisplay from "./components/QuizDisplay/QuizDisplay";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./styles/App.css";
import {
  Container,
  LinearProgress,
  Box,
  Typography,
  useTheme,
} from "@mui/material";

function App() {
  const [quiz, setQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const theme = useTheme();

  const handleQuizUpdate = async (newQuiz) => {
    setIsLoading(true);
    setQuiz(null);
    setProgress(0);
    for (let i = 0; i <= 100; i++) {
      setProgress(i);
      await new Promise((resolve) => setTimeout(resolve, 20)); // Simulate progress timing
    }
    setQuiz(newQuiz);
    setIsLoading(false);
  };
  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.default, // Use theme background
        color: theme.palette.text.primary, // Use theme text color
        minHeight: "100vh", // Full height for consistent background
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Container maxWidth="md">
          <main>
            {isLoading && (
              <Box sx={{ width: "100%", marginTop: 4 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ textAlign: "center", marginTop: 1 }}
                >
                  {`Processing: ${progress}%`}
                </Typography>
              </Box>
            )}
            {!isLoading && (
              <>
                <FileUpload
                  onQuizUpdate={handleQuizUpdate}
                  setIsLoading={setIsLoading}
                />
                <QuizDisplay
                  quiz={quiz}
                  isLoading={isLoading}
                  progress={progress}
                />
              </>
            )}
          </main>
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}

export default App;
