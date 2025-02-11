import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  Button,
  TextField,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { deleteDoc, doc } from "firebase/firestore";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ThemeToggle from "./ThemeToggle";

function QuizHistory() {
  const { currentUser } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const navigate = useNavigate();
  const quizzesPerPage = 5;

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!currentUser) return;

      setLoading(true);
      const quizzesRef = collection(db, `users/${currentUser.uid}/quizzes`);
      const querySnapshot = await getDocs(query(quizzesRef));
      const fetchedQuizzes = querySnapshot.docs.map((doc, idx) => ({
        id: doc.id,
        ...doc.data(),
        title: doc.data().title || `Quiz ${idx + 1}`, // Fallback to dynamic numbering
      }));
      setQuizzes(fetchedQuizzes);
      setLoading(false);
    };

    fetchQuizzes();
  }, [currentUser]);

  const filteredQuizzes = quizzes.filter((quiz) => {
    if (filter === "all") return true;
    return quiz.difficulty === filter;
  });

  const searchedQuizzes = filteredQuizzes.filter((quiz) =>
    (quiz.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedQuizzes = searchedQuizzes.slice(
    (page - 1) * quizzesPerPage,
    page * quizzesPerPage
  );

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

  if (quizzes.length === 0) {
    return (
      <Box sx={{ textAlign: "center", padding: 4 }}>
        <Typography variant="h5" gutterBottom>
          You haven't created any quizzes yet!
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate("/app")}
        >
          Create Your First Quiz
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      {/* Go Back Button */}
      <Button
        variant="outlined"
        color="primary"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)} // Navigate back to the previous page
        sx={{
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
      <Typography variant="h4" gutterBottom>
        Your Quiz History
      </Typography>
      <TextField
        label="Search by Title"
        variant="outlined"
        fullWidth
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ marginBottom: 3 }}
      />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 3,
        }}
      >
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Difficulty</InputLabel>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="easy">Easy</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="hard">Hard</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {paginatedQuizzes.map((quiz, index) => (
        <Card
          key={quiz.id}
          sx={{
            marginBottom: 3,
            padding: 3,
            boxShadow: 3,
            borderRadius: 2,
            backgroundColor: "background.paper",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Quiz Details */}
          <Box sx={{ textAlign: "left" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              {quiz.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date Created:{" "}
              {new Date(quiz.timestamp?.seconds * 1000).toLocaleDateString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Difficulty: {quiz.difficulty || "Unknown"}
            </Typography>
          </Box>

          {/* Buttons Stacked on the Right */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 1,
            }}
          >
            {/* View Details Button */}
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate(`/quiz-details/${quiz.id}`)}
              startIcon={<Visibility />}
              sx={{
                width: "150px",
                height: "40px",
                fontWeight: "bold",
                borderRadius: "8px",
                textTransform: "none",
                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
                "&:hover": {
                  backgroundColor: "#115293",
                },
              }}
            >
              View Details
            </Button>

            {/* Delete Quiz Button */}
            <Button
              variant="outlined"
              color="error"
              onClick={async () => {
                if (
                  window.confirm("Are you sure you want to delete this quiz?")
                ) {
                  try {
                    const quizDocRef = doc(
                      db,
                      `users/${currentUser.uid}/quizzes`,
                      quiz.id
                    );
                    await deleteDoc(quizDocRef);
                    alert("Quiz deleted successfully.");
                    setQuizzes((prevQuizzes) =>
                      prevQuizzes.filter((q) => q.id !== quiz.id)
                    );
                  } catch (error) {
                    alert("Failed to delete the quiz. Please try again.");
                  }
                }
              }}
              startIcon={<DeleteForeverIcon />}
              sx={{
                width: "150px",
                height: "40px",
                fontWeight: "bold",
                borderRadius: "8px",
                textTransform: "none",
                borderColor: "rgba(255, 0, 0, 0.8)",
                "&:hover": {
                  backgroundColor: "rgba(255, 0, 0, 0.1)",
                  borderColor: "rgba(255, 0, 0, 1)",
                },
              }}
            >
              Delete Quiz
            </Button>
          </Box>
        </Card>
      ))}

      <Pagination
        count={Math.ceil(searchedQuizzes.length / quizzesPerPage)}
        page={page}
        onChange={(e, value) => setPage(value)}
        sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}
      />
    </Box>
  );
}

export default QuizHistory;
