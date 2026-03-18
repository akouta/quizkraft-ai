import React from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { useNavigate } from "react-router-dom";

function GoogleLoginButton() {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      navigate("/app");
    } catch (error) {
      alert("Google sign-in failed. Please try again.");
    }
  };

  return (
    <Button
      variant="outlined"
      onClick={handleGoogleSignIn}
      startIcon={<GoogleIcon />}
      fullWidth
      sx={{ borderRadius: 999 }}
    >
      Continue with Google
    </Button>
  );
}

export default GoogleLoginButton;
