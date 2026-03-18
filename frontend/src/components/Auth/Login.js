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
import { loginUser } from "../../firebase/firebaseAuth";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const user = await loginUser(email, password);
      navigate(user.emailVerified ? "/app" : "/verify");
    } catch (loginError) {
      setError(loginError.message || "Login failed.");
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
      <Card sx={{ maxWidth: 440, width: "100%", borderRadius: 4 }}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Return to the teacher studio
              </Typography>
              <Typography color="text.secondary">
                Sign in to continue generating, editing, and publishing source-
                cited assessments.
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
                <Button type="submit" variant="contained" sx={{ borderRadius: 999 }}>
                  Login
                </Button>
              </Stack>
            </form>
            <GoogleLoginButton />
            <Typography color="text.secondary">
              New here?{" "}
              <Button component={RouterLink} to="/signup" sx={{ px: 0 }}>
                Create a free account
              </Button>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;
