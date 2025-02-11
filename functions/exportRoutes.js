// exportRoutes.js – Word/PDF export routes with docx, pdfkit

const express = require("express");
// Removed unused 'cors', 'fs', 'path'
const { Document, Packer, Paragraph, HeadingLevel } = require("docx");
const PDFDocument = require("pdfkit");

/**
 * Creates an Express router that handles /export-quiz/word and /export-quiz/pdf
 * Lint rule 'new-cap' is disabled around docx usage if needed.
 */
function createExportRouter() {
  const router = express.Router();

  // Word Export
  router.post("/word", async (req, res) => {
    const data = req.body;
    const quiz = data.quiz;
    const includeAnswers = data.include_answers || false;

    if (!quiz) {
      return res.status(400).json({ error: "No quiz to export" });
    }

    try {
      /* eslint-disable new-cap */
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: "Generated Quiz",
                heading: HeadingLevel.TITLE,
              }),
              new Paragraph({ text: "" }),
              new Paragraph({
                text: "Multiple-Choice Questions",
                heading: HeadingLevel.HEADING_2,
              }),
              ...(quiz.multiple_choice || [])
                .map((question, i) => {
                  return [
                    new Paragraph(`Q${i + 1}: ${question.question}`),
                    ...question.options.map(
                      (option, j) =>
                        new Paragraph({
                          text: `${String.fromCharCode(65 + j)}. ${option}`,
                          bullet: { level: 0 },
                        })
                    ),
                  ];
                })
                .flat(),
              new Paragraph({
                text: "Short-Answer Questions",
                heading: HeadingLevel.HEADING_2,
              }),
              ...(quiz.short_answer || []).map(
                (question, i) =>
                  new Paragraph(`Q${i + 1}: ${question.question}`)
              ),
              new Paragraph({
                text: "Exam Problems",
                heading: HeadingLevel.HEADING_2,
              }),
              ...(quiz.exam_problem || []).map(
                (question, i) =>
                  new Paragraph(`Q${i + 1}: ${question.question}`)
              ),
            ],
          },
          ...(includeAnswers
            ? [
                {
                  children: [
                    new Paragraph({ text: "", spacing: { before: 300 } }),
                    new Paragraph({
                      text: "Answers",
                      heading: HeadingLevel.TITLE,
                    }),
                    new Paragraph({
                      text: "Multiple-Choice Answers",
                      heading: HeadingLevel.HEADING_2,
                    }),
                    ...(quiz.multiple_choice || []).map(
                      (q, i) =>
                        new Paragraph(`Q${i + 1} Answer: ${q.correct_answer}`)
                    ),
                    new Paragraph({
                      text: "Short-Answer Solutions",
                      heading: HeadingLevel.HEADING_2,
                    }),
                    ...(quiz.short_answer || []).map(
                      (q, i) =>
                        new Paragraph(
                          `Q${i + 1}: ${q.answer || "No answer provided"}`
                        )
                    ),
                    new Paragraph({
                      text: "Exam Problem Solutions",
                      heading: HeadingLevel.HEADING_2,
                    }),
                    ...(quiz.exam_problem || []).map(
                      (q, i) =>
                        new Paragraph(
                          `Q${i + 1}: ${q.solution || "No solution provided"}`
                        )
                    ),
                  ],
                },
              ]
            : []),
        ],
      });
      /* eslint-enable new-cap */

      const buffer = await Packer.toBuffer(doc);
      const filename = includeAnswers
        ? "quiz_with_answers.docx"
        : "quiz_without_answers.docx";

      // Return the buffer as an attachment
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      return res.send(Buffer.from(buffer));
    } catch (err) {
      return res.status(500).json({ error: "Failed to export Word document" });
    }
  });

  // PDF Export
  router.post("/pdf", async (req, res) => {
    const data = req.body;
    const quiz = data.quiz;
    const includeAnswers = data.include_answers || false;

    if (!quiz) return res.status(400).json({ error: "No quiz to export" });

    try {
      const doc = new PDFDocument();
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        const filename = includeAnswers
          ? "quiz_with_answers.pdf"
          : "quiz_without_answers.pdf";
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${filename}`
        );
        return res.send(pdfData);
      });

      doc.fontSize(20).text("Generated Quiz", { align: "center" });
      doc.moveDown();

      // Multiple-Choice
      if (quiz.multiple_choice && quiz.multiple_choice.length) {
        doc.fontSize(16).text("Multiple-Choice Questions", { underline: true });
        quiz.multiple_choice.forEach((q, i) => {
          doc.moveDown(0.5);
          doc.fontSize(12).text(`Q${i + 1}: ${q.question}`);
          q.options.forEach((option, j) => {
            doc.text(`${String.fromCharCode(65 + j)}. ${option}`, {
              indent: 20,
            });
          });
        });
        doc.moveDown();
      }

      // Short-Answer
      if (quiz.short_answer && quiz.short_answer.length) {
        doc.fontSize(16).text("Short-Answer Questions", { underline: true });
        quiz.short_answer.forEach((q, i) => {
          doc.moveDown(0.5);
          doc.fontSize(12).text(`Q${i + 1}: ${q.question}`);
        });
        doc.moveDown();
      }

      // Exam Problems
      if (quiz.exam_problem && quiz.exam_problem.length) {
        doc.fontSize(16).text("Exam Problems", { underline: true });
        quiz.exam_problem.forEach((q, i) => {
          doc.moveDown(0.5);
          doc.fontSize(12).text(`Q${i + 1}: ${q.question}`);
        });
        doc.moveDown();
      }

      // Answers if requested
      if (includeAnswers) {
        doc.addPage();
        doc.fontSize(20).text("Answers", { align: "center" });
        doc.moveDown();

        if (quiz.multiple_choice && quiz.multiple_choice.length) {
          doc.fontSize(16).text("Multiple-Choice Answers", { underline: true });
          quiz.multiple_choice.forEach((q, i) => {
            doc.moveDown(0.5);
            doc.fontSize(12).text(`Q${i + 1} Answer: ${q.correct_answer}`);
          });
          doc.moveDown();
        }

        if (quiz.short_answer && quiz.short_answer.length) {
          doc.fontSize(16).text("Short-Answer Solutions", { underline: true });
          quiz.short_answer.forEach((q, i) => {
            doc.moveDown(0.5);
            doc
              .fontSize(12)
              .text(`Q${i + 1}: ${q.answer || "No answer provided"}`);
          });
          doc.moveDown();
        }

        if (quiz.exam_problem && quiz.exam_problem.length) {
          doc.fontSize(16).text("Exam Problem Solutions", { underline: true });
          quiz.exam_problem.forEach((q, i) => {
            doc.moveDown(0.5);
            doc
              .fontSize(12)
              .text(`Q${i + 1}: ${q.solution || "No solution provided"}`);
          });
          doc.moveDown();
        }
      }

      doc.end();
    } catch (err) {
      return res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  return router;
}

module.exports = { createExportRouter };
