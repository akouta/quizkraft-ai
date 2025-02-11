import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "firebase/auth";
import {
  Typography,
  Button,
  TextField,
  Box,
  Grid,
  Card,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import ThemeToggle from "../components/ThemeToggle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

function Profile() {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); // Initialize navigation
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName || ""
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "",
  });

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) {
      setSnackbar({
        open: true,
        message: "No authenticated user found.",
        severity: "error",
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Update Firebase Authentication Profile
      await updateProfile(currentUser, {
        displayName,
      });

      // Reference Firestore document
      const userDocRef = doc(db, "users", currentUser.uid);

      // Check if the document exists
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        // Update document if it exists
        await updateDoc(userDocRef, { displayName });
      } else {
        // Create document if it doesn't exist
        await setDoc(userDocRef, { displayName }, { merge: true });
      }

      setSnackbar({
        open: true,
        message: "Profile updated successfully!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to update profile. Please try again.",
        severity: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 3,
        backgroundColor: "background.default",
        color: "text.primary",
        minHeight: "100vh",
      }}
    >
      {/* Go Back Button */}
      <Button
        variant="outlined"
        color="primary"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)} // Go back to the previous page
        sx={{
          alignSelf: "flex-start",
          marginBottom: 3,
          borderRadius: "8px",
          textTransform: "none",
          fontWeight: "bold",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.2)",
          "&:hover": {
            backgroundColor: "rgba(25, 118, 210, 0.1)",
          },
        }}
      >
        Go Back
      </Button>
      <ThemeToggle />
      <Card
        sx={{
          width: "100%",
          maxWidth: 600,
          padding: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: 3,
          borderRadius: 2,
          backgroundColor: "background.paper",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: 2,
            color: "text.primary",
          }}
        >
          My Profile
        </Typography>
        <Divider sx={{ width: "100%", marginBottom: 3 }} />
        <Grid container spacing={2} sx={{ maxWidth: 400 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Display Name"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              InputLabelProps={{
                style: { color: "text.secondary" },
              }}
              InputProps={{
                style: { borderRadius: 8 },
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography
              sx={{
                textAlign: "center",
                fontWeight: 500,
                fontSize: "1rem",
                color: "text.secondary",
              }}
            >
              Email: {currentUser?.email}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleUpdateProfile}
              disabled={isUpdating}
              sx={{
                textTransform: "none",
                borderRadius: 8,
                height: 50,
                fontSize: "1rem",
                fontWeight: "bold",
              }}
            >
              {isUpdating ? <CircularProgress size={24} /> : "Save Changes"}
            </Button>
          </Grid>
        </Grid>
      </Card>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Profile;
