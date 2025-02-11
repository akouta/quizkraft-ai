import React from "react";
import { Typography, Box } from "@mui/material";
import ThemeToggle from "../components/ThemeToggle";

function VerifyEmail() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "background.default",
        color: "text.primary",
      }}
    >
      <ThemeToggle />
      <Typography variant="h2" sx={{ marginBottom: 2, fontWeight: "bold" }}>
        Welcome to QuizKraft AI
      </Typography>
      <Typography variant="h6" sx={{ marginBottom: 4 }}>
        Please verify your email by following the link sent to your inbox.
      </Typography>
    </Box>
  );
}

export default VerifyEmail;
