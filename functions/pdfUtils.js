// pdfUtils.js
const {PDFDocument} = require("pdf-lib");

/**
 * extractPages - Takes a full PDF buffer and returns a new PDF buffer
 * containing only the specified 0-based page indices in ascending order.
 * @param {Buffer} fileBuffer - The entire PDF file buffer
 * @param {number[]} pageIndices - e.g., [0, 1, 3] for pages 1, 2, and 4
 * @returns {Promise<Buffer>}
 */
async function extractPages(fileBuffer, pageIndices) {
  // 1) Load the original PDF
  const fullPdf = await PDFDocument.load(fileBuffer);
  const totalPages = fullPdf.getPageCount();

  // 2) Create a new empty PDF
  const newPdf = await PDFDocument.create();

  // 3) Copy pages
  for (const idx of pageIndices) {
    if (idx < 0 || idx >= totalPages) {
      throw new Error(`Page index ${idx + 1} out of range (1-${totalPages})`);
    }
    const [copiedPage] = await newPdf.copyPages(fullPdf, [idx]);
    newPdf.addPage(copiedPage);
  }

  // 4) Save subset to a buffer
  return Buffer.from(await newPdf.save());
}

module.exports = {extractPages};
