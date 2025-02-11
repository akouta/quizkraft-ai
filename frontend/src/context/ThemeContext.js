import React, { createContext, useState, useMemo, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import lightTheme from "./lightTheme";
import darkTheme from "./darkTheme";

export const ThemeModeContext = createContext();

export function ThemeContextProvider({ children }) {
  const [mode, setMode] = useState("system");

  useEffect(() => {
    if (mode === "system") {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setMode(systemPrefersDark ? "dark" : "light");
    }
  }, [mode]);

  const toggleTheme = (newMode) => {
    setMode(newMode);
    if (newMode !== "system") {
      localStorage.setItem("themeMode", newMode); // Persist user choice
    }
  };

  const theme = useMemo(() => {
    if (mode === "system") {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      return systemPrefersDark ? darkTheme : lightTheme;
    }
    return mode === "dark" ? darkTheme : lightTheme;
  }, [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export default ThemeContextProvider;
