// GoogleLoginButton.js
import React from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { useNavigate } from "react-router-dom";

function GoogleLoginButton() {
  const navigate = useNavigate();
  const handleGoogleSignIn = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);
      // This gives you a Google Access Token. You can use it to access Google APIs.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;

      // The signed-in user info:
      const user = result.user;

      // If you need to do something post-sign-in, do it here:
      navigate("/app");
    } catch (error) {
      alert("Google sign-in failed. Please try again.");
    }
  };

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleGoogleSignIn}
      startIcon={<GoogleIcon />}
      fullWidth
    >
      Sign in with Google
    </Button>
  );
}

export default GoogleLoginButton;
