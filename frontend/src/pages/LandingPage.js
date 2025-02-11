import React from "react";
import { Link } from "react-router-dom";
import { Button, Typography, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import EarlyReleaseBanner from "./EarlyReleaseBanner";
import Footer from "../components/Footer";

function LandingPage() {
  const { currentUser } = useAuth();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        backgroundColor: "background.default",
        color: "text.primary",
        paddingTop: "60px",
      }}
    >
      <EarlyReleaseBanner />
      <ThemeToggle />
      <Typography
        variant="h2"
        sx={{
          marginBottom: 2,
          fontWeight: "bold",
          textAlign: "center",
          fontSize: {
            xs: "1.75rem", // smaller on extra-small screens
            sm: "2rem", // medium on small screens
            md: "2.125rem", // default for medium and above, or you can omit
          },
        }}
      >
        Welcome to QuizKraft AI
      </Typography>
      <Typography variant="h6" sx={{ marginBottom: 4, textAlign: "center" }}>
        The Ultimate Quiz Generator for Students and Educators!
      </Typography>
      {!currentUser && (
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            component={Link}
            to="/login"
            variant="contained"
            color="primary"
            size="large"
          >
            Login
          </Button>
          <Button
            component={Link}
            to="/signup"
            variant="outlined"
            color="primary"
            size="large"
          >
            Sign Up
          </Button>
        </Box>
      )}
      <Footer />
    </Box>
  );
}

export default LandingPage;
