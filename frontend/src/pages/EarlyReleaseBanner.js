import React, { useState } from "react";
import { Alert, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

function EarlyReleaseBanner() {
  const [open, setOpen] = useState(true);

  if (!open) return null; // Hide banner once dismissed

  return (
    <Alert
      severity="info"
      action={
        <IconButton
          aria-label="close"
          color="inherit"
          size="small"
          onClick={() => setOpen(false)}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      }
      sx={{ marginBottom: 2 }}
    >
      <strong>Early Release:</strong> QuizKraft is in its initial launch phase.
      You may encounter a few quirks—thanks for your patience and feedback!
    </Alert>
  );
}

export default EarlyReleaseBanner;
