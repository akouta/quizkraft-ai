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
import { loginUser } from "../../firebase/firebaseAuth";
import GoogleLoginButton from "../GoogleLoginButton/GoogleLoginButton";
import ThemeToggle from "../ThemeToggle";

// Handle Firebase authentication errors and provide user-friendly messages.
const handleAuthError = (error) => {
  const errorMessages = {
    "auth/user-not-found": "User not found. Please check your email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Invalid email format.",
  };

  return (
    errorMessages[error.code] ||
    "An unexpected error occurred. Please try again later."
  );
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await loginUser(email, password);
      navigate("/app");
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
        textAlign: "center",
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
            Welcome Back!
          </Typography>
          <Typography
            variant="body2"
            gutterBottom
            align="center"
            sx={{ marginBottom: 3 }}
          >
            Login to your QuizKraft AI account.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }}>
              {error}
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
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ marginTop: 2, padding: 1 }}
            >
              Login
            </Button>
          </form>
          <Typography variant="body2" align="center" sx={{ marginTop: 2 }}>
            Don’t have an account?{" "}
            <MuiLink
              component={RouterLink}
              to="/signup"
              color="primary"
              underline="hover"
            >
              Sign Up
            </MuiLink>
          </Typography>
          {/* Google Sign-in Option */}
          <Typography variant="body1" align="center" sx={{ margin: "20px 0" }}>
            OR
          </Typography>
          <GoogleLoginButton />
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;
