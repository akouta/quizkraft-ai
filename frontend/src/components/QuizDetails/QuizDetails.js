import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Button,
} from "@mui/material";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../ThemeToggle";
import ExportButtons from "../ExportButtons/ExportButtons";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

function QuizDetails() {
  const { quizId } = useParams();
  const { currentUser } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Initialize navigation

  useEffect(() => {
    const fetchQuizDetails = async () => {
      if (!currentUser || !quizId) return;

      setLoading(true);

      try {
        const quizDocRef = doc(db, "users", currentUser.uid, "quizzes", quizId);
        const snapshot = await getDoc(quizDocRef);

        if (snapshot.exists()) {
          setQuiz(snapshot.data());
        } else {
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchQuizDetails();
  }, [currentUser, quizId]);

  const renderExamProblems = (examProblems) =>
    examProblems.map((problem, index) => (
      <Paper
        key={index}
        elevation={3}
        sx={{
          padding: 2,
          marginBottom: 3,
          backgroundColor: "background.paper",
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Problem {index + 1}: {problem.question}
        </Typography>
        {problem.solution && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ marginTop: 1 }}
          >
            Solution: {problem.solution}
          </Typography>
        )}
      </Paper>
    ));

  const renderMultipleChoice = (mcqs) =>
    mcqs.map((mcq, index) => (
      <Paper
        key={index}
        elevation={3}
        sx={{
          padding: 2,
          marginBottom: 3,
          backgroundColor: "background.paper",
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Question {index + 1}: {mcq.question}
        </Typography>
        <List>
          {mcq.options.map((option, i) => (
            <ListItem
              key={i}
              sx={{
                paddingY: 1,
                backgroundColor:
                  option === mcq.correct_answer
                    ? "rgba(0, 255, 0, 0.1)"
                    : "transparent",
                borderRadius: 1,
              }}
            >
              <ListItemText
                primary={option}
                secondary={
                  option === mcq.correct_answer ? "Correct Answer" : null
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    ));

  const renderShortAnswers = (shortAnswers) =>
    shortAnswers.map((answer, index) => (
      <Paper
        key={index}
        elevation={3}
        sx={{
          padding: 2,
          marginBottom: 3,
          backgroundColor: "background.paper",
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Question {index + 1}: {answer.question}
        </Typography>
        {answer.answer && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ marginTop: 1 }}
          >
            Answer: {answer.answer}
          </Typography>
        )}
      </Paper>
    ));

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Box sx={{ padding: 3, textAlign: "center" }}>
        <Typography variant="h6">Quiz not found.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        padding: 3,
        maxWidth: "800px",
        margin: "auto",
        backgroundColor: "background.default",
      }}
    >
      {/* Go Back Button */}
      <Button
        variant="outlined"
        color="primary"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)} // Go back to the previous page
        sx={{
          alignSelf: "flex-start",
          marginBottom: 3,
          borderRadius: "8px",
          textTransform: "none",
          fontWeight: "bold",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
          "&:hover": {
            backgroundColor: "rgba(25, 118, 210, 0.1)",
          },
        }}
      >
        Go Back
      </Button>
      <ThemeToggle />
      <Typography
        variant="h4"
        sx={{ marginBottom: 3, textAlign: "center", fontWeight: "bold" }}
      >
        {quiz.title || "Quiz Details"}
      </Typography>
      <Typography
        variant="h6"
        color="text.secondary"
        sx={{ marginBottom: 3, textAlign: "center" }}
      >
        Difficulty: {quiz.difficulty || "Unknown"}
      </Typography>
      {quiz.exam_problem && quiz.exam_problem.length > 0 && (
        <Box sx={{ marginBottom: 4 }}>
          <Typography variant="h5" sx={{ marginBottom: 2, fontWeight: "bold" }}>
            Exam Problems
          </Typography>
          {renderExamProblems(quiz.exam_problem)}
        </Box>
      )}
      {quiz.multiple_choice && quiz.multiple_choice.length > 0 && (
        <Box sx={{ marginBottom: 4 }}>
          <Typography variant="h5" sx={{ marginBottom: 2, fontWeight: "bold" }}>
            Multiple Choice Questions
          </Typography>
          {renderMultipleChoice(quiz.multiple_choice)}
        </Box>
      )}
      {quiz.short_answer && quiz.short_answer.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ marginBottom: 2, fontWeight: "bold" }}>
            Short Answer Questions
          </Typography>
          {renderShortAnswers(quiz.short_answer)}
        </Box>
      )}
      <ExportButtons quiz={quiz} />
    </Box>
  );
}

export default QuizDetails;
