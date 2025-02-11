import React, { useContext } from "react";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import ComputerIcon from "@mui/icons-material/Computer";
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { ThemeModeContext } from "../context/ThemeContext";

function ThemeToggle() {
  const { mode, toggleTheme } = useContext(ThemeModeContext);

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
      <Box sx={{ marginTop: 5 }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(e, newMode) => {
            if (newMode !== null) toggleTheme(newMode);
          }}
          aria-label="theme mode"
          sx={{
            display: "flex",
            justifyContent: "center",
            "& .MuiToggleButton-root": {
              borderRadius: "50%", // Circular buttons
              margin: "0 8px", // Spacing between buttons
              width: 50,
              height: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease", // Smooth transition for hover effects
              backgroundColor: "white", // Default background
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.1)", // Hover effect
              },
              "&.Mui-selected": {
                backgroundColor: "rgba(0, 0, 0, 0.2)", // Highlight selected button
                color: "black", // Ensure text/icon color contrast
                borderColor: "transparent", // Remove border on selection
              },
            },
          }}
        >
          <ToggleButton value="light" aria-label="light mode">
            <LightModeIcon
              sx={{ color: mode === "light" ? "orange" : "gray" }}
            />
          </ToggleButton>
          <ToggleButton value="dark" aria-label="dark mode">
            <DarkModeIcon sx={{ color: mode === "dark" ? "blue" : "gray" }} />
          </ToggleButton>
          <ToggleButton value="system" aria-label="system mode">
            <ComputerIcon
              sx={{ color: mode === "system" ? "green" : "gray" }}
            />
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" sx={{ marginTop: 2, textAlign: "center" }}>
          Current Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </Typography>
      </Box>
    </Box>
  );
}

export default ThemeToggle;
