import React, { createContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import darkTheme from "./darkTheme";
import lightTheme from "./lightTheme";

export const ThemeModeContext = createContext();

function getStoredMode() {
  if (typeof window === "undefined") {
    return "system";
  }

  return localStorage.getItem("themeMode") || "system";
}

function getResolvedSystemMode() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function ThemeContextProvider({ children }) {
  const [mode, setMode] = useState(getStoredMode);
  const resolvedMode = mode === "system" ? getResolvedSystemMode() : mode;

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("themeMode", mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (mode === "system") {
        setMode("system");
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [mode]);

  const theme = useMemo(() => {
    return resolvedMode === "dark" ? darkTheme : lightTheme;
  }, [resolvedMode]);

  return (
    <ThemeModeContext.Provider
      value={{
        mode,
        resolvedMode,
        toggleTheme: setMode,
      }}
    >
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export default ThemeContextProvider;
