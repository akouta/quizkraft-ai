import React, { useState } from "react";
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
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useAuth();

  const toggleDrawer = (open) => () => {
    setIsOpen(open);
  };

  return (
    <Box>
      {/* Hamburger Button */}
      <IconButton
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={toggleDrawer(true)}
      >
        <MenuIcon />
      </IconButton>

      {/* Sidebar Drawer */}
      <Drawer anchor="left" open={isOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{
            width: 250,
            backgroundColor: "background.default",
            height: "100%",
            padding: 2,
          }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <List>
            <ListItem
              component={Link}
              to="/"
              sx={{
                textDecoration: "none",
                color: "inherit",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.1)", // Optional hover effect
                },
              }}
            >
              <ListItemText
                primary="QuizCraft AI"
                primaryTypographyProps={{
                  fontWeight: "bold",
                  fontSize: "1.5rem",
                }}
              />
            </ListItem>
            <Divider />
            {currentUser ? (
              <>
                <ListItem component={Link} to="/profile">
                  <ListItemText primary="Profile" />
                </ListItem>
                <ListItem component={Link} to="/app">
                  <ListItemText primary="Generate Quiz" />
                </ListItem>
                <ListItem component={Link} to="/quiz-history">
                  <ListItemText primary="Quiz History" />
                </ListItem>
                <ListItem component={Link} to="/app">
                  <ListItemText primary="Generate Quiz" />
                </ListItem>
                <ListItem component={Link} to="/logout">
                  <ListItemText primary="Logout" />
                </ListItem>
              </>
            ) : (
              <>
                <ListItem component={Link} to="/login">
                  <ListItemText primary="Login" />
                </ListItem>
                <ListItem component={Link} to="/signup">
                  <ListItemText primary="Sign Up" />
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Sidebar;
