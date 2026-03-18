import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import GoogleLoginButton from "../GoogleLoginButton/GoogleLoginButton";
import { registerUser } from "../../firebase/firebaseAuth";

function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await registerUser(email, password);
      navigate("/verify");
    } catch (signUpError) {
      setError(signUpError.message || "Sign-up failed.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 6,
      }}
    >
      <Card sx={{ maxWidth: 460, width: "100%", borderRadius: 4 }}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Create your free QuizKraft workspace
              </Typography>
              <Typography color="text.secondary">
                Start with owned uploads, source-cited drafts, and practice links
                that fit within a free-tier launch.
              </Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <TextField
                  fullWidth
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
                <Button type="submit" variant="contained" sx={{ borderRadius: 999 }}>
                  Create account
                </Button>
              </Stack>
            </form>
            <GoogleLoginButton />
            <Typography color="text.secondary">
              Already have an account?{" "}
              <Button component={RouterLink} to="/login" sx={{ px: 0 }}>
                Login
              </Button>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default SignUp;
