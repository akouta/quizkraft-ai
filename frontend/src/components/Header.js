import React, { useContext } from "react";
import { Box, Typography } from "@mui/material";
// import { ThemeModeContext } from "../context/ThemeContext";
import ThemeToggle from "./ThemeToggle";

function Header() {
  // const { mode, toggleTheme } = useContext(ThemeModeContext);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 3,
        backgroundColor: "background.default",
        color: "text.primary",
      }}
    >
      <Typography
        to="/"
        variant="h2"
        gutterBottom
        sx={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: "bold",
          letterSpacing: "1px",
          marginBottom: 1,
        }}
      >
        QuizKraft AI
      </Typography>
      <Typography
        variant="subtitle1"
        gutterBottom
        sx={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        Number 1 Online Quiz Generator!
      </Typography>
      <ThemeToggle />
    </Box>
  );
}

export default Header;
