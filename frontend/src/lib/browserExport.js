import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function getQuestionLabel(question, index) {
  if (question.type === "exam_problem") {
    return `Problem ${index + 1}`;
  }

  return `Question ${index + 1}`;
}

function wrapText(text, font, fontSize, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);

    if (width <= maxWidth || !currentLine) {
      currentLine = candidate;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [""];
}

function drawWrappedText(page, lines, x, y, options) {
  let cursorY = y;

  lines.forEach((line) => {
    page.drawText(line, {
      ...options,
      x,
      y: cursorY,
    });
    cursorY -= options.lineHeight || options.size * 1.3;
  });

  return cursorY;
}

function buildDocxParagraphs(quiz, includeAnswers) {
  const questions = (quiz.questions || []).filter((question) => question.enabled !== false);

  return [
    new Paragraph({
      text: quiz.title || "Generated Assessment Pack",
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      text: `${quiz.subject || "STEM"} | ${quiz.difficulty || "medium"}`,
    }),
    new Paragraph({ text: quiz.sourceSummary || "" }),
    new Paragraph({ text: "" }),
    ...questions.flatMap((question, index) => {
      const paragraphs = [
        new Paragraph({
          text: `${getQuestionLabel(question, index)}: ${question.prompt}`,
        }),
      ];

      (question.options || []).forEach((option, optionIndex) => {
        paragraphs.push(
          new Paragraph({
            text: `${String.fromCharCode(65 + optionIndex)}. ${option}`,
            bullet: { level: 0 },
          })
        );
      });

      if (includeAnswers) {
        paragraphs.push(
          new Paragraph({
            text: `Answer: ${question.correctAnswer || "Not provided"}`,
          })
        );
        paragraphs.push(
          new Paragraph({
            text: `Explanation: ${question.explanation || "Not provided"}`,
          })
        );
      }

      if (Array.isArray(question.sourceRefs) && question.sourceRefs.length) {
        paragraphs.push(
          new Paragraph({
            text: `Source: ${question.sourceRefs
              .map((ref) => `p.${ref.page}: ${ref.snippet}`)
              .join(" | ")}`,
          })
        );
      }

      paragraphs.push(new Paragraph({ text: "" }));
      return paragraphs;
    }),
  ];
}

async function buildWordBlob(quiz, includeAnswers) {
  const doc = new Document({
    sections: [
      {
        children: buildDocxParagraphs(quiz, includeAnswers),
      },
    ],
  });

  return Packer.toBlob(doc);
}

async function buildPdfBlob(quiz, includeAnswers) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageMargin = 48;
  const pageSize = {
    width: 612,
    height: 792,
  };

  let page = pdfDoc.addPage([pageSize.width, pageSize.height]);
  let cursorY = pageSize.height - pageMargin;

  const addPage = () => {
    page = pdfDoc.addPage([pageSize.width, pageSize.height]);
    cursorY = pageSize.height - pageMargin;
  };

  const ensureSpace = (requiredHeight) => {
    if (cursorY - requiredHeight < pageMargin) {
      addPage();
    }
  };

  ensureSpace(70);
  page.drawText(quiz.title || "Generated Assessment Pack", {
    x: pageMargin,
    y: cursorY,
    size: 20,
    font: boldFont,
    color: rgb(0.07, 0.12, 0.17),
  });
  cursorY -= 26;
  page.drawText(`${quiz.subject || "STEM"} | ${quiz.difficulty || "medium"}`, {
    x: pageMargin,
    y: cursorY,
    size: 11,
    font: regularFont,
    color: rgb(0.33, 0.37, 0.42),
  });
  cursorY -= 24;

  const summaryLines = wrapText(
    quiz.sourceSummary || "",
    regularFont,
    10,
    pageSize.width - pageMargin * 2
  );
  ensureSpace(summaryLines.length * 14 + 10);
  cursorY = drawWrappedText(page, summaryLines, pageMargin, cursorY, {
    size: 10,
    font: regularFont,
    color: rgb(0.33, 0.37, 0.42),
    lineHeight: 13,
  });
  cursorY -= 16;

  (quiz.questions || [])
    .filter((question) => question.enabled !== false)
    .forEach((question, index) => {
      const bodyWidth = pageSize.width - pageMargin * 2;
      const promptLines = wrapText(
        `${getQuestionLabel(question, index)}: ${question.prompt}`,
        boldFont,
        12,
        bodyWidth
      );
      const optionLines = (question.options || []).flatMap((option, optionIndex) =>
        wrapText(
          `${String.fromCharCode(65 + optionIndex)}. ${option}`,
          regularFont,
          10,
          bodyWidth - 16
        )
      );
      const answerLines = includeAnswers
        ? [
            ...wrapText(
              `Answer: ${question.correctAnswer || "Not provided"}`,
              regularFont,
              10,
              bodyWidth
            ),
            ...wrapText(
              `Explanation: ${question.explanation || "Not provided"}`,
              regularFont,
              10,
              bodyWidth
            ),
          ]
        : [];
      const sourceLines =
        Array.isArray(question.sourceRefs) && question.sourceRefs.length
          ? wrapText(
              `Source: ${question.sourceRefs
                .map((ref) => `p.${ref.page}: ${ref.snippet}`)
                .join(" | ")}`,
              regularFont,
              9,
              bodyWidth
            )
          : [];

      const blockHeight =
        promptLines.length * 16 +
        optionLines.length * 13 +
        answerLines.length * 13 +
        sourceLines.length * 12 +
        42;

      ensureSpace(blockHeight);
      cursorY = drawWrappedText(page, promptLines, pageMargin, cursorY, {
        size: 12,
        font: boldFont,
        color: rgb(0.07, 0.12, 0.17),
        lineHeight: 15,
      });
      cursorY -= 8;

      if (optionLines.length) {
        cursorY = drawWrappedText(page, optionLines, pageMargin + 16, cursorY, {
          size: 10,
          font: regularFont,
          color: rgb(0.1, 0.14, 0.19),
          lineHeight: 12,
        });
      }

      const topicLines = wrapText(
        `Topic: ${question.topic || "General"}`,
        regularFont,
        10,
        bodyWidth
      );
      cursorY = drawWrappedText(page, topicLines, pageMargin, cursorY, {
        size: 10,
        font: regularFont,
        color: rgb(0.1, 0.14, 0.19),
        lineHeight: 12,
      });

      if (answerLines.length) {
        cursorY -= 4;
        cursorY = drawWrappedText(page, answerLines, pageMargin, cursorY, {
          size: 10,
          font: regularFont,
          color: rgb(0.13, 0.3, 0.16),
          lineHeight: 12,
        });
      }

      if (sourceLines.length) {
        cursorY -= 4;
        cursorY = drawWrappedText(page, sourceLines, pageMargin, cursorY, {
          size: 9,
          font: regularFont,
          color: rgb(0.33, 0.37, 0.42),
          lineHeight: 11,
        });
      }

      cursorY -= 18;
    });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildChoiceInteraction(question, index) {
  const options = (question.options || [])
    .map(
      (option, optionIndex) => `
      <simpleChoice identifier="choice_${index}_${optionIndex}">
        ${escapeXml(option)}
      </simpleChoice>`
    )
    .join("");

  const correctIndex = (question.options || []).findIndex(
    (option) => option === question.correctAnswer
  );

  return `
    <assessmentItem identifier="${escapeXml(question.id)}" title="${escapeXml(
      question.prompt
    )}" adaptive="false" timeDependent="false">
      <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
        <correctResponse>
          <value>choice_${index}_${Math.max(correctIndex, 0)}</value>
        </correctResponse>
      </responseDeclaration>
      <itemBody>
        <p>${escapeXml(question.prompt)}</p>
        <choiceInteraction responseIdentifier="RESPONSE" shuffle="false" maxChoices="1">
          ${options}
        </choiceInteraction>
      </itemBody>
    </assessmentItem>`;
}

function buildTextInteraction(question) {
  return `
    <assessmentItem identifier="${escapeXml(question.id)}" title="${escapeXml(
      question.prompt
    )}" adaptive="false" timeDependent="false">
      <itemBody>
        <p>${escapeXml(question.prompt)}</p>
        <extendedTextInteraction responseIdentifier="RESPONSE" expectedLines="6"/>
      </itemBody>
      <modalFeedback identifier="feedback" outcomeIdentifier="FEEDBACK" showHide="show">
        ${escapeXml(question.correctAnswer || "")}
      </modalFeedback>
    </assessmentItem>`;
}

function buildQtiXml(quiz) {
  const items = (quiz.questions || [])
    .filter((question) => question.enabled !== false)
    .map((question, index) => {
      if (question.type === "multiple_choice") {
        return buildChoiceInteraction(question, index);
      }

      return buildTextInteraction(question);
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentPackage xmlns="http://www.imsglobal.org/xsd/qti/imsqti_v2p1">
  <metadata>
    <title>${escapeXml(quiz.title || "Generated Assessment Pack")}</title>
    <subject>${escapeXml(quiz.subject || "STEM")}</subject>
  </metadata>
  ${items}
</assessmentPackage>`;
}

export async function buildExportBlob(quiz, format, includeAnswers) {
  if (format === "pdf") {
    return buildPdfBlob(quiz, includeAnswers);
  }

  if (format === "word") {
    return buildWordBlob(quiz, includeAnswers);
  }

  return new Blob([buildQtiXml(quiz)], { type: "application/xml" });
}
