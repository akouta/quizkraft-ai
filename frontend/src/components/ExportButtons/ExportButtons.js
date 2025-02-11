import React, { useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Tooltip,
  Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import axios from "axios";

function ExportButtons({ quiz }) {
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null); // Track current exporting format
  const BACKEND_URL = process.env.REACT_APP_FUNCTION_URL;

  const handleExport = async (format) => {
    setIsExporting(true);
    setExportingFormat(format); // Set the current format being exported

    const endpoint =
      format === "pdf"
        ? `${BACKEND_URL}/export-quiz/pdf`
        : `${BACKEND_URL}/export-quiz/word`;

    try {
      const response = await axios.post(
        endpoint,
        { quiz, include_answers: includeAnswers },
        { responseType: "blob" } // Important for handling binary responses
      );

      // Create a Blob from the response data
      const blob = new Blob([response.data], {
        type:
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Generate a download link for the Blob
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        format === "pdf"
          ? `quiz${includeAnswers ? "_with_answers" : "_without_answers"}.pdf`
          : `quiz${includeAnswers ? "_with_answers" : "_without_answers"}.docx`
      );
      document.body.appendChild(link);
      link.click();

      // Clean up the temporary link
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Failed to export quiz as ${format}. Please try again.`);
    } finally {
      setIsExporting(false);
      setExportingFormat(null); // Reset exporting format
    }
  };

  if (!quiz) {
    return <Typography>No quiz data available for export.</Typography>;
  }

  return (
    <Card
      elevation={3}
      sx={{
        padding: 3,
        marginTop: 3,
        backgroundColor: "background.paper",
        borderRadius: 2,
      }}
    >
      <CardContent>
        <Typography
          variant="h6"
          sx={{ textAlign: "center", marginBottom: 2, fontWeight: "bold" }}
        >
          Export Quiz:
        </Typography>

        {/* Toggle for Including Answers */}
        <Box sx={{ textAlign: "center", marginBottom: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={includeAnswers}
                onChange={() => setIncludeAnswers(!includeAnswers)}
                name="includeAnswers"
                color="primary"
              />
            }
            label={includeAnswers ? "with Answers as:" : "without Answers as:"}
            sx={{
              "& .MuiFormControlLabel-label": {
                fontSize: "0.9rem",
                fontWeight: "bold",
              },
            }}
          />
        </Box>

        {/* Export Buttons */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Tooltip title="Export as PDF">
            <Button
              variant="contained"
              color="primary"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => handleExport("pdf")}
              disabled={isExporting}
              sx={{
                fontWeight: "bold",
                borderRadius: 3,
                paddingX: 3,
              }}
            >
              {isExporting && exportingFormat === "pdf"
                ? "Exporting PDF..."
                : "PDF"}
            </Button>
          </Tooltip>

          <Tooltip title="Export as Word Document">
            <Button
              variant="contained"
              color="secondary"
              startIcon={<DescriptionIcon />}
              onClick={() => handleExport("word")}
              disabled={isExporting}
              sx={{
                fontWeight: "bold",
                borderRadius: 3,
                paddingX: 3,
              }}
            >
              {isExporting && exportingFormat === "word"
                ? "Exporting Word..."
                : "Word"}
            </Button>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}

export default ExportButtons;
