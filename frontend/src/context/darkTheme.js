import { createTheme } from "@mui/material/styles";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#38bdf8",
    },
    secondary: {
      main: "#fbbf24",
    },
    background: {
      default: "#07111f",
      paper: "#0f172a",
    },
    text: {
      primary: "#e2e8f0",
      secondary: "#94a3b8",
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

export default darkTheme;
