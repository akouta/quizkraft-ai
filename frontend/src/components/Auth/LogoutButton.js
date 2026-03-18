import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { Alert, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebaseConfig";

const LogoutButton = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setError("");

    try {
      await signOut(auth);
      navigate("/login");
    } catch (logoutError) {
      setError(logoutError.message || "Logout failed.");
    }
  };

  return (
    <>
      <Button color="inherit" onClick={handleLogout}>
        Logout
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
    </>
  );
};

export default LogoutButton;
