import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { CssBaseline } from "@mui/material";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import ThemeContextProvider from "./context/ThemeContext";
import SignUp from "./components/Auth/SignUp";
import Login from "./components/Auth/Login";
import LogoutButton from "./components/Auth/LogoutButton";
import PrivateRoute from "./components/Auth/PrivateRoute";
import Navbar from "./components/Navbar/Navbar";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import Profile from "./pages/Profile";
import QuizHistory from "./components/QuizHistory";
import QuizDetails from "./components/QuizDetails/QuizDetails";
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
              {/* Landing Page */}
              <Route path="/" element={<LandingPage />} />

              {/* Auth Routes */}
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route path="/logout" element={<LogoutButton />} />
              <Route path="/verify" element={<VerifyEmail />} />

              {/* Protected App Route */}
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
                path="/quiz-history"
                element={
                  <PrivateRoute>
                    <QuizHistory />
                  </PrivateRoute>
                }
              />
              <Route
                path="/quiz-details/:quizId"
                element={
                  <PrivateRoute>
                    <QuizDetails />
                  </PrivateRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </ThemeContextProvider>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
