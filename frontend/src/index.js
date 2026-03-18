import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline } from "@mui/material";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { AppProvider } from "./context/AppContext";
import ThemeContextProvider from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import Login from "./components/Auth/Login";
import Navbar from "./components/Navbar/Navbar";
import PrivateRoute from "./components/Auth/PrivateRoute";
import Profile from "./pages/Profile";
import QuizEditorPage from "./pages/QuizEditorPage";
import LandingPage from "./pages/LandingPage";
import ResultsPage from "./pages/ResultsPage";
import SignUp from "./components/Auth/SignUp";
import PracticePage from "./pages/PracticePage";
import VerifyEmail from "./pages/VerifyEmail";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeContextProvider>
        <AppProvider>
          <CssBaseline />
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/verify" element={<VerifyEmail />} />
              <Route path="/practice/:quizId" element={<PracticePage />} />
              <Route path="/results/:sessionId" element={<ResultsPage />} />
              <Route
                path="/app"
                element={
                  <PrivateRoute>
                    <App />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/quizzes/:quizId/edit"
                element={
                  <PrivateRoute>
                    <QuizEditorPage />
                  </PrivateRoute>
                }
              />
              <Route path="/quiz-history" element={<Navigate to="/app" replace />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </ThemeContextProvider>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
