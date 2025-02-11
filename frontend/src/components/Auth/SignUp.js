import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Link as MuiLink,
  Alert,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { registerUser } from "../../firebase/firebaseAuth";
import { getAuth, signOut } from "firebase/auth";
import ThemeToggle from "../ThemeToggle";
import GoogleLoginButton from "../GoogleLoginButton/GoogleLoginButton";

// Handle Firebase authentication errors and provide user-friendly messages.
const handleAuthError = (error) => {
  const errorMessages = {
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Your password is too weak. Try a stronger one.",
    "auth/invalid-email": "Invalid email format.",
    "auth/user-not-found": "User not found. Please check your email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
  };

  return (
    errorMessages[error.code] ||
    "An unexpected error occurred. Please try again later."
  );
};

function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    // Ensure the passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      // 1) Create the user and send verification email.
      await registerUser(email, password);

      // 2) Immediately sign them out so they must log in again once verified.
      const auth = getAuth();
      await signOut(auth);

      // 3) Redirect to the "Verify Your Email" page.
      navigate("/verify");

      // TEMPORARILY FORCE RELOAD TO /verify UNTIL ROOT CAUSE FOUND.
      window.location.reload();
    } catch (err) {
      setError(handleAuthError(err));
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "background.default",
        color: "text.primary",
        padding: 3,
      }}
    >
      <Card sx={{ maxWidth: 400, width: "100%", boxShadow: 3 }}>
        <ThemeToggle />
        <CardContent>
          <Typography
            variant="h4"
            gutterBottom
            align="center"
            sx={{ fontWeight: "bold" }}
          >
            Create an Account
          </Typography>
          <Typography
            variant="body2"
            gutterBottom
            align="center"
            sx={{ marginBottom: 3 }}
          >
            Join QuizKraft AI to generate quizzes and explore features.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }}>
              {error}
            </Alert>
          )}
          {infoMsg && (
            <Alert severity="info" sx={{ marginBottom: 2 }}>
              {infoMsg}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ marginTop: 2, padding: 1 }}
            >
              Sign Up
            </Button>
          </form>
          <Typography variant="body2" align="center" sx={{ marginTop: 2 }}>
            Already have an account?{" "}
            <MuiLink
              component={RouterLink}
              to="/login"
              color="primary"
              underline="hover"
            >
              Login
            </MuiLink>
          </Typography>
          <Typography variant="body1" align="center" sx={{ margin: "20px 0" }}>
            OR
          </Typography>
          <GoogleLoginButton />
        </CardContent>
      </Card>
    </Box>
  );
}

export default SignUp;
