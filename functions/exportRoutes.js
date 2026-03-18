const {Document, Packer, Paragraph, HeadingLevel} = require("docx");
const PDFDocument = require("pdfkit");

function getQuestionLabel(question, index) {
  if (question.type === "exam_problem") {
    return `Problem ${index + 1}`;
  }

  return `Question ${index + 1}`;
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
    new Paragraph({text: ""}),
    ...questions.flatMap((question, index) => {
      const children = [
        new Paragraph({
          text: `${getQuestionLabel(question, index)}: ${question.prompt}`,
        }),
      ];

      (question.options || []).forEach((option, optionIndex) => {
        children.push(new Paragraph({
          text: `${String.fromCharCode(65 + optionIndex)}. ${option}`,
          bullet: {level: 0},
        }));
      });

      if (includeAnswers) {
        children.push(new Paragraph({
          text: `Answer: ${question.correctAnswer || "Not provided"}`,
        }));
        children.push(new Paragraph({
          text: `Explanation: ${question.explanation || "Not provided"}`,
        }));
      }

      return children.concat(new Paragraph({text: ""}));
    }),
  ];
}

async function buildWordBuffer(quiz, includeAnswers) {
  const doc = new Document({
    sections: [{
      children: buildDocxParagraphs(quiz, includeAnswers),
    }],
  });

  return Packer.toBuffer(doc);
}

function writeQuestionToPdf(doc, question, index, includeAnswers) {
  doc.fontSize(12).text(
      `${getQuestionLabel(question, index)}: ${question.prompt}`,
  );

  (question.options || []).forEach((option, optionIndex) => {
    doc.text(`${String.fromCharCode(65 + optionIndex)}. ${option}`, {
      indent: 18,
    });
  });

  doc.text(`Topic: ${question.topic || "General"}`, {indent: 0});

  if (includeAnswers) {
    doc.text(`Answer: ${question.correctAnswer || "Not provided"}`);
    doc.text(`Explanation: ${question.explanation || "Not provided"}`);
  }

  if (Array.isArray(question.sourceRefs) && question.sourceRefs.length) {
    const citationText = question.sourceRefs
        .map((ref) => `p.${ref.page}: ${ref.snippet}`)
        .join(" | ");
    doc.text(`Source: ${citationText}`);
  }

  doc.moveDown();
}

async function buildPdfBuffer(quiz, includeAnswers) {
  return await new Promise((resolve, reject) => {
    const doc = new PDFDocument({margin: 48});
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    doc.fontSize(20).text(quiz.title || "Generated Assessment Pack", {
      align: "center",
    });
    doc.moveDown(0.5);
    doc.fontSize(11).text(
        `${quiz.subject || "STEM"} | ${quiz.difficulty || "medium"}`,
        {align: "center"},
    );
    doc.moveDown();

    (quiz.questions || [])
        .filter((question) => question.enabled !== false)
        .forEach((question, index) => {
          writeQuestionToPdf(doc, question, index, includeAnswers);
        });

    doc.end();
  });
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
  const options = (question.options || []).map((option, optionIndex) => {
    return `
      <simpleChoice identifier="choice_${index}_${optionIndex}">
        ${escapeXml(option)}
      </simpleChoice>`;
  }).join("");

  const correctIndex = (question.options || []).findIndex((option) => {
    return option === question.correctAnswer;
  });

  return `
    <assessmentItem identifier="${escapeXml(question.id)}" title="${
  escapeXml(question.prompt)
}" adaptive="false" timeDependent="false">
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
    <assessmentItem identifier="${escapeXml(question.id)}" title="${
  escapeXml(question.prompt)
}" adaptive="false" timeDependent="false">
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

module.exports = {
  buildPdfBuffer,
  buildQtiXml,
  buildWordBuffer,
};
