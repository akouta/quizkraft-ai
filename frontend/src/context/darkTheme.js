import { createTheme } from "@mui/material/styles";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#121212", // Dark background
      paper: "#1e1e1e", // Slightly lighter for containers
    },
    text: {
      primary: "#ffffff", // White text for dark mode
      secondary: "#bbbbbb", // Light gray secondary text
    },
    primary: {
      main: "#90CAF9", // Accent color for buttons, links, etc.
    },
    secondary: {
      main: "#F48FB1",
    },
    divider: "#2E2E2E", // Divider color
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
    body1: {
      color: "#E0E0E0", // Default text
    },
    body2: {
      color: "#B0B0B0", // Secondary text
    },
  },
});

export default darkTheme;
