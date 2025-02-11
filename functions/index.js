const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const express = require("express");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const cors = require("cors");

// Import your OpenAI config
const { Configuration, OpenAIApi } = require("openai");

// Import the PDF slicing helper + export routes
const { extractPages } = require("./pdfUtils");
const { createExportRouter } = require("./exportRoutes");

initializeApp();

const app = express();

app.use(
  cors({
    origin: ["https://quizcraft-3aee1.web.app", "https://quizkraft.com"],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json()); // We'll accept JSON bodies with quiz params

// Attach your router under "/export-quiz"
const exportRouter = createExportRouter();
app.use("/export-quiz", exportRouter);

// Setup your OpenAI API config with your key:
const openaiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openaiConfig);

/**
 * parsePageRange – parses "1-3,5" to array of 0-based page indices
 * @param {string} pageRangeStr
 * @param {number} numPages
 * @returns {number[]}
 */
function parsePageRange(pageRangeStr, numPages) {
  const pageIndices = new Set();
  const matches = pageRangeStr.match(/\d+(-\d+)?/g);
  if (!matches) return [];

  matches.forEach((range) => {
    if (range.includes("-")) {
      const [start, end] = range.split("-").map((n) => parseInt(n, 10));
      if (start < 1 || end < 1 || start > numPages || end > numPages) {
        throw new Error(`Range ${start}-${end} out of bounds (1-${numPages}).`);
      }
      for (let i = start - 1; i < end; i++) {
        pageIndices.add(i);
      }
    } else {
      const p = parseInt(range, 10);
      if (p < 1 || p > numPages) {
        throw new Error(`Page ${p} out of bounds (1-${numPages}).`);
      }
      pageIndices.add(p - 1);
    }
  });
  return Array.from(pageIndices).sort((a, b) => a - b);
}

/**
 * generateQuizFromText – calls OpenAI to produce a quiz
 */
async function generateQuizFromText(
  text,
  numMCQs,
  numSAQs,
  numEPs,
  difficulty
) {
  const model = "gpt-3.5-turbo";
  const prompt = `
You are an expert educational exam and quiz generator. 
Your task is to generate a quiz with a difficulty level of **${difficulty.toUpperCase()}**.
The questions should reflect this difficulty by adjusting their complexity, concepts, and problem-solving requirements.

Given the following lecture text, create:
1. ${numMCQs} multiple-choice questions (each with 4 options, one correct answer).
2. ${numSAQs} short-answer questions.
3. ${numEPs} open-ended exam problems suitable for STEM.
   - Each problem should be followed by a detailed and accurate solution.

Lecture text:
${text}

Return your response in JSON format:
{
  "difficulty": "${difficulty}",
  "multiple_choice": [
    {
      "question": "...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option B"
    }
  ],
  "short_answer": [
    {
      "question": "...",
      "answer": "..."
    }
  ],
  "exam_problem": [
    {
      "question": "...",
      "solution": "..."
    }
  ]
}
`;

  try {
    const response = await openai.createChatCompletion({
      model,
      messages: [
        { role: "system", content: "You are a helpful tutor." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const generatedText = response.data.choices[0].message.content;

    // Clean out any ```json ...
    const cleanedText = generatedText.replace(/```json|```/g, "").trim();

    try {
      const quizData = JSON.parse(cleanedText);
      return quizData;
    } catch (parseErr) {
      return { error: "Could not parse quiz JSON", raw_response: cleanedText };
    }
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * POST /process-file
 * Expects JSON body with:
 *   fileUrl (string) - download URL from Firebase Storage
 *   difficulty, numMCQs, numSAQs, numEPs, pageRange (optional)
 */
app.post("/process-file", async (req, res) => {
  try {
    const {
      fileUrl,
      difficulty = "medium",
      numMCQs = 1,
      numSAQs = 1,
      numEPs = 1,
      pageRange,
    } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: "No fileUrl provided" });
    }

    // 1) Download from fileUrl
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return res
        .status(500)
        .json({ error: `Failed to download fileUrl: ${response.statusText}` });
    }
    const fileBuffer = await response.buffer();
    const tempFilePath = path.join("/tmp", "uploadFile");
    fs.writeFileSync(tempFilePath, fileBuffer);

    let extractedText = "";
    let totalPages = 1;

    // 2) Detect PDF vs Image
    let ext = "pdf";
    const lowerUrl = fileUrl.toLowerCase();
    if (lowerUrl.includes(".png")) ext = "png";
    else if (lowerUrl.includes(".jpg")) ext = "jpg";
    else if (lowerUrl.includes(".jpeg")) ext = "jpeg";

    if (ext === "pdf") {
      // First, parse the FULL PDF to get total page count
      const fullData = await pdfParse(fileBuffer);
      totalPages = fullData.numpages || 1;

      let finalPdfBuffer = fileBuffer;

      // If user specified a page range, slice the PDF
      if (pageRange) {
        // parsePageRange => array of 0-based indexes
        const indices = parsePageRange(pageRange, totalPages);

        // Then we slice the PDF to only those pages
        finalPdfBuffer = await extractPages(fileBuffer, indices);
      }

      // Parse the (possibly sliced) PDF
      const parsedSubset = await pdfParse(finalPdfBuffer);
      extractedText = parsedSubset.text.trim();
    } else if (["png", "jpg", "jpeg"].includes(ext)) {
      const {
        data: { text },
      } = await Tesseract.recognize(tempFilePath, "eng");
      extractedText = text.trim();
    } else {
      fs.unlinkSync(tempFilePath);
      return res.status(400).json({ error: `Unsupported extension: ${ext}` });
    }

    fs.unlinkSync(tempFilePath);

    // 3) Call OpenAI to generate quiz
    const quizResult = await generateQuizFromText(
      extractedText,
      Number(numMCQs),
      Number(numSAQs),
      Number(numEPs),
      difficulty
    );

    if (quizResult && quizResult.error) {
      // If we got an error from openai or parse
      return res
        .status(500)
        .json({ error: "OpenAI quiz generation failed", details: quizResult });
    }

    // 4) Return final JSON
    return res.json({
      message: "File processed + quiz generated successfully",
      totalPages,
      extractedText,
      quiz: quizResult,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

exports.api = onRequest(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 120,
  },
  app
);
