import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebaseConfig";
import { Alert } from "@mui/material";

// Handle Firebase authentication errors for logout
const handleAuthError = (error) => {
  const errorMessages = {
    // In most cases, signOut doesn't throw many specific errors.
    // You can add custom error mappings here if needed.
  };

  return (
    errorMessages[error.code] || "An unexpected error occurred during logout."
  );
};

const LogoutButton = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogout = async () => {
    setErrorMsg("");
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      setErrorMsg(handleAuthError(error));
    }
  };

  return (
    <div>
      <button className="logout-button" onClick={handleLogout}>
        Logout
      </button>
      {errorMsg && (
        <Alert severity="error" sx={{ marginTop: 2 }}>
          {errorMsg}
        </Alert>
      )}
    </div>
  );
};

export default LogoutButton;
