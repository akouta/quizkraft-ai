import React from "react";
import { Box, Container, Typography } from "@mui/material";

function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        borderTop: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Container maxWidth="lg">
        <Typography color="text.secondary" sx={{ textAlign: "center" }}>
          QuizKraft helps STEM instructors turn owned course files into source-
          cited drafts, learner practice links, and LMS-ready exports.
        </Typography>
      </Container>
    </Box>
  );
}

export default Footer;
