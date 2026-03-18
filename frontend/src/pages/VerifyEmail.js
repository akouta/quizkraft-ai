import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { sendEmailVerification } from "firebase/auth";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";

function VerifyEmail() {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const refreshedUser = await refreshUser();

      if (refreshedUser?.emailVerified) {
        navigate("/app");
        return;
      }

      setMessage("Your email is still unverified. Check your inbox and try again.");
    } catch (refreshError) {
      setError(refreshError.message || "Could not refresh verification status.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await sendEmailVerification(auth.currentUser);
      setMessage("Verification email sent.");
    } catch (sendError) {
      setError(sendError.message || "Could not resend verification email.");
    } finally {
      setLoading(false);
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
      <Card sx={{ maxWidth: 560, width: "100%", borderRadius: 4 }}>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Verify your email before entering the workspace
            </Typography>
            <Typography color="text.secondary">
              Quiz generation, export, and history stay behind verified access.
              Finish verification, then refresh this page to unlock the studio.
            </Typography>
            <Typography>
              Signed in as: <strong>{currentUser?.email || "Unknown user"}</strong>
            </Typography>
            {message && <Alert severity="success">{message}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                variant="contained"
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? "Checking..." : "I verified my email"}
              </Button>
              <Button variant="outlined" onClick={handleResend} disabled={loading}>
                Resend email
              </Button>
              <Button component={RouterLink} to="/login">
                Back to login
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default VerifyEmail;
