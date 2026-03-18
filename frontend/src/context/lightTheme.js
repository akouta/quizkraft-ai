import { createTheme } from "@mui/material/styles";

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0b4e7d",
    },
    secondary: {
      main: "#f59e0b",
    },
    background: {
      default: "#f3f7fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#111827",
      secondary: "#475569",
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
    h2: {
      letterSpacing: "-0.04em",
    },
    h3: {
      letterSpacing: "-0.03em",
    },
  },
});

export default lightTheme;
