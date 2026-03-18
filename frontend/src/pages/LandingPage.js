import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid2,
  Stack,
  Typography,
} from "@mui/material";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

const featureCards = [
  {
    title: "Source-cited question drafting",
    description:
      "Every draft question, flashcard, and study-guide section keeps its page reference and supporting snippet.",
  },
  {
    title: "Teacher review controls",
    description:
      "Edit, disable, reorder, retag, publish, and export from one studio instead of juggling raw generations.",
  },
  {
    title: "Practice and results loop",
    description:
      "Share one practice link, capture weak topics and most-missed items, then refine the next draft.",
  },
];

const proofPoints = [
  "Browser-side extraction with no Cloud Storage uploads",
  "Client-side export in PDF, Word, and QTI 2.1",
  "Spark-safe architecture with no Cloud Functions dependency",
  "Designed for lecture PDFs and screenshot-heavy STEM workflows",
];

function LandingPage() {
  const { currentUser, isVerified } = useAuth();

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid2 container spacing={4} alignItems="center">
          <Grid2 size={{ xs: 12, md: 7 }}>
            <Stack spacing={3}>
              <Chip
                label="Built for higher-ed STEM instructors"
                color="warning"
                sx={{ alignSelf: "flex-start", fontWeight: 700 }}
              />
              <Typography variant="h2" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
                Turn messy lecture files into assessment-ready drafts that are
                easy to review, publish, and practice.
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 720 }}>
                QuizKraft is a STEM assessment copilot for instructors who work
                from screenshots, lecture PDFs, and dense technical source
                material. Process the file in-browser, review a source-cited
                draft, publish a practice link, and export the final version.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                {currentUser && isVerified ? (
                  <Button
                    component={RouterLink}
                    to="/app"
                    variant="contained"
                    size="large"
                    sx={{ borderRadius: 999, px: 3 }}
                  >
                    Open workspace
                  </Button>
                ) : (
                  <>
                    <Button
                      component={RouterLink}
                      to="/signup"
                      variant="contained"
                      size="large"
                      sx={{ borderRadius: 999, px: 3 }}
                    >
                      Start free
                    </Button>
                    <Button
                      component={RouterLink}
                      to="/login"
                      variant="outlined"
                      size="large"
                      sx={{ borderRadius: 999, px: 3 }}
                    >
                      See the studio
                    </Button>
                  </>
                )}
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {proofPoints.map((point) => (
                  <Chip
                    key={point}
                    label={point}
                    variant="outlined"
                    sx={{ borderRadius: 999 }}
                  />
                ))}
              </Stack>
            </Stack>
          </Grid2>

          <Grid2 size={{ xs: 12, md: 5 }}>
            <Card
              sx={{
                borderRadius: 5,
                background:
                  "linear-gradient(160deg, rgba(11,78,125,0.9), rgba(15,23,42,1))",
                color: "#fff",
              }}
            >
              <CardContent sx={{ p: 3.5 }}>
                <Stack spacing={2.5}>
                  <Typography variant="overline" sx={{ letterSpacing: 1.6 }}>
                    Sample pipeline
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Lecture PDF -> Draft quiz -> Practice link -> Export bundle
                  </Typography>
                  <Divider sx={{ borderColor: "rgba(255,255,255,0.18)" }} />
                  <Stack spacing={1.5}>
                    <Typography>
                      1. Process a lecture file in the browser and choose the
                      page range.
                    </Typography>
                    <Typography>
                      2. Review source-cited questions, flashcards, and study
                      guide sections.
                    </Typography>
                    <Typography>
                      3. Publish one learner link and see which concepts are
                      missed most often.
                    </Typography>
                    <Typography>
                      4. Export a polished teacher version as PDF, Word, or QTI.
                    </Typography>
                  </Stack>
                  <Chip
                    label="Pricing placeholder: no-spend launch"
                    sx={{
                      alignSelf: "flex-start",
                      backgroundColor: "rgba(245, 158, 11, 0.18)",
                      color: "#fde68a",
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid2>
        </Grid2>

        <Grid2 container spacing={3} sx={{ mt: 6 }}>
          {featureCards.map((feature) => (
            <Grid2 key={feature.title} size={{ xs: 12, md: 4 }}>
              <Card sx={{ borderRadius: 4, height: "100%" }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      </Container>
      <Footer />
    </Box>
  );
}

export default LandingPage;
