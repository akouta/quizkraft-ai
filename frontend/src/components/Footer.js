import React from "react";
import { Box, Typography } from "@mui/material";

function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "60px",
        backgroundColor: "background.paper",
        color: "text.secondary",
        textAlign: "center",
      }}
    >
      <Typography variant="body2">
        © {new Date().getFullYear()} QuizKraft AI. All rights reserved.
      </Typography>
    </Box>
  );
}

export default Footer;
