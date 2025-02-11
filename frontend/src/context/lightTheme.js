import { createTheme } from "@mui/material/styles";

const lightTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#f5f5f5", // Light gray background
      paper: "#ffffff", // White for cards and containers
    },
    text: {
      primary: "#000000", // Black text for light mode
      secondary: "#555555", // Dark gray secondary text
    },
    primary: {
      main: "#1976D2", // Accent color for buttons, links, etc.
    },
    secondary: {
      main: "#DC004E",
    },
    divider: "#E0E0E0", // Divider color
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
    body1: {
      color: "#333333", // Default text
    },
    body2: {
      color: "#666666", // Secondary text
    },
  },
});

export default lightTheme;
