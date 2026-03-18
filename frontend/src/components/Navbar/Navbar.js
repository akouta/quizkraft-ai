import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { AppBar, Box, Button, Stack, Toolbar, Typography } from "@mui/material";
import ThemeToggle from "../ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../Auth/LogoutButton";

function Navbar() {
  const { currentUser, isVerified } = useAuth();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backdropFilter: "blur(20px)",
        backgroundColor: "rgba(10, 25, 47, 0.82)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
        <Box
          component={RouterLink}
          to="/"
          sx={{ textDecoration: "none", color: "inherit" }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, letterSpacing: 0.4 }}
          >
            QuizKraft
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.25} alignItems="center">
          <ThemeToggle />
          {currentUser ? (
            <>
              {isVerified && (
                <>
                  <Button color="inherit" component={RouterLink} to="/app">
                    Workspace
                  </Button>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/profile"
                  >
                    Profile
                  </Button>
                </>
              )}
              {!isVerified && (
                <Button color="inherit" component={RouterLink} to="/verify">
                  Verify email
                </Button>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
              <Button
                variant="contained"
                component={RouterLink}
                to="/signup"
                sx={{
                  borderRadius: 999,
                  px: 2,
                  backgroundColor: "#f59e0b",
                  color: "#111827",
                  "&:hover": { backgroundColor: "#fbbf24" },
                }}
              >
                Start free
              </Button>
            </>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
