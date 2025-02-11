import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutButton from "../Auth/LogoutButton";

function Navbar() {
  const { currentUser } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = (open) => () => {
    setSidebarOpen(open);
  };

  return (
    <Box
      className="navbar"
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        backgroundColor: "background.default",
        color: "text.primary",
      }}
    >
      {/* App Title */}
      <Box
        component={Link}
        to="/"
        sx={{
          fontWeight: "bold",
          fontSize: "1.5rem",
          textDecoration: "none",
          color: "inherit",
          "&:hover": {
            textDecoration: "none",
          },
        }}
      >
        QuizKraft AI
      </Box>

      {/* Hamburger Menu Button */}
      <IconButton
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={toggleSidebar(true)}
      >
        <MenuIcon />
      </IconButton>

      {/* Sidebar Drawer */}
      <Drawer
        anchor="right"
        open={isSidebarOpen}
        onClose={toggleSidebar(false)}
      >
        <Box
          sx={{
            width: 250,
            backgroundColor: "background.default",
            height: "100%",
            padding: 2,
          }}
          role="presentation"
        >
          <List>
            <ListItem
              button
              component={Link}
              to="/"
              onClick={toggleSidebar(false)}
            >
              <ListItemText
                primary="QuizKraft AI"
                primaryTypographyProps={{
                  fontWeight: "bold",
                  fontSize: "1.5rem",
                }}
              />
            </ListItem>
            <Divider />
            {currentUser ? (
              <>
                <ListItem
                  button
                  component={Link}
                  to="/profile"
                  onClick={toggleSidebar(false)}
                >
                  <ListItemText primary="Profile" />
                </ListItem>
                <ListItem
                  button
                  component={Link}
                  to="/app"
                  onClick={toggleSidebar(false)}
                >
                  <ListItemText primary="Generate Quiz" />
                </ListItem>
                <ListItem
                  button
                  component={Link}
                  to="/quiz-history"
                  onClick={toggleSidebar(false)}
                >
                  <ListItemText primary="Quiz History" />
                </ListItem>
                <ListItem onClick={toggleSidebar(false)}>
                  <LogoutButton />
                </ListItem>
              </>
            ) : (
              <>
                <ListItem
                  button
                  component={Link}
                  to="/login"
                  onClick={toggleSidebar(false)}
                >
                  <ListItemText primary="Login" />
                </ListItem>
                <ListItem
                  button
                  component={Link}
                  to="/signup"
                  onClick={toggleSidebar(false)}
                >
                  <ListItemText primary="Sign Up" />
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}

export default Navbar;
