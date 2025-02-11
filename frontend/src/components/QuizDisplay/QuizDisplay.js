import React from "react";
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
} from "@mui/material";
import ExportButtons from "../ExportButtons/ExportButtons";

function QuizDisplay({ quiz, isLoading, progress }) {
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <LinearProgress
          variant="determinate"
          value={progress || 0}
          sx={{ width: "80%", marginBottom: 2 }}
        />
        <Typography variant="body2" color="textSecondary">
          {`Processing: ${progress || 0}%`}
        </Typography>
      </Box>
    );
  }

  if (!quiz) return null;

  const {
    multiple_choice = [],
    short_answer = [],
    exam_problem = [],
    difficulty = "medium",
    title = "Generated Quiz",
  } = quiz;

  return (
    <Box
      sx={{
        padding: 3,
        maxWidth: "800px",
        margin: "auto",
        backgroundColor: "background.default",
      }}
    >
      {/* Title */}
      <Typography
        variant="h4"
        sx={{ marginBottom: 3, textAlign: "center", fontWeight: "bold" }}
      >
        {title}
      </Typography>

      {/* Difficulty */}
      <Typography
        variant="h6"
        color="text.secondary"
        sx={{ marginBottom: 3, textAlign: "center" }}
      >
        Difficulty: {difficulty}
      </Typography>

      {/* MULTIPLE-CHOICE QUESTIONS */}
      {multiple_choice.length > 0 && (
        <Box sx={{ marginBottom: 4 }}>
          <Typography variant="h5" sx={{ marginBottom: 2, fontWeight: "bold" }}>
            Multiple Choice Questions
          </Typography>
          {multiple_choice.map((mc, i) => (
            <Paper
              key={i}
              elevation={3}
              sx={{
                padding: 2,
                marginBottom: 3,
                backgroundColor: "background.paper",
                borderRadius: 2,
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                Question {i + 1}: {mc.question}
              </Typography>
              <List>
                {mc.options.map((option, idx) => (
                  <ListItem
                    key={idx}
                    sx={{
                      paddingY: 1,
                      backgroundColor:
                        option === mc.correct_answer
                          ? "rgba(0, 255, 0, 0.1)"
                          : "transparent",
                      borderRadius: 1,
                    }}
                  >
                    <ListItemText
                      primary={option}
                      secondary={
                        option === mc.correct_answer ? "Correct Answer" : null
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          ))}
        </Box>
      )}

      {/* SHORT-ANSWER QUESTIONS */}
      {short_answer.length > 0 && (
        <Box sx={{ marginBottom: 4 }}>
          <Typography variant="h5" sx={{ marginBottom: 2, fontWeight: "bold" }}>
            Short Answer Questions
          </Typography>
          {short_answer.map((sa, i) => (
            <Paper
              key={i}
              elevation={3}
              sx={{
                padding: 2,
                marginBottom: 3,
                backgroundColor: "background.paper",
                borderRadius: 2,
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                Question {i + 1}: {sa.question}
              </Typography>
              {sa.answer && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ marginTop: 1 }}
                >
                  Answer: {sa.answer}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {/* EXAM PROBLEMS */}
      {exam_problem.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ marginBottom: 2, fontWeight: "bold" }}>
            Exam Problems
          </Typography>
          {exam_problem.map((ep, i) => (
            <Paper
              key={i}
              elevation={3}
              sx={{
                padding: 2,
                marginBottom: 3,
                backgroundColor: "background.paper",
                borderRadius: 2,
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                Problem {i + 1}: {ep.question}
              </Typography>
              {ep.solution && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ marginTop: 1 }}
                >
                  Solution: {ep.solution}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {/* Export Buttons */}
      <ExportButtons quiz={quiz} />
    </Box>
  );
}

export default QuizDisplay;
